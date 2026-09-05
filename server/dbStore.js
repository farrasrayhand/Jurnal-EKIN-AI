import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Direktori dan Berkas Database Lokal
const DB_DIR = path.resolve(__dirname, "../database");
const DB_FILE = path.join(DB_DIR, "ekinerja_store.json");

/**
 * Hash password menggunakan algoritma Scrypt dengan salt unik 16-byte
 */
export function hashPassword(plainPassword) {
  if (!plainPassword) return "";
  if (plainPassword.startsWith("scrypt:")) return plainPassword; // Sudah ter-hash
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifikasi password menggunakan perbandingan konstan (constant-time) untuk mencegah timing-attack
 */
export function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword || !plainPassword) return false;
  try {
    if (storedPassword.startsWith("scrypt:")) {
      const parts = storedPassword.split(":");
      if (parts.length !== 3) return false;
      const salt = parts[1];
      const key = parts[2];
      const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
      const keyBuf = Buffer.from(key, "hex");
      if (keyBuf.length !== derivedKey.length) return false;
      return crypto.timingSafeEqual(keyBuf, derivedKey);
    }
    // Kompatibilitas untuk data lama yang belum ter-hash (constant-time comparison)
    const bufA = Buffer.from(String(plainPassword));
    const bufB = Buffer.from(String(storedPassword));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

/**
 * Sanitasi data akun sebelum dikirimkan ke client/browser (Hapus password & API key rahasia)
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, personalApiKey, ...safeUser } = user;
  return safeUser;
}

// Akun Seeder Bawaan
export const DEFAULT_SEED_ACCOUNTS = [
  {
    id: "usr-superadmin",
    username: "superadmin",
    password: "admin123",
    role: "superadmin",
    nama: "Super Administrator",
    nip: "198001012005011001",
    pangkat: "Pembina Tingkat I / IV/b",
    jabatan: "Administrator Sistem Kepegawaian",
    unitKerja: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
    allowEnvKey: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr-farras",
    username: "farras",
    password: "pegawai123",
    role: "pegawai",
    nama: "MUHAMMAD FARRAS RAYHAND",
    nip: "200011192025211007",
    pangkat: "Pengatur Muda / II/a",
    jabatan: "PENGADMINISTRASI PERKANTORAN",
    unitKerja: "SMK N 07 SAMARINDA",
    allowEnvKey: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr-budi",
    username: "budi.santoso",
    password: "pegawai123",
    role: "pegawai",
    nama: "BUDI SANTOSO, S.Kom",
    nip: "198507122010011008",
    pangkat: "Penata Muda Tk. I / III/b",
    jabatan: "Pranata Komputer Ahli Pertama",
    unitKerja: "SMK N 07 SAMARINDA",
    allowEnvKey: true,
    createdAt: "2026-01-05T00:00:00.000Z"
  }
];

// Pejabat Penilai Default
export const DEFAULT_PENILAI = {
  nama: "ANDA SUPANDA, S.Pd, M.Pd",
  nip: "197505201998021001",
  pangkat: "Pembina Tingkat I / IV/b",
  jabatan: "Kepala Sekolah",
  unitKerja: "SMK N 07 SAMARINDA"
};

// Jurnal Awal Bawaan (Bulan Juli 2026 untuk demonstrasi cetak PDF langsung jalan)
export const DEFAULT_SEED_JOURNALS = [
  {
    id: "jrn-smk-01",
    userId: "usr-farras",
    tanggal: "2026-07-02",
    jam: "08:00 - 11:30",
    aktivitas: "Melaksanakan pengelolaan surat masuk kedinasan, pencatatan agenda surat dinas serta pendistribusian lembar disposisi",
    aktivitasKasaran: "catat surat masuk dinas trs bagiin disposisi",
    outputJumlah: "1 Berkas Buku Agenda Surat Masuk",
    catatan: "Surat dinas terdistribusi secara tertib ke unit kerja terkait.",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  },
  {
    id: "jrn-smk-02",
    userId: "usr-farras",
    tanggal: "2026-07-08",
    jam: "08:30 - 14:00",
    aktivitas: "Melakukan verifikasi kelengkapan berkas administrasi kepegawaian dan sinkronisasi arsip digital berkas kenaikan pangkat",
    aktivitasKasaran: "cek berkas kenaikan pangkat pegawai",
    outputJumlah: "1 Berkas Dokumen Verifikasi Arsip",
    catatan: "Seluruh berkas persyaratan ASN dinyatakan lengkap sesuai checklist.",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  },
  {
    id: "jrn-smk-03",
    userId: "usr-farras",
    tanggal: "2026-07-15",
    jam: "09:00 - 12:00",
    aktivitas: "Menyusun draf laporan rekapitulasi kehadiran berkala pegawai serta penyiapan dokumentasi rapat dinas bulanan",
    aktivitasKasaran: "bikin rekap presensi dan siapin notula rapat dinas",
    outputJumlah: "1 Dokumen Notula & Daftar Hadir",
    catatan: "Laporan presensi dan notula telah divalidasi pimpinan.",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  }
];

/**
 * Memastikan direktori dan berkas database tersedia
 */
let cachedStore = null;
let lastReadMtime = 0;
let lastCleanupTime = 0;

/**
 * Memastikan file database JSON ada dan memiliki struktur default
 */
function ensureDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialStore = {
      accounts: DEFAULT_SEED_ACCOUNTS,
      journals: DEFAULT_SEED_JOURNALS,
      registrationCodes: [],
      webSessions: {}, // { [token]: { userId, expiresAt, createdAt } }
      telegramSessions: {}, // { [chatId]: userId }
      penilai: DEFAULT_PENILAI,
      settings: {
        gdriveLink: ""
      },
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialStore, null, 2), "utf8");
    cachedStore = initialStore;
    try {
      lastReadMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (e) {}
    return initialStore;
  }

  // ⚡ Optimasi Kinerja Database: Manfaatkan cache in-memory jika file belum termodifikasi
  if (cachedStore) {
    try {
      const stat = fs.statSync(DB_FILE);
      if (stat.mtimeMs <= lastReadMtime) {
        const now = Date.now();
        if (now - lastCleanupTime > 10 * 60 * 1000) {
          lastCleanupTime = now;
          cleanupExpiredSessions(cachedStore);
        }
        return cachedStore;
      }
    } catch (e) {}
  }

  try {
    const content = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(content);
    let modified = false;

    if (!Array.isArray(data.accounts)) {
      data.accounts = DEFAULT_SEED_ACCOUNTS;
      modified = true;
    }
    if (!Array.isArray(data.journals)) {
      data.journals = DEFAULT_SEED_JOURNALS;
      modified = true;
    }
    if (!Array.isArray(data.registrationCodes)) {
      data.registrationCodes = [];
      modified = true;
    }
    if (!data.webSessions || typeof data.webSessions !== "object") {
      data.webSessions = {};
      modified = true;
    }
    if (!data.telegramSessions || typeof data.telegramSessions !== "object") {
      data.telegramSessions = {};
      modified = true;
    }
    if (!data.penilai) {
      data.penilai = DEFAULT_PENILAI;
      modified = true;
    }
    if (!data.settings) {
      data.settings = {
        gdriveLink: ""
      };
      modified = true;
    }

    // Bersihkan sesi kadaluarsa saat inisialisasi / reload
    if (cleanupExpiredSessions(data)) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    }

    cachedStore = data;
    try {
      lastReadMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (e) {}

    return data;
  } catch (err) {
    console.error("Gagal membaca berkas database lokal, mereset:", err);
    const fallback = {
      accounts: DEFAULT_SEED_ACCOUNTS,
      journals: DEFAULT_SEED_JOURNALS,
      registrationCodes: [],
      webSessions: {},
      telegramSessions: {},
      penilai: DEFAULT_PENILAI,
      settings: {
        gdriveLink: ""
      },
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), "utf8");
    cachedStore = fallback;
    try {
      lastReadMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (e) {}
    return fallback;
  }
}

