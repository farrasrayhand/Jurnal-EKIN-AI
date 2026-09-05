// Server Bot Telegram E-Kinerja AI
// Memungkinkan pegawai ASN berinteraksi, login, mencatat jurnal via AI, dan menerima PDF resmi

import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const TelegramBot = require("node-telegram-bot-api");

// Muat .env secara otomatis jika berkas fisik tersedia (kompatibel lokal & Easypanel/Docker)
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch (e) {}
}

import { 
  getAccounts, 
  findUserByUsername, 
  authenticateUser, 
  getTelegramSession, 
  setTelegramSession, 
  clearTelegramSession, 
  getJournals, 
  addJournal, 
  addAttachmentToJournal,
  normalizeJournalAttachments,
  getSettings,
  isProfileIncomplete,
  updateUserProfile,
  validateRegistrationCode,
  registerNewUser,
  getStore,
  saveStore
} from "./dbStore.js";
import { polishJournalNode } from "./aiServiceNode.js";
import { generateMonthlyReportPdf, generateMonthlyReportZip } from "./pdfGenerator.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, "../database/uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {}
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const botUsername = process.env.TELEGRAM_BOT_USERNAME || "ekinerja_ai_bot";

// Map Percakapan Setup Identitas Interaktif (chatId -> { step: "nip"|"pangkat"|"jabatan"|"unitKerja"|"confirm", data: {} })
const profileSetupStates = new Map();

// Map Percakapan Login Interaktif (chatId -> { step: "username"|"password", username: "" })
const loginStates = new Map();

// Map Percakapan Registrasi Akun Baru (chatId -> { step: "code"|"username"|"password"|"nama"|"nip", code: "", data: {} })
const registrationStates = new Map();

// Map Antrean Bukti/Eviden Tanpa Caption (chatId -> { type: 'image'|'document', filePath, fileName, fileSize, createdAt })
const pendingUploads = new Map();

// Map Setup Link Google Drive Bukti Dukung (chatId -> { returnTo: "report"|"profile"|"main" })
const linkSetupStates = new Map();

// Preset Pangkat/Golongan ASN & PPPK resmi BKN (ID pendek < 64 bytes untuk Telegram Callback)
export const PANGKAT_PRESETS = {
  p4e: "Pembina Utama / IV/e",
  p4d: "Pembina Utama Madya / IV/d",
  p4c: "Pembina Utama Muda / IV/c",
  p4b: "Pembina Tk. I / IV/b",
  p4a: "Pembina / IV/a",
  p3d: "Penata Tk. I / III/d",
  p3c: "Penata / III/c",
  p3b: "Penata Muda Tk. I / III/b",
  p3a: "Penata Muda / III/a",
  p2d: "Pengatur Tk. I / II/d",
  p2c: "Pengatur / II/c",
  p2b: "Pengatur Muda Tk. I / II/b",
  p2a: "Pengatur Muda / II/a",
  p1d: "Juru Tk. I / I/d",
  p1c: "Juru / I/c",
  p1b: "Juru Muda Tk. I / I/b",
  p1a: "Juru Muda / I/a",
  pppk_ix: "PPPK / Ahli Pertama (Gol. IX)",
  pppk_vii: "PPPK / Terampil (Gol. VII)",
  non_asn: "Non-ASN / Tenaga Honorer"
};

// Preset Jabatan ASN Terpopuler
export const JABATAN_PRESETS = {
  j_prakom: "Pranata Komputer Ahli Pertama",
  j_prakomt: "Pranata Komputer Terampil",
  j_guru: "Guru Ahli Pertama",
  j_gurut: "Guru Ahli Muda",
  j_adm: "Pengadministrasi Perkantoran",
  j_analis: "Analis Kebijakan Ahli Pertama",
  j_kepeg: "Pengelola Kepegawaian",
  j_tu: "Kepala Sub Bagian Tata Usaha"
};

// Preset Unit Kerja Terpopuler
export const UNIT_PRESETS = {
  u_smk7: "SMK N 07 SAMARINDA",
  u_disdik: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
  u_bkd: "BADAN KEPEGAWAIAN DAERAH (BKD)",
  u_inspek: "INSPEKTORAT DAERAH",
  u_setda: "SEKRETARIAT DAERAH"
};

/**
 * Ekstraksi URL Web / Google Drive dari Teks
 */
export function extractUrl(text) {
  if (!text) return { url: null, cleanText: "" };
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  if (match && match.length > 0) {
    const url = match[0];
    const cleanText = text.replace(url, "").trim();
    return { url, cleanText: cleanText || "Melaksanakan kegiatan kedinasan operasional" };
  }
  return { url: null, cleanText: text };
}

const NAMA_BULAN_MAP = {
  januari: "01", feb: "02", februari: "02", mar: "03", maret: "03",
  apr: "04", april: "04", mei: "05", jun: "06", juni: "06",
  jul: "07", juli: "07", agu: "08", agustus: "08", sep: "09", september: "09",
  okt: "10", oktober: "10", nov: "11", november: "11", des: "12", desember: "12",
  "1": "01", "2": "02", "3": "03", "4": "04", "5": "05", "6": "06",
  "7": "07", "8": "08", "9": "09", "10": "10", "11": "11", "12": "12"
};

const NAMA_BULAN_INDONESIA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Ekstraksi Jam / Waktu Kerja dan Tanggal dari Teks Pesan Telegram
 * Jika tidak ditemukan jam pada teks, otomatis menggunakan defaultJam (default: "08:00 - 16:00")
 */
export function extractTimeAndDate(text, defaultJam = "08:00 - 16:00") {
  if (!text) {
    return {
      jam: defaultJam,
      isCustomJam: false,
      tanggal: null,
      cleanText: ""
    };
  }

  let cleanText = text;
  let detectedJam = null;
  let detectedDate = null;

  // 1. Deteksi Pola Jam Rentang dengan Menit (misal: "08:00 - 16:00", "jam 08.00-11.30", "(jam 07.30 - 15.00)", "pukul 07.30 s/d 15.00 WIB", "[08:00 - 12:00]")
  const rangeTimeWithMinutesRegex = /(?:\(?\s*(?:jam|pukul|waktu)?\s*[:=]?\s*\(?)\s*([0-2]?[0-9])[:.]([0-5][0-9])\s*(?:-|–|—|s\.?d\.?|s\/d|sampai|\/)\s*([0-2]?[0-9])[:.]([0-5][0-9])\s*(?:wib|wita|wit)?\s*[\)\]]?/i;
  const matchRangeMin = cleanText.match(rangeTimeWithMinutesRegex);
  if (matchRangeMin) {
    const h1 = parseInt(matchRangeMin[1], 10);
    const m1 = parseInt(matchRangeMin[2], 10);
    const h2 = parseInt(matchRangeMin[3], 10);
    const m2 = parseInt(matchRangeMin[4], 10);

    if (h1 >= 0 && h1 <= 23 && h2 >= 0 && h2 <= 23) {
      detectedJam = `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")} - ${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`;
      cleanText = cleanText.replace(matchRangeMin[0], " ").trim();
    }
  }

  // 2. Deteksi Pola Jam Rentang Angka Bulat (misal: "jam 8 - 16", "pukul 8-12", "(jam 8 sampai 15)")
  if (!detectedJam) {
    const rangeHourRegex = /(?:\(?\s*(?:jam|pukul|waktu)\s*[:=]?\s*|\()\s*([0-2]?[0-9])\s*(?:-|–|—|s\.?d\.?|s\/d|sampai)\s*([0-2]?[0-9])\s*(?:wib|wita|wit)?\s*[\)\]]?/i;
    const matchRangeHour = cleanText.match(rangeHourRegex);
    if (matchRangeHour) {
      const h1 = parseInt(matchRangeHour[1], 10);
      const h2 = parseInt(matchRangeHour[2], 10);
      if (h1 >= 0 && h1 <= 23 && h2 >= 0 && h2 <= 23) {
        detectedJam = `${String(h1).padStart(2, "0")}:00 - ${String(h2).padStart(2, "0")}:00`;
        cleanText = cleanText.replace(matchRangeHour[0], " ").trim();
      }
    }
  }

  // 3. Deteksi Tanggal ISO (YYYY-MM-DD), misal: "tgl 2026-09-04" atau "2026-09-04"
  const dateIsoRegex = /(?:\(?\s*(?:tanggal|tgl)\s*[:=]?\s*)?(\b20\d{2}[-/][0-1]\d[-/][0-3]\d\b)\s*[\)\]]?/i;
  const matchIso = cleanText.match(dateIsoRegex);
  if (matchIso) {
    detectedDate = matchIso[1].replace(/\//g, "-");
    cleanText = cleanText.replace(matchIso[0], " ").trim();
  }

  // 4. Deteksi Tanggal Format Teks Indonesia (misal: "tgl 5 September 2026")
  if (!detectedDate) {
    const dateIndoTextRegex = /(?:\(?\s*(?:tanggal|tgl)\s*[:=]?\s*)?(\b[0-3]?\d)\s+([a-zA-Z]+)\s+(20\d{2})\b\s*[\)\]]?/i;
    const matchIndo = cleanText.match(dateIndoTextRegex);
    if (matchIndo && NAMA_BULAN_MAP[matchIndo[2].toLowerCase()]) {
      const d = String(parseInt(matchIndo[1], 10)).padStart(2, "0");
      const m = NAMA_BULAN_MAP[matchIndo[2].toLowerCase()];
      const y = matchIndo[3];
      detectedDate = `${y}-${m}-${d}`;
      cleanText = cleanText.replace(matchIndo[0], " ").trim();
    }
  }

  // 5. Deteksi Tanggal Format Angka (misal: "tgl 04/09/2026", "tanggal 4-9-2026")
  if (!detectedDate) {
    const dateNumRegex = /(?:\(?\s*(?:tanggal|tgl)\s*[:=]?\s*)(\b[0-3]?\d)[-/]([0-1]?\d)[-/](20\d{2})\b\s*[\)\]]?/i;
    const matchNum = cleanText.match(dateNumRegex);
    if (matchNum) {
      const d = String(parseInt(matchNum[1], 10)).padStart(2, "0");
      const m = String(parseInt(matchNum[2], 10)).padStart(2, "0");
      const y = matchNum[3];
      detectedDate = `${y}-${m}-${d}`;
      cleanText = cleanText.replace(matchNum[0], " ").trim();
    }
  }

  // Bersihkan karakter kurung/koma/spasi/titik dua sisa pemotongan waktu & tanggal
  cleanText = cleanText
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s;:\-\(\)\[\]]+|[,\s;:\-\(\)\[\]]+$/g, "")
    .trim();

  return {
    jam: detectedJam || defaultJam,
    isCustomJam: Boolean(detectedJam),
    tanggal: detectedDate || null,
    cleanText: cleanText || text
  };
}

// Validasi Keberadaan Token
if (!token || token.trim() === "" || token.includes("PASTE_HERE") || token.includes("TOKEN_ANDA")) {
  console.log(`
========================================================================
[PERHATIAN] TELEGRAM_BOT_TOKEN BELUM DIKONFIGURASI DI .env
========================================================================
Untuk mengaktifkan Bot Telegram secara online:
1. Buka aplikasi Telegram dan cari bot: @BotFather
2. Ketik perintah: /newbot
3. Ikuti petunjuk untuk menentukan nama dan username bot Anda.
4. Salin API Token yang diberikan oleh BotFather.
5. Tempelkan token tersebut di file .env:
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567
   TELEGRAM_BOT_USERNAME=nama_bot_anda_bot
6. Jalankan kembali: npm run bot
========================================================================
Bot berada dalam status standby menunggu token yang valid.
`);
}

// Inisialisasi Bot jika Token ada
let bot = null;
if (token && token.trim() && !token.includes("PASTE_HERE")) {
  try {
    bot = new TelegramBot(token, { polling: true });
    console.log(`🚀 [E-Kinerja Bot] Bot Telegram aktif dan siap melayani percakapan! (@${botUsername})`);

    // Tangani error polling tanpa membuat proses crash
    bot.on("polling_error", (error) => {
      console.warn("⚠️ [Telegram Polling Error]:", error.code, error.message);
    });
  } catch (err) {
    console.error("❌ Gagal menginisialisasi bot Telegram:", err.message);
  }
}

/**
 * Format Pesan Penolakan Ketika Data Diri Belum Lengkap
 */
export function getProfileIncompleteWarningText(user) {
  return (
    `🚫 *AKSES DITANGGUHKAN: Data Diri Belum Lengkap!* ⚠️\n\n` +
    `Sesuai standar PermenPAN-RB No. 6 Tahun 2022 dan format BKN, Anda *WAJIB* melengkapi identitas kedinasan terlebih dahulu sebelum dapat mencatat jurnal atau membuat laporan resmi.\n\n` +
    `📌 *Status Data Saat Ini:*\n` +
    `• Nama: ${user.nama || "-"}\n` +
    `• NIP: ${user.nip || "❌ (Belum diisi)"}\n` +
    `• Pangkat/Gol: ${user.pangkat || "❌ (Belum diisi)"}\n` +
    `• Jabatan: ${user.jabatan || "❌ (Belum diisi)"}\n` +
    `• Unit Kerja: ${user.unitKerja || "❌ (Belum diisi)"}\n\n` +
    `👉 *Klik tombol di bawah* untuk melengkapi data diri Anda secara interaktif langkah demi langkah!`
  );
}

