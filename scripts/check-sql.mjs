#!/usr/bin/env node
// Menjalankan berkas uji SQL di supabase/tests/ dan menerjemahkan hasilnya
// menjadi exit code.
//
//   node --env-file=.env.local scripts/check-sql.mjs supabase/tests/foo.sql [...]
//
// Berkas uji sengaja berakhir dengan `raise exception` supaya transaksinya
// selalu di-rollback dan barisnya tetap terbaca. Karena itu pemeriksaan di sini
// tidak melihat error sebagai kegagalan, melainkan membaca barisnya:
//
//   LULUS: ...  pemeriksaan yang lolos
//   GAGAL: ...  pemeriksaan yang gagal   -> exit 1
//   LEWAT: ...  pemeriksaan yang tidak bisa dijalankan di lingkungan ini
//
// Exit 1 juga kalau tidak ada satu pun baris LULUS/LEWAT. Nol hasil biasanya
// berarti blok `do` gagal dikompilasi, dan itu tidak boleh terbaca sebagai lulus.

import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL belum diisi di .env.local.");
  process.exit(2);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node --env-file=.env.local scripts/check-sql.mjs <file.sql> [...]");
  process.exit(2);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

let failed = 0;

for (const file of files) {
  const sql = readFileSync(file, "utf8");
  console.log(`\n--- ${file}`);

  let output = "";
  try {
    const res = await client.query(sql);
    for (const r of Array.isArray(res) ? res : [res]) {
      if (r.rows?.length) output += r.rows.map((row) => Object.values(row).join(" ")).join("\n") + "\n";
    }
  } catch (err) {
    // Diharapkan: dipakai untuk memaksa rollback. Pesannya memuat hasilnya.
    output += `${err.message}\n`;
  }

  const lines = output.split(/\r?\n/).filter((l) => /^(LULUS|GAGAL|LEWAT):/.test(l.trim()));
  for (const l of lines) console.log(`  ${l.trim()}`);

  const gagal = lines.filter((l) => l.trim().startsWith("GAGAL:"));
  const lewat = lines.filter((l) => l.trim().startsWith("LEWAT:"));
  const lulus = lines.filter((l) => l.trim().startsWith("LULUS:"));

  if (lines.length === 0) {
    console.log("  (tidak ada baris LULUS/GAGAL — blok `do` kemungkinan gagal dikompilasi)");
    console.log(output.trim());
    failed++;
    continue;
  }

  console.log(`  -> ${lulus.length} lulus, ${gagal.length} gagal, ${lewat.length} lewat`);
  if (gagal.length > 0 || (lulus.length === 0 && lewat.length === 0)) failed++;
}

await client.end();

console.log(
  failed === 0
    ? `\nHASIL: semua berkas uji lulus (${files.length} berkas)`
    : `\nHASIL: ${failed} dari ${files.length} berkas uji gagal`,
);
process.exit(failed === 0 ? 0 : 1);