/**
 * Menyetel cached store dari luar (misal dari hasil load MySQL)
 */
export function setCachedStore(store) {
  if (store && typeof store === "object") {
    cachedStore = store;
    store.updatedAt = new Date().toISOString();
  }
}

/**
 * Mengambil seluruh objek store (dengan cache memori cepat)
 */
export function getStore() {
  return ensureDb();
}

/**
 * Menyimpan seluruh objek store dan memperbarui cache
 */
export function saveStore(store) {
  ensureDb();
  store.updatedAt = new Date().toISOString();
  cachedStore = store;
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf8");
  try {
    lastReadMtime = fs.statSync(DB_FILE).mtimeMs;
  } catch (e) {}

  // Sinkronkan ke database MySQL / PostgreSQL jika dikonfigurasi (background async)
  import("./dbAdapter.js")
    .then(m => m.syncStoreToDatabase(store))
    .catch(() => {});

  return store;
}

/**
 * Mengambil seluruh akun
 */
export function getAccounts() {
  const store = getStore();
  return store.accounts || [];
}

/**
 * Mencari akun berdasarkan username (case-insensitive)
 */
export function findUserByUsername(username) {
  if (!username) return null;
  const accounts = getAccounts();
  const clean = username.trim().toLowerCase();
  return accounts.find(a => a.username && a.username.toLowerCase() === clean) || null;
}

/**
 * Mencari akun berdasarkan ID
 */
export function findUserById(id) {
  if (!id) return null;
  const accounts = getAccounts();
  return accounts.find(a => a.id === id) || null;
}

/**
 * Validasi login akun dengan constant-time comparison dan salted hash
 */