/**
 * Tampilkan Dashboard Menu Utama dengan Tombol Interaktif
 */
export function sendMainMenu(botInstance, chatId, user) {
  const isIncomplete = isProfileIncomplete(user);
  let text = `🏛 *MENU UTAMA E-KINERJA AI*\n\n` +
    `👤 *Pegawai*: *${user.nama}*\n` +
    `💳 *NIP*: \`${user.nip || "Belum diisi"}\`\n` +
    `💼 *Jabatan*: ${user.jabatan || "Belum diisi"}\n` +
    `🏢 *Unit Kerja*: ${user.unitKerja || "Belum diisi"}\n\n`;

  if (isIncomplete) {
    text += `⚠️ *PERHATIAN*: Data diri kedinasan Anda belum lengkap. Silakan klik tombol *⚙️ Atur Data Diri* di bawah.\n\n`;
  } else {
    text += `✅ *Akun Aktif*. Silakan pilih menu di bawah atau langsung ketik uraian aktivitas kerja Anda:\n\n`;
  }

  const inline_keyboard = [
    [
      { text: "📝 Catat Aktivitas", callback_data: "menu:catat" },
      { text: "📋 5 Jurnal Terakhir", callback_data: "menu:jurnal" }
    ],
    [
      { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" },
      { text: "⏰ Jam Default Kerja", callback_data: "menu:jam" }
    ],
    [
      { text: "⚙️ Atur Data Diri", callback_data: "menu:setprofil" },
      { text: "👤 Profil Saya", callback_data: "menu:profil" }
    ],
    [
      { text: "🚪 Keluar / Logout", callback_data: "menu:logout" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Langkah 1 Wizard Profil: Input NIP
 */
export function sendStepNip(botInstance, chatId) {
  const existingState = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    step: "nip",
    data: existingState.data || {}
  });

  const text = `📝 *PENGISIAN DATA DIRI ASN (Langkah 1 dari 4)*\n\n` +
    `Silakan ketik *Nomor Induk Pegawai (NIP)* resmi Anda:\n` +
    `_Contoh:_ \`198507122010011008\`\n\n` +
    `_Bagi Pegawai Non-PNS/PPPK tanpa NIP, silakan klik tombol di bawah:_`;

  const inline_keyboard = [
    [
      { text: "⏩ Lewati / Non-PNS (-)", callback_data: "prof:set_nip_skip" }
    ],
    [
      { text: "❌ Batalkan", callback_data: "prof:cancel" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Langkah 2 Wizard Profil: Kategori Pangkat/Golongan
 */
export function sendStepPangkatCategories(botInstance, chatId) {
  const state = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    ...state,
    step: "pangkat"
  });

  const text = `🎖 *PILIH PANGKAT / GOLONGAN (Langkah 2 dari 4)*\n\n` +
    `• NIP: \`${state.data?.nip || "-"}\`\n\n` +
    `Silakan pilih kelompok golongan kepangkatan Anda:`;

  const inline_keyboard = [
    [{ text: "🎖 Golongan IV (Pembina)", callback_data: "prof:cat:gol4" }],
    [{ text: "🎖 Golongan III (Penata)", callback_data: "prof:cat:gol3" }],
    [{ text: "🎖 Golongan II (Pengatur)", callback_data: "prof:cat:gol2" }],
    [{ text: "🎖 Golongan I (Juru)", callback_data: "prof:cat:gol1" }],
    [{ text: "💼 PPPK / Non-ASN", callback_data: "prof:cat:pppk" }],
    [{ text: "✏️ Ketik Manual Sendiri", callback_data: "prof:cat:manual" }],
    [
      { text: "⬅️ Kembali ke NIP", callback_data: "prof:back_nip" },
      { text: "❌ Batal", callback_data: "prof:cancel" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Langkah 2b Wizard Profil: Sub Pangkat Spesifik
 */
export function sendStepPangkatSub(botInstance, chatId, cat) {
  const state = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    ...state,
    step: "pangkat"
  });

  let title = "PANGKAT / GOLONGAN";
  let buttons = [];

  if (cat === "gol4") {
    title = "GOLONGAN IV (PEMBINA)";
    buttons = [
      [{ text: "Pembina Utama (IV/e)", callback_data: "prof:p:p4e" }],
      [{ text: "Pembina Utama Madya (IV/d)", callback_data: "prof:p:p4d" }],
      [{ text: "Pembina Utama Muda (IV/c)", callback_data: "prof:p:p4c" }],
      [{ text: "Pembina Tk. I (IV/b)", callback_data: "prof:p:p4b" }],
      [{ text: "Pembina (IV/a)", callback_data: "prof:p:p4a" }]
    ];
  } else if (cat === "gol3") {
    title = "GOLONGAN III (PENATA)";
    buttons = [
      [{ text: "Penata Tk. I (III/d)", callback_data: "prof:p:p3d" }],
      [{ text: "Penata (III/c)", callback_data: "prof:p:p3c" }],
      [{ text: "Penata Muda Tk. I (III/b)", callback_data: "prof:p:p3b" }],
      [{ text: "Penata Muda (III/a)", callback_data: "prof:p:p3a" }]
    ];
  } else if (cat === "gol2") {
    title = "GOLONGAN II (PENGATUR)";
    buttons = [
      [{ text: "Pengatur Tk. I (II/d)", callback_data: "prof:p:p2d" }],
      [{ text: "Pengatur (II/c)", callback_data: "prof:p:p2c" }],
      [{ text: "Pengatur Muda Tk. I (II/b)", callback_data: "prof:p:p2b" }],
      [{ text: "Pengatur Muda (II/a)", callback_data: "prof:p:p2a" }]
    ];
  } else if (cat === "gol1") {
    title = "GOLONGAN I (JURU)";
    buttons = [
      [{ text: "Juru Tk. I (I/d)", callback_data: "prof:p:p1d" }],
      [{ text: "Juru (I/c)", callback_data: "prof:p:p1c" }],
      [{ text: "Juru Muda Tk. I (I/b)", callback_data: "prof:p:p1b" }],
      [{ text: "Juru Muda (I/a)", callback_data: "prof:p:p1a" }]
    ];
  } else if (cat === "pppk") {
    title = "PPPK & NON-ASN";
    buttons = [
      [{ text: "PPPK / Ahli Pertama (Gol. IX)", callback_data: "prof:p:pppk_ix" }],
      [{ text: "PPPK / Terampil (Gol. VII)", callback_data: "prof:p:pppk_vii" }],
      [{ text: "Non-ASN / Tenaga Honorer", callback_data: "prof:p:non_asn" }]
    ];
  }

  buttons.push([
    { text: "⬅️ Pilih Golongan Lain", callback_data: "prof:back_cat" },
    { text: "❌ Batal", callback_data: "prof:cancel" }
  ]);

  const text = `🎖 *SUB-GOLONGAN: ${title}*\n\nSilakan pilih jenjang pangkat spesifik Anda:`;

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

/**
 * Langkah 3 Wizard Profil: Pilih Jabatan
 */
export function sendStepJabatan(botInstance, chatId) {
  const state = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    ...state,
    step: "jabatan"
  });

  const text = `💼 *PILIH JABATAN KEDINASAN (Langkah 3 dari 4)*\n\n` +
    `• Pangkat/Gol: *${state.data?.pangkat || "-"}*\n\n` +
    `Pilih jabatan kedinasan Anda di bawah, atau klik *Ketik Manual* jika tidak ada di daftar:`;

  const inline_keyboard = [
    [{ text: "💻 Pranata Komputer Ahli Pertama", callback_data: "prof:j:j_prakom" }],
    [{ text: "💻 Pranata Komputer Terampil", callback_data: "prof:j:j_prakomt" }],
    [{ text: "👩‍🏫 Guru Ahli Pertama", callback_data: "prof:j:j_guru" }],
    [{ text: "👩‍🏫 Guru Ahli Muda", callback_data: "prof:j:j_gurut" }],
    [{ text: "📁 Pengadministrasi Perkantoran", callback_data: "prof:j:j_adm" }],
    [{ text: "📊 Analis Kebijakan Ahli Pertama", callback_data: "prof:j:j_analis" }],
    [{ text: "👥 Pengelola Kepegawaian", callback_data: "prof:j:j_kepeg" }],
    [{ text: "🏢 Kasubbag Tata Usaha", callback_data: "prof:j:j_tu" }],
    [{ text: "✏️ Ketik Jabatan Manual", callback_data: "prof:j_manual" }],
    [
      { text: "⬅️ Kembali ke Pangkat", callback_data: "prof:back_pangkat" },
      { text: "❌ Batal", callback_data: "prof:cancel" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Langkah 4 Wizard Profil: Pilih Unit Kerja
 */
export function sendStepUnitKerja(botInstance, chatId) {
  const state = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    ...state,
    step: "unitKerja"
  });

  const text = `🏢 *PILIH UNIT KERJA / INSTANSI (Langkah 4 dari 4)*\n\n` +
    `• Jabatan: *${state.data?.jabatan || "-"}*\n\n` +
    `Pilih unit kerja Anda di bawah, atau klik *Ketik Manual*:`;

  const inline_keyboard = [
    [{ text: "🏫 SMK N 07 SAMARINDA", callback_data: "prof:u:u_smk7" }],
    [{ text: "🏛 DINAS PENDIDIKAN DAN KEBUDAYAAN", callback_data: "prof:u:u_disdik" }],
    [{ text: "🏛 BADAN KEPEGAWAIAN DAERAH (BKD)", callback_data: "prof:u:u_bkd" }],
    [{ text: "🔍 INSPEKTORAT DAERAH", callback_data: "prof:u:u_inspek" }],
    [{ text: "🏛 SEKRETARIAT DAERAH", callback_data: "prof:u:u_setda" }],
    [{ text: "✏️ Ketik Unit Kerja Manual", callback_data: "prof:u_manual" }],
    [
      { text: "⬅️ Kembali ke Jabatan", callback_data: "prof:back_jabatan" },
      { text: "❌ Batal", callback_data: "prof:cancel" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Langkah 5 Wizard Profil: Konfirmasi & Simpan
 */
export function sendProfileConfirmation(botInstance, chatId) {
  const state = profileSetupStates.get(chatId) || { data: {} };
  profileSetupStates.set(chatId, {
    ...state,
    step: "confirm"
  });

  const text = `📋 *KONFIRMASI IDENTITAS KEDINASAN ASN*\n\n` +
    `Mohon periksa data Anda sebelum disimpan:\n` +
    `• 💳 *NIP*: \`${state.data?.nip || "-"}\`\n` +
    `• 🎖 *Pangkat/Gol*: *${state.data?.pangkat || "-"}*\n` +
    `• 💼 *Jabatan*: *${state.data?.jabatan || "-"}*\n` +
    `• 🏢 *Unit Kerja*: *${state.data?.unitKerja || "-"}*\n\n` +
    `Apakah informasi data diri di atas sudah tepat?`;

  const inline_keyboard = [
    [
      { text: "✅ Simpan & Terapkan Profil", callback_data: "prof:confirm_save" }
    ],
    [
      { text: "🔄 Ulangi Dari Awal", callback_data: "prof:restart" },
      { text: "❌ Batal", callback_data: "prof:cancel" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Pemilih Bulan Laporan Interaktif
 */
export function sendReportMonthPicker(botInstance, chatId) {
  const session = getTelegramSession(chatId);
  if (!session) {
    return botInstance.sendMessage(chatId, "⚠️ Silakan login terlebih dahulu.");
  }
  if (isProfileIncomplete(session.user)) {
    return botInstance.sendMessage(
      chatId,
      getProfileIncompleteWarningText(session.user),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "⚙️ Lengkapi Data Diri Sekarang", callback_data: "menu:setprofil" }]]
        }
      }
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const m1 = month;
  const m2 = (month - 1 + 12) % 12;
  const y2 = month === 0 ? year - 1 : year;
  const m3 = (month - 2 + 12) % 12;
  const y3 = month <= 1 ? year - 1 : year;
  const m4 = (month - 3 + 12) % 12;
  const y4 = month <= 2 ? year - 1 : year;

  const pad = (n) => String(n + 1).padStart(2, "0");

  const monthRows = [
    [{ text: `📅 ${NAMA_BULAN_INDONESIA[m1]} ${year} (Bulan Ini)`, callback_data: `report:${pad(m1)}:${year}` }],
    [
      { text: `📅 ${NAMA_BULAN_INDONESIA[m2]} ${y2}`, callback_data: `report:${pad(m2)}:${y2}` },
      { text: `📅 ${NAMA_BULAN_INDONESIA[m3]} ${y3}`, callback_data: `report:${pad(m3)}:${y3}` }
    ],
    [{ text: `📅 ${NAMA_BULAN_INDONESIA[m4]} ${y4}`, callback_data: `report:${pad(m4)}:${y4}` }]
  ];

  const userGdrive = (session.user.gdriveLink || "").trim();
  const gdriveStatus = userGdrive
    ? `🔗 *Link Google Drive (Footer PDF):*\n\`${userGdrive}\`\n_(Tercantum aktif pada footer Laporan PDF)_\n\n`
    : `🔗 *Link Google Drive (Footer PDF):*\n_Belum diatur (footer PDF disembunyikan)_\n\n`;

  if (![m1, m2, m3, m4].includes(6) || year !== 2026) {
    monthRows.push([
      { text: `📅 Juli 2026 (Data Demo)`, callback_data: `report:07:2026` }
    ]);
  }

  // Tombol untuk memasukkan atau mengubah link Google Drive
  monthRows.push([
    {
      text: userGdrive ? "🔗 Ubah Link Google Drive" : "🔗 Masukkan Link Google Drive",
      callback_data: "link:prompt"
    }
  ]);

  monthRows.push([
    { text: `🏛 Kembali ke Menu Utama`, callback_data: "menu:main" }
  ]);

  const text = `📄 *PILIH BULAN LAPORAN PDF & ZIP*\n\n` +
    gdriveStatus +
    `Silakan tekan salah satu tombol bulan di bawah untuk langsung mengunduh Dokumen Laporan Kinerja & Berkas Lampiran ZIP:\n\n` +
    `_Format manual:_ \`/laporan [bulan] [tahun] [link_gdrive]\`\n` +
    `_Contoh:_ \`/laporan Juli 2026\` atau \`/laporan Juli 2026 https://drive.google.com/...\``;

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: monthRows }
  });
}

/**
 * Handler Callback Query (Klik Tombol Inline Keyboard)
 */
export async function handleCallbackQuery(botInstance, query) {
  const chatId = query.message?.chat?.id;
  const data = query.data || "";

  try {
    await botInstance.answerCallbackQuery(query.id);
  } catch (e) {}

  if (!chatId) return;

  const session = getTelegramSession(chatId);

  // A. Tombol Autentikasi
  if (data.startsWith("auth:")) {
    const action = data.replace("auth:", "");
    if (action === "login") {
      loginStates.set(chatId, { step: "username", username: "" });
      return botInstance.sendMessage(
        chatId,
        `🔐 *LOGIN SISTEM E-KINERJA AI*\n\n` +
        `Silakan ketik *Username* akun Anda:\n\n` +
        `_(Atau ketik \`/login <username> <password>\` untuk langsung login, atau \`/batal\` untuk membatalkan)_`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "auth:cancel_login" }]]
          }
        }
      );
    }
    if (action === "register") {
      return handleRegisterCommand(botInstance, { chat: { id: chatId } }, null);
    }
    if (action === "cancel_login") {
      loginStates.delete(chatId);
      return botInstance.sendMessage(chatId, "ℹ️ Login dibatalkan. Ketik /start kapan pun Anda siap.");
    }
  }

  // B. Menu Utama
  if (data.startsWith("menu:")) {
    const action = data.replace("menu:", "");

    if (action === "main") {
      if (!session) return handleStart(botInstance, { chat: { id: chatId } });
      return sendMainMenu(botInstance, chatId, session.user);
    }
    if (action === "catat") {
      const defaultJam = session.user?.defaultJam || "08:00 - 16:00";
      return botInstance.sendMessage(
        chatId,
        `📝 *CARA MENCATAT JURNAL AKTIVITAS*\n\n` +
        `Cukup ketik uraian pekerjaan Anda dengan bahasa santai di chat ini!\n\n` +
        `_Contoh teks:_ \n• "tadi pagi instal ulang windows lab komputer dan bantu cetak surat tugas dinas"\n• "rapat dinas kurikulum jam 08:00 - 11:30"\n• "pukul 07.30 - 14.00 pendampingan praktikum siswa"\n\n` +
        `⏰ *Pengaturan Jam Kerja*:\n` +
        `• Jika Anda menuliskan jam pada pesan, jam tersebut yang akan disimpan.\n` +
        `• Jika tidak menuliskan jam, otomatis menggunakan jam default: \`${defaultJam}\`.\n` +
        `• Ketik \`/jam\` untuk melihat/mengubah jam default kantor Anda.\n\n` +
        `🤖 *AI otomatis mengubahnya* ke kalimat formal standar SKP BKN dan menyimpannya ke logbook Anda.\n\n` +
        `📸 Anda juga bisa langsung kirim *Foto* atau 📄 *Dokumen* dengan caption tugas!`,
        { parse_mode: "Markdown" }
      );
    }
    if (action === "jam") {
      if (!session) return handleStart(botInstance, { chat: { id: chatId } });
      return sendJamPicker(botInstance, chatId, session.user);
    }
    if (action === "jurnal") {
      return handleJournals(botInstance, { chat: { id: chatId } });
    }
    if (action === "laporan") {
      return sendReportMonthPicker(botInstance, chatId);
    }
    if (action === "profil") {
      return handleProfile(botInstance, { chat: { id: chatId } });
    }
    if (action === "setprofil") {
      return sendStepNip(botInstance, chatId);
    }
    if (action === "logout") {
      return handleLogout(botInstance, { chat: { id: chatId } });
    }
  }

  // C. Wizard Pengisian Data Diri Interaktif (prof:*)
  if (data.startsWith("prof:")) {
    if (!session) {
      return botInstance.sendMessage(chatId, "⚠️ Sesi Anda telah berakhir. Silakan login kembali.");
    }

    const sub = data.replace("prof:", "");

    if (sub === "cancel") {
      profileSetupStates.delete(chatId);
      return botInstance.sendMessage(
        chatId,
        `ℹ️ Pengisian data diri dibatalkan. Anda dapat melanjutkan kapan saja dengan tombol *Atur Data Diri*.`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "🏛 Menu Utama", callback_data: "menu:main" }]]
          }
        }
      );
    }

    if (sub === "restart") {
      return sendStepNip(botInstance, chatId);
    }

    if (sub === "back_nip") {
      return sendStepNip(botInstance, chatId);
    }
    if (sub === "back_cat") {
      return sendStepPangkatCategories(botInstance, chatId);
    }
    if (sub === "back_pangkat") {
      return sendStepPangkatCategories(botInstance, chatId);
    }
    if (sub === "back_jabatan") {
      return sendStepJabatan(botInstance, chatId);
    }

    if (sub === "set_nip_skip") {
      const state = profileSetupStates.get(chatId) || { data: {} };
      state.data = state.data || {};
      state.data.nip = "-";
      profileSetupStates.set(chatId, state);
      return sendStepPangkatCategories(botInstance, chatId);
    }

    if (sub.startsWith("cat:")) {
      const cat = sub.replace("cat:", "");
      if (cat === "manual") {
        const state = profileSetupStates.get(chatId) || { data: {} };
        profileSetupStates.set(chatId, { ...state, step: "pangkat_manual" });
        return botInstance.sendMessage(
          chatId,
          `✏️ *Ketik Pangkat/Golongan Manual*\n\nSilakan ketik nama pangkat dan golongan Anda:\n_Contoh:_ \`Penata Muda Tk. I / III/b\`\n\n_(Ketik /batal untuk membatalkan)_`,
          { parse_mode: "Markdown" }
        );
      }
      return sendStepPangkatSub(botInstance, chatId, cat);
    }

    if (sub.startsWith("p:")) {
      const pId = sub.replace("p:", "");
      const pangkatName = PANGKAT_PRESETS[pId] || pId;
      const state = profileSetupStates.get(chatId) || { data: {} };
      state.data = state.data || {};
      state.data.pangkat = pangkatName;
      profileSetupStates.set(chatId, state);
      return sendStepJabatan(botInstance, chatId);
    }

    if (sub.startsWith("j:")) {
      const jId = sub.replace("j:", "");
      const jabatanName = JABATAN_PRESETS[jId] || jId;
      const state = profileSetupStates.get(chatId) || { data: {} };
      state.data = state.data || {};
      state.data.jabatan = jabatanName;
      profileSetupStates.set(chatId, state);
      return sendStepUnitKerja(botInstance, chatId);
    }

    if (sub === "j_manual") {
      const state = profileSetupStates.get(chatId) || { data: {} };
      profileSetupStates.set(chatId, { ...state, step: "jabatan_manual" });
      return botInstance.sendMessage(
        chatId,
        `✏️ *Ketik Jabatan Kedinasan Manual*\n\nSilakan ketik nama jabatan resmi Anda:\n_Contoh:_ \`Guru Ahli Madya\` atau \`Pengelola Pengadaan Barang/Jasa\`\n\n_(Ketik /batal untuk membatalkan)_`,
        { parse_mode: "Markdown" }
      );
    }

    if (sub.startsWith("u:")) {
      const uId = sub.replace("u:", "");
      const unitName = UNIT_PRESETS[uId] || uId;
      const state = profileSetupStates.get(chatId) || { data: {} };
      state.data = state.data || {};
      state.data.unitKerja = unitName;
      profileSetupStates.set(chatId, state);
      return sendProfileConfirmation(botInstance, chatId);
    }

    if (sub === "u_manual") {
      const state = profileSetupStates.get(chatId) || { data: {} };
      profileSetupStates.set(chatId, { ...state, step: "unit_manual" });
      return botInstance.sendMessage(
        chatId,
        `✏️ *Ketik Unit Kerja / Sekolah Manual*\n\nSilakan ketik nama unit kerja resmi Anda:\n_Contoh:_ \`SMP NEGERI 1 SAMARINDA\` atau \`DINAS KESEHATAN\`\n\n_(Ketik /batal untuk membatalkan)_`,
        { parse_mode: "Markdown" }
      );
    }

    if (sub === "confirm_save") {
      const state = profileSetupStates.get(chatId);
      if (!state || !state.data) {
        return botInstance.sendMessage(chatId, "⚠️ Data profil tidak ditemukan. Silakan ulangi dengan menekan /setprofil.");
      }

      try {
        const updated = updateUserProfile(session.userId, state.data);
        profileSetupStates.delete(chatId);

        const successMsg = `🎉 *DATA DIRI ASN BERHASIL DISIMPAN!* ✅\n\n` +
          `Identitas kedinasan Anda telah diperbarui:\n` +
          `• *Nama*: ${updated.nama}\n` +
          `• *NIP*: \`${updated.nip}\`\n` +
          `• *Pangkat/Gol*: ${updated.pangkat}\n` +
          `• *Jabatan*: ${updated.jabatan}\n` +
          `• *Unit Kerja*: ${updated.unitKerja}\n\n` +
          `Kini seluruh akses pencatatan jurnal dan laporan PDF BKN telah aktif sempurna! 🚀`;

        const inline_keyboard = [
          [
            { text: "📝 Mulai Catat Aktivitas", callback_data: "menu:catat" },
            { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }
          ],
          [
            { text: "🏛 Menu Utama", callback_data: "menu:main" }
          ]
        ];

        return botInstance.sendMessage(chatId, successMsg, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard }
        });
      } catch (err) {
        return botInstance.sendMessage(chatId, `❌ Gagal menyimpan profil: ${err.message}`);
      }
    }
  }

  // D. Pemilihan Bulan Laporan (report:MM:YYYY)
  if (data.startsWith("report:")) {
    const parts = data.split(":");
    const month = parts[1];
    const year = parts[2] || String(new Date().getFullYear());

    return handleReport(botInstance, { chat: { id: chatId } }, ["", `${month} ${year}`]);
  }

  // E. Pengaturan Link Google Drive Bukti Dukung (link:*)
  if (data.startsWith("link:")) {
    if (!session) {
      return botInstance.sendMessage(chatId, "⚠️ Sesi Anda telah berakhir. Silakan login kembali.");
    }

    const sub = data.replace("link:", "");

    if (sub === "prompt") {
      linkSetupStates.set(chatId, { returnTo: "report" });
      const currentLink = session.user.gdriveLink || "";
      return botInstance.sendMessage(
        chatId,
        `🔗 *PENGATURAN LINK GOOGLE DRIVE BUKTI DUKUNG*\n\n` +
        `Tautan ini akan dicantumkan pada *Catatan Kaki (Footer)* dokumen resmi Laporan Kinerja PDF bulanan Anda.\n\n` +
        `• *Status saat ini*: ${currentLink ? `\`${currentLink}\`` : `_Belum diatur (footer PDF disembunyikan)_`}\n\n` +
        `Silakan *kirim tautan / URL folder Google Drive* Anda sekarang (balas pesan ini):\n` +
        `_Contoh:_ \`https://drive.google.com/drive/folders/...\`\n\n` +
        `_(Ketik \`hapus\` untuk mengosongkan/sembunyikan footer, atau klik Batal di bawah)_`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "link:cancel" }]]
          }
        }
      );
    }

    if (sub === "clear") {
      try {
        updateUserProfile(session.userId, { gdriveLink: "" });
      } catch (e) {}

      await botInstance.sendMessage(
        chatId,
        `🗑 *Link Google Drive Dikosongkan!* ✅\n\n` +
        `Catatan kaki link Google Drive pada footer dokumen laporan PDF kini disembunyikan.`,
        { parse_mode: "Markdown" }
      );
      return sendReportMonthPicker(botInstance, chatId);
    }

    if (sub === "cancel") {
      linkSetupStates.delete(chatId);
      return botInstance.sendMessage(
        chatId,
        `ℹ️ Pengaturan link Google Drive dibatalkan.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }],
              [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
            ]
          }
        }
      );
    }
  }

  // F. Pengaturan Jam Kerja Default (jam:*)
  if (data.startsWith("jam:")) {
    if (!session) {
      return botInstance.sendMessage(chatId, "⚠️ Sesi Anda telah berakhir. Silakan login kembali.");
    }
    const jamAction = data.replace("jam:", "");
    let newJam = null;
    if (jamAction === "set_0800_1600") newJam = "08:00 - 16:00";
    else if (jamAction === "set_0730_1600") newJam = "07:30 - 16:00";
    else if (jamAction === "set_0730_1400") newJam = "07:30 - 14:00";
    else if (jamAction === "set_0800_1530") newJam = "08:00 - 15:30";
    else if (jamAction === "manual") {
      return botInstance.sendMessage(
        chatId,
        `✏️ *Atur Jam Kerja Default Manual*\n\n` +
        `Ketik perintah \`/jam\` diikuti rentang jam kerja Anda, contoh:\n` +
        `• \`/jam 07:30 - 16:00\`\n` +
        `• \`/jam 08:00 - 14:30\`\n\n` +
        `_(Ketik /batal untuk membatalkan)_`,
        { parse_mode: "Markdown" }
      );
    }

    if (newJam) {
      try {
        updateUserProfile(session.userId, { defaultJam: newJam });
        session.user.defaultJam = newJam;
      } catch (e) {}

      return botInstance.sendMessage(
        chatId,
        `✅ *Jam Kerja Default Berhasil Disimpan!*\n\n` +
        `⏰ Jam kerja default Anda sekarang: \`${newJam}\`\n\n` +
        `Setiap kali Anda mengirim jurnal tanpa menyebutkan jam, sistem otomatis menetapkan jam \`${newJam}\`.\n\n` +
        `_💡 Tips: Anda tetap bisa menentukan jam berbeda per kegiatan cukup dengan mengetiknya di pesan (contoh: "rapat dinas jam 08:00 - 11:30")._`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📝 Mulai Catat Aktivitas", callback_data: "menu:catat" }],
              [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
            ]
          }
        }
      );
    }
  }
}

