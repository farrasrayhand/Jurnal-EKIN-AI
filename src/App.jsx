import React, { useState, useEffect, useRef, useCallback } from "react";
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
  getServerAiConfig,
  fetchServerAiStatus,
  getSessionInfo
} from "./services/accountService";

import { Home, Camera, FileText } from "lucide-react";

export default function App() {
  // Theme state (Dark/Light)
  const [theme, setTheme] = useState(() => localStorage.getItem("ekinerja_theme") || "light");

  // Status integrasi bot telegram (sembunyi otomatis jika belum di-set di env)
  const [botConfig, setBotConfig] = useState(() => getTelegramBotConfig());

  // Status integrasi Gemini AI server-side (aktif otomatis jika GEMINI_API_KEY diset di backend env)
  const [serverAiConfig, setServerAiConfig] = useState(() => getServerAiConfig());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ekinerja_theme", theme);
  }, [theme]);

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

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const isRemoteSyncRef = useRef(false);

  // Fungsi Sinkronisasi Aktif (Server Database, Telegram Bot & Web LocalStorage)
  const fetchAndSyncJournals = useCallback(async (isManual = false) => {
    try {
      setIsSyncing(true);
      const res = await syncWithBackend();
      if (res) {
        if (res.botConfig) {
          setBotConfig(res.botConfig);
        }
        if (res.aiConfig) {
          setServerAiConfig(res.aiConfig);
        }
        if (Array.isArray(res.journals)) {
          isRemoteSyncRef.current = true;
          setJournals(prev => {
            const map = new Map();
            // 1. Masukkan seluruh jurnal dari server backend (authoritative source)
            res.journals.forEach(j => {
              if (j && j.id) map.set(j.id, j);
            });
            // 2. Pertahankan entri lokal yang belum sempat ter-push
            prev.forEach(j => {
              if (j && j.id && !map.has(j.id)) {
                map.set(j.id, j);
              }
            });
            // 3. Urutkan secara kronologis terbalik (tanggal terbaru & createdAt terbaru selalu di atas)
            const sorted = Array.from(map.values()).sort((a, b) => {
              const diffDate = String(b.tanggal || "").localeCompare(String(a.tanggal || ""));
              if (diffDate !== 0) return diffDate;
              return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
            });
            try {
              localStorage.setItem("ekinerja_journals", JSON.stringify(sorted));
            } catch (e) {}
            return sorted;
          });
        }
        setLastSyncTime(new Date());
      }
    } catch (e) {
      console.warn("Sinkronisasi jurnal latar belakang tertunda:", e?.message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Simpan ke localStorage & push ke backend saat jurnal diubah oleh pengguna web
  useEffect(() => {
    try {
      localStorage.setItem("ekinerja_journals", JSON.stringify(journals));
      if (isRemoteSyncRef.current) {
        isRemoteSyncRef.current = false;
        return;
      }
      pushSyncToBackend({ journals });
    } catch (e) {}
  }, [journals]);

  // Inisialisasi Database Akun & Sinkronisasi Awal dengan Backend Store (Telegram Bot)
  useEffect(() => {
    initAccountDatabase();
    fetchTelegramBotStatus().then(cfg => {
      if (cfg) setBotConfig(cfg);
    });
    fetchServerAiStatus().then(cfg => {
      if (cfg) setServerAiConfig(cfg);
    });
    fetchAndSyncJournals();
  }, [fetchAndSyncJournals]);

  // Sinkronisasi Otomatis saat Window Mendapat Fokus Kembali (User balik dari Telegram Desktop / HP)
  useEffect(() => {
    const handleFocus = () => fetchAndSyncJournals();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAndSyncJournals();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAndSyncJournals]);

  // Polling Latar Belakang Setiap 12 Detik Agar Jurnal Telegram Otomatis Muncul Tanpa Refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAndSyncJournals();
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchAndSyncJournals]);

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

  // Navigasi Tab dengan Sinkronisasi URL Hash & Auto-Refresh Data
  const navigateToTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
    fetchAndSyncJournals();
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

  // Data Profil Pegawai (Sinkron otomatis dengan Akun yang Sedang Aktif)
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
    fetchAndSyncJournals();
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
    } catch (e) {}
  }, [pegawai]);



  // Setting Izin API Key .env oleh Superadmin
  const [allowEnvKey, setAllowEnvKeyState] = useState(() => getAllowEnvKeySetting());

  const handleToggleAllowEnvKey = (allowed) => {
    setAllowEnvKeyState(allowed);
    setAllowEnvKeySetting(allowed);
  };

  // Gemini API Key dari .env (Client-side Vite build atau Server-side Node.js runtime)
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const isKeyFromEnv = Boolean(envApiKey) || Boolean(serverAiConfig?.hasServerKey || serverAiConfig?.enabled);

  // Hitung API Key Efektif (Apakah menggunakan .env atau key akun pribadi)
  const effectiveApiKeyInfo = resolveEffectiveApiKey(currentUser, envApiKey, serverAiConfig);
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
      periode,
      journals
    };
    exportToJson(payload);
  };

  // Import JSON
  const handleImportJson = (json) => {
    if (json.pegawai) setPegawai(json.pegawai);
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
        isSyncing={isSyncing}
        onRefreshSync={() => fetchAndSyncJournals(true)}
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
          isSyncing={isSyncing}
          onRefreshSync={() => fetchAndSyncJournals(true)}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* Content Tab 2: Generator Laporan Bulanan (Siap Cetak A4 / PDF & Upload Google Drive) */}
      {activeTab === "laporan" && (
        <MonthlyReportGenerator 
          pegawai={pegawai}
          setPegawai={setPegawai}
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
        hasEnvKey={isKeyFromEnv}
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
        serverAiConfig={serverAiConfig}
        allowEnvKey={allowEnvKey}
        onToggleAllowEnvKey={handleToggleAllowEnvKey}
      />
    </div>
  );
}