export function authenticateUser(username, password) {
  const user = findUserByUsername(username);
  if (!user) {
    return { success: false, message: `Akun dengan username "${username}" tidak ditemukan!` };
  }
  if (!verifyPassword(password, user.password)) {
    return { success: false, message: "Password salah!" };
  }
  // Jika akun masih menggunakan password plaintext, otomatis upgrade ke salted hash scrypt
  if (!user.password.startsWith("scrypt:")) {
    user.password = hashPassword(password);
    const store = getStore();
    saveStore(store);
  }
  return { success: true, user };
}

/**
 * Menyimpan atau memperbarui akun dengan password terenkripsi
 */
export function saveAccount(accountData) {
  const store = getStore();
  const accounts = store.accounts;
  const now = new Date().toISOString();

  // Pastikan password di-hash dengan aman jika ada perubahan password
  let processedData = { ...accountData };
  if (processedData.password && !processedData.password.startsWith("scrypt:")) {
    processedData.password = hashPassword(processedData.password);
  }

  if (processedData.id) {
    const idx = accounts.findIndex(a => a.id === processedData.id);
    if (idx !== -1) {
      // Jika password tidak dikirim pada payload update, pertahankan password yang sudah tersimpan
      if (!processedData.password) {
        processedData.password = accounts[idx].password;
      }
      accounts[idx] = { ...accounts[idx], ...processedData, updatedAt: now };
    } else {
      accounts.push({ ...processedData, createdAt: now });
    }
  } else {
    const cleanUsername = (processedData.username || "").trim().toLowerCase();
    if (accounts.some(a => a.username && a.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${processedData.username}" sudah digunakan!`);
    }
    const newAccount = {
      ...processedData,
      id: "usr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      role: processedData.role || "pegawai",
      createdAt: now
    };
    accounts.push(newAccount);
  }

  saveStore(store);
  return accounts;
}

/**
 * Cek apakah data profil pegawai belum lengkap (wajib dilengkapi)
 */
export function isProfileIncomplete(user) {
  if (!user) return false;
  // Superadmin tidak diwajibkan NIP ASN jika hanya bertugas sebagai admin sistem
  if (user.role === "superadmin") return false;

  const cleanNama = (user.nama || "").trim();
  const cleanNip = (user.nip || "").trim();
  const cleanPangkat = (user.pangkat || "").trim();
  const cleanJabatan = (user.jabatan || "").trim();
  const cleanUnitKerja = (user.unitKerja || "").trim();

  // Wajib lengkap: Nama, NIP valid (minimal 5 karakter/digit), Pangkat, Jabatan, Unit Kerja
  if (!cleanNama || cleanNama === "-" || cleanNama.toLowerCase().includes("belum")) return true;
  if (!cleanNip || cleanNip === "-" || cleanNip.toLowerCase().includes("belum") || cleanNip.length < 5) return true;
  if (!cleanPangkat || cleanPangkat === "-" || cleanPangkat.toLowerCase().includes("belum")) return true;
  if (!cleanJabatan || cleanJabatan === "-" || cleanJabatan.toLowerCase().includes("belum")) return true;
  if (!cleanUnitKerja || cleanUnitKerja === "-" || cleanUnitKerja.toLowerCase().includes("belum")) return true;

  return false;
}

/**
 * Memperbarui data profil identitas ASN untuk suatu akun pengguna
 */
export function updateUserProfile(userId, profileData) {
  const store = getStore();
  const accounts = store.accounts || [];
  const idx = accounts.findIndex(a => a.id === userId);
  if (idx === -1) {
    throw new Error("Akun pengguna tidak ditemukan!");
  }

  const current = accounts[idx];
  const updated = {
    ...current,
    nama: profileData.nama !== undefined && profileData.nama !== "" ? profileData.nama.trim() : current.nama,
    nip: profileData.nip !== undefined && profileData.nip !== "" ? profileData.nip.trim() : current.nip,
    pangkat: profileData.pangkat !== undefined && profileData.pangkat !== "" ? profileData.pangkat.trim() : current.pangkat,
    jabatan: profileData.jabatan !== undefined && profileData.jabatan !== "" ? profileData.jabatan.trim() : current.jabatan,
    unitKerja: profileData.unitKerja !== undefined && profileData.unitKerja !== "" ? profileData.unitKerja.trim() : current.unitKerja,
    updatedAt: new Date().toISOString()
  };

  accounts[idx] = updated;
  store.accounts = accounts;
  saveStore(store);
  return updated;
}

/**
 * Manajemen Sesi Telegram (chatId -> userId)
 */
export function getTelegramSession(chatId) {
  const store = getStore();
  const userId = store.telegramSessions ? store.telegramSessions[String(chatId)] : null;
  if (!userId) return null;
  const user = findUserById(userId);
  if (!user) return null;
  return { chatId: String(chatId), userId, user };
}

export function setTelegramSession(chatId, userId) {
  const store = getStore();
  if (!store.telegramSessions) store.telegramSessions = {};
  store.telegramSessions[String(chatId)] = userId;
  saveStore(store);
}

export function clearTelegramSession(chatId) {
  const store = getStore();
  if (store.telegramSessions && store.telegramSessions[String(chatId)]) {
    delete store.telegramSessions[String(chatId)];
    saveStore(store);
    return true;
  }
  return false;
}

/**
 * 🔐 Manajemen Sesi Web 1 Hari (24 Jam) & Optimasi Database
 */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 Jam (86.400.000 ms)

/**
 * Membuat sesi login web baru yang berlaku selama 1 hari (24 jam)
 */
export function createWebSession(user, durationMs = ONE_DAY_MS) {
  if (!user) return null;
  const store = getStore();
  if (!store.webSessions) store.webSessions = {};

  // Hasilkan token unik kriptografis yang aman
  const token = "sess_" + crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  const expiresAt = now + durationMs;

  store.webSessions[token] = {
    token,
    userId: user.id || user.username,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt
  };

  // Bersihkan sesi usang di database secara otomatis agar database selalu optimal
  cleanupExpiredSessions(store);
  saveStore(store);

  return {
    token,
    expiresAt,
    user: sanitizeUser(user)
  };
}

/**
 * Mengambil dan memvalidasi sesi web aktif (otomatis gugur jika lewat 1 hari)
 */
export function getWebSession(token) {
  if (!token || typeof token !== "string") return null;
  const store = getStore();
  if (!store.webSessions || !store.webSessions[token]) return null;

  const session = store.webSessions[token];
  const now = Date.now();

  // Jika waktu kedaluwarsa (1 hari) telah lewat, bersihkan dari database
  if (now > session.expiresAt) {
    delete store.webSessions[token];
    saveStore(store);
    return null;
  }

  const user = findUserById(session.userId) || findUserByUsername(session.username);
  if (!user) {
    delete store.webSessions[token];
    saveStore(store);
    return null;
  }

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: sanitizeUser(user)
  };
}