/**
 * Handler Perintah /start dan /help
 */
export function handleStart(botInstance, msg) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    const text = `Selamat datang di *Bot E-Kinerja ASN AI*! 🤖🇮🇩\n\n` +
      `Asisten pintar pencatatan jurnal harian dan pembuatan laporan kinerja bulanan resmi standar PermenPAN-RB No. 6 Tahun 2022.\n\n` +
      `Silakan pilih opsi di bawah untuk memulai:`;
    const inline_keyboard = [
      [
        { text: "🔐 Masuk / Login", callback_data: "auth:login" },
        { text: "📝 Daftar Akun Baru", callback_data: "auth:register" }
      ]
    ];
    return botInstance.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard }
    });
  }

  return sendMainMenu(botInstance, chatId, session.user);
}

/**
 * Handler Perintah /login <username> <password>
 */
export function handleLogin(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const rawInput = match && match[1] ? match[1].trim() : "";
  const parts = rawInput ? rawInput.split(/\s+/) : [];

  if (parts.length < 2) {
    loginStates.set(chatId, { step: "username", username: "" });
    return botInstance.sendMessage(
      chatId,
      `🔐 *LOGIN SISTEM E-KINERJA AI*\n\n` +
      `Silakan ketik *Username* akun Anda:\n\n` +
      `_(Atau ketik \`/login <username> <password>\` untuk langsung login, atau \`/batal\` untuk membatalkan)_`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Batal", callback_data: "auth:cancel_login" }]]
        }
      }
    );
  }

  const username = parts[0];
  const password = parts.slice(1).join(" ");

  const auth = authenticateUser(username, password);
  if (!auth.success) {
    return botInstance.sendMessage(
      chatId,
      `❌ *Login Gagal!*\n${auth.message}\n\nPastikan username dan password sesuai dengan akun yang terdaftar.`,
      { parse_mode: "Markdown" }
    );
  }

  const user = auth.user;
  setTelegramSession(chatId, user.id);

  const isIncomplete = isProfileIncomplete(user);

  let reply = `✅ *LOGIN BERHASIL!* 🎉\n\n` +
    `Selamat datang, *${user.nama}*!\n` +
    `• *NIP*: \`${user.nip || "Belum lengkap"}\`\n` +
    `• *Pangkat*: ${user.pangkat || "Belum lengkap"}\n` +
    `• *Jabatan*: ${user.jabatan || "Belum lengkap"}\n` +
    `• *Unit Kerja*: ${user.unitKerja || "Belum lengkap"}\n\n`;

  if (isIncomplete) {
    reply += `⚠️ *PERINGATAN PENTING: DATA DIRI BELUM LENGKAP!*\n` +
      `Akun Anda belum memiliki data identitas kedinasan lengkap. Sesuai ketentuan, Anda *WAJIB* melengkapi data diri sebelum dapat mencatat jurnal atau meminta laporan PDF.\n\n` +
      `👉 Ketik perintah:\n\`/setprofil <NIP> | <Pangkat> | <Jabatan> | <Unit Kerja>\`\n` +
      `_Atau cukup ketik \`/setprofil\` untuk dipandu langkah demi langkah._`;
  } else {
    reply += `Sekarang Anda bisa langsung mengirimkan catatan tugas harian dengan bahasa santai di chat ini. AI akan otomatis menyempurnakannya ke format formal ASN!\n\n` +
      `Ketik \`/laporan\` kapan pun untuk mengunduh berkas laporan bulanan berformat PDF.`;
  }

  return botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
}

