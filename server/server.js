// Unified Production Server E-Kinerja AI untuk Easypanel / Docker / VPS
// Menjalankan Web Server (Frontend & API Sync) + Bot Telegram secara otomatis bersamaan!

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat .env jika tersedia (kompatibel lokal & Easypanel/Docker)
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch (e) {}
}

import crypto from "crypto";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = path.resolve(__dirname, "../dist");
const DB_FILE = path.resolve(__dirname, "../database/ekinerja_store.json");
const UPLOADS_DIR = path.resolve(__dirname, "../database/uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {}
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf"
};

import { 
  getStore,
  saveStore,
  setCachedStore,
  authenticateUser, 
  sanitizeUser, 
  hashPassword,
  getRegistrationCodes,
  createRegistrationCode,
  deleteRegistrationCode,
  registerNewUser,
  createWebSession,
  getWebSession,
  deleteWebSession,
  cleanupExpiredSessions,
  deleteJournalById,
  deleteUserById,
  ONE_DAY_MS
} from "./dbStore.js";
import { generateMonthlyReportPdf, generateMonthlyReportZip } from "./pdfGenerator.js";
import { initDatabase, loadStoreFromDatabase, getDatabaseHealth, getActiveDbType } from "./dbAdapter.js";

// Rate Limiter Sederhana In-Memory untuk Cegah Brute-Force & DoS
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);
  return record.count <= limit;
}

// Bersihkan memori rate limit berkala (tiap 5 menit)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(key);
  }
}, 300000);

// Headers Keamanan Web Tingkat Produksi (Cegah Clickjacking, MIME-sniffing, XSS)
function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'self';"
  );
}

// 1. Jalankan Bot Telegram secara Otomatis dalam Proses yang Sama
console.log("⏳ [Auto-Start] Memulai Bot Telegram...");
import("./telegramBot.js")
  .then(() => {
    console.log("🤖 [Auto-Start] Bot Telegram aktif berjalan.");
  })
  .catch((err) => {
    console.error("⚠️ [Auto-Start] Gagal memuat Bot Telegram:", err.message);
  });

