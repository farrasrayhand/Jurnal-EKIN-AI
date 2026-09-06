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
 * Mendapatkan nama hari dalam bahasa Indonesia (Senin s/d Minggu)
 */
export function getHariIndonesia(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    const clean = dateStr.trim().slice(0, 10);
    const [y, m, d] = clean.split("-").map(Number);
    if (!y || !m || !d) return "";
    const dt = new Date(y, m - 1, d);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dt.getDay()] || "";
  } catch (e) {
    return "";
  }
}

/**
 * Menemukan file fisik eviden dari sebuah entri jurnal jika diunggah ke sistem
 */
function resolveSingleAttachmentItem(item, uploadsDir) {
  if (!item) return null;

  // 1. Cek targetPath (filePath atau fotoPath)
  let targetPath = item.filePath || item.fotoPath || "";
  if (targetPath) {
    let resolved = targetPath;
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(uploadsDir, resolved);
    }
    if (fs.existsSync(resolved)) {
      const ext = path.extname(resolved).toLowerCase() || ".pdf";
      const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      return {
        hasPhysicalFile: true,
        type: item.type === "image" || isImg ? "photo" : "document",
        filePath: resolved,
        fileName: item.fileName || path.basename(resolved),
        ext,
        fileUrl: item.fileUrl || ""
      };
    }
  }

  // 2. Cek base64 data URI di fotoUrl atau dataUrl
  const dataCandidate = item.fotoUrl || item.dataUrl || "";
  if (typeof dataCandidate === "string" && dataCandidate.startsWith("data:")) {
    const extMatch = dataCandidate.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
    const ext = extMatch ? `.${extMatch[1] === "jpeg" ? "jpg" : extMatch[1]}` : ".jpg";
    const base64Clean = dataCandidate.replace(/^data:[^;]+;base64,/, "");
    return {
      hasPhysicalFile: true,
      type: "photo",
      base64Data: base64Clean,
      fileName: item.fileName || `foto_kegiatan${ext}`,
      ext,
      fileUrl: item.fileUrl || ""
    };
  }

  // 3. Cek fileUrl / fotoUrl yang memuat /uploads/
  const urlCandidate = item.fileUrl || item.fotoUrl || "";
  if (typeof urlCandidate === "string" && urlCandidate.includes("/uploads/")) {
    const bName = path.basename(urlCandidate.split("?")[0]);
    const candidate = path.join(uploadsDir, bName);
    if (fs.existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase() || ".pdf";
      const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      return {
        hasPhysicalFile: true,
        type: isImg ? "photo" : "document",
        filePath: candidate,
        fileName: item.fileName || bName,
        ext,
        fileUrl: item.fileUrl || urlCandidate
      };
    }
  }

  // 4. Cek fileName di folder uploadsDir
  if (item.fileName && typeof item.fileName === "string") {
    const candidate = path.join(uploadsDir, path.basename(item.fileName));
    if (fs.existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase() || ".pdf";
      const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      return {
        hasPhysicalFile: true,
        type: isImg ? "photo" : "document",
        filePath: candidate,
        fileName: item.fileName,
        ext,
        fileUrl: item.fileUrl || ""
      };
    }
  }

  return null;
}

/**
 * Menyelesaikan seluruh berkas eviden/lampiran fisik terkait jurnal (Multi-Attachment)
 */
export function resolveAllJournalAttachments(jrn, uploadsDir = DEFAULT_UPLOADS_DIR) {
  if (!jrn) return [];
  const results = [];
  const seenPaths = new Set();

  // 1. Jika jurnal memiliki properti attachments (array)
  if (Array.isArray(jrn.attachments) && jrn.attachments.length > 0) {
    for (const att of jrn.attachments) {
      const resolved = resolveSingleAttachmentItem(att, uploadsDir);
      if (resolved && resolved.hasPhysicalFile) {
        const key = resolved.filePath || resolved.fileName || resolved.fileUrl;
        if (!seenPaths.has(key)) {
          seenPaths.add(key);
          results.push(resolved);
        }
      }
    }
  }

  // 2. Fallback jika attachments array kosong, cari dari properti legacy jurnal langsung
  if (results.length === 0) {
    const legacyResolved = resolveSingleAttachmentItem(jrn, uploadsDir);
    if (legacyResolved && legacyResolved.hasPhysicalFile) {
      results.push(legacyResolved);
    }
  }

  return results;
}