/**
 * Handler Registrasi Akun Baru (/register atau /daftar)
 */
export function handleRegisterCommand(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (session) {
    return botInstance.sendMessage(
      chatId,
      `ℹ️ Anda sudah login sebagai *${session.user.nama}* (@${session.user.username}).\n\nJika ingin mendaftarkan akun baru, ketik \`/logout\` terlebih dahulu.`,
      { parse_mode: "Markdown" }
    );
  }

  const rawArg = match && match[1] ? match[1].trim() : "";
  if (rawArg) {
    const code = rawArg.toUpperCase();
    const validation = validateRegistrationCode(code);
    if (!validation.valid) {
      return botInstance.sendMessage(
        chatId,
        `❌ *Kode Registrasi Tidak Valid!*\n${validation.message}\n\nPastikan Anda memasukkan kode pendaftaran resmi dari Administrator.`,
        { parse_mode: "Markdown" }
      );
    }

    registrationStates.set(chatId, {
      step: "username",
      code: code,
      data: {}
    });

    return botInstance.sendMessage(
      chatId,
      `🎫 *KODE REGISTRASI VALID!* ✅\n` +
      `Kode: \`${code}\`\n\n` +
      `*Langkah 1 dari 4: Tentukan Username*\n` +
      `Silakan ketik username baru yang Anda inginkan (huruf kecil & angka, min 3 karakter):\n` +
      `_Contoh: budi_santoso_\n\n` +
      `_(Ketik /batal kapan saja untuk membatalkan)_`,
      { parse_mode: "Markdown" }
    );
  }

  // Tanpa parameter kode, minta kode terlebih dahulu
  registrationStates.set(chatId, {
    step: "code",
    code: "",
    data: {}
  });

  return botInstance.sendMessage(
    chatId,
    `🎫 *REGISTRASI AKUN BARU E-KINERJA AI*\n\n` +
    `Pendaftaran akun wajib menggunakan *Kode Registrasi* yang diterbitkan oleh Administrator.\n\n` +
    `Silakan ketikkan *Kode Registrasi* Anda:\n` +
    `_Contoh:_ \`EKIN-AB12CD\`\n\n` +
    `_(Ketik /batal kapan saja untuk membatalkan)_`,
    { parse_mode: "Markdown" }
  );
}

/**
 * Handler Melengkapi / Mengubah Profil (/setprofil atau /lengkapi)
 */
export function handleSetProfile(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    return botInstance.sendMessage(
      chatId,
      `⚠️ Anda belum login.\nKetik \`/login <username> <password>\` terlebih dahulu.`,
      { parse_mode: "Markdown" }
    );
  }

  const rawArg = match && match[1] ? match[1].trim() : "";

  // 1. Jika pengguna memberikan argumen satu baris dengan pemisah |
  if (rawArg.includes("|")) {
    const parts = rawArg.split("|").map(s => s.trim()).filter(Boolean);
    if (parts.length < 4) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Format Data Tidak Lengkap!*\n\n` +
        `Harap sertakan minimal 4 informasi dengan pemisah tanda pipa (\`|\`):\n` +
        `\`/setprofil <NIP> | <Pangkat/Golongan> | <Jabatan> | <Unit Kerja>\`\n\n` +
        `*Contoh:*\n` +
        `\`/setprofil 198507122010011008 | Penata Muda Tk. I / III/b | Pranata Komputer Ahli Pertama | SMK N 07 SAMARINDA\``,
        { parse_mode: "Markdown" }
      );
    }

    const nip = parts[0];
    const pangkat = parts[1];
    const jabatan = parts[2];
    const unitKerja = parts[3];

    if (nip.length < 5 && nip !== "-") {
      return botInstance.sendMessage(chatId, `⚠️ NIP harus memiliki minimal 5 karakter/digit (atau '-' jika non-PNS)!`);
    }

    try {
      const updated = updateUserProfile(session.userId, { nip, pangkat, jabatan, unitKerja });
      profileSetupStates.delete(chatId);

      const successMsg = `🎉 *DATA DIRI BERHASIL DILENGKAPI!* ✅\n\n` +
        `Identitas kedinasan Anda telah tersimpan:\n` +
        `• *Nama*: ${updated.nama}\n` +
        `• *NIP*: \`${updated.nip}\`\n` +
        `• *Pangkat/Gol*: ${updated.pangkat}\n` +
        `• *Jabatan*: ${updated.jabatan}\n` +
        `• *Unit Kerja*: ${updated.unitKerja}\n\n` +
        `Sekarang seluruh fitur e-Kinerja telah terbuka penuh! Anda sudah dapat mencatat jurnal harian dan membuat laporan PDF resmi BKN.`;

      const inline_keyboard = [
        [
          { text: "📝 Catat Aktivitas", callback_data: "menu:catat" },
          { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }
        ],
        [
          { text: "🏛 Menu Utama", callback_data: "menu:main" }
        ]
      ];

      return botInstance.sendMessage(chatId, successMsg, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard }
      });
    } catch (err) {
      return botInstance.sendMessage(chatId, `❌ Gagal menyimpan profil: ${err.message}`);
    }
  }

  // 2. Mode Interaktif Tombol Langkah Demi Langkah
  return sendStepNip(botInstance, chatId);
}

/**
 * Handler Membatalkan Pengisian Interaktif (/batal)
 */
export function handleCancel(botInstance, msg) {
  const chatId = msg.chat.id;
  let cancelled = false;

  if (profileSetupStates.has(chatId)) {
    profileSetupStates.delete(chatId);
    cancelled = true;
  }
  if (registrationStates.has(chatId)) {
    registrationStates.delete(chatId);
    cancelled = true;
  }
  if (loginStates.has(chatId)) {
    loginStates.delete(chatId);
    cancelled = true;
  }
  if (pendingUploads.has(chatId)) {
    pendingUploads.delete(chatId);
    cancelled = true;
  }
  if (linkSetupStates.has(chatId)) {
    linkSetupStates.delete(chatId);
    cancelled = true;
  }

  if (cancelled) {
    return botInstance.sendMessage(chatId, `ℹ️ Proses pengisian data / antrean berkas telah dibatalkan.`);
  }
  return botInstance.sendMessage(chatId, `ℹ️ Tidak ada proses pengisian data atau registrasi yang sedang berlangsung.`);
}

/**
 * Handler Perintah /logout
 */
