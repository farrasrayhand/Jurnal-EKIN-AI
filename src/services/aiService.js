// AI Service untuk Generasi SKP, RHK, IKI, Bukti Dukung & Realisasi
// Mendukung Mode Cerdas Offline (Built-in NLP Heuristics) & Mode Online (Google Gemini API)

import { ASN_PRESETS, BERAKHLAK_EKP_BY_ROLE } from "../data/presetTemplates";

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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal memanggil Gemini API (Status ${response.status})`);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Tidak ada respon teks dari Gemini AI.");
  }

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
    intervensiPimpinan: parsed.intervensiPimpinan || "Meningkatnya kinerja dan akuntabilitas unit kerja",
    rhkList: formattedRhkList
  };
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

  // Jika ada API Key, gunakan Gemini untuk kecerdasan maksimal
  if (apiKey) {
    try {
      const rhkOptions = rhkList.map((r, i) => `ID: "${r.id}" | RHK: "${r.rhkIndividu}"`).join("\n");
      const prompt = `
Anda adalah asisten cerdas ASN Kementerian PANRB & BKN.
Tugas Anda: Mengubah catatan aktivitas harian kasaran / santai seorang ASN menjadi bahasa laporan kedinasan yang formal, baku, dan terukur sesuai standar e-Kinerja PermenPAN-RB No. 6 Tahun 2022.

Informasi Pegawai:
- Jabatan: ${jabatan || "Pegawai ASN"}
- Unit Kerja: ${unitKerja || "Instansi Pemerintah"}

Catatan Kasaran Pegawai:
"${rawText}"

Daftar RHK Pegawai:
${rhkOptions || "Tidak ada RHK terdaftar"}

Instruksi Output:
Kembalikan HANYA format JSON valid tanpa format markdown lain:
{
  "aktivitas": "Kalimat formal kedinasan (diawali kata kerja aktif seperti Melaksanakan, Melakukan, Menyusun, Mengoordinasikan, dsb)",
  "outputJumlah": "Output hasil kerja yang terukur (misal: 1 Laporan Monitoring Jaringan, 1 Dokumen Berita Acara, dsb)",
  "rhkId": "ID RHK yang paling cocok dari daftar di atas (jika cocok, jika tidak kosongkan stringnya)",
  "catatan": "Catatan ringkas teknis atau kualitatif terkait hasil tugas"
}
`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            aktivitas: parsed.aktivitas || rawText,
            outputJumlah: parsed.outputJumlah || "1 Dokumen / Kegiatan",
            rhkId: parsed.rhkId || (rhkList[0]?.id || ""),
            catatan: parsed.catatan || "Terselesaikan dalam kondisi optimal.",
            source: "gemini"
          };
        }
      } else if (response.status === 429) {
        console.warn("[Gemini API] Kuota / prepayment credits habis (Status 429), beralih ke engine heuristik offline.");
        const off = polishJournalOffline(rawText, rhkList);
        return {
          ...off,
          source: "offline_429"
        };
      }
    } catch (e) {
      console.warn("Gemini API error, beralih ke engine heuristik offline:", e);
    }
  }

  // Engine Heuristik Offline (Cerdas & Cepat tanpa API Key)
  const offlineResult = polishJournalOffline(rawText, rhkList);
  return {
    ...offlineResult,
    source: "offline"
  };
}

/**
 * Generator Heuristik Offline untuk Memoles Catatan Kasaran Pegawai
 */
export function polishJournalOffline(rawText, rhkList = []) {
  let text = rawText.trim();
  const lower = text.toLowerCase();

  // Pola Kamus Transformasi Kasar -> Baku ASN
  let formalPrefix = "Melaksanakan";
  let output = "1 Laporan Pelaksanaan Tugas";
  let catatan = "Kegiatan terselesaikan dengan tertib dan memenuhi standar pelayanan.";

  if (lower.includes("benerin") || lower.includes("perbaiki") || lower.includes("rusak") || lower.includes("troubleshoot")) {
    formalPrefix = "Melaksanakan perbaikan teknis, penelusuran kendala (troubleshooting), dan optimalisasi fungsi";
    output = "1 Berkas Berita Acara Perbaikan";
    catatan = "Perangkat telah diuji fungsional dan kembali beroperasi normal.";
  } else if (lower.includes("bersih") || lower.includes("rawat") || lower.includes("maintenance")) {
    formalPrefix = "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan";
    output = "1 Lembar Checklist Pemeliharaan";
    catatan = "Kondisi peralatan terverifikasi bersih, aman, dan siap dipergunakan.";
  } else if (lower.includes("bikin") || lower.includes("buat") || lower.includes("susun") || lower.includes("jadwal") || lower.includes("surat")) {
    formalPrefix = "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen";
    output = "1 Berkas Dokumen Administrasi";
    catatan = "Draf dokumen telah divalidasi dan disesuaikan dengan format kedinasan.";
  } else if (lower.includes("cek") || lower.includes("ngecek") || lower.includes("pantau") || lower.includes("monitor")) {
    formalPrefix = "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional";
    output = "1 Laporan Monitoring dan Evaluasi";
    catatan = "Hasil pemantauan menunjukkan sistem/sarana bekerja stabil tanpa anomali.";
  } else if (lower.includes("ajar") || lower.includes("ngajar") || lower.includes("siswa") || lower.includes("kelas")) {
    formalPrefix = "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi";
    output = "1 Jurnal Pembelajaran & Daftar Hadir";
    catatan = "Peserta didik antusias dan seluruh target kompetensi tercapai baik.";
  } else if (lower.includes("rapat") || lower.includes("koordinasi") || lower.includes("ngobrol") || lower.includes("briefing")) {
    formalPrefix = "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta pembahasan teknis";
    output = "1 Notula Rapat & Daftar Hadir";
    catatan = "Telah dicapai kesepakatan bersama dan rencana tindak lanjut operasional.";
  } else if (lower.includes("rekap") || lower.includes("ngerekap") || lower.includes("data") || lower.includes("input")) {
    formalPrefix = "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data";
    output = "1 Rekapitulasi Data Terverifikasi";
    catatan = "Seluruh data telah divalidasi dengan tingkat akurasi 100%.";
  }

  // Bersihkan kata-kata percakapan santai
  let cleanedSubject = text
    .replace(/^(tadi|hari ini|udah|sudah|lagi|sedang|mau|pengen|aku|saya|kita|kami)\s+/gi, "")
    .replace(/\b(terus|lalu|trs|trus|abis|setelah itu)\b/gi, "serta")
    .replace(/\b(benerin|perbaiki|rusak)\b/gi, "penanganan kendala")
    .replace(/\b(bersihin|rawat)\b/gi, "pemeliharaan")
    .replace(/\b(bikin|buat)\b/gi, "penyusunan")
    .replace(/\b(biar|supaya)\b/gi, "guna memastikan")
    .replace(/\b(ga|gak|nggak|tidak)\s+(ada|bisa)\b/gi, "mencegah terjadinya")
    .replace(/\b(wifi|internet|jaringan)\b/gi, "konektivitas jaringan internet")
    .replace(/\b(lab|ruang lab)\b/gi, "Ruang Praktik Siswa LAB")
    .trim();

  // Rangkai kalimat formal
  let polishedAktivitas = `${formalPrefix} ${cleanedSubject}`;
  // Rapikan huruf kapital di awal kalimat
  polishedAktivitas = polishedAktivitas.charAt(0).toUpperCase() + polishedAktivitas.slice(1);
  if (!polishedAktivitas.endsWith(".")) {
    polishedAktivitas += ".";
  }

  // Pilih RHK yang paling cocok
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


