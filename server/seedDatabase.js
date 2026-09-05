#!/usr/bin/env node
/**
 * Script Seeder Database E-Kinerja AI untuk MySQL, PostgreSQL, & JSON Store
 * Cara pakai:
 *   npm run seed
 *   node server/seedDatabase.js
 *   node server/seedDatabase.js --force
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat variabel lingkungan
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch (e) {}
}

import { 
  DEFAULT_SEED_ACCOUNTS, 
  DEFAULT_SEED_JOURNALS, 
  DEFAULT_PENILAI, 
  hashPassword,
  saveStore,
  getStore
} from "./dbStore.js";
import { getActiveDbType } from "./dbAdapter.js";
import { getMysqlConfig, getPool as getMysqlPool, initMysqlDatabase } from "./mysqlAdapter.js";
import { getPostgresConfig, getPool as getPostgresPool, initPostgresDatabase } from "./postgresAdapter.js";

async function main() {
  const isForce = process.argv.includes("--force");
  const activeType = getActiveDbType();

  console.log("========================================================================");
  console.log("🌱 [SEEDER E-KINERJA AI] MEMULAI PROSES SEED DATABASE");
  console.log("========================================================================");

  if (activeType === "mysql") {
    const mysqlConfig = getMysqlConfig();
    console.log(`🔌 Target Database : MySQL / MariaDB (${mysqlConfig.database} @ ${mysqlConfig.host}:${mysqlConfig.port})`);
    try {
      const pool = getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await initMysqlDatabase();

        if (isForce) {
          console.log("⚠️ Mode --force aktif: Membersihkan tabel sebelum seeding...");
          await conn.query("DELETE FROM accounts");
          await conn.query("DELETE FROM journals");
          await conn.query("DELETE FROM registration_codes");
          await conn.query("DELETE FROM web_sessions");
          await conn.query("DELETE FROM telegram_sessions");
          await conn.query("DELETE FROM system_settings");
        }

        const [existing] = await conn.query("SELECT COUNT(*) AS cnt FROM accounts");
        if (existing[0]?.cnt > 0 && !isForce) {
          console.log(`ℹ️ Tabel accounts sudah berisi ${existing[0].cnt} akun. Gunakan '--force' jika ingin menimpa.`);
        } else {
          for (const acc of DEFAULT_SEED_ACCOUNTS) {
            const safePwd = hashPassword(acc.password);
            await conn.query(`
              INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                password = VALUES(password),
                role = VALUES(role),
                nama = VALUES(nama)
            `, [
              acc.id,
              acc.username,
              safePwd,
              acc.role || "pegawai",
              acc.nama,
              acc.nip || "",
              acc.pangkat || "",
              acc.jabatan || "",
              acc.unitKerja || "",
              acc.allowEnvKey !== false ? 1 : 0,
              acc.personalApiKey || null,
              acc.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ]);
            console.log(`   + Akun: @${acc.username} (${acc.role}) - ${acc.nama}`);
          }

          for (const jrn of DEFAULT_SEED_JOURNALS) {
            await conn.query(`
              INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                aktivitas = VALUES(aktivitas)
            `, [
              jrn.id,
              jrn.userId,
              jrn.tanggal,
              jrn.jam || "",
              jrn.aktivitas,
              jrn.aktivitasKasaran || "",
              jrn.outputJumlah || "",
              jrn.catatan || "",
              jrn.linkUrl || "",
              jrn.evidenceType || "none",
              jrn.docCategory || "pdf",
              jrn.fileName || "",
              jrn.storedName || "",
              jrn.fileSize || "",
              jrn.originalSize || "",
              jrn.fotoUrl || "",
              jrn.fileUrl || "",
              JSON.stringify(jrn.attachments || []),
              jrn.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ]);
          }

          await conn.query(`
            INSERT INTO system_settings (setting_key, setting_val, updated_at)
            VALUES ('penilai', ?, ?)
            ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val), updated_at = VALUES(updated_at)
          `, [JSON.stringify(DEFAULT_PENILAI), new Date().toISOString()]);

          await conn.query(`
            INSERT INTO system_settings (setting_key, setting_val, updated_at)
            VALUES ('settings', ?, ?)
            ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val), updated_at = VALUES(updated_at)
          `, [JSON.stringify({ gdriveLink: "" }), new Date().toISOString()]);

          console.log("✅ Seeding MySQL Selesai dengan Sukses!");
        }
      } finally {
        conn.release();
        await pool.end();
      }
    } catch (e) {
      console.error("❌ Gagal seeding MySQL:", e.message);
    }
  } else if (activeType === "postgres") {
    const pgConfig = getPostgresConfig();
    console.log(`🔌 Target Database : PostgreSQL (${pgConfig.database} @ ${pgConfig.host}:${pgConfig.port})`);
    try {
      const pool = getPostgresPool();
      const client = await pool.connect();

      try {
        await initPostgresDatabase();

        if (isForce) {
          console.log("⚠️ Mode --force aktif: Membersihkan tabel PostgreSQL sebelum seeding...");
          await client.query("DELETE FROM accounts");
          await client.query("DELETE FROM journals");
          await client.query("DELETE FROM registration_codes");
          await client.query("DELETE FROM web_sessions");
          await client.query("DELETE FROM telegram_sessions");
          await client.query("DELETE FROM system_settings");
        }

        const existing = await client.query("SELECT COUNT(*) AS cnt FROM accounts");
        const count = parseInt(existing.rows[0]?.cnt || "0", 10);
        if (count > 0 && !isForce) {
          console.log(`ℹ️ Tabel accounts sudah berisi ${count} akun. Gunakan '--force' jika ingin menimpa.`);
        } else {
          for (const acc of DEFAULT_SEED_ACCOUNTS) {
            const safePwd = hashPassword(acc.password);
            await client.query(`
              INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (id) DO UPDATE SET
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                nama = EXCLUDED.nama
            `, [
              acc.id,
              acc.username,
              safePwd,
              acc.role || "pegawai",
              acc.nama,
              acc.nip || "",
              acc.pangkat || "",
              acc.jabatan || "",
              acc.unitKerja || "",
              acc.allowEnvKey !== false,
              acc.personalApiKey || null,
              acc.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ]);
            console.log(`   + Akun: @${acc.username} (${acc.role}) - ${acc.nama}`);
          }

          for (const jrn of DEFAULT_SEED_JOURNALS) {
            await client.query(`
              INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
              ON CONFLICT (id) DO UPDATE SET
                aktivitas = EXCLUDED.aktivitas
            `, [
              jrn.id,
              jrn.userId,
              jrn.tanggal,
              jrn.jam || "",
              jrn.aktivitas,
              jrn.aktivitasKasaran || "",
              jrn.outputJumlah || "",
              jrn.catatan || "",
              jrn.linkUrl || "",
              jrn.evidenceType || "none",
              jrn.docCategory || "pdf",
              jrn.fileName || "",
              jrn.storedName || "",
              jrn.fileSize || "",
              jrn.originalSize || "",
              jrn.fotoUrl || "",
              jrn.fileUrl || "",
              JSON.stringify(jrn.attachments || []),
              jrn.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ]);
          }

          await client.query(`
            INSERT INTO system_settings (setting_key, setting_val, updated_at)
            VALUES ('penilai', $1, $2)
            ON CONFLICT (setting_key) DO UPDATE SET
              setting_val = EXCLUDED.setting_val,
              updated_at = EXCLUDED.updated_at
          `, [JSON.stringify(DEFAULT_PENILAI), new Date().toISOString()]);

          await client.query(`
            INSERT INTO system_settings (setting_key, setting_val, updated_at)
            VALUES ('settings', $1, $2)
            ON CONFLICT (setting_key) DO UPDATE SET
              setting_val = EXCLUDED.setting_val,
              updated_at = EXCLUDED.updated_at
          `, [JSON.stringify({ gdriveLink: "" }), new Date().toISOString()]);

          console.log("✅ Seeding PostgreSQL Selesai dengan Sukses!");
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (e) {
      console.error("❌ Gagal seeding PostgreSQL:", e.message);
    }
  } else {
    console.log("📁 Target Database : JSON Store Lokal (database/ekinerja_store.json)");
    const current = getStore();
    current.accounts = DEFAULT_SEED_ACCOUNTS;
    current.journals = DEFAULT_SEED_JOURNALS;
    current.penilai = DEFAULT_PENILAI;
    saveStore(current);
    console.log("✅ Seeding JSON Store Lokal Selesai!");
  }

  console.log("========================================================================");
  console.log("🎉 PROSES SEEDING SELESAI!");
  console.log("========================================================================");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal Error saat seeding:", err);
  process.exit(1);
});