export function handleLogout(botInstance, msg) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  profileSetupStates.delete(chatId);
  loginStates.delete(chatId);
  linkSetupStates.delete(chatId);

  if (!session) {
    return botInstance.sendMessage(chatId, "ℹ️ Anda saat ini memang belum login.");
  }

  clearTelegramSession(chatId);
  return botInstance.sendMessage(
    chatId,
    `👋 Sesi untuk *${session.user.nama}* telah diakhiri.\n\nSilakan tekan tombol di bawah jika ingin masuk kembali:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔐 Masuk / Login", callback_data: "auth:login" }]
        ]
      }
    }
  );
}

/**
 * Handler Perintah /profil atau /status
 */
export function handleProfile(botInstance, msg) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    return botInstance.sendMessage(
      chatId,
      `⚠️ Anda belum login.\nKetik \`/login <username> <password>\` terlebih dahulu.`,
      { parse_mode: "Markdown" }
    );
  }

  const user = session.user;
  const isIncomplete = isProfileIncomplete(user);
  const userJournals = getJournals(session.userId);
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = String(now.getFullYear());
  const monthJournals = userJournals.filter(j => {
    if (!j.tanggal) return false;
    const [y, m] = j.tanggal.split("-");
    return y === currentYear && m === currentMonth;
  });

  let reply = `📋 *PROFIL PEGAWAI ASN AKTIF*\n\n` +
    `👤 *Nama*: ${user.nama}\n` +
    `💳 *NIP*: \`${user.nip || "-"}\`\n` +
    `🎖 *Pangkat/Gol*: ${user.pangkat || "-"}\n` +
    `💼 *Jabatan*: ${user.jabatan || "-"}\n` +
    `🏢 *Unit Kerja*: ${user.unitKerja || "-"}\n` +
    `🔗 *Link Google Drive (Footer PDF)*: ${user.gdriveLink ? `\`${user.gdriveLink}\`` : "_Belum diatur (footer disembunyikan)_"}\n` +
    `🔐 *Role*: ${user.role || "pegawai"}\n\n`;

  if (isIncomplete) {
    reply += `⚠️ *STATUS DATA DIRI*: ❌ *BELUM LENGKAP (WAJIB DILENGKAPI)*\n` +
      `Silakan lengkapi data kedinasan Anda agar dapat mencatat jurnal.\n\n`;
  } else {
    reply += `✅ *STATUS DATA DIRI*: LENGKAP & VALID\n\n`;
  }

  reply += `📊 *Statistik Jurnal:*\n` +
    `• Total Semua Logbook: *${userJournals.length}* aktivitas\n` +
    `• Logbook Bulan Ini: *${monthJournals.length}* aktivitas\n\n` +
    `Gunakan tombol di bawah untuk navigasi cepat:`;

  const inline_keyboard = [
    [
      { text: "⚙️ Atur Data Diri", callback_data: "menu:setprofil" },
      { text: user.gdriveLink ? "🔗 Ubah Link Google Drive" : "🔗 Atur Link Google Drive", callback_data: "link:prompt" }
    ],
    [
      { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" },
      { text: "🏛 Menu Utama", callback_data: "menu:main" }
    ]
  ];

  return botInstance.sendMessage(chatId, reply, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Handler Perintah /jurnal (melihat jurnal terbaru)
 */
export function handleJournals(botInstance, msg) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    return botInstance.sendMessage(chatId, `⚠️ Anda belum login. Ketik \`/login <username> <password>\``, { parse_mode: "Markdown" });
  }

  const journals = getJournals(session.userId);
  if (journals.length === 0) {
    return botInstance.sendMessage(
      chatId,
      `📝 *Belum ada jurnal yang tersimpan.*\n\n` +
      `Coba kirimkan apa yang Anda kerjakan hari ini dengan bahasa santai, misal:\n` +
      `_"Tadi pagi verifikasi data kenaikan pangkat dan antar surat dinas"_`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Cara Catat Aktivitas", callback_data: "menu:catat" }],
            [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
          ]
        }
      }
    );
  }

  const recent = journals.slice(0, 5);
  let text = `📝 *5 Jurnal Terakhir Anda:*\n\n`;

  recent.forEach((j, idx) => {
    text += `${idx + 1}. 📅 *${j.tanggal || "-"}* (${j.jam || "Jam Kerja"})\n` +
      `   *Uraian*: ${j.aktivitas}\n` +
      `   *Output*: ${j.outputJumlah || "1 Dokumen"}\n` +
      (j.catatan ? `   *Catatan*: _${j.catatan}_\n` : "") +
      `\n`;
  });

  text += `💡 Klik tombol di bawah untuk mencetak laporan resmi atau kembali ke menu.`;

  const inline_keyboard = [
    [
      { text: "📝 Catat Aktivitas", callback_data: "menu:catat" },
      { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }
    ],
    [
      { text: "🏛 Menu Utama", callback_data: "menu:main" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Handler Perintah /laporan [bulan] [tahun] (membuat dan mengirim PDF)
 */
export async function handleReport(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    return botInstance.sendMessage(
      chatId,
      `⚠️ Anda belum login ke sistem E-Kinerja.\nKetik \`/login <username> <password>\` terlebih dahulu.`,
      { parse_mode: "Markdown" }
    );
  }

  const user = session.user;

  // Wajib Lengkapi Data Diri Sebelum Mencetak Laporan
  if (isProfileIncomplete(user)) {
    return botInstance.sendMessage(
      chatId,
      getProfileIncompleteWarningText(user),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "⚙️ Lengkapi Data Diri Sekarang", callback_data: "menu:setprofil" }]]
        }
      }
    );
  }

  const rawArg = match && match[1] ? match[1].trim() : "";
  const parts = rawArg ? rawArg.split(/\s+/) : [];

  // Jika tidak ada argumen, tampilkan pemilih bulan interaktif
  if (parts.length === 0) {
    return sendReportMonthPicker(botInstance, chatId);
  }

  const now = new Date();
  let targetMonth = String(now.getMonth() + 1).padStart(2, "0");
  let targetYear = String(now.getFullYear());

  let urlArg = "";
  for (const p of parts) {
    if (p.startsWith("http://") || p.startsWith("https://") || p.includes("drive.google.com")) {
      urlArg = p.trim();
      break;
    }
  }

  if (parts.length >= 1) {
    const p0 = parts[0].toLowerCase();
    if (NAMA_BULAN_MAP[p0]) {
      targetMonth = NAMA_BULAN_MAP[p0];
    } else if (!isNaN(p0) && parseInt(p0, 10) >= 1 && parseInt(p0, 10) <= 12) {
      targetMonth = String(parseInt(p0, 10)).padStart(2, "0");
    }
  }

  if (parts.length >= 2) {
    const p1 = parts[1];
    if (!isNaN(p1) && parseInt(p1, 10) >= 2020 && parseInt(p1, 10) <= 2035) {
      targetYear = p1;
    }
  }

  // Jika user menyertakan URL baru di perintah /laporan, simpan permanen ke profil user
  let activeUser = user;
  if (urlArg) {
    try {
      activeUser = updateUserProfile(user.id, { gdriveLink: urlArg });
    } catch (e) {
      console.warn("Gagal menyimpan link drive profil:", e);
    }
  }

  const { settings } = getSettings();
  const effectiveGdriveLink = (urlArg || activeUser.gdriveLink || settings?.gdriveLink || "").trim();

  const monthIdx = parseInt(targetMonth, 10) - 1;
  const monthName = NAMA_BULAN_INDONESIA[monthIdx] || targetMonth;

  await botInstance.sendMessage(
    chatId,
    `⏳ *Sedang menyusun Laporan Kinerja PDF...*\n` +
    `• Periode: *Bulan ${monthName} ${targetYear}*\n` +
    `• Pegawai: *${activeUser.nama}*\n` +
    (effectiveGdriveLink ? `• Link Drive: \`${effectiveGdriveLink}\`\n\n` : `• Link Drive: _(Tidak ada, footer disembunyikan)_\n\n`) +
    `Mohon tunggu beberapa detik...`,
    { parse_mode: "Markdown" }
  );

  try {
    botInstance.sendChatAction(chatId, "upload_document");

    const userJournals = getJournals(activeUser.id);

    const reportBundle = await generateMonthlyReportZip({
      pegawai: activeUser,
      journals: userJournals,
      month: targetMonth,
      year: targetYear,
      gdriveLink: effectiveGdriveLink,
      uploadsDir: UPLOADS_DIR
    });

    const { pdfBuffer, pdfFileName, zipBuffer, zipFileName, attachmentCount } = reportBundle;

    const gdriveCaptionNote = effectiveGdriveLink
      ? `🔗 *Link Google Drive Bukti Dukung:*\n\`${effectiveGdriveLink}\` (Tercantum di footer PDF)\n\n`
      : `ℹ️ _Catatan: Link Google Drive belum diatur (footer disembunyikan). Ketik /link <url> untuk memasang._\n\n`;

    // 1. Kirim Laporan Utama PDF A4
    await botInstance.sendDocument(
      chatId,
      pdfBuffer,
      {
        caption: `📄 *Laporan Bulanan Kinerja Pegawai*\n` +
          `🗓 Periode: *${monthName} ${targetYear}*\n` +
          `👤 Nama: *${activeUser.nama}*\n` +
          `💳 NIP: \`${activeUser.nip || "-"}\`\n\n` +
          gdriveCaptionNote +
          `✅ Dokumen A4 resmi standar PermenPAN-RB No. 6 Tahun 2022 siap dicetak atau dilampirkan ke aplikasi e-Kinerja BKN.`
      },
      {
        filename: pdfFileName,
        contentType: "application/pdf"
      }
    );

    // 2. Jika ada berkas lampiran fisik terupload, kirimkan juga arsip .ZIP lengkap untuk Google Drive
    if (attachmentCount > 0) {
      botInstance.sendChatAction(chatId, "upload_document");
      await botInstance.sendDocument(
        chatId,
        zipBuffer,
        {
          caption: `📦 *Paket Berkas Lengkap (.ZIP) untuk Google Drive*\n` +
            `• Berisi Laporan PDF + *${attachmentCount} berkas lampiran eviden* terunggah\n` +
            `• Seluruh berkas telah dinomori secara runtut (\`lampiran-1\`, \`lampiran-2\`, dst.) sesuai tabel laporan PDF\n` +
            `• Dilengkapi indeks panduan \`DAFTAR_LAMPIRAN.txt\`\n\n` +
            `🚀 _Tinggal unggah file ZIP ini langsung ke Google Drive bukti dukung Anda!_`
        },
        {
          filename: zipFileName,
          contentType: "application/zip"
        }
      );
    }

    const reportDoneKeyboard = [
      [
        { text: "📝 Catat Aktivitas", callback_data: "menu:catat" },
        { text: "📄 Unduh Bulan Lain", callback_data: "menu:laporan" }
      ],
      [
        { text: effectiveGdriveLink ? "🔗 Ubah Link Google Drive" : "🔗 Atur Link Google Drive", callback_data: "link:prompt" },
        { text: "🏛 Menu Utama", callback_data: "menu:main" }
      ]
    ];
    await botInstance.sendMessage(chatId, `✅ *Laporan ${monthName} ${targetYear} berhasil dikirim!*`, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: reportDoneKeyboard }
    });
  } catch (err) {
    console.error("Gagal membuat/mengirim PDF:", err);
    botInstance.sendMessage(
      chatId,
      `❌ *Gagal membuat dokumen PDF:* ${err.message}\nSilakan coba beberapa saat lagi.`,
      { parse_mode: "Markdown" }
    );
  }
}

/**
 * Handler Pesan Teks Bebas (Input Kasaran -> Poles AI -> Simpan Jurnal ATAU Wizard Profil)
 */
