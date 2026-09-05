import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import JSZip from "jszip";
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, "../database/uploads");

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Menemukan file fisik eviden dari sebuah entri jurnal jika diunggah ke sistem
 */
export function resolveJournalAttachment(jrn, uploadsDir = DEFAULT_UPLOADS_DIR) {
  if (!jrn) return { hasPhysicalFile: false };

  // 1. Cek fotoPath langsung
  if (jrn.fotoPath) {
    let resolved = jrn.fotoPath;
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(uploadsDir, resolved);
    }
    if (fs.existsSync(resolved)) {
      const ext = path.extname(resolved).toLowerCase() || ".jpg";
      return {
        hasPhysicalFile: true,
        type: "photo",
        filePath: resolved,
        fileName: path.basename(resolved),
        ext
      };
    }
  }

  // 2. Cek filePath dokumen
  if (jrn.filePath) {
    let resolved = jrn.filePath;
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(uploadsDir, resolved);
    }
    if (fs.existsSync(resolved)) {
      const ext = path.extname(resolved).toLowerCase() || ".pdf";
      return {
        hasPhysicalFile: true,
        type: [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? "photo" : "document",
        filePath: resolved,
        fileName: jrn.fileName || path.basename(resolved),
        ext
      };
    }
  }

  // 3. Cek fotoUrl (bisa base64 data URI atau URL /uploads/...)
  if (jrn.fotoUrl && typeof jrn.fotoUrl === "string") {
    if (jrn.fotoUrl.startsWith("data:")) {
      const extMatch = jrn.fotoUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
      const ext = extMatch ? `.${extMatch[1] === "jpeg" ? "jpg" : extMatch[1]}` : ".jpg";
      const base64Clean = jrn.fotoUrl.replace(/^data:[^;]+;base64,/, "");
      return {
        hasPhysicalFile: true,
        type: "photo",
        base64Data: base64Clean,
        fileName: jrn.fileName || `foto_kegiatan${ext}`,
        ext
      };
    }
    if (jrn.fotoUrl.includes("/uploads/")) {
      const bName = path.basename(jrn.fotoUrl.split("?")[0]);
      const candidate = path.join(uploadsDir, bName);
      if (fs.existsSync(candidate)) {
        const ext = path.extname(candidate).toLowerCase() || ".jpg";
        return {
          hasPhysicalFile: true,
          type: "photo",
          filePath: candidate,
          fileName: jrn.fileName || bName,
          ext
        };
      }
    }
  }

  // 4. Cek fileUrl
  if (jrn.fileUrl && typeof jrn.fileUrl === "string" && jrn.fileUrl.includes("/uploads/")) {
    const bName = path.basename(jrn.fileUrl.split("?")[0]);
    const candidate = path.join(uploadsDir, bName);
    if (fs.existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase() || ".pdf";
      return {
        hasPhysicalFile: true,
        type: [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? "photo" : "document",
        filePath: candidate,
        fileName: jrn.fileName || bName,
        ext
      };
    }
  }

  // 5. Cek fileName di folder uploadsDir
  if (jrn.fileName && typeof jrn.fileName === "string") {
    const candidate = path.join(uploadsDir, path.basename(jrn.fileName));
    if (fs.existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase() || ".pdf";
      return {
        hasPhysicalFile: true,
        type: [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? "photo" : "document",
        filePath: candidate,
        fileName: jrn.fileName,
        ext
      };
    }
  }

  return { hasPhysicalFile: false };
}

/**
 * Membuat buffer PDF Laporan Kinerja Bulanan
 */
export function generateMonthlyReportPdf({
  pegawai,
  penilai,
  journals = [],
  month = "07",
  year = "2026",
  gdriveLink = "",
  uploadsDir = DEFAULT_UPLOADS_DIR
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true
      });

      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", err => reject(err));

      const monthIndex = parseInt(month, 10) - 1;
      const monthName = NAMA_BULAN[monthIndex] || "Juli";
      const uppercaseMonth = monthName.toUpperCase();

      const effectiveGdrive = (gdriveLink || "").trim();

      // 1. JUDUL LAPORAN
      doc.font("Times-Bold").fontSize(13).text("LAPORAN BULANAN KINERJA PEGAWAI", { align: "center", underline: true });
      doc.moveDown(0.25);
      doc.font("Times-Bold").fontSize(10).text(`BULAN: ${uppercaseMonth} TAHUN ${year}`, { align: "center" });
      doc.moveDown(1);

      // 2. BAGIAN I: DATA PEGAWAI
      doc.font("Times-Bold").fontSize(10).text("I. DATA PEGAWAI");
      doc.moveDown(0.3);

      const tableLeft = 40;
      const tableWidth = 515;
      const col1Width = 140;
      const col2Width = tableWidth - col1Width;

      const pegawaiFields = [
        ["Nama Pegawai", pegawai?.nama || "-"],
        ["NIP", pegawai?.nip || "-"],
        ["Pangkat / Golongan", pegawai?.pangkat || "-"],
        ["Jabatan", pegawai?.jabatan || "-"],
        ["Unit Kerja", pegawai?.unitKerja || "-"]
      ];

      let curY = doc.y;
      pegawaiFields.forEach(([label, val]) => {
        doc.rect(tableLeft, curY, col1Width, 18).fillAndStroke("#f8fafc", "#000000");
        doc.fillColor("#000000").font("Times-Bold").fontSize(8.5).text(label, tableLeft + 6, curY + 4);

        doc.rect(tableLeft + col1Width, curY, col2Width, 18).fillAndStroke("#ffffff", "#000000");
        doc.fillColor("#000000").font("Times-Roman").fontSize(8.5).text(`: ${val}`, tableLeft + col1Width + 6, curY + 4);

        curY += 18;
      });

      doc.y = curY + 12;

      // 3. BAGIAN II: TABEL KEGIATAN DAN FOTO DOKUMENTASI
      doc.font("Times-Bold").fontSize(10).text("II. TABEL KEGIATAN DAN FOTO DOKUMENTASI");
      doc.moveDown(0.3);

      const colW = [25, 75, 230, 85, 100];
      const headers = ["No", "Hari / Tanggal", "Uraian Tugas / Aktivitas Kedinasan", "Output / Hasil Kerja", "Bukti Eviden / Lampiran"];
      const headerH = 22;

      let tableY = doc.y;

      let hx = tableLeft;
      headers.forEach((h, i) => {
        doc.rect(hx, tableY, colW[i], headerH).fillAndStroke("#e2e8f0", "#000000");
        doc.fillColor("#000000").font("Times-Bold").fontSize(8);
        doc.text(h, hx + 2, tableY + 6, { width: colW[i] - 4, align: "center" });
        hx += colW[i];
      });

      tableY += headerH;

      const filtered = journals.filter(j => {
        if (!j.tanggal) return false;
        const [y, m] = j.tanggal.split("-");
        return y === String(year) && String(m).padStart(2, "0") === String(month).padStart(2, "0");
      });

      filtered.sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));

      let physicalCount = 0;
      const enrichedJournals = filtered.map(jrn => {
        const att = resolveJournalAttachment(jrn, uploadsDir);
        let lampiranIndex = 0;
        let trackableName = "";
        if (att.hasPhysicalFile) {
          physicalCount++;
          lampiranIndex = physicalCount;
          const cleanDate = (jrn.tanggal || "tgl").replace(/[^0-9-]/g, "");
          const safeTitle = (jrn.aktivitas || "lampiran")
            .slice(0, 25)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
          const ext = att.ext?.startsWith(".") ? att.ext : `.${att.ext || "pdf"}`;
          trackableName = `lampiran-${lampiranIndex}_${cleanDate}_${safeTitle}${ext}`;
        }
        return { ...jrn, att, lampiranIndex, trackableName };
      });

      if (enrichedJournals.length === 0) {
        const emptyH = 30;
        doc.rect(tableLeft, tableY, tableWidth, emptyH).fillAndStroke("#ffffff", "#000000");
        doc.fillColor("#64748b").font("Times-Italic").fontSize(9);
        doc.text(`Belum ada data aktivitas logbook kinerja pada bulan ${monthName} ${year}.`, tableLeft, tableY + 10, { width: tableWidth, align: "center" });
        tableY += emptyH;
      } else {
        enrichedJournals.forEach((jrn, idx) => {
          doc.font("Times-Roman").fontSize(8.5);
          const taskText = jrn.aktivitas || "-";
          const catText = jrn.catatan ? `\nCatatan: ${jrn.catatan}` : "";
          const fullUraian = taskText + catText;

          const textHeight = doc.heightOfString(fullUraian, { width: colW[2] - 10 });
          const hasPhoto = jrn.att?.hasPhysicalFile && jrn.att.type === "photo";
          const hasDocFile = jrn.att?.hasPhysicalFile && jrn.att.type !== "photo";
          const minHeight = hasPhoto ? 58 : (hasDocFile ? 42 : 32);
          const rowH = Math.max(minHeight, textHeight + 12);

          if (tableY + rowH > 750) {
            doc.addPage();
            tableY = 40;
            let newX = tableLeft;
            headers.forEach((h, i) => {
              doc.rect(newX, tableY, colW[i], headerH).fillAndStroke("#e2e8f0", "#000000");
              doc.fillColor("#000000").font("Times-Bold").fontSize(8);
              doc.text(h, newX + 2, tableY + 6, { width: colW[i] - 4, align: "center" });
              newX += colW[i];
            });
            tableY += headerH;
          }

          let rx = tableLeft;
          colW.forEach(w => { doc.rect(rx, tableY, w, rowH).fillAndStroke("#ffffff", "#000000"); rx += w; });

          doc.fillColor("#000000").font("Times-Roman").fontSize(8.5);
          doc.text(String(idx + 1), tableLeft, tableY + 6, { width: colW[0], align: "center" });

          const dateStr = jrn.tanggal || "-";
          doc.font("Times-Bold").fontSize(8);
          doc.text(dateStr, tableLeft + colW[0] + 4, tableY + 6, { width: colW[1] - 8, align: "center" });
          if (jrn.jam) {
            doc.font("Times-Roman").fontSize(7.5).fillColor("#475569");
            doc.text(jrn.jam, tableLeft + colW[0] + 4, doc.y + 2, { width: colW[1] - 8, align: "center" });
          }

          doc.fillColor("#000000").font("Times-Roman").fontSize(8.5);
          doc.text(taskText, tableLeft + colW[0] + colW[1] + 5, tableY + 6, { width: colW[2] - 10, align: "justify" });
          if (jrn.catatan) {
            doc.font("Times-Italic").fontSize(7.5).fillColor("#334155");
            doc.text(`Catatan: ${jrn.catatan}`, tableLeft + colW[0] + colW[1] + 5, doc.y + 2, { width: colW[2] - 10 });
          }

          doc.fillColor("#000000").font("Times-Roman").fontSize(8);
          doc.text(jrn.outputJumlah || "1 Dokumen", tableLeft + colW[0] + colW[1] + colW[2] + 4, tableY + 6, { width: colW[3] - 8, align: "center" });

          const col5X = tableLeft + colW[0] + colW[1] + colW[2] + colW[3] + 4;
          const col5W = colW[4] - 8;
          const baseAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
          let appUploadUrl = jrn.fileUrl || "";
          if (!appUploadUrl) {
            if (jrn.filePath) appUploadUrl = baseAppUrl ? `${baseAppUrl}/uploads/${path.basename(jrn.filePath)}` : `/uploads/${path.basename(jrn.filePath)}`;
            else if (jrn.fotoPath) appUploadUrl = baseAppUrl ? `${baseAppUrl}/uploads/${path.basename(jrn.fotoPath)}` : `/uploads/${path.basename(jrn.fotoPath)}`;
            else if (jrn.fileName) appUploadUrl = baseAppUrl ? `${baseAppUrl}/uploads/${jrn.fileName}` : `/uploads/${jrn.fileName}`;
          }
          const primaryLink = appUploadUrl || jrn.linkUrl || effectiveGdrive;

          if (jrn.att?.hasPhysicalFile && jrn.att.type === "photo") {
            const imgSource = jrn.att.filePath || (jrn.att.base64Data ? Buffer.from(jrn.att.base64Data, "base64") : null);
            let renderedThumb = false;
            if (imgSource) {
              try { doc.image(imgSource, col5X + 3, tableY + 4, { fit: [col5W - 6, 32], align: "center", valign: "center" }); renderedThumb = true; } catch (e) { renderedThumb = false; }
            }
            const labelY = renderedThumb ? tableY + 38 : tableY + 6;
            doc.fillColor("#0f172a").font("Times-Bold").fontSize(7);
            doc.text(`📎 Lampiran ${jrn.lampiranIndex}`, col5X, labelY, { width: col5W, align: "center" });
            doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(6.5);
            doc.text("🔗 Buka Foto", col5X, doc.y + 1, { width: col5W, align: "center", link: primaryLink, underline: true });
          } else if (jrn.att?.hasPhysicalFile) {
            doc.fillColor("#0f172a").font("Times-Bold").fontSize(7.5);
            doc.text(`📎 Lampiran ${jrn.lampiranIndex}`, col5X, tableY + 6, { width: col5W, align: "center" });
            const shortTrackName = (jrn.trackableName || jrn.fileName || "berkas.pdf").slice(0, 18);
            doc.fillColor("#475569").font("Times-Roman").fontSize(6.5);
            doc.text(shortTrackName, col5X, doc.y + 1, { width: col5W, align: "center" });
            doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(6.5);
            doc.text("🔗 Buka Berkas", col5X, doc.y + 1, { width: col5W, align: "center", link: primaryLink, underline: true });
          } else {
            const hasCustomLink = Boolean(jrn.linkUrl);
            doc.fillColor("#1d4ed8").font("Times-Bold").fontSize(7.5);
            doc.text(hasCustomLink ? "🔗 Tautan Online" : "🔗 Tautan Drive", col5X, tableY + 8, { width: col5W, align: "center", link: primaryLink, underline: true });
            doc.fillColor("#64748b").font("Times-Roman").fontSize(6.5);
            doc.text("Tautan Bukti Eviden", col5X, doc.y + 2, { width: col5W, align: "center" });
          }
          tableY += rowH;
        });
      }

      // -------------------------------------------------------------
      // 4. FOOTER TAUTAN GOOGLE DRIVE
      // -------------------------------------------------------------
      if (tableY + 130 > 770) {
        doc.addPage();
        tableY = 40;
      }

      doc.y = tableY + 12;
      doc.strokeColor("#94a3b8").dash(2, { space: 2 }).moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y).stroke().undash();
      doc.moveDown(0.5);

      doc.fillColor("#334155").font("Times-Roman").fontSize(8);
      doc.text(`* Dokumen asli dan seluruh berkas pendukung tersimpan secara digital pada Google Drive:`, tableLeft, doc.y);
      doc.moveDown(0.2);
      if (effectiveGdrive) {
        doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(8);
        doc.text(effectiveGdrive, tableLeft, doc.y, {
          link: effectiveGdrive,
          underline: true
        });
      } else {
        doc.fillColor("#64748b").font("Times-Italic").fontSize(8);
        doc.text("(Belum diisi - Contoh: https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz)", tableLeft, doc.y);
      }

      // -------------------------------------------------------------
      // 5. KOLOM TANDA TANGAN RESMI
      // -------------------------------------------------------------
      doc.moveDown(2);
      const signY = doc.y;
      const signColW = 220;

      // Kiri: Pejabat Penilai Kinerja
      doc.fillColor("#000000").font("Times-Roman").fontSize(9);
      doc.text("Pejabat Penilai Kinerja,", tableLeft, signY);
      doc.font("Times-Bold").text(penilai?.jabatan || "Kepala Sekolah", tableLeft, doc.y);
      doc.moveDown(3);
      doc.font("Times-Bold").fontSize(9).text(penilai?.nama || "ANDA SUPANDA, S.Pd, M.Pd", tableLeft, doc.y, { underline: true });
      doc.font("Times-Roman").fontSize(8.5).text(`NIP. ${penilai?.nip || "197505201998021001"}`, tableLeft, doc.y);
      doc.text(`Pangkat: ${penilai?.pangkat || "Pembina Tingkat I / IV/b"}`, tableLeft, doc.y);

      // Kanan: Pegawai yang Dinilai
      const rightX = tableLeft + tableWidth - signColW;
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      doc.font("Times-Roman").fontSize(9).text(`Samarinda, ${lastDay} ${monthName} ${year}`, rightX, signY);
      doc.text("Pegawai yang Dinilai,", rightX, doc.y);
      doc.moveDown(3);
      doc.font("Times-Bold").fontSize(9).text(pegawai?.nama || "MUHAMMAD FARRAS RAYHAND", rightX, doc.y, { underline: true });
      doc.font("Times-Roman").fontSize(8.5).text(`NIP. ${pegawai?.nip || "200011192025211007"}`, rightX, doc.y);
      doc.text(`Pangkat: ${pegawai?.pangkat || "Pengatur Muda / II/a"}`, rightX, doc.y);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Membuat Arsip ZIP Lengkap: Laporan PDF + Seluruh Lampiran Eviden Fisik
 */