/**
 * Menghapus sesi web (logout)
 */
export function deleteWebSession(token) {
  if (!token) return false;
  const store = getStore();
  if (store.webSessions && store.webSessions[token]) {
    delete store.webSessions[token];
    saveStore(store);
    return true;
  }
  return false;
}

/**
 * Membersihkan seluruh sesi web yang telah kedaluwarsa (> 1 hari)
 * Menjaga ukuran berkas JSON database tetap ramping dan bebas sampah memori
 */
export function cleanupExpiredSessions(targetStore = null) {
  const s = targetStore || getStore();
  let changed = false;
  const now = Date.now();

  if (s.webSessions && typeof s.webSessions === "object") {
    for (const [token, sess] of Object.entries(s.webSessions)) {
      if (!sess || !sess.expiresAt || now > sess.expiresAt) {
        delete s.webSessions[token];
        changed = true;
      }
    }
  }

  if (changed && !targetStore) {
    saveStore(s);
  }
  return changed;
}

/**
 * Manajemen Jurnal & Multi-Eviden (Multi-Attachment)
 */
export function normalizeJournalAttachments(jrn) {
  if (!jrn) return [];
  if (Array.isArray(jrn.attachments) && jrn.attachments.length > 0) {
    return jrn.attachments.map((att, idx) => ({
      id: att.id || `att-${idx + 1}-${Date.now()}`,
      type: att.type || (att.fotoPath || att.evidenceType === "image" ? "image" : "document"),
      filePath: att.filePath || att.fotoPath || "",
      fileName: att.fileName || (att.filePath ? path.basename(att.filePath) : `lampiran_${idx + 1}`),
      fileUrl: att.fileUrl || att.fotoUrl || "",
      fileSize: att.fileSize || "",
      ext: att.ext || (att.fileName ? path.extname(att.fileName).toLowerCase() : "")
    }));
  }

  // Fallback dari atribut legacy
  const legacyCandidates = [];
  if (jrn.fotoPath || jrn.fotoUrl || jrn.evidenceType === "image") {
    legacyCandidates.push({
      id: `att-legacy-photo-${jrn.id || Date.now()}`,
      type: "image",
      filePath: jrn.fotoPath || "",
      fileName: jrn.fileName || (jrn.fotoPath ? path.basename(jrn.fotoPath) : "foto_kegiatan.jpg"),
      fileUrl: jrn.fileUrl || jrn.fotoUrl || "",
      fileSize: jrn.fileSize || "",
      ext: jrn.fotoPath ? path.extname(jrn.fotoPath).toLowerCase() : ".jpg"
    });
  } else if (jrn.filePath || jrn.fileName || (jrn.fileUrl && jrn.evidenceType === "document")) {
    legacyCandidates.push({
      id: `att-legacy-doc-${jrn.id || Date.now()}`,
      type: "document",
      filePath: jrn.filePath || "",
      fileName: jrn.fileName || (jrn.filePath ? path.basename(jrn.filePath) : "dokumen.pdf"),
      fileUrl: jrn.fileUrl || "",
      fileSize: jrn.fileSize || "",
      ext: jrn.fileName ? path.extname(jrn.fileName).toLowerCase() : ".pdf"
    });
  }
  return legacyCandidates;
}

