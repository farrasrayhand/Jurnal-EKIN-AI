import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

const ACCOUNTS_STORAGE_KEY = "ekinerja_accounts_db";
const CURRENT_USER_KEY = "ekinerja_current_user";
export const SESSION_STORAGE_KEY = "ekinerja_auth_session";
export const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 Jam (1 Hari)

// Data Awal (Seeder Otomatis)
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
    createdAt: "2026-01-05T00:00:00.000Z"
  }
];

// Inisialisasi Database Akun & Seeder
export function initAccountDatabase() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_ACCOUNTS));
      return DEFAULT_SEED_ACCOUNTS;
    }
    const accounts = JSON.parse(raw);
    // Pastikan akun superadmin selalu ada (seeder recovery)
    const hasSuperAdmin = accounts.some(acc => acc.role === "superadmin");
    if (!hasSuperAdmin) {
      accounts.unshift(DEFAULT_SEED_ACCOUNTS[0]);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
    return accounts;
  } catch (e) {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_ACCOUNTS));
    return DEFAULT_SEED_ACCOUNTS;
  }
}

// Ambil seluruh daftar akun
export function getAccounts() {
  return initAccountDatabase();
}

// Simpan atau Perbarui Akun
export function saveAccount(accountData) {
  const accounts = getAccounts();
  const now = new Date().toISOString();

  if (accountData.id) {
    // Mode Edit
    const index = accounts.findIndex(a => a.id === accountData.id);
    if (index !== -1) {
      accounts[index] = {
        ...accounts[index],
        ...accountData,
        updatedAt: now
      };
    } else {
      accounts.push({
        ...accountData,
        createdAt: now
      });
    }
  } else {
    // Mode Tambah Baru
    // Cek username unik
    const cleanUsername = (accountData.username || "").trim().toLowerCase();
    if (accounts.some(a => a.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${accountData.username}" sudah digunakan! Gunakan username lain.`);
    }

    const newAccount = {
      ...accountData,
      id: "usr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      role: accountData.role || "pegawai",
      createdAt: now
    };
    accounts.push(newAccount);
  }

  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  pushSyncToBackend({ accounts });
  return accounts;
}

// Hapus Akun Pengguna (Cascade Delete: Database, Jurnal Terkait, Berkas Fisik di Server & Sesi)
export async function deleteAccount(id) {
  const accounts = getAccounts();
  const target = accounts.find(a => a.id === id || a.username === id);
  if (!target) return accounts;

  // Larang menghapus superadmin terakhir
  if (target.role === "superadmin") {
    const superAdmins = accounts.filter(a => a.role === "superadmin");
    if (superAdmins.length <= 1) {
      throw new Error("Tidak dapat menghapus superadmin terakhir! Sistem harus memiliki minimal satu akun superadmin.");
    }
  }

  // Panggil endpoint backend untuk menghapus akun, seluruh jurnal, file fisik eviden, dan sesi
  try {
    const res = await fetch("/api/accounts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.message) {
        throw new Error(errJson.message);
      }
    }
  } catch (apiErr) {
    console.warn("Peringatan API hapus akun server:", apiErr.message);
    if (apiErr.message.includes("superadmin")) {
      throw apiErr;
    }
  }

  // Bersihkan juga seluruh jurnal milik pengguna dari LocalStorage browser
  try {
    const localJournals = JSON.parse(localStorage.getItem("ekinerja_journals") || "[]");
    const targetIdClean = String(target.id || "").toLowerCase();
    const targetUserClean = String(target.username || "").toLowerCase();
    const remainingJournals = localJournals.filter(j => {
      const jU = String(j.userId || "").toLowerCase();
      return jU !== targetIdClean && jU !== targetUserClean && (!j.userId ? targetUserClean !== "farras" : true);
    });
    localStorage.setItem("ekinerja_journals", JSON.stringify(remainingJournals));
  } catch (e) {}

  const filtered = accounts.filter(a => a.id !== target.id);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

// Cache status bot telegram
let cachedBotConfig = {
  enabled: typeof __BOT_ENABLED_ENV__ !== "undefined" ? Boolean(__BOT_ENABLED_ENV__) : false,
  username: typeof __BOT_USERNAME_ENV__ !== "undefined" ? String(__BOT_USERNAME_ENV__) : ""
};

/**
 * Mengambil konfigurasi status Bot Telegram saat ini
 */
export function getTelegramBotConfig() {
  return cachedBotConfig;
}

/**
 * Memperbarui status Bot Telegram secara asinkron dari server/backend
 */
export async function fetchTelegramBotStatus() {
  try {
    const res = await fetch("/api/bot-status");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.enabled !== "undefined") {
        cachedBotConfig = {
          enabled: Boolean(data.enabled),
          username: data.username || ""
        };
        return cachedBotConfig;
      }
    }
  } catch (e) {
    // Mode offline / static
  }
  return cachedBotConfig;
}

