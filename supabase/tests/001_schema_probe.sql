-- Probe skema pengerasan pre-order (migrasi 002).
--
-- Satu blok `do` yang mengumpulkan hasil lalu SELALU mengakhiri dengan
-- `raise exception`. Akibatnya transaksinya selalu di-rollback dan barisnya
-- tetap terbaca di panel Messages SQL Editor (atau lewat scripts/db.mjs).
--
--   Sebelum migrasi 002  -> MERAH, dengan beberapa baris "GAGAL: ... does not exist".
--   Sesudah migrasi 002  -> HIJAU, dua belas baris LULUS dan nol GAGAL.
--
-- Catatan penting soal bentuk berkas ini:
--   * Hasil dikumpulkan dengan array_append. Menulis `v_results || 'teks'`
--     dengan literal tanpa tipe itu ambigu: Postgres bisa membacanya sebagai
--     `text[] || text[]` dan melempar "malformed array literal".
--   * Setiap penolakan diperiksa lewat PESANNYA, bukan sekadar "ada exception".
--     Tanpa itu probe ini akan berbohong: sebelum migrasi, `column does not
--     exist` juga berupa exception dan akan salah dilaporkan sebagai penolakan
--     guard yang sah.

do $$
declare
  v_student uuid;
  v_results text[] := '{}';
  v_hit     boolean;
  -- Kalimat yang diharapkan muncul dari prevent_profile_escalation.
  v_guard   constant text := 'hanya dapat diubah oleh sistem';
begin
  select id into v_student
  from auth.users
  where email = 'siswa.demo@skamuda.sch.id';

  if v_student is null then
    raise exception 'Siswa demo tidak ditemukan. Jalankan seed lebih dulu.';
  end if;

  ---------------------------------------------------------------- nilai enum
  select exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'order_status'
      and e.enumlabel = 'awaiting_approval'
  ) into v_hit;
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: enum order_status punya awaiting_approval'
    else 'GAGAL: enum order_status tidak punya awaiting_approval' end);

  select exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'order_status'
      and e.enumlabel = 'unclaimed'
  ) into v_hit;
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: enum order_status punya unclaimed'
    else 'GAGAL: enum order_status tidak punya unclaimed' end);

  --------------------------------------------------------------- kolom baru
  select count(*) = 2 into v_hit
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name in ('unclaimed_orders_count', 'preorder_blocked_until');
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: profiles punya unclaimed_orders_count dan preorder_blocked_until'
    else 'GAGAL: kolom penalti di profiles belum lengkap' end);

  select count(*) = 3 into v_hit
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'orders'
    and column_name in ('payment_mode', 'points_paid', 'points_refunded');
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: orders punya payment_mode, points_paid, points_refunded'
    else 'GAGAL: kolom pembayaran di orders belum lengkap' end);

  select count(*) = 2 into v_hit
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'vouchers'
    and column_name in ('order_id', 'refunded_at');
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: vouchers punya order_id dan refunded_at'
    else 'GAGAL: kolom jejak voucher belum lengkap' end);

  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'orders_student_status_idx'
  ) into v_hit;
  v_results := array_append(v_results, case when v_hit
    then 'LULUS: index orders_student_status_idx ada'
    else 'GAGAL: index orders_student_status_idx tidak ada' end);

  --------------------------------------------------------- guard profil baru
  -- Mulai menyamar sebagai siswa. Dijalankan setelah semua pembacaan katalog
  -- dan auth.users, karena peran authenticated tidak boleh membacanya.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_student::text)::text, true);

  begin
    update public.profiles
       set unclaimed_orders_count = unclaimed_orders_count + 1
     where id = v_student;
    v_results := array_append(v_results,
      'GAGAL: siswa bisa mengubah unclaimed_orders_count sendiri');
  exception when others then
    v_results := array_append(v_results, case when sqlerrm like '%' || v_guard || '%'
      then 'LULUS: guard menolak perubahan unclaimed_orders_count'
      else 'GAGAL: ditolak, tapi bukan oleh guard -> ' || sqlerrm end);
  end;

  -- Nilainya harus benar-benar berbeda dari nilai lama. Menulis nilai yang sama
  -- bukan pelanggaran, dan guard yang benar memang tidak menolaknya — menulis 0
  -- ke kolom yang sudah 0 tidak membuktikan apa pun.
  begin
    update public.profiles
       set preorder_blocked_until = now() + interval '1 day'
     where id = v_student;
    v_results := array_append(v_results,
      'GAGAL: siswa bisa mengatur blokirnya sendiri');
  exception when others then
    v_results := array_append(v_results, case when sqlerrm like '%' || v_guard || '%'
      then 'LULUS: guard menolak perubahan preorder_blocked_until'
      else 'GAGAL: ditolak, tapi bukan oleh guard -> ' || sqlerrm end);
  end;

  -- Jalur sistem harus tetap boleh: RPC menandai transaksinya lewat set_config.
  begin
    perform set_config('app.allow_profile_system_update', 'on', true);
    update public.profiles
       set unclaimed_orders_count = 1, preorder_blocked_until = null
     where id = v_student;
    v_results := array_append(v_results,
      'LULUS: jalur sistem tetap boleh mengubah kolom penalti');
  exception when others then
    v_results := array_append(v_results,
      'GAGAL: jalur sistem ikut ditolak -> ' || sqlerrm);
  end;
  perform set_config('app.allow_profile_system_update', 'off', true);

  -- Tiga pengaman lama harus tetap berlaku, supaya perluasan guard tidak
  -- melubangi yang sudah ada.
  begin
    update public.profiles set points_balance = 999999 where id = v_student;
    v_results := array_append(v_results,
      'GAGAL: siswa bisa menaikkan saldonya sendiri');
  exception when others then
    v_results := array_append(v_results, case when sqlerrm like '%' || v_guard || '%'
      then 'LULUS: guard masih menolak perubahan saldo'
      else 'GAGAL: ditolak, tapi bukan oleh guard -> ' || sqlerrm end);
  end;

  begin
    update public.profiles set role = 'canteen_vendor' where id = v_student;
    v_results := array_append(v_results,
      'GAGAL: siswa bisa menaikkan perannya sendiri');
  exception when others then
    v_results := array_append(v_results, case when sqlerrm like '%' || v_guard || '%'
      then 'LULUS: guard masih menolak perubahan peran'
      else 'GAGAL: ditolak, tapi bukan oleh guard -> ' || sqlerrm end);
  end;

  begin
    update public.profiles set qr_code_token = gen_random_uuid() where id = v_student;
    v_results := array_append(v_results,
      'GAGAL: siswa bisa mengganti tokennya sendiri');
  exception when others then
    v_results := array_append(v_results, case when sqlerrm like '%' || v_guard || '%'
      then 'LULUS: guard masih menolak perubahan token'
      else 'GAGAL: ditolak, tapi bukan oleh guard -> ' || sqlerrm end);
  end;

  raise exception E'\n===== HASIL PROBE SKEMA (migrasi 002) =====\n%\n============================================',
    array_to_string(v_results, E'\n');
end $$;