export async function handleIncomingText(botInstance, msg) {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : "";

  // Abaikan perintah bot berawalan slash (sudah ditangani onText)
  if (text.startsWith("/")) return;

  // A. Jika Pengguna Sedang dalam Alur Registrasi Akun Baru
  if (registrationStates.has(chatId)) {
    const regState = registrationStates.get(chatId);

    // Langkah 0: Input Kode (jika belum diisi saat command)
    if (regState.step === "code") {
      const code = text.trim().toUpperCase();
      const validation = validateRegistrationCode(code);
      if (!validation.valid) {
        return botInstance.sendMessage(
          chatId,
          `❌ *Kode Registrasi Tidak Valid!*\n${validation.message}\n\nSilakan masukkan kode yang masih berlaku, atau ketik \`/batal\` untuk membatalkan:`,
          { parse_mode: "Markdown" }
        );
      }
      regState.code = code;
      regState.step = "username";
      return botInstance.sendMessage(
        chatId,
        `🎫 *KODE REGISTRASI VALID!* ✅\nKode: \`${code}\`\n\n` +
        `*Langkah 1 dari 4: Tentukan Username*\n` +
        `Silakan ketik username yang Anda inginkan (huruf kecil & angka, min 3 karakter):\n` +
        `_Contoh: budi_santoso_\n\n` +
        `_(Ketik /batal kapan saja untuk membatalkan)_`,
        { parse_mode: "Markdown" }
      );
    }

    // Langkah 1: Input Username
    if (regState.step === "username") {
      const cleanUsername = text.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        return botInstance.sendMessage(chatId, `⚠️ Username minimal 3 karakter. Silakan ketik kembali:`);
      }
      if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
        return botInstance.sendMessage(chatId, `⚠️ Username hanya boleh memuat huruf kecil, angka, titik, underscore, atau tanda hubung (-). Silakan ketik kembali:`);
      }
      const existing = findUserByUsername(cleanUsername);
      if (existing) {
        return botInstance.sendMessage(chatId, `⚠️ Username *${cleanUsername}* sudah terdaftar. Silakan pilih username lain:`, { parse_mode: "Markdown" });
      }
      regState.data.username = cleanUsername;
      regState.step = "password";
      return botInstance.sendMessage(
        chatId,
        `🔑 *Langkah 2 dari 4: Tentukan Password*\n\n` +
        `Username terpilih: \`${cleanUsername}\`\n` +
        `Silakan ketik password akun Anda (minimal 4 karakter):`,
        { parse_mode: "Markdown" }
      );
    }

    // Langkah 2: Input Password
    if (regState.step === "password") {
      const cleanPass = text.trim();
      if (cleanPass.length < 4) {
        return botInstance.sendMessage(chatId, `⚠️ Password minimal 4 karakter. Silakan ketik kembali:`);
      }
      regState.data.password = cleanPass;
      regState.step = "nama";
      return botInstance.sendMessage(
        chatId,
        `👤 *Langkah 3 dari 4: Nama Lengkap*\n\n` +
        `Silakan ketik *Nama Lengkap & Gelar* Anda:\n` +
        `_Contoh:_ \`Dr. Ir. Budi Santoso, M.Kom\``,
        { parse_mode: "Markdown" }
      );
    }

    // Langkah 3: Input Nama
    if (regState.step === "nama") {
      const cleanNama = text.trim();
      if (cleanNama.length < 2) {
        return botInstance.sendMessage(chatId, `⚠️ Nama lengkap minimal 2 karakter. Silakan ketik kembali:`);
      }
      regState.data.nama = cleanNama;
      regState.step = "nip";
      return botInstance.sendMessage(
        chatId,
        `🆔 *Langkah 4 dari 4 (Terakhir): NIP Pegawai*\n\n` +
        `Silakan ketik *Nomor Induk Pegawai (NIP)* Anda:\n` +
        `_Contoh:_ \`198507122010011008\`\n` +
        `_(Atau ketik '-' jika non-PNS/PPPK)_`,
        { parse_mode: "Markdown" }
      );
    }

    // Langkah 4: Input NIP dan Simpan
    if (regState.step === "nip") {
      const cleanNip = text.trim();
      regState.data.nip = cleanNip;

      try {
        const result = registerNewUser({
          ...regState.data,
          registrationCode: regState.code
        });

        registrationStates.delete(chatId);

        // Otomatis aktifkan sesi login di Telegram
        setTelegramSession(chatId, result.user.id);

        const aiStatusText = result.user.allowEnvKey !== false
          ? `✅ Aktif (Server .env)`
          : `🔒 Dibatasi (Wajib masukkan API Key Gemini pribadi di Web)`;

        const welcome = `🎉 *PENDAFTARAN AKUN BERHASIL!* 🇮🇩\n\n` +
          `Selamat datang di sistem E-Kinerja AI, *${result.user.nama}*!\n` +
          `• *Username*: \`${result.user.username}\`\n` +
          `• *NIP*: \`${result.user.nip || "-"}\`\n` +
          `• *Role*: ${result.user.role || "pegawai"}\n` +
          `• *Akses AI*: ${aiStatusText}\n\n` +
          `Sesi akun Anda telah *otomatis aktif* di Telegram ini! 🚀\n\n` +
          `⚠️ *Langkah Lanjutan:*\n` +
          `Lengkapi Pangkat, Jabatan, dan Unit Kerja Anda agar dapat membuat laporan resmi BKN:\n` +
          `👉 Ketik \`/setprofil\` untuk melengkapi profil kedinasan.\n\n` +
          `Atau langsung ketik aktivitas harian Anda untuk dicatat oleh AI.`;

        return botInstance.sendMessage(chatId, welcome, { parse_mode: "Markdown" });
      } catch (err) {
        return botInstance.sendMessage(
          chatId,
          `❌ *Pendaftaran Gagal:* ${err.message}\n\nSilakan coba lagi atau ketik \`/batal\` untuk membatalkan.`
        );
      }
    }
  }

  // A. Jika Pengguna Sedang dalam Alur Login Interaktif
  if (loginStates.has(chatId)) {
    const loginState = loginStates.get(chatId);

    if (loginState.step === "username") {
      const cleanUser = text.trim();
      loginState.username = cleanUser;
      loginState.step = "password";
      return botInstance.sendMessage(
        chatId,
        `🔑 *Password Akun*\n\n` +
        `Username: \`${cleanUser}\`\n` +
        `Silakan ketik password akun Anda:\n\n` +
        `_(Ketik /batal kapan saja untuk membatalkan)_`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "auth:cancel_login" }]]
          }
        }
      );
    }

    if (loginState.step === "password") {
      const cleanPass = text.trim();
      const auth = authenticateUser(loginState.username, cleanPass);
      loginStates.delete(chatId);

      if (!auth.success) {
        return botInstance.sendMessage(
          chatId,
          `❌ *Login Gagal!*\n${auth.message}\n\nSilakan coba lagi dengan menekan tombol Login di bawah:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "🔐 Coba Login Lagi", callback_data: "auth:login" }]]
            }
          }
        );
      }

      setTelegramSession(chatId, auth.user.id);
      return sendMainMenu(botInstance, chatId, auth.user);
    }
  }

  const session = getTelegramSession(chatId);
  if (!session) {
    const text = `⚠️ *Anda belum login ke sistem E-Kinerja.*\n\n` +
      `Silakan tekan tombol di bawah untuk masuk ke akun Anda atau mendaftar:`;
    const inline_keyboard = [
      [
        { text: "🔐 Masuk / Login", callback_data: "auth:login" },
        { text: "📝 Daftar Akun Baru", callback_data: "auth:register" }
      ]
    ];
    return botInstance.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard }
    });
  }

  // B.1 Jika Pengguna Sedang dalam Alur Pengaturan Link Google Drive Bukti Dukung
  if (linkSetupStates.has(chatId)) {
    const cleanText = text.trim();
    linkSetupStates.delete(chatId);

    if (cleanText.toLowerCase() === "batal" || cleanText.toLowerCase() === "/batal") {
      return botInstance.sendMessage(
        chatId,
        `ℹ️ Pengaturan link Google Drive dibatalkan.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }],
              [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
            ]
          }
        }
      );
    }

    if (["hapus", "kosong", "-", "clear", "reset"].includes(cleanText.toLowerCase())) {
      try {
        updateUserProfile(session.userId, { gdriveLink: "" });
      } catch (e) {}

      await botInstance.sendMessage(
        chatId,
        `🗑 *Link Google Drive Dikosongkan!* ✅\n\n` +
        `Catatan kaki (footer) link Google Drive pada laporan PDF kini disembunyikan.`,
        { parse_mode: "Markdown" }
      );
      return sendReportMonthPicker(botInstance, chatId);
    }

    const urlMatch = cleanText.match(/(https?:\/\/[^\s]+)/i);
    const validUrl = urlMatch ? urlMatch[1] : (cleanText.startsWith("http") ? cleanText : "");

    if (!validUrl) {
      linkSetupStates.set(chatId, { returnTo: "report" });
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Format Tautan Tidak Valid!*\n\n` +
        `Pastikan tautan diawali dengan \`https://\` atau \`http://\`.\n\n` +
        `*Contoh:* \`https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz\`\n\n` +
        `_Ketik \`batal\` untuk membatalkan atau \`hapus\` untuk mengosongkan._`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "link:cancel" }]]
          }
        }
      );
    }

    try {
      updateUserProfile(session.userId, { gdriveLink: validUrl });
    } catch (e) {
      console.warn("Gagal update link profil:", e);
    }

    // Sambungkan juga ke jurnal terbaru jika ada
    const userJournals = getJournals(session.userId);
    if (userJournals.length > 0) {
      userJournals[0].linkUrl = validUrl;
      const store = getStore();
      saveStore(store);
    }

    await botInstance.sendMessage(
      chatId,
      `✅ *Tautan Google Drive Berhasil Disimpan!*\n\n` +
      `🔗 \`${validUrl}\`\n\n` +
      `Tautan ini otomatis dicantumkan di bagian **Catatan Kaki (Footer)** dokumen cetak Laporan Kinerja PDF bulanan Anda sebagai bukti dukung digital.`,
      { parse_mode: "Markdown" }
    );

    return sendReportMonthPicker(botInstance, chatId);
  }

  // B. Jika Pengguna Sedang dalam Alur Pengisian Profil Bertahap
  if (profileSetupStates.has(chatId)) {
    const state = profileSetupStates.get(chatId);

    if (state.step === "nip") {
      if (text.length < 5 && text !== "-") {
        return botInstance.sendMessage(
          chatId,
          `⚠️ Nomor NIP minimal 5 karakter/digit (atau klik tombol *Lewati / Non-PNS* jika belum memiliki NIP):`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "⏩ Lewati / Non-PNS (-)", callback_data: "prof:set_nip_skip" }],
                [{ text: "❌ Batal", callback_data: "prof:cancel" }]
              ]
            }
          }
        );
      }
      state.data = state.data || {};
      state.data.nip = text;
      return sendStepPangkatCategories(botInstance, chatId);
    }

    if (state.step === "pangkat" || state.step === "pangkat_manual") {
      if (!text || text === "-") {
        return botInstance.sendMessage(chatId, `⚠️ Pangkat/Golongan tidak boleh kosong. Silakan ketik Pangkat/Golongan Anda:`);
      }
      state.data = state.data || {};
      state.data.pangkat = text;
      return sendStepJabatan(botInstance, chatId);
    }

    if (state.step === "jabatan" || state.step === "jabatan_manual") {
      if (!text || text === "-") {
        return botInstance.sendMessage(chatId, `⚠️ Jabatan tidak boleh kosong. Silakan ketik Jabatan Anda:`);
      }
      state.data = state.data || {};
      state.data.jabatan = text;
      return sendStepUnitKerja(botInstance, chatId);
    }

    if (state.step === "unitKerja" || state.step === "unit_manual") {
      if (!text || text === "-") {
        return botInstance.sendMessage(chatId, `⚠️ Unit Kerja tidak boleh kosong. Silakan ketik Unit Kerja Anda:`);
      }
      state.data = state.data || {};
      state.data.unitKerja = text;
      return sendProfileConfirmation(botInstance, chatId);
    }
  }

  // C. Validasi Wajib Lengkapi Data Diri Sebelum Mencatat Jurnal
  const user = session.user;
  if (isProfileIncomplete(user)) {
    return botInstance.sendMessage(
      chatId,
      getProfileIncompleteWarningText(user),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "⚙️ Lengkapi Data Diri Sekarang", callback_data: "menu:setprofil" }]]
        }
      }
    );
  }

  // Tampilkan status mengetik
  botInstance.sendChatAction(chatId, "typing");

  try {
    // C. Cek apakah ada antrean berkas/foto yang menunggu uraian aktivitas
    let attachedEvidences = [];
    if (pendingUploads.has(chatId)) {
      const queued = pendingUploads.get(chatId);
      attachedEvidences = Array.isArray(queued) ? queued : (queued ? [queued] : []);
      pendingUploads.delete(chatId);
    }

    // D. Deteksi apakah pesan teks mengandung URL / Tautan Google Drive
    const { url: detectedUrl, cleanText: textAfterUrl } = extractUrl(text);

    // E. Deteksi Jam/Waktu dan Tanggal Kerja dari Pesan
    const defaultUserJam = user.defaultJam || "08:00 - 16:00";
    const { jam: finalJam, isCustomJam, tanggal: customDate, cleanText } = extractTimeAndDate(textAfterUrl, defaultUserJam);

    const polished = await polishJournalNode({
      rawText: cleanText,
      jabatan: user.jabatan,
      unitKerja: user.unitKerja,
      apiKey: user.personalApiKey || ""
    });

    const now = new Date();
    const dateStr = customDate || now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;

    const firstAtt = attachedEvidences[0] || null;
    const journalPayload = {
      userId: user.id,
      tanggal: dateStr,
      jam: finalJam,
      aktivitas: polished.aktivitas,
      aktivitasKasaran: cleanText,
      outputJumlah: polished.outputJumlah,
      catatan: polished.catatan,
      linkUrl: detectedUrl || (firstAtt ? firstAtt.fileUrl : ""),
      attachments: attachedEvidences,
      source: "telegram",
      aiEngine: polished.source
    };

    if (firstAtt) {
      journalPayload.fileUrl = firstAtt.fileUrl || "";
      if (firstAtt.type === "image") {
        journalPayload.evidenceType = "image";
        journalPayload.fotoPath = firstAtt.filePath;
        journalPayload.fileName = firstAtt.fileName;
      } else {
        journalPayload.evidenceType = "document";
        journalPayload.filePath = firstAtt.filePath;
        journalPayload.fileName = firstAtt.fileName;
        journalPayload.fileSize = firstAtt.fileSize;
      }
    }

    // Simpan ke database bersama
    const newEntry = addJournal(journalPayload);

    let reply = `✨ *Jurnal Berhasil Dipoles AI & Disimpan ke Logbook!* ✨\n\n` +
      `📅 *Tanggal*: \`${dateStr}\`\n` +
      `⏰ *Waktu/Jam*: \`${finalJam}\`${isCustomJam ? " *(Sesuai input)*" : " *(Default)*"}\n` +
      `👤 *Pegawai*: *${user.nama}*\n\n` +
      `📝 *Uraian Tugas Formal (Hasil AI)*:\n` +
      `_${polished.aktivitas}_\n\n` +
      `📊 *Output / Hasil*: ${polished.outputJumlah}\n` +
      `💡 *Catatan*: ${polished.catatan}\n\n`;

    if (attachedEvidences.length === 1) {
      const att = attachedEvidences[0];
      reply += `📎 *Lampiran Eviden*: \`${att.fileName}\` (${att.fileSize || (att.type === "image" ? "Foto Dokumentasi" : "Dokumen")})\n`;
      if (att.fileUrl) {
        reply += `📎 *Tautan Berkas*: ${att.fileUrl}\n`;
      }
    } else if (attachedEvidences.length > 1) {
      reply += `📎 *Lampiran Eviden*: *${attachedEvidences.length} Berkas Terunggah* (Otomatis tersusun ke arsip ZIP)\n`;
      attachedEvidences.slice(0, 3).forEach((att, i) => {
        reply += `   ${i + 1}. \`${att.fileName}\` (${att.type === "image" ? "Foto" : "Dokumen"})\n`;
      });
      if (attachedEvidences.length > 3) {
        reply += `   ... dan ${attachedEvidences.length - 3} berkas lainnya\n`;
      }
    }

    if (detectedUrl) {
      reply += `🔗 *Tautan Drive*: ${detectedUrl}\n`;
    } else if (newEntry.linkUrl && !firstAtt) {
      reply += `🔗 *Tautan Eviden*: [Klik Google Drive](${newEntry.linkUrl})\n`;
    }

    reply += `\n🔍 _Input Kasaran: "${cleanText}"_\n` +
      `🤖 _AI Engine: ${polished.source === "gemini-ai" ? "Google Gemini 2.5 Flash" : "Engine Cerdas Offline BKN"}_\n\n` +
      `Silakan pilih menu di bawah atau ketik aktivitas lainnya:`;

    const journalDoneKeyboard = [
      [
        { text: "📝 Catat Lagi", callback_data: "menu:catat" },
        { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }
      ],
      [
        { text: "🏛 Menu Utama", callback_data: "menu:main" }
      ]
    ];

    return botInstance.sendMessage(chatId, reply, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: journalDoneKeyboard }
    });
  } catch (err) {
    console.error("Gagal memproses jurnal AI:", err);
    return botInstance.sendMessage(
      chatId,
      `❌ Terjadi kendala saat memproses jurnal: ${err.message}`,
      { parse_mode: "Markdown" }
    );
  }
}

