import mysql from "mysql2/promise";
import { 
  DEFAULT_SEED_ACCOUNTS, 
  DEFAULT_SEED_JOURNALS, 
  hashPassword 
} from "./dbStore.js";

let poolInstance = null;
let isInitialized = false;

/**
 * Mendapatkan konfigurasi MySQL dari environment (mendukung DB_* dan VITE_DB_*)
 */
export function getMysqlConfig() {
  const dbType = (process.env.DB_TYPE || process.env.VITE_DB_TYPE || "").toLowerCase();
  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "";
  const isMysql = dbType === "mysql" || dbUrl.startsWith("mysql");

  if (!isMysql) return null;

  if (dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysql2://")) {
    try {
      const u = new URL(dbUrl);
      return {
        host: u.hostname,
        port: parseInt(u.port || "3306", 10),
        user: decodeURIComponent(u.username || "root"),
        password: decodeURIComponent(u.password || ""),
        database: u.pathname.replace(/^\//, "") || "db_ekin",
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 5,
        idleTimeout: 60000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        queueLimit: 0,
        connectTimeout: 10000
      };
    } catch (e) {
      console.warn("[MySQL] Gagal mengurai DATABASE_URL:", e.message);
    }
  }

  return {
    host: process.env.DB_HOST || process.env.VITE_DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.VITE_DB_PORT || "3306", 10),
    user: process.env.DB_USER || process.env.VITE_DB_USER || "root",
    password: process.env.DB_PASSWORD || process.env.VITE_DB_PASSWORD || "",
    database: process.env.DB_NAME || process.env.VITE_DB_NAME || "db_ekin",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    queueLimit: 0,
    connectTimeout: 10000
  };
}

let heartbeatTimer = null;

/**
 * Memulai ping berkala (heartbeat) setiap 45 detik agar koneksi idle di jaringan virtual Docker/Easypanel tidak ditutup sepihak
 */
function startHeartbeat(pool) {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    if (!poolInstance) return;
    try {
      await poolInstance.query("SELECT 1");
    } catch (e) {
      // Abaikan jika ada kegagalan sesaat, pool akan reconnect otomatis
    }
  }, 45000);
  if (heartbeatTimer.unref) heartbeatTimer.unref();
}

/**
 * Dapatkan atau buat MySQL Pool Singleton
 */
export function getPool() {
  const config = getMysqlConfig();
  if (!config) return null;

  if (!poolInstance) {
    poolInstance = mysql.createPool(config);
    startHeartbeat(poolInstance);
  }
  return poolInstance;
}

/**
 * Menutup seluruh koneksi di pool secara bersih saat proses dimatikan (Graceful Shutdown)
 */
export async function closePool() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (poolInstance) {
    try {
      await poolInstance.end();
      console.log("[MySQL] Connection pool ditutup dengan aman.");
    } catch (e) {
      console.warn("[MySQL] Error saat menutup pool:", e.message);
    }
    poolInstance = null;
  }
}

/**
 * Inisialisasi Tabel & Seeder Otomatis pada Database MySQL
 * Dilengkapi fitur auto-retry jika database server di Docker/Easypanel masih dalam proses booting
 */
