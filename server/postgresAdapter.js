import pg from "pg";
import { 
  DEFAULT_SEED_ACCOUNTS, 
  DEFAULT_SEED_JOURNALS, 
  hashPassword 
} from "./dbStore.js";

const { Pool } = pg;

let poolInstance = null;
let isInitialized = false;

/**
 * Mendapatkan konfigurasi PostgreSQL dari environment (mendukung DB_* dan VITE_DB_*)
 */
export function getPostgresConfig() {
  const dbType = (process.env.DB_TYPE || process.env.VITE_DB_TYPE || "").toLowerCase();
  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "";
  const isPg = dbType === "postgres" || dbType === "postgresql" || dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (!isPg) return null;

  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    try {
      const u = new URL(dbUrl);
      return {
        connectionString: dbUrl,
        host: u.hostname,
        port: parseInt(u.port || "5432", 10),
        user: decodeURIComponent(u.username || "postgres"),
        password: decodeURIComponent(u.password || ""),
        database: u.pathname.replace(/^\//, "") || "ekinerja_db",
        max: 10,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      };
    } catch (e) {
      console.warn("[PostgreSQL] Gagal mengurai DATABASE_URL:", e.message);
    }
  }

  return {
    host: process.env.DB_HOST || process.env.VITE_DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.VITE_DB_PORT || "5432", 10),
    user: process.env.DB_USER || process.env.VITE_DB_USER || "postgres",
    password: process.env.DB_PASSWORD || process.env.VITE_DB_PASSWORD || "",
    database: process.env.DB_NAME || process.env.VITE_DB_NAME || "ekinerja_db",
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  };
}

/**
 * Dapatkan atau buat PostgreSQL Pool Singleton
 */
export function getPool() {
  const config = getPostgresConfig();
  if (!config) return null;

  if (!poolInstance) {
    poolInstance = new Pool(config);
    poolInstance.on("error", (err) => {
      console.error("[PostgreSQL] Pool error tidak terduga:", err.message);
    });
  }
  return poolInstance;
}

/**
 * Inisialisasi Tabel & Seeder Otomatis pada Database PostgreSQL
 */