/**
 * Sinkronisasi data antara Browser LocalStorage dan Backend Store (Telegram Bot)
 */
export async function syncWithBackend() {
  try {
    const res = await fetch("/api/sync");
    if (res.ok) {
      const data = await res.json();
      if (data && data.botConfig) {
        cachedBotConfig = {
          enabled: Boolean(data.botConfig.enabled),
          username: data.botConfig.username || ""
        };
      }
      if (data && Array.isArray(data.accounts)) {
        const local = getAccounts();
        const map = new Map(local.map(a => [a.id || a.username, a]));
        data.accounts.forEach(a => {
          const key = a.id || a.username;
          const existing = map.get(key) || {};
          const mergedAcc = { ...existing, ...a };
          if (!mergedAcc.password && existing.password) {
            mergedAcc.password = existing.password;
          }
          map.set(key, mergedAcc);
        });
        const merged = Array.from(map.values());
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged));
        return {
          accounts: merged,
          journals: data.journals || [],
          settings: data.settings || {},
          botConfig: cachedBotConfig
        };
      }
    }
  } catch (e) {
    // Mode offline / static, abaikan
  }
  return null;
}

export async function pushSyncToBackend(payload) {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Mode offline / static, abaikan
  }
}

// Autentikasi / Login (Terproteksi Brute-Force & Scrypt di Backend)
export async function authenticate(username, password) {
  const cleanU = (username || "").trim().toLowerCase();
  const cleanP = (password || "").trim();

  // 1. Coba verifikasi aman melalui Backend /api/auth/login terlebih dahulu
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanU, password: cleanP })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.user) {
        const authUser = data.user;
        // Simpan sesi user aktif (sudah disanitasi oleh backend tanpa password)
        const accounts = getAccounts();
        const idx = accounts.findIndex(a => (a.id && a.id === authUser.id) || a.username.toLowerCase() === cleanU);
        if (idx !== -1) {
          accounts[idx] = { ...accounts[idx], ...authUser };
        } else {
          accounts.push(authUser);
        }
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        setCurrentUser(authUser, data.token, data.expiresAt);
        return authUser;
      }
    } else if (res.status === 429) {
      throw new Error("Terlalu banyak percobaan login gagal dari IP Anda demi alasan keamanan. Harap tunggu beberapa menit sebelum mencoba kembali.");
    } else if (res.status === 401) {
      return null;
    }
  } catch (netErr) {
    if (netErr.message && netErr.message.includes("percobaan login")) {
      throw netErr;
    }
    // Jika backend offline/unreachable (misal static GitHub Pages), fallback ke local DB
  }

  // 2. Fallback offline jika backend tidak aktif
  const accounts = getAccounts();
  const user = accounts.find(
    a => a.username.toLowerCase() === cleanU && a.password === cleanP
  );

  if (!user) {
    return null;
  }

  // Sanitasi sebelum disimpan ke currentUser
  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.personalApiKey;

  setCurrentUser(sanitized);
  return sanitized;
}

/**
 * Pendaftaran Akun Baru dengan Kode Undangan / Registrasi
 */