/**
 * Mengambil lampiran pertama (untuk kebutuhan single view / thumbnail)
 */
export function resolveJournalAttachment(jrn, uploadsDir = DEFAULT_UPLOADS_DIR) {
  const all = resolveAllJournalAttachments(jrn, uploadsDir);
  return all.length > 0 ? all[0] : { hasPhysicalFile: false };
}

/**
 * Membuat buffer PDF Laporan Kinerja Bulanan
 */
export function generateMonthlyReportPdf({
  pegawai,
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

      const tableLeft = 35;
      const tableWidth = 525;
      const col1Width = 145;
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

      const colW = [22, 72, 240, 90, 101];
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

      // Sort ascending: tanggal terlama dulu (urutan kronologis)
      filtered.sort((a, b) => {
        const dateA = (a.tanggal || "") + (a.jam || "");
        const dateB = (b.tanggal || "") + (b.jam || "");
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
      });

      let physicalCount = 0;
      const enrichedJournals = filtered.map(jrn => {
        const atts = resolveAllJournalAttachments(jrn, uploadsDir);
        let lampiranIndex = 0;
        let trackableName = "";
        let lampiranLabel = "";
        if (atts.length > 0) {
          physicalCount++;
          lampiranIndex = physicalCount;
          const cleanDate = (jrn.tanggal || "tgl").replace(/[^0-9-]/g, "");
          const safeTitle = (jrn.aktivitas || "lampiran")
            .slice(0, 25)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
          if (atts.length === 1) {
            const ext = atts[0].ext?.startsWith(".") ? atts[0].ext : `.${atts[0].ext || "pdf"}`;
            trackableName = `lampiran-${lampiranIndex}_${cleanDate}_${safeTitle}${ext}`;
            lampiranLabel = `Lampiran ${lampiranIndex}`;
          } else {
            trackableName = `lampiran-${lampiranIndex}.1_${cleanDate}_${safeTitle}${atts[0].ext || ".pdf"}`;
            lampiranLabel = `${atts.length} Berkas (Lampiran ${lampiranIndex}.1 - ${lampiranIndex}.${atts.length})`;
          }
        }
        return {
          ...jrn,
          att: atts[0] || { hasPhysicalFile: false },
          allAtts: atts,
          lampiranIndex,
          trackableName,
          lampiranLabel
        };
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
          const totalAttCount = (jrn.allAtts || []).length;
          const photoAtt = (jrn.allAtts || []).find(a => a.type === "photo") || (jrn.att?.type === "photo" ? jrn.att : null);
          const docAtt = (jrn.allAtts || []).find(a => a.type !== "photo");
          const hasLink = Boolean(jrn.linkUrl);
          const hasRef = Boolean(jrn.fileUrl || jrn.filePath || jrn.fileName);

          const col5W = colW[4] - 6;
          let col5H = 0;
          doc.fontSize(6);
          if (totalAttCount > 0 || hasRef) {
            const rawFileName = photoAtt?.fileName || docAtt?.fileName || jrn.trackableName || jrn.fileName || "berkas";
            col5H = doc.heightOfString(rawFileName, { width: col5W }) + 18;
          } else if (hasLink) {
            col5H = doc.heightOfString(jrn.linkUrl, { width: col5W }) + 10;
          }

          const minHeight = 36;
          const rowH = Math.max(minHeight, textHeight + 14, col5H);

          if (tableY + rowH > 730) {
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

          const hariName = getHariIndonesia(jrn.tanggal);
          const dateStr = jrn.tanggal || "-";

          let curDateY = tableY + 5;
          if (hariName) {
            doc.font("Times-Bold").fontSize(8).fillColor("#000000");
            doc.text(hariName, tableLeft + colW[0] + 3, curDateY, { width: colW[1] - 6, align: "center" });
            curDateY = doc.y + 1;
          }

          doc.font(hariName ? "Times-Roman" : "Times-Bold").fontSize(7.5).fillColor("#000000");
          doc.text(dateStr, tableLeft + colW[0] + 3, curDateY, { width: colW[1] - 6, align: "center" });
          curDateY = doc.y + 2;

          if (jrn.jam) {
            doc.font("Times-Roman").fontSize(7).fillColor("#475569");
            doc.text(jrn.jam, tableLeft + colW[0] + 3, curDateY, { width: colW[1] - 6, align: "center" });
          }

          doc.fillColor("#000000").font("Times-Roman").fontSize(8.5);
          doc.text(taskText, tableLeft + colW[0] + colW[1] + 5, tableY + 6, { width: colW[2] - 10, align: "justify" });
          if (jrn.catatan) {
            doc.font("Times-Italic").fontSize(7.5).fillColor("#334155");
            doc.text(`Catatan: ${jrn.catatan}`, tableLeft + colW[0] + colW[1] + 5, doc.y + 2, { width: colW[2] - 10 });
          }

          doc.fillColor("#000000").font("Times-Roman").fontSize(8);
          doc.text(jrn.outputJumlah || "1 Dokumen", tableLeft + colW[0] + colW[1] + colW[2] + 4, tableY + 6, { width: colW[3] - 8, align: "center" });

          // ── Kolom 5: Bukti Eviden / Lampiran ──────────────────────────────
          // PENTING: Jangan gunakan doc.y setelah ini — gunakan posisi Y eksplisit
          // agar teks rapi dan simetris di tengah baris tabel
          const col5X = tableLeft + colW[0] + colW[1] + colW[2] + colW[3] + 3;

          if (totalAttCount > 0 || hasRef) {
            // ── Berkas fisik terunggah (Foto / Dokumen) ──
            // Tampilkan label lampiran + nama berkas LENGKAP tanpa terpotong
            const rawFileName = photoAtt?.fileName || docAtt?.fileName || jrn.trackableName || jrn.fileName || "berkas";
            const lampLabel = jrn.lampiranLabel || (jrn.lampiranIndex > 0 ? `Lampiran ${jrn.lampiranIndex}` : "Lampiran");

            doc.font("Times-Roman").fontSize(6);
            const nameHeight = doc.heightOfString(rawFileName, { width: col5W });
            const blockHeight = 11 + nameHeight;
            const startY = tableY + Math.max(4, Math.floor((rowH - blockHeight) / 2));

            doc.fillColor("#1e3a5f").font("Times-Bold").fontSize(7.5);
            doc.text(lampLabel, col5X, startY, { width: col5W, align: "center" });

            doc.fillColor("#334155").font("Times-Roman").fontSize(6);
            doc.text(rawFileName, col5X, startY + 11, { width: col5W, align: "center" });

          } else if (hasLink) {
            // ── Tautan online (Google Drive, dll.) ──
            // Tulis link lengkap dan aktif bisa diklik
            doc.font("Times-Roman").fontSize(6);
            const linkHeight = doc.heightOfString(jrn.linkUrl, { width: col5W });
            const startY = tableY + Math.max(4, Math.floor((rowH - linkHeight) / 2));

            doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(6);
            doc.text(jrn.linkUrl, col5X, startY, {
              width: col5W,
              align: "center",
              link: jrn.linkUrl,
              underline: true
            });

          } else {
            // ── Tidak ada lampiran maupun link ──
            doc.fillColor("#94a3b8").font("Times-Italic").fontSize(8);
            doc.text("-", col5X, tableY + Math.floor(rowH / 2) - 4, { width: col5W, align: "center" });
          }

          tableY += rowH;
        });
      }

      // -------------------------------------------------------------
      // 4. FOOTER TAUTAN GOOGLE DRIVE (Hanya jika link diisi)
      // -------------------------------------------------------------
      if (effectiveGdrive) {
        if (tableY + 130 > 770) {
          doc.addPage();
          tableY = 40;
        }

        doc.y = tableY + 12;
        doc.strokeColor("#94a3b8").dash(2, { space: 2 }).moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y).stroke().undash();
        doc.moveDown(0.5);

        doc.fillColor("#334155").font("Times-Roman").fontSize(8);
        doc.text(`* Dokumen asli dan seluruh berkas pendukung tersimpan secara digital pada Google Drive:`, tableLeft, doc.y);
        doc.moveDown(0.3);

        doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(8.5);
        doc.text(effectiveGdrive, tableLeft, doc.y, {
          link: effectiveGdrive,
          underline: true
        });

        doc.moveDown(1.0);
      }

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
  journals = [],
  month = "07",
  year = "2026",
  gdriveLink = "",
  uploadsDir = DEFAULT_UPLOADS_DIR
}) {
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = NAMA_BULAN[monthIndex] || "Bulan";
  const cleanPegawaiName = (pegawai?.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");

  const pdfBuffer = await generateMonthlyReportPdf({ pegawai, journals, month, year, gdriveLink, uploadsDir });
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
    const atts = resolveAllJournalAttachments(jrn, uploadsDir);
    if (atts.length === 0) continue;

    lampiranIndex++;
    const cleanDate = (jrn.tanggal || "tgl").replace(/[^0-9-]/g, "");
    const safeTitle = (jrn.aktivitas || "lampiran")
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    atts.forEach((att, subIdx) => {
      const isMulti = atts.length > 1;
      const subNum = subIdx + 1;
      const ext = att.ext?.startsWith(".") ? att.ext : `.${att.ext || "pdf"}`;
      const safeAttName = (att.fileName ? path.basename(att.fileName, path.extname(att.fileName)) : `berkas_${subNum}`)
        .slice(0, 20)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");

      const trackableFileName = isMulti
        ? `lampiran-${lampiranIndex}.${subNum}_${monthName}_${year}_${cleanDate}_${safeTitle}_${safeAttName}${ext}`
        : `lampiran-${lampiranIndex}_${monthName}_${year}_${cleanDate}_${safeTitle}${ext}`;

      const labelNumber = isMulti ? `${lampiranIndex}.${subNum}` : `${lampiranIndex}`;

      let fileBuffer = null;
      if (att.filePath && fs.existsSync(att.filePath)) {
        try { fileBuffer = fs.readFileSync(att.filePath); } catch (e) {}
      } else if (att.base64Data) {
        try { fileBuffer = Buffer.from(att.base64Data, "base64"); } catch (e) {}
      }

      if (fileBuffer) {
        zip.file(`lampiran_${monthName}_${year}/${trackableFileName}`, fileBuffer);
        zip.file(`lampiran/${trackableFileName}`, fileBuffer);
        daftarLampiranEntries.push({
          no: labelNumber,
          fileName: trackableFileName,
          tanggal: jrn.tanggal || "-",
          aktivitas: jrn.aktivitas || "-",
          output: jrn.outputJumlah || "-",
          type: att.type === "photo" ? "Foto Dokumentasi" : "Dokumen Berkas"
        });
      }
    });
  }

  let daftarText = `========================================================================\nDAFTAR LAMPIRAN BUKTI EVIDEN KINERJA PEGAWAI\nPeriode    : Bulan ${monthName} ${year}\nPegawai    : ${pegawai?.nama || "-"} (NIP: ${pegawai?.nip || "-"})\nJabatan    : ${pegawai?.jabatan || "-"}\nUnit Kerja : ${pegawai?.unitKerja || "-"}\n========================================================================\n\n`;
  if (daftarLampiranEntries.length === 0) {
    daftarText += `Tidak ada berkas fisik yang diunggah secara lokal untuk periode ini.\n`;
  } else {
    daftarText += `Daftar Berkas Lampiran Terunggah (${daftarLampiranEntries.length} berkas):\n------------------------------------------------------------------------\n`;
    daftarLampiranEntries.forEach(item => {
      daftarText += `[${item.no}] Lampiran ${item.no}: ${item.fileName} (${item.type})\n    - Tanggal  : ${item.tanggal}\n    - Aktivitas: ${item.aktivitas}\n    - Output   : ${item.output}\n\n`;
    });
  }
  daftarText += `------------------------------------------------------------------------\nPetunjuk Unggah ke Google Drive:\n1. Berkas PDF laporan resmi dan seluruh berkas lampiran eviden di atas telah\n   diberi penomoran runtut (lampiran-1, lampiran-2, dst.) agar mudah ditelusuri.\n2. Jika satu kegiatan memuat beberapa berkas, nomor lampiran bertingkat (misal: lampiran-1.1, lampiran-1.2).\n3. Anda dapat langsung mengunggah arsip .ZIP ini atau mengekstrak folder\n   lampiran ke dalam folder Google Drive bukti dukung Anda.\n`;
  if (gdriveLink) daftarText += `4. Tautan Folder Google Drive Terdaftar: ${gdriveLink}\n`;
  daftarText += `========================================================================\n`;

  zip.file("DAFTAR_LAMPIRAN.txt", daftarText);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const zipFileName = `Paket_Laporan_Kinerja_${monthName}_${year}_${cleanPegawaiName}.zip`;

  return { zipBuffer, zipFileName, attachmentCount: daftarLampiranEntries.length, pdfBuffer, pdfFileName };
}