/**
 * Handler Perintah /link [url] dan /gdrive [url] (Menyimpan tautan Google Drive bukti dukung ke profil & footer PDF)
 */
export function handleLinkCommand(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);

  if (!session) {
    return botInstance.sendMessage(chatId, `⚠️ Anda belum login. Ketik \`/login <username> <password>\``, { parse_mode: "Markdown" });
  }

  const rawArg = match && match[1] ? match[1].trim() : "";
  const lowerArg = rawArg.toLowerCase();

  // Kasus 1: Menghapus / mengosongkan link Google Drive
  if (lowerArg === "hapus" || lowerArg === "kosong" || lowerArg === "-" || lowerArg === "clear" || lowerArg === "reset") {
    try {
      updateUserProfile(session.userId, { gdriveLink: "" });
    } catch (e) {}

    return botInstance.sendMessage(
      chatId,
      `🗑 *Link Google Drive Dikosongkan!* ✅\n\n` +
      `Catatan kaki (footer) link Google Drive pada dokumen cetak Laporan Kinerja PDF Anda kini *disembunyikan*.\n\n` +
      `Untuk memasang tautan kembali, ketik:\n\`/link <url_folder_google_drive>\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" }],
            [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
          ]
        }
      }
    );
  }

  // Kasus 2: User memasukkan URL (baik diawali http atau link drive)
  if (rawArg) {
    const urlMatch = rawArg.match(/(https?:\/\/[^\s]+)/i);
    const validUrl = urlMatch ? urlMatch[1] : (rawArg.startsWith("http") ? rawArg : "");

    if (!validUrl) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Format Tautan Tidak Valid!*\n\n` +
        `Pastikan tautan diawali dengan \`https://\` atau \`http://\`.\n\n` +
        `*Contoh:* \`/link https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz\`\n\n` +
        `_Ketik \`/link hapus\` jika ingin mengosongkan link di footer PDF._`,
        { parse_mode: "Markdown" }
      );
    }

    try {
      updateUserProfile(session.userId, { gdriveLink: validUrl });
    } catch (e) {
      console.warn("Gagal update link profil:", e);
    }

    // Juga sematkan ke jurnal terbaru jika ada
    const userJournals = getJournals(session.userId);
    if (userJournals.length > 0) {
      userJournals[0].linkUrl = validUrl;
      const store = getStore();
      saveStore(store);
    }

    return botInstance.sendMessage(
      chatId,
      `🔗 *Tautan Google Drive Berhasil Disimpan!* ✅\n\n` +
      `• *URL Terdaftar*: \`${validUrl}\`\n\n` +
      `📌 *Dampak Pengaturan:*\n` +
      `1. Tautan ini otomatis tercantum aktif pada *Catatan Kaki (Footer)* dokumen resmi Laporan Kinerja PDF bulanan Anda sebagai bukti dukung digital BKN.\n` +
      `2. Tautan juga dilampirkan pada indeks pendukung berkas bukti dukung digital.\n\n` +
      `_Silakan unduh dokumen laporan PDF Anda melalui tombol di bawah:_`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📄 Unduh Laporan PDF Sekarang", callback_data: "menu:laporan" }],
            [{ text: "🏛 Menu Utama", callback_data: "menu:main" }]
          ]
        }
      }
    );
  }

  // Kasus 3: User mengetik /link atau /gdrive tanpa argumen -> Tampilkan Menu Status & Opsi
  const currentLink = session.user.gdriveLink || "";
  const text = `🔗 *PENGATURAN LINK GOOGLE DRIVE BUKTI DUKUNG*\n\n` +
    `Tautan folder Google Drive ini berfungsi sebagai bukti eviden digital yang dicantumkan pada *Catatan Kaki (Footer)* Laporan Kinerja Bulanan PDF resmi BKN.\n\n` +
    `• *Status Saat Ini*: ${currentLink ? `\`${currentLink}\`\n_(Aktif tercantum di footer PDF)_` : `_Belum diatur (footer PDF disembunyikan)_`}\n\n` +
    `📌 *Cara Penggunaan:*\n` +
    `• Ketik perintah langsung: \`/link <url_folder_drive>\`\n` +
    `• Atau klik tombol *Atur / Ubah Link* di bawah ini.\n` +
    `• Ketik \`/link hapus\` untuk mengosongkan link.`;

  const inline_keyboard = [
    [
      { text: currentLink ? "🔗 Ubah Link Google Drive" : "🔗 Masukkan Link Google Drive", callback_data: "link:prompt" },
      ...(currentLink ? [{ text: "🗑 Hapus Link", callback_data: "link:clear" }] : [])
    ],
    [
      { text: "📄 Unduh Laporan PDF", callback_data: "menu:laporan" },
      { text: "🏛 Menu Utama", callback_data: "menu:main" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

/**
 * Handler Perintah /jam [rentang_jam]
 */
export function handleJamCommand(botInstance, msg, match) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);
  if (!session) {
    return botInstance.sendMessage(chatId, "⚠️ Anda belum login. Silakan login terlebih dahulu dengan /start.");
  }

  const rawArg = match && match[1] ? match[1].trim() : "";
  if (rawArg) {
    const parsed = extractTimeAndDate(rawArg);
    if (parsed.isCustomJam) {
      try {
        updateUserProfile(session.userId, { defaultJam: parsed.jam });
        session.user.defaultJam = parsed.jam;
      } catch (e) {}

      return botInstance.sendMessage(
        chatId,
        `✅ *Jam Kerja Default Berhasil Diatur!*\n\n` +
        `⏰ Jam kerja default Anda sekarang: \`${parsed.jam}\`\n\n` +
        `Setiap jurnal yang Anda kirim tanpa menyebutkan jam akan otomatis menggunakan jam ini.\n\n` +
        `_💡 Tips: Anda tetap bisa menentukan jam berbeda per kegiatan cukup dengan mengetiknya di pesan (contoh: "rapat dinas jam 08:00 - 11:30")._`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🏛 Menu Utama", callback_data: "menu:main" }]]
          }
        }
      );
    }
  }

  return sendJamPicker(botInstance, chatId, session.user);
}

/**
 * Tampilkan Menu Pilihan Jam Kerja Default
 */
export function sendJamPicker(botInstance, chatId, user) {
  const currentJam = user.defaultJam || "08:00 - 16:00";
  const text = `⏰ *PENGATURAN JAM KERJA JURNAL*\n\n` +
    `• Jam Default Saat Ini: \`${currentJam}\`\n\n` +
    `📌 *Cara Kerja Jam di Telegram:*\n` +
    `1. *Otomatis (Default)*: Jika Anda kirim kegiatan tanpa menulis jam, jam otomatis diisi: \`${currentJam}\`.\n` +
    `2. *Manual per Pesan*: Anda bebas menentukan jam berbeda pada pesan apa pun, contoh:\n` +
    `   • \`rapat koordinasi jam 08:00 - 11:30\`\n` +
    `   • \`pukul 07.30 - 15.00 workshop kurikulum\`\n` +
    `   • \`jam 8-14 pengawasan asesmen\`\n\n` +
    `Silakan pilih preset jam kerja default kantor Anda di bawah, atau ketik misal: \`/jam 07:30 - 16:00\`:`;

  const inline_keyboard = [
    [
      { text: "⏰ 08:00 - 16:00 (Standar ASN)", callback_data: "jam:set_0800_1600" },
      { text: "⏰ 07:30 - 16:00 (5 Hari)", callback_data: "jam:set_0730_1600" }
    ],
    [
      { text: "⏰ 07:30 - 14:00 (Guru / 6 Hari)", callback_data: "jam:set_0730_1400" },
      { text: "⏰ 08:00 - 15:30", callback_data: "jam:set_0800_1530" }
    ],
    [
      { text: "✏️ Ketik Jam Manual (/jam ...)", callback_data: "jam:manual" }
    ],
    [
      { text: "🏛 Menu Utama", callback_data: "menu:main" }
    ]
  ];

  return botInstance.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard }
  });
}

