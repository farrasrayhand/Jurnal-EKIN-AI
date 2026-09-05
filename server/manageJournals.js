#!/usr/bin/env node

/**
 * ============================================================================
 * CLI Tool: Manajemen & Pembersihan Data Jurnal E-Kinerja AI
 * ============================================================================
 * Penggunaan CLI:
 *   node server/manageJournals.js [opsi]
 *   npm run clear-journals [opsi]
 * 
 * Opsi Perintah:
 *   --all                 Hapus SEMUA data jurnal di dalam sistem
 *   --user <username/id>  Hapus seluruh jurnal milik pengguna tertentu
 *   --list                Tampilkan ringkasan jumlah jurnal setiap pengguna
 *   --no-files            Jangan hapus file fisik eviden di folder uploads
 *   -y, --yes, --force    Lewati prompt konfirmasi (langsung hapus)
 *   -h, --help            Tampilkan bantuan ini
 * 
 * Mode Interaktif:
 *   Jalankan tanpa argumen `npm run clear-journals` untuk menu interaktif.
 */

import readline from "readline";
import { 
  getStore, 
  getAccounts, 
  deleteAllJournals, 
  deleteJournalsByUserId, 
  deleteJournalById,
  deleteUserById,
  findUserByUsername, 
  findUserById 
} from "./dbStore.js";

