import React, { useState } from "react";
import { 
  Calendar, 
  Printer, 
  Send, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles, 
  MessageSquare, 
  Award, 
  AlertCircle, 
  ChevronRight, 
  FileCheck,
  ThumbsUp,
  X,
  Check
} from "lucide-react";
import confetti from "canvas-confetti";

// Opsi Master Pilihan Periode Penilaian BKN
const ALL_PERIOD_OPTIONS = [
  { id: "jan", key: "JANUARI", label: "[TAHUN 2026 ] JANUARI", start: "1 Januari 2026", end: "31 Januari 2026", batas: "10 Februari 2026" },
  { id: "feb", key: "FEBRUARI", label: "[TAHUN 2026 ] FEBRUARI", start: "1 Februari 2026", end: "28 Februari 2026", batas: "10 Maret 2026" },
  { id: "mar", key: "MARET", label: "[TAHUN 2026 ] MARET", start: "1 Maret 2026", end: "31 Maret 2026", batas: "10 April 2026" },
  { id: "apr", key: "APRIL", label: "[TAHUN 2026 ] APRIL", start: "1 April 2026", end: "30 April 2026", batas: "10 Mei 2026" },
  { id: "mei", key: "MEI", label: "[TAHUN 2026 ] MEI", start: "1 Mei 2026", end: "31 Mei 2026", batas: "10 Juni 2026" },
  { id: "jun", key: "JUNI", label: "[TAHUN 2026 ] JUNI", start: "1 Juni 2026", end: "30 Juni 2026", batas: "10 Juli 2026" },
  { id: "jul", key: "JULI", label: "[TAHUN 2026 ] JULI", start: "1 Juli 2026", end: "31 Juli 2026", batas: "10 Agustus 2026" },
  { id: "agu", key: "AGUSTUS", label: "[TAHUN 2026 ] AGUSTUS", start: "1 Agustus 2026", end: "31 Agustus 2026", batas: "10 September 2026" },
  { id: "sep", key: "SEPTEMBER", label: "[TAHUN 2026 ] SEPTEMBER", start: "1 September 2026", end: "30 September 2026", batas: "10 Oktober 2026" },
  { id: "okt", key: "OKTOBER", label: "[TAHUN 2026 ] OKTOBER", start: "1 Oktober 2026", end: "31 Oktober 2026", batas: "10 November 2026" },
  { id: "nov", key: "NOVEMBER", label: "[TAHUN 2026 ] NOVEMBER", start: "1 November 2026", end: "30 November 2026", batas: "10 Desember 2026" },
  { id: "des", key: "FINAL", label: "[TAHUN 2026 ] FINAL 2026 (FINAL)", start: "1 Desember 2026", end: "31 Desember 2026", batas: "10 Januari 2027" },
];

