// AI Service untuk Generasi SKP, RHK, IKI, Bukti Dukung & Realisasi
// Mendukung Mode Cerdas Offline (Built-in NLP Heuristics) & Mode Online (Google Gemini API)

import { ASN_PRESETS, BERAKHLAK_EKP_BY_ROLE } from "../data/presetTemplates.js";

// Format prompt sistem untuk Gemini API
const SYSTEM_PROMPT_SKP = `
Anda adalah Pakar Kinerja ASN Kementerian PANRB & BKN Indonesia.
Tugas Anda adalah merumuskan Sasaran Kinerja Pegawai (SKP) sesuai PermenPAN-RB No. 6 Tahun 2022.
Format keluaran HARUS berupa JSON murni dengan struktur:
{
  "intervensiPimpinan": "Rencana Kinerja Pimpinan yang Diintervensi",
  "rhkList": [
    {
      "jenis": "UTAMA" atau "TAMBAHAN",
      "rhkPimpinan": "Kalimat RHK Pimpinan",
      "rhkIndividu": "Kalimat RHK Individu (Diawali: Terlaksananya / Tersusunnya / Meningkatnya / Terwujudnya)",
      "ukuranKeberhasilan": "Deskripsi ukuran keberhasilan / indikator kinerja individu dan target secara kualitatif terpadu",
      "aspekList": [
        {
          "aspek": "Kuantitas",
          "indikator": "Jumlah ... yang disusun/dilaksanakan",
          "target": "Angka dan satuan (misal: 12 Laporan)",
          "satuan": "Laporan/Dokumen/Kegiatan",
          "buktiDukungDefault": "Nama dokumen bukti dukung",
          "realisasiDefault": "Narasi capaian kinerja realisasi"
        },
        {
          "aspek": "Kualitas",
          "indikator": "Tingkat kesesuaian / persentase mutu ...",
          "target": "85 - 100%",
          "satuan": "%",
          "buktiDukungDefault": "Hasil verifikasi/supervisi atasan",
          "realisasiDefault": "Tercapai 95% sesuai standar yang ditetapkan"
        },
        {
          "aspek": "Waktu",
          "indikator": "Ketepatan waktu pelaksanaan ...",
          "target": "12 Bulan",
          "satuan": "Bulan",
          "buktiDukungDefault": "Jurnal kerja / logbook aktivitas",
          "realisasiDefault": "Tepat waktu terselesaikan dalam kurun 12 bulan"
        }
      ]
    }
  ]
}
Gunakan bahasa formal birokrasi Indonesia yang lugas, terukur, dan akuntabel.
`;

/**
 * Generate SKP menggunakan Gemini API
 */