function promptInput(query) {
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

function printHeader() {
  console.log(`
========================================================================
🗑️  E-KINERJA AI — CLI PEMBERSIHAN DATA JURNAL
========================================================================`);
}

function printHelp() {
  printHeader();
  console.log(`
Panduan Penggunaan Perintah CLI:
  npm run clear-journals                             Buka Menu Interaktif
  npm run clear-journals -- --list                   Tampilkan daftar pengguna & jumlah jurnal
  npm run clear-journals -- --all                    Hapus SEMUA data jurnal di sistem
  npm run clear-journals -- --all -y                 Hapus SEMUA jurnal tanpa konfirmasi
  npm run clear-journals -- --user <username>        Hapus jurnal milik akun tertentu
  npm run clear-journals -- --delete-user <username> Hapus AKUN pengguna beserta seluruh jurnal & filenya
  npm run clear-journals -- --delete-journal <id>    Hapus 1 jurnal tertentu beserta berkas fisiknya

Parameter Tambahan:
  --no-files   Mempertahankan berkas fisik eviden di folder uploads
  -y, --yes    Melewati konfirmasi (cocok untuk skrip otomatis)
  -h, --help   Tampilkan panduan ini
`);
}

function getUserStats() {
  const store = getStore();
  const accounts = getAccounts();
  const journals = store.journals || [];

  const stats = accounts.map((acc, index) => {
    const accId = String(acc.id || "").toLowerCase();
    const accU = String(acc.username || "").toLowerCase();

    const userJournals = journals.filter(j => {
      const jUId = String(j.userId || "").toLowerCase();
      return (
        jUId === accId || 
        jUId === accU || 
        (!j.userId && (accId === "usr-farras" || accU === "farras"))
      );
    });

    return {
      index: index + 1,
      id: acc.id,
      username: acc.username,
      nama: acc.nama,
      role: acc.role,
      count: userJournals.length
    };
  });

  // Cek jika ada jurnal tanpa user yang valid
  const knownIds = new Set(accounts.map(a => a.id));
  const knownUsers = new Set(accounts.map(a => a.username.toLowerCase()));
  const unassigned = journals.filter(j => {
    if (!j.userId && knownIds.has("usr-farras")) return false;
    return !knownIds.has(j.userId) && !knownUsers.has(String(j.userId).toLowerCase());
  });

  return { stats, totalJournals: journals.length, unassignedCount: unassigned.length };
}

function displayStats() {
  const { stats, totalJournals, unassignedCount } = getUserStats();

  console.log(`\n📊 Ringkasan Data Jurnal Saat Ini:`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`No.  Username         Peran        Jml Jurnal   Nama Lengkap`);
  console.log(`------------------------------------------------------------------------`);

  stats.forEach(s => {
    const num = String(s.index).padEnd(4, " ");
    const u = s.username.padEnd(16, " ");
    const r = s.role.padEnd(12, " ");
    const c = `${s.count} jurnal`.padEnd(12, " ");
    console.log(`${num} ${u} ${r} ${c} ${s.nama || "-"}`);
  });

  if (unassignedCount > 0) {
    console.log(`*    (Lainnya/Anonim) -            ${unassignedCount} jurnal   Jurnal tanpa ID akun terkait`);
  }
  console.log(`------------------------------------------------------------------------`);
  console.log(`TOTAL KESELURUHAN: ${totalJournals} data jurnal tersimpan.\n`);
}

async function handleActionAll(autoConfirm = false, deleteFiles = true) {
  const { totalJournals } = getUserStats();

  if (totalJournals === 0) {
    console.log("ℹ️ Tidak ada data jurnal yang tersimpan di sistem saat ini.");
    return;
  }

  console.log(`\n⚠️  PERINGATAN: Anda akan menghapus SEMUA (${totalJournals}) data jurnal di sistem!`);
  if (deleteFiles) {
    console.log(`📁 Berkas fisik eviden (foto/dokumen) terkait juga akan dibersihkan.`);
  }

  if (!autoConfirm) {
    const confirm = await promptInput("Ketik 'Y' atau 'YA' untuk mengonfirmasi penghapusan seluruh jurnal: ");
    if (!["y", "ya"].includes(confirm.toLowerCase())) {
      console.log("❌ Tindakan dibatalkan. Tidak ada data jurnal yang dihapus.");
      return;
    }
  }

  const result = deleteAllJournals(deleteFiles);
  console.log(`\n✅ BERHASIL: Seluruh data jurnal (${result.deletedCount} jurnal) berhasil dihapus.`);
  if (result.deletedFiles > 0) {
    console.log(`🗑️  ${result.deletedFiles} berkas fisik lampiran/eviden juga telah dibersihkan.`);
  }
  console.log(`📊 Sisa data jurnal di database: 0 jurnal.`);
}

async function handleActionUser(targetUsernameOrId, autoConfirm = false, deleteFiles = true) {
  let target = targetUsernameOrId;
  const { stats } = getUserStats();

  if (!target) {
    displayStats();
    target = await promptInput("Masukkan Username atau ID Pegawai yang ingin dihapus jurnalnya: ");
  }

  if (!target) {
    console.log("❌ Tindakan dibatalkan: Username / ID tidak boleh kosong.");
    return;
  }

  // Cari akun
  const found = stats.find(s => 
    s.username.toLowerCase() === target.toLowerCase() || 
    s.id.toLowerCase() === target.toLowerCase()
  );

  const targetCount = found ? found.count : 0;
  const displayName = found ? `${found.nama} (@${found.username})` : target;

  if (targetCount === 0) {
    console.log(`ℹ️ Pengguna "${displayName}" tidak memiliki data jurnal.`);
    return;
  }

  console.log(`\n⚠️  PERINGATAN: Anda akan menghapus ${targetCount} data jurnal milik "${displayName}".`);
  if (deleteFiles) {
    console.log(`📁 Berkas fisik eviden (foto/dokumen) pengguna ini juga akan dibersihkan.`);
  }

  if (!autoConfirm) {
    const confirm = await promptInput(`Ketik 'Y' atau 'YA' untuk konfirmasi penghapusan jurnal "${displayName}": `);
    if (!["y", "ya"].includes(confirm.toLowerCase())) {
      console.log("❌ Tindakan dibatalkan. Data jurnal tetap aman.");
      return;
    }
  }

  const result = deleteJournalsByUserId(target, deleteFiles);
  if (result.success) {
    console.log(`\n✅ BERHASIL: ${result.deletedCount} data jurnal milik "${displayName}" berhasil dihapus.`);
    if (result.deletedFiles > 0) {
      console.log(`🗑️  ${result.deletedFiles} berkas fisik lampiran/eviden juga telah dibersihkan.`);
    }
    console.log(`📊 Total jurnal sistem yang tersisa: ${result.remainingCount} jurnal.`);
  } else {
    console.log(`❌ Gagal: ${result.message}`);
  }
}

async function handleActionDeleteUser(targetUsernameOrId, autoConfirm = false, deleteFiles = true) {
  let target = targetUsernameOrId;
  const { stats } = getUserStats();

  if (!target) {
    displayStats();
    target = await promptInput("Masukkan Username atau ID Pengguna yang ingin DIHAPUS AKUNNYA: ");
  }

  if (!target) {
    console.log("❌ Tindakan dibatalkan: Username / ID tidak boleh kosong.");
    return;
  }

  const found = stats.find(s => 
    s.username.toLowerCase() === target.toLowerCase() || 
    s.id.toLowerCase() === target.toLowerCase()
  );

  const displayName = found ? `${found.nama || found.username} (@${found.username})` : target;

  if (!autoConfirm) {
    console.log(`\n⚠️  PERINGATAN: Anda akan MENGHAPUS AKUN "${displayName}"!`);
    console.log(`   - Seluruh data kegiatan jurnal akun ini akan dihapus.`);
    if (deleteFiles) {
      console.log(`   - Seluruh berkas fisik (foto & dokumen eviden) di server akan dihapus.`);
    }
    console.log(`   - Seluruh sesi login Web & Telegram akun ini akan dicabut.`);

    const confirm = await promptInput(`Ketik 'HAPUS' untuk mengonfirmasi: `);
    if (confirm !== "HAPUS") {
      console.log("❌ Tindakan dibatalkan. Tidak ada akun yang dihapus.");
      return;
    }
  }

  const result = deleteUserById(target, deleteFiles);
  if (result.success) {
    console.log(`\n✅ BERHASIL: Akun "${displayName}" telah dihapus secara tuntas.`);
    console.log(`🗑️  ${result.deletedJournals} jurnal dan ${result.deletedFiles} berkas fisik telah dibersihkan.`);
    console.log(`👥 Jumlah akun yang tersisa: ${result.remainingAccounts} akun.`);
  } else {
    console.log(`❌ Gagal: ${result.message}`);
  }
}

async function handleActionSingleJournal(targetJournalId, autoConfirm = false, deleteFiles = true) {
  let targetId = targetJournalId;
  if (!targetId) {
    targetId = await promptInput("Masukkan ID Kegiatan Jurnal yang ingin dihapus (contoh: jrn-123456): ");
  }

  if (!targetId) {
    console.log("❌ ID Jurnal tidak boleh kosong.");
    return;
  }

  if (!autoConfirm) {
    const confirm = await promptInput(`Ketik 'Y' untuk menghapus kegiatan jurnal "${targetId}": `);
    if (!["y", "ya"].includes(confirm.toLowerCase())) {
      console.log("❌ Tindakan dibatalkan.");
      return;
    }
  }

  const result = deleteJournalById(targetId, deleteFiles);
  if (result.success) {
    console.log(`\n✅ BERHASIL: Kegiatan jurnal "${targetId}" telah dihapus.`);
    if (result.deletedFiles > 0) {
      console.log(`🗑️  ${result.deletedFiles} berkas fisik lampiran/eviden terkait berhasil dihapus.`);
    }
  } else {
    console.log(`❌ Gagal: ${result.message}`);
  }
}

async function runInteractiveMenu() {
  printHeader();

  while (true) {
    displayStats();

    console.log(`Pilihan Aksi Pembersihan:`);
    console.log(`  [1] Hapus SEMUA data jurnal di dalam sistem`);
    console.log(`  [2] Hapus data jurnal untuk PENGGUNA TERTENTU`);
    console.log(`  [3] Hapus AKUN PENGGUNA (User + Jurnal + File Fisik + Sesi)`);
    console.log(`  [4] Hapus 1 JURNAL TERTENTU (berdasarkan ID)`);
    console.log(`  [5] Refresh Tampilan Statistik`);
    console.log(`  [0] Keluar / Selesai\n`);

    const choice = await promptInput("Pilih menu [0-5]: ");

    if (choice === "1") {
      await handleActionAll(false, true);
    } else if (choice === "2") {
      await handleActionUser(null, false, true);
    } else if (choice === "3") {
      await handleActionDeleteUser(null, false, true);
    } else if (choice === "4") {
      await handleActionSingleJournal(null, false, true);
    } else if (choice === "5") {
      console.log("Memperbarui data...");
    } else if (choice === "0" || choice.toLowerCase() === "exit" || choice.toLowerCase() === "q") {
      console.log("Sampai jumpa!");
      break;
    } else {
      console.log("⚠️ Pilihan tidak valid, silakan masukkan angka 0 sampai 5.");
    }

    console.log("\nTekan Enter untuk kembali ke menu...");
    await promptInput("");
  }
}

// ----------------------------------------------------------------------------
// Entry Point CLI
// ----------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const isAutoConfirm = args.includes("-y") || args.includes("--yes") || args.includes("--force");
  const isDeleteFiles = !args.includes("--no-files");

  // Opsi --list
  if (args.includes("--list") || args.includes("-l")) {
    printHeader();
    displayStats();
    return;
  }

  // Opsi --all
  if (args.includes("--all")) {
    printHeader();
    await handleActionAll(isAutoConfirm, isDeleteFiles);
    return;
  }

  // Opsi --delete-user <username>
  const delUserIdx = args.findIndex(a => a === "--delete-user" || a === "--del-user");
  if (delUserIdx !== -1) {
    const target = args[delUserIdx + 1];
    if (!target || target.startsWith("-")) {
      console.error("❌ Kesalahan: Harap tentukan username/ID setelah opsi --delete-user. Contoh: --delete-user budi");
      process.exit(1);
    }
    printHeader();
    await handleActionDeleteUser(target, isAutoConfirm, isDeleteFiles);
    return;
  }

  // Opsi --delete-journal <id>
  const delJrnIdx = args.findIndex(a => a === "--delete-journal" || a === "--del-jrn");
  if (delJrnIdx !== -1) {
    const target = args[delJrnIdx + 1];
    if (!target || target.startsWith("-")) {
      console.error("❌ Kesalahan: Harap tentukan ID jurnal setelah opsi --delete-journal. Contoh: --delete-journal jrn-123");
      process.exit(1);
    }
    printHeader();
    await handleActionSingleJournal(target, isAutoConfirm, isDeleteFiles);
    return;
  }

  // Opsi --user <username>
  const userIdx = args.findIndex(a => a === "--user" || a === "-u");
  if (userIdx !== -1) {
    const target = args[userIdx + 1];
    if (!target || target.startsWith("-")) {
      console.error("❌ Kesalahan: Harap tentukan username setelah opsi --user. Contoh: --user farras");
      process.exit(1);
    }
    printHeader();
    await handleActionUser(target, isAutoConfirm, isDeleteFiles);
    return;
  }

  // Jika tidak ada argumen spesifik, jalankan mode interaktif
  await runInteractiveMenu();
}

main().catch(err => {
  console.error("Terjadi kesalahan:", err);
  process.exit(1);
});
