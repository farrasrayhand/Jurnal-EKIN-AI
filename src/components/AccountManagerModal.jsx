import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  ShieldCheck, 
  User, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Search,
  LogIn,
  Briefcase,
  RotateCcw,
  Plus,
  Tag,
  Sparkles,
  Key,
  Lock,
  Sliders,
  CheckCheck,
  Crown,
  Copy,
  Ticket,
  Clock,
  Calendar,
  Hash,
  RefreshCw
} from "lucide-react";
import { 
  getAccounts, 
  saveAccount, 
  deleteAccount, 
  downloadExcelTemplate, 
  importAccountsFromExcel,
  setCurrentUser,
  getDatabaseConfig,
  setAllAccountsEnvPermission,
  exportCurrentAccountsAsSeederCode,
  fetchRegistrationCodes,
  generateRegistrationCode,
  removeRegistrationCode
} from "../services/accountService";
import {
  getMasterJabatan,
  addJabatan,
  updateJabatan,
  deleteJabatan,
  addContohKasaran,
  deleteContohKasaran,
  resetToDefaultJabatan
} from "../services/jabatanService";

export default function AccountManagerModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUserChanged,
  allowEnvKey = true,
  onToggleAllowEnvKey,
  hasEnvKey = false,
  onOpenGeminiSettings
}) {
  const dbConfig = getDatabaseConfig();
  const [accounts, setAccounts] = useState(() => getAccounts());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("list"); // "list" | "form" | "jabatan"
  
  // State Master Jabatan & Contoh Kasaran
  const [masterJabatanList, setMasterJabatanList] = useState(() => getMasterJabatan());
  const [searchJabatanQuery, setSearchJabatanQuery] = useState("");
  const [isAddingJabatan, setIsAddingJabatan] = useState(false);
  const [editingJabatanId, setEditingJabatanId] = useState(null);
  const [jabatanFormData, setJabatanFormData] = useState({
    id: "",
    nama: "",
    kategori: "Administrasi & Tata Usaha",
    keywords: "",
    contohKasaranText: ""
  });
  const [inlineContohInputs, setInlineContohInputs] = useState({});

  // State Form Akun Baru / Edit
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    password: "",
    role: "pegawai",
    nama: "",
    nip: "",
    pangkat: "Pengatur Muda / II/a",
    jabatan: "PENGADMINISTRASI PERKANTORAN",
    unitKerja: "SMK N 07 SAMARINDA",
    allowEnvKey: true
  });

  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importRole, setImportRole] = useState("pegawai");

  // State Modal Reset Password Khusus Pengguna oleh Superadmin
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetSuccessInfo, setResetSuccessInfo] = useState(null);

  // State Manajemen Kode Registrasi / Undangan
  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [codeForm, setCodeForm] = useState({
    code: "",
    note: "",
    maxUsesOption: "1", // "1" | "5" | "10" | "25" | "50" | "custom" | "unlimited"
    customMaxUses: "10",
    expiryOption: "7d", // "1h" | "24h" | "3d" | "7d" | "30d" | "never"
    role: "pegawai"
  });
  const [codeSubmitError, setCodeSubmitError] = useState("");
  const [codeSubmitSuccess, setCodeSubmitSuccess] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const fileInputRef = useRef(null);

  const reloadRegistrationCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const list = await fetchRegistrationCodes();
      setRegistrationCodes(list);
    } catch (e) {
      console.warn("Gagal memuat kode registrasi:", e.message);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadRegistrationCodes();
    }
  }, [isOpen]);

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCodeSubmitError("");
    setCodeSubmitSuccess("");
    setIsSubmittingCode(true);

    try {
      let maxUses = null;
      if (codeForm.maxUsesOption === "unlimited") {
        maxUses = null;
      } else if (codeForm.maxUsesOption === "custom") {
        const val = parseInt(codeForm.customMaxUses, 10);
        maxUses = isNaN(val) || val <= 0 ? 1 : val;
      } else {
        maxUses = parseInt(codeForm.maxUsesOption, 10) || 1;
      }

      const now = Date.now();
      let expiresAt = null;
      switch (codeForm.expiryOption) {
        case "1h":
          expiresAt = new Date(now + 1 * 3600 * 1000).toISOString();
          break;
        case "24h":
          expiresAt = new Date(now + 24 * 3600 * 1000).toISOString();
          break;
        case "3d":
          expiresAt = new Date(now + 3 * 24 * 3600 * 1000).toISOString();
          break;
        case "7d":
          expiresAt = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
          break;
        case "30d":
          expiresAt = new Date(now + 30 * 24 * 3600 * 1000).toISOString();
          break;
        case "never":
        default:
          expiresAt = null;
          break;
      }

      const created = await generateRegistrationCode({
        code: codeForm.code.trim().toUpperCase(),
        note: codeForm.note.trim(),
        maxUses,
        expiresAt,
        role: codeForm.role || "pegawai",
        createdBy: currentUser?.username || "superadmin"
      });

      setCodeSubmitSuccess(`Kode registrasi "${created.code}" berhasil diterbitkan!`);
      setCodeForm({
        code: "",
        note: "",
        maxUsesOption: "1",
        customMaxUses: "10",
        expiryOption: "7d",
        role: "pegawai"
      });
      reloadRegistrationCodes();
    } catch (err) {
      setCodeSubmitError(err.message || "Gagal menerbitkan kode registrasi.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleDeleteCode = async (id, codeStr) => {
    if (!window.confirm(`Yakin ingin menghapus kode registrasi "${codeStr}"? Pengguna tidak akan dapat mendaftar dengan kode ini lagi.`)) {
      return;
    }
    try {
      await removeRegistrationCode(id);
      reloadRegistrationCodes();
    } catch (err) {
      alert("Gagal menghapus kode: " + err.message);
    }
  };

  const handleCopyCode = (codeStr, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeStr);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  if (!isOpen) return null;

  const reloadAccounts = () => {
    const list = getAccounts();
    setAccounts(list);
  };

  const reloadJabatan = () => {
    const list = getMasterJabatan();
    setMasterJabatanList(list);
  };

  // Handlers Master Jabatan & Contoh Kasaran
  const handleStartAddJabatan = () => {
    setJabatanFormData({
      id: "",
      nama: "",
      kategori: "Administrasi & Tata Usaha",
      keywords: "",
      contohKasaranText: ""
    });
    setEditingJabatanId(null);
    setIsAddingJabatan(true);
  };

  const handleStartEditJabatan = (j) => {
    setJabatanFormData({
      id: j.id,
      nama: j.nama,
      kategori: j.kategori || "Umum",
      keywords: Array.isArray(j.keywords) ? j.keywords.join(", ") : (j.keywords || ""),
      contohKasaranText: ""
    });
    setIsAddingJabatan(false);
    setEditingJabatanId(j.id);
  };

  const handleSaveJabatan = (e) => {
    e.preventDefault();
    if (!jabatanFormData.nama.trim()) {
      alert("Nama jabatan kedinasan wajib diisi!");
      return;
    }

    try {
      if (editingJabatanId) {
        updateJabatan(editingJabatanId, {
          nama: jabatanFormData.nama,
          kategori: jabatanFormData.kategori,
          keywords: jabatanFormData.keywords
        });
        setNotification({ type: "success", text: `Jabatan "${jabatanFormData.nama}" berhasil diperbarui!` });
      } else {
        const initialExamples = jabatanFormData.contohKasaranText
          ? jabatanFormData.contohKasaranText.split("\n").map(s => s.trim()).filter(Boolean)
          : [];
        addJabatan({
          nama: jabatanFormData.nama,
          kategori: jabatanFormData.kategori,
          keywords: jabatanFormData.keywords,
          contohKasaran: initialExamples
        });
        setNotification({ type: "success", text: `Jabatan "${jabatanFormData.nama}" berhasil ditambahkan ke Master!` });
      }
      reloadJabatan();
      setIsAddingJabatan(false);
      setEditingJabatanId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJabatan = (j) => {
    if (masterJabatanList.length <= 1) {
      alert("Tidak dapat menghapus. Harus menyisakan minimal satu master jabatan!");
      return;
    }

    if (window.confirm(`Hapus jabatan "${j.nama}" beserta seluruh contoh kasarannya? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        deleteJabatan(j.id);
        reloadJabatan();
        setNotification({ type: "success", text: `Jabatan "${j.nama}" berhasil dihapus.` });
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleAddInlineContoh = (jabatanId) => {
    const text = (inlineContohInputs[jabatanId] || "").trim();
    if (!text) return;

    try {
      addContohKasaran(jabatanId, text);
      setInlineContohInputs(prev => ({ ...prev, [jabatanId]: "" }));
      reloadJabatan();
      setNotification({ type: "success", text: "Contoh kalimat kasaran berhasil ditambahkan!" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteContoh = (jabatanId, idx) => {
    try {
      deleteContohKasaran(jabatanId, idx);
      reloadJabatan();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetSeederJabatan = () => {
    if (window.confirm("Muat ulang seluruh contoh kasaran & master jabatan bawaan (seeder)? Data perubahan kustom akan di-reset ke standar kedinasan.")) {
      resetToDefaultJabatan();
      reloadJabatan();
      setNotification({ type: "success", text: "Master jabatan dan bank contoh kasaran berhasil di-reset ke seeder bawaan!" });
    }
  };

  const handleOpenAddForm = () => {
    setFormData({
      id: "",
      username: "",
      password: "",
      role: "pegawai",
      nama: "",
      nip: "",
      pangkat: "Pengatur Muda / II/a",
      jabatan: "Pengadministrasi Perkantoran",
      unitKerja: "SMK N 07 SAMARINDA",
      allowEnvKey: true
    });
    setFormError("");
    setActiveSubTab("form");
  };

  const handleEditAccount = (acc) => {
    setFormData({
      id: acc.id,
      username: acc.username,
      password: acc.password || "",
      role: acc.role || "pegawai",
      nama: acc.nama || "",
      nip: acc.nip || "",
      pangkat: acc.pangkat || "",
      jabatan: acc.jabatan || "",
      unitKerja: acc.unitKerja || "",
      allowEnvKey: acc.allowEnvKey !== false
    });
    setFormError("");
    setActiveSubTab("form");
  };

  const handleOpenResetPassword = (acc) => {
    if (acc.role === "superadmin") {
      alert("Demi keamanan, password Superadmin hanya dapat direset dari CLI Terminal Server (Easypanel / Console):\n\n👉 npm run reset-admin <password_baru>\natau\n👉 node server/resetPassword.js <password_baru>");
      return;
    }
    setResetPasswordTarget(acc);
    setNewPasswordInput("");
    setResetSuccessInfo(null);
  };

  const handleConfirmResetPassword = () => {
    if (!resetPasswordTarget) return;
    const pass = newPasswordInput.trim();
    if (!pass || pass.length < 4) {
      alert("Password minimal 4 karakter!");
      return;
    }

    const updatedAccounts = saveAccount({
      ...resetPasswordTarget,
      password: pass,
      updatedAt: new Date().toISOString()
    });

    setAccounts(updatedAccounts);
    setResetSuccessInfo({
      username: resetPasswordTarget.username,
      password: pass
    });

    setNotification({
      type: "success",
      text: `Password untuk akun "${resetPasswordTarget.nama}" (${resetPasswordTarget.username}) berhasil diperbarui!`
    });
  };

  const handleToggleUserEnvKey = (acc) => {
    try {
      const currentAllowed = acc.allowEnvKey !== false;
      const nextAllowed = !currentAllowed;
      const updatedAccounts = saveAccount({
        ...acc,
        allowEnvKey: nextAllowed
      });
      setAccounts(updatedAccounts);
      if (currentUser?.id === acc.id) {
        const updatedCurrent = updatedAccounts.find(a => a.id === acc.id);
        if (updatedCurrent) {
          setCurrentUser(updatedCurrent);
          if (onUserChanged) onUserChanged(updatedCurrent);
        }
      }
      setNotification({
        type: "success",
        text: `Izin AI .env untuk "${acc.nama}" diubah menjadi: ${nextAllowed ? "DIIZINKAN" : "DIBATASI (Key Pribadi)"}`
      });
    } catch (err) {
      alert("Gagal mengubah izin AI: " + err.message);
    }
  };

  const handleBatchAllowAll = () => {
    const updated = setAllAccountsEnvPermission(true);
    setAccounts(updated);
    if (onToggleAllowEnvKey) onToggleAllowEnvKey(true);
    setNotification({
      type: "success",
      text: "Seluruh akun pegawai berhasil DIIZINKAN memakai API Key .env sistem!"
    });
  };

  const handleBatchDisallowAll = () => {
    const updated = setAllAccountsEnvPermission(false);
    setAccounts(updated);
    if (onToggleAllowEnvKey) onToggleAllowEnvKey(false);
    setNotification({
      type: "success",
      text: "Seluruh akun pegawai berhasil DIBATASI (wajib memasukkan Key Pribadi akun)!"
    });
  };

  const handleCopySeederCode = () => {
    try {
      const code = exportCurrentAccountsAsSeederCode();
      navigator.clipboard.writeText(code);
      setNotification({
        type: "success",
        text: "Kode Seeder Akun berhasil disalin! Tempelkan ke DEFAULT_SEED_ACCOUNTS di accountService.js sebelum build & deploy."
      });
    } catch (e) {
      alert("Gagal menyalin seeder: " + e.message);
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (acc.id === currentUser?.id) {
      alert("Anda sedang login menggunakan akun ini! Tidak dapat menghapus akun yang sedang aktif.");
      return;
    }

    if (window.confirm(`Hapus akun "${acc.nama} (${acc.username})"?\n\nSeluruh data kegiatan jurnal, bukti berkas dokumen/foto di server, dan sesi login milik pengguna ini akan ikut dihapus tuntas secara permanen agar tidak meninggalkan sampah. Lanjutkan?`)) {
      try {
        await deleteAccount(acc.id);
        reloadAccounts();
        setNotification({ 
          type: "success", 
          text: `Akun ${acc.username} beserta seluruh jurnal dan berkas fisiknya berhasil dibersihkan tuntas.` 
        });
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.username.trim()) {
      setFormError("Username wajib diisi!");
      return;
    }
    if (!formData.password.trim()) {
      setFormError("Password wajib diisi!");
      return;
    }
    if (!formData.nama.trim()) {
      setFormError("Nama Lengkap wajib diisi!");
      return;
    }

    try {
      saveAccount(formData);
      reloadAccounts();
      setActiveSubTab("list");
      setNotification({
        type: "success",
        text: formData.id ? "Akun berhasil diperbarui!" : `Akun "${formData.username}" berhasil dibuat!`
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleSwitchUser = (acc) => {
    setCurrentUser(acc);
    if (onUserChanged) onUserChanged(acc);
    setNotification({ type: "success", text: `Berhasil berganti ke akun: ${acc.nama}` });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate();
      setNotification({
        type: "success",
        text: "Template Excel (Nama, Username, Password, Level dengan Dropdown) berhasil diunduh!"
      });
    } catch (err) {
      alert("Gagal mengunduh template: " + err.message);
    }
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await importAccountsFromExcel(file, importRole);
      reloadAccounts();
      setNotification({
        type: "success",
        text: `Berhasil mengimpor data akun dari Excel! Ditambahkan: ${res.importedCount} akun baru, Diperbarui: ${res.updatedCount} akun.`
      });
      if (res.errors.length > 0) {
        alert("Catatan Impor:\n" + res.errors.join("\n"));
      }
    } catch (err) {
      alert("Gagal memproses file Excel: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Filter pencarian
  const filteredAccounts = accounts.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      a.nama?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q) ||
      a.nip?.toLowerCase().includes(q) ||
      a.jabatan?.toLowerCase().includes(q) ||
      a.unitKerja?.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
    >
      <div style={{
        background: "var(--bg-primary)",
        borderRadius: "var(--radius-lg, 12px)",
        width: "100%",
        maxWidth: "920px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow-xl)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden"
      }}>
        {/* Header Modal */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-secondary)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#dbeafe",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                  Kelola Database Akun &amp; Pegawai
                </h3>
                <span 
                  style={{
                    fontSize: "0.72rem",
                    background: "rgba(37, 99, 235, 0.12)",
                    color: "#2563eb",
                    border: "1px solid rgba(37, 99, 235, 0.25)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: "700"
                  }}
                  title="Tipe database adapter yang dikonfigurasi di file .env"
                >
                  🗄️ DB: {dbConfig.label}
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Panel Superadmin: Tambah Akun, Ekspor/Impor Excel (.xlsx), dan Kelola Akses
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            onClick={onClose}
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notifikasi Banner */}
        {notification && (
          <div style={{
            background: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
            borderBottom: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: notification.type === "success" ? "#065f46" : "#991b1b",
            padding: "0.6rem 1.5rem",
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: "600"
          }}>
            <span>{notification.text}</span>
            <button 
              onClick={() => setNotification(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Panel Khusus Superadmin: Izin Pemakaian AI Gemini dari file .env */}
        {(() => {
          const pegawaiAccounts = accounts.filter(a => a.role !== "superadmin");
          const allowedCount = pegawaiAccounts.filter(a => a.allowEnvKey !== false).length;
          const isAllAllowed = pegawaiAccounts.length > 0 && allowedCount === pegawaiAccounts.length;
          const isNoneAllowed = allowedCount === 0;

          return (
            <div style={{
              padding: "0.85rem 1.5rem",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.85rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: allowedCount > 0 
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))" 
                    : "rgba(239, 68, 68, 0.15)",
                  color: allowedCount > 0 ? "#10b981" : "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1px solid ${allowedCount > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>Izin Akses AI Gemini (.env Sistem)</span>
                    <span style={{
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isAllAllowed ? "rgba(16, 185, 129, 0.15)" : allowedCount > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: isAllAllowed ? "#10b981" : allowedCount > 0 ? "#f59e0b" : "#ef4444",
                      border: `1px solid ${isAllAllowed ? "rgba(16, 185, 129, 0.3)" : allowedCount > 0 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      fontWeight: "700"
                    }}>
                      {allowedCount} / {pegawaiAccounts.length} Pegawai Aktif
                    </span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Kontrol akses apakah pegawai dapat langsung memakai API Key dari file <code>.env</code> atau wajib memakai Key Pribadi.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleBatchAllowAll}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    fontWeight: "700",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Izinkan seluruh akun pegawai memakai API Key .env sistem"
                >
                  <CheckCheck size={13} />
                  <span>Izinkan Semua</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleBatchDisallowAll}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    fontWeight: "700",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Batasi semua akun pegawai (wajib memasukkan API Key sendiri)"
                >
                  <Lock size={13} />
                  <span>Kunci Semua</span>
                </button>
                {onOpenGeminiSettings && (
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onOpenGeminiSettings}
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      fontWeight: "600",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title="Buka panel konfigurasi kunci Gemini AI"
                  >
                    <Sliders size={13} />
                    <span>Konfigurasi AI</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Action Bar (Toolbar Ekspor/Impor Excel & Tambah) */}
        <div style={{
          padding: "0.85rem 1.5rem",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem"
        }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              className={`btn btn-sm ${activeSubTab === "list" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("list")}
              style={{ fontWeight: "600" }}
            >
              <Users size={14} />
              <span>Daftar Akun ({accounts.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeSubTab === "form" ? "btn-primary" : "btn-secondary"}`}
              onClick={handleOpenAddForm}
              style={{ fontWeight: "600" }}
            >
              <UserPlus size={14} />
              <span>+ Buat Akun Baru</span>
            </button>

            <button
              className={`btn btn-sm ${activeSubTab === "codes" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setActiveSubTab("codes");
                reloadRegistrationCodes();
              }}
              style={{ fontWeight: "600" }}
            >
              <Ticket size={14} />
              <span>Kode Registrasi ({registrationCodes.length})</span>
            </button>

            <button
              className={`btn btn-sm ${activeSubTab === "jabatan" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("jabatan")}
              style={{ fontWeight: "600" }}
            >
              <Briefcase size={14} />
              <span>Master Jabatan &amp; Contoh Kasaran ({masterJabatanList.length})</span>
            </button>
          </div>

          {activeSubTab !== "jabatan" && activeSubTab !== "codes" && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Salin Seeder Akun untuk Deploy */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopySeederCode}
              title="Salin seluruh data akun saat ini sebagai kode JavaScript untuk ditempelkan ke DEFAULT_SEED_ACCOUNTS sebelum deploy"
              style={{ fontWeight: "600", color: "#4f46e5", borderColor: "#c7d2fe", height: "32px" }}
            >
              <Copy size={13} />
              <span>Salin Seeder Deploy</span>
            </button>

            {/* Download Template Excel */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadTemplate}
              title="Unduh format tabel Excel resmi (Nama, Username, Password, Level Dropdown: pengguna/superadmin)"
              style={{ fontWeight: "600", color: "#15803d", borderColor: "#86efac", height: "32px" }}
            >
              <Download size={14} />
              <span>Unduh Template Excel</span>
            </button>

            {/* Dropdown Role Cadangan jika Kolom Level di Excel Kosong */}
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.45rem", 
                background: "var(--bg-secondary)", 
                padding: "2px 6px 2px 10px", 
                borderRadius: "var(--radius-md, 8px)", 
                border: "1px solid var(--border-subtle)",
                height: "32px",
                boxShadow: "var(--shadow-sm)"
              }}
              title="Role default jika kolom Level pada baris Excel tidak diisi (Level pada file Excel selalu diprioritaskan)"
            >
              <span style={{ fontSize: "0.74rem", fontWeight: "600", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                Role Cadangan:
              </span>
              <select
                id="select-import-role"
                className="form-select form-select-sm"
                value={importRole}
                onChange={(e) => setImportRole(e.target.value)}
                style={{
                  height: "26px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  padding: "0 1.8rem 0 0.55rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-primary)"
                }}
              >
                <option value="pegawai">Pengguna (Pegawai)</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {/* Input Hidden untuk Import Excel */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUploadExcel} 
              accept=".xlsx,.xls,.csv" 
              style={{ display: "none" }} 
            />

            {/* Upload Excel Button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Unggah berkas Excel untuk mendaftarkan atau memperbarui akun (Nama, Username, Password, Level)"
              style={{ background: "#16a34a", borderColor: "#16a34a", fontWeight: "700" }}
            >
              <Upload size={14} />
              <span>{isUploading ? "Memproses..." : "Impor Excel Akun"}</span>
            </button>
          </div>
        )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {/* SubTab 1: Daftar Akun */}
          {activeSubTab === "list" && (
            <div>
              {/* Filter Search */}
              <div style={{ marginBottom: "1rem", position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="input-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama pegawai, NIP, username, jabatan, atau unit kerja..."
                  style={{ paddingLeft: "2.2rem", fontSize: "0.85rem" }}
                />
              </div>

              {/* Tabel Akun */}
              <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "0.6rem 0.8rem", width: "4%" }}>No</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "20%" }}>Pegawai &amp; NIP</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "13%" }}>Username &amp; Pass</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "11%" }}>Role Akses</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "15%" }}>Izin AI (.env)</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "21%" }}>Jabatan &amp; Unit Kerja</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "16%", textAlign: "center" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Tidak ada data akun yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((acc, index) => {
                        const isCurrent = acc.id === currentUser?.id;
                        const isSuper = acc.role === "superadmin";

                        return (
                          <tr 
                            key={acc.id || index}
                            style={{ 
                              borderBottom: "1px solid var(--border-subtle)",
                              background: isCurrent ? "rgba(37, 99, 235, 0.05)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "center", color: "var(--text-muted)" }}>
                              {index + 1}
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                                {acc.nama}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                NIP: {acc.nip || "-"}
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <code style={{ fontSize: "0.78rem", background: "var(--bg-tertiary)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                {acc.username}
                              </code>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                Pass: ••••••••
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              {isSuper ? (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700"
                                }}>
                                  <ShieldCheck size={12} /> Superadmin
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600"
                                }}>
                                  <User size={12} /> Pegawai
                                </span>
                              )}
                              {isCurrent && (
                                <span style={{ display: "block", fontSize: "0.7rem", color: "#2563eb", fontWeight: "bold", marginTop: "2px" }}>
                                  (Akun Aktif)
                                </span>
                              )}
                            </td>

                            {/* Kolom Izin AI (.env) Per Akun */}
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>
                              {isSuper ? (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "rgba(245, 158, 11, 0.12)",
                                  color: "#d97706",
                                  fontSize: "0.72rem",
                                  fontWeight: "700"
                                }}>
                                  <Crown size={12} /> Akses Penuh
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserEnvKey(acc)}
                                  title={`Klik untuk mengubah izin: Saat ini ${acc.allowEnvKey !== false ? "DIIZINKAN pakai .env sistem" : "DIBATASI (wajib key pribadi)"}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.45rem",
                                    padding: "3px 10px",
                                    borderRadius: "16px",
                                    fontSize: "0.73rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    border: acc.allowEnvKey !== false 
                                      ? "1px solid rgba(16, 185, 129, 0.35)" 
                                      : "1px solid rgba(239, 68, 68, 0.35)",
                                    background: acc.allowEnvKey !== false 
                                      ? "rgba(16, 185, 129, 0.1)" 
                                      : "rgba(239, 68, 68, 0.1)",
                                    color: acc.allowEnvKey !== false ? "#10b981" : "#ef4444",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {acc.allowEnvKey !== false ? (
                                    <>
                                      <Sparkles size={11} style={{ color: "#10b981" }} />
                                      <span>Diizinkan (.env)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Key size={11} style={{ color: "#ef4444" }} />
                                      <span>Key Pribadi</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <div style={{ fontWeight: "600" }}>{acc.jabatan || "-"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {acc.unitKerja || "-"}
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
                                {!isCurrent && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleSwitchUser(acc)}
                                    title={`Login sebagai ${acc.nama}`}
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    <LogIn size={12} /> Masuk
                                  </button>
                                )}

                                <button
                                  className="btn btn-secondary btn-icon btn-sm"
                                  onClick={() => handleOpenResetPassword(acc)}
                                  title={isSuper ? "Password Superadmin direset via CLI Server (npm run reset-admin)" : `Reset Password Pengguna (${acc.username})`}
                                  style={{ padding: "0.25rem", color: isSuper ? "var(--text-muted)" : "#d97706" }}
                                >
                                  <Key size={13} />
                                </button>

                                <button
                                  className="btn btn-secondary btn-icon btn-sm"
                                  onClick={() => handleEditAccount(acc)}
                                  title="Ubah Data Akun"
                                  style={{ padding: "0.25rem" }}
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  className="btn btn-danger btn-icon btn-sm"
                                  onClick={() => handleDeleteAccount(acc)}
                                  title="Hapus Akun"
                                  disabled={isCurrent}
                                  style={{ padding: "0.25rem" }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Form Buat / Ubah Akun */}
          {activeSubTab === "form" && (
            <form onSubmit={handleSaveForm} style={{ maxWidth: "680px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  {formData.id ? "✏️ Perbarui Data Akun" : "➕ Buat Akun Baru Pegawai"}
                </h4>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveSubTab("list")}
                >
                  Kembali ke Daftar
                </button>
              </div>

              {formError && (
                <div style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "0.6rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Username Login *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="misal: nama_pengguna atau NIP..."
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Password *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Masukkan kata sandi akun..."
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama lengkap pegawai"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Role Pengguna</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="pegawai">👤 Pegawai Biasa</option>
                    <option value="superadmin">👑 Super Administrator</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nomor Induk Pegawai (NIP)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="18 digit NIP"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Pangkat / Golongan</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.pangkat}
                    onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
                    placeholder="misal: Penata Muda / III/a"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Jabatan Kedinasan</label>
                  <input
                    type="text"
                    className="input-field"
                    list="master-jabatan-datalist"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="misal: Pengadministrasi Perkantoran"
                  />
                  <datalist id="master-jabatan-datalist">
                    {masterJabatanList.map((j) => (
                      <option key={j.id} value={j.nama} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit Kerja / Sekolah</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.unitKerja}
                    onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                    placeholder="misal: SMK N 07 SAMARINDA"
                  />
                </div>
              </div>

              {/* Pengaturan Izin AI Gemini dari Sistem (.env) */}
              <div 
                onClick={() => setFormData({ ...formData, allowEnvKey: formData.allowEnvKey === false })}
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.85rem 1.1rem",
                  background: "var(--bg-tertiary)",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                  gap: "1rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Sparkles size={18} style={{ color: formData.allowEnvKey !== false ? "#10b981" : "var(--text-muted)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.86rem", color: "var(--text-primary)" }}>
                      Izinkan API Key AI Gemini Sistem (.env)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {formData.allowEnvKey !== false
                        ? "Pegawai ini dapat langsung memakai AI Gemini dari .env sistem tanpa wajib mengisi key pribadi."
                        : "Pegawai ini dibatasi dan diwajibkan memasukkan API Key Gemini pribadi akun."}
                    </div>
                  </div>
                </div>

                <div style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "9999px",
                  background: formData.allowEnvKey !== false ? "#10b981" : "var(--border-strong)",
                  padding: "2px",
                  transition: "background 0.2s ease",
                  flexShrink: 0
                }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    transform: formData.allowEnvKey !== false ? "translateX(20px)" : "translateX(0px)",
                    transition: "transform 0.2s ease"
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveSubTab("list")}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: "700" }}
                >
                  <Check size={16} />
                  <span>{formData.id ? "Simpan Perubahan" : "Buat Akun Pegawai"}</span>
                </button>
              </div>
            </form>
          )}

          {/* SubTab: Manajemen Kode Undangan / Registrasi */}
          {activeSubTab === "codes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Card Informasi / Edukasi Fitur */}
              <div style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Ticket size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: "800", color: "#1e3a8a", fontSize: "0.95rem" }}>
                    Sistem Kode Registrasi Terbatas &amp; Terproteksi
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#1e40af", marginTop: "2px", lineHeight: "1.45" }}>
                    Pendaftaran akun baru di <strong>Web E-Kinerja</strong> maupun <strong>Bot Telegram</strong> wajib memasukkan kode yang Anda terbitkan di sini. Anda dapat mengatur <strong>berapa kali kode boleh digunakan (kuota)</strong> dan <strong>batas waktu kadaluarsa (expired)</strong> sehingga pendaftaran aman dan tidak sembarang orang bisa membuat akun.
                  </div>
                </div>
              </div>

              {/* Form Terbitkan Kode Baru */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Plus size={16} className="text-primary" />
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)" }}>
                      Terbitkan Kode Registrasi Baru
                    </h4>
                  </div>
                </div>

                {codeSubmitError && (
                  <div style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}>
                    <AlertCircle size={15} />
                    <span>{codeSubmitError}</span>
                  </div>
                )}

                {codeSubmitSuccess && (
                  <div style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}>
                    <CheckCheck size={15} style={{ color: "#059669" }} />
                    <span>{codeSubmitSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateCode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.75rem" }}>
                    {/* Kode Khusus (Opsional) */}
                    <div>
                      <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem" }}>
                        Kustom Kode (Opsional)
                      </label>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <input
                          type="text"
                          className="input-field"
                          value={codeForm.code}
                          onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                          placeholder="Otomatis acak (EKIN-XXXX)"
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase"
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const rand = "EKIN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                            setCodeForm({ ...codeForm, code: rand });
                          }}
                          title="Acak kode otomatis"
                        >
                          🎲
                        </button>
                      </div>
                    </div>

                    {/* Batas Pemakaian (Berapa kali pakai) */}
                    <div>
                      <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem" }}>
                        Batas Pemakaian (Kuota)
                      </label>
                      <select
                        className="input-field"
                        value={codeForm.maxUsesOption}
                        onChange={(e) => setCodeForm({ ...codeForm, maxUsesOption: e.target.value })}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <option value="1">1x (Sekali Pakai / Single-Use)</option>
                        <option value="5">5x Penggunaan</option>
                        <option value="10">10x Penggunaan</option>
                        <option value="25">25x Penggunaan</option>
                        <option value="50">50x Penggunaan</option>
                        <option value="100">100x Penggunaan</option>
                        <option value="custom">Kustom Angka...</option>
                        <option value="unlimited">Tak Terbatas (Unlimited)</option>
                      </select>
                      {codeForm.maxUsesOption === "custom" && (
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          className="input-field"
                          value={codeForm.customMaxUses}
                          onChange={(e) => setCodeForm({ ...codeForm, customMaxUses: e.target.value })}
                          placeholder="Jumlah kuota..."
                          style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}
                        />
                      )}
                    </div>

                    {/* Batas Waktu (Expired) */}
                    <div>
                      <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem" }}>
                        Batas Waktu (Expired)
                      </label>
                      <select
                        className="input-field"
                        value={codeForm.expiryOption}
                        onChange={(e) => setCodeForm({ ...codeForm, expiryOption: e.target.value })}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <option value="1h">1 Jam ke depan</option>
                        <option value="24h">24 Jam (1 Hari)</option>
                        <option value="3d">3 Hari</option>
                        <option value="7d">7 Hari (1 Minggu)</option>
                        <option value="30d">30 Hari (1 Bulan)</option>
                        <option value="never">Tanpa Batas Waktu (Permanen)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.75rem", alignItems: "flex-end" }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                        Catatan / Keperluan Kode
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={codeForm.note}
                        onChange={(e) => setCodeForm({ ...codeForm, note: e.target.value })}
                        placeholder="Contoh: Undangan Perekrutan PPPK Batch 1..."
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                        Role Akun Hasil Registrasi
                      </label>
                      <select
                        className="input-field"
                        value={codeForm.role}
                        onChange={(e) => setCodeForm({ ...codeForm, role: e.target.value })}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <option value="pegawai">Pegawai ASN</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingCode}
                      className="btn btn-primary"
                      style={{ fontWeight: "700", height: "38px", whiteSpace: "nowrap" }}
                    >
                      <Plus size={15} />
                      <span>{isSubmittingCode ? "Menerbitkan..." : "Terbitkan Kode"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Daftar Kode Registrasi */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)" }}>
                    Daftar Kode Registrasi Aktif &amp; Riwayat ({registrationCodes.length})
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={reloadRegistrationCodes}
                    disabled={isLoadingCodes}
                    style={{ fontSize: "0.78rem" }}
                  >
                    <RefreshCw size={13} className={isLoadingCodes ? "animate-spin" : ""} />
                    <span>Segarkan Data</span>
                  </button>
                </div>

                <div style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>
                  {registrationCodes.length === 0 ? (
                    <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                      <Ticket size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                      <div style={{ fontWeight: "600" }}>Belum ada kode registrasi yang diterbitkan.</div>
                      <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                        Gunakan form di atas untuk menerbitkan kode pendaftaran pegawai.
                      </div>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                        <thead>
                          <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>Kode Registrasi</th>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>Status</th>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>Kuota Terpakai</th>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>Batas Waktu</th>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>Catatan &amp; Pengguna</th>
                            <th style={{ padding: "0.75rem 1rem", fontWeight: "700", textAlign: "center" }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrationCodes.map((c) => {
                            const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                            const isQuotaFull = c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses;
                            const isActive = c.isActive && !isExpired && !isQuotaFull;

                            return (
                              <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{
                                      fontFamily: "monospace",
                                      fontWeight: "800",
                                      fontSize: "0.95rem",
                                      color: "#1d4ed8",
                                      background: "#eff6ff",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "6px",
                                      border: "1px solid #bfdbfe",
                                      letterSpacing: "0.05em"
                                    }}>
                                      {c.code}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(c.code, c.id)}
                                      className="btn btn-secondary btn-icon btn-sm"
                                      title="Salin kode registrasi"
                                      style={{ width: "26px", height: "26px" }}
                                    >
                                      {copiedCodeId === c.id ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
                                    </button>
                                  </div>
                                </td>

                                <td style={{ padding: "0.75rem 1rem" }}>
                                  {isActive ? (
                                    <span style={{
                                      background: "#ecfdf5",
                                      color: "#065f46",
                                      border: "1px solid #a7f3d0",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: "700"
                                    }}>
                                      🟢 Aktif
                                    </span>
                                  ) : isQuotaFull ? (
                                    <span style={{
                                      background: "#fffbeb",
                                      color: "#92400e",
                                      border: "1px solid #fde68a",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: "700"
                                    }}>
                                      🟠 Kuota Penuh
                                    </span>
                                  ) : isExpired ? (
                                    <span style={{
                                      background: "#fef2f2",
                                      color: "#991b1b",
                                      border: "1px solid #fecaca",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: "700"
                                    }}>
                                      🔴 Kadaluarsa
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      border: "1px solid #cbd5e1",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: "700"
                                    }}>
                                      ⚪ Nonaktif
                                    </span>
                                  )}
                                </td>

                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <div style={{ fontWeight: "700", color: isQuotaFull ? "#b91c1c" : "var(--text-primary)" }}>
                                    {c.usedCount || 0} / {c.maxUses === null || c.maxUses === undefined ? "∞" : `${c.maxUses}x`}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    {c.maxUses === 1 ? "Sekali Pakai" : c.maxUses ? "Batas Kuota" : "Tak Terbatas"}
                                  </div>
                                </td>

                                <td style={{ padding: "0.75rem 1rem" }}>
                                  {c.expiresAt ? (
                                    <div>
                                      <div style={{ fontWeight: "600", fontSize: "0.78rem" }}>
                                        {new Date(c.expiresAt).toLocaleDateString("id-ID", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </div>
                                      <div style={{ fontSize: "0.7rem", color: isExpired ? "#b91c1c" : "#059669" }}>
                                        {isExpired ? "Sudah Berakhir" : "Masih Berlaku"}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: "600" }}>
                                      Permanen (Tanpa Batas)
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                                    {c.note || "-"}
                                  </div>
                                  {c.usedBy && c.usedBy.length > 0 && (
                                    <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                      {c.usedBy.map((u, i) => (
                                        <span key={i} style={{
                                          fontSize: "0.68rem",
                                          background: "var(--bg-tertiary)",
                                          padding: "0.1rem 0.35rem",
                                          borderRadius: "4px",
                                          color: "var(--text-muted)"
                                        }}>
                                          @{u.username}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCode(c.id, c.code)}
                                    className="btn btn-secondary btn-icon btn-sm"
                                    title="Hapus kode registrasi ini"
                                    style={{ color: "#dc2626" }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3: Manajemen Master Jabatan & Contoh Kasaran */}
          {activeSubTab === "jabatan" && (
            <div>
              {/* Bar Atas: Pencarian, Tambah Jabatan Baru, Reset Seeder */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "420px" }}>
                  <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input-field"
                    value={searchJabatanQuery}
                    onChange={(e) => setSearchJabatanQuery(e.target.value)}
                    placeholder="Cari nama jabatan, kategori, atau kata kunci..."
                    style={{ paddingLeft: "2.2rem", fontSize: "0.85rem", margin: 0 }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleStartAddJabatan}
                    style={{ fontWeight: "700" }}
                  >
                    <Plus size={14} />
                    <span>+ Tambah Jabatan Baru</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetSeederJabatan}
                    title="Kembalikan semua contoh kasaran ke data seeder bawaan"
                    style={{ color: "#b45309", borderColor: "rgba(245, 158, 11, 0.4)" }}
                  >
                    <RotateCcw size={14} />
                    <span>Muat Ulang Seeder Bawaan</span>
                  </button>
                </div>
              </div>

              {/* Form Tambah / Ubah Master Jabatan */}
              {(isAddingJabatan || editingJabatanId) && (
                <form onSubmit={handleSaveJabatan} style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--accent-primary, #3b82f6)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      {editingJabatanId ? "✏️ Edit Jabatan Master" : "➕ Tambah Jabatan Master Baru"}
                    </h4>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setIsAddingJabatan(false);
                        setEditingJabatanId(null);
                      }}
                    >
                      Batal
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nama Jabatan Kedinasan *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={jabatanFormData.nama}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, nama: e.target.value })}
                        placeholder="misal: Arsiparis Ahli Pertama"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Kategori / Rumpun</label>
                      <input
                        type="text"
                        className="input-field"
                        value={jabatanFormData.kategori}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, kategori: e.target.value })}
                        placeholder="misal: Kearsipan & Dokumentasi"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label">Kata Kunci Pencocokan (Pisahkan dengan koma)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={jabatanFormData.keywords}
                      onChange={(e) => setJabatanFormData({ ...jabatanFormData, keywords: e.target.value })}
                      placeholder="misal: arsip, kearsipan, berkas, naskah dinas, dokumen"
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Kata kunci digunakan sistem untuk mencocokkan jabatan pegawai secara otomatis dengan contoh kasaran yang tepat.
                    </span>
                  </div>

                  {!editingJabatanId && (
                    <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                      <label className="form-label">Contoh Kalimat Kasaran Awal (Opsional, 1 baris per contoh)</label>
                      <textarea
                        className="textarea-field"
                        rows={3}
                        value={jabatanFormData.contohKasaranText}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, contohKasaranText: e.target.value })}
                        placeholder={"arsip dokumen sk pensiun guru ke lemari b\ninput daftar berkas arsip dinamis ke aplikasi srikandi"}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setIsAddingJabatan(false);
                        setEditingJabatanId(null);
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ fontWeight: "700" }}
                    >
                      <Check size={14} />
                      <span>{editingJabatanId ? "Simpan Perubahan" : "Tambahkan ke Master Jabatan"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Daftar Kartu Master Jabatan */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {masterJabatanList
                  .filter(j => {
                    const q = searchJabatanQuery.toLowerCase();
                    return (
                      j.nama.toLowerCase().includes(q) ||
                      (j.kategori && j.kategori.toLowerCase().includes(q)) ||
                      (Array.isArray(j.keywords) && j.keywords.some(k => k.toLowerCase().includes(q)))
                    );
                  })
                  .map((j) => (
                    <div 
                      key={j.id} 
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "1rem 1.25rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                    >
                      {/* Baris Atas: Nama Jabatan, Kategori, Action */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: "800", fontSize: "0.98rem", color: "var(--text-primary)" }}>
                              {j.nama}
                            </span>
                            <span style={{
                              fontSize: "0.72rem",
                              background: "rgba(59, 130, 246, 0.12)",
                              color: "#2563eb",
                              border: "1px solid rgba(59, 130, 246, 0.25)",
                              padding: "1px 8px",
                              borderRadius: "10px",
                              fontWeight: "700"
                            }}>
                              {j.kategori || "Umum"}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              ({j.contohKasaran?.length || 0} contoh kasaran)
                            </span>
                          </div>

                          {j.keywords && j.keywords.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "4px", flexWrap: "wrap" }}>
                              <Tag size={11} style={{ color: "var(--text-muted)" }} />
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Kata kunci:</span>
                              {j.keywords.map((kw, kwIdx) => (
                                <span key={kwIdx} style={{
                                  fontSize: "0.68rem",
                                  background: "var(--bg-primary)",
                                  border: "1px solid var(--border-subtle)",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  color: "var(--text-secondary)"
                                }}>
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStartEditJabatan(j)}
                            title="Edit Nama / Kategori / Keywords Jabatan"
                            style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteJabatan(j)}
                            title="Hapus Jabatan ini"
                            style={{ padding: "3px 8px", fontSize: "0.75rem", color: "#dc2626", borderColor: "rgba(220, 38, 38, 0.3)" }}
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>

                      {/* Form Cepat Tambah Contoh Kasaran ke Jabatan ini */}
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.6rem" }}>
                        <input
                          type="text"
                          className="input-field"
                          style={{ fontSize: "0.78rem", padding: "5px 10px", margin: 0 }}
                          placeholder={`Tambah kalimat kasaran baru untuk ${j.nama} (Tekan Enter atau klik + Tambah)...`}
                          value={inlineContohInputs[j.id] || ""}
                          onChange={(e) => setInlineContohInputs({ ...inlineContohInputs, [j.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddInlineContoh(j.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: "0.78rem", padding: "5px 12px", whiteSpace: "nowrap" }}
                          onClick={() => handleAddInlineContoh(j.id)}
                        >
                          <Plus size={13} />
                          <span>+ Tambah</span>
                        </button>
                      </div>

                      {/* Daftar Chips Contoh Kasaran */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                        {(!j.contohKasaran || j.contohKasaran.length === 0) ? (
                          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            Belum ada contoh kasaran. Tambahkan kalimat santai melalui kolom di atas!
                          </span>
                        ) : (
                          j.contohKasaran.map((contoh, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "var(--bg-primary)",
                                border: "1px solid var(--border-strong)",
                                borderRadius: "14px",
                                padding: "3px 8px 3px 10px",
                                fontSize: "0.72rem",
                                color: "var(--text-secondary)"
                              }}
                            >
                              <span>"{contoh}"</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteContoh(j.id, cIdx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "0 2px",
                                  display: "flex",
                                  alignItems: "center",
                                  borderRadius: "50%"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "#dc2626"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                title="Hapus contoh kalimat kasaran ini"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}

                {masterJabatanList.filter(j => {
                  const q = searchJabatanQuery.toLowerCase();
                  return (
                    j.nama.toLowerCase().includes(q) ||
                    (j.kategori && j.kategori.toLowerCase().includes(q)) ||
                    (Array.isArray(j.keywords) && j.keywords.some(k => k.toLowerCase().includes(q)))
                  );
                }).length === 0 && (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                    <Briefcase size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontWeight: "600" }}>Tidak ada jabatan yang cocok dengan pencarian "{searchJabatanQuery}".</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSearchJabatanQuery("")}
                      style={{ marginTop: "0.5rem" }}
                    >
                      Bersihkan Pencarian
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog: Reset Password Pengguna oleh Superadmin */}
      {resetPasswordTarget && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10005,
            padding: "1rem"
          }}
        >
          <div style={{
            background: "var(--bg-primary, #ffffff)",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "440px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-subtle)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              padding: "1.25rem 1.5rem",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Key size={20} style={{ color: "#fde68a" }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700" }}>
                    Reset Password Pengguna
                  </h4>
                  <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                    Akses Khusus Super Administrator
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.5rem" }}>
              {resetSuccessInfo ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem auto"
                  }}>
                    <Check size={24} />
                  </div>

                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#065f46" }}>
                    Password Berhasil Direset!
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                    Password baru telah aktif dan tersinkronisasi ke server.
                  </p>

                  <div style={{
                    background: "var(--bg-tertiary, #f8fafc)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    textAlign: "left",
                    marginBottom: "1.25rem"
                  }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Username:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                      {resetSuccessInfo.username}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Password Baru:</div>
                    <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "#2563eb", fontFamily: "monospace" }}>
                      {resetSuccessInfo.password}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => {
                        navigator.clipboard.writeText(`Akun E-Kinerja ASN:\nUsername: ${resetSuccessInfo.username}\nPassword: ${resetSuccessInfo.password}`);
                        alert("Kredensial login berhasil disalin ke papan klip!");
                      }}
                    >
                      <Copy size={14} />
                      <span>Salin Kredensial</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setResetPasswordTarget(null)}
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    background: "var(--bg-tertiary, #f8fafc)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    marginBottom: "1.25rem"
                  }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pegawai / Pengguna:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      {resetPasswordTarget.nama}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Username: <code>{resetPasswordTarget.username}</code> &bull; NIP: {resetPasswordTarget.nip || "-"}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                      Masukkan Password Baru:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Masukkan kata sandi baru (atau klik Buat Acak)"
                      style={{ width: "100%", fontFamily: "monospace", fontSize: "0.9rem" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Minimal 4 karakter
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "abcdefghjkmnpqrstuvwxyz23456789";
                          let rnd = "";
                          for (let i = 0; i < 8; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
                          setNewPasswordInput(rnd);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        🎲 Buat Acak
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setResetPasswordTarget(null)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmResetPassword}
                      disabled={!newPasswordInput.trim() || newPasswordInput.trim().length < 4}
                    >
                      <Key size={14} />
                      <span>Simpan Password Baru</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
