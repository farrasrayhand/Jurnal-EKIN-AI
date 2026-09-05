import React, { useState, useMemo } from "react";
import { 
  FileText, Printer, Download, ExternalLink, Calendar, 
  Sparkles, CheckCircle2, Image as ImageIcon, Copy, Check, 
  UploadCloud, ArrowRight, UserCheck, Eye, Layers, X, Edit3, Package
} from "lucide-react";
import confetti from "canvas-confetti";
import JSZip from "jszip";

const MONTHS_LIST = [
  { id: "01", name: "Januari", year: "2026", range: "1 Januari s/d 31 Januari 2026" },
  { id: "02", name: "Februari", year: "2026", range: "1 Februari s/d 28 Februari 2026" },
  { id: "03", name: "Maret", year: "2026", range: "1 Maret s/d 31 Maret 2026" },
  { id: "04", name: "April", year: "2026", range: "1 April s/d 30 April 2026" },
  { id: "05", name: "Mei", year: "2026", range: "1 Mei s/d 31 Mei 2026" },
  { id: "06", name: "Juni", year: "2026", range: "1 Juni s/d 30 Juni 2026" },
  { id: "07", name: "Juli", year: "2026", range: "1 Juli s/d 31 Juli 2026" },
  { id: "08", name: "Agustus", year: "2026", range: "1 Agustus s/d 31 Agustus 2026" },
  { id: "09", name: "September", year: "2026", range: "1 September s/d 30 September 2026" },
  { id: "10", name: "Oktober", year: "2026", range: "1 Oktober s/d 31 Oktober 2026" },
  { id: "11", name: "November", year: "2026", range: "1 November s/d 30 November 2026" },
  { id: "12", name: "Desember", year: "2026", range: "1 Desember s/d 31 Desember 2026" }
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

export default function MonthlyReportGenerator({
  pegawai,
  setPegawai,
  rhkList,
  journals = [],
  pendekatan = "KUANTITATIF",
  onSyncLinkToRhk
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [copiedNarasi, setCopiedNarasi] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const EXAMPLE_GDRIVE_LINK = "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz";
  const [gdriveLink, setGdriveLink] = useState(() => {
    return localStorage.getItem("ekinerja_gdrive_link") || "";
  });
  const hasValidGdrive = Boolean(gdriveLink && gdriveLink.trim());
  const [isSavedLink, setIsSavedLink] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Simpan link Google Drive
  const handleSaveGdriveLink = () => {
    localStorage.setItem("ekinerja_gdrive_link", gdriveLink);
    setIsSavedLink(true);
    if (onSyncLinkToRhk) {
      onSyncLinkToRhk(gdriveLink);
    }
    setTimeout(() => setIsSavedLink(false), 2500);
  };

  // Filter jurnal berdasarkan bulan dan tahun terpilih
  const currentMonthData = useMemo(() => {
    const monthObj = MONTHS_LIST.find(m => m.id === selectedMonth) || MONTHS_LIST[6];
    const filteredJournals = journals.filter(j => {
      if (!j.tanggal) return false;
      const [y, m] = j.tanggal.split("-");
      return y === selectedYear && m === selectedMonth;
    });

    // Urutkan tanggal naik
    filteredJournals.sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));

    // Ekstrak berkas fisik terupload & berikan penomoran lampiran (lampiran-1, lampiran-2, dst.)
    let physicalCount = 0;
    const enrichedJournals = filteredJournals.map(j => {
      const hasPhysical = Boolean(
        (j.fotoUrl && (j.fotoUrl.startsWith("data:") || j.fotoUrl.includes("/uploads/"))) ||
        j.filePath ||
        j.fileName ||
        (j.fileUrl && j.fileUrl.includes("/uploads/"))
      );
      let lampiranIndex = 0;
      let trackableName = "";
      if (hasPhysical) {
        physicalCount++;
        lampiranIndex = physicalCount;
        const cleanDate = (j.tanggal || "tgl").replace(/[^0-9-]/g, "");
        const safeTitle = (j.aktivitas || "lampiran")
          .slice(0, 25)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        const ext = j.fotoUrl ? ".jpg" : (j.fileName ? (j.fileName.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".pdf") : ".pdf");
        trackableName = `lampiran-${lampiranIndex}_${monthObj.name}_${selectedYear}_${cleanDate}_${safeTitle}${ext}`;
      }
      return {
        ...j,
        hasPhysical,
        lampiranIndex,
        trackableName
      };
    });

    // Ekstrak foto dokumentasi
    const photoEvidences = enrichedJournals.filter(j => j.fotoUrl);

    // Hitung rekap per RHK
    const rhkStats = rhkList.map(rhk => {
      const matchCount = enrichedJournals.filter(j => j.rhkId === rhk.id).length;
      return {
        ...rhk,
        activityCount: matchCount
      };
    });

    return {
      monthObj,
      filteredJournals: enrichedJournals,
      photoEvidences,
      rhkStats,
      physicalCount
    };
  }, [journals, selectedMonth, selectedYear, rhkList]);

  // Generate Ringkasan Narasi Realisasi untuk BKN
  const narasiBkn = useMemo(() => {
    const count = currentMonthData.filteredJournals.length;
    const monthName = currentMonthData.monthObj.name;
    const taskHighlights = currentMonthData.filteredJournals
      .slice(0, 3)
      .map(j => j.aktivitas)
      .join(", ");

    if (count === 0) {
      return `Telah menyelesaikan seluruh penugasan kedinasan operasional dan administrasi pada bulan ${monthName} ${selectedYear} secara tepat waktu.`;
    }

    return `Terlaksananya ${count} kegiatan kinerja operasional pada bulan ${monthName} ${selectedYear}, meliputi ${taskHighlights.toLowerCase()}, dengan hasil kerja dan eviden yang terdokumentasi lengkap pada tautan penyimpanan digital.`;
  }, [currentMonthData, selectedYear]);

  const handleCopyNarasi = () => {
    navigator.clipboard.writeText(narasiBkn);
    setCopiedNarasi(true);
    setTimeout(() => setCopiedNarasi(false), 2500);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Handler Download PDF Langsung dari Server API
  const handleDownloadPdfDirect = async () => {
    setIsDownloadingPdf(true);
    try {
      const query = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        userId: pegawai?.id || "",
        gdriveLink: gdriveLink || ""
      });

      const res = await fetch(`/api/reports/pdf?${query.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const monthName = currentMonthData.monthObj.name;
        const cleanName = (pegawai?.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `Laporan_Kinerja_${monthName}_${selectedYear}_${cleanName}.pdf`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        confetti({ particleCount: 30, spread: 50 });
        return;
      }
      // Fallback ke window print jika API server tidak merespons
      handlePrint();
    } catch (e) {
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    const origTitle = document.title;
    const monthName = currentMonthData.monthObj.name;
    const cleanName = (pegawai?.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");
    document.title = `Laporan_Kinerja_${monthName}_${selectedYear}_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1200);
  };

  // Handler Download Paket Arsip ZIP (Laporan PDF + Seluruh Berkas Lampiran Terunggah)
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const query = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        userId: pegawai?.id || "",
        gdriveLink: gdriveLink || ""
      });

      const res = await fetch(`/api/reports/zip?${query.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        let filename = `Paket_Laporan_Kinerja_${currentMonthData.monthObj.name}_${selectedYear}.zip`;
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        confetti({ particleCount: 50, spread: 60 });
        return;
      }
      throw new Error("Server API tidak merespons berkas ZIP");
    } catch (err) {
      console.warn("Mencoba fallback unduh ZIP client-side:", err.message);
      await handleClientSideZipDownload();
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Fallback client-side JSZip jika koneksi ke server API terputus
  const handleClientSideZipDownload = async () => {
    try {
      const zip = new JSZip();
      const monthName = currentMonthData.monthObj.name;
      const cleanName = (pegawai.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");

      let daftarText = `========================================================================\nDAFTAR LAMPIRAN BUKTI EVIDEN KINERJA PEGAWAI\nPeriode    : Bulan ${monthName} ${selectedYear}\nPegawai    : ${pegawai.nama || "-"} (NIP: ${pegawai.nip || "-"})\nJabatan    : ${pegawai.jabatan || "-"}\nUnit Kerja : ${pegawai.unitKerja || "-"}\n========================================================================\n\n`;

      const attachments = [];
      for (const jrn of currentMonthData.filteredJournals) {
        if (!jrn.hasPhysical) continue;
        const lampiranFileName = jrn.trackableName || `lampiran-${jrn.lampiranIndex}_${monthName}_${selectedYear}.jpg`;

        if (jrn.fotoUrl && jrn.fotoUrl.startsWith("data:")) {
          const b64 = jrn.fotoUrl.replace(/^data:[^;]+;base64,/, "");
          zip.file(`lampiran_${monthName}_${selectedYear}/${lampiranFileName}`, b64, { base64: true });
          zip.file(`lampiran/${lampiranFileName}`, b64, { base64: true });
        } else if (jrn.fileUrl || jrn.fotoUrl) {
          try {
            const fRes = await fetch(jrn.fileUrl || jrn.fotoUrl);
            if (fRes.ok) {
              const bBlob = await fRes.blob();
              zip.file(`lampiran_${monthName}_${selectedYear}/${lampiranFileName}`, bBlob);
              zip.file(`lampiran/${lampiranFileName}`, bBlob);
            }
          } catch (e) {}
        }

        attachments.push({
          no: jrn.lampiranIndex,
          name: lampiranFileName,
          tanggal: jrn.tanggal,
          aktivitas: jrn.aktivitas,
          output: jrn.outputJumlah
        });
      }

      if (attachments.length === 0) {
        daftarText += `Tidak ada berkas fisik yang diunggah secara lokal untuk periode ini.\nSeluruh bukti eviden dapat diakses melalui tautan digital online pada laporan.\n`;
      } else {
        daftarText += `Daftar Berkas Lampiran Terunggah (${attachments.length} berkas):\n------------------------------------------------------------------------\n`;
        attachments.forEach(item => {
          daftarText += `[${item.no}] Lampiran ${item.no}: ${item.name}\n    - Tanggal  : ${item.tanggal || "-"}\n    - Aktivitas: ${item.aktivitas || "-"}\n    - Output   : ${item.output || "-"}\n\n`;
        });
      }

      daftarText += `------------------------------------------------------------------------\nPetunjuk Unggah ke Google Drive:\n1. Berkas laporan dan seluruh berkas lampiran di atas telah diberi penomoran\n   runtut (lampiran-1, lampiran-2, dst.) untuk memudahkan pelacakan.\n2. Tautan folder Google Drive terdaftar: ${gdriveLink}\n========================================================================\n`;

      zip.file("DAFTAR_LAMPIRAN.txt", daftarText);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Paket_Laporan_Kinerja_${monthName}_${selectedYear}_${cleanName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      alert("Gagal membuat berkas ZIP: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR CONTROLLER ATAS (Disembunyikan saat dicetak) */}
      <div className="glass-card no-print p-5" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ 
              width: "42px", 
              height: "42px", 
              borderRadius: "10px", 
              background: "rgba(37, 99, 235, 0.12)", 
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>Generator Laporan Bulanan (Siap Cetak PDF)</span>
                <span className="badge badge-utama" style={{ fontSize: "0.72rem" }}>
                  Otomatis dari Jurnal
                </span>
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Pilih bulan, lalu sistem akan menyusun tabel laporan bulanan lengkap dengan rincian kegiatan dan foto dokumentasi.
              </p>
            </div>
          </div>

          {/* Tombol Aksi Utama Cetak PDF & Edit Identitas */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {setPegawai && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditProfileOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontWeight: "600",
                  padding: "0.5rem 1rem"
                }}
                title="Sesuaikan Nama, NIP, Pangkat, Jabatan Pegawai untuk Laporan"
              >
                <Edit3 size={15} />
                <span>Ubah Data Pegawai</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                color: "#ffffff",
                border: "none",
                padding: "0.5rem 1.25rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                cursor: isDownloadingZip ? "not-allowed" : "pointer"
              }}
              title="Unduh Paket Arsip ZIP (Laporan PDF + Seluruh Lampiran Terupload untuk Google Drive)"
            >
              {isDownloadingZip ? (
                <span>⏳ Menyiapkan ZIP...</span>
              ) : (
                <>
                  <Download size={16} />
                  <span>Unduh Paket Laporan (.ZIP)</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadPdfDirect}
              disabled={isDownloadingPdf}
              style={{
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                color: "#ffffff",
                border: "none",
                padding: "0.5rem 1.1rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
                cursor: isDownloadingPdf ? "not-allowed" : "pointer"
              }}
              title="Unduh berkas PDF Laporan Bulanan Resmi langsung dari server"
            >
              {isDownloadingPdf ? (
                <span>⏳ Mengunduh PDF...</span>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Unduh PDF Langsung</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                background: "#2563eb",
                borderColor: "#2563eb",
                padding: "0.5rem 1.25rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
              }}
            >
              <Printer size={16} />
              <span>Cetak / Dialog PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Pilihan Periode Bulan & Google Drive Sync */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          background: "var(--bg-tertiary)",
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)"
        }}>
          {/* 1. Pilih Bulan Laporan */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem" }}>
              <Calendar size={14} style={{ display: "inline", marginRight: "4px" }} />
              Pilih Bulan Laporan:
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ flex: 2, fontWeight: "600" }}
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.range})
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ flex: 1, fontWeight: "600" }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Ditemukan <strong>{currentMonthData.filteredJournals.length} kegiatan</strong> &amp; <strong>{currentMonthData.photoEvidences.length} foto eviden</strong> di bulan ini.
            </span>
          </div>

          {/* 2. Link Google Drive Bukti Dukung */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem" }}>
              <UploadCloud size={14} style={{ display: "inline", marginRight: "4px" }} />
              Link Folder Google Drive (Untuk BUKTI DUKUNG BKN):
            </label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="url"
                className="input-field"
                value={gdriveLink}
                onChange={(e) => setGdriveLink(e.target.value)}
                placeholder="Contoh: https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
                style={{ fontSize: "0.82rem" }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSaveGdriveLink}
                title="Simpan Link ke BKN Bukti Dukung"
                style={{ whiteSpace: "nowrap" }}
              >
                {isSavedLink ? <Check size={14} className="text-emerald-500" /> : "Simpan"}
              </button>
              <a
                href={gdriveLink || "https://drive.google.com"}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-icon btn-sm"
                title={gdriveLink ? "Buka Folder Google Drive di Tab Baru" : "Buka Google Drive"}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Upload file PDF hasil cetak ini ke Google Drive, lalu copy link-nya ke form Bukti Dukung BKN.
            </span>
          </div>
        </div>

        {/* Kotak Ringkasan Narasi Realisasi BKN Siap Salin */}
        <div style={{
          marginTop: "1rem",
          padding: "0.85rem 1rem",
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem"
        }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--accent-emerald)", textTransform: "uppercase" }}>
              💡 Narasi Realisasi Siap Paste ke e-Kinerja BKN ({currentMonthData.monthObj.name} {selectedYear}):
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", margin: "4px 0 0 0", fontStyle: "italic" }}>
              "{narasiBkn}"
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleCopyNarasi}
            style={{
              background: copiedNarasi ? "#10b981" : "#ffffff",
              color: copiedNarasi ? "#ffffff" : "#1e293b",
              border: "1px solid #cbd5e1",
              fontSize: "0.78rem",
              fontWeight: "600"
            }}
          >
            {copiedNarasi ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedNarasi ? "Tersalin!" : "Salin Narasi"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN DOKUMEN RESMI A4 (DICETAK ATAU DIPRINT KE PDF) */}
      {/* ========================================================================= */}
      <div 
        id="monthly-report-sheet"
        style={{
          background: "#ffffff",
          color: "#000000",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "11pt",
          lineHeight: "1.4",
          padding: "20mm 20mm",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderRadius: "4px",
          maxWidth: "210mm",
          margin: "0 auto",
          boxSizing: "border-box"
        }}
      >
        {/* JUDUL LAPORAN */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: "14pt", 
            fontWeight: "bold", 
            textTransform: "uppercase", 
            textDecoration: "underline",
            letterSpacing: "0.5px"
          }}>
            LAPORAN BULANAN KINERJA PEGAWAI
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "11pt", fontWeight: "bold" }}>
            BULAN: {currentMonthData.monthObj.name.toUpperCase()} TAHUN {selectedYear}
          </p>
        </div>

        {/* BAGIAN I: DATA PEGAWAI */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "6px" }}>
            I. DATA PEGAWAI
          </div>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            fontSize: "10pt",
            border: "1px solid #000000"
          }}>
            <tbody>
              <tr>
                <td style={{ width: "170px", padding: "5px 10px", border: "1px solid #000000", fontWeight: "600", background: "#f8fafc" }}>
                  Nama Pegawai
                </td>
                <td style={{ padding: "5px 10px", border: "1px solid #000000" }}>
                  : <strong>{pegawai.nama || "MUHAMMAD FARRAS RAYHAND"}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", border: "1px solid #000000", fontWeight: "600", background: "#f8fafc" }}>
                  NIP
                </td>
                <td style={{ padding: "5px 10px", border: "1px solid #000000" }}>
                  : {pegawai.nip || "200011192025211007"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", border: "1px solid #000000", fontWeight: "600", background: "#f8fafc" }}>
                  Pangkat / Golongan
                </td>
                <td style={{ padding: "5px 10px", border: "1px solid #000000" }}>
                  : {pegawai.pangkat || "Pengatur Muda / II/a"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", border: "1px solid #000000", fontWeight: "600", background: "#f8fafc" }}>
                  Jabatan
                </td>
                <td style={{ padding: "5px 10px", border: "1px solid #000000" }}>
                  : {pegawai.jabatan || "Pengadministrasi Perkantoran"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", border: "1px solid #000000", fontWeight: "600", background: "#f8fafc" }}>
                  Unit Kerja
                </td>
                <td style={{ padding: "5px 10px", border: "1px solid #000000" }}>
                  : {pegawai.unitKerja || "SMK N 07 SAMARINDA"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BAGIAN II: TABEL KEGIATAN DAN FOTO DOKUMENTASI */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "6px" }}>
            II. TABEL KEGIATAN DAN FOTO DOKUMENTASI
          </div>
          {currentMonthData.filteredJournals.length === 0 ? (
            <div style={{ 
              border: "1px dashed #94a3b8", 
              padding: "12px", 
              textAlign: "center", 
              fontSize: "10pt",
              fontStyle: "italic",
              color: "#64748b" 
            }}>
              Belum ada data jurnal pada bulan {currentMonthData.monthObj.name} {selectedYear}. 
              Silakan isi jurnal di tab "Jurnal &amp; Bukti Foto" atau pilih bulan yang memiliki data (misal: Juli).
            </div>
          ) : (
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse", 
              fontSize: "9pt", 
              border: "1px solid #000000" 
            }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "center" }}>
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "5%" }}>No</th>
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "16%" }}>Hari / Tanggal</th>
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "42%" }}>Uraian Tugas / Aktivitas Kedinasan</th>
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "17%" }}>Output / Hasil Kerja</th>
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "20%" }}>Bukti Eviden / Lampiran</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthData.filteredJournals.map((jrn, idx) => (
                  <tr key={jrn.id || idx}>
                    <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center", verticalAlign: "top" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #000000", padding: "5px", verticalAlign: "top", textAlign: "center" }}>
                      {getHariIndonesia(jrn.tanggal) && (
                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "8.5pt" }}>
                          {getHariIndonesia(jrn.tanggal)}
                        </div>
                      )}
                      <div style={{ fontWeight: getHariIndonesia(jrn.tanggal) ? "500" : "700", fontSize: "8pt", color: "#334155" }}>
                        {jrn.tanggal}
                      </div>
                      {jrn.jam && (
                        <div style={{ fontSize: "7.5pt", color: "#64748b", marginTop: "2px" }}>
                          {jrn.jam}
                        </div>
                      )}
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "justify", verticalAlign: "top" }}>
                      {jrn.aktivitas}
                      {jrn.catatan && (
                        <div style={{ fontSize: "8pt", fontStyle: "italic", color: "#334155", marginTop: "2px" }}>
                          Catatan: {jrn.catatan}
                        </div>
                      )}
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center", verticalAlign: "top" }}>
                      {jrn.outputJumlah || "1 Dokumen / Kegiatan"}
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center", verticalAlign: "middle" }}>
                      {/* 1. Foto Dokumentasi Terupload */}
                      {jrn.fotoUrl && (
                        <div style={{ marginBottom: "5px" }}>
                          <img 
                            src={jrn.fotoUrl} 
                            alt={`Foto kegiatan ${idx + 1}`} 
                            style={{ 
                              width: "85px", 
                              height: "58px", 
                              objectFit: "cover", 
                              borderRadius: "2px", 
                              border: "1px solid #000000",
                              display: "block",
                              margin: "0 auto 2px auto"
                            }} 
                          />
                          {jrn.lampiranIndex > 0 && (
                            <div style={{ fontSize: "6.8pt", fontWeight: "bold", color: "#1e40af", marginBottom: "2px" }}>
                              📎 Lampiran {jrn.lampiranIndex}
                            </div>
                          )}
                          <a 
                            href={jrn.fileUrl || jrn.fotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="preview-only-link"
                            style={{ fontSize: "7pt", color: "#1d4ed8", textDecoration: "underline", fontWeight: "bold", display: "inline-block" }}
                            title="Klik untuk membuka/melihat foto resolusi penuh"
                          >
                            🔗 Buka Foto
                          </a>
                        </div>
                      )}

                      {/* 2. Berkas Dokumen Fisik non-foto Terupload */}
                      {(!jrn.fotoUrl && (jrn.fileName || jrn.fileUrl || jrn.filePath)) && (
                        <div style={{ fontSize: "7.5pt", color: "#334155", marginBottom: "4px" }}>
                          {jrn.lampiranIndex > 0 && (
                            <div style={{ fontSize: "7pt", fontWeight: "bold", color: "#1e40af", marginBottom: "2px" }}>
                              📎 Lampiran {jrn.lampiranIndex}
                            </div>
                          )}
                          {/* Saat Cetak: Tampilkan nama berkas tanpa hyperlink */}
                          <div className="print-only-text" style={{ display: "none", fontSize: "7pt", fontWeight: "bold", color: "#000000" }}>
                            {jrn.trackableName || jrn.fileName}
                          </div>
                          {/* Saat Preview Web: Tampilkan link berkas yang bisa diklik */}
                          <a 
                            href={jrn.fileUrl || (jrn.filePath ? `/uploads/${jrn.filePath.split(/[/\\]/).pop()}` : `/uploads/${jrn.fileName}`)}
                            target="_blank"
                            rel="noreferrer"
                            className="preview-only-link"
                            style={{ color: "#1d4ed8", textDecoration: "underline", fontWeight: "bold", display: "block", wordBreak: "break-all" }}
                            title={jrn.trackableName || jrn.fileName}
                          >
                            {jrn.trackableName || jrn.fileName || "Buka Berkas"}
                          </a>
                          {jrn.fileSize && <span style={{ fontSize: "6.5pt", color: "#64748b", display: "block" }}>({jrn.fileSize})</span>}
                        </div>
                      )}

                      {/* 3. Tautan Online / Drive (jika bukan berkas upload, "kalau link baru link aja") */}
                      {(jrn.linkUrl && jrn.linkUrl !== jrn.fileUrl && !jrn.hasPhysical) ? (
                        <div style={{ marginTop: jrn.fotoUrl ? "4px" : "0", fontSize: "7.5pt", lineHeight: "1.25" }}>
                          {/* Saat Cetak: Tampilkan keterangan teks tanpa tautan biru */}
                          <div className="print-only-text" style={{ display: "none", fontSize: "7pt", color: "#000000" }}>
                            Tautan Online Bukti Eviden
                          </div>
                          {/* Saat Preview Web: Tampilkan link */}
                          <a 
                            href={jrn.linkUrl || jrn.driveLink || jrn.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="preview-only-link"
                            style={{ 
                              color: "#1d4ed8", 
                              textDecoration: "underline", 
                              fontWeight: "bold",
                              display: "inline-block",
                              marginBottom: "2px"
                            }}
                          >
                            🔗 Tautan Online
                          </a>
                          <div 
                            className="preview-only-link"
                            style={{ 
                              fontSize: "6.5pt", 
                              color: "#475569", 
                              wordBreak: "break-all",
                              maxWidth: "140px", 
                              margin: "0 auto",
                              fontFamily: "monospace",
                              lineHeight: "1.1"
                            }} 
                            title={jrn.linkUrl || jrn.driveLink || jrn.link}
                          >
                            {jrn.linkUrl || jrn.driveLink || jrn.link}
                          </div>
                        </div>
                      ) : (!jrn.fotoUrl && !jrn.fileName && !jrn.fileUrl && !jrn.filePath && !jrn.linkUrl) && (
                        <span style={{ fontSize: "7.5pt", color: "#64748b", fontStyle: "italic" }}>Log Kegiatan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* TAUTAN PENYIMPANAN DIGITAL DI GOOGLE DRIVE (FOOTER RESMI - HANYA JIKA DIISI) */}
        {hasValidGdrive && (
          <div style={{ 
            marginTop: "25px", 
            paddingTop: "8px", 
            borderTop: "1px dashed #000000", 
            fontSize: "8.5pt", 
            color: "#334155" 
          }}>
            <span>* Dokumen asli dan seluruh berkas pendukung tersimpan secara digital pada Google Drive:{' '}</span>
            <a 
              href={gdriveLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                fontFamily: "monospace", 
                color: "#1d4ed8", 
                textDecoration: "underline", 
                fontWeight: "600",
                cursor: "pointer",
                wordBreak: "break-all"
              }}
              title="Klik untuk langsung membuka folder Google Drive di tab baru"
            >
              {gdriveLink}
            </a>
          </div>
        )}
      </div>

      {/* Modal Edit Identitas Pegawai */}
      {isEditProfileOpen && setPegawai && (
        <div 
          className="no-print"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem"
          }}
        >
          <div style={{
            background: "var(--bg-primary)",
            borderRadius: "var(--radius-lg)",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "var(--shadow-xl)",
            border: "1px solid var(--border-subtle)",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)" }}>
                <UserCheck size={18} className="text-blue-500" />
                <span>Ubah Identitas Pegawai</span>
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => setIsEditProfileOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap &amp; Gelar</label>
                <input
                  type="text"
                  className="input-field"
                  value={pegawai.nama || ""}
                  onChange={(e) => setPegawai({ ...pegawai, nama: e.target.value })}
                  placeholder="Contoh: MUHAMMAD FARRAS RAYHAND"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">NIP</label>
                  <input
                    type="text"
                    className="input-field"
                    value={pegawai.nip || ""}
                    onChange={(e) => setPegawai({ ...pegawai, nip: e.target.value })}
                    placeholder="Contoh: 200011192025211007"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pangkat / Golongan</label>
                  <input
                    type="text"
                    className="input-field"
                    value={pegawai.pangkat || ""}
                    onChange={(e) => setPegawai({ ...pegawai, pangkat: e.target.value })}
                    placeholder="Contoh: Pengatur Muda / II/a"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Jabatan</label>
                  <input
                    type="text"
                    className="input-field"
                    value={pegawai.jabatan || ""}
                    onChange={(e) => setPegawai({ ...pegawai, jabatan: e.target.value })}
                    placeholder="Contoh: Pengadministrasi Perkantoran"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Kerja / Sekolah</label>
                  <input
                    type="text"
                    className="input-field"
                    value={pegawai.unitKerja || ""}
                    onChange={(e) => setPegawai({ ...pegawai, unitKerja: e.target.value })}
                    placeholder="Contoh: SMK N 07 SAMARINDA"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  <Check size={15} /> Selesai &amp; Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
