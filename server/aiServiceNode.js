// AI Service Khusus Lingkungan Node.js (Telegram Bot & Backend)
// Mendukung Google Gemini API (Online) dan Engine NLP Heuristik ASN (Offline)

/**
 * Memoles catatan kasaran / santai menjadi bahasa formal kedinasan ASN
 */
export async function polishJournalNode({
  rawText,
  jabatan = "",
  unitKerja = "",
  apiKey = ""
}) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Tuliskan catatan aktivitas kasaran terlebih dahulu!");
  }

  // Jika pemanggil meminta eksplisit mode offline (tanpa memanggil Google API)
  if (apiKey === "offline") {
    return polishJournalOfflineNode(rawText);
  }

  const rawServerKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "").trim();
  const effectiveKey = (apiKey && apiKey !== "server-managed" && !apiKey.startsWith("server-"))
    ? apiKey.trim()
    : rawServerKey;

  // 1. Coba gunakan Gemini API jika API Key tersedia
  if (effectiveKey) {
    try {
      const prompt = `
Anda adalah asisten cerdas ASN Kementerian PANRB & BKN Indonesia.
Tugas Anda: Mengubah catatan aktivitas harian kasaran / santai seorang pegawai ASN menjadi uraian tugas kedinasan yang formal, baku, dan terukur sesuai standar e-Kinerja PermenPAN-RB No. 6 Tahun 2022.

Informasi Pegawai:
- Jabatan: ${jabatan || "Pegawai ASN"}
- Unit Kerja: ${unitKerja || "Instansi Pemerintah"}

Catatan Kasaran Pegawai:
"${rawText}"

Pedoman Substansi & Relevansi Tugas:
1. Pertahankan substansi dan konteks pekerjaan riil yang ditulis pegawai! JANGAN mengubah jenis kegiatan yang tidak relevan.
2. Contoh: Jika pegawai menulis tentang "arsip", "ijazah alumni", "berkas", "lemari dokumen", itu adalah TUGAS KEARSIPAN & TATA USAHA (gunakan: "Melakukan penataan, klasifikasi, serta penyimpanan berkas arsip..."). DILARANG KERAS mengubahnya menjadi kegiatan pembelajaran/mengajar murid hanya karena ada kata "tahun ajaran" atau "alumni"!
3. Jika pegawai menulis tentang persuratan ("surat masuk", "disposisi", "registrasi surat"), itu adalah TUGAS TATA NASKAH DINAS & PERSURATAN (gunakan: "Melaksanakan pengelolaan surat dinas, pencatatan buku agenda, serta pendistribusian lembar disposisi..."). Perhatikan: jika surat masuk tersebut perihalnya tentang bimtek/sosialisasi/kurikulum, tugas pegawai adalah MENGELOLA / MEREGISTRASI SURATNYA, BUKAN mengikuti sosialisasi/bimtek!
4. Jika pegawai menulis tentang "rekap berkas usul kenaikan pangkat", itu adalah TUGAS ADMINISTRASI KEPEGAWAIAN.
5. STANDAR TATA BAHASA & SINGKATAN RESMI: DILARANG menggunakan singkatan tidak baku seperti "ttg", "no", "dgn", "yg", "utk", "dlm". Wajib ubah menjadi kata formal baku (misalnya: "ttg" menjadi "tentang", "no" menjadi "Nomor", "bimtek" menjadi "Bimbingan Teknis (Bimtek)", "dinas pendidikan" menjadi "Dinas Pendidikan").

Instruksi Output:
Kembalikan HANYA format JSON valid tanpa format markdown lain:
{
  "aktivitas": "Kalimat formal kedinasan (diawali kata kerja aktif seperti Melaksanakan, Melakukan, Menyusun, Mengoordinasikan, dsb)",
  "outputJumlah": "Output hasil kerja yang terukur (misal: 1 Laporan Kegiatan, 1 Dokumen Berkas Arsip, dsb)",
  "catatan": "Catatan ringkas teknis atau kualitatif terkait hasil tugas"
}
`;

      const candidateModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": effectiveKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json"
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              const parsed = JSON.parse(content);
              return {
                aktivitas: cleanDuplicatePhrases(parsed.aktivitas || rawText),
                outputJumlah: parsed.outputJumlah || "1 Dokumen / Kegiatan",
                catatan: parsed.catatan || "Terselesaikan dengan tertib sesuai standar operasional prosedur.",
                source: `gemini-ai (${model})`
              };
            }
          } else if (response.status === 429) {
            console.warn(`[Gemini API] Model ${model} terkena limit 429 (kuota rate limit), mencoba model cadangan...`);
          } else {
            console.warn(`[Gemini API] Model ${model} respon status ${response.status}, mencoba model cadangan...`);
          }
        } catch (mErr) {
          console.warn(`[Gemini API] Gagal memanggil ${model}:`, mErr.message);
        }
      }
      console.warn("[Gemini API] Seluruh model Gemini online sedang limit/penuh, beralih ke engine heuristik offline.");
    } catch (e) {
      console.warn("[Gemini API Error, beralih ke offline]:", e.message);
    }
  }

  // 2. Engine Heuristik Offline (Cerdas, Cepat, Tanpa API Key)
  return polishJournalOfflineNode(rawText);
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

  // 2. Singkatan kedinasan / teknis
  s = s.replace(/\bbimtek\b/gi, "Bimbingan Teknis (Bimtek)");
  s = s.replace(/\bdinas pendidikan\b/gi, "Dinas Pendidikan");
  s = s.replace(/\bkemenag\b/gi, "Kementerian Agama");
  s = s.replace(/\bkemenkeu\b/gi, "Kementerian Keuangan");
  s = s.replace(/\bbkn\b/gi, "Badan Kepegawaian Negara (BKN)");
  s = s.replace(/\bkkg\b/gi, "Kelompok Kerja Guru (KKG)");
  s = s.replace(/\bmgmp\b/gi, "Musyawarah Guru Mata Pelajaran (MGMP)");
  s = s.replace(/\bkurikulum merdeka\b/gi, "Kurikulum Merdeka");
  s = s.replace(/\bkurikulum\b/gi, "Kurikulum");

  // 3. Singkatan percakapan sehari-hari
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

  // Rapikan spasi berlebih
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Engine Heuristik Offline Pemoles Catatan Kasar ASN
 */
