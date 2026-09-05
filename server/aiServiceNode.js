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

  const effectiveKey = apiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

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

Instruksi Output:
Kembalikan HANYA format JSON valid tanpa format markdown lain:
{
  "aktivitas": "Kalimat formal kedinasan (diawali kata kerja aktif seperti Melaksanakan, Melakukan, Menyusun, Mengoordinasikan, dsb)",
  "outputJumlah": "Output hasil kerja yang terukur (misal: 1 Laporan Kegiatan, 1 Dokumen Berita Acara, dsb)",
  "catatan": "Catatan ringkas teknis atau kualitatif terkait hasil tugas"
}
`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            aktivitas: parsed.aktivitas || rawText,
            outputJumlah: parsed.outputJumlah || "1 Dokumen / Kegiatan",
            catatan: parsed.catatan || "Terselesaikan dengan tertib sesuai standar operasional prosedur.",
            source: "gemini-ai"
          };
        }
      } else {
        console.warn(`[Gemini API] Respon status ${response.status}, beralih ke engine heuristik offline.`);
      }
    } catch (e) {
      console.warn("[Gemini API Error, beralih ke offline]:", e.message);
    }
  }

  // 2. Engine Heuristik Offline (Cerdas, Cepat, Tanpa API Key)
  return polishJournalOfflineNode(rawText);
}

/**
 * Engine Heuristik Offline Pemoles Catatan Kasar ASN
 */
export function polishJournalOfflineNode(rawText) {
  let text = (rawText || "").trim();

  // Daftar prefix baku agar tidak pernah terduplikasi jika dipoles berulang kali
  const knownPrefixConfig = [
    { prefix: "Melaksanakan perbaikan teknis, penelusuran kendala (troubleshooting), dan optimalisasi fungsi", category: "perbaikan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan sarana", category: "pemeliharaan" },
    { prefix: "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan", category: "pemeliharaan" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen administrasi", category: "dokumen" },
    { prefix: "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen", category: "dokumen" },
    { prefix: "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional tugas kedinasan", category: "monitoring" },
    { prefix: "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional", category: "monitoring" },
    { prefix: "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi", category: "pembelajaran" },
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

  const lower = text.toLowerCase();

  let formalPrefix = "Melaksanakan";
  let output = "1 Laporan Pelaksanaan Tugas";
  let catatan = "Kegiatan terselesaikan dengan tertib dan memenuhi standar pelayanan.";

  if (detectedCategory === "perbaikan" || lower.includes("benerin") || lower.includes("perbaiki") || lower.includes("rusak") || lower.includes("troubleshoot") || lower.includes("error")) {
    formalPrefix = "Melaksanakan perbaikan teknis, penelusuran kendala (troubleshooting), dan optimalisasi fungsi";
    output = "1 Berkas Berita Acara Perbaikan";
    catatan = "Perangkat/sistem telah diuji fungsional dan kembali beroperasi secara optimal.";
  } else if (detectedCategory === "pemeliharaan" || lower.includes("bersih") || lower.includes("rawat") || lower.includes("maintenance")) {
    formalPrefix = "Melakukan pemeliharaan preventif, pembersihan berkala, serta pengecekan kelayakan sarana";
    output = "1 Lembar Checklist Pemeliharaan";
    catatan = "Kondisi peralatan terverifikasi bersih, aman, dan siap dipergunakan.";
  } else if (detectedCategory === "dokumen" || lower.includes("bikin") || lower.includes("buat") || lower.includes("susun") || lower.includes("jadwal") || lower.includes("surat") || lower.includes("draf")) {
    formalPrefix = "Menyusun, merumuskan draf, serta melakukan finalisasi dokumen administrasi";
    output = "1 Berkas Dokumen Administrasi";
    catatan = "Draf dokumen telah divalidasi dan disesuaikan dengan tata naskah dinas.";
  } else if (detectedCategory === "monitoring" || lower.includes("cek") || lower.includes("ngecek") || lower.includes("pantau") || lower.includes("monitor") || lower.includes("inspeksi")) {
    formalPrefix = "Melakukan monitoring, inspeksi berkala, dan evaluasi operasional tugas kedinasan";
    output = "1 Laporan Monitoring dan Evaluasi";
    catatan = "Hasil pemantauan menunjukkan sistem/sarana bekerja stabil tanpa kendala.";
  } else if (detectedCategory === "pembelajaran" || lower.includes("ajar") || lower.includes("ngajar") || lower.includes("siswa") || lower.includes("kelas") || lower.includes("murid")) {
    formalPrefix = "Melaksanakan kegiatan pembelajaran, pendampingan praktik peserta didik, serta evaluasi materi";
    output = "1 Jurnal Pembelajaran & Daftar Hadir";
    catatan = "Peserta didik antusias dan seluruh target kompetensi tercapai baik.";
  } else if (detectedCategory === "rapat" || lower.includes("rapat") || lower.includes("koordinasi") || lower.includes("ngobrol") || lower.includes("briefing") || lower.includes("zoom")) {
    formalPrefix = "Mengikuti rapat koordinasi kedinasan, penyelarasan program kerja, serta pembahasan teknis";
    output = "1 Notula Rapat & Daftar Hadir";
    catatan = "Telah dicapai kesepakatan bersama dan rencana tindak lanjut operasional.";
  } else if (detectedCategory === "rekap" || lower.includes("rekap") || lower.includes("ngerekap") || lower.includes("data") || lower.includes("input") || lower.includes("entri")) {
    formalPrefix = "Melakukan penginputan, rekapitulasi, verifikasi, serta sinkronisasi data kedinasan";
    output = "1 Rekapitulasi Data Terverifikasi";
    catatan = "Seluruh data telah divalidasi dengan tingkat akurasi 100%.";
  } else if (detectedCategory === "distribusi" || lower.includes("kirim") || lower.includes("antar") || lower.includes("distribusi") || lower.includes("antar surat")) {
    formalPrefix = "Melaksanakan pengelolaan dan pendistribusian dokumen kedinasan";
    output = "1 Ekspedisi Pengiriman Surat";
    catatan = "Dokumen dinas telah diterima oleh pihak terkait dalam kondisi lengkap.";
  }

  // Bersihkan partikel santai & kata kerja kasaran yang telah diwakili oleh prefix
  let cleaned = text
    .replace(/^(tadi|hari ini|udah|sudah|lagi|sedang|mau|pengen|aku|saya|kita|kami)\s+/gi, "")
    .replace(/^(ngerekap|rekap|input|menginput|penginputan)\s+/gi, "")
    .replace(/\b(terus|lalu|trs|trus|abis|setelah itu)\b/gi, "serta")
    .replace(/\b(benerin|perbaiki|rusak)\b/gi, "penanganan kendala")
    .replace(/\b(bersihin|rawat)\b/gi, "pemeliharaan")
    .replace(/\b(bikin|buat)\b/gi, "penyusunan")
    .replace(/\b(biar|supaya)\b/gi, "guna memastikan")
    .replace(/\b(ga|gak|nggak|tidak)\s+(ada|bisa)\b/gi, "mencegah kendala")
    .replace(/\b(wifi|internet|jaringan)\b/gi, "konektivitas jaringan internet")
    .trim();

  cleaned = cleaned.replace(/[.]+$/, "").trim();

  let polished = cleaned ? `${formalPrefix} ${cleaned}` : formalPrefix;
  polished = polished.charAt(0).toUpperCase() + polished.slice(1);
  if (!polished.endsWith(".")) polished += ".";

  return {
    aktivitas: polished,
    outputJumlah: output,
    catatan: catatan,
    source: "offline-heuristics"
  };
}
