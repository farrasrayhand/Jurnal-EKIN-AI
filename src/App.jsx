import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import HomeSection from "./components/HomeSection";
import JournalSection from "./components/JournalSection";
import MonthlyReportGenerator from "./components/MonthlyReportGenerator";
import GeminiModal from "./components/GeminiModal";
import AccountManagerModal from "./components/AccountManagerModal";
import LoginModal from "./components/LoginModal";
import LoginPage from "./components/LoginPage";
import InitialSetupModal from "./components/InitialSetupModal";

import { exportToJson } from "./services/exportService";
import { 
  initAccountDatabase, 
  getCurrentUser, 
  setCurrentUser as saveCurrentUser, 
  logout,
  isProfileIncomplete,
  getAllowEnvKeySetting,
  setAllowEnvKeySetting,
  resolveEffectiveApiKey,
  saveAccount,
  syncWithBackend,
  pushSyncToBackend,
  getTelegramBotConfig,
  fetchTelegramBotStatus,
  getSessionInfo
} from "./services/accountService";

import { Home, Camera, FileText } from "lucide-react";

export default function App() {
  // Theme state (Dark/Light)
  const [theme, setTheme] = useState(() => localStorage.getItem("ekinerja_theme") || "light");

  // Status integrasi bot telegram (sembunyi otomatis jika belum di-set di env)
  const [botConfig, setBotConfig] = useState(() => getTelegramBotConfig());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ekinerja_theme", theme);
  }, [theme]);

  // Inisialisasi Database Akun & Sinkronisasi dengan Backend Store (Telegram Bot)
  useEffect(() => {
    initAccountDatabase();
    fetchTelegramBotStatus().then(cfg => {
      if (cfg) setBotConfig(cfg);
    });
    syncWithBackend().then(res => {
      if (res && res.botConfig) {
        setBotConfig(res.botConfig);
      }
      if (res && Array.isArray(res.journals) && res.journals.length > 0) {
        setJournals(prev => {
          const map = new Map(prev.map(j => [j.id, j]));
          res.journals.forEach(j => {
            if (!map.has(j.id)) map.set(j.id, j);
          });
          return Array.from(map.values());
        });
      }
    });
  }, []);

  // Verifikasi keabsahan session aktif (1 hari / 24 jam) ke backend di latar belakang
  useEffect(() => {
    const session = getSessionInfo();
    if (session && session.token) {
      fetch(`/api/auth/verify-session?token=${encodeURIComponent(session.token)}`)
        .then(r => r.json())
        .then(res => {
          if (res && res.valid === false) {
            // Sesi telah expired di database atau dicabut
            logout();
            setCurrentUserState(null);
          }
        })
        .catch(() => {
          // Mode offline: tetap andalkan validasi expiresAt lokal
        });
    }
  }, []);

  // State Pengguna & Autentikasi
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);

  // Periksa apakah akun pegawai baru memerlukan setup awal identitas wajib
  useEffect(() => {
    if (currentUser && isProfileIncomplete(currentUser)) {
      setIsInitialSetupOpen(true);
    } else {
      setIsInitialSetupOpen(false);
    }
  }, [currentUser]);

  // URL Hash Routing Helper
  const getTabFromHash = () => {
    const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
    if (hash === "laporan") return "laporan";
    if (hash === "jurnal") return "jurnal";
    if (hash === "home" || hash === "beranda") return "home";
    return "home"; // default halaman utama adalah Beranda
  };

  // Tab State: "home" | "jurnal" | "laporan"
  const [activeTab, setActiveTab] = useState(getTabFromHash);

  // Navigasi Tab dengan Sinkronisasi URL Hash di Browser
  const navigateToTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  // Sinkronisasi dengan tombol Back/Forward browser dan perubahan URL langsung
  useEffect(() => {
    const handleHashChange = () => {
      if (!currentUser) return;
      const tab = getTabFromHash();
      setActiveTab(tab);
    };

    window.addEventListener("hashchange", handleHashChange);

    // Set initial hash
    if (currentUser) {
      const rawHash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
      if (!rawHash || rawHash === "login" || rawHash === "register" || rawHash === "daftar" || rawHash === "masuk") {
        window.location.hash = `#/home`;
      }
    } else {
      const rawHash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
      if (rawHash !== "login" && rawHash !== "register" && rawHash !== "daftar") {
        let defaultAuthTab = "login";
        try {
          const saved = localStorage.getItem("ekinerja_auth_tab");
          if (saved === "register") defaultAuthTab = "register";
        } catch (e) {}
        window.location.hash = `#${defaultAuthTab}`;
      }
    }

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser]);

  // Data Profil Pegawai & Penilai (Sinkron otomatis dengan Akun yang Sedang Aktif)
  const [pegawai, setPegawai] = useState(() => {
    const user = getCurrentUser();
    if (user && user.nama) {
      return {
        nama: user.nama,
        nip: user.nip || "",
        pangkat: user.pangkat || "Pengatur Muda / II/a",
        jabatan: user.jabatan || "PENGADMINISTRASI PERKANTORAN",
        unitKerja: user.unitKerja || "SMK N 07 SAMARINDA"
      };
    }
    return {
      nama: "MUHAMMAD FARRAS RAYHAND",
      nip: "200011192025211007",
      pangkat: "Pengatur Muda / II/a",
      jabatan: "PENGADMINISTRASI PERKANTORAN",
      unitKerja: "SMK N 07 SAMARINDA"
    };
  });

  // Handler saat berganti akun
  const handleUserChanged = (user) => {
    setCurrentUserState(user);
    saveCurrentUser(user);
    if (user) {
      setPegawai({
        nama: user.nama || "",
        nip: user.nip || "",
        pangkat: user.pangkat || "Pengatur Muda / II/a",
        jabatan: user.jabatan || "PENGADMINISTRASI PERKANTORAN",
        unitKerja: user.unitKerja || "SMK N 07 SAMARINDA"
      });
      const rawHash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
      if (!rawHash || rawHash === "login" || rawHash === "register" || rawHash === "daftar" || rawHash === "masuk") {
        window.location.hash = `#/home`;
        setActiveTab("home");
      }
    }
  };

  const [penilai, setPenilai] = useState(() => {
    try {
      const saved = localStorage.getItem("laporan_penilai");
      return saved ? JSON.parse(saved) : {
        nama: "ANDA SUPANDA, S.Pd, M.Pd",
        nip: "197505201998021001",
        pangkat: "Pembina Tingkat I / IV/b",
        jabatan: "Kepala Sekolah",
        unitKerja: "SMK N 07 SAMARINDA"
      };
    } catch (e) {
      return {
        nama: "ANDA SUPANDA, S.Pd, M.Pd",
        nip: "197505201998021001",
        pangkat: "Pembina Tingkat I / IV/b",
        jabatan: "Kepala Sekolah",
        unitKerja: "SMK N 07 SAMARINDA"
      };
    }
  });

  const [periode, setPeriode] = useState({
    mulai: "1 Januari 2026",
    selesai: "31 Desember 2026"
  });

  const [pendekatan, setPendekatan] = useState("KUANTITATIF");
  const [intervensiPimpinan, setIntervensiPimpinan] = useState(
    "Tersusunnya perencanaan satuan pendidikan dalam mewujudkan pendidikan yang bermutu untuk semua"
  );

  // Simpan data profil ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem("laporan_pegawai", JSON.stringify(pegawai));
      localStorage.setItem("laporan_penilai", JSON.stringify(penilai));
    } catch (e) {}
  }, [pegawai, penilai]);

  // Data Jurnal Harian & Bukti Foto Kerja (Dimulai bersih dari kosong)
  const [journals, setJournals] = useState(() => {
    try {
      const saved = localStorage.getItem("ekinerja_journals");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Hapus otomatis item demo lama jika ada
        const userItems = parsed.filter(j => !j.id?.toString().startsWith("demo-") && !j.id?.toString().startsWith("jrn-smk-"));
        return userItems;
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ekinerja_journals", JSON.stringify(journals));
      pushSyncToBackend({ journals });
    } catch (e) {}
  }, [journals]);

  // Setting Izin API Key .env oleh Superadmin
  const [allowEnvKey, setAllowEnvKeyState] = useState(() => getAllowEnvKeySetting());

  const handleToggleAllowEnvKey = (allowed) => {
    setAllowEnvKeyState(allowed);
    setAllowEnvKeySetting(allowed);
  };

  // Gemini API Key dari .env
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const isKeyFromEnv = Boolean(envApiKey);

  // Hitung API Key Efektif (Apakah menggunakan .env atau key akun pribadi)
  const effectiveApiKeyInfo = resolveEffectiveApiKey(currentUser, envApiKey);
  const activeGeminiKey = effectiveApiKeyInfo.key;

  // Modal Gemini Key
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  const handleSaveUserKey = (personalKey, usePersonal) => {
    const updatedUser = {
      ...currentUser,
      personalApiKey: personalKey,
      usePersonalKey: usePersonal
    };
    saveAccount(updatedUser);
    handleUserChanged(updatedUser);
  };

  // Ekspor JSON Backup
  const handleExportJson = () => {
    const payload = {
      version: "2.0-monthly-report",
      exportDate: new Date().toISOString(),
      pegawai,
      penilai,
      periode,
      journals
    };
    exportToJson(payload);
  };

  // Import JSON
  const handleImportJson = (json) => {
    if (json.pegawai) setPegawai(json.pegawai);
    if (json.penilai) setPenilai(json.penilai);
    if (json.periode) setPeriode(json.periode);
    if (Array.isArray(json.journals)) setJournals(json.journals);
    alert("Data berhasil dipulihkan dari cadangan JSON!");
  };


  // Keluar / Logout
  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari akun?")) {
      logout();
      setCurrentUserState(null);
      let authTab = "login";
      try {
        const saved = localStorage.getItem("ekinerja_auth_tab");
        if (saved === "register") authTab = "register";
      } catch (e) {}
      window.location.hash = `#${authTab}`;
    }
  };

  // Jika belum login, tampilkan Halaman Login Mandiri
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleUserChanged} />;
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header 
        theme={theme}
        setTheme={setTheme}
        onOpenGeminiModal={() => setIsGeminiModalOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        hasGeminiKey={Boolean(activeGeminiKey)}
        isKeyFromEnv={effectiveApiKeyInfo.source === "env"}
        onNavigate={navigateToTab}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenAccountManagerModal={() => setIsAccountModalOpen(true)}
        onLogout={handleLogout}
        apiKeyInfo={effectiveApiKeyInfo}
        botConfig={botConfig}
      />

      {/* Tab Navigation dengan URL Hash */}
      <div className="tabs-nav no-print">
        <button 
          className={`tab-btn ${activeTab === "home" ? "active" : ""}`}
          onClick={() => navigateToTab("home")}
          title="Beranda & Ringkasan Dashboard"
        >
          <Home size={16} />
          <span>Beranda</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === "jurnal" ? "active" : ""}`}
          onClick={() => navigateToTab("jurnal")}
          title="Tulis Catatan Harian Kasaran & Poles AI"
        >
          <Camera size={16} />
          <span>Jurnal &amp; Bukti Foto ({journals.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === "laporan" ? "active" : ""}`}
          onClick={() => navigateToTab("laporan")}
          style={{ fontWeight: "700" }}
          title="Tabel Laporan Bulanan (PDF & Google Drive)"
        >
          <FileText size={16} />
          <span>Laporan Bulanan (PDF &amp; Drive)</span>
        </button>
      </div>

      {/* Content Tab 0: Halaman Beranda (Home Dashboard) */}
      {activeTab === "home" && (
        <HomeSection 
          pegawai={pegawai}
          journals={journals}
          onNavigate={navigateToTab}
          currentUser={currentUser}
          onOpenAccountManagerModal={() => setIsAccountModalOpen(true)}
          botConfig={botConfig}
        />
      )}

      {/* Content Tab 1: Jurnal Harian & Foto Bukti Kerja (Input Kasaran + AI Poles) */}
      {activeTab === "jurnal" && (
        <JournalSection 
          journals={journals}
          setJournals={setJournals}
          rhkList={[]}
          onSyncJournalToRhk={() => {}}
          onOpenMonthlyReport={() => navigateToTab("laporan")}
          pegawai={pegawai}
          geminiApiKey={activeGeminiKey}
          apiKeyInfo={effectiveApiKeyInfo}
          currentUser={currentUser}
        />
      )}

      {/* Content Tab 2: Generator Laporan Bulanan (Siap Cetak A4 / PDF & Upload Google Drive) */}
      {activeTab === "laporan" && (
        <MonthlyReportGenerator 
          pegawai={pegawai}
          setPegawai={setPegawai}
          penilai={penilai}
          setPenilai={setPenilai}
          rhkList={[]}
          journals={journals}
          pendekatan={pendekatan}
          onSyncLinkToRhk={() => {}}
        />
      )}

      {/* Modal Manajemen Akun Superadmin & Impor Excel */}
      <AccountManagerModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        allowEnvKey={allowEnvKey}
        onToggleAllowEnvKey={handleToggleAllowEnvKey}
        hasEnvKey={Boolean(envApiKey)}
        onOpenGeminiSettings={() => {
          setIsAccountModalOpen(false);
          setIsGeminiModalOpen(true);
        }}
      />

      {/* Modal Login & Ganti Akun */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleUserChanged}
        onLogout={handleLogout}
      />

      {/* Modal Setup Identitas Wajib Awal untuk Akun Baru */}
      <InitialSetupModal 
        isOpen={isInitialSetupOpen}
        currentUser={currentUser}
        onProfileCompleted={(updatedUser) => {
          setIsInitialSetupOpen(false);
          handleUserChanged(updatedUser);
        }}
        onLogout={handleLogout}
      />

      {/* Modal Pengaturan Gemini AI Key */}
      <GeminiModal 
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        currentUser={currentUser}
        onSaveUserKey={handleSaveUserKey}
        envApiKey={envApiKey}
        allowEnvKey={allowEnvKey}
        onToggleAllowEnvKey={handleToggleAllowEnvKey}
      />
    </div>
  );
}