export function polishJournalOfflineNode(rawText) {
  let text = cleanDuplicatePhrases((rawText || "").trim());

  // Daftar prefix baku agar tidak pernah terduplikasi jika dipoles berulang kali
  const knownPrefixConfig = [
    { prefix: "Melakukan penataan, klasifikasi, serta penyimpanan dokumen arsip", category: "kearsipan" },
    { prefix: "Melakukan penataan, klasifikasi, serta penyimpanan", category: "kearsipan" },
    { prefix: "Melaksanakan pengelolaan surat dinas, pencatatan buku agenda, serta pendistribusian lembar disposisi", category: "persuratan" },
    { prefix: "Melaksanakan pelayanan administrasi kedinasan, verifikasi kelengkapan berkas, serta pencatatan register", category: "pelayanan" },
    { prefix: "Melakukan verifikasi kelengkapan berkas, validasi persyaratan, serta rekapitulasi data kedinasan", category: "rekap" },
    { prefix: "Melakukan verifikasi kelengkapan berkas, validasi persyaratan, serta rekapitulasi", category: "rekap" },
    { prefix: "Melaksanakan perbaikan teknis, penelusuran kendala (troubleshooting), dan optimalisasi fungsi", category: "perbaikan" },
    { prefix: "Melaksanakan penanganan kendala teknis, perbaikan perangkat, serta optimalisasi fungsi", category: "perbaikan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan sarana", category: "pemeliharaan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan", category: "pemeliharaan" },
    { prefix: "Menyusun draf dokumen kedinasan, telaah administrasi, serta finalisasi laporan", category: "dokumen" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen administrasi", category: "dokumen" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen", category: "dokumen" },
    { prefix: "Melakukan monitoring, inspeksi berkala, serta evaluasi operasional tugas kedinasan", category: "monitoring" },
    { prefix: "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional", category: "monitoring" },
    { prefix: "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi", category: "pembelajaran" },
    { prefix: "Mengikuti kegiatan sosialisasi, pendalaman materi kedinasan, serta pembahasan teknis", category: "sosialisasi" },
    { prefix: "Mengikuti kegiatan sosialisasi, pendalaman materi, serta pembahasan teknis", category: "sosialisasi" },
    { prefix: "Mengikuti kegiatan sosialisasi", category: "sosialisasi" },
    { prefix: "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta penyusunan notula", category: "rapat" },
    { prefix: "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta pembahasan teknis", category: "rapat" },
    { prefix: "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data kedinasan", category: "rekap" },
    { prefix: "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data", category: "rekap" },
    { prefix: "Melaksanakan pengelolaan dan pendistribusian dokumen kedinasan", category: "distribusi" },
    { prefix: "Melaksanakan pengelolaan dan pendistribusian dokumen", category: "distribusi" }
  ];

  // Bersihkan semua prefix formal sebelumnya (Idempotent)
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

  if (strippedText.length > 0) {
    text = strippedText;
  }

  // Normalisasi singkatan informal agar menjadi istilah resmi dan baku
  text = normalizeAbbreviations(text);

  // Deteksi Kategori Kegiatan secara Kontekstual & Akurat (Berdasarkan Word Boundaries)
  const isExplicitTeaching = /\b(mengajar|ngajar|kbm|jam pelajaran|pembelajaran di kelas|kegiatan belajar mengajar)\b/i.test(text);

  // Persuratan harus diprioritaskan: jika ada "surat masuk" / "registrasi surat", itu tugas persuratan, BUKAN sosialisasi meskipun ada topik bimtek di dalam suratnya
  const isPersuratan = /\b(surat masuk|surat keluar|buku agenda|disposisi|lembar disposisi|ekspedisi surat|surat dinas|surat edaran|penomoran surat|registrasi surat|input registrasi)\b/i.test(text) || detectedCategory === "persuratan";

  const isSosialisasi = !isPersuratan && (detectedCategory === "sosialisasi" ||
    /\b(sosialisasi|workshop|bimtek|pelatihan|diklat|seminar|webinar|penyuluhan|orientasi)\b/i.test(text));

  const isKearsipan = detectedCategory === "kearsipan" ||
    /\b(arsip|kearsipan|mengarsipkan|pengarsipan|mengarsip|ijazah|buku induk|lemari dokumen|lemari arsip|penataan berkas|simpan berkas|penyimpanan berkas|filling|map arsip)\b/i.test(text);

  const isRekap = detectedCategory === "rekap" ||
    /\b(rekap|ngerekap|rekapitulasi|verifikasi berkas|validasi berkas|kenaikan pangkat|usul pangkat|gaji berkala|kgb|kepegawaian|sinkronisasi data|input data|entri data|olah data)\b/i.test(text);

  const isPelayanan = detectedCategory === "pelayanan" ||
    /\b(legalisir|pelayanan|buku tamu|buku register|surat keterangan|surat pindah|pelayanan siswa|layanan tamu)\b/i.test(text);

  const isPerbaikan = detectedCategory === "perbaikan" ||
    /\b(benerin|perbaiki|rusak|troubleshoot|troubleshooting|error|kendala teknis|jaringan mati|wifi mati|pc mati|komputer rusak|penanganan kendala)\b/i.test(text) ||
    (/\b(mikrotik|router|kabel lan|server|switch|jaringan)\b/i.test(text) && /\b(mati|rusak|error|gangguan|down|putus|bermasalah|kendala)\b/i.test(text));

  const isPemeliharaan = detectedCategory === "pemeliharaan" ||
    /\b(bersih|bersihin|rawat|maintenance|pemeliharaan berkala|perawatan sarana|cek rutin lab)\b/i.test(text);

  const isRapat = detectedCategory === "rapat" ||
    /\b(rapat|koordinasi|briefing|notula|rapat dinas|sidang|audiensi)\b/i.test(text);

  const isPembelajaran = detectedCategory === "pembelajaran" || isExplicitTeaching ||
    (/\b(pembelajaran|materi ajar|praktik siswa|bimbingan siswa)\b/i.test(text) && !isKearsipan && !isPersuratan && !isRekap && !isSosialisasi);

  const isDokumen = detectedCategory === "dokumen" ||
    /\b(bikin laporan|buat laporan|susun laporan|draf|draft|penyusunan dokumen|sk pembagian tugas|jadwal kegiatan)\b/i.test(text);

  const isMonitoring = detectedCategory === "monitoring" ||
    /\b(cek|ngecek|pantau|monitor|inspeksi|pengawasan)\b/i.test(text);

  // Default Template Formal ASN
  let formalPrefix = "Melaksanakan tugas operasional kedinasan";
  let output = "1 Laporan Pelaksanaan Tugas";
  let catatan = "Kegiatan terselesaikan dengan tertib dan memenuhi standar pelayanan.";

  if (isExplicitTeaching) {
    formalPrefix = "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi";
    output = "1 Jurnal Pembelajaran & Daftar Hadir";
    catatan = "Kegiatan belajar mengajar berlangsung interaktif dan seluruh capaian materi terpenuhi baik.";
  } else if (isPersuratan) {
    formalPrefix = "Melaksanakan pengelolaan surat dinas, pencatatan buku agenda, serta pendistribusian lembar disposisi";
    output = "1 Berkas Pengelolaan Surat Dinas";
    catatan = "Surat kedinasan telah teragendakan dan didistribusikan secara tertib sesuai disposisi pimpinan.";
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
  } else if (isPembelajaran) {
    formalPrefix = "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi";
    output = "1 Jurnal Pembelajaran & Daftar Hadir";
    catatan = "Kegiatan belajar mengajar berlangsung interaktif dan seluruh capaian materi terpenuhi baik.";
  } else if (isDokumen) {
    formalPrefix = "Menyusun draf dokumen kedinasan, telaah administrasi, serta finalisasi laporan";
    output = "1 Berkas Dokumen Administrasi";
    catatan = "Draf dokumen telah divalidasi dan disesuaikan dengan format tata naskah dinas.";
  } else if (isMonitoring) {
    formalPrefix = "Melakukan monitoring, inspeksi berkala, serta evaluasi operasional tugas kedinasan";
    output = "1 Laporan Monitoring dan Evaluasi";
    catatan = "Hasil pemantauan menunjukkan operasional sarana/tugas berjalan stabil tanpa kendala.";
  }

  // Bersihkan partikel santai & kata kerja kasaran
  let cleaned = text
    .replace(/^(tadi|hari ini|udah|sudah|lagi|sedang|mau|pengen|aku|saya|kita|kami)\s+/gi, "")
    .replace(/^(mengikuti|ngikut|ikut|hadir|menghadiri)\s+/gi, "")
    .replace(/^(ngerekap|rekap|input|menginput|penginputan|entri|mengentri)\s+/gi, "")
    .replace(/^(arsip|mengarsip|mengarsipkan|pengarsipan|simpan|menyimpan|tata|menata|merapikan|rapikan|masukin|taruh)\s+/gi, "")
    .replace(/^(benerin|perbaiki|memperbaiki|beneri)\s+/gi, "")
    .replace(/^(bersihin|membersihkan|rawat|merawat)\s+/gi, "")
    .replace(/^(bikin|buat|membuat|susun|menyusun)\s+/gi, "")
    .replace(/^(ngecek|cek|memeriksa|pantau|memantau)\s+/gi, "")
    .replace(/^(ngajar|mengajar)\s+/gi, "")
    .replace(/^(terkait)\s+/gi, "")
    .replace(/\b(terus|lalu|trs|trus|abis|setelah itu)\b/gi, "serta")
    .replace(/\b(yang|yg)\s+rusak\b/gi, "yang mengalami kendala teknis")
    .replace(/\b(yang|yg)\s+(mati|down|putus)\b/gi, "yang mengalami gangguan operasional")
    .replace(/\b(benerin|perbaiki|rusak)\b/gi, "penanganan kendala")
    .replace(/\b(bersihin|rawat)\b/gi, "pemeliharaan")
    .replace(/\b(bikin|buat)\b/gi, "penyusunan")
    .replace(/\b(biar|supaya)\b/gi, "guna memastikan")
    .replace(/\b(ga|gak|nggak|tidak)\s+(ada|bisa)\b/gi, "mencegah kendala")
    .replace(/\bkemarin\b/gi, "sebelumnya")
    .replace(/\b(wifi|internet|jaringan)\b/gi, "konektivitas jaringan internet")
    .replace(/\b(lab|ruang lab)\b/gi, "Ruang Praktik Siswa LAB")
    .replace(/\blemari dokumen arsip\b/gi, "lemari arsip")
    .replace(/\blemari dokumen\b/gi, "lemari arsip dokumen")
    .replace(/\barsip b\b/gi, "arsip B")
    .trim();

  cleaned = cleaned.replace(/[.]+$/, "").trim();

  let polished = "";
  if (cleaned) {
    if (isSosialisasi) {
      const topic = cleaned.replace(/^(sosialisasi|kegiatan sosialisasi|bimtek|workshop|pelatihan)\s*/gi, "").trim();
      polished = topic ? `${formalPrefix} terkait ${topic}` : formalPrefix;
    } else if (isPersuratan) {
      const topic = cleaned.replace(/^(surat dinas|pengelolaan surat dinas|pengelolaan surat)\s*/gi, "").trim();
      polished = topic.toLowerCase().startsWith("terkait") ? `${formalPrefix} ${topic}` : `${formalPrefix} terkait ${topic}`;
    } else if (isKearsipan && !cleaned.toLowerCase().startsWith("dokumen") && !cleaned.toLowerCase().startsWith("berkas")) {
      polished = `${formalPrefix} dokumen ${cleaned}`;
    } else {
      polished = `${formalPrefix} ${cleaned}`;
    }
  } else {
    polished = formalPrefix;
  }

  polished = cleanDuplicatePhrases(polished);
  polished = polished.charAt(0).toUpperCase() + polished.slice(1);
  if (!polished.endsWith(".")) polished += ".";

  return {
    aktivitas: polished,
    outputJumlah: output,
    catatan: catatan,
    source: "offline-heuristics"
  };
}