export async function initPostgresDatabase() {
  const config = getPostgresConfig();
  if (!config) {
    return { enabled: false, reason: "PostgreSQL tidak dikonfigurasi." };
  }

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      console.log(`[PostgreSQL] Terhubung ke database '${config.database}' di host '${config.host}:${config.port}'.`);

      // 1. Tabel Accounts
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'pegawai',
          nama VARCHAR(255) NOT NULL,
          nip VARCHAR(50) DEFAULT '',
          pangkat VARCHAR(100) DEFAULT '',
          jabatan VARCHAR(150) DEFAULT '',
          unit_kerja VARCHAR(255) DEFAULT '',
          allow_env_key BOOLEAN DEFAULT TRUE,
          personal_api_key TEXT,
          created_at VARCHAR(50),
          updated_at VARCHAR(50)
        );
      `);

      // 2. Tabel Journals
      await client.query(`
        CREATE TABLE IF NOT EXISTS journals (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          tanggal VARCHAR(20) NOT NULL,
          jam VARCHAR(50) DEFAULT '',
          aktivitas TEXT NOT NULL,
          aktivitas_kasaran TEXT,
          output_jumlah VARCHAR(255) DEFAULT '',
          catatan TEXT,
          link_url TEXT,
          evidence_type VARCHAR(50) DEFAULT 'none',
          doc_category VARCHAR(50) DEFAULT 'pdf',
          file_name VARCHAR(255) DEFAULT '',
          stored_name VARCHAR(255) DEFAULT '',
          file_size VARCHAR(50) DEFAULT '',
          original_size VARCHAR(50) DEFAULT '',
          foto_url TEXT,
          file_url TEXT,
          attachments TEXT,
          created_at VARCHAR(50),
          updated_at VARCHAR(50)
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pg_jrn_user ON journals (user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pg_jrn_tanggal ON journals (tanggal);`);

      // 3. Tabel Registration Codes
      await client.query(`
        CREATE TABLE IF NOT EXISTS registration_codes (
          id VARCHAR(64) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          max_uses INT DEFAULT 1,
          used_count INT DEFAULT 0,
          expires_at VARCHAR(50) NULL,
          is_active BOOLEAN DEFAULT TRUE,
          role VARCHAR(50) DEFAULT 'pegawai',
          note TEXT,
          allow_env_key BOOLEAN DEFAULT TRUE,
          created_by VARCHAR(100) DEFAULT 'superadmin',
          used_by TEXT,
          created_at VARCHAR(50)
        );
      `);

      // 4. Tabel Web Sessions
      await client.query(`
        CREATE TABLE IF NOT EXISTS web_sessions (
          token VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          expires_at BIGINT NOT NULL,
          created_at VARCHAR(50)
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pg_sess_user ON web_sessions (user_id);`);

      // 5. Tabel Telegram Sessions
      await client.query(`
        CREATE TABLE IF NOT EXISTS telegram_sessions (
          chat_id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          created_at VARCHAR(50)
        );
      `);

      // 6. Tabel System Settings
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_val TEXT,
          updated_at VARCHAR(50)
        );
      `);

      // 7. SEEDER OTOMATIS: JALANKAN JIKA TABEL ACCOUNTS KOSONG
      const accRes = await client.query("SELECT COUNT(*) AS count FROM accounts");
      let accountCount = parseInt(accRes.rows[0]?.count || "0", 10);

      if (accountCount === 0) {
        console.log("🌱 [PostgreSQL Seeder] Database kosong terdeteksi! Memulai eksekusi seeder awal...");

        // A. Seed Akun Default
        for (const acc of DEFAULT_SEED_ACCOUNTS) {
          const safePwd = hashPassword(acc.password);
          await client.query(`
            INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              password = EXCLUDED.password,
              role = EXCLUDED.role,
              nama = EXCLUDED.nama,
              nip = EXCLUDED.nip,
              pangkat = EXCLUDED.pangkat,
              jabatan = EXCLUDED.jabatan,
              unit_kerja = EXCLUDED.unit_kerja,
              allow_env_key = EXCLUDED.allow_env_key,
              personal_api_key = EXCLUDED.personal_api_key,
              updated_at = EXCLUDED.updated_at
          `, [
            acc.id,
            acc.username,
            safePwd,
            acc.role || "pegawai",
            acc.nama || acc.username,
            acc.nip || "",
            acc.pangkat || "",
            acc.jabatan || "",
            acc.unitKerja || "",
            acc.allowEnvKey !== false,
            acc.personalApiKey || null,
            acc.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        // B. Seed Jurnal Default
        for (const jrn of DEFAULT_SEED_JOURNALS) {
          await client.query(`
            INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              tanggal = EXCLUDED.tanggal,
              jam = EXCLUDED.jam,
              aktivitas = EXCLUDED.aktivitas,
              aktivitas_kasaran = EXCLUDED.aktivitas_kasaran,
              output_jumlah = EXCLUDED.output_jumlah,
              catatan = EXCLUDED.catatan,
              link_url = EXCLUDED.link_url,
              evidence_type = EXCLUDED.evidence_type,
              doc_category = EXCLUDED.doc_category,
              file_name = EXCLUDED.file_name,
              stored_name = EXCLUDED.stored_name,
              file_size = EXCLUDED.file_size,
              original_size = EXCLUDED.original_size,
              foto_url = EXCLUDED.foto_url,
              file_url = EXCLUDED.file_url,
              attachments = EXCLUDED.attachments,
              updated_at = EXCLUDED.updated_at
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
            new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        // C. Seed Pengaturan Global
        await client.query(`
          INSERT INTO system_settings (setting_key, setting_val, updated_at)
          VALUES ('settings', $1, $2)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_val = EXCLUDED.setting_val,
            updated_at = EXCLUDED.updated_at
        `, [JSON.stringify({ gdriveLink: "" }), new Date().toISOString()]);

        const countAfter = await client.query("SELECT COUNT(*) AS count FROM accounts");
        accountCount = parseInt(countAfter.rows[0]?.count || String(DEFAULT_SEED_ACCOUNTS.length), 10);

        console.log(`
========================================================================
🎉 [PostgreSQL Seeder] SEEDER DATABASE POSTGRESQL SUKSES!
========================================================================
📦 Database       : ${config.database} (${config.host}:${config.port})
👥 Akun Dibuat    : ${accountCount} Akun Terdaftar
   - Superadmin   : Username "superadmin" (Role: superadmin)
   - Pegawai 1    : Username "farras" (Role: pegawai)
   - Pegawai 2    : Username "budi.santoso" (Role: pegawai)
📝 Jurnal Dibuat  : 3 Kegiatan Jurnal Contoh
========================================================================
`);
      } else {
        console.log(`ℹ️ [PostgreSQL] Database sudah berisi ${accountCount} akun terdaftar. Tidak perlu re-seeding.`);
      }

      isInitialized = true;
      return { enabled: true, accountCount };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`❌ [PostgreSQL] Gagal menghubungkan atau menginisialisasi PostgreSQL (${config.host}:${config.port}):`, err.message);
    console.warn("⚠️ Sistem otomatis fallback ke penyimpanan file JSON lokal database/ekinerja_store.json.");
    return { enabled: false, error: err.message };
  }
}

/**
 * Mengambil seluruh store dari PostgreSQL
 */
export async function loadStoreFromPostgres() {
  const pool = getPool();
  if (!pool || !isInitialized) return null;

  try {
    const client = await pool.connect();
    try {
      // Ambil Accounts
      const accRes = await client.query("SELECT * FROM accounts");
      const accounts = accRes.rows.map(r => ({
        id: r.id,
        username: r.username,
        password: r.password,
        role: r.role,
        nama: r.nama,
        nip: r.nip,
        pangkat: r.pangkat,
        jabatan: r.jabatan,
        unitKerja: r.unit_kerja,
        allowEnvKey: Boolean(r.allow_env_key),
        personalApiKey: r.personal_api_key || "",
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));

      // Ambil Journals
      const jrnRes = await client.query("SELECT * FROM journals ORDER BY tanggal DESC, jam DESC");
      const journals = jrnRes.rows.map(r => {
        let attachments = [];
        try {
          if (r.attachments) attachments = JSON.parse(r.attachments);
        } catch (e) {}

        return {
          id: r.id,
          userId: r.user_id,
          tanggal: r.tanggal,
          jam: r.jam,
          aktivitas: r.aktivitas,
          aktivitasKasaran: r.aktivitas_kasaran,
          outputJumlah: r.output_jumlah,
          catatan: r.catatan,
          linkUrl: r.link_url,
          evidenceType: r.evidence_type,
          docCategory: r.doc_category,
          fileName: r.file_name,
          storedName: r.stored_name,
          fileSize: r.file_size,
          originalSize: r.original_size,
          fotoUrl: r.foto_url,
          fileUrl: r.file_url,
          attachments,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });

      // Ambil Registration Codes
      const codeRes = await client.query("SELECT * FROM registration_codes");
      const registrationCodes = codeRes.rows.map(r => {
        let usedBy = [];
        try {
          if (r.used_by) usedBy = JSON.parse(r.used_by);
        } catch (e) {}
        return {
          id: r.id,
          code: r.code,
          maxUses: r.max_uses,
          usedCount: r.used_count,
          expiresAt: r.expires_at,
          isActive: Boolean(r.is_active),
          role: r.role,
          note: r.note,
          allowEnvKey: Boolean(r.allow_env_key),
          createdBy: r.created_by,
          usedBy,
          createdAt: r.created_at
        };
      });

      // Ambil Web Sessions
      const sessRes = await client.query("SELECT * FROM web_sessions");
      const webSessions = {};
      sessRes.rows.forEach(r => {
        webSessions[r.token] = {
          userId: r.user_id,
          expiresAt: Number(r.expires_at),
          createdAt: r.created_at
        };
      });

      // Ambil Telegram Sessions
      const tgRes = await client.query("SELECT * FROM telegram_sessions");
      const telegramSessions = {};
      tgRes.rows.forEach(r => {
        telegramSessions[r.chat_id] = r.user_id;
      });

      // Ambil System Settings
      const setRes = await client.query("SELECT * FROM system_settings");
      let penilai = DEFAULT_PENILAI;
      let settings = { gdriveLink: "" };
      setRes.rows.forEach(r => {
        if (r.setting_key === "penilai") {
          try { penilai = JSON.parse(r.setting_val); } catch (e) {}
        } else if (r.setting_key === "settings") {
          try { settings = JSON.parse(r.setting_val); } catch (e) {}
        }
      });

      return {
        accounts,
        journals,
        registrationCodes,
        webSessions,
        telegramSessions,
        penilai,
        settings,
        updatedAt: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[PostgreSQL] Gagal memuat data dari database:", err.message);
    return null;
  }
}

/**
 * Menyimpan seluruh store ke PostgreSQL secara batch/sinkronisasi
 */
export async function syncStoreToPostgres(store) {
  const pool = getPool();
  if (!pool || !isInitialized || !store) return;

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Sinkronkan Accounts
      if (Array.isArray(store.accounts)) {
        for (const a of store.accounts) {
          await client.query(`
            INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              password = EXCLUDED.password,
              role = EXCLUDED.role,
              nama = EXCLUDED.nama,
              nip = EXCLUDED.nip,
              pangkat = EXCLUDED.pangkat,
              jabatan = EXCLUDED.jabatan,
              unit_kerja = EXCLUDED.unit_kerja,
              allow_env_key = EXCLUDED.allow_env_key,
              personal_api_key = EXCLUDED.personal_api_key,
              updated_at = EXCLUDED.updated_at
          `, [
            a.id,
            a.username,
            a.password,
            a.role || "pegawai",
            a.nama || a.username,
            a.nip || "",
            a.pangkat || "",
            a.jabatan || "",
            a.unitKerja || "",
            a.allowEnvKey !== false,
            a.personalApiKey || null,
            a.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        const activeIds = store.accounts.map(a => a.id);
        if (activeIds.length > 0) {
          await client.query("DELETE FROM accounts WHERE id != ALL($1::varchar[])", [activeIds]);
        }
      }

      // Sinkronkan Journals
      if (Array.isArray(store.journals)) {
        for (const j of store.journals) {
          await client.query(`
            INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              tanggal = EXCLUDED.tanggal,
              jam = EXCLUDED.jam,
              aktivitas = EXCLUDED.aktivitas,
              aktivitas_kasaran = EXCLUDED.aktivitas_kasaran,
              output_jumlah = EXCLUDED.output_jumlah,
              catatan = EXCLUDED.catatan,
              link_url = EXCLUDED.link_url,
              evidence_type = EXCLUDED.evidence_type,
              doc_category = EXCLUDED.doc_category,
              file_name = EXCLUDED.file_name,
              stored_name = EXCLUDED.stored_name,
              file_size = EXCLUDED.file_size,
              original_size = EXCLUDED.original_size,
              foto_url = EXCLUDED.foto_url,
              file_url = EXCLUDED.file_url,
              attachments = EXCLUDED.attachments,
              updated_at = EXCLUDED.updated_at
          `, [
            j.id,
            j.userId,
            j.tanggal,
            j.jam || "",
            j.aktivitas,
            j.aktivitasKasaran || "",
            j.outputJumlah || "",
            j.catatan || "",
            j.linkUrl || "",
            j.evidenceType || "none",
            j.docCategory || "pdf",
            j.fileName || "",
            j.storedName || "",
            j.fileSize || "",
            j.originalSize || "",
            j.fotoUrl || "",
            j.fileUrl || "",
            JSON.stringify(j.attachments || []),
            j.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        const activeJrnIds = store.journals.map(j => j.id);
        if (activeJrnIds.length > 0) {
          await client.query("DELETE FROM journals WHERE id != ALL($1::varchar[])", [activeJrnIds]);
        } else {
          await client.query("DELETE FROM journals");
        }
      }

      // Sinkronkan Registration Codes
      if (Array.isArray(store.registrationCodes)) {
        for (const c of store.registrationCodes) {
          await client.query(`
            INSERT INTO registration_codes (id, code, max_uses, used_count, expires_at, is_active, role, note, allow_env_key, created_by, used_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              max_uses = EXCLUDED.max_uses,
              used_count = EXCLUDED.used_count,
              expires_at = EXCLUDED.expires_at,
              is_active = EXCLUDED.is_active,
              role = EXCLUDED.role,
              note = EXCLUDED.note,
              allow_env_key = EXCLUDED.allow_env_key,
              used_by = EXCLUDED.used_by
          `, [
            c.id,
            c.code,
            c.maxUses,
            c.usedCount,
            c.expiresAt,
            c.isActive !== false,
            c.role || "pegawai",
            c.note || "",
            c.allowEnvKey !== false,
            c.createdBy || "superadmin",
            JSON.stringify(c.usedBy || []),
            c.createdAt || new Date().toISOString()
          ]);
        }
        const activeCodeIds = store.registrationCodes.map(c => c.id);
        if (activeCodeIds.length > 0) {
          await client.query("DELETE FROM registration_codes WHERE id != ALL($1::varchar[])", [activeCodeIds]);
        } else {
          await client.query("DELETE FROM registration_codes");
        }
      }

      // Sinkronkan Web Sessions
      if (store.webSessions && typeof store.webSessions === "object") {
        for (const [token, sess] of Object.entries(store.webSessions)) {
          await client.query(`
            INSERT INTO web_sessions (token, user_id, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (token) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              expires_at = EXCLUDED.expires_at
          `, [token, sess.userId, sess.expiresAt, sess.createdAt || new Date().toISOString()]);
        }
        const activeTokens = Object.keys(store.webSessions);
        if (activeTokens.length > 0) {
          await client.query("DELETE FROM web_sessions WHERE token != ALL($1::varchar[])", [activeTokens]);
        } else {
          await client.query("DELETE FROM web_sessions");
        }
      }

      // Sinkronkan Telegram Sessions
      if (store.telegramSessions && typeof store.telegramSessions === "object") {
        for (const [chatId, uId] of Object.entries(store.telegramSessions)) {
          await client.query(`
            INSERT INTO telegram_sessions (chat_id, user_id, created_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (chat_id) DO UPDATE SET
              user_id = EXCLUDED.user_id
          `, [chatId, uId, new Date().toISOString()]);
        }
        const activeChatIds = Object.keys(store.telegramSessions);
        if (activeChatIds.length > 0) {
          await client.query("DELETE FROM telegram_sessions WHERE chat_id != ALL($1::varchar[])", [activeChatIds]);
        } else {
          await client.query("DELETE FROM telegram_sessions");
        }
      }

      // Sinkronkan Penilai & Settings
      if (store.penilai) {
        await client.query(`
          INSERT INTO system_settings (setting_key, setting_val, updated_at)
          VALUES ('penilai', $1, $2)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_val = EXCLUDED.setting_val,
            updated_at = EXCLUDED.updated_at
        `, [JSON.stringify(store.penilai), new Date().toISOString()]);
      }
      if (store.settings) {
        await client.query(`
          INSERT INTO system_settings (setting_key, setting_val, updated_at)
          VALUES ('settings', $1, $2)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_val = EXCLUDED.setting_val,
            updated_at = EXCLUDED.updated_at
        `, [JSON.stringify(store.settings), new Date().toISOString()]);
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[PostgreSQL] Gagal sinkronisasi data store ke PostgreSQL:", err.message);
  }
}

/**
 * Memeriksa status kesehatan koneksi database PostgreSQL saat runtime
 */
export async function getPostgresHealth() {
  const config = getPostgresConfig();
  if (!config) {
    return {
      type: "postgres",
      label: "PostgreSQL",
      connected: false,
      configured: false,
      message: "PostgreSQL tidak dikonfigurasi."
    };
  }

  const pool = getPool();
  if (!pool) {
    return {
      type: "postgres",
      label: "PostgreSQL",
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      message: "PostgreSQL dikonfigurasi tetapi pool belum terinisialisasi."
    };
  }

  try {
    const client = await pool.connect();
    try {
      const accRes = await client.query("SELECT COUNT(*) AS count FROM accounts");
      const jrnRes = await client.query("SELECT COUNT(*) AS count FROM journals");
      return {
        type: "postgres",
        label: "PostgreSQL",
        connected: true,
        configured: true,
        host: config.host,
        port: config.port,
        database: config.database,
        counts: {
          accounts: parseInt(accRes.rows[0]?.count || "0", 10),
          journals: parseInt(jrnRes.rows[0]?.count || "0", 10)
        },
        message: `Terhubung ke PostgreSQL database '${config.database}' (${config.host}:${config.port})`
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      type: "postgres",
      label: "PostgreSQL",
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      error: err.message,
      message: `Gagal terhubung ke PostgreSQL: ${err.message}. Fallback ke file JSON lokal aktif.`
    };
  }
}
