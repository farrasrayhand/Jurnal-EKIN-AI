import React, { useState } from "react";
import { X, Sparkles, Check, FileCheck, Layers, FileText } from "lucide-react";
import { generateSmartRealisasi, generateSmartRealisasiKualitatif, deriveUkuranKeberhasilan } from "../services/aiService";

export default function RealisasiModal({
  isOpen,
  onClose,
  rhk,
  onSaveRhk,
  pendekatan = "KUANTITATIF"
}) {
  if (!isOpen || !rhk) return null;

  const isKualitatif = pendekatan === "KUALITATIF";
  const [aspekList, setAspekList] = useState([...(rhk.aspekList || [])]);
  const [ukuranKeberhasilan, setUkuranKeberhasilan] = useState(
    rhk.ukuranKeberhasilan || deriveUkuranKeberhasilan(rhk)
  );
  const [realisasiKualitatif, setRealisasiKualitatif] = useState(
    rhk.realisasiKualitatif || rhk.aspekList?.[0]?.realisasiDefault || ""
  );
  const [buktiDukungKualitatif, setBuktiDukungKualitatif] = useState(
    rhk.aspekList?.[0]?.buktiDukungDefault || "Laporan Kinerja Bulanan, SPT"
  );

  const handleUpdateField = (idx, field, value) => {
    const updated = [...aspekList];
    updated[idx] = { ...updated[idx], [field]: value };
    setAspekList(updated);
  };

  const handleGenerateNarasi = (idx) => {
    const asp = aspekList[idx];
    const narasi = generateSmartRealisasi(asp.aspek, asp.target, asp.indikator);
    handleUpdateField(idx, "realisasiDefault", narasi);
  };

  const handleGenerateNarasiKualitatif = () => {
    const narasi = generateSmartRealisasiKualitatif(rhk);
    setRealisasiKualitatif(narasi);
  };

  const handleSave = () => {
    if (isKualitatif) {
      // Sinkronkan juga aspekList[0] agar tetap kompatibel
      const syncedAspekList = aspekList.length > 0 ? aspekList.map((asp, idx) => ({
        ...asp,
        buktiDukungDefault: buktiDukungKualitatif,
        realisasiDefault: idx === 0 ? realisasiKualitatif : asp.realisasiDefault
      })) : [];

      onSaveRhk({
        ...rhk,
        ukuranKeberhasilan,
        realisasiKualitatif,
        aspekList: syncedAspekList
      });
    } else {
      onSaveRhk({
        ...rhk,
        aspekList
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "840px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ 
              width: "36px", 
              height: "36px", 
              borderRadius: "8px", 
              background: "rgba(37, 99, 235, 0.12)", 
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FileCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Kelola Bukti Dukung & Realisasi Kinerja</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Penyusunan narasi evaluasi periodik dan dokumen pendukung SKP
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Info Singkat RHK */}
          <div style={{ 
            padding: "1rem", 
            background: "var(--bg-tertiary)", 
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              <span className={`badge ${rhk.jenis === "UTAMA" ? "badge-utama" : "badge-tambahan"}`}>
                {rhk.jenis}
              </span>
              <strong style={{ fontSize: "0.9rem" }}>RHK:</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.5" }}>
              {rhk.rhkIndividu}
            </p>
          </div>

          {/* Form Realisasi: Kualitatif vs Kuantitatif */}
          {isKualitatif ? (
            <div 
              style={{
                padding: "1.25rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-md)"
              }}
            >
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                marginBottom: "0.85rem",
                flexWrap: "wrap",
                gap: "0.5rem" 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)", fontWeight: "600" }}>
                    Pendekatan Kualitatif
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    PermenPAN-RB No. 6 Tahun 2022
                  </span>
                </div>

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateNarasiKualitatif}
                  title="Buat kalimat narasi capaian kualitatif otomatis berdasarkan RHK"
                >
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Generate Narasi AI Kualitatif</span>
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Ukuran Keberhasilan / Target Deskriptif</label>
                <textarea 
                  className="textarea-field"
                  rows={3}
                  value={ukuranKeberhasilan}
                  onChange={(e) => setUkuranKeberhasilan(e.target.value)}
                  placeholder="Contoh: Dokumen kurikulum dan perangkat ajar tersusun komprehensif, memenuhi standar mutu, dan diserahkan tepat waktu..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                <div className="form-group">
                  <label className="form-label">Nama Dokumen / Link Bukti Dukung (Evidence)</label>
                  <textarea 
                    className="textarea-field"
                    rows={3}
                    value={buktiDukungKualitatif}
                    onChange={(e) => setBuktiDukungKualitatif(e.target.value)}
                    placeholder="Contoh: Laporan Monev Triwulan IV, Sertifikat Diklat, Link Google Drive..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Narasi Realisasi Capaian Kinerja</label>
                  <textarea 
                    className="textarea-field"
                    rows={3}
                    value={realisasiKualitatif}
                    onChange={(e) => setRealisasiKualitatif(e.target.value)}
                    placeholder="Tuliskan narasi capaian kinerja kualitatif..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {aspekList.map((asp, idx) => (
                <div 
                  key={asp.id || idx}
                  style={{
                    padding: "1.25rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-md)"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    marginBottom: "0.85rem",
                    flexWrap: "wrap",
                    gap: "0.5rem" 
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="badge badge-aspek">
                        Aspek {asp.aspek}
                      </span>
                      <strong style={{ fontSize: "0.85rem" }}>Target: {asp.target}</strong>
                    </div>

                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerateNarasi(idx)}
                      title="Buat kalimat narasi capaian otomatis berdasarkan target"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Generate Narasi AI</span>
                    </button>
                  </div>

                  <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong>Indikator:</strong> {asp.indikator}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                          NAMA BUKTI DUKUNG
                        </label>
                        <input 
                          type="text"
                          className="input-field"
                          value={asp.namaBuktiDukung || (asp.buktiDukungDefault ? asp.buktiDukungDefault.split("|")[0].trim() : "")}
                          onChange={(e) => {
                            const nama = e.target.value;
                            const link = asp.linkBuktiDukung || "";
                            handleUpdateField(idx, "namaBuktiDukung", nama);
                            handleUpdateField(idx, "buktiDukungDefault", link ? `${nama} | ${link}` : nama);
                          }}
                          placeholder="Contoh: Laporan Monitoring Jaringan/Server"
                        />
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                          BUKTI DUKUNG (LINK KE FILE GOOGLE DRIVE/DROPBOX/ETC)
                        </label>
                        <input 
                          type="url"
                          className="input-field"
                          value={asp.linkBuktiDukung || (asp.buktiDukungDefault && asp.buktiDukungDefault.includes("http") ? asp.buktiDukungDefault.split("|")[1]?.trim() || "" : "")}
                          onChange={(e) => {
                            const link = e.target.value;
                            const nama = asp.namaBuktiDukung || asp.buktiDukungDefault?.split("|")[0]?.trim() || "Bukti Dukung";
                            handleUpdateField(idx, "linkBuktiDukung", link);
                            handleUpdateField(idx, "buktiDukungDefault", `${nama} | ${link}`);
                          }}
                          placeholder="https://drive.google.com/drive/folders/..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                        REALISASI (NARASI CAPAIAN)
                      </label>
                      <textarea 
                        className="textarea-field"
                        rows={4}
                        value={asp.realisasiDefault || ""}
                        onChange={(e) => handleUpdateField(idx, "realisasiDefault", e.target.value)}
                        placeholder="Contoh: Terlaksananya laporan Jaringan/Server berdasarkan sistem monitoring jaringan dan server..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={16} />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
