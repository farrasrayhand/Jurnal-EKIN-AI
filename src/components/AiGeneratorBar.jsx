import React, { useState } from "react";
import { Sparkles, Wand2, Zap, Layers, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { ASN_PRESETS } from "../data/presetTemplates";

export default function AiGeneratorBar({
  onApplyGeneratedSkp,
  currentJabatan,
  unitKerja,
  hasGeminiKey,
  onOpenGeminiModal
}) {
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [customJabatan, setCustomJabatan] = useState(currentJabatan || "");
  const [jenjang, setJenjang] = useState("Ahli Pertama");
  const [tupoksiTambahan, setTupoksiTambahan] = useState("");
  const [useOnlineAi, setUseOnlineAi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handlePresetSelect = (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const p = ASN_PRESETS.find(item => item.id === presetId);
    if (p) {
      setCustomJabatan(p.jabatanDefault);
    }
  };

  const handleGenerate = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const roleTarget = customJabatan.trim();
    if (!roleTarget) {
      setErrorMsg("Harap masukkan nama jabatan ASN atau pilih dari template preset.");
      return;
    }

    setIsLoading(true);

    try {
      await onApplyGeneratedSkp({
        jabatan: roleTarget,
        jenjang,
        tupoksiTambahan,
        useOnlineAi: useOnlineAi && hasGeminiKey,
        presetId: selectedPresetId
      });

      // Efek selebrasi confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccessMsg(`Berhasil menghasilkan Matriks SKP & RHK untuk ${roleTarget}!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Gagal menghasilkan SKP otomatis.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-generator-box no-print">
      <div className="ai-header-content">
        <div className="ai-title-wrap">
          <div className="ai-sparkle-badge">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="ai-generator-title">AI SKP & RHK Generator</h2>
            <p className="ai-generator-desc">
              Otomatisasi penyusunan Rencana Hasil Kerja (RHK) Utama, Tambahan, Indikator Kinerja Individu (Kuantitas, Kualitas, Waktu) dan Rekomendasi Bukti Dukung sesuai regulasi PermenPAN-RB No. 6 Tahun 2022.
            </p>
          </div>
        </div>

        {/* Mode Selector AI */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            className={`btn btn-sm ${!useOnlineAi ? "btn-primary" : "btn-outline"}`}
            onClick={() => setUseOnlineAi(false)}
            title="Menggunakan mesin cerdas bawaan, bekerja instan tanpa kuota atau API key"
          >
            <Zap size={14} />
            <span>Mode Cerdas Offline (Instan)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${useOnlineAi ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              if (!hasGeminiKey) {
                onOpenGeminiModal();
              } else {
                setUseOnlineAi(true);
              }
            }}
            title="Menggunakan Gemini AI untuk personalisasi lanjutan"
          >
            <Wand2 size={14} />
            <span>Gemini AI {hasGeminiKey ? "(Siap)" : "(Perlu Key)"}</span>
          </button>
        </div>
      </div>

      {/* Grid Pilihan Input */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "1rem", 
        marginBottom: "1.25rem" 
      }}>
        {/* Preset Cepat */}
        <div className="form-group">
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Layers size={13} /> Pilihan Template Profesi ASN
          </label>
          <select 
            className="select-field"
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
          >
            <option value="">-- Pilih Preset Cepat (Opsional) --</option>
            {ASN_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title}
              </option>
            ))}
          </select>
        </div>

        {/* Jabatan Input */}
        <div className="form-group">
          <label className="form-label">Nama Jabatan ASN</label>
          <input 
            type="text" 
            className="input-field"
            value={customJabatan}
            onChange={(e) => {
              setCustomJabatan(e.target.value);
              setSelectedPresetId("");
            }}
            placeholder="Contoh: Guru Matematika, Bidan, Satpol PP..."
          />
        </div>

        {/* Jenjang Jabatan & Golongan Ruang */}
        <div className="form-group">
          <label className="form-label">Jenjang Jabatan / Golongan Ruang</label>
          <select 
            className="select-field"
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
          >
            <optgroup label="Jabatan Fungsional Keahlian">
              <option value="Ahli Pertama (Gol. III/a - III/b)">Ahli Pertama / Gol. III/a - III/b</option>
              <option value="Ahli Muda (Gol. III/c - III/d)">Ahli Muda / Gol. III/c - III/d</option>
              <option value="Ahli Madya (Gol. IV/a - IV/c)">Ahli Madya / Gol. IV/a - IV/c</option>
              <option value="Ahli Utama (Gol. IV/d - IV/e)">Ahli Utama / Gol. IV/d - IV/e</option>
            </optgroup>
            <optgroup label="Jabatan Fungsional Keterampilan">
              <option value="Pemula (Gol. II/a)">Pemula / Gol. II/a</option>
              <option value="Terampil (Gol. II/b - II/d)">Terampil / Gol. II/b - II/d</option>
              <option value="Mahir (Gol. III/a - III/b)">Mahir / Gol. III/a - III/b</option>
              <option value="Penyelia (Gol. III/c - III/d)">Penyelia / Gol. III/c - III/d</option>
            </optgroup>
            <optgroup label="Jabatan Pelaksana & Struktural">
              <option value="Pelaksana Administrasi (Gol. II/a - III/d)">Pelaksana / Gol. II/a - III/d</option>
              <option value="Pengawas / Eselon IV (Gol. III/c - III/d)">Pengawas (Eselon IV) / Gol. III/c - III/d</option>
              <option value="Administrator / Eselon III (Gol. IV/a - IV/b)">Administrator (Eselon III) / Gol. IV/a - IV/b</option>
              <option value="Pimpinan Tinggi Pratama / Eselon II (Gol. IV/c - IV/e)">Pimpinan Tinggi (Eselon II) / Gol. IV/c - IV/e</option>
            </optgroup>
            <optgroup label="Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)">
              <option value="PPPK Golongan V (Pendidikan SLTA / SMA / SMK)">PPPK Golongan V (SLTA / SMA / SMK)</option>
              <option value="PPPK Golongan VII (Pendidikan Diploma III / D-III)">PPPK Golongan VII (Diploma III / D-III)</option>
              <option value="PPPK Golongan IX (Sarjana S-1 / D-IV / Ahli Pertama)">PPPK Golongan IX (S-1 / D-IV / Ahli Pertama)</option>
              <option value="PPPK Golongan X (Magister S-2 / Ahli Pertama)">PPPK Golongan X (S-2 / Ahli Pertama)</option>
              <option value="PPPK Golongan XI (Doktor S-3 / Ahli Muda)">PPPK Golongan XI (S-3 / Ahli Muda)</option>
              <option value="PPPK Golongan I - IV (Pendidikan SD - SMP)">PPPK Golongan I - IV (SD - SMP)</option>
              <option value="PPPK Golongan XIV - XVII (Setara Ahli Madya / Utama)">PPPK Golongan XIV - XVII (Ahli Madya/Utama)</option>
            </optgroup>
          </select>
        </div>

        {/* Catatan Tugas Tambahan / Spesifikasi */}
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label">Fokus Tugas Tambahan / Keahlian Khusus (Opsional)</label>
          <input 
            type="text" 
            className="input-field"
            value={tupoksiTambahan}
            onChange={(e) => setTupoksiTambahan(e.target.value)}
            placeholder="Contoh: Ditugaskan sebagai Wali Kelas IX, Tim Akreditasi Fasyankes, atau Pengelola Website Portal..."
          />
        </div>
      </div>

      {/* Action Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            ⚡ <strong>{useOnlineAi && hasGeminiKey ? "Mode: Gemini 2.5 Flash" : "Mode: Mesin Cerdas Offline BKN"}</strong> • Otomatis menyesuaikan 3 Aspek IKI + Bukti Dukung
          </span>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleGenerate}
          disabled={isLoading}
          style={{ minWidth: "220px", padding: "0.75rem 1.5rem" }}
        >
          {isLoading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Memproses AI...</span>
            </>
          ) : (
            <>
              <Wand2 size={16} />
              <span>Generate SKP Otomatis</span>
            </>
          )}
        </button>
      </div>

      {/* Status Notif */}
      {errorMsg && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "0.75rem 1rem", 
          background: "var(--accent-rose-subtle)", 
          border: "1px solid var(--accent-rose)",
          borderRadius: "var(--radius-md)",
          color: "var(--accent-rose)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem"
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "0.75rem 1rem", 
          background: "var(--accent-emerald-subtle)", 
          border: "1px solid var(--accent-emerald)",
          borderRadius: "var(--radius-md)",
          color: "var(--accent-emerald)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem"
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