export async function registerAccount({
  username,
  password,
  nama,
  nip,
  pangkat = "",
  jabatan = "",
  unitKerja = "",
  registrationCode
}) {
  const payload = {
    username: (username || "").trim(),
    password: (password || "").trim(),
    nama: (nama || "").trim(),
    nip: (nip || "").trim(),
    pangkat: (pangkat || "").trim(),
    jabatan: (jabatan || "").trim(),
    unitKerja: (unitKerja || "").trim(),
    registrationCode: (registrationCode || "").trim().toUpperCase()
  };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Gagal melakukan registrasi akun baru.");
  }

  const newUser = data.user;
  // Simpan ke local storage accounts
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === newUser.id || a.username.toLowerCase() === newUser.username.toLowerCase());
  if (idx !== -1) {
    accounts[idx] = { ...accounts[idx], ...newUser };
  } else {
    accounts.push(newUser);
  }
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  setCurrentUser(newUser, data.token, data.expiresAt);

  return newUser;
}

/**
 * Mengambil daftar kode registrasi dari Admin API
 */
export async function fetchRegistrationCodes() {
  const res = await fetch("/api/admin/registration-codes");
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Gagal mengambil daftar kode registrasi.");
  }
  const data = await res.json();
  return data.codes || [];
}

/**
 * Membuat / Generate kode registrasi baru
 */
export async function generateRegistrationCode({
  code = "",
  note = "",
  maxUses = 1,
  expiresAt = null,
  role = "pegawai",
  createdBy = "superadmin"
}) {
  const res = await fetch("/api/admin/registration-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      note,
      maxUses,
      expiresAt,
      role,
      createdBy
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Gagal membuat kode registrasi baru.");
  }

  return data.code;
}

/**
 * Menghapus kode registrasi
 */
export async function removeRegistrationCode(codeId) {
  const res = await fetch(`/api/admin/registration-codes?id=${encodeURIComponent(codeId)}`, {
    method: "DELETE"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Gagal menghapus kode registrasi.");
  }

  return true;
}

// Ambil Pengguna yang Sedang Login (dengan Validasi Session 1 Hari / 24 Jam)
export function getCurrentUser() {
  try {
    const now = Date.now();
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (rawSession) {
      const session = JSON.parse(rawSession);
      // Cek apakah session sudah kedaluwarsa (> 24 jam)
      if (session.expiresAt && now > session.expiresAt) {
        logout();
        return null;
      }
      if (session.user) {
        const accounts = getAccounts();
        const stillExists = accounts.find(a => a.id === session.user.id || a.username === session.user.username);
        if (stillExists) return { ...stillExists, ...session.user };
        return session.user;
      }
    }

    // Fallback migration untuk user yang login sebelum update session storage
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      // Validasi akun masih ada di DB
      const accounts = getAccounts();
      const stillExists = accounts.find(a => a.id === user.id || a.username === user.username);
      if (stillExists) {
        // Otomatis buat session 1 hari untuk user yang sudah ada
        setCurrentUser(stillExists);
        return stillExists;
      }
    }
    return null; // Pengguna belum login atau session habis
  } catch (e) {
    return null;
  }
}

// Set Pengguna Aktif & Session 1 Hari (24 Jam)
export function setCurrentUser(user, token = null, expiresAt = null) {
  if (!user) {
    logout();
    return;
  }

  const now = Date.now();
  let sessionToken = token;
  let sessionExpiresAt = expiresAt;

  // Jika token / expiresAt tidak diberikan (misal saat edit profil atau update state), pertahankan session yang masih valid
  if (!sessionToken || !sessionExpiresAt) {
    try {
      const existingRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        if (existing && existing.token && existing.expiresAt && existing.expiresAt > now) {
          if (!sessionToken) sessionToken = existing.token;
          if (!sessionExpiresAt) sessionExpiresAt = existing.expiresAt;
        }
      }
    } catch (e) {}
  }

  sessionExpiresAt = sessionExpiresAt || (now + ONE_DAY_MS);
  sessionToken = sessionToken || ("sess_local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8));

  const sessionData = {
    token: sessionToken,
    user,
    createdAt: now,
    expiresAt: sessionExpiresAt
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// Ambil Informasi Detail Sesi Aktif
export function getSessionInfo() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return null;
    const session = JSON.parse(rawSession);
    const now = Date.now();
    const isExpired = Boolean(session.expiresAt && now > session.expiresAt);
    const remainingMs = session.expiresAt ? Math.max(0, session.expiresAt - now) : 0;
    return {
      token: session.token,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      remainingMs,
      remainingHours: Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10,
      isExpired,
      user: session.user
    };
  } catch (e) {
    return null;
  }
}

