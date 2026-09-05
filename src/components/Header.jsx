import React, { useState, useRef, useEffect } from "react";
import { 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  Key, 
  Award, 
  ShieldCheck, 
  LogOut,
  ChevronDown,
  Database,
  Send
} from "lucide-react";

export default function Header({
  theme,
  setTheme,
  onOpenGeminiModal,
  onExportJson,
  onImportJson,
  onNavigate,
  currentUser,
  onOpenLoginModal,
  onOpenAccountManagerModal,
  onLogout,
  apiKeyInfo = { key: "", source: "none", label: "Mode Offline" },
  botConfig = { enabled: false, username: "" }
}) {
  const activeKeyInfo = apiKeyInfo || { key: "", source: "none", label: "Mode Offline" };
  const fileInputRef = useRef(null);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dataMenuRef = useRef(null);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target)) {
        setIsDataMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result);
        onImportJson(json);
        setIsDataMenuOpen(false);
      } catch {
        alert("File JSON tidak valid!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  // Konfigurasi warna status AI
  const aiStatusConfig = activeKeyInfo.source === "env" 
    ? { dotColor: "#10b981", textColor: "#059669", bg: "rgba(16, 185, 129, 0.09)", border: "rgba(16, 185, 129, 0.3)", label: "AI: .env Sistem" }
    : activeKeyInfo.source === "personal"
    ? { dotColor: "#8b5cf6", textColor: "#7c3aed", bg: "rgba(139, 92, 246, 0.09)", border: "rgba(139, 92, 246, 0.3)", label: "AI: Key Pribadi" }
    : { dotColor: "#f59e0b", textColor: "#d97706", bg: "rgba(245, 158, 11, 0.09)", border: "rgba(245, 158, 11, 0.3)", label: "AI: Mode Offline" };

  const userInitial = currentUser?.nama ? currentUser.nama.charAt(0).toUpperCase() : "U";
  const userFirstName = currentUser?.nama ? currentUser.nama.split(" ")[0] : "Akun";

  return (
    <header className="app-header no-print">
      <div className="header-inner">
        {/* Brand Logo & Judul Aplikasi */}
        <div 
          className="brand-wrapper"
          onClick={() => onNavigate && onNavigate("home")}
          style={{ cursor: "pointer" }}
          title="Klik untuk kembali ke Beranda"
        >
          <div className="brand-icon-box">
            <Award size={24} />
          </div>
          <div className="brand-text">
            <h1>
              Laporan Kinerja AI
              <span className="brand-badge">Format Laporan Bulanan</span>
            </h1>
            <p className="brand-subtitle">
              Catatan Harian Kasaran &bull; AI Poles Bahasa Formal Kedinasan &bull; Siap Cetak PDF &amp; Google Drive
            </p>
          </div>
        </div>

        {/* Toolbar Aksi Navbar yang Rapi & Terorganisir */}
        <div className="header-actions">
          {/* 1. Status AI Pill */}
          <button 
            type="button"
            className="nav-ai-pill"
            onClick={onOpenGeminiModal}
            title={
              activeKeyInfo.source === "env" 
                ? "Gemini AI Online (Menggunakan API Key Bersama dari .env Sistem) - Klik untuk info / ganti" 
                : activeKeyInfo.source === "personal" 
                ? "Gemini AI Online (Menggunakan API Key Pribadi Anda) - Klik untuk kelola key" 
                : "AI berjalan dalam Mode Cerdas Offline bawaan (Tetap bisa memoles tanpa API Key) - Klik untuk tambah API Key Online"
            }
            style={{
              background: aiStatusConfig.bg,
              borderColor: aiStatusConfig.border,
              color: aiStatusConfig.textColor
            }}
          >
            <span className="pulse-dot" style={{ background: aiStatusConfig.dotColor, color: aiStatusConfig.dotColor }} />
            <Key size={13} style={{ color: aiStatusConfig.textColor }} />
            <span>{aiStatusConfig.label}</span>
          </button>

          {/* Tombol Akses Cepat Bot Telegram (Hanya Tampil Jika Bot Sudah Dikonfigurasi di .env) */}
          {botConfig?.enabled && (
            <a
              href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-telegram-nav"
              title={`Chat Bot Telegram (@${botConfig.username || "Bot"}) - Catat jurnal & minta laporan PDF lewat chat`}
            >
              <Send size={13} style={{ transform: "rotate(45deg)", marginLeft: "-2px" }} />
              <span>Chat di Telegram</span>
            </a>
          )}

          {/* 2. Menu Cadangan Data (Backup & Restore Dropdown) */}
          <div className="nav-dropdown-wrapper" ref={dataMenuRef}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              style={{ display: "none" }} 
            />

            <button 
              type="button"
              className={`nav-dropdown-btn ${isDataMenuOpen ? "active" : ""}`}
              onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
              title="Cadangan & Pemulihan Data Logbook (JSON)"
            >
              <Database size={14} />
              <span>Cadangan Data</span>
              <ChevronDown 
                size={13} 
                style={{ 
                  opacity: 0.7, 
                  transform: isDataMenuOpen ? "rotate(180deg)" : "none", 
                  transition: "transform 0.2s" 
                }} 
              />
            </button>

            {isDataMenuOpen && (
              <div className="nav-dropdown-menu">
                <button 
                  type="button"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setIsDataMenuOpen(false);
                    onExportJson();
                  }}
                  title="Unduh file JSON cadangan seluruh jurnal dan profil"
                >
                  <Download size={15} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: "700" }}>Unduh Cadangan (Backup)</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Simpan data ke file .json</div>
                  </div>
                </button>

                <button 
                  type="button"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setIsDataMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  title="Buka dan pulihkan data dari file JSON cadangan"
                >
                  <Upload size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: "700" }}>Buka File Cadangan</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Pulihkan data dari file .json</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="nav-divider" />

          {/* 3. Tombol Panel Superadmin (Tampil Khusus Akun Superadmin) */}
          {isSuperadmin && (
            <button 
              type="button"
              className="btn-superadmin-nav"
              onClick={onOpenAccountManagerModal}
              title="Panel Superadmin: Manajemen Database Akun & Master Jabatan ASN"
            >
              <ShieldCheck size={14} />
              <span>👑 Kelola Akun</span>
            </button>
          )}

          {/* 4. Kapsul Profil Pengguna Aktif (Klik untuk Ganti Akun) */}
          <div 
            className="nav-user-capsule"
            onClick={onOpenLoginModal}
            title={`Akun: ${currentUser?.nama || "Pegawai"} (${currentUser?.username || ""}) - Klik untuk ganti akun`}
          >
            <div className={`user-avatar-badge ${isSuperadmin ? "admin" : ""}`}>
              {userInitial}
            </div>
            <div className="user-info-mini">
              <span className="user-name-mini">{userFirstName}</span>
              <span className="user-role-mini">{isSuperadmin ? "Superadmin" : "Pegawai"}</span>
            </div>
          </div>

          {/* 5. Tombol Logout / Keluar */}
          <button
            type="button"
            className="btn-nav-action btn-nav-logout"
            onClick={onLogout}
            title="Keluar dari Akun (Logout)"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>

          {/* 6. Tombol Toggle Tema (Terang / Gelap) */}
          <button 
            type="button"
            className="btn-nav-action"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
