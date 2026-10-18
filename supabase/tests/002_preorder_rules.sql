-- Uji aturan pre-order (migrasi 003): `place_order` v2 dan index uniknya.
--
-- Bentuknya satu blok `do` yang mengumpulkan hasil lalu SELALU mengakhiri dengan
-- `raise exception`. Transaksinya selalu di-rollback, jadi tidak ada perubahan
-- yang menempel, dan barisnya tetap terbaca lewat scripts/check-sql.mjs.
--
-- Blok ini berpindah peran di tengah jalan. Sebagian persiapan — mengosongkan
-- pesanan, mengubah points_price menu, memasang blokir — tidak boleh dilakukan
-- siswa; itu justru inti fiturnya. Jadi persiapan itu dijalankan sebagai
-- postgres. `set_config('role', 'postgres', true)` terbukti bisa dipanggil dari
-- dalam `authenticated` karena session_user sesi ini adalah postgres.
--
-- Urutan aturan penting. Pemeriksaan PZ001 (diblokir) dan PZ002 (masih ada
-- pesanan aktif) berjalan paling awal di dalam place_order, jadi tiap aturan
-- disusun supaya keadaan awalnya bersih. Aturan yang sengaja membuat pesanan
-- berhasil karena itu diletakkan paling belakang.

do $$
declare
  v_student uuid;
  v_stand   uuid;
  v_item    uuid;
  v_cart    jsonb;
  v_order   jsonb;
  v_results text[] := '{}';
  v_count   integer;
  v_blocked timestamptz;
  v_default text;