// Keluar / Logout (Pembersihan di Client & Sinkronisasi Pembatalan Token ke Backend)
export function logout() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session.token) {
        // Notifikasi backend agar token dihapus dari database & memori
        fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.token })
        }).catch(() => {});
      }
    }
  } catch (e) {}

  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Cek Apakah Data Profil Pegawai Belum Lengkap (Wajib Setup Awal)
export function isProfileIncomplete(user) {
  if (!user) return false;
  // Superadmin tidak diwajibkan NIP ASN jika hanya bertugas sebagai admin sistem
  if (user.role === "superadmin") return false;

  const cleanNama = (user.nama || "").trim();
  const cleanNip = (user.nip || "").trim();
  const cleanPangkat = (user.pangkat || "").trim();
  const cleanJabatan = (user.jabatan || "").trim();
  const cleanUnitKerja = (user.unitKerja || "").trim();

  // Wajib lengkap: Nama, NIP valid, Pangkat, Jabatan, Unit Kerja
  if (!cleanNama || cleanNama === "-" || cleanNama.toLowerCase().includes("belum")) return true;
  if (!cleanNip || cleanNip === "-" || cleanNip.toLowerCase().includes("belum") || cleanNip.length < 5) return true;
  if (!cleanPangkat || cleanPangkat === "-" || cleanPangkat.toLowerCase().includes("belum")) return true;
  if (!cleanJabatan || cleanJabatan === "-" || cleanJabatan.toLowerCase().includes("belum")) return true;
  if (!cleanUnitKerja || cleanUnitKerja === "-" || cleanUnitKerja.toLowerCase().includes("belum")) return true;

  return false;
}

// Ekspor Data Akun Saat Ini dalam Format Kode Seeder JavaScript (Untuk Memudahkan Saat Deploy)
export function exportCurrentAccountsAsSeederCode() {
  const accounts = getAccounts();
  return `export const DEFAULT_SEED_ACCOUNTS = ${JSON.stringify(accounts, null, 2)};`;
}

// -------------------------------------------------------------
// PENGATURAN API KEY: IZIN .ENV SISTEM & KEY PRIBADI PER AKUN
// -------------------------------------------------------------
const ALLOW_ENV_KEY_STORAGE = "ekinerja_allow_env_key";

export function getAllowEnvKeySetting() {
  try {
    const val = localStorage.getItem(ALLOW_ENV_KEY_STORAGE);
    return val === null ? true : val === "true"; // default true (diizinkan)
  } catch (e) {
    return true;
  }
}

export function setAllowEnvKeySetting(allow) {
  try {
    localStorage.setItem(ALLOW_ENV_KEY_STORAGE, allow ? "true" : "false");
  } catch (e) {}
}

/**
 * Cek apakah akun tertentu diizinkan menggunakan API Key sistem (.env).
 * Superadmin selalu diizinkan.
 * Pegawai: jika akun memiliki properti allowEnvKey (boolean), gunakan nilai tersebut (per-user).
 * Jika tidak ada, gunakan pengaturan global allowEnvKey.
 */
export function isUserAllowedEnv(user) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  if (typeof user.allowEnvKey === "boolean") {
    return user.allowEnvKey;
  }
  return getAllowEnvKeySetting();
}

/**
 * Pengaturan massal: set izin seluruh akun pegawai biasa sekaligus
 */
