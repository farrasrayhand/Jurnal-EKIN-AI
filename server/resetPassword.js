#!/usr/bin/env node

/**
 * CLI Tool: Reset Password Superadmin E-Kinerja AI
 * Penggunaan:
 *   node server/resetPassword.js [password_baru]
 *   npm run reset-admin [password_baru]
 * 
 * Cocok dijalankan langsung dari Terminal lokal atau tab Console di Easypanel / Docker.
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { hashPassword } from "./dbStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, "../database");
const DB_FILE = path.join(DB_DIR, "ekinerja_store.json");

// Muat .env jika ada
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch (e) {}
}

function promptPassword(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function generateRandomPassword(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

async function main() {
  console.log(`
========================================================================
🛡️  E-KINERJA AI — CLI RESET PASSWORD SUPERADMIN
========================================================================
`);

  // Pastikan database ada
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  let store = { accounts: [], journals: [], settings: {} };
  if (fs.existsSync(DB_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (err) {
      console.warn("⚠️ Berkas database lama tidak terbaca, membuat struktur baru.");
    }
  }

  if (!Array.isArray(store.accounts)) {
    store.accounts = [];
  }

  // Cari akun superadmin
  let superadmin = store.accounts.find(
    (a) => a.role === "superadmin" || a.username === "superadmin"
  );

  // Jika belum ada superadmin, inisialisasi akun superadmin baru
  if (!superadmin) {
    superadmin = {
      id: "usr-superadmin",
      username: "superadmin",
      password: "",
      role: "superadmin",
      nama: "Super Administrator",
      nip: "198001012005011001",
      pangkat: "Pembina Tingkat I / IV/b",
      jabatan: "Administrator Sistem Kepegawaian",
      unitKerja: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
      allowEnvKey: true,
      createdAt: new Date().toISOString()
    };
    store.accounts.push(superadmin);
    console.log("ℹ️ Akun Superadmin belum terdaftar di database, membuat akun baru...");
  }

  // Ambil password baru dari argumen CLI
  const args = process.argv.slice(2);
  let newPassword = args[0] ? args[0].trim() : "";

  // Jika tidak ada argumen dan interaktif di terminal, minta input
  if (!newPassword) {
    if (process.stdin.isTTY) {
      newPassword = await promptPassword("👉 Masukkan password baru untuk Superadmin (atau tekan Enter untuk auto-generate): ");
    }
  }

  // Jika masih kosong (atau tekan Enter), buatkan password acak aman
  if (!newPassword) {
    newPassword = generateRandomPassword(10);
    console.log(`ℹ️ Password otomatis dibuatkan oleh sistem.`);
  }

  // Perbarui data superadmin dengan password ter-hash
  superadmin.password = hashPassword(newPassword);
  superadmin.updatedAt = new Date().toISOString();

  // Simpan ke database file
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf8");

  console.log(`
✅ BERHASIL! Password Superadmin telah diperbarui:
------------------------------------------------------------------------
👤 Username  : ${superadmin.username}
👑 Nama      : ${superadmin.nama}
🔑 Password  : ${newPassword}
📅 Waktu     : ${new Date().toLocaleString("id-ID")}
------------------------------------------------------------------------
Gunakan kredensial ini untuk login ke halaman web E-Kinerja AI.
Simpan password ini dengan aman!
========================================================================
`);
}

main().catch((err) => {
  console.error("❌ Gagal mereset password superadmin:", err);
  process.exit(1);
});