export function getJournals(userId = null) {
  const store = getStore();
  const all = store.journals || [];
  if (!userId) return all;
  return all.filter(j => j.userId === userId || (!j.userId && userId === "usr-farras"));
}

export function addJournal(journalData) {
  const store = getStore();
  
  // Normalisasi attachments jika disediakan
  let attachments = [];
  if (Array.isArray(journalData.attachments) && journalData.attachments.length > 0) {
    attachments = journalData.attachments.map((att, idx) => ({
      id: att.id || `att-${Date.now()}-${idx + 1}`,
      type: att.type || (att.evidenceType === "image" ? "image" : "document"),
      filePath: att.filePath || att.fotoPath || "",
      fileName: att.fileName || (att.filePath ? path.basename(att.filePath) : `berkas_${idx + 1}`),
      fileUrl: att.fileUrl || att.fotoUrl || "",
      fileSize: att.fileSize || "",
      ext: att.ext || (att.fileName ? path.extname(att.fileName).toLowerCase() : "")
    }));
  } else {
    // Bangun dari data single file legacy
    attachments = normalizeJournalAttachments(journalData);
  }

  // Isi fallback field legacy dari lampiran pertama untuk kompatibilitas penuh
  const firstAtt = attachments[0] || null;
  const legacyFotoPath = journalData.fotoPath || (firstAtt && firstAtt.type === "image" ? firstAtt.filePath : "");
  const legacyFilePath = journalData.filePath || (firstAtt && firstAtt.type !== "image" ? firstAtt.filePath : "");
  const legacyFileName = journalData.fileName || (firstAtt ? firstAtt.fileName : "");
  const legacyFileUrl = journalData.fileUrl || (firstAtt ? firstAtt.fileUrl : "");
  const legacyEvidenceType = journalData.evidenceType || (firstAtt ? firstAtt.type : (attachments.length > 0 ? "document" : "none"));

  const newEntry = {
    id: journalData.id || `jrn-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...journalData,
    attachments,
    fotoPath: legacyFotoPath,
    filePath: legacyFilePath,
    fileName: legacyFileName,
    fileUrl: legacyFileUrl,
    evidenceType: legacyEvidenceType
  };

  store.journals = [newEntry, ...(store.journals || [])];
  saveStore(store);
  return newEntry;
}

/**
 * Menambahkan lampiran susulan ke jurnal yang sudah tersimpan
 */
export function addAttachmentToJournal(journalId, attachment) {
  const store = getStore();
  const jrn = (store.journals || []).find(j => j.id === journalId);
  if (!jrn) return null;

  jrn.attachments = normalizeJournalAttachments(jrn);
  const newAtt = {
    id: attachment.id || `att-${Date.now()}-${jrn.attachments.length + 1}`,
    type: attachment.type || (attachment.evidenceType === "image" ? "image" : "document"),
    filePath: attachment.filePath || attachment.fotoPath || "",
    fileName: attachment.fileName || (attachment.filePath ? path.basename(attachment.filePath) : `berkas_${jrn.attachments.length + 1}`),
    fileUrl: attachment.fileUrl || attachment.fotoUrl || "",
    fileSize: attachment.fileSize || "",
    ext: attachment.ext || (attachment.fileName ? path.extname(attachment.fileName).toLowerCase() : "")
  };

  jrn.attachments.push(newAtt);

  // Jika field legacy belum terisi, isi dari attachment pertama ini
  if (!jrn.fotoPath && newAtt.type === "image") {
    jrn.fotoPath = newAtt.filePath;
  }
  if (!jrn.filePath && newAtt.type !== "image") {
    jrn.filePath = newAtt.filePath;
  }
  if (!jrn.fileName) {
    jrn.fileName = newAtt.fileName;
  }
  if (!jrn.fileUrl) {
    jrn.fileUrl = newAtt.fileUrl;
  }
  if (!jrn.linkUrl && newAtt.fileUrl) {
    jrn.linkUrl = newAtt.fileUrl;
  }

  saveStore(store);
  return jrn;
}

/**
 * Menghapus file fisik eviden/lampiran terkait jurnal dari folder uploads
 */
/**
 * Menghapus file fisik eviden/lampiran terkait jurnal dari folder uploads
 */
export function removeJournalAttachmentFiles(journalsList) {
  if (!Array.isArray(journalsList) || journalsList.length === 0) return 0;
  const UPLOADS_DIR = path.resolve(__dirname, "../database/uploads");
  let deletedFiles = 0;

  for (const jrn of journalsList) {
    if (!jrn) continue;
    const candidates = [];
    if (jrn.filePath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(jrn.filePath)));
    if (jrn.fotoPath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(jrn.fotoPath)));
    if (jrn.fileName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(jrn.fileName)));
    if (jrn.storedName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(jrn.storedName)));
    if (jrn.fotoUrl && typeof jrn.fotoUrl === "string") {
      const cleanUrl = jrn.fotoUrl.split("?")[0].split("#")[0];
      const bName = path.basename(cleanUrl);
      if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
    }
    if (jrn.fileUrl && typeof jrn.fileUrl === "string") {
      const cleanUrl = jrn.fileUrl.split("?")[0].split("#")[0];
      const bName = path.basename(cleanUrl);
      if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
    }

    // Periksa juga seluruh attachments multi-file
    if (Array.isArray(jrn.attachments)) {
      for (const att of jrn.attachments) {
        if (!att) continue;
        if (att.filePath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(att.filePath)));
        if (att.fotoPath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(att.fotoPath)));
        if (att.fileName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(att.fileName)));
        if (att.storedName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(att.storedName)));
        if (att.fileUrl && typeof att.fileUrl === "string") {
          const cleanUrl = att.fileUrl.split("?")[0].split("#")[0];
          const bName = path.basename(cleanUrl);
          if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
        }
        if (att.fotoUrl && typeof att.fotoUrl === "string") {
          const cleanUrl = att.fotoUrl.split("?")[0].split("#")[0];
          const bName = path.basename(cleanUrl);
          if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
        }
      }
    }

    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
    for (const fPath of uniqueCandidates) {
      try {
        if (fPath.startsWith(UPLOADS_DIR) && fs.existsSync(fPath)) {
          const stat = fs.statSync(fPath);
          if (stat.isFile()) {
            fs.unlinkSync(fPath);
            deletedFiles++;
          }
        }
      } catch (e) {}
    }
  }
  return deletedFiles;
}

/**
 * Menghapus satu kegiatan jurnal berdasarkan ID (dan membersihkan berkas fisiknya dari disk)
 */
export function deleteJournalById(journalId, deletePhysicalFiles = true) {
  if (!journalId) {
    return { success: false, message: "ID kegiatan jurnal wajib disertakan." };
  }

  const store = getStore();
  const cleanId = String(journalId).trim();
  const targetJournal = (store.journals || []).find(j => String(j.id).trim() === cleanId);

  if (!targetJournal) {
    return { success: false, message: `Kegiatan jurnal dengan ID "${journalId}" tidak ditemukan.` };
  }

  let deletedFiles = 0;
  if (deletePhysicalFiles) {
    deletedFiles = removeJournalAttachmentFiles([targetJournal]);
  }

  store.journals = (store.journals || []).filter(j => String(j.id).trim() !== cleanId);
  saveStore(store);

  return {
    success: true,
    deletedId: cleanId,
    deletedFiles,
    remainingCount: store.journals.length
  };
}

/**
 * Menghapus seluruh data jurnal di database (dan opsi berkas fisik terkait)
 */
export function deleteAllJournals(deletePhysicalFiles = true) {
  const store = getStore();
  const totalBefore = (store.journals || []).length;
  let deletedFiles = 0;

  if (deletePhysicalFiles && store.journals && store.journals.length > 0) {
    deletedFiles = removeJournalAttachmentFiles(store.journals);
  }

  store.journals = [];
  saveStore(store);

  return {
    success: true,
    deletedCount: totalBefore,
    deletedFiles,
    remainingCount: 0
  };
}

/**
 * Menghapus data jurnal untuk pengguna tertentu (berdasarkan ID atau Username)
 */
export function deleteJournalsByUserId(userIdOrUsername, deletePhysicalFiles = true) {
  if (!userIdOrUsername) {
    return { success: false, message: "ID atau Username pengguna wajib ditentukan." };
  }

  const store = getStore();
  const cleanTarget = String(userIdOrUsername).trim().toLowerCase();

  const user = findUserById(userIdOrUsername) || findUserByUsername(userIdOrUsername);
  const targetId = user?.id || userIdOrUsername;
  const targetUsername = (user?.username || cleanTarget).toLowerCase();

  const toKeep = [];
  const toDelete = [];

  for (const j of (store.journals || [])) {
    const jUserId = (j.userId || "").toLowerCase();
    const isMatch = (
      jUserId === String(targetId).toLowerCase() || 
      jUserId === targetUsername ||
      (!j.userId && (targetId === "usr-farras" || targetUsername === "farras"))
    );

    if (isMatch) {
      toDelete.push(j);
    } else {
      toKeep.push(j);
    }
  }

  let deletedFiles = 0;
  if (deletePhysicalFiles && toDelete.length > 0) {
    deletedFiles = removeJournalAttachmentFiles(toDelete);
  }

  store.journals = toKeep;
  saveStore(store);

  return {
    success: true,
    user: user ? sanitizeUser(user) : { username: targetUsername },
    deletedCount: toDelete.length,
    deletedFiles,
    remainingCount: toKeep.length
  };
}

/**
 * Menghapus akun pengguna (User) secara tuntas:
 * 1. Menghapus semua kegiatan jurnal milik pengguna
 * 2. Menghapus semua berkas fisik foto & dokumen milik pengguna dari folder uploads
 * 3. Menghapus semua sesi login web & telegram milik pengguna
 * 4. Menghapus akun dari daftar accounts
 */
export function deleteUserById(userIdOrUsername, deletePhysicalFiles = true) {
  if (!userIdOrUsername) {
    return { success: false, message: "ID atau Username pengguna wajib disertakan." };
  }

  const store = getStore();
  const user = findUserById(userIdOrUsername) || findUserByUsername(userIdOrUsername);

  if (!user) {
    return { success: false, message: "Akun pengguna tidak ditemukan di database." };
  }

  // Lindungi Superadmin Terakhir
  if (user.role === "superadmin") {
    const superadmins = (store.accounts || []).filter(a => a.role === "superadmin");
    if (superadmins.length <= 1) {
      return { 
        success: false, 
        message: "Tidak dapat menghapus superadmin terakhir! Sistem wajib memiliki minimal satu superadmin." 
      };
    }
  }

  // 1 & 2. Hapus seluruh jurnal milik pengguna dan bersihkan seluruh berkas fisiknya dari disk
  const journalRes = deleteJournalsByUserId(user.id, deletePhysicalFiles);

  // 3. Bersihkan sesi Telegram pengguna
  if (store.telegramSessions && typeof store.telegramSessions === "object") {
    for (const [chatId, uid] of Object.entries(store.telegramSessions)) {
      if (uid === user.id || String(uid).toLowerCase() === user.username.toLowerCase()) {
        delete store.telegramSessions[chatId];
      }
    }
  }

  // 4. Bersihkan sesi Web pengguna
  if (store.webSessions && typeof store.webSessions === "object") {
    for (const [token, sess] of Object.entries(store.webSessions)) {
      if (sess && (sess.userId === user.id || String(sess.userId).toLowerCase() === user.username.toLowerCase())) {
        delete store.webSessions[token];
      }
    }
  }

  // 5. Hapus akun dari accounts
  store.accounts = (store.accounts || []).filter(a => a.id !== user.id && a.username.toLowerCase() !== user.username.toLowerCase());

  saveStore(store);

  return {
    success: true,
    user: sanitizeUser(user),
    deletedJournals: journalRes.deletedCount,
    deletedFiles: journalRes.deletedFiles,
    remainingAccounts: store.accounts.length
  };
}

/**
 * Pengaturan Global & Pejabat Penilai
 */
export function getSettings() {
  const store = getStore();
  return {
    penilai: store.penilai || DEFAULT_PENILAI,
    settings: store.settings || { gdriveLink: "" }
  };
}

export function updateSettings(newSettings) {
  const store = getStore();
  if (newSettings.penilai) {
    store.penilai = { ...(store.penilai || DEFAULT_PENILAI), ...newSettings.penilai };
  }
  if (newSettings.settings) {
    store.settings = { ...(store.settings || {}), ...newSettings.settings };
  }
  saveStore(store);
  return getSettings();
}

/**
 * ==============================================================================
 * MANAJEMEN KODE REGISTRASI / UNDANGAN (INVITATION CODE SYSTEM)
 * ==============================================================================
 */

export function getRegistrationCodes() {
  const store = getStore();
  const codes = store.registrationCodes || [];
  const now = new Date();

  return codes.map(c => {
    const isExpired = c.expiresAt ? new Date(c.expiresAt) < now : false;
    const isQuotaFull = c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses;
    return {
      ...c,
      isExpired,
      isQuotaFull,
      status: !c.isActive ? "inactive" : isExpired ? "expired" : isQuotaFull ? "quota_full" : "active"
    };
  });
}

export function createRegistrationCode({
  code,
  note = "",
  maxUses = 1,
  expiresAt = null,
  role = "pegawai",
  allowEnvKey = true,
  createdBy = "superadmin"
}) {
  const store = getStore();
  if (!Array.isArray(store.registrationCodes)) {
    store.registrationCodes = [];
  }

  // Jika kode kosong, generate acak: EKIN-XXXX
  let finalCode = (code || "").trim().toUpperCase();
  if (!finalCode) {
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    finalCode = `EKIN-${rand}`;
  }

  // Cek duplikasi
  const existing = store.registrationCodes.find(c => c.code.toUpperCase() === finalCode);
  if (existing) {
    throw new Error(`Kode registrasi "${finalCode}" sudah pernah dibuat. Gunakan kode lain.`);
  }

  const parsedMax = maxUses === null || maxUses === undefined || maxUses === "" ? null : parseInt(maxUses, 10);

  const newCodeRecord = {
    id: `rc-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    code: finalCode,
    note: note ? String(note).trim() : "",
    maxUses: isNaN(parsedMax) ? null : parsedMax,
    usedCount: 0,
    usedBy: [],
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    role: role || "pegawai",
    allowEnvKey: allowEnvKey !== false,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || "superadmin"
  };

  store.registrationCodes.unshift(newCodeRecord);
  saveStore(store);
  return newCodeRecord;
}

