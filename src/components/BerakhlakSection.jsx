import React from "react";
import { ShieldCheck, Sparkles, CheckCircle, Info } from "lucide-react";
import { getRecommendedEkpForRole } from "../services/aiService";

export default function BerakhlakSection({
  berakhlakList,
  setBerakhlakList,
  currentJabatan
}) {
  const [successToast, setSuccessToast] = React.useState("");

  const handleApplyAiEkp = () => {
    const ekpObj = getRecommendedEkpForRole(currentJabatan);
    const updated = berakhlakList.map((item) => ({
      ...item,
      ekspektasi: ekpObj[item.id] || item.defaultEkspektasi
    }));
    setBerakhlakList(updated);
    setSuccessToast("7 Ekspektasi Khusus Pimpinan (EKP) berhasil disesuaikan dengan jabatan!");
    setTimeout(() => setSuccessToast(""), 3500);
  };

  const handleEkpChange = (id, newText) => {
    setBerakhlakList(berakhlakList.map(item => item.id === id ? { ...item, ekspektasi: newText } : item));
  };

  return (
    <div className="glass-card mb-6" style={{ padding: "1.5rem" }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        gap: "1rem" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, #10b981, #059669)", 
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800" }}>
              Perilaku Kerja Pegawai (Core Values BerAKHLAK)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Wajib ada pada lampiran SKP sesuai Surat Edaran MenPAN-RB & PermenPAN-RB No. 6/2022
            </p>
          </div>
        </div>

        <button 
          className="btn btn-emerald btn-sm"
          onClick={handleApplyAiEkp}
          title="Otomatisasi pengisian Ekspektasi Khusus Pimpinan sesuai bidang tugas ASN"
        >
          <Sparkles size={14} />
          <span>Otomasi Ekspektasi Pimpinan (AI)</span>
        </button>
      </div>

      {successToast && (
        <div style={{ 
          marginBottom: "1.25rem", 
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
          <CheckCircle size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Grid 7 Core Values */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
        {berakhlakList.map((item, idx) => (
          <div 
            key={item.id}
            style={{
              padding: "1.25rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem"
            }}
          >
            {/* Header Nilai */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: "800", 
                    width: "22px", 
                    height: "22px", 
                    borderRadius: "6px",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {idx + 1}
                  </span>
                  <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                    {item.name}
                  </h3>
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  "{item.tagline}"
                </p>
              </div>
            </div>

            {/* Panduan Perilaku */}
            <div style={{
              padding: "0.75rem",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.76rem",
              color: "var(--text-secondary)"
            }}>
              <div style={{ fontWeight: "700", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Info size={12} /> Panduan Perilaku (Standar MenPAN-RB):
              </div>
              <ul style={{ paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {item.panduanPerilaku.map((p, pIdx) => (
                  <li key={pIdx}>{p}</li>
                ))}
              </ul>
            </div>

            {/* Form Ekspektasi Khusus Pimpinan */}
            <div className="form-group" style={{ marginTop: "auto" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Ekspektasi Khusus Pimpinan (EKP)</span>
                <span style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: "600" }}>Wajib</span>
              </label>
              <textarea
                className="textarea-field"
                rows={3}
                value={item.ekspektasi || item.defaultEkspektasi || ""}
                onChange={(e) => handleEkpChange(item.id, e.target.value)}
                placeholder="Tuliskan arahan dan ekspektasi khusus pimpinan..."
                style={{ fontSize: "0.82rem", lineHeight: "1.5" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
