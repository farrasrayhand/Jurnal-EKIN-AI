import * as XLSX from "xlsx";
import { deriveUkuranKeberhasilan } from "./aiService";

/**
 * Ekspor Data SKP lengkap ke file Excel (.xlsx) dengan format PermenPAN-RB No. 6 Tahun 2022
 */
export function exportToExcel(pegawai, penilai, periode, rhkList, berakhlakList, intervensiPimpinan, pendekatan = "KUANTITATIF") {
  const wb = XLSX.utils.book_new();
  const isKualitatif = pendekatan === "KUALITATIF";

  // 1. Sheet Matriks SKP
  const skpRows = [
    [`MATRIKS SASARAN KINERJA PEGAWAI (SKP) PENDEKATAN HASIL KERJA ${isKualitatif ? "KUALITATIF" : "KUANTITATIF"}`],
    ["SESUAI PERMENPAN-RB NO. 6 TAHUN 2022 / STANDAR BKN"],
    ["PERIODE PENILAIAN:", periode.mulai || "1 Januari 2026", "s.d.", periode.selesai || "31 Desember 2026"],
    [],
    ["A. PEGAWAI YANG DINILAI", "", "", "B. PEJABAT PENILAI KINERJA", ""],
    ["1. NAMA", pegawai.nama || "-", "", "1. NAMA", penilai.nama || "-"],
    ["2. NIP", pegawai.nip || "-", "", "2. NIP", penilai.nip || "-"],
    ["3. PANGKAT / GOL", pegawai.pangkat || "-", "", "3. PANGKAT / GOL", penilai.pangkat || "-"],
    ["4. JABATAN", pegawai.jabatan || "-", "", "4. JABATAN", penilai.jabatan || "-"],
    ["5. UNIT KERJA", pegawai.unitKerja || "-", "", "5. UNIT KERJA", penilai.unitKerja || "-"],
    [],
    ["RENCANA KINERJA PIMPINAN YANG DIINTERVENSI:", intervensiPimpinan || "-"],
    []
  ];

  if (isKualitatif) {
    // Header Kolom Pendekatan Kualitatif
    skpRows.push(["NO", "JENIS", "RENCANA HASIL KERJA PIMPINAN", "RENCANA HASIL KERJA INDIVIDU", "UKURAN KEBERHASILAN / INDIKATOR DAN TARGET TAHUNAN", "REALISASI", "BUKTI DUKUNG"]);
    
    let noUrut = 1;
    rhkList.forEach((rhk) => {
      const ukuran = rhk.ukuranKeberhasilan || deriveUkuranKeberhasilan(rhk);
      const realisasi = rhk.realisasiKualitatif || rhk.aspekList?.[0]?.realisasiDefault || "-";
      const bukti = rhk.aspekList?.[0]?.buktiDukungDefault || "-";
      skpRows.push([
        noUrut,
        rhk.jenis,
        rhk.rhkPimpinan,
        rhk.rhkIndividu,
        ukuran,
        realisasi,
        bukti
      ]);
      noUrut++;
    });
  } else {
    // Header Kolom Pendekatan Kuantitatif
    skpRows.push(["NO", "JENIS", "RENCANA HASIL KERJA PIMPINAN", "RENCANA HASIL KERJA INDIVIDU", "ASPEK", "INDIKATOR KINERJA INDIVIDU (IKI)", "TARGET TAHUNAN", "REALISASI", "BUKTI DUKUNG"]);

    let noUrut = 1;
    rhkList.forEach((rhk) => {
      (rhk.aspekList || []).forEach((asp, idx) => {
        skpRows.push([
          idx === 0 ? noUrut : "",
          idx === 0 ? rhk.jenis : "",
          idx === 0 ? rhk.rhkPimpinan : "",
          idx === 0 ? rhk.rhkIndividu : "",
          asp.aspek,
          asp.indikator,
          asp.target,
          asp.realisasiDefault || "-",
          asp.buktiDukungDefault || "-"
        ]);
      });
      noUrut++;
    });
  }

  const wsSkp = XLSX.utils.aoa_to_sheet(skpRows);

  // Set lebar kolom agar rapi saat dibuka di Excel
  if (isKualitatif) {
    wsSkp["!cols"] = [
      { wch: 5 },  // No
      { wch: 10 }, // Jenis
      { wch: 35 }, // RHK Pimpinan
      { wch: 45 }, // RHK Individu
      { wch: 55 }, // Ukuran Keberhasilan & Target
      { wch: 40 }, // Realisasi
      { wch: 40 }  // Bukti Dukung
    ];
  } else {
    wsSkp["!cols"] = [
      { wch: 5 },  // No
      { wch: 10 }, // Jenis
      { wch: 35 }, // RHK Pimpinan
      { wch: 45 }, // RHK Individu
      { wch: 12 }, // Aspek
      { wch: 45 }, // IKI
      { wch: 20 }, // Target Tahunan
      { wch: 40 }, // Realisasi
      { wch: 40 }  // Bukti Dukung
    ];
  }

  XLSX.utils.book_append_sheet(wb, wsSkp, `Matriks SKP ${isKualitatif ? "Kualitatif" : "Kuantitatif"}`);

  // 2. Sheet Perilaku Kerja BerAKHLAK
  const berakhlakRows = [
    ["PERILAKU KERJA PEGAWAI (CORE VALUES ASN BerAKHLAK)"],
    ["NO", "NILAI DASAR", "PANDUAN PERILAKU", "EKSPEKTASI KHUSUS PIMPINAN"]
  ];

  berakhlakList.forEach((b, idx) => {
    const panduan = Array.isArray(b.panduanPerilaku) ? b.panduanPerilaku.join("\n- ") : b.panduanPerilaku;
    berakhlakRows.push([
      idx + 1,
      b.name,
      `- ${panduan}`,
      b.ekspektasi || b.defaultEkspektasi || "-"
    ]);
  });

  const wsBerakhlak = XLSX.utils.aoa_to_sheet(berakhlakRows);
  wsBerakhlak["!cols"] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 60 },
    { wch: 60 }
  ];

  XLSX.utils.book_append_sheet(wb, wsBerakhlak, "Perilaku Kerja BerAKHLAK");

  // Unduh file excel
  const fileName = `SKP_${(pegawai.nama || "ASN").replace(/\s+/g, "_")}_PermenPANRB_6_2022.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Ekspor data state lengkap ke JSON (Fitur Backup)
 */
export function exportToJson(data) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  const name = (data.pegawai?.nama || "SKP_Data").replace(/\s+/g, "_");
  downloadAnchor.setAttribute("download", `Backup_${name}_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Buka window cetak
 */
export function triggerPrint() {
  window.print();
}
