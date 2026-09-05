import React, { useState, useEffect } from "react";
import { 
  X, 
  Key, 
  ExternalLink, 
  Check, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Server, 
  User,
  AlertCircle,
  Zap
} from "lucide-react";

export default function GeminiModal({
  isOpen,
  onClose,
  currentUser,
  onSaveUserKey,
  envApiKey,
  serverAiConfig = null,
  allowEnvKey,
  onToggleAllowEnvKey
}) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const hasEnvKey = Boolean(envApiKey) || Boolean(serverAiConfig?.hasServerKey || serverAiConfig?.enabled);
  const isAllowedEnv = isSuperadmin || (typeof currentUser?.allowEnvKey === "boolean" ? currentUser.allowEnvKey : allowEnvKey);

  // State Pilihan Mode AI: "env" | "personal" | "offline"
  const [keyChoice, setKeyChoice] = useState(() => {
    if (currentUser?.aiModeChoice === "offline") return "offline";
    if (currentUser?.aiModeChoice === "personal") return "personal";
    if (currentUser?.aiModeChoice === "env" && hasEnvKey && isAllowedEnv) return "env";
    if (currentUser?.usePersonalKey && currentUser?.personalApiKey) return "personal";
    if (hasEnvKey && isAllowedEnv) return "env";
    if (currentUser?.personalApiKey) return "personal";
    return "offline";
  });

  const [personalKeyInput, setPersonalKeyInput] = useState(currentUser?.personalApiKey || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPersonalKeyInput(currentUser.personalApiKey || "");
      if (currentUser.aiModeChoice === "offline") {
        setKeyChoice("offline");
      } else if (currentUser.aiModeChoice === "personal") {
        setKeyChoice("personal");
      } else if (currentUser.aiModeChoice === "env") {
        if (hasEnvKey && isAllowedEnv) {
          setKeyChoice("env");
        } else {
          setKeyChoice(currentUser.personalApiKey ? "personal" : "offline");
        }
      } else if (currentUser.usePersonalKey && currentUser.personalApiKey) {
        setKeyChoice("personal");
      } else if (hasEnvKey && isAllowedEnv) {
        setKeyChoice("env");
      } else if (currentUser.personalApiKey) {
        setKeyChoice("personal");
      } else {
        setKeyChoice("offline");
      }
    }
  }, [currentUser, allowEnvKey, hasEnvKey, isAllowedEnv, serverAiConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    const usePersonal = keyChoice === "personal";
    onSaveUserKey(personalKeyInput.trim(), usePersonal, keyChoice);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClearPersonal = () => {
    setPersonalKeyInput("");
    const nextChoice = (hasEnvKey && isAllowedEnv) ? "env" : "offline";
    setKeyChoice(nextChoice);
    onSaveUserKey("", false, nextChoice);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: "580px",
          background: "var(--bg-primary, #ffffff)",
          borderRadius: "var(--radius-lg, 12px)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden"
        }}
      >
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
              background: "linear-gradient(135deg, #2563eb, #7c3aed)", 
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)" }}>
                Pengaturan API Key Gemini AI
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Akun: <strong>{currentUser?.nama || currentUser?.username}</strong> ({currentUser?.role})
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* KHUSUS SUPERADMIN: SETTING TOGGLE IZIN PEMAKAIAN KEY DARI .ENV */}
          {isSuperadmin && (
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: allowEnvKey ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: allowEnvKey ? "#10b981" : "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1px solid ${allowEnvKey ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>Izin API Key Sistem (.env) untuk Pegawai</span>
                    <span style={{
                      fontSize: "0.72rem",
                      padding: "2px 7px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      background: allowEnvKey ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: allowEnvKey ? "#10b981" : "#ef4444"
                    }}>
                      {allowEnvKey ? "Diizinkan Aktif" : "Dibatasi"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {allowEnvKey 
                      ? "Seluruh pegawai diizinkan langsung menggunakan API Key bersama dari file .env sistem." 
                      : "Pegawai dibatasi dan diwajibkan memasukkan API Key Gemini pribadi akun."}
                  </div>
                </div>
              </div>

              {/* Modern Interactive Switch */}
              <button
                type="button"
                onClick={() => onToggleAllowEnvKey(!allowEnvKey)}
                role="switch"
                aria-checked={allowEnvKey}
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "9999px",
                  background: allowEnvKey ? "#10b981" : "var(--border-strong)",
                  position: "relative",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                  padding: "3px"
                }}
                title="Klik untuk mengubah izin API Key .env sistem"
              >
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transform: allowEnvKey ? "translateX(22px)" : "translateX(0px)",
                  transition: "transform 0.2s ease"
                }} />
              </button>
            </div>
          )}

          {/* STATUS INFORMASI UNTUK PEGAWAI */}
          {!isSuperadmin && (
            isAllowedEnv && hasEnvKey ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Server size={18} />
                </div>
                <div>
                  <strong style={{ color: "#2563eb" }}>Sistem Menyediakan API Key Bersama (.env):</strong> Akun Anda diizinkan langsung menggunakan fitur AI tanpa perlu repot memasukkan key pribadi. Namun jika kuota sistem sedang bermasalah atau habis, Anda dapat memilih opsi <em>Key Pribadi Akun</em> di bawah.
                </div>
              </div>
            ) : currentUser?.allowEnvKey === false ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <strong style={{ color: "#ef4444" }}>Akses API Key Sistem Dibatasi untuk Akun Anda:</strong> Administrator mewajibkan akun ini menggunakan API Key sendiri. Silakan masukkan API Key Gemini pribadi Anda di bawah untuk mengaktifkan fitur AI.
                </div>
              </div>
            ) : (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <strong style={{ color: "#d97706" }}>Mode AI Cerdas Offline Aktif:</strong> Belum ada API Key (atau mode sistem dibatasi). Tenang, Anda <strong>tidak diblokir</strong> — fitur AI tetap bisa memoles catatan kasaran menggunakan engine heuristik offline bawaan. Jika ingin menggunakan Google Gemini Online, Anda dapat memasukkan API Key di bawah kapan saja.
                </div>
              </div>
            )
          )}

          {/* PILIHAN SUMBER KEY / MODE PEMROSESAN AI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Pilih Mode Pemrosesan AI untuk Akun Anda:
            </label>

            {/* Opsi 1: Gunakan Key Sistem (.env) */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "env" ? "#2563eb" : "var(--border-subtle)"}`,
                background: keyChoice === "env" ? "rgba(37, 99, 235, 0.05)" : "var(--bg-secondary)",
                cursor: (hasEnvKey && isAllowedEnv) ? "pointer" : "not-allowed",
                opacity: (hasEnvKey && isAllowedEnv) ? 1 : 0.6,
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="env"
                disabled={!(hasEnvKey && isAllowedEnv)}
                checked={keyChoice === "env"}
                onChange={() => setKeyChoice("env")}
                style={{ marginTop: "3px", accentColor: "#2563eb" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Server size={14} style={{ color: "#2563eb" }} />
                  <span>Gunakan AI Bersama dari Sistem (.env)</span>
                  {hasEnvKey && isAllowedEnv ? (
                    <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Tersedia &amp; Diizinkan
                    </span>
                  ) : !hasEnvKey ? (
                    <span style={{ fontSize: "0.72rem", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Belum Diatur di Server
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Dibatasi Administrator
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Praktis menggunakan Gemini 2.5 Flash Online dari konfigurasi server tanpa perlu mendaftar key sendiri.
                </div>
              </div>
            </label>

            {/* Opsi 2: Gunakan Key Pribadi Akun */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "personal" ? "#7c3aed" : "var(--border-subtle)"}`,
                background: keyChoice === "personal" ? "rgba(124, 58, 237, 0.05)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="personal"
                checked={keyChoice === "personal"}
                onChange={() => setKeyChoice("personal")}
                style={{ marginTop: "3px", accentColor: "#7c3aed" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <User size={14} style={{ color: "#7c3aed" }} />
                  <span>Gunakan API Key Gemini Pribadi Akun Sendiri</span>
                  {personalKeyInput ? (
                    <span style={{ fontSize: "0.72rem", background: "#f3e8ff", color: "#6b21a8", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Key Tersimpan
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Perlu Input Key
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Gunakan kuota independen milik Anda sendiri dari Google AI Studio (disarankan jika kuota bersama limit).
                </div>
              </div>
            </label>

            {/* Opsi 3: Gunakan Mode AI Cerdas Offline (Bawaan BKN) */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "offline" ? "#d97706" : "var(--border-subtle)"}`,
                background: keyChoice === "offline" ? "rgba(245, 158, 11, 0.05)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="offline"
                checked={keyChoice === "offline"}
                onChange={() => setKeyChoice("offline")}
                style={{ marginTop: "3px", accentColor: "#d97706" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Zap size={14} style={{ color: "#d97706" }} />
                  <span>Gunakan Mode AI Cerdas Offline (Bawaan BKN)</span>
                  <span style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                    Instan &amp; Tanpa Kuota
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Memoles catatan kasaran menggunakan engine heuristik lokal kedinasan ASN tanpa kuota dan tanpa butuh koneksi internet.
                </div>
              </div>
            </label>
          </div>

          {/* Kolom Input Key Pribadi jika Opsi Personal Terpilih */}
          {keyChoice === "personal" && (
            <div style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem"
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem" }}>
                  Masukkan Gemini API Key Pribadi Anda:
                </label>
                <input 
                  type="password" 
                  className="input-field font-mono"
                  value={personalKeyInput}
                  onChange={(e) => setPersonalKeyInput(e.target.value)}
                  placeholder="AIzaSy... (atau kosongkan untuk Mode AI Offline)"
                  style={{ fontSize: "0.85rem" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Kosongkan jika ingin memakai AI Mode Offline gratis tanpa key.
                  </span>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "3px" }}
                  >
                    Dapatkan Key Gratis <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div style={{ 
              padding: "0.75rem", 
              background: "#dcfce7", 
              border: "1px solid #86efac",
              borderRadius: "8px",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.84rem",
              fontWeight: "600"
            }}>
              <Check size={16} />
              <span>
                {keyChoice === "env" 
                  ? "Mode AI Bersama (.env Sistem) berhasil diaktifkan!" 
                  : keyChoice === "personal" 
                  ? "API Key Gemini Pribadi berhasil disimpan dan aktif!" 
                  : "Mode AI Cerdas Offline BKN berhasil diaktifkan!"}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {personalKeyInput ? (
            <button 
              type="button" 
              className="btn btn-outline btn-sm" 
              onClick={handleClearPersonal}
              style={{ fontSize: "0.8rem", color: "#dc2626" }}
            >
              Hapus Key Pribadi
            </button>
          ) : <div />}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Batal
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-sm" 
              onClick={handleSave}
              style={{ fontWeight: "700" }}
            >
              <Check size={15} />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