// 2. Buat HTTP Server untuk Web App & API Sync yang Aman
const server = http.createServer((req, res) => {
  // Pasang security headers di setiap respons
  setSecurityHeaders(res);

  // Batasi HTTP Methods yang diizinkan
  if (!["GET", "POST", "HEAD", "OPTIONS"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Metode HTTP tidak diizinkan.");
    return;
  }

  // Handle CORS preflight jika ada
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  const clientIp = req.socket.remoteAddress || "client";

  // 🛡️ KEAMANAN TINGKAT TINGGI: Deteksi Path Traversal pada RAW URL sebelum dinormalisasi
  const rawUrl = req.url || "/";
  if (rawUrl.includes("..") || /%2e/i.test(rawUrl) || rawUrl.includes("\0")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Upaya Path Traversal Ditolak.");
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = parsedUrl.pathname;

  // 🛡️ KEAMANAN: Tolak akses ke file tersembunyi / dotfiles (.env, .git, .DS_Store, dll.)
  if (pathname.split("/").some(segment => segment.startsWith(".") && segment !== "" && segment !== "." && segment !== "..")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke berkas konfigurasi sistem ditolak.");
    return;
  }

  // 🛡️ KEAMANAN: Tolak akses ke direktori internal sistem
  const forbiddenDirs = ["/database", "/server", "/src", "/node_modules", "/package.json", "/vite.config.js"];
  if (forbiddenDirs.some(dir => pathname.toLowerCase().startsWith(dir))) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke direktori internal sistem ditolak.");
    return;
  }

  const getBotConfig = () => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
    const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
    return {
      enabled: Boolean(token),
      username: username
    };
  };

  // Endpoint Autentikasi Login Aman Server-Side (Cegah Bocor Password ke Client)
  if (pathname === "/api/auth/login") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Proteksi Brute-Force: Maks 10 kali gagal per 10 menit
    if (!checkRateLimit(`login_${clientIp}`, 10, 600000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ 
        success: false, 
        message: "Terlalu banyak percobaan login yang gagal. Demi keamanan, silakan tunggu 10 menit." 
      }));
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy(); // Limit 50KB untuk payload login
    });

    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: "Username dan password wajib diisi!" }));
          return;
        }

        const auth = authenticateUser(username, password);
        if (!auth.success) {
          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: auth.message }));
          return;
        }

        const session = createWebSession(auth.user);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          success: true, 
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt
        }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Format payload tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Registrasi Pengguna Baru (Wajib Kode Registrasi Resmi)
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/register") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Rate Limiter Registrasi: Maksimal 15 pendaftaran per menit per IP
    if (!checkRateLimit(`register_${clientIp}`, 15, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ 
        success: false, 
        message: "Terlalu banyak permintaan pendaftaran dari IP Anda. Harap tunggu beberapa saat demi keamanan." 
      }));
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = registerNewUser(payload);
        let session = null;
        if (result.success && result.user) {
          session = createWebSession(result.user);
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          ...result,
          token: session?.token,
          expiresAt: session?.expiresAt
        }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Verifikasi Sesi Web (Berlaku 1 Hari / 24 Jam)
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/verify-session") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const token = parsedUrl.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const session = getWebSession(token);
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ valid: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      valid: true,
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Logout Sesi Web
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/logout") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      let token = "";
      try {
        const parsed = JSON.parse(body || "{}");
        token = parsed.token;
      } catch (e) {}
      if (!token) {
        token = parsedUrl.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      }
      if (token) deleteWebSession(token);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Berhasil logout." }));
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Admin: Manajemen Kode Registrasi / Undangan
  // --------------------------------------------------------------------------
  if (pathname === "/api/admin/registration-codes" || pathname.startsWith("/api/admin/registration-codes/")) {
    if (req.method === "GET") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, codes: getRegistrationCodes() }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 50000) req.destroy();
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const created = createRegistrationCode(payload);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, code: created }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: err.message }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      const idFromPath = pathname.replace("/api/admin/registration-codes", "").replace(/^\//, "");
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        let codeId = idFromPath;
        if (!codeId && body) {
          try {
            const parsed = JSON.parse(body);
            codeId = parsed.id || parsed.code;
          } catch (e) {}
        }
        if (!codeId) {
          codeId = parsedUrl.searchParams.get("id") || parsedUrl.searchParams.get("code");
        }

        if (!codeId) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: "ID atau Kode wajib disertakan." }));
          return;
        }

        const deleted = deleteRegistrationCode(codeId);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: deleted }));
      });
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus Kegiatan Jurnal (Hapus Database + Hapus Berkas Fisik di Disk)
  // --------------------------------------------------------------------------
  if (pathname === "/api/journals/delete" || (req.method === "DELETE" && pathname.startsWith("/api/journals/"))) {
    if (req.method !== "POST" && req.method !== "DELETE") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const handleJournalDeletion = (targetId) => {
      if (!targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "ID kegiatan jurnal wajib disertakan!" }));
        return;
      }
      const result = deleteJournalById(targetId, true);
      if (!result.success) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    };

    if (req.method === "DELETE" && pathname.startsWith("/api/journals/")) {
      const idFromPath = pathname.slice("/api/journals/".length).trim();
      handleJournalDeletion(idFromPath);
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        handleJournalDeletion(payload.id);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Payload JSON tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus Akun Pengguna (Hapus Akun + Seluruh Jurnal + Berkas Fisik + Sesi)
  // --------------------------------------------------------------------------
  if (pathname === "/api/accounts/delete" || (req.method === "DELETE" && pathname.startsWith("/api/accounts/"))) {
    if (req.method !== "POST" && req.method !== "DELETE") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const handleAccountDeletion = (targetId) => {
      if (!targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "ID atau Username pengguna wajib disertakan!" }));
        return;
      }
      const result = deleteUserById(targetId, true);
      if (!result.success) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    };

    if (req.method === "DELETE" && pathname.startsWith("/api/accounts/")) {
      const idFromPath = pathname.slice("/api/accounts/".length).trim();
      handleAccountDeletion(idFromPath);
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        handleAccountDeletion(payload.id || payload.userId || payload.username);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Payload JSON tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus File Fisik Sementara (Saat Pembatalan Draft Upload)
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/uploads/delete") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const { fileUrl, filePath, fileName, storedName } = JSON.parse(body);
        const candidates = [];
        if (filePath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(filePath)));
        if (storedName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(storedName)));
        if (fileName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(fileName)));
        if (fileUrl && typeof fileUrl === "string") {
          const cleanUrl = fileUrl.split("?")[0].split("#")[0];
          const bName = path.basename(cleanUrl);
          if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
        }

        let deleted = false;
        for (const fPath of Array.from(new Set(candidates.filter(Boolean)))) {
          try {
            if (fPath.startsWith(UPLOADS_DIR) && fs.existsSync(fPath)) {
              const stat = fs.statSync(fPath);
              if (stat.isFile()) {
                fs.unlinkSync(fPath);
                deleted = true;
              }
            }
          } catch (e) {}
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, deleted }));
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Bad request" }));
      }
    });
    return;
  }

  // Handler Status Konfigurasi Bot Telegram
  if (pathname === "/api/bot-status") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getBotConfig()));
    return;
  }

  // Handler Status Database Server (MySQL / MariaDB vs Fallback JSON)
  if (pathname === "/api/system/db-status" && (req.method === "GET" || req.method === "HEAD")) {
    getDatabaseHealth().then(health => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, ...health }));
    }).catch(err => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, type: "error", error: err.message }));
    });
    return;
  }

  // Handler API Sync (Sinkronisasi Web & Telegram Bot)
  if (pathname === "/api/sync") {
    // Rate Limiter API Sync: Maks 120 request per menit
    if (!checkRateLimit(`sync_${clientIp}`, 120, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Terlalu banyak request. Silakan perlambat." }));
      return;
    }

    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      const store = getStore();
      const accounts = (store.accounts || []).map(sanitizeUser);
      const journals = store.journals || [];
      res.end(JSON.stringify({
        accounts,
        journals,
        botConfig: getBotConfig()
      }));
      return;
    } else if (req.method === "POST") {
      // Proteksi Ukuran Payload: Maksimal 10MB
      let body = "";
      let isTooLarge = false;
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
          isTooLarge = true;
          res.statusCode = 413;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Payload terlalu besar (Maksimal 10MB)." }));
          req.destroy();
        }
      });

      req.on("end", () => {
        if (isTooLarge) return;
        try {
          const incoming = JSON.parse(body);
          const store = getStore();

          if (Array.isArray(incoming.accounts)) {
            const map = new Map((store.accounts || []).map(a => [a.id || a.username, a]));
            incoming.accounts.forEach(a => {
              const existing = map.get(a.id || a.username);
              let passwordToStore = existing?.password || "";
              // Jika payload mengirimkan password baru, hash menggunakan Scrypt
              if (a.password) {
                passwordToStore = hashPassword(a.password);
              }
              map.set(a.id || a.username, { 
                ...existing, 
                ...a,
                password: passwordToStore
              });
            });
            store.accounts = Array.from(map.values());
          }
          if (Array.isArray(incoming.journals)) {
            const jMap = new Map((store.journals || []).map(j => [j.id, j]));
            incoming.journals.forEach(j => jMap.set(j.id, { ...jMap.get(j.id), ...j }));
            store.journals = Array.from(jMap.values());
          }

          saveStore(store);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, count: store.accounts?.length }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // Health Check untuk Easypanel / Docker / Uptime Monitoring
  if (pathname === "/health" || pathname === "/healthz") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      status: "ok", 
      bot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      timestamp: new Date().toISOString() 
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // A. Serving Berkas Upload (Foto Dokumentasi & Dokumen Eviden)
  // --------------------------------------------------------------------------
  if (req.method === "GET" && pathname.startsWith("/uploads/")) {
    let rawFile = pathname.slice("/uploads/".length);
    try {
      rawFile = decodeURIComponent(rawFile);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Bad Request: Invalid encoding");
      return;
    }

    // Proteksi Path Traversal & Null-Byte
    if (rawFile.includes("\0") || rawFile.includes("..") || rawFile.includes("/") || rawFile.includes("\\")) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Akses tidak diizinkan.");
      return;
    }

    const safeFileName = path.basename(rawFile);
    const targetFilePath = path.join(UPLOADS_DIR, safeFileName);
    const resolvedUploads = path.resolve(UPLOADS_DIR);

    if (!targetFilePath.startsWith(resolvedUploads + path.sep)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Akses berkas di luar folder upload ditolak.");
      return;
    }

    if (!fs.existsSync(targetFilePath)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found: Berkas tidak ditemukan.");
      return;
    }

    const ext = path.extname(safeFileName).toLowerCase();
    const uploadMimes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain; charset=utf-8",
      ".csv": "text/csv; charset=utf-8",
      ".zip": "application/zip"
    };

    // Tolak script berbahaya
    const dangerousExts = [".html", ".htm", ".svg", ".svgz", ".js", ".mjs", ".sh", ".exe", ".php", ".py"];
    if (dangerousExts.includes(ext)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Jenis berkas ini tidak dapat diakses langsung.");
      return;
    }

    const contentType = uploadMimes[ext] || "application/octet-stream";
    const stat = fs.statSync(targetFilePath);

    const isInlineViewable = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", isInlineViewable ? `inline; filename="${safeFileName}"` : `attachment; filename="${safeFileName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(targetFilePath).pipe(res);
    return;
  }

  // --------------------------------------------------------------------------
  // B. Endpoint Upload Berkas (Web Frontend Upload)
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/upload") {
    // Rate Limiting Upload: Maks 30 upload per menit per IP
    if (!checkRateLimit(`upload_${clientIp}`, 30, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: "Terlalu banyak permintaan upload. Tunggu beberapa saat." }));
      return;
    }

    let uploadBody = "";
    let isTooBig = false;
    const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB

    req.on("data", chunk => {
      uploadBody += chunk;
      if (uploadBody.length > MAX_UPLOAD_SIZE) {
        isTooBig = true;
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Ukuran berkas melebihi batas 15MB." }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (isTooBig) return;
      try {
        const payload = JSON.parse(uploadBody);
        const rawFileName = payload.fileName || "dokumen_kinerja.pdf";
        const fileData = payload.fileData; // base64 string

        if (!fileData || typeof fileData !== "string") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Data berkas tidak valid." }));
          return;
        }

        const ext = path.extname(rawFileName).toLowerCase();
        const forbiddenExts = [".exe", ".js", ".mjs", ".sh", ".bat", ".cmd", ".php", ".phtml", ".py", ".html", ".htm", ".svg"];
        if (forbiddenExts.includes(ext)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Tipe berkas tidak diizinkan demi alasan keamanan." }));
          return;
        }

        // Tentukan keterangan bulan & tahun dari tanggal jurnal atau waktu sekarang
        const tanggalReq = payload.tanggal || payload.date || "";
        const INDO_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        let monthName = "";
        let yearNum = "";

        if (tanggalReq && typeof tanggalReq === "string") {
          const parts = tanggalReq.split("-");
          if (parts.length >= 2) {
            yearNum = parts[0];
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              monthName = INDO_MONTHS[mIdx];
            }
          }
        }
        if (!monthName || !yearNum) {
          const now = new Date();
          monthName = INDO_MONTHS[now.getMonth()];
          yearNum = String(now.getFullYear());
        }

        const monthTag = `${monthName}_${yearNum}`;
        const cleanBaseName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        
        // Pastikan nama berkas menyertakan keterangan bulan agar tidak tereplace dengan berkas bulan lain
        const baseNameWithMonth = cleanBaseName.toLowerCase().includes(monthName.toLowerCase())
          ? cleanBaseName
          : `${monthTag}_${cleanBaseName}`;

        const randomPrefix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const storedFileName = `${randomPrefix}_${baseNameWithMonth}`;
        const targetPath = path.join(UPLOADS_DIR, storedFileName);

        const base64Clean = fileData.replace(/^data:[^;]+;base64,/, "");
        const fileBuffer = Buffer.from(base64Clean, "base64");

        fs.writeFileSync(targetPath, fileBuffer);

        const baseAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
        const relativeUrl = `/uploads/${storedFileName}`;
        const fullUrl = baseAppUrl ? `${baseAppUrl}${relativeUrl}` : relativeUrl;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          fileUrl: fullUrl,
          relativeUrl: relativeUrl,
          fileName: baseNameWithMonth,
          storedName: storedFileName,
          fileSize: `${(fileBuffer.length / 1024).toFixed(0)} KB`
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Gagal menyimpan berkas: " + err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // C. Endpoint Download Paket Laporan Bulanan (.ZIP / .PDF)
  // --------------------------------------------------------------------------
  if (pathname === "/api/reports/zip" || pathname === "/api/reports/pdf") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    const month = parsedUrl.searchParams.get("month") || "07";
    const year = parsedUrl.searchParams.get("year") || "2026";
    const userId = parsedUrl.searchParams.get("userId") || "";
    const gdriveLink = parsedUrl.searchParams.get("gdriveLink") || "";

    let storeData = { accounts: [], journals: [], penilai: null };
    if (fs.existsSync(DB_FILE)) {
      try {
        storeData = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      } catch (e) {}
    }

    const targetUser = storeData.accounts?.find(a => a.id === userId || a.username === userId)
      || storeData.accounts?.find(a => a.role !== "superadmin")
      || storeData.accounts?.[0]
      || { nama: "Pegawai E-Kinerja", nip: "200011192025211007", pangkat: "Pengatur Muda / II/a", jabatan: "Staff", unitKerja: "Instansi" };

    const userJournals = (storeData.journals || []).filter(j => !userId || j.userId === targetUser.id || j.userId === targetUser.username);
    const penilai = storeData.penilai || { nama: "ANDA SUPANDA, S.Pd, M.Pd", nip: "197505201998021001", pangkat: "Pembina Tingkat I / IV/b", jabatan: "Kepala Sekolah" };

    if (pathname === "/api/reports/pdf") {
      generateMonthlyReportPdf({
        pegawai: targetUser,
        penilai,
        journals: userJournals,
        month,
        year,
        gdriveLink,
        uploadsDir: UPLOADS_DIR
      }).then(pdfBuffer => {
        const cleanName = (targetUser.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");
        const monthIndex = parseInt(month, 10) - 1;
        const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const monthName = NAMA_BULAN[monthIndex] || "Bulan";
        const filename = `Laporan_Kinerja_${monthName}_${year}_${cleanName}.pdf`;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.end(pdfBuffer);
      }).catch(err => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Gagal membuat PDF: " + err.message }));
      });
      return;
    }

    generateMonthlyReportZip({
      pegawai: targetUser,
      penilai,
      journals: userJournals,
      month,
      year,
      gdriveLink,
      uploadsDir: UPLOADS_DIR
    }).then(({ zipBuffer, zipFileName }) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);
      res.setHeader("Content-Length", zipBuffer.length);
      res.end(zipBuffer);
    }).catch(err => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Gagal membuat paket ZIP: " + err.message }));
    });
    return;
  }

  // 🛡️ KEAMANAN: PROTEKSI PATH TRAVERSAL KETAT PADA FILE SERVING STATIC
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bad Request: Invalid URI Encoding");
    return;
  }

  // Tolak Null-Byte Injection
  if (decodedPath.includes("\0")) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bad Request: Null Byte Detected");
    return;
  }

  // Normalisasi path
  const safeNormalized = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, "");
  const resolvedDist = path.resolve(DIST_DIR);
  let targetFilePath = path.resolve(DIST_DIR, safeNormalized === "/" ? "index.html" : "." + safeNormalized);

  // STRICT CONFINEMENT: File harus benar-benar berada di dalam folder dist/
  if (!targetFilePath.startsWith(resolvedDist + path.sep) && targetFilePath !== path.join(resolvedDist, "index.html")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke berkas di luar direktori web ditolak.");
    return;
  }

  // Jika berkas tidak ditemukan atau sebuah direktori (SPA routing), fallback ke index.html
  if (!fs.existsSync(targetFilePath) || fs.statSync(targetFilePath).isDirectory()) {
    // Berkas dengan ekstensi file spesifik yang tidak ditemukan wajib return 404 (jangan samarkan dengan index.html)
    if (path.extname(safeNormalized) !== "") {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found: Berkas tidak ditemukan.");
      return;
    }
    targetFilePath = path.join(resolvedDist, "index.html");
  }

  if (fs.existsSync(targetFilePath)) {
    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Cache static assets dengan hash di dist/assets
    if (pathname.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }

    const stream = fs.createReadStream(targetFilePath);
    stream.pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Berkas tidak ditemukan. Harap jalankan 'npm run build' terlebih dahulu.");
  }
});