// Pasang Event Listeners pada Bot jika Instance Aktif
if (bot) {
  bot.onText(/^\/start(?:\s+(.*))?$/, (msg) => handleStart(bot, msg));
  bot.onText(/^\/help(?:\s+(.*))?$/, (msg) => handleStart(bot, msg));
  bot.onText(/^\/menu$/, (msg) => {
    const session = getTelegramSession(msg.chat.id);
    if (!session) return handleStart(bot, msg);
    return sendMainMenu(bot, msg.chat.id, session.user);
  });
  bot.onText(/^\/login(?:\s+(.*))?$/, (msg, match) => handleLogin(bot, msg, match));
  bot.onText(/^\/(?:register|daftar)(?:\s+(.*))?$/, (msg, match) => handleRegisterCommand(bot, msg, match));
  bot.onText(/^\/logout$/, (msg) => handleLogout(bot, msg));
  bot.onText(/^\/profil$/, (msg) => handleProfile(bot, msg));
  bot.onText(/^\/status$/, (msg) => handleProfile(bot, msg));
  bot.onText(/^\/jurnal$/, (msg) => handleJournals(bot, msg));
  bot.onText(/^\/laporan(?:\s+(.*))?$/, (msg, match) => handleReport(bot, msg, match));
  bot.onText(/^\/(?:setprofil|lengkapi)(?:\s+(.*))?$/, (msg, match) => handleSetProfile(bot, msg, match));
  bot.onText(/^\/batal$/, (msg) => handleCancel(bot, msg));
  bot.onText(/^\/(?:link|gdrive)(?:\s+(.*))?$/, (msg, match) => handleLinkCommand(bot, msg, match));
  bot.onText(/^\/(?:jam|waktu)(?:\s+(.*))?$/, (msg, match) => handleJamCommand(bot, msg, match));

  // Handler callback_query untuk tombol interaktif (inline_keyboard)
  bot.on("callback_query", (query) => handleCallbackQuery(bot, query));

  // Handler teks percakapan biasa
  bot.on("message", (msg) => {
    if (msg.text && !msg.text.startsWith("/")) {
      handleIncomingText(bot, msg);
    }
  });

// Buffer untuk Media Group / Album Telegram (mediaGroupId -> { chatId, session, items: [], caption, timer })
const mediaGroupBuffers = new Map();

async function processMediaGroup(botInstance, mgId) {
  const group = mediaGroupBuffers.get(mgId);
  if (!group) return;
  mediaGroupBuffers.delete(mgId);

  const { chatId, session, items, caption } = group;
  if (!items || items.length === 0) return;

  // Kasus A: Album dikirim DENGAN caption uraian tugas
  if (caption) {
    const { url: detectedUrl, cleanText: textAfterUrl } = extractUrl(caption);
    const defaultUserJam = session.user.defaultJam || "08:00 - 16:00";
    const { jam: finalJam, isCustomJam, tanggal: customDate, cleanText } = extractTimeAndDate(textAfterUrl, defaultUserJam);

    const polished = await polishJournalNode({
      rawText: cleanText,
      jabatan: session.user.jabatan,
      unitKerja: session.user.unitKerja,
      apiKey: session.user.personalApiKey || ""
    });

    const now = customDate || new Date().toISOString().slice(0, 10);
    const primary = items[0];
    const newEntry = addJournal({
      userId: session.user.id,
      tanggal: now,
      jam: finalJam,
      aktivitas: polished.aktivitas,
      aktivitasKasaran: cleanText,
      outputJumlah: polished.outputJumlah,
      catatan: `Disertai ${items.length} berkas bukti dokumen/foto dokumentasi.`,
      attachments: items,
      linkUrl: detectedUrl || primary.fileUrl || "",
      source: "telegram-album",
      aiEngine: polished.source
    });

    let reply = `📸 *Album (${items.length} Berkas) & Jurnal Berhasil Disimpan!* ✨\n\n` +
      `📅 *Tanggal*: \`${now}\`\n` +
      `⏰ *Waktu/Jam*: \`${finalJam}\`${isCustomJam ? " *(Sesuai input)*" : " *(Default)*"}\n\n` +
      `📝 *Uraian Tugas Formal*:\n_${polished.aktivitas}_\n\n` +
      `📊 *Output*: ${polished.outputJumlah}\n` +
      `🖼 *Bukti Lampiran*: *${items.length} Berkas* terunggah ke logbook.\n\n` +
      `Ketik \`/laporan\` kapan pun untuk mengunduh laporan PDF & paket berkas ZIP lengkap.`;

    return botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  // Kasus B: Album dikirim TANPA caption
  const userJournals = getJournals(session.userId);
  const recent = userJournals.length > 0 ? userJournals[0] : null;
  const isWithin30Min = recent && recent.createdAt && (Date.now() - new Date(recent.createdAt).getTime() < 30 * 60 * 1000);

  if (recent && isWithin30Min) {
    items.forEach(item => addAttachmentToJournal(recent.id, item));
    const totalCount = (recent.attachments || []).length;
    let reply = `📸 *${items.length} Berkas Berhasil Ditambahkan ke Jurnal!* ✅\n\n` +
      `Seluruh berkas dilampirkan pada aktivitas:\n_${recent.aktivitas}_\n\n` +
      `📌 *Total Lampiran Aktivitas Ini*: *${totalCount} Berkas*\n` +
      `Semua berkas otomatis tersusun ke dalam paket ZIP laporan bulanan.`;
    return botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  // Simpan ke antrean pendingUploads
  const queue = pendingUploads.get(chatId) || [];
  queue.push(...items);
  pendingUploads.set(chatId, queue);

  return botInstance.sendMessage(
    chatId,
    `📸 *${items.length} Berkas Bukti Diterima (Total ${queue.length} berkas dalam antrean)!*\n\n` +
    `Silakan ketik uraian kegiatan/pekerjaan Anda terkait berkas-berkas ini:`,
    { parse_mode: "Markdown" }
  );
}

async function handleIncomingAttachment(botInstance, msg, item) {
  const chatId = msg.chat.id;
  const session = getTelegramSession(chatId);
  if (!session) return;

  // 1. Jika pesan merupakan bagian dari media group (album foto/file)
  if (msg.media_group_id) {
    const mgId = msg.media_group_id;
    let group = mediaGroupBuffers.get(mgId);
    if (!group) {
      group = {
        chatId,
        session,
        items: [],
        caption: msg.caption ? msg.caption.trim() : "",
        timer: null
      };
      mediaGroupBuffers.set(mgId, group);
    }
    if (msg.caption && !group.caption) {
      group.caption = msg.caption.trim();
    }
    group.items.push(item);

    if (group.timer) clearTimeout(group.timer);
    group.timer = setTimeout(() => {
      processMediaGroup(botInstance, mgId);
    }, 800);
    return;
  }

  // 2. Berkas tunggal DENGAN caption uraian tugas
  const rawCaption = msg.caption ? msg.caption.trim() : "";
  if (rawCaption) {
    const { url: detectedUrl, cleanText: textAfterUrl } = extractUrl(rawCaption);
    const defaultUserJam = session.user.defaultJam || "08:00 - 16:00";
    const { jam: finalJam, isCustomJam, tanggal: customDate, cleanText } = extractTimeAndDate(textAfterUrl, defaultUserJam);

    const polished = await polishJournalNode({
      rawText: cleanText,
      jabatan: session.user.jabatan,
      unitKerja: session.user.unitKerja,
      apiKey: session.user.personalApiKey || ""
    });

    const now = customDate || new Date().toISOString().slice(0, 10);
    const newEntry = addJournal({
      userId: session.user.id,
      tanggal: now,
      jam: finalJam,
      aktivitas: polished.aktivitas,
      aktivitasKasaran: cleanText,
      outputJumlah: polished.outputJumlah,
      catatan: item.type === "image" ? "Disertai foto dokumentasi fisik lapangan." : `Disertai dokumen eviden ${item.fileName}.`,
      attachments: [item],
      linkUrl: detectedUrl || item.fileUrl || "",
      source: item.type === "image" ? "telegram-photo" : "telegram-document",
      aiEngine: polished.source
    });

    let reply = `✨ *Jurnal & Berkas Berhasil Disimpan ke Logbook!* ✨\n\n` +
      `📅 *Tanggal*: \`${now}\`\n` +
      `⏰ *Waktu/Jam*: \`${finalJam}\`${isCustomJam ? " *(Sesuai input)*" : " *(Default)*"}\n\n` +
      `📝 *Uraian Tugas Formal*:\n_${polished.aktivitas}_\n\n` +
      `📊 *Output*: ${polished.outputJumlah}\n` +
      `📎 *Lampiran Eviden*: \`${item.fileName}\` (${item.fileSize || (item.type === "image" ? "Foto Dokumentasi" : "Dokumen")})\n`;

    if (item.fileUrl) {
      reply += `📎 *Tautan Berkas Aplikasi*: ${item.fileUrl}\n`;
    }
    if (detectedUrl) {
      reply += `🔗 *Tautan Drive*: ${detectedUrl}\n`;
    }

    reply += `\nKetik \`/laporan\` kapan pun untuk mengunduh laporan PDF bulanan Anda.`;
    return botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  // 3. Berkas tunggal TANPA caption
  const userJournals = getJournals(session.userId);
  const recent = userJournals.length > 0 ? userJournals[0] : null;
  const isWithin30Min = recent && recent.createdAt && (Date.now() - new Date(recent.createdAt).getTime() < 30 * 60 * 1000);

  if (recent && isWithin30Min) {
    addAttachmentToJournal(recent.id, item);
    const totalCount = (recent.attachments || []).length;
    let reply = `📎 *Berkas Berhasil Ditambahkan ke Jurnal!* ✅\n\n` +
      `Berkas \`${item.fileName}\` dilampirkan pada aktivitas:\n_${recent.aktivitas}_\n\n` +
      `📌 *Total Lampiran Aktivitas Ini*: *${totalCount} Berkas*\n` +
      `Seluruh berkas otomatis disusun dan dinomori runtut pada paket ZIP laporan Anda.`;

    if (item.fileUrl) {
      reply += `\n📎 *Tautan Berkas*: ${item.fileUrl}`;
    }

    return botInstance.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  // 4. Simpan ke antrean pendingUploads
  const queue = pendingUploads.get(chatId) || [];
  queue.push(item);
  pendingUploads.set(chatId, queue);

  let promptMsg = `📎 *Berkas Bukti Diterima (\`${item.fileName}\`)!*\n` +
    `Saat ini tersimpan *${queue.length} berkas* dalam antrean.\n\n` +
    `Silakan ketik uraian tugas/pekerjaan Anda terkait berkas ini:\n` +
    `_Contoh: "rapat koordinasi evaluasi program dinas dan dokumentasi penyerahan berkas"_\n\n` +
    `_(Kirim berkas tambahan lainnya jika ada, atau ketik /batal untuk membatalkan)_`;

  return botInstance.sendMessage(chatId, promptMsg, { parse_mode: "Markdown" });
}

  // Handler Foto Dokumentasi Kegiatan
  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const session = getTelegramSession(chatId);
    if (!session) {
      return bot.sendMessage(chatId, "⚠️ Silakan /login terlebih dahulu sebelum mengirim foto dokumentasi.");
    }

    if (isProfileIncomplete(session.user)) {
      return bot.sendMessage(chatId, getProfileIncompleteWarningText(session.user), { parse_mode: "Markdown" });
    }

    try {
      const photos = msg.photo || [];
      const bestPhoto = photos[photos.length - 1];
      let savedFilePath = "";

      const now = new Date();
      const INDO_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const monthTag = `${INDO_MONTHS[now.getMonth()]}_${now.getFullYear()}`;

      try {
        let downloadedPath = "";
        try {
          downloadedPath = await bot.downloadFile(bestPhoto.file_id, UPLOADS_DIR);
        } catch (e1) {
          try {
            const fileLink = await bot.getFileLink(bestPhoto.file_id);
            const resp = await fetch(fileLink);
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer());
              const tempName = `temp_${Date.now()}_${bestPhoto.file_id.slice(-6)}.jpg`;
              downloadedPath = path.join(UPLOADS_DIR, tempName);
              fs.writeFileSync(downloadedPath, buf);
            }
          } catch (e2) {
            console.warn("Gagal download via direct file link:", e2.message);
          }
        }

        if (downloadedPath && fs.existsSync(downloadedPath)) {
          const newPhotoName = `Foto_${monthTag}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}.jpg`;
          const newPath = path.join(UPLOADS_DIR, newPhotoName);
          fs.renameSync(downloadedPath, newPath);
          savedFilePath = newPath;
        }
      } catch (dlErr) {
        console.warn("Gagal mengunduh berkas foto fisik:", dlErr.message);
      }

      const baseAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      const photoFileName = savedFilePath ? path.basename(savedFilePath) : `Foto_${monthTag}_${Date.now()}.jpg`;
      const photoFileUrl = savedFilePath ? (baseAppUrl ? `${baseAppUrl}/uploads/${photoFileName}` : `/uploads/${photoFileName}`) : "";
      const ext = path.extname(photoFileName).toLowerCase() || ".jpg";

      const item = {
        type: "image",
        filePath: savedFilePath,
        fileName: photoFileName,
        fileUrl: photoFileUrl,
        fileSize: bestPhoto.file_size ? `${(bestPhoto.file_size / 1024).toFixed(0)} KB` : "",
        ext
      };

      await handleIncomingAttachment(bot, msg, item);
    } catch (err) {
      console.error("Gagal memproses foto:", err);
      bot.sendMessage(chatId, `❌ Terjadi kendala saat memproses foto: ${err.message}`);
    }
  });

  // Handler Berkas Dokumen (PDF, Word, Excel, ZIP, dll.)
  bot.on("document", async (msg) => {
    const chatId = msg.chat.id;
    const session = getTelegramSession(chatId);
    if (!session) {
      return bot.sendMessage(chatId, "⚠️ Silakan /login terlebih dahulu sebelum mengirim berkas dokumen.");
    }

    if (isProfileIncomplete(session.user)) {
      return bot.sendMessage(chatId, getProfileIncompleteWarningText(session.user), { parse_mode: "Markdown" });
    }

    try {
      const doc = msg.document;
      const now = new Date();
      const INDO_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const monthTag = `${INDO_MONTHS[now.getMonth()]}_${now.getFullYear()}`;

      const rawFileName = doc.file_name || "dokumen_kinerja.pdf";
      const cleanFileName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "dokumen_kinerja.pdf";
      const docFileName = cleanFileName.toLowerCase().includes(INDO_MONTHS[now.getMonth()].toLowerCase())
        ? cleanFileName
        : `${monthTag}_${cleanFileName}`;

      const fileSize = doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "";
      let savedFilePath = "";

      try {
        let downloadedPath = "";
        try {
          downloadedPath = await bot.downloadFile(doc.file_id, UPLOADS_DIR);
        } catch (e1) {
          try {
            const fileLink = await bot.getFileLink(doc.file_id);
            const resp = await fetch(fileLink);
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer());
              const tempName = `temp_${Date.now()}_${doc.file_id.slice(-6)}_${cleanFileName}`;
              downloadedPath = path.join(UPLOADS_DIR, tempName);
              fs.writeFileSync(downloadedPath, buf);
            }
          } catch (e2) {
            console.warn("Gagal download dokumen via direct file link:", e2.message);
          }
        }

        if (downloadedPath && fs.existsSync(downloadedPath)) {
          const newStoredName = `${Date.now()}_${docFileName}`;
          const newPath = path.join(UPLOADS_DIR, newStoredName);
          fs.renameSync(downloadedPath, newPath);
          savedFilePath = newPath;
        }
      } catch (dlErr) {
        console.warn("Gagal mengunduh berkas dokumen:", dlErr.message);
      }

      const baseAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      const storedFileName = savedFilePath ? path.basename(savedFilePath) : docFileName;
      const docFileUrl = savedFilePath ? (baseAppUrl ? `${baseAppUrl}/uploads/${storedFileName}` : `/uploads/${storedFileName}`) : "";
      const ext = path.extname(docFileName).toLowerCase() || ".pdf";
      const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);

      const item = {
        type: isImg ? "image" : "document",
        filePath: savedFilePath,
        fileName: docFileName,
        fileUrl: docFileUrl,
        fileSize,
        ext
      };

      await handleIncomingAttachment(bot, msg, item);
    } catch (err) {
      console.error("Gagal memproses dokumen:", err);
      bot.sendMessage(chatId, `❌ Terjadi kendala saat memproses berkas dokumen: ${err.message}`);
    }
  });
}

export default bot;

