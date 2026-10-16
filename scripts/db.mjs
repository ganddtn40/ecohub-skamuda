#!/usr/bin/env node
// Menjalankan SQL terhadap database Supabase dari terminal.
//
// Butuh satu baris `SUPABASE_DB_URL=...` di `.env.local` (URI Session pooler
// dari Supabase -> Connect). Jalankan lewat --env-file supaya nilainya tidak
// pernah masuk ke argumen proses yang bisa terbaca proses lain:
//
//   node --env-file=.env.local scripts/db.mjs supabase/migrations/002_preorder_schema.sql
//   node --env-file=.env.local scripts/db.mjs -e "select count(*) from public.orders"
//
// Seluruh isi berkas dikirim sebagai satu simple query, sama seperti yang
// dilakukan SQL Editor. Jadi batas transaksi yang diandalkan migrasi
// (mis. Postgres menolak memakai nilai enum di transaksi yang sama dengan saat
// nilai itu ditambahkan) ikut berlaku di sini.
//
// Skrip uji di supabase/tests/ sengaja berakhir dengan `raise exception` supaya
// transaksinya selalu di-rollback. Itu karena itu keluarannya berupa ERROR
// dengan SQLSTATE P0001 dan pesannya memuat baris LULUS/GAGAL. Itu normal.

import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL belum diisi di .env.local.");
  process.exit(2);
}

const args = process.argv.slice(2);
let sql;
let label;
if (args[0] === "-e") {
  if (!args[1]) {
    console.error("usage: node --env-file=.env.local scripts/db.mjs -e <sql>");
    process.exit(2);
  }
  sql = args[1];
  label = "<inline>";
} else if (args[0]) {
  sql = readFileSync(args[0], "utf8");
  label = args[0];
} else {
  console.error("usage: node --env-file=.env.local scripts/db.mjs <file.sql> | -e <sql>");
  process.exit(2);
}

// rejectUnauthorized false: pooler Supabase memakai sertifikat yang tidak
// selalu ada di trust store Windows. Koneksinya tetap terenkripsi.
const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

client.on("notice", (n) => console.log(`NOTICE: ${n.message}`));

console.log(`--- ${label}`);
await client.connect();
try {
  const res = await client.query(sql);
  for (const r of Array.isArray(res) ? res : [res]) {
    if (r.rows?.length) console.log(JSON.stringify(r.rows, null, 2));
    else if (r.command) console.log(`${r.command} ok`);
  }
  console.log("OK");
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  if (err.code) console.error(`SQLSTATE: ${err.code}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
