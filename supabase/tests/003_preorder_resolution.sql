-- Uji resolusi pesanan (migrasi 003): `vendor_resolve_order` dan
-- `get_preorder_status`.
--
-- Rangka yang sama dengan 002: satu blok `do` yang mengumpulkan hasil lalu
-- SELALU mengakhiri dengan `raise exception`, sehingga transaksinya
-- di-rollback dan barisnya tetap terbaca lewat scripts/check-sql.mjs.
--
-- Blok ini berpindah peran beberapa kali: siswa membuat pesanan, penjual
-- menerimanya, dan persiapan yang tidak boleh dilakukan siswa (mengosongkan
-- pesanan, memasang saldo) dikerjakan sebagai postgres.
--
-- DUA JEBAKAN yang membentuk bentuk berkas ini. Keduanya sudah pernah membuat
-- uji ini berbohong, jadi jangan disederhanakan tanpa membacanya:
--
--   1. Menangkap exception me-rollback subtransaksi blok itu, termasuk
--      penulisan yang sudah berhasil di dalamnya. Karena itu setiap
--      `place_order` di berkas ini dipanggil di tingkat blok, BUKAN di dalam
--      blok try. Kalau tidak, pesanannya lenyap dan uji berikutnya membaca nol
--      baris tanpa error yang kelihatan.
--   2. Perpindahan peran dilakukan di tingkat blok, tidak di dalam exception
--      handler. Handler yang mengubah peran lalu membaca tabel ber-RLS bisa
--      mengembalikan nol baris tanpa error — kegagalan yang tidak terlihat.
--
-- Aturan yang paling penting: penjual TIDAK bisa lagi mengubah status pesanan
-- lewat `update` tabel (`orders_vendor_update` dicabut), jadi seluruh uji di
-- bawah menempuh RPC — jalur yang sama dengan yang dipakai aplikasi.

do $$
declare
  v_student   uuid;
  v_stand     uuid;
  v_vendor    uuid;
  v_stand2    uuid;
  v_vendor2   uuid;
  v_item      uuid;
  v_cart      jsonb;
  v_order     jsonb;
  v_oid       uuid;
  v_oid2      uuid;
  v_oid3      uuid;
  v_results   text[] := '{}';
  v_before    integer;
  v_after     integer;
  v_count     integer;
  v_status    text;
  v_vpts      integer;
  v_paid_cash integer;
  v_paid2     integer;
  v_oid4      uuid;
  v_rows      integer;
  v_refunded  integer;
  v_blocked   timestamptz;
  v_is_block  boolean;
  v_active_id uuid;
  v_active    text;
  v_at        timestamptz;
  v_failed    boolean;
  v_state     text;
