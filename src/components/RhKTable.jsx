import React, { useState } from "react";
import { Plus, Trash2, Edit3, Check, FileCheck, Sparkles, AlertCircle, SlidersHorizontal, BarChart3, FileSpreadsheet } from "lucide-react";
import { deriveUkuranKeberhasilan } from "../services/aiService";

export default function RhKTable({
  rhkList,
  setRhkList,
  onOpenRealisasiModal,
  pendekatan = "KUANTITATIF",
  setPendekatan
}) {
  const [editingRhkId, setEditingRhkId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Tambah RHK baru kosong
  const handleAddNewRhk = (jenis = "UTAMA") => {
    const newId = `rhk-manual-${Date.now()}`;
    const newRhk = {
      id: newId,
      jenis,
      rhkPimpinan: "Terwujudnya peningkatan efisiensi dan kualitas pelayanan instansi",
      rhkIndividu: `Terlaksananya penugasan kedinasan dalam rangka pemenuhan target kerja operasional`,
      ukuranKeberhasilan: "12 Laporan pelaksanaan tugas terselesaikan dengan kualitas 95% dan tepat waktu dalam 12 bulan.",
      aspekList: [
        {
          id: `asp-${Date.now()}-1`,
          aspek: "Kuantitas",
          indikator: "Jumlah dokumen/laporan yang disusun",
          target: "12 Laporan",
          satuan: "Laporan",
          buktiDukungDefault: "Laporan Kinerja Bulanan, SPT",
          realisasiDefault: "12 laporan kegiatan terselesaikan dan disahkan atasan"
        },
        {
          id: `asp-${Date.now()}-2`,
          aspek: "Kualitas",
          indikator: "Persentase kesesuaian hasil kerja dengan standar mutu dan SOP",
          target: "90 - 100%",
          satuan: "%",
          buktiDukungDefault: "Lembar Verifikasi Kinerja Atasan",
          realisasiDefault: "95% capaian kualitas sesuai standar yang ditetapkan"
        },
        {
          id: `asp-${Date.now()}-3`,
          aspek: "Waktu",
          indikator: "Ketepatan waktu pelaksanaan penugasan",
          target: "12 Bulan",
          satuan: "Bulan",
          buktiDukungDefault: "Jadwal Pelaksanaan Kegiatan",
          realisasiDefault: "Tepat waktu diselesaikan dalam 12 bulan"
        }
      ]
    };
    setRhkList([...rhkList, newRhk]);
  };

  const handleDeleteRhk = (rhkId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus RHK ini?")) {
      setRhkList(rhkList.filter(item => item.id !== rhkId));
    }
  };

  const handleStartEdit = (rhk) => {
    setEditingRhkId(rhk.id);
    setEditFormData({ 
      ...rhk,
      ukuranKeberhasilan: rhk.ukuranKeberhasilan || deriveUkuranKeberhasilan(rhk)
    });
  };

  const handleSaveEdit = () => {
    setRhkList(rhkList.map(item => item.id === editingRhkId ? editFormData : item));
    setEditingRhkId(null);
  };

  const handleAddAspek = (rhkId) => {
    setRhkList(rhkList.map(item => {
      if (item.id === rhkId) {
        return {
          ...item,
          aspekList: [
            ...item.aspekList,
            {
              id: `asp-custom-${Date.now()}`,
              aspek: "Kuantitas",
              indikator: "Indikator kinerja individu baru",
              target: "1 Laporan",
              satuan: "Laporan",
              buktiDukungDefault: "Dokumen bukti dukung",
              realisasiDefault: "Realisasi capaian kinerja"
            }
          ]
        };
      }
      return item;
    }));
  };

  const handleDeleteAspek = (rhkId, aspekId) => {
    setRhkList(rhkList.map(item => {
      if (item.id === rhkId) {
        if (item.aspekList.length <= 1) {
          alert("Setiap RHK minimal harus memiliki 1 aspek Indikator Kinerja!");
          return item;
        }
        return {
          ...item,
          aspekList: item.aspekList.filter(asp => asp.id !== aspekId)
        };
      }
      return item;
    }));
  };

  const utamaList = rhkList.filter(r => r.jenis === "UTAMA");
  const tambahanList = rhkList.filter(r => r.jenis === "TAMBAHAN");
  const isKualitatif = pendekatan === "KUALITATIF";

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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Matriks Hasil Kerja (RHK & IKI)</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500" }}>
                ({rhkList.length} RHK Terdaftar)
              </span>
            </h2>

            {/* Quick Switcher Pendekatan */}
            <div style={{ 
              display: "inline-flex", 
              background: "var(--bg-tertiary)", 
              padding: "3px", 
              borderRadius: "8px", 
              border: "1px solid var(--border-subtle)" 
            }}>
              <button
                type="button"
                className={`btn btn-sm ${!isKualitatif ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", border: "none" }}
                onClick={() => setPendekatan && setPendekatan("KUANTITATIF")}
                title="Beralih ke Pendekatan Kuantitatif (3 Aspek: Kuantitas, Kualitas, Waktu)"
              >
                <BarChart3 size={13} />
                <span>Kuantitatif</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${isKualitatif ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", border: "none" }}
                onClick={() => setPendekatan && setPendekatan("KUALITATIF")}
                title="Beralih ke Pendekatan Kualitatif (Ukuran Keberhasilan & Target Deskriptif)"
              >
                <FileSpreadsheet size={13} />
                <span>Kualitatif</span>
              </button>
            </div>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            {isKualitatif 
              ? "Format Matriks Hasil Kerja Kualitatif PermenPAN-RB No. 6 Tahun 2022 (Ukuran Keberhasilan & Target Deskriptif)"
              : "Format Matriks Hasil Kerja Kuantitatif PermenPAN-RB No. 6 Tahun 2022 (Aspek Kuantitas, Kualitas, Waktu)"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => handleAddNewRhk("UTAMA")}
            title="Tambah Rencana Hasil Kerja Kategori Utama"
          >
            <Plus size={14} />
            <span>Tambah RHK Utama</span>
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => handleAddNewRhk("TAMBAHAN")}
            title="Tambah Rencana Hasil Kerja Kategori Tambahan"
          >
            <Plus size={14} />
            <span>Tambah RHK Tambahan</span>
          </button>
        </div>
      </div>

      {rhkList.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "3rem 1rem", 
          background: "var(--bg-tertiary)", 
          borderRadius: "var(--radius-lg)",
          color: "var(--text-muted)"
        }}>
          <AlertCircle size={40} style={{ margin: "0 auto 1rem auto", opacity: 0.6 }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Belum Ada Rencana Hasil Kerja (RHK)
          </h3>
          <p style={{ fontSize: "0.88rem", maxWidth: "500px", margin: "0 auto 1.25rem auto" }}>
            Gunakan tombol <strong>AI SKP Generator</strong> di atas untuk membuat otomatis seluruh RHK & IKI sesuai profesi Anda, atau tambahkan secara manual.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => handleAddNewRhk("UTAMA")}>
            <Plus size={14} /> Buat RHK Pertama
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="skp-table">
            <thead>
              {isKualitatif ? (
                /* Header Pendekatan Kualitatif */
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ width: "90px" }}>Jenis</th>
                  <th style={{ width: "240px" }}>Rencana Kinerja Pimpinan</th>
                  <th style={{ width: "260px" }}>Rencana Hasil Kerja (RHK) Individu</th>
                  <th style={{ width: "320px" }}>Ukuran Keberhasilan / Indikator & Target</th>
                  <th style={{ width: "240px" }}>Realisasi & Bukti Dukung</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
                </tr>
              ) : (
                /* Header Pendekatan Kuantitatif */
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ width: "90px" }}>Jenis</th>
                  <th style={{ width: "220px" }}>Rencana Kinerja Pimpinan</th>
                  <th style={{ width: "280px" }}>Rencana Hasil Kerja (RHK) Individu</th>
                  <th style={{ width: "90px" }}>Aspek</th>
                  <th style={{ width: "240px" }}>Indikator Kinerja Individu (IKI)</th>
                  <th style={{ width: "130px" }}>TARGET TAHUNAN</th>
                  <th style={{ width: "220px" }}>Realisasi & Bukti Dukung</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
                </tr>
              )}
            </thead>
            <tbody>
              {/* RHK UTAMA */}
              {utamaList.length > 0 && (
                <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                  <td colSpan={isKualitatif ? 7 : 9} style={{ fontWeight: "800", color: "var(--accent-primary)", padding: "0.6rem 1rem", fontSize: "0.85rem" }}>
                    A. KINERJA UTAMA ({utamaList.length} RHK)
                  </td>
                </tr>
              )}
              {utamaList.map((rhk, rIdx) => 
                isKualitatif 
                  ? renderRhkRowsKualitatif(rhk, rIdx + 1)
                  : renderRhkRowsKuantitatif(rhk, rIdx + 1)
              )}

              {/* RHK TAMBAHAN */}
              {tambahanList.length > 0 && (
                <tr style={{ background: "rgba(244, 63, 94, 0.05)" }}>
                  <td colSpan={isKualitatif ? 7 : 9} style={{ fontWeight: "800", color: "var(--accent-rose)", padding: "0.6rem 1rem", fontSize: "0.85rem" }}>
                    B. KINERJA TAMBAHAN ({tambahanList.length} RHK)
                  </td>
                </tr>
              )}
              {tambahanList.map((rhk, rIdx) => 
                isKualitatif
                  ? renderRhkRowsKualitatif(rhk, utamaList.length + rIdx + 1)
                  : renderRhkRowsKuantitatif(rhk, utamaList.length + rIdx + 1)
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  function renderRhkRowsKuantitatif(rhk, noNumber) {
    const isEditing = editingRhkId === rhk.id;
    const rowSpanCount = rhk.aspekList?.length || 1;

    return (rhk.aspekList || []).map((asp, aIdx) => {
      const isFirstRow = aIdx === 0;

      return (
        <tr key={asp.id || `${rhk.id}-${aIdx}`}>
          {/* Kolom No */}
          {isFirstRow && (
            <td rowSpan={rowSpanCount} style={{ textAlign: "center", fontWeight: "700", verticalAlign: "middle" }}>
              {noNumber}
            </td>
          )}

          {/* Kolom Jenis */}
          {isFirstRow && (
            <td rowSpan={rowSpanCount} style={{ verticalAlign: "middle" }}>
              <span className={`badge ${rhk.jenis === "UTAMA" ? "badge-utama" : "badge-tambahan"}`}>
                {rhk.jenis}
              </span>
            </td>
          )}

          {/* Kolom RHK Pimpinan */}
          {isFirstRow && (
            <td rowSpan={rowSpanCount} style={{ verticalAlign: "top" }}>
              {isEditing ? (
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={editFormData.rhkPimpinan || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, rhkPimpinan: e.target.value })}
                />
              ) : (
                <span style={{ fontSize: "0.83rem", lineHeight: "1.5" }}>{rhk.rhkPimpinan}</span>
              )}
            </td>
          )}

          {/* Kolom RHK Individu */}
          {isFirstRow && (
            <td rowSpan={rowSpanCount} style={{ verticalAlign: "top" }}>
              {isEditing ? (
                <textarea
                  className="textarea-field"
                  rows={4}
                  value={editFormData.rhkIndividu || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, rhkIndividu: e.target.value })}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontWeight: "600", fontSize: "0.85rem", lineHeight: "1.5" }}>
                    {rhk.rhkIndividu}
                  </span>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddAspek(rhk.id)}
                      title="Tambah Aspek IKI pada RHK ini"
                    >
                      <Plus size={12} /> Aspek
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenRealisasiModal(rhk, null)}
                      title="Buat Bukti Dukung & Narasi Realisasi Kinerja"
                    >
                      <Sparkles size={12} className="text-amber-500" /> Realisasi
                    </button>
                  </div>
                  {(rhk.journalCount > 0 || rhk.photoCount > 0 || rhk.docCount > 0 || rhk.linkCount > 0) && (
                    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                      <span className="badge" style={{ background: "var(--accent-cyan-subtle)", color: "var(--accent-cyan)", fontSize: "0.68rem" }}>
                        📝 {rhk.journalCount || 0} Jurnal
                      </span>
                      {rhk.photoCount > 0 && (
                        <span className="badge" style={{ background: "var(--accent-emerald-subtle)", color: "var(--accent-emerald)", fontSize: "0.68rem" }}>
                          📷 {rhk.photoCount} Foto
                        </span>
                      )}
                      {rhk.docCount > 0 && (
                        <span className="badge" style={{ background: "var(--accent-amber-subtle)", color: "var(--accent-amber)", fontSize: "0.68rem" }}>
                          📄 {rhk.docCount} Dokumen
                        </span>
                      )}
                      {rhk.linkCount > 0 && (
                        <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-primary)", fontSize: "0.68rem" }}>
                          🔗 {rhk.linkCount} Link Drive
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </td>
          )}

          {/* Kolom Aspek (Kuantitas, Kualitas, Waktu) */}
          <td style={{ verticalAlign: "top" }}>
            <span className="badge badge-aspek">
              {asp.aspek}
            </span>
          </td>

          {/* Kolom Indikator Kinerja Individu */}
          <td style={{ verticalAlign: "top" }}>
            <span style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>{asp.indikator}</span>
          </td>

          {/* Kolom Target */}
          <td style={{ verticalAlign: "top" }}>
            <strong style={{ fontSize: "0.85rem", color: "var(--accent-primary)" }}>{asp.target}</strong>
          </td>

          {/* Kolom Realisasi & Bukti Dukung */}
          <td style={{ verticalAlign: "top" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
              {asp.buktiDukungDefault && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem" }}>
                  <FileCheck size={13} style={{ flexShrink: 0, color: "var(--accent-emerald)", marginTop: "2px" }} />
                  <span style={{ color: "var(--text-secondary)" }}>
                    <strong>Bukti:</strong> {asp.buktiDukungDefault}
                  </span>
                </div>
              )}
              {asp.realisasiDefault && (
                <div style={{ 
                  padding: "0.35rem 0.5rem", 
                  background: "var(--bg-tertiary)", 
                  borderRadius: "var(--radius-sm)", 
                  color: "var(--text-primary)" 
                }}>
                  <em>"{asp.realisasiDefault}"</em>
                </div>
              )}
            </div>
          </td>

          {/* Kolom Aksi */}
          {isFirstRow && (
            <td rowSpan={rowSpanCount} style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                {isEditing ? (
                  <button 
                    className="btn btn-emerald btn-sm"
                    onClick={handleSaveEdit}
                    title="Simpan Perubahan RHK"
                  >
                    <Check size={14} /> Simpan
                  </button>
                ) : (
                  <button 
                    className="btn btn-secondary btn-icon btn-sm"
                    onClick={() => handleStartEdit(rhk)}
                    title="Edit Kalimat RHK"
                  >
                    <Edit3 size={14} />
                  </button>
                )}

                <button 
                  className="btn btn-outline btn-icon btn-sm"
                  onClick={() => handleDeleteRhk(rhk.id)}
                  title="Hapus RHK"
                  style={{ color: "var(--accent-rose)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          )}
        </tr>
      );
    });
  }

  function renderRhkRowsKualitatif(rhk, noNumber) {
    const isEditing = editingRhkId === rhk.id;
    const ukuranKeberhasilan = rhk.ukuranKeberhasilan || deriveUkuranKeberhasilan(rhk);
    const buktiDukung = rhk.aspekList?.[0]?.buktiDukungDefault || "Laporan Pelaksanaan Tugas, SPT";
    const realisasi = rhk.realisasiKualitatif || rhk.aspekList?.[0]?.realisasiDefault || "Telah terealisasi secara optimal, berkualitas dan tuntas disahkan atasan.";

    return (
      <tr key={rhk.id}>
        {/* Kolom No */}
        <td style={{ textAlign: "center", fontWeight: "700", verticalAlign: "top" }}>
          {noNumber}
        </td>

        {/* Kolom Jenis */}
        <td style={{ verticalAlign: "top" }}>
          <span className={`badge ${rhk.jenis === "UTAMA" ? "badge-utama" : "badge-tambahan"}`}>
            {rhk.jenis}
          </span>
        </td>

        {/* Kolom RHK Pimpinan */}
        <td style={{ verticalAlign: "top" }}>
          {isEditing ? (
            <textarea
              className="textarea-field"
              rows={3}
              value={editFormData.rhkPimpinan || ""}
              onChange={(e) => setEditFormData({ ...editFormData, rhkPimpinan: e.target.value })}
            />
          ) : (
            <span style={{ fontSize: "0.83rem", lineHeight: "1.5" }}>{rhk.rhkPimpinan}</span>
          )}
        </td>

        {/* Kolom RHK Individu */}
        <td style={{ verticalAlign: "top" }}>
          {isEditing ? (
            <textarea
              className="textarea-field"
              rows={4}
              value={editFormData.rhkIndividu || ""}
              onChange={(e) => setEditFormData({ ...editFormData, rhkIndividu: e.target.value })}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontWeight: "600", fontSize: "0.85rem", lineHeight: "1.5" }}>
                {rhk.rhkIndividu}
              </span>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenRealisasiModal(rhk, null)}
                  title="Kelola Bukti Dukung & Narasi Realisasi Kualitatif"
                >
                  <Sparkles size={12} className="text-amber-500" /> Realisasi & Bukti
                </button>
              </div>
              {(rhk.journalCount > 0 || rhk.photoCount > 0 || rhk.docCount > 0 || rhk.linkCount > 0) && (
                <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                  <span className="badge" style={{ background: "var(--accent-cyan-subtle)", color: "var(--accent-cyan)", fontSize: "0.68rem" }}>
                    📝 {rhk.journalCount || 0} Jurnal
                  </span>
                  {rhk.photoCount > 0 && (
                    <span className="badge" style={{ background: "var(--accent-emerald-subtle)", color: "var(--accent-emerald)", fontSize: "0.68rem" }}>
                      📷 {rhk.photoCount} Foto
                    </span>
                  )}
                  {rhk.docCount > 0 && (
                    <span className="badge" style={{ background: "var(--accent-amber-subtle)", color: "var(--accent-amber)", fontSize: "0.68rem" }}>
                      📄 {rhk.docCount} Dokumen
                    </span>
                  )}
                  {rhk.linkCount > 0 && (
                    <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-primary)", fontSize: "0.68rem" }}>
                      🔗 {rhk.linkCount} Link Drive
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Kolom Ukuran Keberhasilan & Target Deskriptif */}
        <td style={{ verticalAlign: "top" }}>
          {isEditing ? (
            <textarea
              className="textarea-field"
              rows={4}
              value={editFormData.ukuranKeberhasilan !== undefined ? editFormData.ukuranKeberhasilan : ukuranKeberhasilan}
              onChange={(e) => setEditFormData({ ...editFormData, ukuranKeberhasilan: e.target.value })}
              placeholder="Deskripsi ukuran keberhasilan / indikator dan target capaian..."
            />
          ) : (
            <div style={{ fontSize: "0.83rem", lineHeight: "1.55" }}>
              <p style={{ margin: "0 0 0.4rem 0", color: "var(--text-primary)" }}>
                {ukuranKeberhasilan}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)", fontSize: "0.68rem", fontWeight: "600" }}>
                  Ukuran Keberhasilan Deskriptif
                </span>
              </div>
            </div>
          )}
        </td>

        {/* Kolom Realisasi & Bukti Dukung */}
        <td style={{ verticalAlign: "top" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
            {buktiDukung && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem" }}>
                <FileCheck size={13} style={{ flexShrink: 0, color: "var(--accent-emerald)", marginTop: "2px" }} />
                <span style={{ color: "var(--text-secondary)" }}>
                  <strong>Bukti:</strong> {buktiDukung}
                </span>
              </div>
            )}
            {realisasi && (
              <div style={{ 
                padding: "0.35rem 0.5rem", 
                background: "var(--bg-tertiary)", 
                borderRadius: "var(--radius-sm)", 
                color: "var(--text-primary)" 
              }}>
                <em>"{realisasi}"</em>
              </div>
            )}
          </div>
        </td>

        {/* Kolom Aksi */}
        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
            {isEditing ? (
              <button 
                className="btn btn-emerald btn-sm"
                onClick={handleSaveEdit}
                title="Simpan Perubahan RHK"
              >
                <Check size={14} /> Simpan
              </button>
            ) : (
              <button 
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => handleStartEdit(rhk)}
                title="Edit Kalimat RHK & Ukuran Keberhasilan"
              >
                <Edit3 size={14} />
              </button>
            )}

            <button 
              className="btn btn-outline btn-icon btn-sm"
              onClick={() => handleDeleteRhk(rhk.id)}
              title="Hapus RHK"
              style={{ color: "var(--accent-rose)" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
}