// Daftar Periode Penilaian Periodik Awal
const INITIAL_PERIODS = [
  { id: "jan", name: "JANUARI", start: "1 Januari 2026", end: "31 Januari 2026", batas: "10 Februari 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "feb", name: "FEBRUARI", start: "1 Februari 2026", end: "28 Februari 2026", batas: "10 Maret 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "mar", name: "MARET", start: "1 Maret 2026", end: "31 Maret 2026", batas: "10 April 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "apr", name: "APRIL", start: "1 April 2026", end: "30 April 2026", batas: "10 Mei 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "mei", name: "MEI", start: "1 Mei 2026", end: "31 Mei 2026", batas: "10 Juni 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "jun", name: "JUNI", start: "1 Juni 2026", end: "30 Juni 2026", batas: "10 Juli 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Final", siasn: true },
  { id: "jul", name: "JULI", start: "1 Juli 2026", end: "31 Juli 2026", batas: "10 Agustus 2026", capaianOrg: "Sesuai", polaDistribusi: "Sesuai", predikatOrg: "Baik", predikatPegawai: "Baik", status: "Belum Final", siasn: false },
  { id: "agu", name: "AGUSTUS", start: "1 Agustus 2026", end: "31 Agustus 2026", batas: "10 September 2026", capaianOrg: "-", polaDistribusi: "-", predikatOrg: "-", predikatPegawai: "Baik", status: "Belum Final", siasn: false },
  { id: "sep", name: "SEPTEMBER", start: "1 September 2026", end: "30 September 2026", batas: "10 Oktober 2026", capaianOrg: "-", polaDistribusi: "-", predikatOrg: "-", predikatPegawai: "Baik", status: "Belum Final", siasn: false },
  { id: "okt", name: "OKTOBER", start: "1 Oktober 2026", end: "31 Oktober 2026", batas: "10 November 2026", capaianOrg: "-", polaDistribusi: "-", predikatOrg: "-", predikatPegawai: "Baik", status: "Belum Final", siasn: false },
  { id: "nov", name: "NOVEMBER", start: "1 November 2026", end: "30 November 2026", batas: "10 Desember 2026", capaianOrg: "-", polaDistribusi: "-", predikatOrg: "-", predikatPegawai: "Baik", status: "Belum Final", siasn: false },
  { id: "des", name: "FINAL 2026 (FINAL)", start: "1 Desember 2026", end: "31 Desember 2026", batas: "10 Januari 2027", capaianOrg: "-", polaDistribusi: "-", predikatOrg: "-", predikatPegawai: "Sangat Baik", status: "Belum Final", siasn: false },
];

export default function PenilaianSection({
  pegawai,
  penilai,
  periode,
  rhkList,
  berakhlakList,
  journals = [],
  onOpenRealisasiModal,
  onOpenPrintModal
}) {
  const [periods, setPeriods] = useState(() => {
    try {
      const saved = localStorage.getItem("ekinerja_periods");
      return saved ? JSON.parse(saved) : INITIAL_PERIODS;
    } catch (e) {
      return INITIAL_PERIODS;
    }
  });

  const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);
  const [selectedPeriodToAdd, setSelectedPeriodToAdd] = useState("");

  const [activeRencanaAksiModal, setActiveRencanaAksiModal] = useState(null);
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null);
  const [rencanaAksiData, setRencanaAksiData] = useState(() => {
    try {
      const saved = localStorage.getItem("ekinerja_rencana_aksi");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [feedbackData, setFeedbackData] = useState(() => {
    try {
      const saved = localStorage.getItem("ekinerja_feedback");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Simpan ke localStorage
  React.useEffect(() => {
    localStorage.setItem("ekinerja_periods", JSON.stringify(periods));
  }, [periods]);

  React.useEffect(() => {
    localStorage.setItem("ekinerja_rencana_aksi", JSON.stringify(rencanaAksiData));
  }, [rencanaAksiData]);

  React.useEffect(() => {
    localStorage.setItem("ekinerja_feedback", JSON.stringify(feedbackData));
  }, [feedbackData]);

  // Tambah Periode Penilaian (Mirrors BKN Modal Action)
  const handleConfirmAddPeriod = () => {
    if (!selectedPeriodToAdd) {
      alert("Silakan pilih Periode Penilaian terlebih dahulu!");
      return;
    }

    const template = ALL_PERIOD_OPTIONS.find(o => o.id === selectedPeriodToAdd);
    if (!template) return;

    const exists = periods.find(p => p.id === template.id);
    if (exists) {
      alert(`Periode ${template.label} sudah ada dalam daftar.`);
      setIsAddPeriodModalOpen(false);
      const el = document.getElementById(`period-card-${template.id}`);
      el?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const newPeriod = {
      id: template.id,
      name: template.key === "FINAL" ? "FINAL 2026 (FINAL)" : template.key,
      start: template.start,
      end: template.end,
      batas: template.batas,
      capaianOrg: "-",
      polaDistribusi: "-",
      predikatOrg: "-",
      predikatPegawai: "Baik",
      status: "Belum Final",
      siasn: false
    };

    setPeriods(prev => [...prev, newPeriod]);
    setIsAddPeriodModalOpen(false);
    setSelectedPeriodToAdd("");

    setTimeout(() => {
      const el = document.getElementById(`period-card-${newPeriod.id}`);
      el?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Simulasi Kirim ke SIASN BKN
  const handleKirimSiasn = (periodId) => {
    setPeriods(prev => prev.map(p => {
      if (p.id === periodId) {
        return { ...p, siasn: true, status: "Final" };
      }
      return p;
    }));

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    alert("Sinkronisasi Berhasil! Data Evaluasi Kinerja Periodik telah berhasil dikirim dan tercatat di database SIASN BKN.");
  };

  // Generate Rencana Aksi Otomatis dengan AI
  const handleGenerateRencanaAksi = (periodName) => {
    if (!rhkList || rhkList.length === 0) {
      return "Menyusun dan melaksanakan tugas operasional kedinasan secara optimal.";
    }
    const items = rhkList.map((r, idx) => {
      const title = r.rhkIndividu || "Penugasan kerja";
      return `${idx + 1}. Melaksanakan tahapan kegiatan ${title.toLowerCase()} untuk pemenuhan target bulan ${periodName}.`;
    });
    return items.join("\n\n");
  };

  return (
    <div className="glass-card mb-6" style={{ padding: "1.5rem" }}>
      {/* Header Halaman Penilaian BKN */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
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
            <Calendar size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Penilaian Kinerja Periodik (BKN)</span>
              <span className="badge badge-utama" style={{ fontSize: "0.72rem" }}>
                12 Periode + Final
              </span>
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Menu Pengisian Rencana Aksi, Bukti Dukung Bulanan, Feedback Perilaku, dan Kirim ke SIASN BKN
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button 
            type="button"
            className="btn btn-sm"
            style={{ 
              background: "#22c55e", 
              color: "#ffffff", 
              border: "none", 
              fontSize: "0.82rem", 
              fontWeight: "600",
              padding: "0.45rem 0.9rem",
              borderRadius: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
            onClick={() => setIsAddPeriodModalOpen(true)}
          >
            <span>+ Tambah Periode Penilaian</span>
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const julIdx = periods.findIndex(p => p.id === "jul");
              if (julIdx !== -1) {
                const el = document.getElementById(`period-card-jul`);
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <Clock size={14} />
            <span>Loncat ke Bulan Berjalan (Juli)</span>
          </button>
        </div>
      </div>

      {/* Info Banner BKN */}
      <div style={{
        background: "rgba(59, 130, 246, 0.06)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1.25rem",
        fontSize: "0.82rem",
        color: "var(--text-primary)",
        lineHeight: "1.55",
        marginBottom: "1.5rem"
      }}>
        <strong>💡 Alur Penilaian Kinerja Periodik ASN (PermenPAN-RB No. 6 Tahun 2022):</strong>
        <br />
        1. Klik <strong>Rencana Aksi</strong> untuk mendefinisikan target kegiatan spesifik pada bulan tersebut.
        <br />
        2. Klik <strong>Pengisian Bukti Dukung dan Lihat Hasil</strong> untuk melampirkan eviden (foto/dokumen/link drive) serta realisasi.
        <br />
        3. Pimpinan memberikan <strong>Feedback Perilaku</strong> (BerAKHLAK), lalu klik <strong>Kirim ke SIASN</strong> setelah penilaian disepakati.
      </div>

      {/* List Kartu Periode Penilaian Bulanan (Mirrors BKN) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {periods.map((p) => {
          const isJuli = p.id === "jul";
          const isAgustus = p.id === "agu";
          const hasRencanaAksi = Boolean(rencanaAksiData[p.id]);

          return (
            <div 
              key={p.id}
              id={`period-card-${p.id}`}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: isJuli ? "0 2px 10px rgba(59, 130, 246, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
                color: "#1e293b"
              }}
            >
              {/* Header Box Periode (Atas: Tanggal & Atasan) */}
              <div style={{
                padding: "1rem 1.25rem 0.75rem 1.25rem",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "1rem"
              }}>
                {/* Sisi Kiri: Nama Bulan & Batas Waktu */}
                <div>
                  <h3 style={{ 
                    fontSize: "1.05rem", 
                    fontWeight: "700", 
                    color: "#334155", 
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {p.name}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                    {p.start} s/d {p.end}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                    Batas : <span style={{ color: "#334155" }}>{p.batas}</span>
                  </div>
                </div>
              </div>

              {/* Baris Tombol Cetak & SIASN (Tepat di bawah info tanggal, sisi kiri sesuai BKN) */}
              <div style={{
                padding: "0 1.25rem 0.85rem 1.25rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center"
              }}>
                <button 
                  className="btn btn-sm"
                  style={{ 
                    background: "#22c55e", 
                    color: "#ffffff", 
                    border: "none", 
                    fontSize: "0.78rem",
                    fontWeight: "500",
                    padding: "0.4rem 0.85rem",
                    borderRadius: "4px"
                  }}
                  onClick={onOpenPrintModal}
                  title="Cetak Form Penilaian Kinerja Periodik"
                >
                  Cetak Form Penilaian
                </button>
                <button 
                  className="btn btn-sm"
                  style={{ 
                    background: "#22c55e", 
                    color: "#ffffff", 
                    border: "none", 
                    fontSize: "0.78rem",
                    fontWeight: "500",
                    padding: "0.4rem 0.85rem",
                    borderRadius: "4px"
                  }}
                  onClick={onOpenPrintModal}
                  title="Cetak Dokumen Evaluasi Kinerja Resmi"
                >
                  Cetak Dokumen Evaluasi Kinerja
                </button>
                <button 
                  className="btn btn-sm"
                  style={{ 
                    background: p.siasn ? "#10b981" : "#3b82f6", 
                    color: "#ffffff", 
                    border: "none", 
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    padding: "0.4rem 0.85rem",
                    borderRadius: "4px"
                  }}
                  onClick={() => handleKirimSiasn(p.id)}
                  title="Sinkronisasi hasil penilaian periodik ke SIASN BKN"
                >
                  {p.siasn ? "Tersinkron SIASN" : "Kirim ke SIASN"}
                </button>
              </div>

              {/* Kotak Evaluasi & Action Buttons (Sesuai 100% Kotak BKN) */}
              <div style={{ 
                borderTop: "1px solid #cbd5e1", 
                overflowX: "auto",
                background: "#ffffff"
              }}>
                <table style={{ 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  fontSize: "0.88rem", 
                  textAlign: "center" 
                }}>
                  <tbody>
                    <tr style={{ minHeight: "140px" }}>
                      {/* Kolom 1: Capaian Kinerja Organisasi */}
                      <td style={{ 
                        padding: "1.5rem 0.75rem", 
                        borderRight: "1px solid #cbd5e1", 
                        width: "15%",
                        verticalAlign: "middle",
                        color: "#334155"
                      }}>
                        {p.capaianOrg}
                      </td>

                      {/* Kolom 2: Pola Distribusi */}
                      <td style={{ 
                        padding: "1.5rem 0.75rem", 
                        borderRight: "1px solid #cbd5e1", 
                        width: "15%",
                        verticalAlign: "middle",
                        color: "#334155"
                      }}>
                        {p.polaDistribusi}
                      </td>

                      {/* Kolom 3: Predikat Kinerja Organisasi */}
                      <td style={{ 
                        padding: "1.5rem 0.75rem", 
                        borderRight: "1px solid #cbd5e1", 
                        width: "15%",
                        verticalAlign: "middle",
                        color: "#334155"
                      }}>
                        {p.predikatOrg}
                      </td>

                      {/* Kolom 4: Predikat Pegawai & Status Final/Belum Final */}
                      <td style={{ 
                        padding: "1.5rem 0.75rem", 
                        borderRight: "1px solid #cbd5e1", 
                        width: "18%",
                        verticalAlign: "middle"
                      }}>
                        <div style={{ color: "#334155", fontWeight: "500", marginBottom: "4px" }}>
                          {p.predikatPegawai}
                        </div>
                        <div style={{ 
                          fontSize: "0.82rem", 
                          color: p.status === "Final" ? "#16a34a" : "#ef4444",
                          fontWeight: "500" 
                        }}>
                          {p.status}
                        </div>
                      </td>

                      {/* Kolom 5: Aksi (Tombol Vertikal BKN) */}
                      <td style={{ 
                        padding: "1rem 1.25rem", 
                        textAlign: "left", 
                        width: "37%",
                        verticalAlign: "middle"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "320px" }}>
                          {/* 1. Tombol Rencana Aksi (Merah/Coral) */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ 
                              background: "#ef4444", 
                              color: "#ffffff", 
                              border: "none", 
                              fontSize: "0.8rem", 
                              fontWeight: "500",
                              justifyContent: "flex-start",
                              padding: "0.4rem 0.85rem",
                              borderRadius: "4px"
                            }}
                            onClick={() => setActiveRencanaAksiModal(p)}
                          >
                            <span>Rencana Aksi</span>
                          </button>

                          {/* 2. Tombol Pengisian Bukti Dukung dan Lihat Hasil (Biru) */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ 
                              background: "#3b82f6", 
                              color: "#ffffff", 
                              border: "none", 
                              fontSize: "0.8rem", 
                              fontWeight: "500",
                              justifyContent: "flex-start",
                              padding: "0.4rem 0.85rem",
                              borderRadius: "4px"
                            }}
                            onClick={() => {
                              const firstRhk = rhkList[0];
                              if (firstRhk) {
                                onOpenRealisasiModal(firstRhk);
                              } else {
                                alert("Belum ada RHK terdaftar. Buat RHK terlebih dahulu di tab Matriks SKP!");
                              }
                            }}
                          >
                            <span>Pengisian Bukti Dukung dan Lihat Hasil</span>
                          </button>

                          {/* 3. Tombol Feedback Perilaku (Cyan/Toska) */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ 
                              background: "#06b6d4", 
                              color: "#ffffff", 
                              border: "none", 
                              fontSize: "0.8rem", 
                              fontWeight: "500",
                              justifyContent: "flex-start",
                              padding: "0.4rem 0.85rem",
                              borderRadius: "4px"
                            }}
                            onClick={() => setActiveFeedbackModal(p)}
                          >
                            <span>Feedback Perilaku</span>
                          </button>

                          {/* 4. Tombol Ajukan Keberatan & Pembinaan (Khusus bulan yang selesai/dinilai, misal Juli) */}
                          {isJuli && (
                            <div style={{ display: "flex", gap: "0.4rem", marginTop: "2px" }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ 
                                  background: "#ef4444", 
                                  color: "#ffffff", 
                                  border: "none", 
                                  fontSize: "0.78rem",
                                  fontWeight: "500",
                                  padding: "0.35rem 0.75rem",
                                  borderRadius: "4px"
                                }}
                                onClick={() => alert("Form Ajukan Keberatan: Fitur pengajuan banding bila ASN merasa capaian evaluasi tidak sesuai.")}
                              >
                                Ajukan Keberatan
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ 
                                  background: "#94a3b8", 
                                  color: "#ffffff", 
                                  border: "none", 
                                  fontSize: "0.78rem",
                                  fontWeight: "500",
                                  padding: "0.35rem 0.75rem",
                                  borderRadius: "4px"
                                }}
                                onClick={() => alert("Catatan Pembinaan: Tindak lanjut pembinaan kinerja berkala oleh Pejabat Penilai Kinerja.")}
                              >
                                Pembinaan
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: RENCANA AKSI */}
      {activeRencanaAksiModal && (
        <div className="modal-overlay" onClick={() => setActiveRencanaAksiModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "8px", 
                  background: "rgba(244, 63, 94, 0.12)", 
                  color: "#f43f5e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                    Rencana Aksi Periode {activeRencanaAksiModal.name} 2026
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Penetapan target output kegiatan spesifik untuk mendukung ketercapaian RHK
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setActiveRencanaAksiModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" style={{ fontWeight: "700" }}>
                  Daftar Rencana Aksi / Rincian Kegiatan:
                </label>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const aiGenerated = handleGenerateRencanaAksi(activeRencanaAksiModal.name);
                    setRencanaAksiData(prev => ({
                      ...prev,
                      [activeRencanaAksiModal.id]: aiGenerated
                    }));
                  }}
                  title="Generate otomatis butir rencana aksi berdasarkan RHK yang terdaftar"
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Generate Rencana Aksi AI</span>
                </button>
              </div>

              <textarea 
                className="textarea-field"
                rows={8}
                value={rencanaAksiData[activeRencanaAksiModal.id] || ""}
                onChange={(e) => setRencanaAksiData({
                  ...rencanaAksiData,
                  [activeRencanaAksiModal.id]: e.target.value
                })}
                placeholder={`Contoh:\n1. Melakukan pemeliharaan rutin server dan infrastruktur jaringan sekolah minggu ke-1 & ke-3.\n2. Melakukan monitoring berkala konektivitas internet kelas dan lab komputer.\n3. Menyusun laporan rekapitulasi monitoring jaringan akhir bulan ${activeRencanaAksiModal.name}.`}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveRencanaAksiModal(null)}>
                Tutup
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setActiveRencanaAksiModal(null);
                  alert(`Rencana aksi periode ${activeRencanaAksiModal.name} berhasil disimpan!`);
                }}
              >
                <Check size={16} /> Simpan Rencana Aksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FEEDBACK PERILAKU */}
      {activeFeedbackModal && (
        <div className="modal-overlay" onClick={() => setActiveFeedbackModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "760px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "8px", 
                  background: "rgba(6, 182, 212, 0.12)", 
                  color: "#06b6d4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                    Umpan Balik Perilaku (Feedback) Periode {activeFeedbackModal.name}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Evaluasi berkelanjutan Core Values BerAKHLAK oleh Pejabat Penilai Kinerja
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setActiveFeedbackModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {berakhlakList.map((b) => {
                const currentFeedback = feedbackData[`${activeFeedbackModal.id}_${b.id}`] || "Sesuai Ekspektasi, pertahankan kinerja prima dan kedisiplinan.";

                return (
                  <div 
                    key={b.id}
                    style={{
                      padding: "0.85rem 1rem",
                      background: "var(--bg-tertiary)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <strong style={{ fontSize: "0.9rem", color: "var(--accent-primary)" }}>{b.name}</strong>
                      </div>
                      <span className="badge badge-utama" style={{ fontSize: "0.7rem" }}>
                        👍 Sesuai Ekspektasi
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Catatan Feedback Atasan:
                      </label>
                      <input 
                        type="text"
                        className="input-field"
                        value={currentFeedback}
                        onChange={(e) => setFeedbackData({
                          ...feedbackData,
                          [`${activeFeedbackModal.id}_${b.id}`]: e.target.value
                        })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveFeedbackModal(null)}>
                Tutup
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setActiveFeedbackModal(null);
                  alert(`Catatan Feedback Perilaku periode ${activeFeedbackModal.name} berhasil disimpan!`);
                }}
              >
                <Check size={16} /> Simpan Feedback
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: TAMBAH PERIODE PENILAIAN (EXACT BKN MATCH) */}
      {isAddPeriodModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddPeriodModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: "560px", background: "#ffffff", color: "#1e293b", padding: "0", overflow: "hidden", borderRadius: "8px" }}
          >
            {/* Header Modal */}
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "600", color: "#334155", margin: 0 }}>
                Tambah Periode Penilaian
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddPeriodModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: "1.25rem" }}>
              {/* Alert Biru BKN */}
              <div style={{
                background: "#0284c7",
                color: "#ffffff",
                borderRadius: "4px",
                padding: "0.85rem 1rem",
                fontSize: "0.82rem",
                lineHeight: "1.5",
                fontWeight: "500",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                Periode Penilaian <strong>AKHIR / FINAL / TAHUNAN</strong> hanya bisa ditambahkan di <strong>SKP JABATAN DEFINITIF</strong> dengan <strong>PERIODE AKHIR SKP - 31 DESEMBER</strong> (Periode SKP Terakhir jika pegawai memiliki beberapa Periode SKP dikarenakan Mutasi)
              </div>

              {/* Form Input Dropdown */}
              <div style={{ marginTop: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#475569", marginBottom: "0.4rem" }}>
                  Pilih Periode Penilaian:
                </label>
                <select
                  className="form-select"
                  value={selectedPeriodToAdd}
                  onChange={(e) => setSelectedPeriodToAdd(e.target.value)}
                >
                  <option value="">-- Pilih Periode Penilaian --</option>
                  {ALL_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: "0.85rem 1.25rem",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.6rem"
            }}>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddPeriodModalOpen(false)}
                style={{ padding: "0.45rem 1rem", borderRadius: "4px" }}
              >
                Batal
              </button>
              <button 
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmAddPeriod}
                style={{ 
                  background: "#3b82f6", 
                  borderColor: "#3b82f6", 
                  color: "#ffffff",
                  padding: "0.45rem 1.25rem", 
                  borderRadius: "4px",
                  fontWeight: "600"
                }}
              >
                OK / Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer BKN Resmi */}
      <div style={{ 
        textAlign: "right", 
        marginTop: "2.5rem", 
        paddingTop: "1rem",
        borderTop: "1px solid var(--border-subtle)", 
        color: "var(--text-muted)", 
        fontSize: "0.82rem" 
      }}>
        2022 © Badan Kepegawaian Negara
      </div>
    </div>
  );
}