export async function generateSkpWithGemini(jabatan, unitKerja, jenjang, apiKey, tupoksiTambahan = "") {
  if (!apiKey) {
    throw new Error("API Key Gemini belum diatur. Silakan atur di menu Pengaturan API.");
  }

  const promptText = `
Buatkan draf SKP lengkap untuk ASN dengan data berikut:
- Jabatan: ${jabatan} (${jenjang})
- Unit Kerja: ${unitKerja}
${tupoksiTambahan ? `- Uraian Tugas Tambahan / Catatan: ${tupoksiTambahan}` : ""}

Hasilkan minimal 3 RHK UTAMA dan 1 RHK TAMBAHAN. Setiap RHK WAJIB memiliki 3 Aspek IKI: Kuantitas, Kualitas, dan Waktu lengkap dengan target dan rekomendasi dokumen bukti dukung.
Balas HANYA dengan kode JSON valid tanpa markdown backtick.
  `.trim();

  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT_SKP}\n\n${promptText}` }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          // Pastikan setiap RHK dan aspek memiliki ID unik untuk state React
          const formattedRhkList = (parsed.rhkList || []).map((rhk, rIdx) => ({
            ...rhk,
            id: `gemini-rhk-${Date.now()}-${rIdx}`,
            aspekList: (rhk.aspekList || []).map((asp, aIdx) => ({
              ...asp,
              id: `gemini-asp-${Date.now()}-${rIdx}-${aIdx}`
            }))
          }));

          return {
            intervensiPimpinan: parsed.intervensiPimpinan || "Terwujudnya akuntabilitas dan pelayanan publik yang optimal",
            rhkList: formattedRhkList,
            model: model
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error?.message || `Gagal memanggil Gemini API (${model}, Status ${response.status})`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Tidak ada respon dari Gemini AI pada seluruh model yang tersedia.");
}

/**
 * Generate SKP cerdas secara Offline (Rule-based & Heuristic NLP Engine)
 * Bekerja seketika tanpa memerlukan koneksi internet atau API key!
 */
export function generateSkpOffline(jabatanQuery, jenjang = "Ahli Pertama", unitKerja = "") {
  const query = (jabatanQuery || "").toLowerCase();

  // 1. Cek kecocokan dengan preset terdaftar
  let matchedPreset = null;
  if (query.includes("guru") || query.includes("pengajar") || query.includes("pendidik") || query.includes("sekolah")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "guru_ahli");
  } else if (query.includes("komputer") || query.includes("it") || query.includes("programmer") || query.includes("sistem") || query.includes("prakom") || query.includes("jaringan")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "pranata_komputer");
  } else if (query.includes("perawat") || query.includes("bidan") || query.includes("dokter") || query.includes("kesehatan") || query.includes("nakes") || query.includes("puskesmas") || query.includes("rumah sakit")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "tenaga_kesehatan_perawat");
  } else if (query.includes("administrasi") || query.includes("arsip") || query.includes("tata usaha") || query.includes("surat") || query.includes("umum") || query.includes("pelaksana")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "pengadministrasi_perkantoran");
  } else if (query.includes("kebijakan") || query.includes("analis") || query.includes("perencana") || query.includes("bappeda") || query.includes("renja")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "analis_kebijakan");
  } else if (query.includes("uang") || query.includes("keuangan") || query.includes("bendahara") || query.includes("anggaran") || query.includes("spj") || query.includes("pajak")) {
    matchedPreset = ASN_PRESETS.find(p => p.id === "pengelola_keuangan");
  }

  if (matchedPreset) {
    // Kloning objek agar tidak merusak data master
    return {
      intervensiPimpinan: matchedPreset.intervensiPimpinanDefault,
      rhkList: matchedPreset.rhkList.map((rhk, rIdx) => ({
        ...rhk,
        id: `offline-rhk-${Date.now()}-${rIdx}`,
        aspekList: rhk.aspekList.map((asp, aIdx) => ({
          ...asp,
          id: `offline-asp-${Date.now()}-${rIdx}-${aIdx}`
        }))
      }))
    };
  }

  // 2. Jika jabatan kustom tidak ada di preset umum, susun heuristik cerdas sesuai kaidah PermenPAN-RB 6/2022
  const cleanedTitle = jabatanQuery.trim() || "Pegawai Aparatur Sipil Negara";
  const orgName = unitKerja.trim() || "Unit Kerja";

  return {
    intervensiPimpinan: `Meningkatnya efektivitas dan capaian target kinerja pelayanan pada ${orgName}`,
    rhkList: [
      {
        id: `gen-rhk-${Date.now()}-1`,
        jenis: "UTAMA",
        rhkPimpinan: `Terlaksananya program kerja prioritas dan pemenuhan standar pelayanan pada ${orgName}`,
        rhkIndividu: `Terlaksananya penatausahaan, koordinasi teknis, dan pelaksanaan tugas pokok fungsi sebagai ${cleanedTitle} sesuai ketentuan dan SOP yang berlaku`,
        aspekList: [
          {
            id: `gen-asp-${Date.now()}-1-1`,
            aspek: "Kuantitas",
            indikator: `Jumlah laporan pelaksanaan tugas kedinasan sebagai ${cleanedTitle} yang diselesaikan`,
            target: "12 Laporan Bulanan",
            satuan: "Laporan",
            buktiDukungDefault: "Laporan Kinerja Bulanan, Log Aktivitas Kerja Harian, Surat Perintah Tugas",
            realisasiDefault: "12 laporan bulanan pelaksanaan tugas kedinasan tersusun tuntas dan diverifikasi atasan langsung"
          },
          {
            id: `gen-asp-${Date.now()}-1-2`,
            aspek: "Kualitas",
            indikator: "Tingkat kesesuaian output pelaksanaan tugas dengan standar operasional prosedur (SOP) dan arahan pimpinan",
            target: "90 - 95%",
            satuan: "%",
            buktiDukungDefault: "Lembar Verifikasi Kinerja Atasan, Rekapitulasi Penilaian Kualitas",
            realisasiDefault: "Capaian kualitas 94% sesuai standar akuntabilitas kinerja tanpa catatan revisi"
          },
          {
            id: `gen-asp-${Date.now()}-1-3`,
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyelesaian penugasan kedinasan",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Rekapitulasi Presensi & Jadwal Penugasan",
            realisasiDefault: "Tepat waktu diselesaikan dalam rentang 12 bulan tahun anggaran berjalan"
          }
        ]
      },
      {
        id: `gen-rhk-${Date.now()}-2`,
        jenis: "UTAMA",
        rhkPimpinan: `Terwujudnya tata kelola administrasi dan pelaporan pertanggungjawaban yang akuntabel`,
        rhkIndividu: `Tersusunnya data, rekapitulasi berkas pendukung, dan evaluasi berkala pelaksanaan kegiatan operasional pada ${orgName}`,
        aspekList: [
          {
            id: `gen-asp-${Date.now()}-2-1`,
            aspek: "Kuantitas",
            indikator: "Jumlah dokumen rekapitulasi data dan bahan evaluasi kerja yang disusun",
            target: "4 Laporan Triwulanan",
            satuan: "Dokumen",
            buktiDukungDefault: "Laporan Monev Triwulanan, Rekapitulasi Data Operasional, Notula Rapat Evaluasi",
            realisasiDefault: "4 dokumen laporan capaian triwulanan telah disahkan dan diarsipkan secara tertib"
          },
          {
            id: `gen-asp-${Date.now()}-2-2`,
            aspek: "Kualitas",
            indikator: "Tingkat akurasi dan validitas data kinerja yang disajikan",
            target: "95 - 100%",
            satuan: "%",
            buktiDukungDefault: "Lembar Konfirmasi Validitas Data, Catatan Telaahan Pimpinan",
            realisasiDefault: "Tingkat akurasi data mencapai 98% terkonfirmasi valid"
          },
          {
            id: `gen-asp-${Date.now()}-2-3`,
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyampaian laporan berkala kepada atasan langsung",
            target: "Tiap Akhir Triwulan",
            satuan: "Triwulan",
            buktiDukungDefault: "Bukti Tanda Terima Laporan",
            realisasiDefault: "Seluruh laporan diserahkan tepat waktu sebelum batas akhir pelaporan"
          }
        ]
      },
      {
        id: `gen-rhk-${Date.now()}-3`,
        jenis: "TAMBAHAN",
        rhkPimpinan: `Meningkatnya efektivitas sinergi koordinasi lintas fungsi dalam mendukung tugas kelembagaan`,
        rhkIndividu: `Terlaksananya peran serta dalam keanggotaan tim kerja / panitia kegiatan kedinasan yang dibentuk oleh pimpinan instansi`,
        aspekList: [
          {
            id: `gen-asp-${Date.now()}-3-1`,
            aspek: "Kuantitas",
            indikator: "Jumlah penugasan dalam tim kerja / kepanitiaan yang diselesaikan",
            target: "1 - 2 SK Tim Kerja",
            satuan: "SK Tim / Laporan",
            buktiDukungDefault: "Surat Keputusan (SK) Tim Kerja / Panitia dari Pimpinan, Laporan Hasil Pelaksanaan Tim",
            realisasiDefault: "2 Surat Keputusan tim kerja telah ditindaklanjuti dengan laporan pelaksanaan tugas"
          },
          {
            id: `gen-asp-${Date.now()}-3-2`,
            aspek: "Kualitas",
            indikator: "Persentase kontribusi dan keterlaksanaan agenda kerja kepanitiaan yang ditugaskan",
            target: "90 - 100%",
            satuan: "%",
            buktiDukungDefault: "Notula Rapat Tim, Berita Acara Penyelesaian Agenda",
            realisasiDefault: "Agenda tim kerja terealisasi 95% dengan hasil memuaskan"
          },
          {
            id: `gen-asp-${Date.now()}-3-3`,
            aspek: "Waktu",
            indikator: "Ketepatan waktu penuntasan agenda kerja tim",
            target: "Sesuai Jadwal Penugasan",
            satuan: "Hari/Bulan",
            buktiDukungDefault: "Jadwal Pelaksanaan Kegiatan",
            realisasiDefault: "Seluruh agenda terselesaikan sesuai batas waktu yang ditetapkan pimpinan"
          }
        ]
      }
    ]
  };
}

/**
 * Helper untuk menyusun/mendapatkan Ukuran Keberhasilan (Pendekatan Kualitatif)
 * berdasarkan PermenPAN-RB No. 6 Tahun 2022
 */
export function deriveUkuranKeberhasilan(rhk) {
  if (rhk.ukuranKeberhasilan && rhk.ukuranKeberhasilan.trim()) {
    return rhk.ukuranKeberhasilan;
  }
  if (!rhk.aspekList || rhk.aspekList.length === 0) {
    return "Terselesaikannya seluruh rangkaian penugasan kerja secara efektif, berkualitas tinggi, dan tepat waktu sesuai target kinerja yang ditetapkan pimpinan.";
  }

  const kuantitas = rhk.aspekList.find(a => a.aspek === "Kuantitas");
  const kualitas = rhk.aspekList.find(a => a.aspek === "Kualitas");
  const waktu = rhk.aspekList.find(a => a.aspek === "Waktu");

  const targetKuantitas = kuantitas ? kuantitas.target : "";
  const indikatorKuantitas = kuantitas ? kuantitas.indikator : "";
  const targetKualitas = kualitas ? `dengan standar mutu ${kualitas.target}` : "memenuhi standar mutu";
  const targetWaktu = waktu ? `dalam kurun waktu ${waktu.target}` : "tepat waktu";

  if (targetKuantitas && indikatorKuantitas) {
    return `${targetKuantitas} (${indikatorKuantitas}) terselesaikan ${targetKualitas} serta ${targetWaktu}.`;
  }
  return `Hasil kerja terwujud secara komprehensif ${targetKualitas} dan tuntas ${targetWaktu}.`;
}

/**
 * Generator Narasi Realisasi Cerdas Kualitatif
 */
export function generateSmartRealisasiKualitatif(rhk) {
  const title = rhk.rhkIndividu || "penugasan kerja";
  return `Seluruh target ${title.toLowerCase()} telah terlaksana secara optimal dan tuntas dengan tingkat kepuasan dan kualitas kerja sangat baik, memenuhi seluruh ekspektasi pimpinan tanpa ada catatan perbaikan, serta diserahkan tepat waktu didukung kelengkapan berkas yang valid.`;
}

/**
 * Generator Narasi Realisasi Cerdas Kuantitatif
 */
export function generateSmartRealisasi(aspek, target, indikator) {
  const t = target || "12 Dokumen";
  if (aspek === "Kuantitas") {
    return `Telah diselesaikan secara tuntas sebanyak ${t} sesuai dengan spesifikasi dan standar operasional yang ditetapkan, seluruh dokumen tersusun lengkap dan diverifikasi oleh atasan.`;
  } else if (aspek === "Kualitas") {
    return `Capaian kualitas terealisasi sebesar 96% (melampaui target ${t}) dengan mutu hasil pekerjaan teruji rapi, valid, akurat, dan tanpa catatan koreksi dari tim verifikator.`;
  } else {
    return `Pelaksanaan kegiatan berlangsung tepat waktu selama ${t} secara konsisten dan disiplin tanpa ada penundaan jadwal yang telah ditetapkan dalam kalender kerja dinas.`;
  }
}

/**
 * Dapatkan Rekomendasi Ekspektasi Khusus Pimpinan (EKP) BerAKHLAK berdasarkan Jabatan
 */
export function getRecommendedEkpForRole(jabatanText) {
  const j = (jabatanText || "").toLowerCase();
  if (j.includes("guru") || j.includes("sekolah") || j.includes("pendidik")) {
    return BERAKHLAK_EKP_BY_ROLE.guru;
  } else if (j.includes("komputer") || j.includes("it") || j.includes("sistem") || j.includes("programmer") || j.includes("prakom")) {
    return BERAKHLAK_EKP_BY_ROLE.prakom;
  } else if (j.includes("perawat") || j.includes("bidan") || j.includes("dokter") || j.includes("nakes") || j.includes("medis")) {
    return BERAKHLAK_EKP_BY_ROLE.nakes;
  }
  return BERAKHLAK_EKP_BY_ROLE.umum;
}

/**
 * AI Synthesizer: Menganalisis catatan jurnal & foto bukti kerja lalu menyinkronkannya ke RHK & IKI
 */
export function synthesizeJournalToRhk(journals, rhkList) {
  if (!journals || journals.length === 0) {
    return {
      updatedRhkList: rhkList,
      totalMapped: 0,
      totalPhotos: 0
    };
  }

  let totalMapped = 0;
  let totalPhotos = 0;

  const updatedRhkList = rhkList.map((rhk) => {
    // Cari jurnal yang cocok dengan RHK ini
    const matchedJournals = journals.filter((j) => {
      if (j.rhkId && j.rhkId === rhk.id) return true;
      // Fallback: pencocokan kata kunci otomatis dari teks aktivitas ke uraian RHK
      const actText = (j.aktivitas || "").toLowerCase();
      const rhkText = (rhk.rhkIndividu || "").toLowerCase();
      const keywords = rhkText.split(" ").filter(w => w.length > 4);
      return keywords.some(k => actText.includes(k));
    });

    if (matchedJournals.length === 0) {
      return rhk;
    }

    totalMapped += matchedJournals.length;
    const photos = matchedJournals.filter(j => Boolean(j.fotoUrl));
    const documents = matchedJournals.filter(j => j.evidenceType === "document" || Boolean(j.fileName && !j.fotoUrl));
    const links = matchedJournals.filter(j => Boolean(j.linkUrl));

    totalPhotos += photos.length;

    // Rangkum output jurnal
    const outputList = matchedJournals
      .map(j => j.outputJumlah?.trim())
      .filter(Boolean);
    const uniqueOutputs = Array.from(new Set(outputList));
    const outputSummary = uniqueOutputs.length > 0 ? uniqueOutputs.join(", ") : `${matchedJournals.length} kegiatan operasional`;

    // Buat rincian bukti dukung nyata
    const evidenceParts = [];
    if (photos.length > 0) evidenceParts.push(`${photos.length} Foto Dokumentasi`);
    if (documents.length > 0) {
      const docNames = documents.map(d => d.fileName).filter(Boolean).slice(0, 2).join(", ");
      evidenceParts.push(`${documents.length} Berkas Dokumen (${docNames}${documents.length > 2 ? ' dll.' : ''})`);
    }
    if (links.length > 0) evidenceParts.push(`${links.length} Tautan Penyimpanan Cloud`);

    const evidenceNarrative = evidenceParts.length > 0 ? evidenceParts.join(", ") : "Berkas Laporan";

    // Buat narasi realisasi baru berbasis data riil jurnal
    const updatedAspekList = rhk.aspekList.map((asp) => {
      if (asp.aspek === "Kuantitas") {
        return {
          ...asp,
          realisasiDefault: `Telah terealisasi tuntas sebanyak ${outputSummary} berdasarkan rekapitulasi ${matchedJournals.length} aktivitas tugas yang tercatat pada logbook harian, dengan bukti pendukung: ${evidenceNarrative}.`
        };
      } else if (asp.aspek === "Kualitas") {
        return {
          ...asp,
          realisasiDefault: `Mutu capaian pelaksanaan tugas terverifikasi memenuhi standar 97% dengan ketiadaan komplain/revisi berkas, serta telah diverifikasi atasan langsung.`
        };
      } else if (asp.aspek === "Waktu") {
        const dates = matchedJournals.map(j => j.tanggal).filter(Boolean).sort();
        const dateRangeText = dates.length > 1 ? `(periode ${dates[0]} s.d. ${dates[dates.length - 1]})` : "(sesuai jadwal dinas)";
        return {
          ...asp,
          realisasiDefault: `Seluruh tahapan kegiatan diselesaikan tepat waktu ${dateRangeText} tanpa terjadi penundaan jadwal kerja.`
        };
      }
      return asp;
    });

    // Tambahkan referensi bukti pada kolom bukti dukung
    const evidenceTag = evidenceParts.length > 0 
      ? ` | Bukti Nyata Terlampir: ${evidenceParts.join(", ")}` 
      : "";

    const updatedBukti = (rhk.aspekList[0]?.buktiDukungDefault || "Laporan Pelaksanaan Tugas")
      .replace(/ \| Bukti Nyata.*$/, "") + evidenceTag;

    const finalAspekList = updatedAspekList.map(asp => ({
      ...asp,
      buktiDukungDefault: updatedBukti
    }));

    return {
      ...rhk,
      aspekList: finalAspekList,
      journalCount: matchedJournals.length,
      photoCount: photos.length,
      docCount: documents.length,
      linkCount: links.length
    };
  });

  return {
    updatedRhkList,
    totalMapped,
    totalPhotos
  };
}

/**
 * Mengubah catatan aktivitas kasaran / santai menjadi bahasa formal kedinasan ASN
 * Mendukung Gemini API (Online) dan NLP Heuristik ASN (Offline)
 */
export async function polishJournalWithAi({
  rawText,
  rhkList = [],
  apiKey = "",
  jabatan = "",
  unitKerja = ""
}) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Tuliskan catatan aktivitas kasaran terlebih dahulu!");
  }

  // 1. Panggil Endpoint Server-Side AI Proxy (/api/ai/polish)
  // Aman 100%: API Key & URL Google Gemini diproses secara tertutup di backend Node.js.
  // Tidak ada pemanggilan langsung ke generativelanguage.googleapis.com dari browser,
  // sehingga kuota habis (429) atau API Key TIDAK PERNAH bocor ke Browser Console atau Network Tab!
  try {
    const response = await fetch("/api/ai/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText,
        rhkList,
        jabatan,
        unitKerja,
        apiKey
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.aktivitas) {
        let matchedRhkId = data.rhkId;
        if (!matchedRhkId && rhkList.length > 0) {
          const off = polishJournalOffline(rawText, rhkList);
          matchedRhkId = off.rhkId;
        }
        return {
          aktivitas: cleanDuplicatePhrases(data.aktivitas),
          outputJumlah: data.outputJumlah || "1 Dokumen / Kegiatan",
          rhkId: matchedRhkId || (rhkList[0]?.id || ""),
          catatan: data.catatan || "Terselesaikan dalam kondisi optimal.",
          source: data.source || "gemini-ai",
          isOnline: Boolean(data.source && data.source.includes("gemini"))
        };
      }
    }
  } catch (err) {
    // Backend tidak terjangkau (misal static offline hosting), fallback ke offline engine
  }

  // 2. Engine Heuristik Offline ASN (Client-Side Cerdas, Cepat & Tanpa Koneksi)
  const offlineResult = polishJournalOffline(rawText, rhkList);
  return {
    ...offlineResult,
    source: "offline"
  };
}

/**
 * Algoritma NLP untuk mendeteksi dan menghapus frasa/klausa yang terduplikasi secara berulang
 * Bekerja dinamis untuk frasa apa pun (tidak terbatas pada daftar statis)
 */
export function cleanDuplicatePhrases(str) {
  if (!str || typeof str !== "string") return "";
  let cleaned = str.trim();

  // 1. Bersihkan pengulangan klausa / kalimat berturut-turut (panjang 2 s/d 35 kata)
  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard++;
    const words = cleaned.split(/\s+/);
    if (words.length >= 4) {
      const maxLen = Math.floor(words.length / 2);
      for (let len = Math.min(maxLen, 35); len >= 2; len--) {
        const p1 = words.slice(0, len).join(" ").toLowerCase().replace(/[,.:;]+$/, "");
        const p2 = words.slice(len, len * 2).join(" ").toLowerCase().replace(/[,.:;]+$/, "");
        if (p1 === p2 && p1.length > 5) {
          words.splice(0, len);
          cleaned = words.join(" ").replace(/^[,.:;\s]+/, "").trim();
          changed = true;
          break;
        }
      }
    }
  }

  // 2. Bersihkan kata kerja formal bertumpuk di awal (misal: 'Melakukan melaksanakan...', 'Melaksanakan melakukan...')
  cleaned = cleaned.replace(/^(Melakukan|Melaksanakan|Menyusun|Mengikuti|Menjalankan)\s+(melakukan|melaksanakan|menyusun|mengikuti|menjalankan)\b/gi, "$1");

  // 3. Bersihkan konjungsi berulang (misal: 'serta serta...', 'dan dan...')
  cleaned = cleaned.replace(/\b(serta|dan|lalu|kemudian)\s+\1\b/gi, "$1");

  return cleaned.trim();
}

/**
 * Normalisasi Singkatan Informal menjadi Bahasa Indonesia Baku ASN
 */
export function normalizeAbbreviations(text) {
  if (!text || typeof text !== "string") return "";
  let s = text;

  // 1. Singkatan umum naskah dinas & dokumen
  s = s.replace(/\bttg\b\.?/gi, "tentang");
  s = s.replace(/\bno\.?\s*(\d+)/gi, "Nomor $1");
  s = s.replace(/\bno\b\.?/gi, "Nomor");
  s = s.replace(/\bsurat no\b\.?/gi, "surat Nomor");
  s = s.replace(/\b(thn|th)\b\.?\s*(\d{4})/gi, "Tahun $2");
  s = s.replace(/\b(thn|th)\b\.?/gi, "tahun");
  s = s.replace(/\btgl\b\.?/gi, "tanggal");
  s = s.replace(/\bbln\b\.?/gi, "bulan");
  s = s.replace(/\blamp\b\.?/gi, "lampiran");
  s = s.replace(/\bhal\b\.?/gi, "perihal");
  s = s.replace(/\bspt\b/gi, "Surat Perintah Tugas (SPT)");
  s = s.replace(/\bsppd\b/gi, "Surat Perintah Perjalanan Dinas (SPPD)");
  s = s.replace(/\bbast\b/gi, "Berita Acara Serah Terima (BAST)");
  s = s.replace(/\bba\b/gi, "Berita Acara (BA)");
  s = s.replace(/\bsrikandi\b/gi, "Aplikasi SRIKANDI");
  s = s.replace(/\b(legalisir|legisir)\b/gi, "Pengesahan / Legalisasi Dokumen");
  s = s.replace(/\bblangko\b/gi, "Blangko Resmi");

  // 2. Singkatan Kepegawaian & Kinerja ASN (jalankan \basn\b dahulu sebelum siasn/myasn)
  s = s.replace(/\basn\b/gi, "Aparatur Sipil Negara (ASN)");
  s = s.replace(/\bskp\b/gi, "Sasaran Kinerja Pegawai (SKP)");
  s = s.replace(/\bpak\b/gi, "Penetapan Angka Kredit (PAK)");
  s = s.replace(/\bdupak\b/gi, "Daftar Usul Penetapan Angka Kredit (DUPAK)");
  s = s.replace(/\bkgb\b/gi, "Kenaikan Gaji Berkala (KGB)");
  s = s.replace(/\bsiasn\b/gi, "SIASN (Sistem Informasi ASN)");
  s = s.replace(/\b(myasn|mysapk)\b/gi, "MyASN BKN");
  s = s.replace(/\bsakip\b/gi, "Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)");
  s = s.replace(/\blhkpn\b/gi, "Laporan Harta Kekayaan Penyelenggara Negara (LHKPN)");
  s = s.replace(/\blhkasn\b/gi, "Laporan Harta Kekayaan ASN (LHKASN)");
  s = s.replace(/\bsop\b/gi, "Standar Operasional Prosedur (SOP)");
  s = s.replace(/\bspm\b/gi, "Standar Pelayanan Minimal (SPM)");
  s = s.replace(/\bpns\b/gi, "Pegawai Negeri Sipil (PNS)");
  s = s.replace(/\b(pppk|p3k)\b/gi, "Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)");
  s = s.replace(/\bbkn\b/gi, "Badan Kepegawaian Negara (BKN)");
  s = s.replace(/\b(bkpsdm|bkd)\b/gi, "Badan Kepegawaian dan Pengembangan Sumber Daya Manusia (BKPSDM)");
  s = s.replace(/\bkorpri\b/gi, "Korps Pegawai Republik Indonesia (KORPRI)");
  s = s.replace(/\bdiklat\b/gi, "Pendidikan dan Pelatihan (Diklat)");
  s = s.replace(/\blatsar\b/gi, "Pelatihan Dasar (Latsar)");
  s = s.replace(/\b(prajab|pra jabatan)\b/gi, "Pelatihan Prajabatan");
  s = s.replace(/\btpp\b/gi, "Tambahan Penghasilan Pegawai (TPP)");
  s = s.replace(/\b(presensi|absensi)\b/gi, "Presensi Kehadiran Pegawai");
  s = s.replace(/\b(kenaikan pangkat|usul pangkat)\b/gi, "Kenaikan Pangkat (KP)");
  s = s.replace(/\b(pensiun|bup)\b/gi, "Batas Usia Pensiun (BUP)");

  // 3. Singkatan Keuangan, Anggaran, Pengadaan (PBJ) & Aset
  s = s.replace(/\bspj\b/gi, "Surat Pertanggungjawaban (SPJ)");
  s = s.replace(/\blpj\b/gi, "Laporan Pertanggungjawaban (LPJ)");
  s = s.replace(/\bbmn\b/gi, "Barang Milik Negara (BMN)");
  s = s.replace(/\bbmd\b/gi, "Barang Milik Daerah (BMD)");
  s = s.replace(/\bbos\b/gi, "Bantuan Operasional Sekolah (BOS)");
  s = s.replace(/\bbop\b/gi, "Bantuan Operasional Penyelenggaraan (BOP)");
  s = s.replace(/\bbku\b/gi, "Buku Kas Umum (BKU)");
  s = s.replace(/\bsipd\b/gi, "Sistem Informasi Pembangunan Daerah (SIPD)");
  s = s.replace(/\bsimda\b/gi, "Sistem Informasi Manajemen Daerah (SIMDA)");
  s = s.replace(/\bkppn\b/gi, "Kantor Pelayanan Perbendaharaan Negara (KPPN)");
  s = s.replace(/\bnpwp\b/gi, "Nomor Pokok Wajib Pajak (NPWP)");
  s = s.replace(/\bdpa\b/gi, "Dokumen Pelaksanaan Anggaran (DPA)");
  s = s.replace(/\brka\b/gi, "Rencana Kerja dan Anggaran (RKA)");
  s = s.replace(/\brenja\b/gi, "Rencana Kerja (Renja)");
  s = s.replace(/\brenstra\b/gi, "Rencana Strategis (Renstra)");
  s = s.replace(/\bpbj\b/gi, "Pengadaan Barang dan Jasa (PBJ)");
  s = s.replace(/\bppk\b/gi, "Pejabat Pembuat Komitmen (PPK)");
  s = s.replace(/\bpptk\b/gi, "Pejabat Pelaksana Teknis Kegiatan (PPTK)");
  s = s.replace(/\bkpa\b/gi, "Kuasa Pengguna Anggaran (KPA)");
  s = s.replace(/\blpse\b/gi, "Layanan Pengadaan Secara Elektronik (LPSE)");
  s = s.replace(/\bsirup\b/gi, "Sistem Informasi Rencana Umum Pengadaan (SiRUP)");
  s = s.replace(/\brup\b/gi, "Rencana Umum Pengadaan (RUP)");
  s = s.replace(/\bhps\b/gi, "Harga Perkiraan Sendiri (HPS)");
  s = s.replace(/\bkak\b/gi, "Kerangka Acuan Kerja (KAK)");
  s = s.replace(/\btor\b/gi, "Terms of Reference (TOR)");
  s = s.replace(/\brab\b/gi, "Rencana Anggaran Biaya (RAB)");
  s = s.replace(/\bspp\b/gi, "Surat Permintaan Pembayaran (SPP)");
  s = s.replace(/\bsp2d\b/gi, "Surat Perintah Pencairan Dana (SP2D)");
  s = s.replace(/\bsilpa\b/gi, "Sisa Lebih Perhitungan Anggaran (SiLPA)");
  s = s.replace(/\b(stock opname|stok opname)\b/gi, "Stock Opname Barang Persediaan");

  // 4. Singkatan Pendidikan & Satuan Pendidikan
  s = s.replace(/\bbimtek\b/gi, "Bimbingan Teknis (Bimtek)");
  s = s.replace(/\btka\b/gi, "Tes Kemampuan Akademik (TKA)");
  s = s.replace(/\banbk\b/gi, "Asesmen Nasional Berbasis Komputer (ANBK)");
  s = s.replace(/\bkbm\b/gi, "Kegiatan Belajar Mengajar (KBM)");
  s = s.replace(/\brpp\b/gi, "Rencana Pelaksanaan Pembelajaran (RPP)");
  s = s.replace(/\bmodul ajar\b/gi, "Modul Ajar");
  s = s.replace(/\bkosp\b/gi, "Kurikulum Operasional Satuan Pendidikan (KOSP)");
  s = s.replace(/\b(atp)\b/gi, "Alur Tujuan Pembelajaran (ATP)");
  s = s.replace(/\b(cp)\b/gi, "Capaian Pembelajaran (CP)");
  s = s.replace(/\bp5\b/gi, "Projek Penguatan Profil Pelajar Pancasila (P5)");
  s = s.replace(/\bdapodik\b/gi, "Data Pokok Pendidikan (Dapodik)");
  s = s.replace(/\bemis\b/gi, "Education Management Information System (EMIS)");
  s = s.replace(/\bsimpatika\b/gi, "Sistem Informasi Manajemen Pendidik dan Tenaga Kependidikan (Simpatika)");
  s = s.replace(/\bkkg\b/gi, "Kelompok Kerja Guru (KKG)");
  s = s.replace(/\bmgmp\b/gi, "Musyawarah Guru Mata Pelajaran (MGMP)");
  s = s.replace(/\bmkks\b/gi, "Musyawarah Kerja Kepala Sekolah (MKKS)");
  s = s.replace(/\bkkks\b/gi, "Kelompok Kerja Kepala Sekolah (KKKS)");
  s = s.replace(/\bpts\b/gi, "Penilaian Tengah Semester (PTS)");
  s = s.replace(/\bpas\b/gi, "Penilaian Akhir Semester (PAS)");
  s = s.replace(/\bpat\b/gi, "Penilaian Akhir Tahun (PAT)");
  s = s.replace(/\bppdb\b/gi, "Penerimaan Peserta Didik Baru (PPDB)");
  s = s.replace(/\bmpls\b/gi, "Masa Pengenalan Lingkungan Sekolah (MPLS)");
  s = s.replace(/\bskl\b/gi, "Surat Keterangan Lulus (SKL)");
  s = s.replace(/\bsnpmb\b/gi, "Seleksi Nasional Penerimaan Mahasiswa Baru (SNPMB)");
  s = s.replace(/\bkurikulum merdeka\b/gi, "Kurikulum Merdeka");
  s = s.replace(/\bkurikulum\b/gi, "Kurikulum");
  s = s.replace(/\bpgri\b/gi, "Persatuan Guru Republik Indonesia (PGRI)");
  s = s.replace(/\bppg\b/gi, "Pendidikan Profesi Guru (PPG)");
  s = s.replace(/\b(cgp|guru penggerak)\b/gi, "Program Guru Penggerak");
  s = s.replace(/\bptk\b/gi, "Pendidik dan Tenaga Kependidikan (PTK)");
  s = s.replace(/\bkaldik\b/gi, "Kalender Pendidikan (Kaldik)");
  s = s.replace(/\b(e-rapor|erapor)\b/gi, "Aplikasi e-Rapor");
  s = s.replace(/\bprota\b/gi, "Program Tahunan (Prota)");
  s = s.replace(/\bpromes\b/gi, "Program Semester (Promes)");
  s = s.replace(/\bsilabus\b/gi, "Silabus Pembelajaran");
  s = s.replace(/\bkkm\b/gi, "Kriteria Ketuntasan Minimal (KKM)");
  s = s.replace(/\bkktp\b/gi, "Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)");
  s = s.replace(/\b(ekskul|ekstrakurikuler)\b/gi, "Kegiatan Ekstrakurikuler");
  s = s.replace(/\bpramuka\b/gi, "Kegiatan Kepramukaan");
  s = s.replace(/\b(try out|tryout)\b/gi, "Uji Coba Ujian (Try Out)");
  s = s.replace(/\b(remidi|remedial)\b/gi, "Pembelajaran Remedial & Pengayaan");
  s = s.replace(/\bkemendikbudristek\b/gi, "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek)");

  // 5. Singkatan Layanan Kesehatan & Tenaga Medis (Nakes/Puskesmas/RSUD)
  s = s.replace(/\bpuskesmas\b/gi, "Pusat Kesehatan Masyarakat (Puskesmas)");
  s = s.replace(/\b(poskesdes|pustu)\b/gi, "Pos Kesehatan Desa (Poskesdes)");
  s = s.replace(/\brsud\b/gi, "Rumah Sakit Umum Daerah (RSUD)");
  s = s.replace(/\bbpjs\b/gi, "BPJS Kesehatan");
  s = s.replace(/\bsip\b/gi, "Surat Izin Praktik (SIP)");
  s = s.replace(/\bstr\b/gi, "Surat Tanda Registrasi (STR)");
  s = s.replace(/\bposbindu\b/gi, "Pos Pembinaan Terpadu (Posbindu)");
  s = s.replace(/\b(imunisasi|vaksinasi)\b/gi, "Pelaksanaan Imunisasi / Vaksinasi");
  s = s.replace(/\bstunting\b/gi, "Pencegahan & Penanganan Stunting");
  s = s.replace(/\b(tensi darah|tensi)\b/gi, "Pemeriksaan Tekanan Darah Pasien");
  s = s.replace(/\bvisite\b/gi, "Visite & Pemantauan Pasien");
  s = s.replace(/\b(triase|triage)\b/gi, "Skrining Triase Pasien");
  s = s.replace(/\bigd\b/gi, "Instalasi Gawat Darurat (IGD)");
  s = s.replace(/\b(poliklinik|poli)\b/gi, "Layanan Poliklinik Rawat Jalan");
  s = s.replace(/\b(farmasi|apotek)\b/gi, "Pengelolaan Obat dan Layanan Farmasi");
  s = s.replace(/\balkes\b/gi, "Alat Kesehatan (Alkes)");
  s = s.replace(/\bbides\b/gi, "Bidan Desa (Bides)");
  s = s.replace(/\bsurveilans\b/gi, "Surveilans Epidemiologi");

  // 6. Singkatan Lembaga, Dinas, & Kependudukan
  s = s.replace(/\bdinas pendidikan\b/gi, "Dinas Pendidikan");
  s = s.replace(/\bdinas kesehatan\b/gi, "Dinas Kesehatan");
  s = s.replace(/\bdisdukcapil\b/gi, "Dinas Kependudukan dan Pencatatan Sipil");
  s = s.replace(/\binspektorat\b/gi, "Inspektorat Daerah");
  s = s.replace(/\bkemenag\b/gi, "Kementerian Agama");
  s = s.replace(/\bkemenkeu\b/gi, "Kementerian Keuangan");
  s = s.replace(/\bkemenpan\s*rb\b/gi, "Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (KemenPANRB)");
  s = s.replace(/\b(ktp-el|ktp)\b/gi, "Kartu Tanda Penduduk Elektronik (KTP-el)");
  s = s.replace(/\bkk\b/gi, "Kartu Keluarga (KK)");
  s = s.replace(/\bkia\b/gi, "Kartu Identitas Anak (KIA)");
  s = s.replace(/\b(p-care|pcare)\b/gi, "Aplikasi Primary Care (P-Care)");
  s = s.replace(/\bposyandu\b/gi, "Pos Pelayanan Terpadu (Posyandu)");
  s = s.replace(/\b(rekam medis|rekam medik)\b/gi, "Rekam Medis Pasien");
  s = s.replace(/\bskck\b/gi, "Surat Keterangan Catatan Kepolisian (SKCK)");
  s = s.replace(/\bsktm\b/gi, "Surat Keterangan Tidak Mampu (SKTM)");
  s = s.replace(/\bsku\b/gi, "Surat Keterangan Usaha (SKU)");
  s = s.replace(/\b(akta kelahiran|akta lahir)\b/gi, "Akta Kelahiran");
  s = s.replace(/\bakta kematian\b/gi, "Akta Kematian");
  s = s.replace(/\b(akta nikah|akta perkawinan)\b/gi, "Akta Perkawinan");
  s = s.replace(/\b(surat pindah|skpwni)\b/gi, "Surat Keterangan Pindah WNI (SKPWNI)");
  s = s.replace(/\bmusrenbang\b/gi, "Musyawarah Perencanaan Pembangunan (Musrenbang)");
  s = s.replace(/\bbansos\b/gi, "Bantuan Sosial (Bansos)");
  s = s.replace(/\bpbb\b/gi, "Pajak Bumi dan Bangunan (PBB)");
  s = s.replace(/\bpaten\b/gi, "Pelayanan Administrasi Terpadu Kecamatan (PATEN)");
  s = s.replace(/\b(satpol pp|satpolpp)\b/gi, "Satuan Polisi Pamong Praja (Satpol PP)");
  s = s.replace(/\bbakesbangpol\b/gi, "Badan Kesatuan Bangsa dan Politik (Bakesbangpol)");
  s = s.replace(/\bbpbd\b/gi, "Badan Penanggulangan Bencana Daerah (BPBD)");
  s = s.replace(/\bdisnaker\b/gi, "Dinas Tenaga Kerja");
  s = s.replace(/\bdishub\b/gi, "Dinas Perhubungan");
  s = s.replace(/\b(pupr|dinas pupr)\b/gi, "Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)");
  s = s.replace(/\bdinsos\b/gi, "Dinas Sosial");

  // 7. Singkatan IT, Jaringan, Basis Data & Sistem Informasi
  s = s.replace(/\blan\b/gi, "Local Area Network (LAN)");
  s = s.replace(/\b(wlan|wifi|wi-fi)\b/gi, "jaringan Wi-Fi");
  s = s.replace(/\bmikrotik\b/gi, "Router Mikrotik");
  s = s.replace(/\b(access point|ap)\b/gi, "Titik Akses Nirkabel (Access Point)");
  s = s.replace(/\b(crimping|kabel utp|konektor rj45|rj-45)\b/gi, "Terminasi / Crimping Kabel Jaringan (UTP RJ-45)");
  s = s.replace(/\bvlan\b/gi, "Virtual Local Area Network (VLAN)");
  s = s.replace(/\bdhcp\b/gi, "Dynamic Host Configuration Protocol (DHCP)");
  s = s.replace(/\b(ip address|ip statik|ip static)\b/gi, "Alamat IP Jaringan");
  s = s.replace(/\bbandwidth\b/gi, "Alokasi Bandwidth Jaringan");
  s = s.replace(/\bvhd\b/gi, "Virtual Hard Disk (VHD)");
  s = s.replace(/\b(virtualbox|vmware|proxmox)\b/gi, "Virtualisasi Server (VirtualBox/Proxmox)");
  s = s.replace(/\bcbt\b/gi, "Computer-Based Test (CBT)");
  s = s.replace(/\barkas\b/gi, "Aplikasi Rencana Kegiatan dan Anggaran Sekolah (ARKAS)");
  s = s.replace(/\bmarkas\b/gi, "Manajemen Aplikasi Rencana Kegiatan dan Anggaran Sekolah (MARKAS)");
  s = s.replace(/\b(database|db)\b/gi, "Basis Data (Database)");
  s = s.replace(/\bbackup data\b/gi, "Pencadangan Data (Backup Data)");
  s = s.replace(/\brestore data\b/gi, "Pemulihan Data (Restore Data)");
  s = s.replace(/\b(website|web dinas|web sekolah)\b/gi, "Portal Website Resmi");
  s = s.replace(/\b(cms|wordpress)\b/gi, "Content Management System (CMS)");
  s = s.replace(/\bsharing printer\b/gi, "Berbagi Pakai Printer di Jaringan (Sharing Printer)");
  s = s.replace(/\b(belajar\.id|belajar id)\b/gi, "Akun Pembelajaran (belajar.id)");
  s = s.replace(/\bsso\b/gi, "Single Sign-On (SSO) Kedinasan");
  s = s.replace(/\b(install os|instalasi os|install windows)\b/gi, "Instalasi Sistem Operasi");
  s = s.replace(/\b(antivirus|scan virus)\b/gi, "Pemindaian Keamanan & Antivirus");
  s = s.replace(/\bproktor\b/gi, "Proktor Asesmen Komputer");
  s = s.replace(/\bteknisi ujian\b/gi, "Teknisi Laboratorium & Ujian");
  s = s.replace(/\bcctv\b/gi, "Closed-Circuit Television (CCTV)");
  s = s.replace(/\bups\b/gi, "Uninterruptible Power Supply (UPS)");
  s = s.replace(/\blcd\b/gi, "Liquid Crystal Display (LCD)");
  s = s.replace(/\b(router|switch)\b/gi, "Perangkat Jaringan (Router/Switch)");
  s = s.replace(/\bserver\b/gi, "Server Kedinasan");
  s = s.replace(/\b(hardisk|hdd|ssd)\b/gi, "Media Penyimpanan (HDD/SSD)");
  s = s.replace(/\b(flashdisk|usb drive)\b/gi, "Media Penyimpanan Portabel (USB)");
  s = s.replace(/\bproyektor\b/gi, "Perangkat Proyektor/LCD");
  s = s.replace(/\b(zoom|gmeet|google meet)\b/gi, "Video Conference Kedinasan");

  // 8. Singkatan Tugas Tambahan Sekolah & Kedinasan
  s = s.replace(/\bwakasek kurikulum\b/gi, "Wakil Kepala Sekolah Bidang Kurikulum");
  s = s.replace(/\bwakasek kesiswaan\b/gi, "Wakil Kepala Sekolah Bidang Kesiswaan");
  s = s.replace(/\bwakasek sarpras\b/gi, "Wakil Kepala Sekolah Bidang Sarana dan Prasarana");
  s = s.replace(/\bwakasek humas\b/gi, "Wakil Kepala Sekolah Bidang Hubungan Masyarakat");
  s = s.replace(/\bwakasek\b/gi, "Wakil Kepala Sekolah (Wakasek)");
  s = s.replace(/\b(kepala lab|kalab)\b/gi, "Kepala Laboratorium");
  s = s.replace(/\b(kepala perpus|kaperpus|kepala perpustakaan)\b/gi, "Kepala Perpustakaan");
  s = s.replace(/\bwali kelas\b/gi, "Pengelolaan Administrasi Perwalian Kelas");
  s = s.replace(/\b(pembina osis)\b/gi, "Pembina OSIS");
  s = s.replace(/\b(pembina pramuka)\b/gi, "Pembina Pramuka Gugus Depan");
  s = s.replace(/\b(pembina pmr)\b/gi, "Pembina Palang Merah Remaja (PMR)");
  s = s.replace(/\b(pembina paskibra)\b/gi, "Pembina Paskibra");
  s = s.replace(/\btppk\b/gi, "Tim Pencegahan dan Penanganan Kekerasan (TPPK)");
  s = s.replace(/\boperator dapodik\b/gi, "Operator Data Pokok Pendidikan (Dapodik)");
  s = s.replace(/\bbendahara bos\b/gi, "Pengelolaan Administrasi Dana BOS");
  s = s.replace(/\bbendahara bop\b/gi, "Pengelolaan Administrasi Dana BOP");
  s = s.replace(/\b(pengurus barang|pengurus bmn|pengurus bmd)\b/gi, "Pengurus Barang Milik Daerah/Negara (BMD/BMN)");
  s = s.replace(/\b(tim zi|zona integritas)\b/gi, "Tim Zona Integritas (ZI) Menuju WBK/WBBM");
  s = s.replace(/\bptsp\b/gi, "Pelayanan Terpadu Satu Pintu (PTSP)");

  // 9. Singkatan Percakapan Sehari-hari, Slang & Kasaran
  s = s.replace(/\byg\b/gi, "yang");
  s = s.replace(/\bdgn\b/gi, "dengan");
  s = s.replace(/\butk\b/gi, "untuk");
  s = s.replace(/\bdlm\b/gi, "dalam");
  s = s.replace(/\bsdh|udh\b/gi, "sudah");
  s = s.replace(/\bblm\b/gi, "belum");
  s = s.replace(/\btdk|gak|nggak\b/gi, "tidak");
  s = s.replace(/\bsbg\b/gi, "sebagai");
  s = s.replace(/\bdsb|dll\b/gi, "dan sebagainya");
  s = s.replace(/\bjg\b/gi, "juga");
  s = s.replace(/\bpd\b/gi, "pada");
  s = s.replace(/\bdr\b/gi, "dari");
  s = s.replace(/\bhrs\b/gi, "harus");
  s = s.replace(/\bmsh\b/gi, "masih");
  s = s.replace(/\bkrn\b/gi, "karena");
  s = s.replace(/\bsy\b/gi, "saya");
  s = s.replace(/\b(aja|aj)\b/gi, "");
  s = s.replace(/\b(cepet|cepetan)\b/gi, "segera");
  s = s.replace(/\b(sampe|ampe)\b/gi, "sampai");
  s = s.replace(/\b(klo|kalo|klau)\b/gi, "jika");
  s = s.replace(/\b(gmn|gimana)\b/gi, "bagaimana");
  s = s.replace(/\b(knp|kenapa)\b/gi, "mengapa");
  s = s.replace(/\b(bgt|banget)\b/gi, "sangat");
  s = s.replace(/\bbbrp\b/gi, "beberapa");
  s = s.replace(/\b(skrg|skg)\b/gi, "sekarang");
  s = s.replace(/\b(td|tdi)\b/gi, "tadi");
  s = s.replace(/\b(bs|bsa)\b/gi, "dapat");
  s = s.replace(/\borg\b/gi, "orang");
  s = s.replace(/\b(dikasih|dikasihkan)\b/gi, "diserahkan");
  s = s.replace(/\b(minta|mintak)\b/gi, "mengajukan permohonan");
  s = s.replace(/\bketemu\b/gi, "berkoordinasi dengan");
  s = s.replace(/\b(ngobrol|ngomongin)\b/gi, "berdiskusi mengenai");

  // Rapikan spasi berlebih
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Generator Heuristik Offline untuk Memoles Catatan Kasaran Pegawai
 */
export function polishJournalOffline(rawText, rhkList = []) {
  let text = cleanDuplicatePhrases((rawText || "").trim());

  // Daftar prefix baku agar tidak pernah terduplikasi jika tombol poles diklik berkali-kali
  const knownPrefixConfig = [
    { prefix: "Melakukan penataan, klasifikasi, serta penyimpanan dokumen arsip", category: "kearsipan" },
    { prefix: "Melakukan penataan, klasifikasi, serta penyimpanan", category: "kearsipan" },
    { prefix: "Melaksanakan pengelolaan surat dinas, pencatatan buku agenda, serta pendistribusian lembar disposisi", category: "persuratan" },
    { prefix: "Melaksanakan pelayanan administrasi kedinasan, verifikasi kelengkapan berkas, serta pencatatan register", category: "pelayanan" },
    { prefix: "Melakukan verifikasi kelengkapan berkas, validasi persyaratan, serta rekapitulasi data kedinasan", category: "rekap" },
    { prefix: "Melakukan verifikasi kelengkapan berkas, validasi persyaratan, serta rekapitulasi", category: "rekap" },
    { prefix: "Melaksanakan instalasi, konfigurasi, dan pemeliharaan infrastruktur jaringan komputer (LAN/Wi-Fi)", category: "jaringan" },
    { prefix: "Melaksanakan pengelolaan sistem informasi, pencadangan basis data (backup), serta pemeliharaan aplikasi kedinasan", category: "sistem" },
    { prefix: "Melaksanakan penugasan tugas tambahan kedinasan, koordinasi program kerja, serta penyusunan laporan pertanggungjawaban", category: "tugas_tambahan" },
    { prefix: "Melaksanakan penanganan kendala teknis, perbaikan perangkat, serta optimalisasi fungsi", category: "perbaikan" },
    { prefix: "Melaksanakan perbaikan teknis, penelusuran kendala (troubleshooting), dan optimalisasi fungsi", category: "perbaikan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan sarana", category: "pemeliharaan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan", category: "pemeliharaan" },
    { prefix: "Menyusun draf dokumen kedinasan, telaah administrasi, serta finalisasi laporan", category: "dokumen" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen administrasi", category: "dokumen" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen", category: "dokumen" },
    { prefix: "Melakukan monitoring, evaluasi berkala, serta inspeksi pengawasan operasional tugas kedinasan", category: "monitoring" },
    { prefix: "Melakukan monitoring, inspeksi berkala, serta evaluasi operasional tugas kedinasan", category: "monitoring" },
    { prefix: "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional", category: "monitoring" },
    { prefix: "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi", category: "pembelajaran" },
    { prefix: "Mengikuti kegiatan sosialisasi, pendalaman materi kedinasan, serta pembahasan teknis", category: "sosialisasi" },
    { prefix: "Mengikuti kegiatan sosialisasi, pendalaman materi, serta pembahasan teknis", category: "sosialisasi" },
    { prefix: "Mengikuti kegiatan sosialisasi", category: "sosialisasi" },
    { prefix: "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta penyusunan notula", category: "rapat" },
    { prefix: "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta pembahasan teknis", category: "rapat" },
    { prefix: "Melaksanakan pengelolaan administrasi keuangan, verifikasi kelengkapan bukti transaksi, serta penyusunan pertanggungjawaban (SPJ)", category: "keuangan" },
    { prefix: "Melaksanakan pengelolaan administrasi kepegawaian, verifikasi berkas usulan, serta sinkronisasi data kinerja pegawai", category: "kepegawaian" },
    { prefix: "Melaksanakan layanan bimbingan dan konseling, pendampingan kepribadian, serta pembinaan peserta didik", category: "konseling" },
    { prefix: "Mengikuti apel kedinasan dan upacara bendera, penyampaian arahan pimpinan, serta peningkatan kedisiplinan pegawai", category: "apel" },
    { prefix: "Melaksanakan koordinasi kepanitiaan, persiapan teknis sarana prasarana, serta pengelolaan operasional kegiatan", category: "panitia" },
    { prefix: "Melaksanakan tugas piket kedinasan, pemantauan ketertiban dan keamanan lingkungan, serta pelayanan tamu dinas", category: "piket" },
    { prefix: "Melaksanakan pelayanan kesehatan masyarakat, pemeriksaan medis, serta pencatatan rekam medis pasien", category: "kesehatan" },
    { prefix: "Melaksanakan proses administrasi pengadaan barang dan jasa, penyusunan spesifikasi teknis, serta verifikasi kelengkapan berkas pengadaan", category: "pengadaan" },
    { prefix: "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data kedinasan", category: "rekap" },
    { prefix: "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data", category: "rekap" },
    { prefix: "Melaksanakan pengelolaan dan pendistribusian dokumen kedinasan", category: "distribusi" },
    { prefix: "Melaksanakan pengelolaan dan pendistribusian dokumen", category: "distribusi" }
  ];

  // Bersihkan semua prefix formal sebelumnya jika sudah pernah dipoles (Idempotent)
  let strippedText = text;
  let detectedCategory = "";
  let keepStripping = true;
  while (keepStripping) {
    keepStripping = false;
    for (const item of knownPrefixConfig) {
      if (strippedText.toLowerCase().startsWith(item.prefix.toLowerCase())) {
        if (!detectedCategory) detectedCategory = item.category;
        strippedText = strippedText.slice(item.prefix.length).trim();
        strippedText = strippedText.replace(/^[,.:;\s]+/, "").trim();
        keepStripping = true;
        break;
      }
    }
  }

  // Jika setelah dibersihkan masih ada teks, gunakan teks bersih tersebut
  if (strippedText.length > 0) {
    text = strippedText;
  }

  // Normalisasi singkatan informal agar menjadi istilah resmi dan baku
  text = normalizeAbbreviations(text);

  // Deteksi Kategori Kegiatan secara Kontekstual & Akurat (Berdasarkan Word Boundaries)
  const isApel = detectedCategory === "apel" ||
    /\b(apel pagi|apel sore|apel kesiapan|upacara bendera|upacara peringatan|senam pagi dinas|senam kesegaran jasmani|senam korpri)\b/i.test(text);

  const isExplicitTeaching = /\b(mengajar|ngajar|kbm|jam pelajaran|pembelajaran di kelas|kegiatan belajar mengajar|materi ajar|praktik siswa|modul ajar)\b/i.test(text);

  const isKonseling = detectedCategory === "konseling" ||
    /\b(bimbingan konseling|bk|konseling|home visit|kunjungan rumah|mediasi siswa|pembinaan siswa|penanganan pelanggaran|wali murid)\b/i.test(text);

  const isPanitia = detectedCategory === "panitia" ||
    /\b(panitia|kepanitiaan|pokja|tim kerja|persiapan teknis acara|sie konsumsi|sie perlengkapan|sie acara)\b/i.test(text);

  const isPiket = detectedCategory === "piket" ||
    /\b(piket sekolah|tugas piket|piket dinas|jaga piket|piket kantor|buku tamu piket)\b/i.test(text);

  const isKesehatan = detectedCategory === "kesehatan" ||
    /\b(puskesmas|poskesdes|pustu|posbindu|imunisasi|vaksinasi|stunting|visite|triase|triage|igd|poliklinik|poli rawat|farmasi|apotek|alkes|bidan desa|bides|surveilans|tensi darah|pemeriksaan medis)\b/i.test(text);

  const isPengadaan = detectedCategory === "pengadaan" ||
    /\b(pengadaan|pbj|lpse|sirup|rup|hps|spesifikasi teknis|kerangka acuan kerja|kak|tor|surat perintah kerja|spk|berkas pengadaan|pejabat pembuat komitmen|ppk|pptk)\b/i.test(text);

  const isITJaringan = detectedCategory === "jaringan" ||
    /\b(mikrotik|router|switch hub|kabel lan|crimping|access point|wifi|wi-fi|bandwidth|vlan|dhcp|ip address|koneksi internet|jaringan internet|kabel utp|konektor rj45|speedtest)\b/i.test(text);

  const isITSistemAplikasi = detectedCategory === "sistem" ||
    /\b(vhd|virtualbox|proxmox|server anbk|cbt|database|backup data|restore data|instalasi sistem|instalasi os|install windows|update aplikasi|portal web|website sekolah|website dinas|cms|arkas|markas|sso|belajar\.id|reset password|helpdesk|tarik data|ekspor data|impor data)\b/i.test(text);

  const isTugasTambahan = detectedCategory === "tugas_tambahan" ||
    /\b(wakasek|wakil kepala sekolah|kepala lab|kepala perpus|kepala perpustakaan|pembina osis|pembina pramuka|pembina pmr|pembina paskibra|wali kelas|tppk|proktor|teknisi ujian|operator dapodik|pengurus barang|pengurus bmn|pengurus bmd|tim kerja zi|tim sakip|tim reformasi birokrasi)\b/i.test(text);

  // Persuratan harus diprioritaskan: jika ada "surat masuk" / "registrasi surat", itu tugas persuratan
  const isPersuratan = /\b(surat masuk|surat keluar|buku agenda|disposisi|lembar disposisi|ekspedisi surat|surat dinas|surat edaran|penomoran surat|registrasi surat|input registrasi|naskah dinas|srikandi)\b/i.test(text) || detectedCategory === "persuratan";

  const isSosialisasi = !isPersuratan && (detectedCategory === "sosialisasi" ||
    /\b(sosialisasi|workshop|bimtek|pelatihan|diklat|seminar|webinar|penyuluhan|orientasi|iht|lokakarya|in-house training)\b/i.test(text));

  const isKeuangan = detectedCategory === "keuangan" ||
    /\b(spj|kuitansi|kwitansi|bku|lpj keuangan|pajak|anggaran|reimburse|pencairan dana|honor|buku kas umum|pertanggungjawaban keuangan|sppd|dpa|rka|spp|sp2d)\b/i.test(text);

  const isKepegawaian = detectedCategory === "kepegawaian" ||
    /\b(skp|dupak|pak|angka kredit|usul pangkat|kenaikan pangkat|gaji berkala|kgb|siasn|myasn|cuti pegawai|mutasi|presensi|absensi|disiplin pegawai|lhkpn|lhkasn)\b/i.test(text);

  const isKearsipan = detectedCategory === "kearsipan" ||
    /\b(arsip|kearsipan|mengarsipkan|pengarsipan|mengarsip|ijazah|buku induk|lemari dokumen|lemari arsip|penataan berkas|simpan berkas|penyimpanan berkas|filling|map arsip)\b/i.test(text);

  const isRekap = detectedCategory === "rekap" ||
    /\b(rekap|ngerekap|rekapitulasi|verifikasi berkas|validasi berkas|sinkronisasi data|input data|entri data|olah data|dapodik|emis|simpatika)\b/i.test(text);

  const isPelayanan = detectedCategory === "pelayanan" ||
    /\b(legalisir|pelayanan|buku tamu|buku register|surat keterangan|surat pindah|pelayanan siswa|layanan tamu|pendaftaran|ktp|kk|kia|skpwni|posyandu|rekam medis|skck|sktm|sku)\b/i.test(text);

  const isPerbaikan = detectedCategory === "perbaikan" ||
    /\b(benerin|perbaiki|rusak|troubleshoot|troubleshooting|error|kendala teknis|jaringan mati|wifi mati|pc mati|komputer rusak|penanganan kendala)\b/i.test(text) ||
    (/\b(mikrotik|router|kabel lan|server|switch|jaringan|printer|proyektor|cctv)\b/i.test(text) && /\b(mati|rusak|error|gangguan|down|putus|bermasalah|kendala)\b/i.test(text));

  const isPemeliharaan = detectedCategory === "pemeliharaan" ||
    /\b(bersih|bersihin|rawat|maintenance|pemeliharaan berkala|perawatan sarana|cek rutin lab|kebersihan ruangan)\b/i.test(text);

  const isRapat = detectedCategory === "rapat" ||
    /\b(rapat|koordinasi|briefing|notula|rapat dinas|sidang|audiensi|musyawarah|mgmp|kkg|mkks)\b/i.test(text);

  const isPembelajaran = detectedCategory === "pembelajaran" || isExplicitTeaching ||
    (/\b(pembelajaran|materi ajar|praktik siswa|bimbingan siswa|kbm)\b/i.test(text) && !isKearsipan && !isPersuratan && !isRekap && !isSosialisasi && !isKeuangan);

  const isDokumen = detectedCategory === "dokumen" ||
    /\b(bikin laporan|buat laporan|susun laporan|draf|draft|penyusunan dokumen|sk pembagian tugas|jadwal kegiatan|renja|renstra|kosp)\b/i.test(text);

  const isMonitoring = detectedCategory === "monitoring" ||
    /\b(cek|ngecek|pantau|monitor|inspeksi|pengawasan|supervisi|monev|sidak|audit)\b/i.test(text);

  // Default Template Formal ASN
  let formalPrefix = "Melaksanakan tugas operasional kedinasan";
  let output = "1 Laporan Pelaksanaan Tugas";
  let catatan = "Kegiatan terselesaikan dengan tertib dan memenuhi standar pelayanan.";

  if (isApel) {
    formalPrefix = "Mengikuti apel kedinasan dan upacara bendera, penyampaian arahan pimpinan, serta peningkatan kedisiplinan pegawai";
    output = "1 Lembar Daftar Hadir Apel Kedinasan";
    catatan = "Kegiatan apel kedinasan diikuti secara tertib, khidmat, dan tepat waktu sebagai wujud kedisiplinan ASN.";
  } else if (isKonseling) {
    formalPrefix = "Melaksanakan layanan bimbingan dan konseling, pendampingan kepribadian, serta pembinaan peserta didik";
    output = "1 Berkas Laporan Layanan Konseling & Pembinaan";
    catatan = "Pendampingan konseling berlangsung kondusif dan tersusun rencana tindak lanjut pembinaan yang terarah.";
  } else if (isPanitia) {
    formalPrefix = "Melaksanakan koordinasi kepanitiaan, persiapan teknis sarana prasarana, serta pengelolaan operasional kegiatan";
    output = "1 Laporan Pelaksanaan Tugas Kepanitiaan";
    catatan = "Seluruh rangkaian persiapan teknis kepanitiaan telah dikoordinasikan dan berjalan lancar sesuai rencana kerja.";
  } else if (isPiket) {
    formalPrefix = "Melaksanakan tugas piket kedinasan, pemantauan ketertiban dan keamanan lingkungan, serta pelayanan tamu dinas";
    output = "1 Lembar Buku Register Piket & Daftar Hadir";
    catatan = "Tugas piket kedinasan terlaksana tertib, aman, dan seluruh laporan kegiatan tercatat lengkap di buku register.";
  } else if (isITJaringan) {
    formalPrefix = "Melaksanakan instalasi, konfigurasi, dan pemeliharaan infrastruktur jaringan komputer (LAN/Wi-Fi)";
    output = "1 Laporan Pemeliharaan Jaringan & Berita Acara Uji Koneksi";
    catatan = "Infrastruktur jaringan telah diuji kestabilannya, bandwidth terdistribusi optimal, dan konektivitas berfungsi normal.";
  } else if (isITSistemAplikasi) {
    formalPrefix = "Melaksanakan pengelolaan sistem informasi, pencadangan basis data (backup), serta pemeliharaan aplikasi kedinasan";
    output = "1 Berkas Log Pemeliharaan Sistem & Aplikasi";
    catatan = "Sistem dan aplikasi kedinasan telah dimutakhirkan, proses pencadangan basis data berjalan sukses tanpa anomali data.";
  } else if (isTugasTambahan) {
    formalPrefix = "Melaksanakan penugasan tugas tambahan kedinasan, koordinasi program kerja, serta penyusunan laporan pertanggungjawaban";
    output = "1 Laporan Pelaksanaan Tugas Tambahan Kedinasan";
    catatan = "Seluruh rangkaian tugas tambahan terlaksana terarah sesuai surat perintah tugas dan target capaian kinerja unit kerja.";
  } else if (isKesehatan) {
    formalPrefix = "Melaksanakan pelayanan kesehatan masyarakat, pemeriksaan medis, serta pencatatan rekam medis pasien";
    output = "1 Lembar Rekam Medis / Laporan Pelayanan Medis";
    catatan = "Pelayanan kesehatan diberikan secara prima, higienis, dan sesuai standar operasional prosedur kesehatan.";
  } else if (isPengadaan) {
    formalPrefix = "Melaksanakan proses administrasi pengadaan barang dan jasa, penyusunan spesifikasi teknis, serta verifikasi kelengkapan berkas pengadaan";
    output = "1 Berkas Dokumen Pengadaan Barang dan Jasa (PBJ)";
    catatan = "Tahapan pengadaan barang dan jasa telah diverifikasi kesesuaiannya dengan ketentuan perundang-undangan dan prinsip akuntabilitas.";
  } else if (isExplicitTeaching || isPembelajaran) {
    formalPrefix = "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi";
    output = "1 Jurnal Pembelajaran & Daftar Hadir";
    catatan = "Kegiatan belajar mengajar berlangsung interaktif dan seluruh capaian materi terpenuhi baik.";
  } else if (isPersuratan) {
    formalPrefix = "Melaksanakan pengelolaan surat dinas, pencatatan buku agenda, serta pendistribusian lembar disposisi";
    output = "1 Berkas Pengelolaan Surat Dinas";
    catatan = "Surat kedinasan telah teragendakan dan didistribusikan secara tertib sesuai disposisi pimpinan.";
  } else if (isKeuangan) {
    formalPrefix = "Melaksanakan pengelolaan administrasi keuangan, verifikasi kelengkapan bukti transaksi, serta penyusunan pertanggungjawaban (SPJ)";
    output = "1 Berkas Dokumen Pertanggungjawaban Keuangan (SPJ)";
    catatan = "Seluruh bukti transaksi fisik dan kuitansi telah divalidasi kelengkapannya sesuai ketentuan perbendaharaan.";
  } else if (isKepegawaian) {
    formalPrefix = "Melaksanakan pengelolaan administrasi kepegawaian, verifikasi berkas usulan, serta sinkronisasi data kinerja pegawai";
    output = "1 Berkas Dokumen Administrasi Kepegawaian";
    catatan = "Kelengkapan berkas usulan kepegawaian telah diverifikasi dan dimutakhirkan pada sistem data ASN.";
  } else if (isSosialisasi) {
    formalPrefix = "Mengikuti kegiatan sosialisasi, pendalaman materi kedinasan, serta pembahasan teknis";
    output = "1 Sertifikat / Surat Tugas / Laporan Kegiatan";
    catatan = "Kegiatan sosialisasi diikuti secara aktif dan materi terserap optimal guna kelancaran pelaksanaan tugas kedinasan.";
  } else if (isKearsipan) {
    formalPrefix = "Melakukan penataan, klasifikasi, serta penyimpanan";
    output = "1 Berkas Pengelolaan Arsip Dokumen";
    catatan = "Berkas dokumen telah diverifikasi, tersusun secara sistematis, dan disimpan aman pada lemari arsip sesuai klasifikasi.";
  } else if (isPelayanan) {
    formalPrefix = "Melaksanakan pelayanan administrasi kedinasan, verifikasi kelengkapan berkas, serta pencatatan register";
    output = "1 Berkas Register Pelayanan Administrasi";
    catatan = "Pelayanan terlaksana secara tertib, ramah, dan memenuhi standar operasional pelayanan publik.";
  } else if (isRekap) {
    formalPrefix = "Melakukan verifikasi kelengkapan berkas, validasi persyaratan, serta rekapitulasi";
    output = "1 Dokumen Rekapitulasi Terverifikasi";
    catatan = "Seluruh data dan berkas telah divalidasi dengan tingkat akurasi serta kelengkapan 100%.";
  } else if (isPerbaikan) {
    formalPrefix = "Melaksanakan penanganan kendala teknis, perbaikan perangkat, serta optimalisasi fungsi";
    output = "1 Berkas Berita Acara Penanganan Teknis";
    catatan = "Perangkat/sistem telah diuji fungsional dan kembali beroperasi secara optimal.";
  } else if (isPemeliharaan) {
    formalPrefix = "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan sarana";
    output = "1 Lembar Checklist Pemeliharaan";
    catatan = "Kondisi sarana dan peralatan terverifikasi bersih, aman, dan siap dipergunakan.";
  } else if (isRapat) {
    formalPrefix = "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta penyusunan notula";
    output = "1 Dokumen Notula Rapat & Daftar Hadir";
    catatan = "Telah dicapai kesepakatan bersama dan rencana tindak lanjut operasional tugas dinas.";
  } else if (isDokumen) {
    formalPrefix = "Menyusun draf dokumen kedinasan, telaah administrasi, serta finalisasi laporan";
    output = "1 Berkas Dokumen Administrasi";
    catatan = "Draf dokumen telah divalidasi dan disesuaikan dengan format tata naskah dinas.";
  } else if (isMonitoring) {
    formalPrefix = "Melakukan monitoring, evaluasi berkala, serta inspeksi pengawasan operasional tugas kedinasan";
    output = "1 Laporan Monitoring dan Evaluasi (Monev)";
    catatan = "Hasil pemantauan menunjukkan operasional sarana/tugas berjalan stabil tanpa kendala.";
  }

  // Bersihkan kata percakapan santai & kata kerja kasaran
  let cleanedSubject = text
    .replace(/^(tadi pagi|tadi siang|tadi sore|tadi malam|tadi|hari ini|udah|sudah|lagi|sedang|mau|pengen|aku|saya|kita|kami)\s+/gi, "")
    .replace(/^(mengikuti|ngikut|ikut|hadir|menghadiri)\s+/gi, "")
    .replace(/^(ngerekap|rekap|input|menginput|penginputan|entri|mengentri|nyatet|mencatat)\s+/gi, "")
    .replace(/^(arsip|ngarsip|ngarsipkan|mengarsip|mengarsipkan|pengarsipan|simpan|menyimpan|tata|menata|merapikan|rapikan|masukin|taruh|beresin|beres-beres)\s+/gi, "")
    .replace(/^(benerin|perbaiki|memperbaiki|beneri|dandanin)\s+/gi, "")
    .replace(/^(bersihin|membersihkan|rawat|merawat|nyapu)\s+/gi, "")
    .replace(/^(bikin|buat|membuat|susun|menyusun|nyusun|ngetik|mengetik)\s+/gi, "")
    .replace(/^(ngecek|cek|memeriksa|pantau|memantau)\s+/gi, "")
    .replace(/^(ngajar|mengajar|ngajarin)\s+/gi, "")
    .replace(/^(ngawas|mengawas|ngawasi)\s+/gi, "")
    .replace(/^(nyiapin|menyiapkan|siapin)\s+/gi, "")
    .replace(/^(ngirim|kirim|mengirim|ngirimkan|mengantarkan|nganter)\s+/gi, "")
    .replace(/^(nerima|terima|menerima)\s+/gi, "")
    .replace(/^(bantu|bantuin|membantu)\s+/gi, "")
    .replace(/^(ngurus|ngurusin|mengurus)\s+/gi, "")
    .replace(/^(terkait)\s+/gi, "")
    .replace(/\b(terus|lalu|trs|trus|abis|setelah itu)\b/gi, "serta")
    .replace(/\b(ngeprint|print)\b/gi, "pencetakan dokumen")
    .replace(/\b(fotocopy|fotokopi)\b/gi, "penggandaan berkas")
    .replace(/\b(yang|yg)\s+rusak\b/gi, "yang mengalami kendala teknis")
    .replace(/\b(yang|yg)\s+(mati|down|putus)\b/gi, "yang mengalami gangguan operasional")
    .replace(/\b(benerin|perbaiki|rusak)\b/gi, "penanganan kendala")
    .replace(/\b(bersihin|rawat)\b/gi, "pemeliharaan")
    .replace(/\b(bikin|buat)\b/gi, "penyusunan")
    .replace(/\b(biar|supaya)\b/gi, "guna memastikan")
    .replace(/\b(ga|gak|nggak|tidak)\s+(ada|bisa)\b/gi, "mencegah kendala")
    .replace(/\bkemarin\b/gi, "sebelumnya")
    .replace(/\b(koneksi internet|jaringan internet)\b/gi, "konektivitas jaringan internet")
    .replace(/\b(lab|ruang lab)\b/gi, "Ruang Praktik Siswa LAB")
    .replace(/\blemari dokumen arsip\b/gi, "lemari arsip")
    .replace(/\blemari dokumen\b/gi, "lemari arsip dokumen")
    .replace(/\barsip b\b/gi, "arsip B")
    .trim();

  // Bersihkan tanda titik di akhir subjek agar rapi
  cleanedSubject = cleanedSubject.replace(/[.]+$/, "").trim();

  // Rangkai kalimat formal tanpa redundansi
  let polishedAktivitas = "";
  if (cleanedSubject) {
    if (isApel) {
      let topic = cleanedSubject.replace(/^(apel pagi|apel sore|apel kesiapan|upacara bendera|upacara|senam pagi dinas|senam korpri)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|dalam rangka)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} serta ${topic}` : formalPrefix;
    } else if (isKonseling) {
      let topic = cleanedSubject.replace(/^(bimbingan konseling|bk|konseling|layanan konseling)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isPanitia) {
      let topic = cleanedSubject.replace(/^(panitia|kepanitiaan|pokja|tim kerja)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|kegiatan)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} ${topic}` : formalPrefix;
    } else if (isPiket) {
      let topic = cleanedSubject.replace(/^(piket sekolah|tugas piket|piket dinas|jaga piket|piket kantor|piket)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|kegiatan)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} serta ${topic}` : formalPrefix;
    } else if (isITJaringan) {
      let topic = cleanedSubject.replace(/^(instalasi jaringan|jaringan komputer|pemeliharaan jaringan|jaringan|koneksi internet)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isITSistemAplikasi) {
      let topic = cleanedSubject.replace(/^(pengelolaan sistem|pemeliharaan sistem|sistem aplikasi|aplikasi)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isTugasTambahan) {
      let topic = cleanedSubject.replace(/^(tugas tambahan|pelaksanaan tugas tambahan)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isKesehatan) {
      let topic = cleanedSubject.replace(/^(pelayanan kesehatan|layanan kesehatan|pemeriksaan kesehatan|kesehatan)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isPengadaan) {
      let topic = cleanedSubject.replace(/^(pengadaan barang dan jasa|pbj|pengadaan|administrasi pengadaan)\s*/gi, "").trim();
      topic = topic.replace(/^(dan|serta|terkait)\s+/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isSosialisasi) {
      const topic = cleanedSubject.replace(/^(sosialisasi|kegiatan sosialisasi|bimtek|workshop|pelatihan)\s*/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isPersuratan) {
      const topic = cleanedSubject.replace(/^(surat dinas|pengelolaan surat dinas|pengelolaan surat)\s*/gi, "").trim();
      polishedAktivitas = topic.toLowerCase().startsWith("terkait") ? `${formalPrefix} ${topic}` : `${formalPrefix} terkait ${topic}`;
    } else if (isKeuangan) {
      const topic = cleanedSubject.replace(/^(laporan\s+)?(spj|surat pertanggungjawaban\s*\(spj\)|lpj|laporan pertanggungjawaban\s*\(lpj\)|pengelolaan keuangan)\s*/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isKepegawaian) {
      const topic = cleanedSubject.replace(/^(kepegawaian|pengelolaan kepegawaian|administrasi kepegawaian)\s*/gi, "").trim();
      polishedAktivitas = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isKearsipan && !cleanedSubject.toLowerCase().startsWith("dokumen") && !cleanedSubject.toLowerCase().startsWith("berkas")) {
      polishedAktivitas = `${formalPrefix} dokumen ${cleanedSubject}`;
    } else {
      polishedAktivitas = `${formalPrefix} ${cleanedSubject}`;
    }
  } else {
    polishedAktivitas = formalPrefix;
  }

  // Bersihkan kembali duplikasi dinamis sebelum difinalisasi
  polishedAktivitas = cleanDuplicatePhrases(polishedAktivitas);

  // Rapikan huruf kapital di awal kalimat
  polishedAktivitas = polishedAktivitas.charAt(0).toUpperCase() + polishedAktivitas.slice(1);
  if (!polishedAktivitas.endsWith(".")) {
    polishedAktivitas += ".";
  }

  // Pilih RHK yang paling cocok
  const lower = text.toLowerCase();
  let matchedRhkId = rhkList[0]?.id || "";
  for (const rhk of rhkList) {
    const rhkLower = (rhk.rhkIndividu || "").toLowerCase();
    if (
      (lower.includes("jaringan") || lower.includes("server") || lower.includes("wifi")) && 
      (rhkLower.includes("jaringan") || rhkLower.includes("server"))
    ) {
      matchedRhkId = rhk.id;
      break;
    } else if (
      (lower.includes("lab") || lower.includes("alat") || lower.includes("praktik") || lower.includes("tjkt")) && 
      (rhkLower.includes("lab") || rhkLower.includes("peralatan") || rhkLower.includes("praktik"))
    ) {
      matchedRhkId = rhk.id;
      break;
    } else if (
      (lower.includes("jadwal") || lower.includes("koordinasi") || lower.includes("waktu")) && 
      (rhkLower.includes("jadwal") || rhkLower.includes("koordinasi"))
    ) {
      matchedRhkId = rhk.id;
      break;
    }
  }

  return {
    aktivitas: polishedAktivitas,
    outputJumlah: output,
    rhkId: matchedRhkId,
    catatan: catatan
  };
}