async function startServer() {
  server.listen(PORT, HOST, async () => {
    let dbStatus = "Penyimpanan Berkas JSON Lokal (database/ekinerja_store.json)";
    const activeType = getActiveDbType();

    if (activeType !== "json") {
      try {
        const dbInit = await initDatabase();
        if (dbInit.enabled) {
          const typeLabel = activeType === "postgres" ? "PostgreSQL" : "MySQL / MariaDB";
          dbStatus = `${typeLabel} - Aktif & Terhubung (${dbInit.accountCount || 0} akun)`;
          const remoteStore = await loadStoreFromDatabase();
          if (remoteStore) {
            setCachedStore(remoteStore);
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteStore, null, 2), "utf8");
            } catch (e) {}
          }
        } else {
          dbStatus = `${activeType.toUpperCase()} Fallback (${dbInit.error || dbInit.reason || "offline"}), aktif di JSON lokal`;
        }
      } catch (e) {
        dbStatus = `${activeType.toUpperCase()} Gagal (${e.message}), aktif di JSON lokal`;
      }
    }

    console.log(`
========================================================================
🚀 [EASYPANEL / PRODUCTION SERVER] E-KINERJA AI AKTIF!
========================================================================
🌐 Web App Port   : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}
📊 API Sync Path  : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/api/sync
🗄️ Database Mode  : ${dbStatus}
🩺 Health Check   : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/health
🤖 Telegram Bot   : ${process.env.TELEGRAM_BOT_TOKEN ? "Aktif Otomatis (Polling Siap)" : "Standby (Menunggu Token di Environment Easypanel)"}
========================================================================
`);
  });
}

startServer();

// Penanganan Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("Menerima sinyal SIGTERM, menutup server...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("Menerima sinyal SIGINT, menutup server...");
  server.close(() => process.exit(0));
});