begin
  select id into v_student from auth.users where email = 'siswa.demo@skamuda.sch.id';
  if v_student is null then
    raise exception 'Siswa demo tidak ditemukan. Jalankan seed lebih dulu.';
  end if;

  select cs.id, cs.vendor_id into v_stand, v_vendor
  from public.canteen_stands cs
  where cs.is_active and cs.vendor_id is not null
  order by cs.id limit 1;
  if v_stand is null then
    raise exception 'Tidak ada stand aktif yang punya penjual.';
  end if;

  select cs.id, cs.vendor_id into v_stand2, v_vendor2
  from public.canteen_stands cs
  where cs.is_active and cs.vendor_id is not null and cs.id <> v_stand
  order by cs.id limit 1;

  select mi.id into v_item
  from public.menu_items mi
  where mi.stand_id = v_stand and mi.is_available and mi.points_price > 0
  order by mi.id limit 1;
  if v_item is null then
    raise exception 'Tidak ada menu berharga poin di stand aktif.';
  end if;

  v_cart := jsonb_build_array(jsonb_build_object('menu_item_id', v_item, 'quantity', 1));

  ------------------------------------------------------------------ keadaan awal
  delete from public.orders where student_id = v_student;
  perform set_config('app.allow_profile_system_update', 'on', true);
  update public.profiles
     set points_balance = 5000, unclaimed_orders_count = 0, preorder_blocked_until = null
   where id = v_student;
  perform set_config('app.allow_profile_system_update', 'off', true);

  v_results := array_append(v_results, 'INFO: stand=' || v_stand || ' penjual=' || v_vendor);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);

  ---------------------------------------------------------------------------
  -- ATURAN 1 — pesanan baru, lalu penjual menerimanya.
  ---------------------------------------------------------------------------
  v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, 0, 'points');
  v_oid   := (v_order ->> 'order_id')::uuid;
  v_results := array_append(v_results, 'INFO: pesanan uji ' || v_oid);

  begin
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_vendor::text)::text, true);
    v_order := public.vendor_resolve_order(v_oid, 'accept');
    if v_order ->> 'status' = 'processing' then
      v_results := array_append(v_results,
        'LULUS: penjual menerima pesanan sehingga berstatus processing');
    else
      v_results := array_append(v_results,
        'GAGAL: status setelah accept = ' || coalesce(v_order ->> 'status', 'kosong'));
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: alur terima pesanan gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 2 — penjual menandai siap diambil.
  ---------------------------------------------------------------------------
  begin
    v_order := public.vendor_resolve_order(v_oid, 'ready');
    if v_order ->> 'status' = 'ready_for_pickup' then
      v_results := array_append(v_results,
        'LULUS: penjual menandai pesanan siap diambil');
    else
      v_results := array_append(v_results,
        'GAGAL: status setelah ready = ' || coalesce(v_order ->> 'status', 'kosong'));
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: alur siap diambil gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 3 — get_preorder_status melaporkan pesanan yang sedang berjalan.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  begin
    v_order := public.get_preorder_status();
    v_active_id := (v_order ->> 'active_order_id')::uuid;
    v_active    := v_order ->> 'active_order_status';

    if v_active_id = v_oid and v_active = 'ready_for_pickup'
       and (v_order ->> 'is_blocked')::boolean = false then
      v_results := array_append(v_results,
        'LULUS: get_preorder_status melaporkan pesanan aktif yang benar');
    else
      v_results := array_append(v_results,
        'GAGAL: get_preorder_status tidak sesuai -> ' || v_order::text);
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: get_preorder_status gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 4 — perpindahan status tidak legal ditolak PZ005.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_vendor::text)::text, true);
  begin
    v_order := public.vendor_resolve_order(v_oid, 'accept');
    v_results := array_append(v_results,
      'GAGAL: pesanan yang sudah siap diambil masih bisa diterima ulang');
  exception when others then
    v_results := array_append(v_results, case when sqlstate = 'PZ005'
      then 'LULUS: perpindahan status tidak legal ditolak PZ005'
      else 'GAGAL: seharusnya PZ005, dapat ' || sqlstate || ' -> ' || sqlerrm end);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 5 — penjual stand lain tidak bisa menyentuh pesanan ini. Wajib,
  -- karena security definer melewati RLS: tanpa pemeriksaan kepemilikan,
  -- penjual mana pun bisa mengubah pesanan stand siapa pun.
  ---------------------------------------------------------------------------
  if v_vendor2 is null then
    v_results := array_append(v_results,
      'LEWAT: hanya ada satu stand berpenjual, penjual lain tidak bisa diuji');
  else
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_vendor2::text)::text, true);

    v_failed := false;
    v_state  := null;
    begin
      v_order := public.vendor_resolve_order(v_oid, 'complete');
    exception when others then
      v_failed := true;
      v_state  := sqlstate;
    end;

    -- Diperiksa sebagai penjual pemilik pesanan, di luar handler.
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_vendor::text)::text, true);
    v_status := null;
    select o.status::text into v_status from public.orders o where o.id = v_oid;

    if v_failed and v_status = 'ready_for_pickup' then
      v_results := array_append(v_results,
        'LULUS: penjual stand lain ditolak dan status pesanan tidak berubah');
    else
      v_results := array_append(v_results,
        'GAGAL: penjual stand lain (gagal=' || v_failed ||
        ' status=' || coalesce(v_status, 'null') ||
        ' sqlstate=' || coalesce(v_state, '-') || ')');
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- ATURAN 6 — siswa sendiri pun tidak boleh mengelola pesanan lewat RPC ini.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  begin
    v_order := public.vendor_resolve_order(v_oid, 'complete');
    v_results := array_append(v_results,
      'GAGAL: siswa bisa menyelesaikan pesanannya sendiri');
  exception when others then
    v_results := array_append(v_results,
      'LULUS: siswa ditolak saat mencoba mengelola pesanan sebagai penjual');
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 7 (Review Focus #3) — pelanggaran pertama masih dimaafkan: poin
  -- kembali penuh, hitungan 1, belum ada blokir.
  -- ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  select points_balance into v_before from public.profiles where id = v_student;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_vendor::text)::text, true);
  begin
    v_order := public.vendor_resolve_order(v_oid, 'unclaimed');
    v_count    := (v_order ->> 'unclaimed_count')::int;
    v_blocked  := (v_order ->> 'blocked_until')::timestamptz;
    v_refunded := (v_order ->> 'points_refunded')::int;

    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_student::text)::text, true);
    select points_balance into v_after from public.profiles where id = v_student;

    -- v_before dibaca sesudah pesanan dibuat, jadi yang benar adalah saldo
    -- naik tepat sebesar yang dikembalikan — bukan tetap sama.
    if v_count = 1 and v_blocked is null and v_order ->> 'status' = 'unclaimed'
       and v_after = v_before + v_refunded and v_refunded > 0 then
      v_results := array_append(v_results,
        'LULUS: pelanggaran pertama mengembalikan poin penuh tanpa blokir');
    else
      v_results := array_append(v_results,
        'GAGAL: pelanggaran pertama salah (count=' || v_count ||
        ' blokir=' || coalesce(v_blocked::text, 'null') ||
        ' sebelum=' || v_before || ' sesudah=' || v_after ||
        ' kembali=' || v_refunded || ')');
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: pelanggaran pertama gagal diproses -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 8 — pelanggaran kedua: poin hangus dan pre-order diblokir 3 hari.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  select points_balance into v_before from public.profiles where id = v_student;

  -- Sisa pesanan dibersihkan lebih dulu. Saat semuanya berjalan benar, ini tidak
  -- melakukan apa-apa: pesanan ATURAN 7 sudah berstatus unclaimed dan tidak lagi
  -- aktif. Gunanya untuk keadaan gagal — tanpa ini, satu aturan yang gagal
  -- meninggalkan pesanan aktif, aturan berikutnya tersandung PZ002, dan seluruh
  -- blok berhenti tanpa satu pun baris hasil yang bisa dibaca.
  perform set_config('role', 'postgres', true);
  delete from public.orders where student_id = v_student;
  perform set_config('role', 'authenticated', true);

  -- Dibuat di tingkat blok, lihat catatan jebakan nomor 1 di kepala berkas.
  v_order := public.place_order(v_stand, 'Istirahat 2', null, v_cart, 0, 'points');
  v_oid2  := (v_order ->> 'order_id')::uuid;
  v_paid2 := (v_order ->> 'points_paid')::int;

  begin
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_vendor::text)::text, true);
    perform public.vendor_resolve_order(v_oid2, 'accept');
    perform public.vendor_resolve_order(v_oid2, 'ready');
    v_order := public.vendor_resolve_order(v_oid2, 'unclaimed');

    v_count    := (v_order ->> 'unclaimed_count')::int;
    v_blocked  := (v_order ->> 'blocked_until')::timestamptz;
    v_refunded := (v_order ->> 'points_refunded')::int;

    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_student::text)::text, true);
    select points_balance into v_after from public.profiles where id = v_student;

    -- Pelanggaran kedua: poin tidak kembali, jadi saldo turun tepat sebesar
    -- yang dibayarkan dan points_refunded tetap nol.
    if v_count = 2 and v_blocked is not null and v_blocked > now()
       and v_after = v_before - v_paid2 and v_refunded = 0 then
      v_results := array_append(v_results,
        'LULUS: pelanggaran kedua menghanguskan poin dan memblokir 3 hari');
    else
      v_results := array_append(v_results,
        'GAGAL: pelanggaran kedua salah (count=' || v_count ||
        ' blokir=' || coalesce(v_blocked::text, 'null') ||
        ' sebelum=' || v_before || ' dibayar=' || v_paid2 ||
        ' sesudah=' || v_after || ' kembali=' || v_refunded || ')');
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: pelanggaran kedua gagal diproses -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 9 (Review Focus #3) — menandai tidak diambil dua kali tidak dihitung
  -- dua kali. Tanpa ini, satu pesanan yang salah tandai bisa memblokir siswa.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_vendor::text)::text, true);

  v_failed := false;
  v_state  := null;
  begin
    v_order := public.vendor_resolve_order(v_oid2, 'unclaimed');
  exception when others then
    v_failed := true;
    v_state  := sqlstate;
  end;

  -- Hitungan dibaca sebagai siswa pemiliknya sendiri, di luar handler.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  select p.unclaimed_orders_count into v_count
  from public.profiles p where p.id = v_student;

  if v_failed and v_state = 'PZ005' and v_count = 2 then
    v_results := array_append(v_results,
      'LULUS: tandai ganda ditolak PZ005 dan hitungan tidak bertambah');
  else
    v_results := array_append(v_results,
      'GAGAL: penolakan ganda salah (gagal=' || v_failed ||
      ' sqlstate=' || coalesce(v_state, '-') || ' count=' || v_count || ')');
  end if;

  ---------------------------------------------------------------------------
  -- ATURAN 10 — get_preorder_status melaporkan blokir yang sedang aktif.
  ---------------------------------------------------------------------------
  begin
    v_order := public.get_preorder_status();
    v_is_block := (v_order ->> 'is_blocked')::boolean;
    v_at       := (v_order ->> 'blocked_until')::timestamptz;
    v_count    := (v_order ->> 'unclaimed_count')::int;

    if v_is_block and v_at is not null and v_at > now() and v_count = 2 then
      v_results := array_append(v_results,
        'LULUS: get_preorder_status melaporkan blokir yang sedang aktif');
    else
      v_results := array_append(v_results,
        'GAGAL: laporan blokir tidak sesuai -> ' || v_order::text);
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: get_preorder_status saat diblokir gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 11 — penjual menolak pesanan: poin voucher kembali dan jejaknya
  -- tercatat di vouchers.refunded_at.
  ---------------------------------------------------------------------------
  select vt.points_cost into v_vpts
  from public.voucher_tiers vt
  where vt.is_active
  order by vt.points_cost limit 1;

  if v_vpts is null then
    v_results := array_append(v_results,
      'LEWAT: tidak ada tier voucher aktif, pengembalian voucher tidak bisa diuji');
  else
    -- Persiapan dikerjakan di tingkat blok, bukan di dalam blok ber-exception.
    perform set_config('role', 'postgres', true);
    perform set_config('app.allow_profile_system_update', 'on', true);
    update public.profiles
       set points_balance = 5000, unclaimed_orders_count = 0, preorder_blocked_until = null
     where id = v_student;
    perform set_config('app.allow_profile_system_update', 'off', true);
    delete from public.orders where student_id = v_student;
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_student::text)::text, true);
    select points_balance into v_before from public.profiles where id = v_student;

    -- Dibuat di tingkat blok, lihat catatan jebakan nomor 1 di kepala berkas.
    v_order := public.place_order(v_stand, 'Istirahat 1', null, v_cart, v_vpts, 'cash');
    v_oid3  := (v_order ->> 'order_id')::uuid;
    v_paid_cash := (v_order ->> 'points_paid')::int;

    begin
      perform set_config('request.jwt.claims',
                         json_build_object('sub', v_vendor::text)::text, true);
      v_order := public.vendor_resolve_order(v_oid3, 'reject');

      -- Sisanya dibaca sebagai siswa pemilik pesanan dan vouchernya sendiri.
      perform set_config('request.jwt.claims',
                         json_build_object('sub', v_student::text)::text, true);
      select points_balance into v_after from public.profiles where id = v_student;
      select o.points_refunded into v_refunded from public.orders o where o.id = v_oid3;
      select count(*) into v_count from public.vouchers v
      where v.order_id = v_oid3 and v.refunded_at is not null;

      if v_order ->> 'status' = 'cancelled' and v_after = v_before
         and v_refunded = v_paid_cash and v_count = 1 then
        v_results := array_append(v_results,
          'LULUS: penolakan mengembalikan poin voucher dan menandai voucher dikembalikan');
      else
        v_results := array_append(v_results,
          'GAGAL: pengembalian voucher salah (status=' || coalesce(v_order ->> 'status', '?') ||
          ' paid=' || v_paid_cash || ' refunded=' || v_refunded ||
          ' voucher=' || v_count || ' sebelum=' || v_before || ' sesudah=' || v_after || ')');
      end if;
    exception when others then
      v_results := array_append(v_results,
        'GAGAL: alur penolakan pesanan gagal -> ' || sqlstate || ' ' || sqlerrm);
    end;
  end if;

  ---------------------------------------------------------------------------
  -- ATURAN 12 — setelah blokir dan hitungan direset, keadaannya bersih lagi.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);
  begin
    v_order := public.get_preorder_status();

    if (v_order ->> 'is_blocked')::boolean = false
       and (v_order ->> 'unclaimed_count')::int = 0
       and v_order ->> 'active_order_id' is null then
      v_results := array_append(v_results,
        'LULUS: get_preorder_status kembali bersih tanpa pesanan aktif');
    else
      v_results := array_append(v_results,
        'GAGAL: keadaan akhir tidak bersih -> ' || v_order::text);
    end if;
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: pemeriksaan keadaan akhir gagal -> ' || sqlstate || ' ' || sqlerrm);
  end;

  ---------------------------------------------------------------------------
  -- ATURAN 13 — penjual tidak lagi bisa menulis langsung ke tabel orders.
  -- Inilah alasan seluruh pengelolaan pindah ke RPC: `update` langsung tidak
  -- punya aturan transisi sama sekali, dan RLS-lah satu-satunya yang menghentikan
  -- penjual mengubah status seenaknya. Hak UPDATE-nya sendiri masih ada
  -- (grant all di migrasi 001), jadi yang diuji di sini memang policy-nya.
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  delete from public.orders where student_id = v_student;
  insert into public.orders (student_id, stand_id, pickup_time_slot, total_price, status)
  values (v_student, v_stand, 'Istirahat 1', 10000, 'awaiting_approval')
  returning id into v_oid4;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_vendor::text)::text, true);

  update public.orders set status = 'completed' where id = v_oid4;
  get diagnostics v_rows = row_count;

  perform set_config('role', 'postgres', true);
  v_status := null;
  select o.status::text into v_status from public.orders o where o.id = v_oid4;
  perform set_config('role', 'authenticated', true);

  if v_rows = 0 and v_status = 'awaiting_approval' then
    v_results := array_append(v_results,
      'LULUS: penjual tidak bisa lagi menulis status pesanan langsung ke tabel');
  else
    v_results := array_append(v_results,
      'GAGAL: update langsung oleh penjual berpengaruh (baris=' || v_rows ||
      ' status=' || coalesce(v_status, 'null') || ')');
  end if;

  raise exception E'\n===== HASIL UJI RESOLUSI PESANAN (migrasi 003) =====\n%\n=======================================================',
    array_to_string(v_results, E'\n');
end $$;