export function setAllAccountsEnvPermission(allow) {
  const accounts = getAccounts();
  const updated = accounts.map(a => {
    if (a.role === "superadmin") return a;
    return { ...a, allowEnvKey: allow, updatedAt: new Date().toISOString() };
  });
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  setAllowEnvKeySetting(allow);
  return updated;
}

export function resolveEffectiveApiKey(currentUser, envApiKey) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const userAllowedEnv = isUserAllowedEnv(currentUser);

  // Jika user memilih menggunakan key pribadi dan ada isinya
  if (currentUser?.usePersonalKey && currentUser?.personalApiKey) {
    return {
      key: currentUser.personalApiKey,
      source: "personal",
      label: isSuperadmin ? "Key Pribadi Admin" : "Key Pribadi Akun"
    };
  }

  // Jika diizinkan memakai .env dan .env memiliki key
  if (userAllowedEnv && envApiKey) {
    return {
      key: envApiKey,
      source: "env",
      label: "Sistem (.env)"
    };
  }

  // Jika dilarang memakai .env atau .env kosong, gunakan key pribadi akun jika ada
  if (currentUser?.personalApiKey) {
    return {
      key: currentUser.personalApiKey,
      source: "personal",
      label: "Key Pribadi Akun"
    };
  }

  return {
    key: "",
    source: "none",
    label: "Belum Ada Key"
  };
}

// -------------------------------------------------------------
// FITUR EXCEL: UNDUH TEMPLATE & IMPOR DATA AKUN PEGAWAI / SUPERADMIN
// -------------------------------------------------------------

// Generate dan Unduh File Template Excel (.xlsx) dengan Dropdown Level (pengguna / superadmin)
export async function downloadExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "E-Kinerja AI";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Data_Akun", {
    views: [{ showGridLines: true }]
  });

  // Definisi Kolom Template: Wajib (Nama, Username, Password, Level Dropdown) + Opsional Kedinasan
  sheet.columns = [
    { header: "Nama Lengkap*", key: "nama", width: 32 },
    { header: "Username*", key: "username", width: 22 },
    { header: "Password*", key: "password", width: 20 },
    { header: "Level*", key: "level", width: 18 },
    { header: "NIP (Opsional)", key: "nip", width: 24 },
    { header: "Pangkat / Golongan (Opsional)", key: "pangkat", width: 28 },
    { header: "Jabatan (Opsional)", key: "jabatan", width: 32 },
    { header: "Unit Kerja / Sekolah (Opsional)", key: "unitKerja", width: 32 }
  ];

  // Desain Header Tabel yang Elegan dan Jelas
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" } // Dark blue / navy elegan
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } }
    };
  });

  // Contoh Data Pengguna & Superadmin
  sheet.addRow({
    nama: "MUHAMMAD FARRAS RAYHAND",
    username: "farras",
    password: "password123",
    level: "pengguna",
    nip: "200011192025211007",
    pangkat: "Pengatur Muda / II/a",
    jabatan: "Pengadministrasi Perkantoran",
    unitKerja: "SMK N 07 SAMARINDA"
  });

  sheet.addRow({
    nama: "SUPER ADMINISTRATOR",
    username: "superadmin",
    password: "admin123",
    level: "superadmin",
    nip: "198001012005011001",
    pangkat: "Pembina Tingkat I / IV/b",
    jabatan: "Administrator Sistem Kepegawaian",
    unitKerja: "DINAS PENDIDIKAN DAN KEBUDAYAAN"
  });

  sheet.addRow({
    nama: "SITI RAHMAWATI, S.Pd",
    username: "siti.rahmawati",
    password: "password123",
    level: "pengguna",
    nip: "199203152019032014",
    pangkat: "Penata Muda / III/a",
    jabatan: "Guru Ahli Pertama",
    unitKerja: "SMK N 07 SAMARINDA"
  });

  // Format Baris Data & Terapkan Validasi Data Dropdown pada Kolom Level (Kolom D)
  for (let r = 2; r <= 1000; r++) {
    const levelCell = sheet.getCell(`D${r}`);
    // Native Excel Dropdown Validation: pengguna / superadmin
    levelCell.dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"pengguna,superadmin"'],
      showErrorMessage: true,
      errorTitle: "Level Tidak Valid",
      error: "Silakan pilih level dari pilihan dropdown: pengguna atau superadmin."
    };

    if (r <= 4) {
      const row = sheet.getRow(r);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 4 ? "center" : "left"
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      });
    }
  }

  // Tulis buffer dan picu unduhan otomatis di browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Import_Akun.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Impor Data Akun dari Berkas Excel (.xlsx, .xls, .csv)
