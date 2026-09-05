import React from "react";
import { User, UserCheck, Calendar, Building2, Briefcase, FileText } from "lucide-react";

export default function ProfileForm({
  pegawai,
  setPegawai,
  penilai,
  setPenilai,
  periode,
  setPeriode,
  intervensiPimpinan,
  setIntervensiPimpinan,
  pendekatan = "KUANTITATIF",
  setPendekatan,
  onLoadSmk07Demo
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [instansi, setInstansi] = React.useState("Pemerintah Provinsi Kalimantan Timur");
  const [statusSkp, setStatusSkp] = React.useState("PERSETUJUAN");
  const [modelSkp, setModelSkp] = React.useState("JAJF");
  const [jenisPegawai, setJenisPegawai] = React.useState("Pegawai");

  return (
    <div className="glass-card mb-6" style={{ padding: "1.5rem", marginBottom: "1.75rem" }}>
      {/* BKN Official Status Banner (Mirrors kinerjabkn.go.id) */}
      <div style={{
        background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        color: "#ffffff",
        padding: "0.75rem 1.25rem",
        borderRadius: "var(--radius-md)",
        fontWeight: "700",
        fontSize: "0.95rem",
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1rem",
        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span>Status SKP: {statusSkp}</span>
        </div>
        {onLoadSmk07Demo && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ 
              background: "rgba(255, 255, 255, 0.2)", 
              color: "#ffffff", 
              border: "1px solid rgba(255, 255, 255, 0.4)",
              fontSize: "0.75rem",
              padding: "0.25rem 0.65rem"
            }}
            onClick={onLoadSmk07Demo}
            title="Muat profil SMK N 07 Samarinda sesuai tampilan BKN"
          >
            🏫 Muat Contoh SMK N 07 Samarinda
          </button>
        )}
      </div>

      {/* Instansi & Periode Subtitle Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "var(--text-secondary)",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "1rem"
      }}>
        <span style={{ color: "var(--text-primary)" }}>{instansi}</span>
        <span>
          PERIODE PENILAIAN: {(periode.mulai || "1 JANUARI 2026").toUpperCase()} SD {(periode.selesai || "31 DESEMBER 2026").toUpperCase()}
        </span>
      </div>

      {/* Official BKN 3-Column Metadata Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
        textAlign: "center",
        gap: "0.5rem"
      }}>
        <div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Jenis Pegawai</span>
          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{jenisPegawai}</strong>
        </div>
        <div style={{ borderLeft: "1px solid var(--border-subtle)", borderRight: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Model SKP</span>
          <strong style={{ fontSize: "0.9rem", color: "var(--accent-primary)" }}>{modelSkp} (Administrasi & Fungsional)</strong>
        </div>
        <div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Pendekatan</span>
          <strong style={{ fontSize: "0.9rem", color: pendekatan === "KUALITATIF" ? "var(--accent-emerald)" : "var(--accent-primary)" }}>
            {pendekatan}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
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
            <User size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Data Pegawai & Pejabat Penilai Kinerja</h2>
              <span className={`badge ${pendekatan === "KUALITATIF" ? "badge-tambahan" : "badge-utama"}`} style={{ fontSize: "0.72rem" }}>
                Pendekatan {pendekatan === "KUALITATIF" ? "Kualitatif" : "Kuantitatif"}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Identitas resmi untuk halaman sampul, matriks SKP, dan lembar penetapan BKN</p>
          </div>
        </div>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Sembunyikan Form" : "Tampilkan Form Lengkap"}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* BKN Official Guidance Banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.08))",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1.1rem",
            marginBottom: "1.25rem",
            fontSize: "0.82rem",
            lineHeight: "1.55",
            color: "var(--text-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "700", color: "var(--accent-primary)", marginBottom: "0.3rem" }}>
              <Calendar size={15} />
              <span>Petunjuk Penetapan Periode & Pendekatan SKP (Standar BKN):</span>
            </div>
            <p style={{ margin: "0 0 0.25rem 0" }}>
              • Periode Rencana SKP yang dibuat adalah <strong>TAHUNAN</strong>. Untuk periode awal buat <strong>1 Januari</strong>, dan untuk periode akhir buat penanggalan <strong>31 Desember</strong>.
            </p>
            <p style={{ margin: 0 }}>
              • <strong>Pendekatan Kuantitatif:</strong> Indikator diukur spesifik per aspek (Kuantitas, Kualitas, Waktu). 
              <br />• <strong>Pendekatan Kualitatif:</strong> Indikator dirumuskan terpadu dalam <em>Ukuran Keberhasilan / Target Deskriptif</em>.
            </p>
          </div>

          {/* Periode Penilaian, Pendekatan & Intervensi Pimpinan */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
            gap: "1rem", 
            marginBottom: "1.25rem",
            padding: "1.1rem",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)"
          }}>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar size={14} /> Periode Awal Penilaian
              </label>
              <input 
                type="text" 
                className="input-field"
                value={periode.mulai || ""}
                onChange={(e) => setPeriode({ ...periode, mulai: e.target.value })}
                placeholder="1 Januari 2026"
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar size={14} /> Periode Akhir Penilaian
              </label>
              <input 
                type="text" 
                className="input-field"
                value={periode.selesai || ""}
                onChange={(e) => setPeriode({ ...periode, selesai: e.target.value })}
                placeholder="31 Desember 2026"
              />
            </div>

            {/* Selector Pendekatan (Kuantitatif vs Kualitatif) */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Briefcase size={14} /> Pendekatan SKP
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: "600" }}>
                  PermenPAN-RB 6/2022
                </span>
              </label>
              <select 
                className="form-select"
                value={pendekatan}
                onChange={(e) => setPendekatan && setPendekatan(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                <option value="KUANTITATIF">KUANTITATIF (Pendekatan Hasil Kerja Kuantitatif)</option>
                <option value="KUALITATIF">KUALITATIF (Pendekatan Hasil Kerja Kualitatif)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <FileText size={14} /> Rencana Kinerja Pimpinan yang Diintervensi (Induk)
              </label>
              <input 
                type="text" 
                className="input-field"
                value={intervensiPimpinan || ""}
                onChange={(e) => setIntervensiPimpinan(e.target.value)}
                placeholder="Contoh: Terwujudnya mutu pelayanan pendidikan yang merata dan berkarakter Profil Pelajar Pancasila..."
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* Kolom Pegawai yang Dinilai */}
            <div style={{
              padding: "1.25rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--accent-primary)" }}>
                <User size={18} />
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700" }}>A. PEGAWAI YANG DINILAI</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap (Beserta Gelar)</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={pegawai.nama || ""}
                    onChange={(e) => setPegawai({ ...pegawai, nama: e.target.value })}
                    placeholder="Contoh: Rahmat Hidayat, S.Kom."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">NIP (18 Digit)</label>
                  <input 
                    type="text" 
                    className="input-field font-mono"
                    value={pegawai.nip || ""}
                    onChange={(e) => setPegawai({ ...pegawai, nip: e.target.value })}
                    placeholder="199208152019031008"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pangkat / Golongan Ruang</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={pegawai.pangkat || ""}
                    onChange={(e) => setPegawai({ ...pegawai, pangkat: e.target.value })}
                    placeholder="Contoh: Penata Muda / III/a"
                    list="pangkat-list"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jabatan ASN</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={pegawai.jabatan || ""}
                    onChange={(e) => setPegawai({ ...pegawai, jabatan: e.target.value })}
                    placeholder="Pranata Komputer Ahli Pertama"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Kerja</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={pegawai.unitKerja || ""}
                    onChange={(e) => setPegawai({ ...pegawai, unitKerja: e.target.value })}
                    placeholder="Dinas Komunikasi, Informatika, dan Statistik"
                  />
                </div>
              </div>
            </div>

            {/* Kolom Pejabat Penilai Kinerja */}
            <div style={{
              padding: "1.25rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--accent-emerald)" }}>
                <UserCheck size={18} />
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700" }}>B. PEJABAT PENILAI KINERJA (ATASAN)</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Pejabat Penilai</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={penilai.nama || ""}
                    onChange={(e) => setPenilai({ ...penilai, nama: e.target.value })}
                    placeholder="Contoh: Dr. Hendra Wijaya, M.Si."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">NIP Pejabat Penilai</label>
                  <input 
                    type="text" 
                    className="input-field font-mono"
                    value={penilai.nip || ""}
                    onChange={(e) => setPenilai({ ...penilai, nip: e.target.value })}
                    placeholder="197805122002121004"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pangkat / Golongan Ruang</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={penilai.pangkat || ""}
                    onChange={(e) => setPenilai({ ...penilai, pangkat: e.target.value })}
                    placeholder="Contoh: Pembina / IV/a"
                    list="pangkat-list"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jabatan Pejabat Penilai</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={penilai.jabatan || ""}
                    onChange={(e) => setPenilai({ ...penilai, jabatan: e.target.value })}
                    placeholder="Kepala Bidang Penyelenggaraan E-Government"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Kerja Pejabat Penilai</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={penilai.unitKerja || ""}
                    onChange={(e) => setPenilai({ ...penilai, unitKerja: e.target.value })}
                    placeholder="Dinas Komunikasi, Informatika, dan Statistik"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Datalist Pilihan Standar Pangkat / Golongan Ruang BKN */}
          <datalist id="pangkat-list">
            <option value="Juru Muda / I/a" />
            <option value="Juru Muda Tk. I / I/b" />
            <option value="Juru / I/c" />
            <option value="Juru Tk. I / I/d" />
            <option value="Pengatur Muda / II/a" />
            <option value="Pengatur Muda Tk. I / II/b" />
            <option value="Pengatur / II/c" />
            <option value="Pengatur Tk. I / II/d" />
            <option value="Penata Muda / III/a" />
            <option value="Penata Muda Tk. I / III/b" />
            <option value="Penata / III/c" />
            <option value="Penata Tk. I / III/d" />
            <option value="Pembina / IV/a" />
            <option value="Pembina Tk. I / IV/b" />
            <option value="Pembina Utama Muda / IV/c" />
            <option value="Pembina Utama Madya / IV/d" />
            <option value="Pembina Utama / IV/e" />
            <option value="PPPK Golongan I (SD)" />
            <option value="PPPK Golongan IV (SMP)" />
            <option value="PPPK Golongan V (SLTA / SMA / SMK)" />
            <option value="PPPK Golongan VI (Diploma I / D-I)" />
            <option value="PPPK Golongan VII (Diploma II / Diploma III / D-III)" />
            <option value="PPPK Golongan VIII" />
            <option value="PPPK Golongan IX (Sarjana S-1 / Diploma IV / D-IV)" />
            <option value="PPPK Golongan X (Magister / S-2)" />
            <option value="PPPK Golongan XI (Doktor / S-3 / Ahli Muda)" />
            <option value="PPPK Golongan XII" />
            <option value="PPPK Golongan XIII" />
            <option value="PPPK Golongan XIV (Ahli Madya)" />
            <option value="PPPK Golongan XV" />
            <option value="PPPK Golongan XVI" />
            <option value="PPPK Golongan XVII (Ahli Utama)" />
          </datalist>
        </>
      )}
    </div>
  );
}
