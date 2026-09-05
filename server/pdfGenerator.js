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
          const hasPhoto = (jrn.allAtts || []).some(a => a.type === "photo");
          const hasDocFile = (jrn.allAtts || []).some(a => a.type !== "photo");
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

          const totalAttCount = (jrn.allAtts || []).length;
          const photoAtt = (jrn.allAtts || []).find(a => a.type === "photo") || (jrn.att?.type === "photo" ? jrn.att : null);

          if (totalAttCount > 0) {
            if (photoAtt) {
              const imgSource = photoAtt.filePath || (photoAtt.base64Data ? Buffer.from(photoAtt.base64Data, "base64") : null);
              let renderedThumb = false;
              if (imgSource) {
                try { doc.image(imgSource, col5X + 3, tableY + 4, { fit: [col5W - 6, 30], align: "center", valign: "center" }); renderedThumb = true; } catch (e) { renderedThumb = false; }
              }
              const labelY = renderedThumb ? tableY + 36 : tableY + 6;
              doc.fillColor("#0f172a").font("Times-Bold").fontSize(totalAttCount > 1 ? 6.5 : 7);
              doc.text(`📎 ${jrn.lampiranLabel}`, col5X, labelY, { width: col5W, align: "center" });
              doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(6.5);
              doc.text(totalAttCount > 1 ? `🔗 Buka ${totalAttCount} Berkas` : "🔗 Buka Foto", col5X, doc.y + 1, { width: col5W, align: "center", link: primaryLink, underline: true });
            } else {
              doc.fillColor("#0f172a").font("Times-Bold").fontSize(totalAttCount > 1 ? 6.5 : 7.5);
              doc.text(`📎 ${jrn.lampiranLabel}`, col5X, tableY + 6, { width: col5W, align: "center" });
              const shortTrackName = (jrn.trackableName || jrn.fileName || "berkas.pdf").slice(0, 18);
              doc.fillColor("#475569").font("Times-Roman").fontSize(6.5);
              doc.text(shortTrackName, col5X, doc.y + 1, { width: col5W, align: "center" });
              doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(6.5);
              doc.text(totalAttCount > 1 ? `🔗 Buka ${totalAttCount} Berkas` : "🔗 Buka Berkas", col5X, doc.y + 1, { width: col5W, align: "center", link: primaryLink, underline: true });
            }
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
      doc.moveDown(0.3);

      doc.fillColor("#1d4ed8").font("Times-Roman").fontSize(8.5);
      doc.text(effectiveGdrive, tableLeft, doc.y, {
        link: effectiveGdrive,
        underline: true
      });

      doc.moveDown(1.5);

      // -------------------------------------------------------------
      // 5. TANDA TANGAN (PEJABAT PENILAI & PEGAWAI)
      // -------------------------------------------------------------
      const signY = doc.y;
      const signColW = tableWidth / 2;

      // Kiri: Pejabat Penilai Kinerja
      doc.fillColor("#000000").font("Times-Roman").fontSize(9);
      doc.text("Pejabat Penilai Kinerja,", tableLeft, signY);
      doc.moveDown(3);
      doc.font("Times-Bold").fontSize(9).text(penilai?.nama || "ANDA SUPANDA, S.Pd, M.Pd", tableLeft, doc.y, { underline: true });
      doc.font("Times-Roman").fontSize(8.5).text(`NIP. ${penilai?.nip || "197505201998021001"}`, tableLeft, doc.y);
      doc.text(`Pangkat: ${penilai?.pangkat || "Pembina Tingkat I / IV/b"}`, tableLeft, doc.y);

      // Kanan: Pegawai yang Dinilai
      const rightX = tableLeft + signColW;
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