export async function generateMonthlyReportZip({
  pegawai,
  penilai,
  journals = [],
  month = "07",
  year = "2026",
  gdriveLink = "",
  uploadsDir = DEFAULT_UPLOADS_DIR
}) {
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = NAMA_BULAN[monthIndex] || "Bulan";
  const cleanPegawaiName = (pegawai?.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");

  const pdfBuffer = await generateMonthlyReportPdf({ pegawai, penilai, journals, month, year, gdriveLink, uploadsDir });
  const pdfFileName = `Laporan_Kinerja_${monthName}_${year}_${cleanPegawaiName}.pdf`;

  const zip = new JSZip();
  zip.file(pdfFileName, pdfBuffer);

  const filtered = journals.filter(j => {
    if (!j.tanggal) return false;
    const [y, m] = j.tanggal.split("-");
    return y === String(year) && String(m).padStart(2, "0") === String(month).padStart(2, "0");
  });
  filtered.sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));

  let lampiranIndex = 0;
  const daftarLampiranEntries = [];

  for (const jrn of filtered) {
    const att = resolveJournalAttachment(jrn, uploadsDir);
    if (!att.hasPhysicalFile) continue;

    lampiranIndex++;
    const cleanDate = (jrn.tanggal || "tgl").replace(/[^0-9-]/g, "");
    const safeTitle = (jrn.aktivitas || "lampiran").slice(0, 30).toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const ext = att.ext?.startsWith(".") ? att.ext : `.${att.ext || "pdf"}`;
    const trackableFileName = `lampiran-${lampiranIndex}_${cleanDate}_${safeTitle}${ext}`;

    let fileBuffer = null;
    if (att.filePath && fs.existsSync(att.filePath)) {
      try { fileBuffer = fs.readFileSync(att.filePath); } catch (e) {}
    } else if (att.base64Data) {
      try { fileBuffer = Buffer.from(att.base64Data, "base64"); } catch (e) {}
    }

    if (fileBuffer) {
      zip.file(`lampiran/${trackableFileName}`, fileBuffer);
      daftarLampiranEntries.push({ no: lampiranIndex, fileName: trackableFileName, tanggal: jrn.tanggal || "-", aktivitas: jrn.aktivitas || "-", output: jrn.outputJumlah || "-" });
    }
  }

  let daftarText = `========================================================================\nDAFTAR LAMPIRAN BUKTI EVIDEN KINERJA PEGAWAI\nPeriode    : Bulan ${monthName} ${year}\nPegawai    : ${pegawai?.nama || "-"} (NIP: ${pegawai?.nip || "-"})\nJabatan    : ${pegawai?.jabatan || "-"}\nUnit Kerja : ${pegawai?.unitKerja || "-"}\n========================================================================\n\n`;
  if (daftarLampiranEntries.length === 0) {
    daftarText += `Tidak ada berkas fisik yang diunggah secara lokal untuk periode ini.\n`;
  } else {
    daftarText += `Daftar Berkas Lampiran Terunggah (${daftarLampiranEntries.length} berkas):\n------------------------------------------------------------------------\n`;
    daftarLampiranEntries.forEach(item => {
      daftarText += `[${item.no}] Lampiran ${item.no}: ${item.fileName}\n    - Tanggal  : ${item.tanggal}\n    - Aktivitas: ${item.aktivitas}\n    - Output   : ${item.output}\n\n`;
    });
  }
  daftarText += `------------------------------------------------------------------------\nPetunjuk Unggah ke Google Drive:\n1. Berkas PDF laporan resmi dan seluruh berkas lampiran eviden di atas telah\n   diberi penomoran runtut (lampiran-1, lampiran-2, dst.) agar mudah ditelusuri.\n2. Anda dapat langsung mengunggah arsip .ZIP ini atau mengekstrak folder\n   lampiran ke dalam folder Google Drive bukti dukung Anda.\n`;
  if (gdriveLink) daftarText += `3. Tautan Folder Google Drive Terdaftar: ${gdriveLink}\n`;
  daftarText += `========================================================================\n`;

  zip.file("DAFTAR_LAMPIRAN.txt", daftarText);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const zipFileName = `Paket_Laporan_Kinerja_${monthName}_${year}_${cleanPegawaiName}.zip`;

  return { zipBuffer, zipFileName, attachmentCount: daftarLampiranEntries.length, pdfBuffer, pdfFileName };
}