begin
  -- Akun demo sudah dihapus dari database produksi (18 Oktober 2026), jadi
  -- berkas ini menyiapkan siswa uji sementara sendiri. Blok ini selalu berakhir
  -- `raise exception`, jadi transaksinya rollback dan akun itu tidak pernah
  -- menempel di database.
  v_student := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_student, 'authenticated', 'authenticated', 'siswa.uji@skamuda.sch.id',
    'bukan-kata-sandi-nyata', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Siswa Uji"}'::jsonb,
    now(), now(), '', '', '', ''
  );
  -- Trigger handle_new_user sudah membuat profilnya dengan peran 'student'.

  select id into v_stand from public.canteen_stands where is_active order by id limit 1;
  if v_stand is null then
    raise exception 'Tidak ada stand kantin aktif.';
  end if;

  select mi.id into v_item
  from public.menu_items mi
  where mi.stand_id = v_stand and mi.is_available
  order by mi.id limit 1;
  if v_item is null then
    raise exception 'Tidak ada menu tersedia di stand aktif.';
  end if;

  v_cart := jsonb_build_array(jsonb_build_object('menu_item_id', v_item, 'quantity', 1));

  ------------------------------------------------------------------ keadaan awal
  delete from public.orders where student_id = v_student;
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles
     set points_balance = 5000,
         unclaimed_orders_count = 0,
         preorder_blocked_until = null
   where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);

  v_results := array_append(v_results, 'INFO: stand=' || v_stand || ' menu=' || v_item);

  ---------------------------------------------------------------------------
  -- ATURAN 0 — status awal pesanan baru sudah berpindah ke awaiting_approval.
  -- Dibaca dari katalog, bukan dengan menyisipkan baris, supaya tidak
  -- bergantung pada aturan lain dan tetap terbaca kalau migrasinya separuh jalan.
  ---------------------------------------------------------------------------
  select pg_get_expr(d.adbin, d.adrelid) into v_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.orders'::regclass
    and a.attname = 'status';

  v_results := array_append(v_results, case
    when coalesce(v_default, '') like '%awaiting_approval%'
      then 'LULUS: default status orders sudah awaiting_approval'
    else 'GAGAL: default status orders masih ' || coalesce(v_default, 'tidak ada') end);

  ---------------------------------------------------------------------------
  -- ATURAN 1 (Review Focus #1) — batas ditegakkan database, bukan oleh
  -- pengecekan di RPC. Disisipkan langsung sebagai postgres, melewati RPC
  -- sepenuhnya, supaya yang diuji memang index uniknya.
  ---------------------------------------------------------------------------
  begin
    insert into public.orders (student_id, stand_id, pickup_time_slot, total_price, status)
    values (v_student, v_stand, 'Istirahat 1', 10000, 'awaiting_approval');
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: pesanan aktif pertama pun tidak bisa disisipkan -> ' || sqlerrm);
  end;

  begin
    insert into public.orders (student_id, stand_id, pickup_time_slot, total_price, status)
    values (v_student, v_stand, 'Istirahat 2', 10000, 'awaiting_approval');
    v_results := array_append(v_results,
      'GAGAL: index unik mengizinkan dua pesanan aktif sekaligus');
  exception when unique_violation then
    v_results := array_append(v_results,
      'LULUS: index unik menolak pesanan aktif kedua (23505)');
  end;

  delete from public.orders where student_id = v_student;

  -- Mulai menyamar sebagai siswa.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);

  ---------------------------------------------------------------------------
  -- ATURAN 2 (Review Focus #2) — menu tanpa harga poin tidak boleh dilunasi
  -- dengan poin; kalau lolos, siswa bisa makan gratis.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  update public.menu_items set points_price = null where id = v_item;
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'points');
    v_results := array_append(v_results,
      'GAGAL: menu tanpa points_price tetap bisa dibayar dengan poin');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ004'
      then 'LULUS: menu tanpa points_price ditolak PZ004'
      else 'GAGAL: seharusnya PZ004, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 3 — points_price = 0 diperlakukan sama dengan NULL, bukan gratis.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  update public.menu_items set points_price = 0 where id = v_item;
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'points');
    v_results := array_append(v_results,
      'GAGAL: menu berharga poin 0 bisa dilunasi dengan poin');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ004'
      then 'LULUS: menu berharga poin 0 ditolak PZ004'
      else 'GAGAL: seharusnya PZ004, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 4 — saldo kurang.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  update public.menu_items set points_price = 100 where id = v_item;
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles set points_balance = 10 where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'points');
    v_results := array_append(v_results,
      'GAGAL: saldo 10 poin bisa melunasi pesanan 100 poin');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ003'
      then 'LULUS: saldo kurang ditolak PZ003'
      else 'GAGAL: seharusnya PZ003, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 5 — siswa terblokir.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles
     set preorder_blocked_until = now() + interval '1 day',
         unclaimed_orders_count = 1
   where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'cash');
    v_results := array_append(v_results,
      'GAGAL: siswa terblokir tetap bisa memesan');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ001'
      then 'LULUS: siswa terblokir ditolak PZ001'
      else 'GAGAL: seharusnya PZ001, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 6 — blokir yang sudah lewat direset saat itu juga (reset malas,
  -- tanpa cron) dan siswa boleh memesan lagi.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles
     set preorder_blocked_until = now() - interval '1 minute',
         unclaimed_orders_count = 2,
         points_balance = 5000
   where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 2', null, v_cart, 0, 'cash');

    select unclaimed_orders_count, preorder_blocked_until
      into v_count, v_blocked
    from public.profiles where id = v_student;

    if v_count = 0 and v_blocked is null then
      v_results := array_append(v_results,
        'LULUS: blokir kedaluwarsa direset dan siswa bisa memesan lagi');
    else
      v_results := array_append(v_results,
        'GAGAL: blokir kedaluwarsa tidak direset (count=' || v_count || ')');
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: blokir kedaluwarsa masih menolak -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 7 — satu pesanan aktif. Pesanan dari ATURAN 6 masih aktif, jadi
  -- pemanggilan berikutnya harus ditolak PZ002.
  ---------------------------------------------------------------------------
  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'cash');
    v_results := array_append(v_results,
      'GAGAL: pesanan aktif pertama masih bisa ditambah pesanan kedua');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ002'
      then 'LULUS: pesanan aktif kedua ditolak PZ002'
      else 'GAGAL: seharusnya PZ002, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 8 — inti fiturnya: melunasi pesanan penuh dengan poin.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  delete from public.orders where student_id = v_student;
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles set points_balance = 5000 where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'points');

    if v_order ->> 'payment_mode' = 'points'
       and (v_order ->> 'points_paid')::int = 100
       and (v_order ->> 'points_left')::int = 4900
       and (v_order ->> 'net_total')::int = 0
       and v_order ->> 'status' = 'awaiting_approval' then
      v_results := array_append(v_results,
        'LULUS: bayar penuh dengan poin memotong 100 poin dan melunasi pesanan');
    else
      v_results := array_append(v_results,
        'GAGAL: balikan bayar poin tidak sesuai -> ' || v_order::text);
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: bayar penuh dengan poin gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 9 — jalur tunai tetap seperti dulu, hanya statusnya yang berubah.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  delete from public.orders where student_id = v_student;
  perform set_config('role', 'authenticated', true);

  begin
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'cash');

    if v_order ->> 'status' = 'awaiting_approval'
       and v_order ->> 'payment_mode' = 'cash'
       and (v_order ->> 'points_paid')::int = 0
       and (v_order ->> 'discount')::int = 0
       and coalesce(v_order ->> 'booking_code', '') <> '' then
      v_results := array_append(v_results,
        'LULUS: pesanan tunai masuk sebagai awaiting_approval tanpa potong poin');
    else
      v_results := array_append(v_results,
        'GAGAL: balikan pesanan tunai tidak sesuai -> ' || v_order::text);
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: pesanan tunai ditolak -> ' || sqlstate || ' ' || sqlerrm);
  end;

  raise exception E'\n===== HASIL UJI ATURAN PRE-ORDER (migrasi 003) =====\n%\n=====================================================',
    array_to_string(v_results, E'\n');
end $$;