// Mendukung kolom: Nama Lengkap*, Username*, Password*, Level* (pengguna/superadmin),
// serta kolom opsional: NIP, Pangkat, Jabatan, Unit Kerja.
export function importAccountsFromExcel(file, defaultRole = "pegawai") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("File Excel tidak memiliki lembar kerja (sheet)!");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          throw new Error("Lembar kerja Excel kosong atau tidak memiliki baris data!");
        }

        const existingAccounts = getAccounts();
        const existingUsernames = new Set(existingAccounts.map(a => a.username.toLowerCase()));

        let importedCount = 0;
        let updatedCount = 0;
        const errors = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Baris 1 adalah header

          // Normalisasi Nama
          const nama = (
            row["Nama Lengkap*"] ||
            row["Nama Lengkap"] ||
            row["Nama*"] ||
            row["Nama"] ||
            row["nama"] ||
            row["Nama Lengkap & Gelar*"] ||
            ""
          ).toString().trim();

          // Normalisasi Username
          const rawUsername = (
            row["Username*"] ||
            row["Username"] ||
            row["username"] ||
            ""
          ).toString().trim();

          // Normalisasi Password
          const rawPassword = (
            row["Password*"] ||
            row["Password"] ||
            row["password"] ||
            ""
          ).toString().trim();

          // Normalisasi Level / Role (Dropdown: pengguna / superadmin)
          const rawLevel = (
            row["Level*"] ||
            row["Level"] ||
            row["level"] ||
            row["Role*"] ||
            row["Role"] ||
            row["role"] ||
            ""
          ).toString().trim().toLowerCase();

          // Kolom Opsional Kedinasan
          const nip = (
            row["NIP (Opsional)"] ||
            row["NIP*"] ||
            row["NIP"] ||
            row["nip"] ||
            ""
          ).toString().trim();

          const pangkat = (
            row["Pangkat / Golongan (Opsional)"] ||
            row["Pangkat / Golongan"] ||
            row["Pangkat"] ||
            row["pangkat"] ||
            ""
          ).toString().trim();

          const jabatan = (
            row["Jabatan (Opsional)"] ||
            row["Jabatan*"] ||
            row["Jabatan"] ||
            row["jabatan"] ||
            ""
          ).toString().trim();

          const unitKerja = (
            row["Unit Kerja / Sekolah (Opsional)"] ||
            row["Unit Kerja / Instansi (Opsional)"] ||
            row["Unit Kerja / Sekolah*"] ||
            row["Unit Kerja"] ||
            row["unitKerja"] ||
            ""
          ).toString().trim();

          // Validasi kolom Nama (wajib)
          if (!nama) {
            errors.push(`Baris ${rowNum}: Dilewati karena kolom Nama Lengkap kosong.`);
            return;
          }

          // Menentukan Role / Level
          let targetRole = defaultRole === "superadmin" ? "superadmin" : "pegawai";
          if (rawLevel.includes("superadmin")) {
            targetRole = "superadmin";
          } else if (rawLevel.includes("pengguna") || rawLevel.includes("pegawai") || rawLevel.includes("user")) {
            targetRole = "pegawai";
          }

          // Menentukan Username
          let generatedUsername = "";
          if (rawUsername) {
            // Gunakan username yang ditentukan di Excel (hapus spasi)
            generatedUsername = rawUsername.replace(/\s+/g, "").toLowerCase();
          } else {
            // Fallback: utamakan NIP jika ada, atau nama depan.belakang
            const cleanNip = nip.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();
            if (cleanNip && cleanNip !== "-") {
              generatedUsername = cleanNip;
            } else {
              const cleanName = nama
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .join(".");
              generatedUsername = cleanName || `user.${Date.now().toString().slice(-4)}`;
            }
          }

          // Menentukan Password
          const finalPassword = rawPassword || (targetRole === "superadmin" ? "admin123" : "pegawai123");

          // Cek apakah akun dengan Username yang sama atau NIP yang sama sudah ada di database
          const existingIndex = existingAccounts.findIndex(a => {
            const sameUsername = a.username && a.username.toLowerCase() === generatedUsername.toLowerCase();
            const sameNip = nip && nip !== "-" && a.nip && a.nip === nip;
            return sameUsername || sameNip;
          });

          if (existingIndex !== -1) {
            // Perbarui akun yang sudah ada
            existingAccounts[existingIndex] = {
              ...existingAccounts[existingIndex],
              nama: nama || existingAccounts[existingIndex].nama,
              username: generatedUsername || existingAccounts[existingIndex].username,
              password: rawPassword || existingAccounts[existingIndex].password,
              role: targetRole,
              nip: nip || existingAccounts[existingIndex].nip,
              pangkat: pangkat || existingAccounts[existingIndex].pangkat,
              jabatan: jabatan || existingAccounts[existingIndex].jabatan,
              unitKerja: unitKerja || existingAccounts[existingIndex].unitKerja,
              updatedAt: new Date().toISOString()
            };
            updatedCount++;
          } else {
            // Pastikan username unik untuk akun baru
            let finalUsername = generatedUsername;
            let counter = 1;
            while (existingUsernames.has(finalUsername.toLowerCase())) {
              finalUsername = `${generatedUsername}${counter}`;
              counter++;
            }

            // Tambahkan akun baru
            existingAccounts.push({
              id: "usr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
              nama: nama,
              username: finalUsername,
              password: finalPassword,
              role: targetRole,
              nip: nip || "",
              pangkat: pangkat || "",
              jabatan: jabatan || "",
              unitKerja: unitKerja || "",
              allowEnvKey: true,
              createdAt: new Date().toISOString()
            });
            existingUsernames.add(finalUsername.toLowerCase());
            importedCount++;
          }
        });

        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(existingAccounts));
        pushSyncToBackend({ accounts: existingAccounts });

        resolve({
          totalRows: rawJson.length,
          importedCount,
          updatedCount,
          errors
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca berkas Excel!"));
    reader.readAsArrayBuffer(file);
  });
}

// -------------------------------------------------------------
// KONFIGURASI ADAPTER DATABASE DARI .ENV
// -------------------------------------------------------------
export function getDatabaseConfig() {
  const type = (import.meta.env.VITE_DB_TYPE || "sqlite").toLowerCase().trim();
  const validTypes = ["sqlite", "postgres", "mysql"];
  const dbType = validTypes.includes(type) ? type : "sqlite";

  return {
    type: dbType, // "sqlite" | "postgres" | "mysql"
    label: dbType === "sqlite" ? "SQLite (Local File)" : dbType === "postgres" ? "PostgreSQL" : "MySQL / MariaDB",
    host: import.meta.env.VITE_DB_HOST || "localhost",
    port: import.meta.env.VITE_DB_PORT || (dbType === "postgres" ? "5432" : dbType === "mysql" ? "3306" : ""),
    name: import.meta.env.VITE_DB_NAME || "ekinerja_db",
    user: import.meta.env.VITE_DB_USER || (dbType === "postgres" ? "postgres" : "root"),
    sqliteFile: import.meta.env.VITE_SQLITE_FILE || "./database/ekinerja.sqlite",
    databaseUrl: import.meta.env.VITE_DATABASE_URL || ""
  };
}
