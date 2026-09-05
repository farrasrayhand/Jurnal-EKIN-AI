import React, { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Sparkles, Check, Building2, Briefcase, Award, Hash, User } from "lucide-react";
import confetti from "canvas-confetti";
import { saveAccount } from "../services/accountService";
import { getMasterJabatan } from "../services/jabatanService";

const GOLONGAN_OPTIONS = [
  "Pengatur Muda / II/a",
  "Pengatur Muda Tk. I / II/b",
  "Pengatur / II/c",
  "Pengatur Tk. I / II/d",
  "Penata Muda / III/a",
  "Penata Muda Tk. I / III/b",
  "Penata / III/c",
  "Penata Tk. I / III/d",
  "Pembina / IV/a",
  "Pembina Tk. I / IV/b",
  "Pembina Utama Muda / IV/c",
  "Pembina Utama Madya / IV/d",
  "Pembina Utama / IV/e",
  "PPPK / Non-PNS"
];

export default function InitialSetupModal({ 
  isOpen, 
  currentUser, 
  onProfileCompleted,
  onLogout 
}) {
  const [formData, setFormData] = useState({
    nama: "",
    nip: "",
    pangkat: "Penata Muda / III/a",
    jabatan: "",
    unitKerja: ""
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        nama: currentUser.nama || "",
        nip: currentUser.nip && currentUser.nip !== "-" ? currentUser.nip : "",
        pangkat: currentUser.pangkat && currentUser.pangkat !== "-" ? currentUser.pangkat : "Pengatur Muda / II/a",
        jabatan: currentUser.jabatan && currentUser.jabatan !== "-" ? currentUser.jabatan : "",
        unitKerja: currentUser.unitKerja && currentUser.unitKerja !== "-" ? currentUser.unitKerja : ""
      });
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanNama = formData.nama.trim();
    const cleanNip = formData.nip.trim();
    const cleanJabatan = formData.jabatan.trim();
    const cleanUnitKerja = formData.unitKerja.trim();

    if (!cleanNama) {
      setErrorMessage("Nama Lengkap & Gelar wajib diisi!");
      return;
    }

    if (!cleanNip) {
      setErrorMessage("Nomor Induk Pegawai (NIP) wajib diisi untuk identitas laporan resmi!");
      return;
    }

    if (cleanNip.length < 9) {
      setErrorMessage("NIP tampaknya terlalu pendek. Pastikan memasukkan NIP resmi Anda.");
      return;
    }

    if (!cleanJabatan) {
      setErrorMessage("Jabatan kedinasan wajib diisi!");
      return;
    }

    if (!cleanUnitKerja) {
      setErrorMessage("Unit Kerja / Sekolah tempat bertugas wajib diisi!");
      return;
    }

    try {
      const updatedAccount = {
        ...currentUser,
        nama: cleanNama,
        nip: cleanNip,
        pangkat: formData.pangkat || "Pengatur Muda / II/a",
        jabatan: cleanJabatan,
        unitKerja: cleanUnitKerja
      };

      saveAccount(updatedAccount);
      setIsSuccess(true);

      // Rayakan dengan Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        if (onProfileCompleted) {
          onProfileCompleted(updatedAccount);
        }
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || "Gagal menyimpan data profil.");
    }
  };

  return (
    <div 
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem"
      }}
    >
      <div style={{
        background: "var(--bg-primary, #ffffff)",
        borderRadius: "var(--radius-lg, 16px)",
        width: "100%",
        maxWidth: "560px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        border: "1px solid var(--border-subtle, #e2e8f0)",
        overflow: "hidden"
      }}>
        {/* Banner Atas Pengumuman Setup Awal */}
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
          color: "#ffffff",
          padding: "1.75rem 2rem",
          position: "relative"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(255, 255, 255, 0.2)",
            padding: "0.25rem 0.75rem",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: "700",
            marginBottom: "0.5rem"
          }}>
            <ShieldAlert size={14} style={{ color: "#fef08a" }} />
            <span>Setup Wajib Akun Baru</span>
          </div>

          <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.35rem", fontWeight: "800" }}>
            Lengkapi Identitas Pegawai Anda
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9, lineHeight: "1.5" }}>
            Selamat datang, <strong>{currentUser?.username}</strong>! Sebelum mulai membuat jurnal harian dan laporan bulanan, mohon lengkapi NIP dan identitas kedinasan Anda di bawah ini:
          </p>
        </div>

        {/* Form Lengkapi Profil */}
        <div style={{ padding: "1.75rem 2rem" }}>
          {errorMessage && (
            <div style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.84rem",
              marginBottom: "1.25rem",
              fontWeight: "600"
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {isSuccess ? (
            <div style={{
              textAlign: "center",
              padding: "2rem 1rem",
              color: "#059669"
            }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto"
              }}>
                <Check size={32} />
              </div>
              <h4 style={{ fontSize: "1.2rem", fontWeight: "800", margin: "0 0 0.5rem 0" }}>
                Identitas Berhasil Disimpan!
              </h4>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                Menyiapkan ruang kerja E-Kinerja Anda...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Nama Lengkap */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <User size={15} style={{ color: "#2563eb" }} />
                  Nama Lengkap &amp; Gelar <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: MUHAMMAD FARRAS RAYHAND, S.Kom"
                  required
                />
              </div>

              {/* Grid: NIP & Pangkat */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Hash size={15} style={{ color: "#2563eb" }} />
                    NIP Pegawai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="18 digit NIP resmi"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Award size={15} style={{ color: "#2563eb" }} />
                    Pangkat / Golongan
                  </label>
                  <select
                    className="form-select"
                    value={formData.pangkat}
                    onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
                  >
                    {GOLONGAN_OPTIONS.map((gol) => (
                      <option key={gol} value={gol}>
                        {gol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Jabatan & Unit Kerja */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Briefcase size={15} style={{ color: "#2563eb" }} />
                    Jabatan Kedinasan <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    list="setup-jabatan-datalist"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="misal: Pengadministrasi Perkantoran"
                    required
                  />
                  <datalist id="setup-jabatan-datalist">
                    {getMasterJabatan().map((j) => (
                      <option key={j.id} value={j.nama} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Building2 size={15} style={{ color: "#2563eb" }} />
                    Unit Kerja / Sekolah <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.unitKerja}
                    onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                    placeholder="misal: SMK N 07 SAMARINDA"
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)"
                  }}
                >
                  <Sparkles size={16} />
                  <span>Simpan &amp; Lanjutkan ke E-Kinerja</span>
                </button>

                {onLogout && (
                  <div style={{ textAlign: "center", marginTop: "0.85rem" }}>
                    <button
                      type="button"
                      onClick={onLogout}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: "4px"
                      }}
                    >
                      Bukan akun Anda? Keluar / Ganti Akun
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
