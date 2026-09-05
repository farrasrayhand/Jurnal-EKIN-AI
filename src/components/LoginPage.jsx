import React, { useState, useEffect } from "react";
import { 
  LogIn, 
  Key, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff,
  Ticket,
  UserPlus,
  Briefcase,
  Building,
  CheckCircle2
} from "lucide-react";
import { authenticate, registerAccount } from "../services/accountService";

// Helper membaca posisi tab dari URL hash atau localStorage
const getInitialAuthTab = () => {
  const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
  if (hash === "register" || hash === "daftar") return "register";
  if (hash === "login" || hash === "masuk") return "login";
  try {
    const saved = localStorage.getItem("ekinerja_auth_tab");
    if (saved === "register") return "register";
  } catch (e) {}
  return "login";
};

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTabState] = useState(getInitialAuthTab);

  const switchTab = (tab) => {
    setActiveTabState(tab);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      localStorage.setItem("ekinerja_auth_tab", tab);
    } catch (e) {}
    window.location.hash = `#${tab}`;
  };

  // Sinkronisasi dengan URL hash saat pertama kali mount dan saat tombol Back/Forward browser ditekan
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
      if (hash === "register" || hash === "daftar") {
        setActiveTabState("register");
        try { localStorage.setItem("ekinerja_auth_tab", "register"); } catch (e) {}
      } else if (hash === "login" || hash === "masuk") {
        setActiveTabState("login");
        try { localStorage.setItem("ekinerja_auth_tab", "login"); } catch (e) {}
      }
    };

    window.addEventListener("hashchange", syncFromHash);

    // Pastikan URL di browser langsung mencerminkan #login atau #register (bukan #home atau kosong)
    const currentHash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
    if (currentHash !== "login" && currentHash !== "register" && currentHash !== "daftar") {
      const initial = getInitialAuthTab();
      window.location.hash = `#${initial}`;
    }

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // State Registrasi
  const [regCode, setRegCode] = useState("");
  const [regNama, setRegNama] = useState("");
  const [regNip, setRegNip] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPangkat, setRegPangkat] = useState("");
  const [regJabatan, setRegJabatan] = useState("");
  const [regUnitKerja, setRegUnitKerja] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Harap masukkan username dan password!");
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticate(username.trim(), password.trim());
      setIsLoading(false);

      if (!user) {
        setErrorMsg("Username atau password salah. Periksa kembali data login Anda.");
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Gagal masuk ke sistem. Silakan coba kembali.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regCode.trim()) {
      setErrorMsg("Kode Registrasi wajib diisi! Hubungi Administrator untuk mendapatkan kode pendaftaran resmi.");
      return;
    }
    if (!regNama.trim()) {
      setErrorMsg("Nama Lengkap wajib diisi!");
      return;
    }
    if (!regNip.trim()) {
      setErrorMsg("NIP Pegawai wajib diisi (atau ketik '-' jika non-ASN)!");
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setErrorMsg("Username minimal 3 karakter.");
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(regUsername.trim())) {
      setErrorMsg("Username hanya boleh memuat huruf, angka, titik, underscore, atau tanda hubung.");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg("Password minimal 4 karakter.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok dengan password yang dibuat!");
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await registerAccount({
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        nama: regNama.trim(),
        nip: regNip.trim(),
        pangkat: regPangkat.trim(),
        jabatan: regJabatan.trim(),
        unitKerja: regUnitKerja.trim(),
        registrationCode: regCode.trim().toUpperCase()
      });

      setIsLoading(false);
      setSuccessMsg(`Pendaftaran berhasil! Selamat datang, ${newUser.nama}. Mengalihkan ke aplikasi...`);

      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Pendaftaran gagal. Pastikan kode registrasi valid dan username belum digunakan.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 100%)",
      padding: "1.5rem",
      fontFamily: "var(--font-family, system-ui, -apple-system, sans-serif)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative Glow Elements */}
      <div style={{
        position: "absolute",
        top: "-100px",
        right: "-100px",
        width: "350px",
        height: "350px",
        borderRadius: "50%",
        background: "rgba(37, 99, 235, 0.18)",
        filter: "blur(80px)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-120px",
        left: "-100px",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "rgba(124, 58, 237, 0.15)",
        filter: "blur(90px)",
        pointerEvents: "none"
      }} />

      {/* Main Container Card */}
      <div style={{
        maxWidth: activeTab === "register" ? "520px" : "440px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
        transition: "max-width 0.25s ease"
      }}>
        {/* Header Branding */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          padding: "1.75rem 1.5rem 1.5rem 1.5rem",
          color: "#ffffff",
          textAlign: "center"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
            marginBottom: "0.85rem"
          }}>
            <Sparkles size={26} style={{ color: "#fbbf24" }} />
          </div>

          <h1 style={{ 
            fontSize: "1.45rem", 
            fontWeight: "800", 
            letterSpacing: "-0.02em", 
            margin: "0 0 0.35rem 0",
            textShadow: "0 2px 4px rgba(0,0,0,0.15)"
          }}>
            E-KINERJA AI
          </h1>
          <p style={{ 
            fontSize: "0.83rem", 
            margin: 0, 
            opacity: 0.9, 
            fontWeight: "500",
            lineHeight: "1.4"
          }}>
            Portal Laporan Kinerja Harian &amp; Bulanan Pegawai ASN
          </p>

          {/* Tab Switcher: Masuk vs Registrasi */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "rgba(15, 23, 42, 0.25)",
            padding: "4px",
            borderRadius: "10px",
            marginTop: "1.25rem",
            backdropFilter: "blur(4px)"
          }}>
            <button
              type="button"
              onClick={() => switchTab("login")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
                padding: "0.55rem",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "login" ? "#ffffff" : "transparent",
                color: activeTab === "login" ? "#1e3a8a" : "#e2e8f0",
                boxShadow: activeTab === "login" ? "0 2px 6px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <LogIn size={15} />
              <span>Masuk (Login)</span>
            </button>

            <button
              type="button"
              onClick={() => switchTab("register")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
                padding: "0.55rem",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "register" ? "#ffffff" : "transparent",
                color: activeTab === "register" ? "#1e3a8a" : "#e2e8f0",
                boxShadow: activeTab === "register" ? "0 2px 6px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <UserPlus size={15} />
              <span>Daftar Akun Baru</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: "1.5rem" }}>
          {errorMsg && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.84rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              lineHeight: "1.4"
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.84rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              lineHeight: "1.4"
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* TAB 1: FORM LOGIN */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "0.82rem", 
                  fontWeight: "700", 
                  color: "#1e293b", 
                  marginBottom: "0.4rem" 
                }}>
                  Username Pegawai / Admin
                </label>
                <div style={{ position: "relative" }}>
                  <User 
                    size={17} 
                    style={{ 
                      position: "absolute", 
                      left: "12px", 
                      top: "50%", 
                      transform: "translateY(-50%)", 
                      color: "#94a3b8" 
                    }} 
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 0.85rem 0.75rem 2.4rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.9rem",
                      color: "#0f172a",
                      background: "#ffffff",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.15s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "0.82rem", 
                  fontWeight: "700", 
                  color: "#1e293b", 
                  marginBottom: "0.4rem" 
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Key 
                    size={17} 
                    style={{ 
                      position: "absolute", 
                      left: "12px", 
                      top: "50%", 
                      transform: "translateY(-50%)", 
                      color: "#94a3b8" 
                    }} 
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.6rem 0.75rem 2.4rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.9rem",
                      color: "#0f172a",
                      background: "#ffffff",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.15s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "4px"
                    }}
                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.92rem",
                  fontWeight: "700",
                  cursor: isLoading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                  marginTop: "0.5rem",
                  transition: "transform 0.1s ease, box-shadow 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <LogIn size={17} />
                <span>{isLoading ? "Memverifikasi Akun..." : "Masuk ke Sistem"}</span>
              </button>
            </form>
          )}

          {/* TAB 2: FORM REGISTRASI DENGAN KODE UNDANGAN */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {/* Field 1: Kode Registrasi (Wajib) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "#1e293b" }}>
                    Kode Registrasi / Undangan <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Wajib dari Admin</span>
                </div>
                <div style={{ position: "relative" }}>
                  <Ticket 
                    size={17} 
                    style={{ 
                      position: "absolute", 
                      left: "12px", 
                      top: "50%", 
                      transform: "translateY(-50%)", 
                      color: "#2563eb" 
                    }} 
                  />
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: EKIN-AB12CD"
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.85rem 0.7rem 2.4rem",
                      borderRadius: "8px",
                      border: "1.5px solid #93c5fd",
                      background: "#eff6ff",
                      fontSize: "0.92rem",
                      fontWeight: "700",
                      letterSpacing: "0.05em",
                      color: "#1e3a8a",
                      boxSizing: "border-box",
                      outline: "none",
                      textTransform: "uppercase"
                    }}
                    required
                  />
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>
                  Hanya pengguna dengan kode resmi yang dapat mendaftarkan akun baru.
                </div>
              </div>

              {/* Field 2 & 3: Nama Lengkap & NIP */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.35rem" }}>
                    Nama Lengkap &amp; Gelar <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Dr. Ir. Budi Santoso"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box"
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.35rem" }}>
                    NIP Pegawai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    placeholder="198507... atau -"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
              </div>

              {/* Field 4: Username */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.35rem" }}>
                  Username Baru <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="budi_santoso"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem 0.65rem 2.2rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
              </div>

              {/* Field 5 & 6: Password & Konfirmasi Password */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.35rem" }}>
                    Password <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 karakter"
                      style={{
                        width: "100%",
                        padding: "0.65rem 2.2rem 0.65rem 0.8rem",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.85rem",
                        boxSizing: "border-box"
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b"
                      }}
                    >
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.35rem" }}>
                    Konfirmasi Password <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
              </div>

              {/* Data Kedinasan Tambahan (Opsional) */}
              <div style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "0.75rem",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569" }}>
                  Data Kedinasan Tambahan (Bisa diisi sekarang atau nanti):
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <input
                      type="text"
                      value={regPangkat}
                      onChange={(e) => setRegPangkat(e.target.value)}
                      placeholder="Pangkat (contoh: Penata Muda / III/a)"
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.7rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.78rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={regJabatan}
                      onChange={(e) => setRegJabatan(e.target.value)}
                      placeholder="Jabatan (contoh: Pranata Komputer)"
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.7rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.78rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={regUnitKerja}
                    onChange={(e) => setRegUnitKerja(e.target.value)}
                    placeholder="Unit Kerja (contoh: SMK N 07 SAMARINDA)"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.7rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.78rem",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.92rem",
                  fontWeight: "700",
                  cursor: isLoading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
                  marginTop: "0.4rem",
                  transition: "transform 0.1s ease, box-shadow 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <UserPlus size={17} />
                <span>{isLoading ? "Mendaftarkan Akun..." : "Daftar & Masuk Sekarang"}</span>
              </button>
            </form>
          )}

          {/* Footer Security Note */}
          <div style={{
            marginTop: "1.5rem",
            paddingTop: "1.2rem",
            borderTop: "1px solid #f1f5f9",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.74rem", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              <ShieldCheck size={14} style={{ color: "#059669" }} />
              <span>Sistem Terotentikasi &amp; Terproteksi Kode Undangan</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "3px" }}>
              Belum memiliki kode registrasi? Hubungi Super Administrator instansi Anda.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