export function deleteRegistrationCode(codeId) {
  const store = getStore();
  if (!Array.isArray(store.registrationCodes)) return false;
  const initialLen = store.registrationCodes.length;
  store.registrationCodes = store.registrationCodes.filter(c => c.id !== codeId && c.code !== codeId);
  if (store.registrationCodes.length !== initialLen) {
    saveStore(store);
    return true;
  }
  return false;
}

export function validateRegistrationCode(inputCode) {
  const store = getStore();
  const codes = store.registrationCodes || [];
  const clean = (inputCode || "").trim().toUpperCase();

  if (!clean) {
    return { valid: false, message: "Kode registrasi wajib diisi!" };
  }

  const record = codes.find(c => c.code.toUpperCase() === clean);
  if (!record) {
    return { valid: false, message: "Kode registrasi tidak ditemukan. Pastikan Anda memasukkan kode resmi dari Administrator." };
  }

  if (!record.isActive) {
    return { valid: false, message: "Kode registrasi ini telah dinonaktifkan oleh Administrator." };
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return { valid: false, message: "Kode registrasi telah kadaluarsa (melewati batas waktu penggunaan)." };
  }

  if (record.maxUses !== null && record.maxUses !== undefined && record.usedCount >= record.maxUses) {
    return { valid: false, message: `Batas pemakaian kode registrasi ini (${record.maxUses}x) telah habis.` };
  }

  return { valid: true, codeRecord: record };
}

