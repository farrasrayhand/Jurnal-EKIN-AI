// Contoh Data Jurnal Harian & Logbook Aktivitas ASN Lengkap dengan Bukti Foto, Dokumen & Tautan Cloud
// Disediakan untuk pengujian cepat sintesis AI ke Matriks SKP

const createSampleSvgPhoto = (title, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="${color}"/>
    <circle cx="300" cy="160" r="60" fill="white" opacity="0.2"/>
    <path d="M 220 280 L 300 200 L 380 280 Z" fill="white" opacity="0.3"/>
    <rect x="50" y="310" width="500" height="60" rx="8" fill="black" opacity="0.4"/>
    <text x="300" y="348" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">
      ${title}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEMO_JOURNALS = [
  {
    id: "jrn-1",
    tanggal: "2026-02-10",
    jam: "09:00 - 11:30",
    aktivitas: "Rapat koordinasi teknis integrasi API portal layanan satu data dan pembahasan modul keamanan sistem SPBE",
    outputJumlah: "1 Notula Rapat & Skema API",
    rhkId: "rhk-prakom-1",
    catatan: "Dihadiri tim pengembang dan perwakilan dinas terkait, disepakati integrasi endpoint REST API.",
    evidenceType: "image",
    fotoUrl: createSampleSvgPhoto("Dokumentasi Rapat Koordinasi Teknis SPBE", "#1e3a8a"),
    fileName: "foto_rakor_spbe_10feb.jpg",
    fileSize: "340 KB",
    linkUrl: "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoP"
  },
  {
    id: "jrn-2",
    tanggal: "2026-03-05",
    jam: "13:00 - 16:00",
    aktivitas: "Pelaksanaan pengujian fungsi fitur modul layanan publik (UAT) dan pengujian keamanan vulnerability patch",
    outputJumlah: "1 Berkas Berita Acara UAT",
    rhkId: "rhk-prakom-1",
    catatan: "Modul lulus pengujian fungsional dengan tingkat keberhasilan 98% tanpa celah keamanan kritis.",
    evidenceType: "document",
    docCategory: "pdf",
    fileName: "Berita_Acara_Pengujian_UAT_Modul_Publik.pdf",
    fileSize: "1.2 MB",
    linkUrl: "https://cloud.instansi.go.id/s/uat_report_2026",
    fotoUrl: null
  },
  {
    id: "jrn-3",
    tanggal: "2026-04-18",
    jam: "08:30 - 12:00",
    aktivitas: "Pemeliharaan rutin server basis data, optimalisasi indeks query, dan verifikasi restore data backup berkala",
    outputJumlah: "1 Logbook Pemeliharaan Server",
    rhkId: "rhk-prakom-2",
    catatan: "Integritas data 100% cocok, waktu tanggap query meningkat 35%.",
    evidenceType: "image",
    fotoUrl: createSampleSvgPhoto("Monitoring & Pemeliharaan Server Data Center", "#4c1d95"),
    fileName: "foto_server_backup_18apr.jpg",
    fileSize: "420 KB",
    linkUrl: ""
  },
  {
    id: "jrn-4",
    tanggal: "2026-05-22",
    jam: "09:00 - 15:00",
    aktivitas: "Sosialisasi dan bimbingan teknis pengoperasian aplikasi persuratan digital bagi operator OPD",
    outputJumlah: "1 Buku Manual & Daftar Hadir (35 Peserta)",
    rhkId: "rhk-prakom-3",
    catatan: "Seluruh peserta berhasil mempraktikkan alur pengarsipan dan disposisi surat elektronik.",
    evidenceType: "document",
    docCategory: "word",
    fileName: "Buku_Panduan_User_Manual_Srikandi_v2.docx",
    fileSize: "2.4 MB",
    fotoUrl: createSampleSvgPhoto("Bimtek Pengoperasian Sistem Digital", "#92400e"),
    linkUrl: "https://drive.google.com/file/d/1XyZ987Manual"
  },
  {
    id: "jrn-5",
    tanggal: "2026-07-08",
    jam: "08:00 - 11:30",
    aktivitas: "Pemeriksaan dan monitoring berkala koneksi jaringan backbone internet serta konfigurasi router mikrotik utama sekolah",
    outputJumlah: "1 Laporan Monitoring Jaringan",
    rhkId: "rhk-smk-1",
    catatan: "Bandwidth lancar 250 Mbps, failover switch berfungsi normal.",
    evidenceType: "image",
    fotoUrl: createSampleSvgPhoto("Pemeriksaan Router & Server Jaringan SMK N 07", "#0f766e"),
    fileName: "foto_monitoring_jaringan_08jul.jpg",
    fileSize: "510 KB",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  },
  {
    id: "jrn-6",
    tanggal: "2026-07-16",
    jam: "08:30 - 14:00",
    aktivitas: "Inventarisasi dan perawatan preventif unit PC, kabel UTP, crimping tool, serta switch gigabit di LAB Praktik Siswa TJKT",
    outputJumlah: "1 Berkas Inventaris LAB TJKT",
    rhkId: "rhk-smk-2",
    catatan: "Sebanyak 36 unit komputer siswa berfungsi prima dan siap digunakan untuk praktik semester baru.",
    evidenceType: "image",
    fotoUrl: createSampleSvgPhoto("Pemeliharaan PC & Switch LAB TJKT", "#1e40af"),
    fileName: "foto_lab_tjkt_16jul.jpg",
    fileSize: "680 KB",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  },
  {
    id: "jrn-7",
    tanggal: "2026-07-25",
    jam: "09:00 - 12:00",
    aktivitas: "Penyusunan dan koordinasi draf jadwal rotasi penggunaan Ruang Praktik Siswa LAB TJKT bersama guru produktif kejuruan",
    outputJumlah: "1 Dokumen Jadwal Penggunaan LAB",
    rhkId: "rhk-smk-3",
    catatan: "Jadwal disepakati untuk 4 rombel kelas X dan XI TJKT tanpa terjadi bentrok jam praktik.",
    evidenceType: "document",
    docCategory: "pdf",
    fileName: "Jadwal_Penggunaan_Lab_TJKT_Ganjil_2026.pdf",
    fileSize: "820 KB",
    fotoUrl: createSampleSvgPhoto("Koordinasi Jadwal Praktik LAB TJKT", "#7e22ce"),
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  },
  {
    id: "jrn-8",
    tanggal: "2026-08-12",
    jam: "08:00 - 12:00",
    aktivitas: "Pembersihan berkala rack server, penggantian kabel patch cord Cat6, dan pengetesan akses poin WiFi guru dan siswa",
    outputJumlah: "1 Lembar Checklist Pemeliharaan",
    rhkId: "rhk-smk-1",
    catatan: "Seluruh AP indoor berfungsi optimal dengan cakupan sinyal 95%.",
    evidenceType: "image",
    fotoUrl: createSampleSvgPhoto("Maintenance Access Point & Rack Server", "#b45309"),
    fileName: "foto_maintenance_wifi_12agu.jpg",
    fileSize: "490 KB",
    linkUrl: "https://drive.google.com/drive/folders/13gAIC8Nm4kHqjxlAETxcx6km4m5ZUThz"
  }
];

