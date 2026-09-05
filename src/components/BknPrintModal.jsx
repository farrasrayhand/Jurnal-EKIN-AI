import React from "react";
import { X, Printer, Download } from "lucide-react";
import { triggerPrint } from "../services/exportService";
import { deriveUkuranKeberhasilan } from "../services/aiService";

export default function BknPrintModal({
  isOpen,
  onClose,
  pegawai,
  periode,
  intervensiPimpinan,
  rhkList,
  berakhlakList,
  journals = [],
  pendekatan = "KUANTITATIF"
}) {
  if (!isOpen) return null;

  const isKualitatif = pendekatan === "KUALITATIF";
  const utamaList = rhkList.filter(r => r.jenis === "UTAMA");
  const tambahanList = rhkList.filter(r => r.jenis === "TAMBAHAN");

  const cleanName = (pegawai?.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");
  const periodeText = typeof periode === "object" ? (periode.mulai || "2026").replace(/[^a-zA-Z0-9]/g, "_") : "2026";
  const printDocTitle = `Dokumen_SKP_${periodeText}_${cleanName}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "1100px", background: "#ffffff", color: "#000000" }}
      >
        <div className="modal-header no-print" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Pratinjau Dokumen Cetak Standar BKN</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Format Dokumen SKP & Lampiran PermenPAN-RB No. 6 Tahun 2022
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary btn-sm" onClick={() => triggerPrint(printDocTitle)}>
              <Printer size={15} /> Cetak / Simpan PDF
            </button>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lembar Dokumen Fisik Resmi BKN */}
        <div 
          className="bkn-print-document"
          style={{ 
            padding: "2.5rem", 
            fontFamily: "'Times New Roman', Times, serif", 
            lineHeight: "1.4",
            background: "#ffffff",
            color: "#000000"
          }}
        >
          {/* Judul Dokumen */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", margin: 0 }}>
              MATRIKS SASARAN KINERJA PEGAWAI (SKP)
            </h2>
            <h3 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: "3px 0" }}>
              PENDEKATAN HASIL KERJA {isKualitatif ? "KUALITATIF" : "KUANTITATIF"}
            </h3>
            <p style={{ fontSize: "10pt", margin: 0 }}>
              BAGI JABATAN ADMINISTRASI / JABATAN FUNGSIONAL
            </p>
            <p style={{ fontSize: "10pt", fontWeight: "bold", marginTop: "4px" }}>
              PERIODE PENILAIAN: {periode.mulai || "1 JANUARI 2026"} S.D. {periode.selesai || "31 DESEMBER 2026"}
            </p>
          </div>

          {/* Tabel Profil Pegawai */}
          <table className="bkn-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: "12px" }}>
            <tbody>
              <tr style={{ fontWeight: "bold", backgroundColor: "#f2f2f2" }}>
                <td style={{ width: "8%", textAlign: "center", border: "1px solid #000" }}>NO</td>
                <td colSpan={2} style={{ border: "1px solid #000" }}>DATA IDENTITAS PEGAWAI</td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", border: "1px solid #000" }}>1</td>
                <td style={{ width: "25%", border: "1px solid #000" }}>Nama Lengkap</td>
                <td style={{ border: "1px solid #000" }}>{pegawai.nama || "-"}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", border: "1px solid #000" }}>2</td>
                <td style={{ border: "1px solid #000" }}>NIP</td>
                <td style={{ border: "1px solid #000" }}>{pegawai.nip || "-"}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", border: "1px solid #000" }}>3</td>
                <td style={{ border: "1px solid #000" }}>Pangkat/Gol.</td>
                <td style={{ border: "1px solid #000" }}>{pegawai.pangkat || "-"}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", border: "1px solid #000" }}>4</td>
                <td style={{ border: "1px solid #000" }}>Jabatan</td>
                <td style={{ border: "1px solid #000" }}>{pegawai.jabatan || "-"}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", border: "1px solid #000" }}>5</td>
                <td style={{ border: "1px solid #000" }}>Unit Kerja</td>
                <td style={{ border: "1px solid #000" }}>{pegawai.unitKerja || "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* Rencana Kinerja Pimpinan yang Diintervensi */}
          {intervensiPimpinan && (
            <div style={{ fontSize: "9.5pt", marginBottom: "10px", padding: "4px 8px", border: "1px solid #000", background: "#fbfbfb" }}>
              <strong>RENCANA KINERJA PIMPINAN YANG DIINTERVENSI:</strong> {intervensiPimpinan}
            </div>
          )}

          {/* Tabel Matriks Kinerja RHK */}
          <table className="bkn-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginBottom: "15px" }}>
            <thead>
              {isKualitatif ? (
                /* Header Cetak Pendekatan Kualitatif (5 Kolom Resmi BKN) */
                <>
                  <tr style={{ backgroundColor: "#f2f2f2", fontWeight: "bold" }}>
                    <th style={{ width: "4%", border: "1px solid #000", padding: "4px" }}>NO</th>
                    <th style={{ width: "24%", border: "1px solid #000", padding: "4px" }}>RENCANA HASIL KERJA PIMPINAN YANG DIINTERVENSI</th>
                    <th style={{ width: "26%", border: "1px solid #000", padding: "4px" }}>RENCANA HASIL KERJA</th>
                    <th style={{ width: "30%", border: "1px solid #000", padding: "4px" }}>UKURAN KEBERHASILAN / INDIKATOR KINERJA INDIVIDU DAN TARGET</th>
                    <th style={{ width: "16%", border: "1px solid #000", padding: "4px" }}>BUKTI DUKUNG / REALISASI</th>
                  </tr>
                  <tr style={{ backgroundColor: "#f9f9f9", fontSize: "8pt", textAlign: "center" }}>
                    <th style={{ border: "1px solid #000" }}>(1)</th>
                    <th style={{ border: "1px solid #000" }}>(2)</th>
                    <th style={{ border: "1px solid #000" }}>(3)</th>
                    <th style={{ border: "1px solid #000" }}>(4)</th>
                    <th style={{ border: "1px solid #000" }}>(5)</th>
                  </tr>
                </>
              ) : (
                /* Header Cetak Pendekatan Kuantitatif (7 Kolom Resmi BKN) */
                <>
                  <tr style={{ backgroundColor: "#f2f2f2", fontWeight: "bold" }}>
                    <th style={{ width: "4%", border: "1px solid #000", padding: "4px" }}>NO</th>
                    <th style={{ width: "20%", border: "1px solid #000", padding: "4px" }}>RENCANA HASIL KERJA PIMPINAN YANG DIINTERVENSI</th>
                    <th style={{ width: "24%", border: "1px solid #000", padding: "4px" }}>RENCANA HASIL KERJA</th>
                    <th style={{ width: "8%", border: "1px solid #000", padding: "4px" }}>ASPEK</th>
                    <th style={{ width: "20%", border: "1px solid #000", padding: "4px" }}>INDIKATOR KINERJA INDIVIDU</th>
                    <th style={{ width: "10%", border: "1px solid #000", padding: "4px" }}>TARGET TAHUNAN</th>
                    <th style={{ width: "14%", border: "1px solid #000", padding: "4px" }}>BUKTI DUKUNG / REALISASI</th>
                  </tr>
                  <tr style={{ backgroundColor: "#f9f9f9", fontSize: "8pt", textAlign: "center" }}>
                    <th style={{ border: "1px solid #000" }}>(1)</th>
                    <th style={{ border: "1px solid #000" }}>(2)</th>
                    <th style={{ border: "1px solid #000" }}>(3)</th>
                    <th style={{ border: "1px solid #000" }}>(4)</th>
                    <th style={{ border: "1px solid #000" }}>(5)</th>
                    <th style={{ border: "1px solid #000" }}>(6)</th>
                    <th style={{ border: "1px solid #000" }}>(7)</th>
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {/* UTAMA */}
              {utamaList.length > 0 && (
                <tr style={{ fontWeight: "bold", backgroundColor: "#eaeaea" }}>
                  <td colSpan={isKualitatif ? 5 : 7} style={{ border: "1px solid #000", padding: "4px 8px" }}>
                    A. UTAMA
                  </td>
                </tr>
              )}
              {utamaList.map((rhk, rIdx) => 
                isKualitatif 
                  ? renderPrintRhkKualitatif(rhk, rIdx + 1)
                  : renderPrintRhkKuantitatif(rhk, rIdx + 1)
              )}

              {/* TAMBAHAN */}
              {tambahanList.length > 0 && (
                <tr style={{ fontWeight: "bold", backgroundColor: "#eaeaea" }}>
                  <td colSpan={isKualitatif ? 5 : 7} style={{ border: "1px solid #000", padding: "4px 8px" }}>
                    B. TAMBAHAN
                  </td>
                </tr>
              )}
              {tambahanList.map((rhk, rIdx) => 
                isKualitatif
                  ? renderPrintRhkKualitatif(rhk, utamaList.length + rIdx + 1)
                  : renderPrintRhkKuantitatif(rhk, utamaList.length + rIdx + 1)
              )}
            </tbody>
          </table>

          {/* Lampiran Perilaku Kerja BerAKHLAK */}
          <div style={{ pageBreakBefore: "auto", marginTop: "20px" }}>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <h4 style={{ fontSize: "10.5pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                LAMPIRAN: PERILAKU KERJA PEGAWAI (CORE VALUES BerAKHLAK)
              </h4>
            </div>

            <table className="bkn-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginBottom: "20px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f2f2f2", fontWeight: "bold" }}>
                  <th style={{ width: "5%", border: "1px solid #000", padding: "4px" }}>NO</th>
                  <th style={{ width: "20%", border: "1px solid #000", padding: "4px" }}>NILAI DASAR</th>
                  <th style={{ width: "40%", border: "1px solid #000", padding: "4px" }}>PANDUAN PERILAKU</th>
                  <th style={{ width: "35%", border: "1px solid #000", padding: "4px" }}>EKSPEKTASI KHUSUS PIMPINAN</th>
                </tr>
              </thead>
              <tbody>
                {berakhlakList.map((b, idx) => (
                  <tr key={b.id}>
                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "4px" }}>{idx + 1}</td>
                    <td style={{ fontWeight: "bold", border: "1px solid #000", padding: "4px" }}>{b.name}</td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>
                      <ul style={{ paddingLeft: "15px", margin: 0 }}>
                        {b.panduanPerilaku.map((p, pIdx) => (
                          <li key={pIdx}>{p}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px" }}>
                      {b.ekspektasi || b.defaultEkspektasi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lampiran Bukti Foto Dokumentasi Kegiatan (Jika ada) */}
          {journals.some(j => Boolean(j.fotoUrl)) && (
            <div style={{ pageBreakBefore: "always", marginTop: "25px" }}>
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "11pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                  LAMPIRAN DOKUMENTASI BUKTI KERJA (FOTO KEGIATAN)
                </h4>
                <p style={{ fontSize: "9.5pt", margin: "2px 0 0 0" }}>
                  REKAPITULASI DOKUMENTASI DARI LOGBOOK JURNAL HARIAN PEGAWAI
                </p>
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)", 
                gap: "12px", 
                marginBottom: "20px" 
              }}>
                {journals.filter(j => Boolean(j.fotoUrl)).map((j, idx) => {
                  const matchedRhk = rhkList.find(r => r.id === j.rhkId);
                  return (
                    <div 
                      key={j.id || idx}
                      style={{ 
                        border: "1px solid #000", 
                        padding: "8px", 
                        pageBreakInside: "avoid",
                        fontSize: "8.5pt",
                        background: "#fff"
                      }}
                    >
                      <div style={{ height: "140px", marginBottom: "6px", textAlign: "center", background: "#f5f5f5" }}>
                        <img 
                          src={j.fotoUrl} 
                          alt={j.aktivitas} 
                          style={{ maxWidth: "100%", maxHeight: "140px", objectFit: "contain" }}
                        />
                      </div>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                        Dokumentasi #{idx + 1}: {j.aktivitas}
                      </div>
                      <div style={{ color: "#333", fontSize: "8pt" }}>
                        <span>Tanggal: {j.tanggal} {j.jam ? `(${j.jam})` : ""}</span> | <span>Output: {j.outputJumlah || "-"}</span>
                      </div>
                      {matchedRhk && (
                        <div style={{ fontStyle: "italic", fontSize: "7.5pt", color: "#555", marginTop: "2px" }}>
                          Keterkaitan: {matchedRhk.jenis} - {matchedRhk.rhkIndividu.slice(0, 60)}...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lampiran Daftar Berkas Dokumen & Tautan Hasil Kerja */}
          {journals.some(j => Boolean(j.fileName || j.linkUrl)) && (
            <div style={{ pageBreakBefore: "auto", marginTop: "20px" }}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <h4 style={{ fontSize: "10.5pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                  LAMPIRAN: DAFTAR BERKAS DOKUMEN & TAUTAN PENYIMPANAN BUKTI DUKUNG
                </h4>
              </div>

              <table className="bkn-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f2f2f2", fontWeight: "bold" }}>
                    <th style={{ width: "5%", border: "1px solid #000", padding: "4px" }}>NO</th>
                    <th style={{ width: "12%", border: "1px solid #000", padding: "4px" }}>TANGGAL</th>
                    <th style={{ width: "35%", border: "1px solid #000", padding: "4px" }}>URAIAN AKTIVITAS TUGAS</th>
                    <th style={{ width: "28%", border: "1px solid #000", padding: "4px" }}>NAMA BERKAS / BUKTI OUTPUT</th>
                    <th style={{ width: "20%", border: "1px solid #000", padding: "4px" }}>TAUTAN CLOUD / DRIVE</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.filter(j => Boolean(j.fileName || j.linkUrl || j.fotoUrl || j.fileUrl)).map((j, idx) => {
                    const isImg = Boolean(
                      j.fotoUrl ||
                      (j.evidenceType === "image") ||
                      (j.fileUrl && /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(j.fileUrl)) ||
                      (j.fileName && /\.(jpg|jpeg|png|webp|gif)$/i.test(j.fileName))
                    );
                    const effectiveFoto = j.fotoUrl || (isImg ? j.fileUrl : "");
                    const effectiveFile = j.fileUrl || (j.filePath ? `/uploads/${j.filePath.split(/[/\\]/).pop()}` : (j.fileName ? `/uploads/${j.fileName}` : ""));

                    return (
                      <tr key={j.id || idx}>
                        <td style={{ textAlign: "center", border: "1px solid #000", padding: "4px" }}>{idx + 1}</td>
                        <td style={{ textAlign: "center", border: "1px solid #000", padding: "4px" }}>{j.tanggal}</td>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>
                          <strong>{j.aktivitas}</strong>
                          {j.outputJumlah && <div style={{ fontSize: "8pt", color: "#444" }}>Output: {j.outputJumlah}</div>}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "4px" }}>
                          {j.fileName && !isImg ? (
                            <div>
                              📄{" "}
                              <span className="print-only-text" style={{ display: "none", fontWeight: "bold" }}>
                                {j.fileName}
                              </span>
                              <a
                                href={effectiveFile}
                                target="_blank"
                                rel="noreferrer"
                                className="preview-only-link"
                                style={{ color: "#1d4ed8", textDecoration: "underline", fontWeight: "bold" }}
                              >
                                {j.fileName}
                              </a>{" "}
                              {j.fileSize ? `(${j.fileSize})` : ""}
                            </div>
                          ) : isImg ? (
                            <div>
                              📸{" "}
                              <span className="print-only-text" style={{ display: "none", fontWeight: "bold" }}>
                                Foto Dokumentasi
                              </span>
                              <a
                                href={effectiveFoto || effectiveFile}
                                target="_blank"
                                rel="noreferrer"
                                className="preview-only-link"
                                style={{ color: "#1d4ed8", textDecoration: "underline", fontWeight: "bold" }}
                              >
                                Foto Dokumentasi
                              </a>
                            </div>
                          ) : "-"}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "4px", fontSize: "8pt", wordBreak: "break-all" }}>
                          {j.linkUrl && !j.linkUrl.includes("/uploads/") ? (
                            <>
                              <a href={j.linkUrl} target="_blank" rel="noreferrer" className="preview-only-link" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                                {j.linkUrl}
                              </a>
                              <span className="print-only-text" style={{ display: "none" }}>
                                {j.linkUrl}
                              </span>
                            </>
                          ) : (effectiveFile || effectiveFoto) ? (
                            <>
                              <a href={effectiveFile || effectiveFoto} target="_blank" rel="noreferrer" className="preview-only-link" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                                {effectiveFile || effectiveFoto}
                              </a>
                              <span className="print-only-text" style={{ display: "none", color: "#333333", fontStyle: "italic" }}>
                                Terlampir dalam berkas fisik / ZIP
                              </span>
                            </>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer no-print" style={{ background: "var(--bg-secondary)" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" onClick={() => triggerPrint(printDocTitle)}>
            <Printer size={16} /> Cetak / Unduh Dokumen PDF
          </button>
        </div>
      </div>
    </div>
  );

  function renderPrintRhkKuantitatif(rhk, num) {
    const rowSpan = rhk.aspekList?.length || 1;

    return (rhk.aspekList || []).map((asp, idx) => (
      <tr key={asp.id || idx}>
        {idx === 0 && (
          <td rowSpan={rowSpan} style={{ textAlign: "center", border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
            {num}
          </td>
        )}
        {idx === 0 && (
          <td rowSpan={rowSpan} style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
            {rhk.rhkPimpinan}
          </td>
        )}
        {idx === 0 && (
          <td rowSpan={rowSpan} style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top", fontWeight: "bold" }}>
            {rhk.rhkIndividu}
          </td>
        )}
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
          {asp.aspek}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
          {asp.indikator}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top", textAlign: "center", fontWeight: "bold" }}>
          {asp.target}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top", fontSize: "8.5pt" }}>
          {asp.buktiDukungDefault || "-"}
          {asp.realisasiDefault && (
            <div style={{ marginTop: "3px", fontStyle: "italic", color: "#333" }}>
              Realisasi: {asp.realisasiDefault}
            </div>
          )}
        </td>
      </tr>
    ));
  }

  function renderPrintRhkKualitatif(rhk, num) {
    const ukuranKeberhasilan = rhk.ukuranKeberhasilan || deriveUkuranKeberhasilan(rhk);
    const buktiDukung = rhk.aspekList?.[0]?.buktiDukungDefault || "-";
    const realisasi = rhk.realisasiKualitatif || rhk.aspekList?.[0]?.realisasiDefault || "-";

    return (
      <tr key={rhk.id || num}>
        <td style={{ textAlign: "center", border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
          {num}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
          {rhk.rhkPimpinan}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top", fontWeight: "bold" }}>
          {rhk.rhkIndividu}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top" }}>
          {ukuranKeberhasilan}
        </td>
        <td style={{ border: "1px solid #000", padding: "4px", verticalAlign: "top", fontSize: "8.5pt" }}>
          {buktiDukung}
          {realisasi && realisasi !== "-" && (
            <div style={{ marginTop: "3px", fontStyle: "italic", color: "#333" }}>
              Realisasi: {realisasi}
            </div>
          )}
        </td>
      </tr>
    );
  }
}