export async function initMysqlDatabase(maxRetries = 3, retryDelayMs = 3000) {
  const config = getMysqlConfig();
  if (!config) {
    return { enabled: false, reason: "MySQL tidak dikonfigurasi (menggunakan penyimpanan JSON lokal)." };
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const pool = getPool();
      const conn = await pool.getConnection();

      try {
        console.log(`[MySQL] Terhubung ke database '${config.database}' di host '${config.host}:${config.port}'.`);

      // 1. Tabel Accounts (Pengguna & Superadmin)
      await conn.query(`
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
          allow_env_key TINYINT(1) DEFAULT 1,
          personal_api_key TEXT,
          created_at VARCHAR(50),
          updated_at VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Tabel Journals (Kegiatan Harian & Eviden)
      await conn.query(`
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
          foto_url LONGTEXT,
          file_url TEXT,
          attachments LONGTEXT,
          created_at VARCHAR(50),
          updated_at VARCHAR(50),
          INDEX idx_user_id (user_id),
          INDEX idx_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Tabel Registration Codes
      await conn.query(`
        CREATE TABLE IF NOT EXISTS registration_codes (
          id VARCHAR(64) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          max_uses INT DEFAULT 1,
          used_count INT DEFAULT 0,
          expires_at VARCHAR(50) NULL,
          is_active TINYINT(1) DEFAULT 1,
          role VARCHAR(50) DEFAULT 'pegawai',
          note TEXT,
          allow_env_key TINYINT(1) DEFAULT 1,
          created_by VARCHAR(100) DEFAULT 'superadmin',
          used_by LONGTEXT,
          created_at VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Tabel Web Sessions
      await conn.query(`
        CREATE TABLE IF NOT EXISTS web_sessions (
          token VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          expires_at BIGINT NOT NULL,
          created_at VARCHAR(50),
          INDEX idx_session_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Tabel Telegram Sessions
      await conn.query(`
        CREATE TABLE IF NOT EXISTS telegram_sessions (
          chat_id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          created_at VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Tabel System Settings (GDrive, konfigurasi, dll.)
      await conn.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_val LONGTEXT,
          updated_at VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Bersihkan entitas penilai lawas jika pernah tersimpan di database
      await conn.query("DELETE FROM system_settings WHERE setting_key = 'penilai'");

      // ======================================================================
      // 7. SEEDER OTOMATIS: JALANKAN JIKA TABEL ACCOUNTS KOSONG
      // ======================================================================
      let [accRows] = await conn.query("SELECT COUNT(*) AS count FROM accounts");
      let accountCount = Number(accRows[0]?.count || 0);

      if (accountCount === 0) {
        console.log("🌱 [MySQL Seeder] Database kosong terdeteksi! Memulai eksekusi seeder awal...");

        // A. Seed Akun Default
        for (const acc of DEFAULT_SEED_ACCOUNTS) {
          const safePwd = hashPassword(acc.password);
          await conn.query(`
            INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            acc.allowEnvKey !== false ? 1 : 0,
            acc.personalApiKey || null,
            acc.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        // B. Seed Jurnal Default
        for (const jrn of DEFAULT_SEED_JOURNALS) {
          await conn.query(`
            INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        await conn.query(`
          INSERT INTO system_settings (setting_key, setting_val, updated_at)
          VALUES ('settings', ?, ?)
          ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val), updated_at = VALUES(updated_at)
        `, [JSON.stringify({ gdriveLink: "" }), new Date().toISOString()]);

        [accRows] = await conn.query("SELECT COUNT(*) AS count FROM accounts");
        accountCount = Number(accRows[0]?.count || DEFAULT_SEED_ACCOUNTS.length);

        console.log(`
========================================================================
🎉 [MySQL Seeder] SEEDER DATABASE MYSQL SUKSES!
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
        console.log(`ℹ️ [MySQL] Database sudah berisi ${accountCount} akun terdaftar. Tidak perlu re-seeding.`);
      }

      isInitialized = true;
      return { enabled: true, accountCount };
    } finally {
      conn.release();
    }
    } catch (err) {
      const isRefused = err.code === "ECONNREFUSED" || (err.message && err.message.includes("ECONNREFUSED"));
      const isTimeout = err.code === "ETIMEDOUT" || (err.message && err.message.includes("ETIMEDOUT"));

      if ((isRefused || isTimeout) && attempt <= maxRetries) {
        console.warn(`⏳ [MySQL] Host ${config.host}:${config.port} belum siap (${err.code || "koneksi ditolak"}). Mencoba kembali (${attempt}/${maxRetries}) dalam ${retryDelayMs / 1000} detik...`);
        if (poolInstance) {
          try { await poolInstance.end(); } catch (e) {}
          poolInstance = null;
        }
        await new Promise(r => setTimeout(r, retryDelayMs));
        continue;
      }

      console.error(`❌ [MySQL] Gagal menghubungkan atau menginisialisasi MySQL (${config.host}:${config.port}):`, err.message);
      console.warn("⚠️ Sistem otomatis fallback ke penyimpanan file JSON lokal database/ekinerja_store.json.");
      return { enabled: false, error: err.message };
    }
  }
}

/**
 * Mengambil seluruh store dari MySQL
 */
export async function loadStoreFromMysql() {
  const pool = getPool();
  if (!pool || !isInitialized) return null;

  try {
    const conn = await pool.getConnection();
    try {
      // Ambil Accounts
      const [accRows] = await conn.query("SELECT * FROM accounts");
      const accounts = accRows.map(r => ({
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
        personalApiKey: r.personal_api_key,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));

      // Ambil Journals
      const [jrnRows] = await conn.query("SELECT * FROM journals ORDER BY tanggal ASC");
      const journals = jrnRows.map(r => {
        let atts = [];
        try {
          if (r.attachments) atts = JSON.parse(r.attachments);
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
          attachments: atts,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });

      // Ambil Registration Codes
      const [codeRows] = await conn.query("SELECT * FROM registration_codes ORDER BY created_at DESC");
      const registrationCodes = codeRows.map(r => {
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
      const [sessRows] = await conn.query("SELECT * FROM web_sessions");
      const webSessions = {};
      sessRows.forEach(r => {
        webSessions[r.token] = {
          userId: r.user_id,
          expiresAt: Number(r.expires_at),
          createdAt: r.created_at
        };
      });

      // Ambil Telegram Sessions
      const [tgRows] = await conn.query("SELECT * FROM telegram_sessions");
      const telegramSessions = {};
      tgRows.forEach(r => {
        telegramSessions[r.chat_id] = r.user_id;
      });

      // Ambil System Settings
      const [setRows] = await conn.query("SELECT * FROM system_settings");
      let settings = { gdriveLink: "" };
      setRows.forEach(r => {
        if (r.setting_key === "settings") {
          try { settings = JSON.parse(r.setting_val); } catch (e) {}
        }
      });

      return {
        accounts,
        journals,
        registrationCodes,
        webSessions,
        telegramSessions,
        settings,
        updatedAt: new Date().toISOString()
      };
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[MySQL] Gagal memuat data dari database:", err.message);
    return null;
  }
}

/**
 * Menyimpan seluruh store ke MySQL secara batch/sinkronisasi
 */
export async function syncStoreToMysql(store) {
  const pool = getPool();
  if (!pool || !isInitialized || !store) return;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Sinkronkan Accounts
      if (Array.isArray(store.accounts)) {
        for (const a of store.accounts) {
          await conn.query(`
            INSERT INTO accounts (id, username, password, role, nama, nip, pangkat, jabatan, unit_kerja, allow_env_key, personal_api_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              username = VALUES(username),
              password = VALUES(password),
              role = VALUES(role),
              nama = VALUES(nama),
              nip = VALUES(nip),
              pangkat = VALUES(pangkat),
              jabatan = VALUES(jabatan),
              unit_kerja = VALUES(unit_kerja),
              allow_env_key = VALUES(allow_env_key),
              personal_api_key = VALUES(personal_api_key),
              updated_at = VALUES(updated_at)
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
            a.allowEnvKey !== false ? 1 : 0,
            a.personalApiKey || null,
            a.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);
        }

        // Hapus akun yang sudah dihapus dari store
        const activeIds = store.accounts.map(a => a.id);
        if (activeIds.length > 0) {
          await conn.query("DELETE FROM accounts WHERE id NOT IN (?)", [activeIds]);
        }
      }

      // Sinkronkan Journals
      if (Array.isArray(store.journals)) {
        for (const j of store.journals) {
          await conn.query(`
            INSERT INTO journals (id, user_id, tanggal, jam, aktivitas, aktivitas_kasaran, output_jumlah, catatan, link_url, evidence_type, doc_category, file_name, stored_name, file_size, original_size, foto_url, file_url, attachments, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              user_id = VALUES(user_id),
              tanggal = VALUES(tanggal),
              jam = VALUES(jam),
              aktivitas = VALUES(aktivitas),
              aktivitas_kasaran = VALUES(aktivitas_kasaran),
              output_jumlah = VALUES(output_jumlah),
              catatan = VALUES(catatan),
              link_url = VALUES(link_url),
              evidence_type = VALUES(evidence_type),
              doc_category = VALUES(doc_category),
              file_name = VALUES(file_name),
              stored_name = VALUES(stored_name),
              file_size = VALUES(file_size),
              original_size = VALUES(original_size),
              foto_url = VALUES(foto_url),
              file_url = VALUES(file_url),
              attachments = VALUES(attachments),
              updated_at = VALUES(updated_at)
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
          await conn.query("DELETE FROM journals WHERE id NOT IN (?)", [activeJrnIds]);
        } else {
          await conn.query("DELETE FROM journals");
        }
      }

      // Sinkronkan Registration Codes
      if (Array.isArray(store.registrationCodes)) {
        for (const c of store.registrationCodes) {
          await conn.query(`
            INSERT INTO registration_codes (id, code, max_uses, used_count, expires_at, is_active, role, note, allow_env_key, created_by, used_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              code = VALUES(code),
              max_uses = VALUES(max_uses),
              used_count = VALUES(used_count),
              expires_at = VALUES(expires_at),
              is_active = VALUES(is_active),
              role = VALUES(role),
              note = VALUES(note),
              allow_env_key = VALUES(allow_env_key),
              used_by = VALUES(used_by)
          `, [
            c.id,
            c.code,
            c.maxUses,
            c.usedCount,
            c.expiresAt,
            c.isActive !== false ? 1 : 0,
            c.role || "pegawai",
            c.note || "",
            c.allowEnvKey !== false ? 1 : 0,
            c.createdBy || "superadmin",
            JSON.stringify(c.usedBy || []),
            c.createdAt || new Date().toISOString()
          ]);
        }
        const activeCodeIds = store.registrationCodes.map(c => c.id);
        if (activeCodeIds.length > 0) {
          await conn.query("DELETE FROM registration_codes WHERE id NOT IN (?)", [activeCodeIds]);
        } else {
          await conn.query("DELETE FROM registration_codes");
        }
      }

      // Sinkronkan Web Sessions
      if (store.webSessions && typeof store.webSessions === "object") {
        for (const [token, sess] of Object.entries(store.webSessions)) {
          await conn.query(`
            INSERT INTO web_sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              user_id = VALUES(user_id),
              expires_at = VALUES(expires_at)
          `, [token, sess.userId, sess.expiresAt, sess.createdAt || new Date().toISOString()]);
        }
        const activeTokens = Object.keys(store.webSessions);
        if (activeTokens.length > 0) {
          await conn.query("DELETE FROM web_sessions WHERE token NOT IN (?)", [activeTokens]);
        } else {
          await conn.query("DELETE FROM web_sessions");
        }
      }

      // Sinkronkan Telegram Sessions
      if (store.telegramSessions && typeof store.telegramSessions === "object") {
        for (const [chatId, uId] of Object.entries(store.telegramSessions)) {
          await conn.query(`
            INSERT INTO telegram_sessions (chat_id, user_id, created_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              user_id = VALUES(user_id)
          `, [chatId, uId, new Date().toISOString()]);
        }
        const activeChatIds = Object.keys(store.telegramSessions);
        if (activeChatIds.length > 0) {
          await conn.query("DELETE FROM telegram_sessions WHERE chat_id NOT IN (?)", [activeChatIds]);
        } else {
          await conn.query("DELETE FROM telegram_sessions");
        }
      }

      // Hapus entitas penilai jika masih tersimpan di DB
      await conn.query("DELETE FROM system_settings WHERE setting_key = 'penilai'");
      if (store.settings) {
        await conn.query(`
          INSERT INTO system_settings (setting_key, setting_val, updated_at)
          VALUES ('settings', ?, ?)
          ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val), updated_at = VALUES(updated_at)
        `, [JSON.stringify(store.settings), new Date().toISOString()]);
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[MySQL] Gagal sinkronisasi data store ke MySQL:", err.message);
  }
}

/**
 * Memeriksa status kesehatan koneksi database saat runtime
 */
export async function getDatabaseHealth() {
  const config = getMysqlConfig();
  if (!config) {
    return {
      type: "json",
      label: "JSON Store (Local File)",
      connected: false,
      configured: false,
      message: "MySQL tidak dikonfigurasi. Menggunakan database lokal ekinerja_store.json."
    };
  }

  const pool = getPool();
  if (!pool) {
    return {
      type: "mysql",
      label: "MySQL / MariaDB",
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      message: "MySQL dikonfigurasi tetapi pool belum terinisialisasi."
    };
  }

  try {
    const conn = await pool.getConnection();
    try {
      const [accRows] = await conn.query("SELECT COUNT(*) AS count FROM accounts");
      const [jrnRows] = await conn.query("SELECT COUNT(*) AS count FROM journals");
      return {
        type: "mysql",
        label: "MySQL / MariaDB",
        connected: true,
        configured: true,
        host: config.host,
        port: config.port,
        database: config.database,
        counts: {
          accounts: accRows[0]?.count || 0,
          journals: jrnRows[0]?.count || 0
        },
        message: `Terhubung ke MySQL database '${config.database}' (${config.host}:${config.port})`
      };
    } finally {
      conn.release();
    }
  } catch (err) {
    return {
      type: "mysql",
      label: "MySQL / MariaDB",
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      error: err.message,
      message: `Gagal terhubung ke MySQL: ${err.message}. Fallback ke file JSON lokal aktif.`
    };
  }
}
