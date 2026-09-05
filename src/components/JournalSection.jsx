import React, { useState, useRef } from "react";
import { 
  BookOpen, Plus, Camera, Trash2, Sparkles, 
  Calendar, Clock, CheckCircle2, FileText, ExternalLink, 
  X, ZoomIn, Paperclip, FileSpreadsheet, Link2, Briefcase, Edit3,
  RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import { processEvidenceFile } from "../utils/fileUtils";
import { polishJournalWithAi } from "../services/aiService";
import { getCasualExamplesForUser } from "../services/jabatanService";
import { getAccounts } from "../services/accountService";

export default function JournalSection({
  journals,
  setJournals,
  rhkList,
  onSyncJournalToRhk,
  onOpenMonthlyReport,
  pegawai,
  geminiApiKey,
  apiKeyInfo = { key: "", source: "none" },
  currentUser,
  isSyncing = false,
  onRefreshSync = null,
  lastSyncTime = null
}) {
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isPolished, setIsPolished] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const formContainerRef = useRef(null);
  const [originalKasaran, setOriginalKasaran] = useState("");
  const [selectedJabatanOverride, setSelectedJabatanOverride] = useState("");

  const currentJabatan = pegawai?.jabatan || currentUser?.jabatan || "";
  const activeJabatanForExamples = selectedJabatanOverride || currentJabatan;
  const accounts = getAccounts();
  const casualData = getCasualExamplesForUser(activeJabatanForExamples, journals, accounts);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: "08:00 - 12:00",
    aktivitas: "",
    outputJumlah: "1 Dokumen / Kegiatan",
    rhkId: rhkList[0]?.id || "",
    catatan: "",
    attachments: [],
    evidenceType: "none", // "image" | "document" | "none"
    docCategory: "pdf",
    fileName: "",
    fileSize: "",
    fotoUrl: "",
    linkUrl: ""
  });

  const [isUploading, setIsUploading] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [notification, setNotification] = useState("");
  const fileInputRef = useRef(null);

  // Handle File Upload (Foto, PDF, Word, Excel, dll. - Mendukung Multi-File)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const newAttachments = [];

      for (const file of files) {
        const processed = await processEvidenceFile(file);

        // Upload ke backend /api/upload agar memiliki URL link langsung di aplikasi
        let serverFileUrl = "";
        let serverStoredName = "";
        let finalFileName = processed.name;
        try {
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: processed.name,
              fileData: processed.dataUrl,
              tanggal: formData.tanggal || new Date().toISOString().slice(0, 10)
            })
          });
          if (uploadRes.ok) {
            const upJson = await uploadRes.json();
            if (upJson?.fileUrl) {
              serverFileUrl = upJson.fileUrl;
            }
            if (upJson?.storedName) {
              serverStoredName = upJson.storedName;
            }
            if (upJson?.fileName) {
              finalFileName = upJson.fileName;
            }
          }
        } catch (netErr) {
          // Mode offline/standalone, gunakan dataUrl lokal
        }

        const isImg = processed.category === "image";
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: isImg ? "image" : "document",
          docCategory: isImg ? "image" : processed.type,
          fileName: finalFileName,
          storedName: serverStoredName,
          fileSize: processed.size,
          originalSize: processed.originalSize || "",
          fotoUrl: processed.dataUrl,
          fileUrl: serverFileUrl,
          linkUrl: serverFileUrl
        });
      }

      setFormData(prev => {
        const combined = [...(prev.attachments || []), ...newAttachments];
        const first = combined[0];
        return {
          ...prev,
          attachments: combined,
          evidenceType: first ? first.type : "none",
          docCategory: first ? first.docCategory : "pdf",
          fileName: first ? first.fileName : "",
          storedName: first ? first.storedName : "",
          fileSize: first ? first.fileSize : "",
          originalSize: first ? first.originalSize : "",
          fotoUrl: first ? first.fotoUrl : "",
          fileUrl: first ? first.fileUrl : "",
          linkUrl: prev.linkUrl || (first ? first.fileUrl : "")
        };
      });
    } catch (err) {
      alert("Gagal memproses file: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (attId) => {
    setFormData(prev => {
      const targetAtt = (prev.attachments || []).find(a => a.id === attId);
      if (targetAtt && (targetAtt.fileUrl || targetAtt.filePath || targetAtt.storedName)) {
        fetch("/api/uploads/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: targetAtt.fileUrl,
            filePath: targetAtt.filePath,
            fileName: targetAtt.fileName,
            storedName: targetAtt.storedName
          })
        }).catch(() => {});
      }

      const remaining = (prev.attachments || []).filter(a => a.id !== attId);
      const first = remaining[0];
      return {
        ...prev,
        attachments: remaining,
        evidenceType: first ? first.type : "none",
        docCategory: first ? first.docCategory : "pdf",
        fileName: first ? first.fileName : "",
        storedName: first ? first.storedName : "",
        fileSize: first ? first.fileSize : "",
        fotoUrl: first ? first.fotoUrl : "",
        fileUrl: first ? first.fileUrl : ""
      };
    });
  };

  const handleRemoveFile = () => {
    // Bersihkan file server dari seluruh attachments draft yang dibatalkan
    if (Array.isArray(formData.attachments)) {
      for (const att of formData.attachments) {
        if (att && (att.fileUrl || att.filePath || att.storedName)) {
          fetch("/api/uploads/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileUrl: att.fileUrl,
              filePath: att.filePath,
              fileName: att.fileName,
              storedName: att.storedName
            })
          }).catch(() => {});
        }
      }
    }
    setFormData(prev => ({
      ...prev,
      attachments: [],
      evidenceType: "none",
      docCategory: "pdf",
      fileName: "",
      storedName: "",
      fileSize: "",
      fotoUrl: "",
      fileUrl: ""
    }));
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      jam: "08:00 - 12:00",
      aktivitas: "",
      outputJumlah: "1 Dokumen / Kegiatan",
      rhkId: rhkList[0]?.id || "",
      catatan: "",
      attachments: [],
      evidenceType: "none",
      docCategory: "pdf",
      fileName: "",
      storedName: "",
      fileSize: "",
      fotoUrl: "",
      fileUrl: "",
      linkUrl: ""
    });
    setOriginalKasaran("");
    setEditingId(null);
    setIsPolished(false);
  };

  const handleEditJournal = (j) => {
    setEditingId(j.id);
    const existingAttachments = Array.isArray(j.attachments) && j.attachments.length > 0
      ? j.attachments
      : (j.fotoUrl || j.fileName ? [{
          id: `att-${Date.now()}`,
          type: j.evidenceType || (j.fotoUrl ? "image" : "document"),
          docCategory: j.docCategory || (j.fotoUrl ? "image" : "pdf"),
          fileName: j.fileName || (j.fotoUrl ? "Foto Bukti" : "Dokumen Bukti"),
          storedName: j.storedName || "",
          fileSize: j.fileSize || "",
          fotoUrl: j.fotoUrl || "",
          fileUrl: j.fileUrl || ""
        }] : []);

    const firstAtt = existingAttachments[0];

    setFormData({
      tanggal: j.tanggal || new Date().toISOString().slice(0, 10),
      jam: j.jam || "08:00 - 12:00",
      aktivitas: j.aktivitas || "",
      outputJumlah: j.outputJumlah || "1 Dokumen / Kegiatan",
      rhkId: j.rhkId || (rhkList[0]?.id || ""),
      catatan: j.catatan || "",
      attachments: existingAttachments,
      evidenceType: firstAtt ? firstAtt.type : (j.evidenceType || "none"),
      docCategory: firstAtt ? firstAtt.docCategory : (j.docCategory || "pdf"),
      fileName: firstAtt ? firstAtt.fileName : (j.fileName || ""),
      storedName: firstAtt ? firstAtt.storedName : (j.storedName || ""),
      fileSize: firstAtt ? firstAtt.fileSize : (j.fileSize || ""),
      fotoUrl: firstAtt ? firstAtt.fotoUrl : (j.fotoUrl || ""),
      fileUrl: firstAtt ? firstAtt.fileUrl : (j.fileUrl || ""),
      linkUrl: j.linkUrl || ""
    });

    setOriginalKasaran(j.aktivitasKasaran || j.aktivitas || "");
    setIsPolished(true);
    setIsFormOpen(true);

    setTimeout(() => {
      if (formContainerRef.current) {
        formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleSaveJournal = (e) => {
    e.preventDefault();
    if (!formData.aktivitas.trim()) {
      alert("Harap masukkan uraian aktivitas kerja!");
      return;
    }

    if (editingId) {
      setJournals(prev => prev.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            ...formData,
            aktivitasKasaran: originalKasaran || formData.aktivitas,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));
      resetForm();
      setIsFormOpen(false);
      setNotification("✅ Catatan aktivitas berhasil diperbarui!");
      setTimeout(() => setNotification(""), 3500);
      return;
    }

    const activeUserId = currentUser?.id || (currentUser?.username ? `usr-${currentUser.username}` : "usr-farras");
    const activeUsername = currentUser?.username || "farras";

    const newEntry = {
      ...formData,
      id: `jrn-${Date.now()}`,
      userId: activeUserId,
      username: activeUsername,
      aktivitasKasaran: originalKasaran || formData.aktivitas
    };

    setJournals([newEntry, ...journals]);
    resetForm();
    setIsFormOpen(false);

    setNotification("Catatan aktivitas & bukti hasil kerja berhasil disimpan ke logbook!");
    setTimeout(() => setNotification(""), 3500);
  };

  // Memoles catatan kasaran / santai menjadi bahasa resmi kedinasan ASN
  const handlePolishActivity = async () => {
    if (!formData.aktivitas.trim()) {
      alert("Tuliskan dulu catatan aktivitas kasaran / santai Anda di kotak uraian! Contoh: 'benerin wifi guru yg mati trs cek mikrotik lab'");
      return;
    }

    try {
      setIsPolishing(true);
      if (!originalKasaran) {
        setOriginalKasaran(formData.aktivitas);
      }
      const textToPolish = originalKasaran || formData.aktivitas;
      const result = await polishJournalWithAi({
        rawText: textToPolish,
        rhkList,
        apiKey: geminiApiKey,
        jabatan: pegawai?.jabatan,
        unitKerja: pegawai?.unitKerja
      });

      setFormData(prev => ({
        ...prev,
        aktivitas: result.aktivitas,
        outputJumlah: result.outputJumlah || prev.outputJumlah,
        rhkId: result.rhkId || prev.rhkId,
        catatan: result.catatan || prev.catatan
      }));

      setIsPolished(true);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
      let notifMsg = `✨ Berhasil! Catatan kasaran telah dipoles ke bahasa baku formal kedinasan ASN (${geminiApiKey ? "Gemini Online" : "Mode Cerdas Offline"}).`;
      if (result.source === "offline_429") {
        notifMsg = "⚠️ Kuota Gemini AI di Google AI Studio habis (Error 429: Prepayment credits depleted). Sistem otomatis beralih memoles dengan Mode Cerdas Offline bawaan!";
      } else if (result.source === "gemini") {
        notifMsg = "✨ Berhasil! Catatan kasaran telah dipoles menggunakan Gemini AI Online.";
      } else {
        notifMsg = "✨ Berhasil! Catatan kasaran telah dipoles menggunakan Mode Cerdas Offline bawaan.";
      }
      setNotification(notifMsg);
      setTimeout(() => setNotification(""), 5000);
    } catch (err) {
      alert("Gagal memoles catatan: " + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleDeleteJournal = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus catatan aktivitas ini?\n\nSemua file bukti fisik (foto/dokumen) yang tersimpan di server untuk aktivitas ini juga akan ikut dihapus permanen agar tidak meninggalkan file sampah.")) {
      try {
        await fetch("/api/journals/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.warn("Peringatan saat menghapus jurnal di backend:", err.message);
      }
      setJournals(prev => prev.filter(j => j.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setNotification("Catatan aktivitas dan seluruh berkas fisik lampiran terkait berhasil dihapus bersih.");
      setTimeout(() => setNotification(""), 3500);
    }
  };

  const renderFileIcon = (category, type) => {
    if (category === "image" || type === "image") {
      return <Camera size={16} className="text-blue-500" />;
    }
    if (type === "excel") {
      return <FileSpreadsheet size={16} className="text-emerald-500" />;
    }
    return <FileText size={16} className="text-amber-500" />;
  };

  return (
    <div className="glass-card mb-6" style={{ padding: "1.5rem" }}>
      {/* Header Bar Jurnal */}
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
            width: "42px", 
            height: "42px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, #0284c7, #06b6d4)", 
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(6, 182, 212, 0.35)"
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Catat Aktivitas &amp; Poles Laporan Kasaran</span>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>
                ({journals.length} Aktivitas Terekam)
              </span>
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Ketik kasaran &bull; AI poles jadi bahasa formal kedinasan &bull; Otomatis tersusun rapi di Laporan Bulanan
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {onRefreshSync && (
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.35rem",
                cursor: isSyncing ? "wait" : "pointer"
              }}
              onClick={async () => {
                await onRefreshSync();
                setNotification("✅ Data logbook berhasil disinkronkan dengan Telegram & Database!");
                setTimeout(() => setNotification(""), 3500);
              }}
              disabled={isSyncing}
              title="Sinkronkan data terkini dari Telegram Bot & Database Server"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Data"}</span>
            </button>
          )}

          <button 
            type="button"
            className="btn btn-sm"
            style={{ 
              background: "#2563eb", 
              color: "#ffffff", 
              border: "none", 
              fontWeight: "700",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
            onClick={onOpenMonthlyReport}
            title="Buka dokumen laporan bulanan yang siap dicetak ke PDF"
          >
            <FileText size={14} />
            <span>Lihat Laporan Bulanan (PDF)</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsFormOpen(!isFormOpen)}
          >
            <Plus size={14} />
            <span>{isFormOpen ? "Sembunyikan Form" : "Buka Form Catatan"}</span>
          </button>
        </div>
      </div>

      {notification && (
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
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Form Input Catatan Kasar & AI Polisher */}
      {isFormOpen && (
        <form 
          ref={formContainerRef}
          onSubmit={handleSaveJournal}
          style={{
            marginBottom: "1.75rem",
            padding: "1.25rem",
            background: "var(--bg-tertiary)",
            border: editingId ? "1.5px solid var(--accent-primary, #2563eb)" : "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: editingId ? "0 0 0 3px rgba(37, 99, 235, 0.15)" : "none"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: editingId ? "var(--accent-primary, #2563eb)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {editingId ? <Edit3 size={16} className="text-blue-500" /> : <Sparkles size={16} className="text-amber-500" />}
              <span>{editingId ? "Edit Catatan Aktivitas Kerja" : "Tulis Catatan Kerja Kasaran & Poles dengan AI"}</span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {editingId ? "Perbarui isi uraian, tanggal, lampiran, atau link lalu simpan perubahan" : "Ketik bahasa santai → Klik tombol poles → Simpan ke laporan"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar size={13} /> Tanggal Kegiatan
              </label>
              <input 
                type="date" 
                className="input-field"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock size={13} /> Waktu / Durasi
              </label>
              <input 
                type="text" 
                className="input-field"
                value={formData.jam}
                onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                placeholder="09:00 - 11:30"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hasil / Output Kegiatan</label>
              <input 
                type="text" 
                className="input-field"
                value={formData.outputJumlah}
                onChange={(e) => setFormData({ ...formData, outputJumlah: e.target.value })}
                placeholder="Contoh: 1 Laporan, 1 Berkas, 1 Unit Terpasang..."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0, fontWeight: "700" }}>
                Uraian Catatan Kerja (Ketik Kasaran / Santai Apa Adanya):
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {apiKeyInfo?.key ? (
                  <span 
                    style={{ 
                      fontSize: "0.72rem", 
                      background: "rgba(16, 185, 129, 0.12)", 
                      color: "#059669", 
                      padding: "2px 8px", 
                      borderRadius: "10px", 
                      fontWeight: "700", 
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title={apiKeyInfo.source === "env" ? "Gemini AI Online (Sistem .env) aktif" : "Gemini AI Online (Key Pribadi) aktif"}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                    Online ({apiKeyInfo.source === "env" ? ".env" : "Pribadi"})
                  </span>
                ) : (
                  <span 
                    style={{ 
                      fontSize: "0.72rem", 
                      background: "rgba(245, 158, 11, 0.12)", 
                      color: "#d97706", 
                      padding: "2px 8px", 
                      borderRadius: "10px", 
                      fontWeight: "700", 
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title="Belum ada API Key - AI berjalan dalam Mode Cerdas Offline bawaan (Tetap bisa memoles tanpa batasan)"
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }}></span>
                    AI Offline (Bawaan)
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    padding: "0.4rem 1rem",
                    borderRadius: "5px",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer"
                  }}
                  onClick={handlePolishActivity}
                  disabled={isPolishing}
                  title="Klik untuk otomatis mengubah bahasa kasaran menjadi narasi formal kedinasan ASN yang rapi"
                >
                  <Sparkles size={14} className={isPolishing ? "animate-spin" : ""} />
                  <span>{isPolishing ? "Sedang Memoles dengan AI..." : "✨ AI Poles Jadi Bahasa Formal ASN"}</span>
                </button>
              </div>
            </div>

            {/* Quick Inspiration Chips Berdasarkan Jabatan Rekan Kerja */}
            <div style={{ marginBottom: "0.6rem" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                flexWrap: "wrap", 
                gap: "0.4rem", 
                marginBottom: "0.35rem" 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: "700", 
                    color: "var(--accent-primary, #3b82f6)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "5px" 
                  }}>
                    <Briefcase size={13} />
                    <span>Contoh kasaran rekan satu jabatan:</span>
                    <span style={{ 
                      background: "rgba(59, 130, 246, 0.12)", 
                      padding: "2px 8px", 
                      borderRadius: "6px", 
                      color: "#2563eb",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      fontWeight: "700"
                    }}>
                      {casualData.matchedJabatan?.nama || currentJabatan || "Umum Kedinasan"}
                    </span>
                  </span>
                </div>

                {/* Opsi ganti profesi contoh jika multi-tasking */}
                {casualData.allJabatanList && casualData.allJabatanList.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <label htmlFor="select-jabatan-contoh" style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                      Lihat profesi lain:
                    </label>
                    <select 
                      id="select-jabatan-contoh"
                      className="form-select form-select-sm"
                      value={selectedJabatanOverride || casualData.matchedJabatan?.nama || ""}
                      onChange={(e) => setSelectedJabatanOverride(e.target.value)}
                      style={{
                        fontSize: "0.74rem",
                        padding: "0 1.8rem 0 0.55rem",
                        height: "26px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-primary)",
                        color: "var(--text-secondary)"
                      }}
                    >
                      {casualData.allJabatanList.map((j) => (
                        <option key={j.id} value={j.nama}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                    {selectedJabatanOverride && (
                      <button
                        type="button"
                        onClick={() => setSelectedJabatanOverride("")}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "0.7rem",
                          color: "var(--accent-primary, #3b82f6)",
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: "0 2px"
                        }}
                        title="Kembali ke jabatan saya"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Daftar Chips Contoh Kalimat Kasaran */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                {casualData.examples.slice(0, 6).map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, aktivitas: sample });
                      setOriginalKasaran(sample);
                      setIsPolished(false);
                    }}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px dashed var(--border-strong)",
                      borderRadius: "14px",
                      padding: "3px 10px",
                      fontSize: "0.73rem",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-primary, #3b82f6)";
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                    title="Klik untuk mengisi contoh kalimat kasaran ini ke textarea"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              className="textarea-field"
              rows={3}
              value={formData.aktivitas}
              onChange={(e) => {
                setFormData({ ...formData, aktivitas: e.target.value });
                setIsPolished(false);
              }}
              placeholder="Contoh ketik kasaran: 'tadi benerin wifi guru yg mati terus cek router mikrotik lab' -> lalu klik tombol [ ✨ AI Poles Jadi Bahasa Formal ASN ] di atas!"
              required
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>💡 Ketik santai apa adanya, AI akan menyusunnya menjadi kalimat kedinasan yang baku dan akuntabel.</span>
              {isPolished && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--accent-emerald)", fontWeight: "700" }}>
                  <CheckCircle2 size={13} /> Sudah Dipoles Formal ASN
                </span>
              )}
            </div>
          </div>

          {/* Grid Dua Kolom: Unggah Berkas & Tautan Online */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            {/* Kolom 1: Upload File Bukti (Foto atau Dokumen PDF/Word/Excel) */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Paperclip size={14} /> Berkas Bukti Fisik (Foto / PDF / Word / Excel)
              </label>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                style={{ display: "none" }}
              />

              {(!formData.attachments || formData.attachments.length === 0) ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--bg-secondary)",
                    transition: "background var(--transition-fast)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                    <Camera size={22} />
                    <FileText size={22} />
                    <FileSpreadsheet size={22} />
                  </div>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                    {isUploading ? "Memproses Berkas..." : "Klik untuk Unggah Berkas (Bisa Pilih Banyak)"}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Foto (.jpg, .png) otomatis dikompresi ringan & tajam ala WhatsApp atau Berkas (.pdf, .docx, .xlsx, dll.)
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {formData.attachments.map((att, attIdx) => (
                    <div key={att.id || attIdx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)"
                    }}>
                      {att.fotoUrl && att.type === "image" ? (
                        <img 
                          src={att.fotoUrl} 
                          alt="Bukti Kerja" 
                          style={{ width: "45px", height: "38px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-strong)" }}
                        />
                      ) : (
                        <div style={{ 
                          width: "40px", 
                          height: "38px", 
                          borderRadius: "6px", 
                          background: "var(--bg-tertiary)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}>
                          {renderFileIcon(att.type, att.docCategory)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: "700", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>
                          {att.fileName}
                        </p>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {att.fileSize}
                          {att.type === "image" && att.originalSize && att.originalSize !== att.fileSize && (
                            <span style={{ color: "#10b981", fontWeight: "600", marginLeft: "4px" }}>
                              (Hemat dari {att.originalSize})
                            </span>
                          )}
                          {" • "}
                          {att.type === "image" ? "Foto Terkompresi Cerdas" : "Dokumen Berkas"}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRemoveAttachment(att.id)}
                        style={{ color: "var(--accent-rose)", padding: "0.2rem 0.4rem" }}
                        title="Hapus berkas ini"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ alignSelf: "flex-start", marginTop: "0.25rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Paperclip size={12} /> + Tambah Berkas Lainnya
                  </button>
                </div>
              )}
            </div>

            {/* Kolom 2: Tautan / URL Online (Google Drive / Cloud Folder) */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Link2 size={14} /> Tautan / Link Online (Google Drive / Cloud / Web)
              </label>
              <input 
                type="url" 
                className="input-field"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Sangat disarankan menaruh tautan folder bukti di Google Drive instansi agar pimpinan mudah memeriksa bukti dukung.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
            >
              {editingId ? "Batal Edit" : "Batal"}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <CheckCircle2 size={14} /> {editingId ? "Simpan Perubahan Catatan" : "Simpan Catatan & Bukti Kerja"}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Jurnal & Galeri Berkas / Foto */}
      {journals.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "2.5rem 1rem", 
          background: "var(--bg-tertiary)", 
          borderRadius: "var(--radius-lg)",
          color: "var(--text-muted)"
        }}>
          <Paperclip size={36} style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }} />
          <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.3rem" }}>
            Belum Ada Catatan Aktivitas atau Bukti Foto
          </h4>
          <p style={{ fontSize: "0.82rem", maxWidth: "450px", margin: "0 auto 1rem auto" }}>
            Tulis catatan kerja kasaran Anda pada formulir di atas (boleh bahasa santai/kasar), lalu klik <strong>"✨ AI Poles Jadi Bahasa Formal ASN"</strong> untuk langsung merapikannya!
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
            <button className="btn btn-primary btn-sm" onClick={() => setIsFormOpen(true)}>
              <Plus size={13} /> Buka Formulir Catatan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {journals.map((j, index) => {
            const attList = Array.isArray(j.attachments) && j.attachments.length > 0
              ? j.attachments
              : (j.fotoUrl || j.fileName ? [{ type: j.evidenceType || (j.fotoUrl ? "image" : "document"), fotoUrl: j.fotoUrl, fileName: j.fileName, fileSize: j.fileSize, docCategory: j.docCategory }] : []);
            const photoAtt = attList.find(a => a.type === "image" && a.fotoUrl);
            const isPhoto = Boolean(photoAtt);
            const hasDocument = attList.some(a => a.type !== "image");
            const hasLink = Boolean(j.linkUrl);
            const totalAtts = attList.length;

            return (
              <div 
                key={j.id || index}
                style={{
                  background: editingId === j.id ? "rgba(37, 99, 235, 0.06)" : "var(--bg-secondary)",
                  border: editingId === j.id ? "1.5px solid var(--accent-primary, #2563eb)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "background var(--transition-fast), border-color var(--transition-fast)"
                }}
              >
                {/* Nomor Urut */}
                <div style={{ 
                  fontSize: "0.82rem", 
                  fontWeight: "700", 
                  color: "var(--text-muted)", 
                  width: "24px", 
                  textAlign: "center",
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                {/* Thumbnail Foto / Ikon Berkas */}
                <div style={{ flexShrink: 0 }}>
                  {isPhoto ? (
                    <div 
                      onClick={() => setActivePhotoModal({ ...j, fotoUrl: photoAtt.fotoUrl })}
                      title="Klik untuk memperbesar foto"
                      style={{ 
                        width: "60px", 
                        height: "46px", 
                        borderRadius: "4px", 
                        overflow: "hidden", 
                        cursor: "pointer",
                        border: "1px solid var(--border-strong)",
                        position: "relative",
                        background: "#0f172a"
                      }}
                    >
                      <img 
                        src={photoAtt.fotoUrl} 
                        alt={j.aktivitas} 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        borderRadius: "3px",
                        padding: "1px 3px",
                        display: "flex",
                        alignItems: "center"
                      }}>
                        <ZoomIn size={10} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      width: "46px", 
                      height: "46px", 
                      borderRadius: "4px", 
                      background: "var(--bg-tertiary)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      border: "1px solid var(--border-subtle)"
                    }}>
                      {renderFileIcon(attList[0]?.type || j.evidenceType, attList[0]?.docCategory || j.docCategory)}
                    </div>
                  )}
                </div>

                {/* Kolom Tanggal & Waktu */}
                <div style={{ width: "125px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    <Calendar size={13} className="text-blue-500" />
                    <span>{j.tanggal}</span>
                  </div>
                  {j.jam && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      <Clock size={11} />
                      <span>{j.jam}</span>
                    </div>
                  )}
                </div>

                {/* Uraian Aktivitas & Hasil Kegiatan */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    fontSize: "0.88rem", 
                    fontWeight: "600", 
                    color: "var(--text-primary)", 
                    lineHeight: "1.45",
                    margin: 0
                  }}>
                    {j.aktivitas}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "4px" }}>
                    {j.outputJumlah && (
                      <span className="badge badge-aspek" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>
                        Hasil: {j.outputJumlah}
                      </span>
                    )}

                    {totalAtts > 1 ? (
                      <span className="badge" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", background: "var(--bg-tertiary)", color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Paperclip size={11} /> {totalAtts} Berkas Lampiran
                      </span>
                    ) : (
                      <>
                        {isPhoto && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Camera size={11} /> Foto Terlampir
                          </span>
                        )}
                        {hasDocument && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <FileText size={11} /> {attList[0]?.fileName || j.fileName || "Dokumen"}
                          </span>
                        )}
                      </>
                    )}

                    {hasLink && (
                      <a 
                        href={j.linkUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          fontSize: "0.72rem", 
                          color: "var(--accent-primary)", 
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          textDecoration: "none"
                        }}
                      >
                        <Link2 size={11} /> Tautan Drive <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                  {isPhoto && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => setActivePhotoModal(j)}
                      title="Perbesar Foto"
                      style={{ width: "30px", height: "30px", padding: 0 }}
                    >
                      <ZoomIn size={14} />
                    </button>
                  )}

                  <button 
                    type="button"
                    className="btn btn-outline btn-icon btn-sm"
                    onClick={() => handleEditJournal(j)}
                    style={{ 
                      color: "var(--accent-primary, #2563eb)", 
                      borderColor: editingId === j.id ? "var(--accent-primary, #2563eb)" : "var(--border-subtle)",
                      background: editingId === j.id ? "rgba(37, 99, 235, 0.12)" : "transparent",
                      width: "30px", 
                      height: "30px", 
                      padding: 0 
                    }}
                    title="Edit catatan aktivitas ini"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn btn-outline btn-icon btn-sm"
                    onClick={() => handleDeleteJournal(j.id)}
                    style={{ color: "var(--accent-rose)", width: "30px", height: "30px", padding: 0 }}
                    title="Hapus aktivitas ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Zoom Foto */}
      {activePhotoModal && (
        <div className="modal-overlay" onClick={() => setActivePhotoModal(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: "700px", padding: "1.25rem", background: "var(--bg-secondary)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700" }}>{activePhotoModal.aktivitas}</h4>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setActivePhotoModal(null)}>
                <X size={16} />
              </button>
            </div>
            <img 
              src={activePhotoModal.fotoUrl} 
              alt={activePhotoModal.aktivitas} 
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius-md)" }}
            />
            <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Tanggal: {activePhotoModal.tanggal}</span>
              <span>Output: {activePhotoModal.outputJumlah}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