export function registerNewUser({
  username,
  password,
  nama,
  nip,
  pangkat = "",
  jabatan = "",
  unitKerja = "",
  registrationCode
}) {
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  const cleanNama = (nama || "").trim();
  const cleanNip = (nip || "").trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Username minimal terdiri dari 3 karakter.");
  }
  if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
    throw new Error("Username hanya boleh memuat huruf kecil, angka, titik, underscore, atau tanda hubung.");
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error("Password minimal terdiri dari 4 karakter.");
  }
  if (!cleanNama) {
    throw new Error("Nama lengkap wajib diisi.");
  }
  if (!cleanNip) {
    throw new Error("NIP / Identitas Pegawai wajib diisi.");
  }

  // 1. Validasi Kode Registrasi
  const codeValidation = validateRegistrationCode(registrationCode);
  if (!codeValidation.valid) {
    throw new Error(codeValidation.message);
  }

  // 2. Cek keunikan username di accounts dan kaitkan codeRecord ke store aktif
  const store = getStore();
  const existingUser = (store.accounts || []).find(a => a.username.toLowerCase() === cleanUsername);
  if (existingUser) {
    throw new Error(`Username "${cleanUsername}" sudah digunakan oleh pengguna lain. Silakan pilih username lain.`);
  }

  const codeRecord = (store.registrationCodes || []).find(c => c.id === codeValidation.codeRecord.id);
  if (!codeRecord) {
    throw new Error("Kode registrasi tidak ditemukan dalam database.");
  }

  // 3. Buat akun baru dengan hashing Scrypt
  const now = new Date().toISOString();
  const newAccount = {
    id: `usr-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    username: cleanUsername,
    password: hashPassword(cleanPassword),
    role: codeRecord.role || "pegawai",
    nama: cleanNama,
    nip: cleanNip,
    pangkat: pangkat ? String(pangkat).trim() : "-",
    jabatan: jabatan ? String(jabatan).trim() : "-",
    unitKerja: unitKerja ? String(unitKerja).trim() : "-",
    registeredWithCode: codeRecord.code,
    allowEnvKey: codeRecord.allowEnvKey !== undefined ? Boolean(codeRecord.allowEnvKey) : true,
    createdAt: now,
    updatedAt: now
  };

  store.accounts.push(newAccount);

  // 4. Catat pemakaian kode
  codeRecord.usedCount = (codeRecord.usedCount || 0) + 1;
  if (!Array.isArray(codeRecord.usedBy)) codeRecord.usedBy = [];
  codeRecord.usedBy.push({
    userId: newAccount.id,
    username: newAccount.username,
    nama: newAccount.nama,
    nip: newAccount.nip,
    usedAt: now
  });

  saveStore(store);

  return {
    success: true,
    user: sanitizeUser(newAccount)
  };
}
