// Service Pengelolaan Master Jabatan dan Bank Kalimat Contoh Kasaran (Seeder Bawaan Resmi + Kustom Superadmin)
// Berdasarkan Nomenklatur Resmi ASN: Keputusan Menteri PANRB No. 282 Tahun 2025 (Jabatan Pelaksana: Klerek, Operator, Teknisi)
// dan PermenPAN-RB No. 1 Tahun 2023 / BKN (Jabatan Fungsional Keahlian & Keterampilan)

const STORAGE_KEY = "ekinerja_master_jabatan";

// 1. Data Awal Seeder Resmi: Nomenklatur Jabatan ASN Valid (Pelaksana & Fungsional)
export const DEFAULT_MASTER_JABATAN = [
  // --- JABATAN FUNGSIONAL TIK & JARINGAN ---
  {
    id: "jf-prakom",
    nama: "Pranata Komputer",
    kategori: "Jabatan Fungsional (TIK & Komputer)",
    keywords: ["komputer", "prakom", "it", "programmer", "teknisi", "jaringan", "sistem", "aplikasi", "software", "hardware", "database", "server"],
    contohKasaran: [
      "benerin wifi lab komputer yg ga konek trs cek mikrotik router",
      "backup database dapodik ke harddisk eksternal dan cloud google drive",
      "install ulang windows 11 pc tata usaha yg kena malware dan pasang office",
      "setting mikrotik bandwidth limit dan konfigurasi hotspot buat ujian cbt siswa",
      "perbaiki printer epson l3110 di ruang guru yg paper jam dan refill tinta",
      "input pemutakhiran data aset ti di aplikasi simda barang milik daerah",
      "crimping ulang 8 kabel lan rj45 ruang guru yg longgar sinyalnya putus-putus"
    ]
  },

  // --- JABATAN PELAKSANA: KLEREK (KEPMENPANRB 282/2025) ---
  {
    id: "jp-klerek-pengadministrasi",
    nama: "Pengadministrasi Perkantoran",
    kategori: "Jabatan Pelaksana (Klerek - Administrasi)",
    keywords: ["administrasi", "perkantoran", "tata usaha", "tu", "arsip", "surat", "pengadministrasi", "staf umum", "klerek", "agenda"],
    contohKasaran: [
      "ngerekap berkas usul kenaikan pangkat fungsional 4 orang guru",
      "input registrasi surat masuk dinas pendidikan no 420 ttg bimtek kurikulum",
      "buat draf surat tugas kepala sekolah untuk dinas luar ke balai bahasa",
      "arsip berkas ijazah alumni tahun ajaran kemarin ke lemari dokumen arsip b",
      "verifikasi presensi kehadiran fingerprint pegawai bulan berjalan",
      "rekap data inventaris barang atk kantor dan buat berita acara serah terima",
      "penggandaan naskah berkas akreditasi sekolah 5 rangkap dan dijilid rapi"
    ]
  },
  {
    id: "jp-klerek-pengolah-data",
    nama: "Pengolah Data dan Informasi",
    kategori: "Jabatan Pelaksana (Klerek - Data)",
    keywords: ["pengolah data", "data informasi", "operator data", "simpeg", "sdm", "statistik", "rekapitulasi", "tabulasi", "klerek"],
    contohKasaran: [
      "validasi dan verifikasi data anjab abk pegawai di aplikasi simpeg",
      "cleansing data ganda nomor induk pegawai dan sinkronisasi database sdm",
      "olah data statistik hasil evaluasi kinerja bulanan menggunakan pivot excel",
      "input pemutakhiran profil satuan pendidikan ke sistem informasi dapodik",
      "susun infografis rekapitulasi capaian program triwulanan dinas",
      "ekspor dan kompilasi data laporan bulanan opd ke format spreadsheet"
    ]
  },
  {
    id: "jp-klerek-penelaah-kebijakan",
    nama: "Penelaah Teknis Kebijakan",
    kategori: "Jabatan Pelaksana (Klerek - Kebijakan)",
    keywords: ["penelaah", "telaah kebijakan", "telaahan teknis", "regulasi", "draf naskah dinas", "rekomendasi", "permenpanrb"],
    contohKasaran: [
      "penelaahan kesesuaian draf sop pelayanan perizinan dg regulasi permenpanrb",
      "telaah teknis usulan bantuan hibah barang operasional kemasyarakatan",
      "identifikasi kendala regulasi pelaksanaan pengadaan barang dan jasa opd",
      "susun matriks komparasi aturan perda tata ruang lama dan revisi baru",
      "buat draf nota dinas telaahan staf tindak lanjut rekomendasi audit bpk"
    ]
  },

  // --- JABATAN PELAKSANA: OPERATOR (KEPMENPANRB 282/2025) ---
  {
    id: "jp-operator-layanan",
    nama: "Pengelola Layanan Operasional",
    kategori: "Jabatan Pelaksana (Operator - Layanan)",
    keywords: ["layanan operasional, operator", "operasional", "pelayanan publik", "loket", "perizinan", "fasilitas", "teknis umum", "front office"],
    contohKasaran: [
      "pelayanan permohonan legalisir ijazah dan dokumen kepegawaian di loket front office",
      "monitoring kesiapan sarana ruang rapat pimpinan dan proyektor presentasi",
      "input tiket permohonan layanan aduan masyarakat ke sistem lapor sp4n",
      "koordinasi jadwal pemeliharaan berkala ac dan genset kantor",
      "verifikasi fisik kelengkapan formulir berkas perizinan pemohon di loket",
      "rekapitulasi indeks kepuasan masyarakat ikm pelayanan kantor bulan berjalan"
    ]
  },

  // --- JABATAN PELAKSANA: TEKNISI (KEPMENPANRB 282/2025) ---
  {
    id: "jp-teknisi-sarpras",
    nama: "Teknisi Sarana dan Prasarana",
    kategori: "Jabatan Pelaksana (Teknisi - Sarpras)",
    keywords: ["teknisi", "sarana prasarana", "sarpras", "pemeliharaan", "listrik", "gedung", "utilitas", "perbaikan", "apar", "genset"],
    contohKasaran: [
      "perbaikan instalasi kabel listrik dan saklar lampu ruang aula yg korslet",
      "pengecekan tekanan pompa air dan pembersihan tandon air gedung kantor",
      "inspeksi kelayakan tabung apar pemadam api ringan di 10 titik koridor",
      "perbaikan handle pintu dan engsel jendela ruang kerja staf yg rusak",
      "pemasangan partisi sekat gypsum dan pengecatan ruang arsip dinas",
      "servis berkala genset cadangan darurat dan cek filter oli"
    ]
  },

  // --- JABATAN FUNGSIONAL: PENDIDIKAN & PENGAJARAN ---
  {
    id: "jf-guru",
    nama: "Guru Ahli (Pertama / Muda / Madya)",
    kategori: "Jabatan Fungsional (Pendidikan)",
    keywords: ["guru", "pendidik", "pengajar", "wali kelas", "kurikulum merdeka", "rpp", "modul ajar", "erapor", "siswa", "sekolah"],
    contohKasaran: [
      "buat modul ajar dan rpp kurikulum merdeka materi bab 3 pertemuan 5",
      "koreksi hasil ulangan harian siswa kelas 10 dan input nilai ke e-rapor",
      "bimbing siswa persiapan lomba olimpiade sains terapan tingkat kota",
      "rapat dewan guru evaluasi pembelajaran tengah semester bareng kepala sekolah",
      "monitoring piket kelas dan dampingi upacara bendera hari senin",
      "buat media presentasi canva dan lkpd lembar kerja praktikum siswa",
      "pembinaan konseling 3 siswa yg sering terlambat bareng guru bk"
    ]
  },

  // --- JABATAN FUNGSIONAL: KEARSIPAN (ANRI) ---
  {
    id: "jf-arsiparis",
    nama: "Arsiparis",
    kategori: "Jabatan Fungsional (Kearsipan)",
    keywords: ["arsiparis", "arsip", "kearsipan", "srikandi", "naskah dinas", "retensi arsip", "jadwal retensi", "berkas", "anri"],
    contohKasaran: [
      "input penomoran dan registrasi berkas arsip dinamis aktif ke aplikasi srikandi",
      "pemberkasan dan penataan 50 map arsip statis ke boks arsip standar anri",
      "pembuatan daftar pertelaan arsip usul musnah berkas keuangan kadaluarsa",
      "alih media digitalisasi berkas sk pns tahun 2010 ke format pdf dan cloud backup",
      "penataan fisik dan pembuatan label folder berkas lelang proyek fisik",
      "layanan peminjaman berkas warkah tanah dan penyerahan tanda terima arsip"
    ]
  },

  // --- JABATAN FUNGSIONAL: SDM APARATUR (BKN) ---
  {
    id: "jf-analis-sdm",
    nama: "Analis SDM Aparatur",
    kategori: "Jabatan Fungsional (Kepegawaian & SDM)",
    keywords: ["sdm aparatur", "kepegawaian", "anjab", "abk", "kenaikan pangkat", "mutasi", "siasn", "bkn", "kinerja asn", "bkd", "bkpsdm"],
    contohKasaran: [
      "verifikasi berkas usulan kenaikan pangkat periode april 25 pegawai di siasn bkn",
      "perhitungan analisis beban kerja abk dan peta jabatan struktur organisasi baru",
      "rekapitulasi penilaian skp tahunan pegawai se-kabupaten di aplikasi e-kinerja",
      "pemetaan kompetensi pegawai untuk persiapan asesmen talent pool bkd",
      "proses penerbitan surat izin cuti tahunan dan cuti melahirkan staf dinas",
      "sinkronisasi data riwayat pendidikan dan diklat teknis pegawai ke mysiasn"
    ]
  },

  // --- JABATAN FUNGSIONAL: PENGADAAN BARANG/JASA (LKPP) ---
  {
    id: "jf-pengelola-pbj",
    nama: "Pengelola Pengadaan Barang/Jasa (PBJ)",
    kategori: "Jabatan Fungsional (Pengadaan / PBJ)",
    keywords: ["pbj", "pengadaan", "lelang", "tender", "lpse", "sirup", "hps", "pokja", "pejabat pengadaan", "e-katalog", "lkpp"],
    contohKasaran: [
      "penyusunan harga perkiraan sendiri hps pengadaan komputer server dinas",
      "input rencana umum pengadaan rup belanja modal apbd ke aplikasi sirup lkpp",
      "evaluasi kualifikasi dan penawaran teknis tender pembangunan gedung kantor di lpse",
      "buat draf surat pesanan e-purchasing pengadaan mebeler sekolah lewat e-katalog",
      "rapat negosiasi teknis dan harga dengan penyedia barang jasa paket fisik",
      "pemeriksaan fisik hasil pekerjaan belanja modal bersama pphp di lokasi"
    ]
  },

  // --- JABATAN FUNGSIONAL: KEUANGAN & PERBENDAHARAAN ---
  {
    id: "jf-pranata-keuangan",
    nama: "Pranata Keuangan / Bendahara",
    kategori: "Jabatan Fungsional (Keuangan & SPJ)",
    keywords: ["keuangan", "bendahara", "anggaran", "spj", "pembukuan", "kas", "akuntansi", "bpp", "sipd", "arkas", "pajak", "djp"],
    contohKasaran: [
      "input spj belanja atk dan konsumsi rapat ke aplikasi penatausahaan sipd ri",
      "rekonsiliasi mutasi rekening koran bank daerah dg buku kas umum bku",
      "buat rincian daftar gaji pppk dan perhitungan potongan pph pasal 21",
      "verifikasi kelengkapan kuitansi nota belanja modal sarana sekolah",
      "setor pajak ppn dan pph belanja pemeliharaan gedung lewat e-billing djp",
      "susun draf laporan realisasi anggaran lra triwulan pertama opd",
      "tarik tunai dana operasional di bank kasda untuk uang persediaan up kantor"
    ]
  },

  // --- JABATAN FUNGSIONAL: PERENCANAAN (BAPPENAS / BAPPEDA) ---
  {
    id: "jf-perencana",
    nama: "Perencana",
    kategori: "Jabatan Fungsional (Perencanaan / Bappeda)",
    keywords: ["perencana", "bappeda", "renja", "renstra", "rkpd", "rpjmd", "musrenbang", "krisna", "perencanaan pembangunan"],
    contohKasaran: [
      "sinkronisasi target indikator program renja opd dg rkpd tahun anggaran berjalan",
      "verifikasi usulan musrenbang kecamatan prioritas infrastruktur ke sistem sipd",
      "penyusunan dokumen evaluasi hasil renja triwulan 2 dan analisis deviasi realisasi",
      "analisis kebutuhan pagu indikatif belanja operasional per bidang dinas",
      "koordinasi lintas sektor persiapan paparan konsultasi publik rancangan awal rkpd",
      "susun draf telaahan kerangka acuan kerja kak kegiatan prioritas bappeda"
    ]
  },

  // --- JABATAN FUNGSIONAL: ANALIS KEBIJAKAN (LAN RI) ---
  {
    id: "jf-analis-kebijakan",
    nama: "Analis Kebijakan",
    kategori: "Jabatan Fungsional (Kebijakan Publik / LAN)",
    keywords: ["analis kebijakan", "lan", "telaahan staf", "kajian kebijakan", "policy brief", "naskah akademik", "regulasi", "evaluasi kebijakan"],
    contohKasaran: [
      "susun policy brief rekomendasi strategi percepatan penurunan stunting daerah",
      "analisis dampak regulasi ria terhadap revisi perda retribusi persampahan",
      "susun draf telaahan staf alternatif formulasi alokasi anggaran penanganan banjir",
      "pengumpulan data primer wawancara lapangan evaluasi implementasi kebijakan kurikulum",
      "reviu naskah akademik rancangan peraturan kepala daerah ttg tata kelola satu data"
    ]
  },

  // --- JABATAN FUNGSIONAL: KESEHATAN (KEMENKES) ---
  {
    id: "jf-perawat-bidan",
    nama: "Perawat / Bidan / Tenaga Medis",
    kategori: "Jabatan Fungsional (Kesehatan & Medis)",
    keywords: ["perawat", "bidan", "nakes", "medis", "puskesmas", "poli", "tensi", "infus", "vaksin", "resep", "farmasi", "ugd", "rawat inap"],
    contohKasaran: [
      "pemeriksaan tensi darah dan tanda vital pasien poli umum 25 orang",
      "input data rekam medis pasien rawat jalan ke sistem rme e-puskesmas",
      "sterilisasi alat medis minor surgery set dan cek kesiapan tabung oksigen ugd",
      "pelayanan imunisasi dasar dpt polio balita di posyandu dahlia kelurahan",
      "rekonsiliasi stok obat keluar masuk dan cairan infus di gudang farmasi",
      "asuhan keperawatan dan penggantian perban luka post operasi ruang rawat inap"
    ]
  },
  {
    id: "jf-dokter",
    nama: "Dokter",
    kategori: "Jabatan Fungsional (Kesehatan & Medis Klinis)",
    keywords: ["dokter", "dokter umum", "dokter gigi", "spesialis", "medis", "diagnosa", "resep dokter", "visum", "klinis"],
    contohKasaran: [
      "pemeriksaan klinis dan penetapan diagnosa penyakit 30 pasien poli rawat jalan",
      "tindakan bedah minor debridement dan hecting luka robek pasien ugd",
      "peresepan obat kronis prolanis hipertensi dan diabetes di rekam medis elektronik",
      "pemeriksaan skrining kesehatan berkala calon pengantin di puskesmas",
      "konsultasi rujukan medis pasien komorbid ke fktl rsud tipe b",
      "penyusunan visum et repertum permintaan kepolisian kasus kecelakaan"
    ]
  },

  // --- JABATAN FUNGSIONAL: PENGAWASAN / AUDIT (BPKP / INSPEKTORAT) ---
  {
    id: "jf-auditor",
    nama: "Auditor / P2UPD",
    kategori: "Jabatan Fungsional (Pengawasan / Inspektorat)",
    keywords: ["auditor", "p2upd", "inspektorat", "bpkp", "pemeriksaan", "audit", "lhp", "probity audit", "fraud", "ketaatan", "kka"],
    contohKasaran: [
      "uji petik fisik berkas spj belanja hibah bansos tahun anggaran lalu",
      "pemeriksaan opname kas dan fisik barang inventaris gudang opd",
      "penyusunan kertas kerja audit kka atas kepatuhan belanja modal dinas pu",
      "klarifikasi temuan indikasi ketidaksesuaian volume pekerjaan jalan dg pelaksana",
      "susun draf laporan hasil pemeriksaan lhp reguler inspektorat daerah",
      "probity audit proses tender pengadaan alsintan dinas ketahanan pangan"
    ]
  },

  // --- JABATAN FUNGSIONAL: KETERTIBAN & PENEGAKAN PERDA ---
  {
    id: "jf-satpol-pp",
    nama: "Polisi Pamong Praja (Satpol PP)",
    kategori: "Jabatan Fungsional (Ketertiban Umum & Perda)",
    keywords: ["satpol pp", "polisi pamong praja", "perda", "trantibum", "razia", "penertiban", "patroli", "pengamanan", "bap"],
    contohKasaran: [
      "patroli ketenteraman dan ketertiban umum di kawasan tertib lalu lintas kota",
      "sosialisasi persuasif penertiban pedagang kaki lima pkl di trotoar jalan protokol",
      "operasi penertiban spanduk dan baliho reklame komersial tanpa izin pemda",
      "pengamanan apel akbar peringatan hari ulang tahun daerah di alun-alun",
      "mediasi sengketa batas tanah antar warga di kantor kelurahan",
      "penyusunan berita acara pemeriksaan bap pelanggaran perda perizinan bangunan"
    ]
  },

  // --- JABATAN FUNGSIONAL: HUMAS & KOMUNIKASI (KOMDIGI) ---
  {
    id: "jf-pranata-humas",
    nama: "Pranata Hubungan Masyarakat (Humas)",
    kategori: "Jabatan Fungsional (Komunikasi & Informasi Publik)",
    keywords: ["humas", "hubungan masyarakat", "siaran pers", "peliputan", "media sosial", "ppid", "berita dinas", "rilis"],
    contohKasaran: [
      "penulisan draf rilis pers peluncuran program beasiswa daerah untuk media massa",
      "peliputan dokumentasi foto dan video kunjungan kerja bupati ke sentra umkm",
      "produksi infografis edukasi pajak daerah untuk postingan instagram dan tiktok resmi pemda",
      "pelayanan permohonan informasi publik ppid dan rekapitulasi register aduan",
      "monitoring isu dan pemberitaan pemerintah daerah di media online lokal dan nasional"
    ]
  },

  // --- JABATAN FUNGSIONAL: PERPUSTAKAAN (PERPUSNAS) ---
  {
    id: "jf-pustakawan",
    nama: "Pustakawan",
    kategori: "Jabatan Fungsional (Perpustakaan & Literasi)",
    keywords: ["pustakawan", "perpustakaan", "literasi", "inlis lite", "katalog", "ddc", "sirkulasi buku", "reservasi", "koleksi"],
    contohKasaran: [
      "input katalogisasi bibliografi buku baru sesuai standar ddc ke aplikasi inlis lite",
      "layanan sirkulasi peminjaman dan pengembalian 75 buku bacaan siswa di perpustakaan",
      "penataan ulang rak buku shelving klasifikasi ilmu sosial dan sains terapan",
      "penyelenggaraan kegiatan literasi mendongeng dan bedah buku anak sekolah dasar",
      "stock opname inventarisasi fisik koleksi buku perpustakaan daerah akhir tahun"
    ]
  },

  // --- ADMINISTRATOR SISTEM (SUPERADMIN) ---
  {
    id: "adm-superadmin",
    nama: "Administrator Sistem Kepegawaian",
    kategori: "Tata Kelola SIASN & Superadmin",
    keywords: ["administrator", "kepegawaian", "superadmin", "bkd", "bkpsdm", "sdm", "skp", "admin", "siasn", "bkn"],
    contohKasaran: [
      "audit log aktivitas pengguna dan sinkronisasi berkas sdm e-kinerja bkn",
      "reset akun login pegawai dan atur pemetaan pejabat penilai dan atasan",
      "rekapitulasi status pengajuan dan penilaian skp tahunan semua unit kerja opd",
      "verifikasi usulan berkas mutasi pegawai dan kelengkapan anjab abk",
      "sosialisasi penggunaan aplikasi e-kinerja ai kepada operator tiap instansi",
      "backup database akun kepegawaian dan sinkronisasi server storage cloud"
    ]
  }
];

// 2. Inisialisasi Database Master Jabatan (LocalStorage + Sinkronisasi Seeder Otomatis)
export function initJabatanDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_JABATAN));
      return DEFAULT_MASTER_JABATAN;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_JABATAN));
      return DEFAULT_MASTER_JABATAN;
    }

    // Sinkronisasi cerdas: jika ada jabatan resmi dari seeder yang belum ada di localStorage, gabungkan otomatis
    let hasChanges = false;
    const currentList = [...parsed];

    DEFAULT_MASTER_JABATAN.forEach(seedItem => {
      const exists = currentList.some(item => 
        item.id === seedItem.id || 
        item.nama.toLowerCase() === seedItem.nama.toLowerCase()
      );
      if (!exists) {
        currentList.push(seedItem);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    }

    return currentList;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_JABATAN));
    return DEFAULT_MASTER_JABATAN;
  }
}

// 3. Ambil seluruh daftar Master Jabatan
export function getMasterJabatan() {
  return initJabatanDatabase();
}

// 4. Simpan seluruh daftar Master Jabatan
export function saveMasterJabatan(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan master jabatan:", e);
    return false;
  }
}

// 5. Tambah Jabatan Baru (Oleh Superadmin)
export function addJabatan({ nama, kategori, keywords = [], contohKasaran = [] }) {
  if (!nama || !nama.trim()) {
    throw new Error("Nama jabatan wajib diisi!");
  }

  const list = getMasterJabatan();
  const cleanNama = nama.trim();

  if (list.some(j => j.nama.toLowerCase() === cleanNama.toLowerCase())) {
    throw new Error(`Jabatan "${cleanNama}" sudah ada di dalam database master.`);
  }

  // Parse keywords jika string
  let kw = keywords;
  if (typeof kw === "string") {
    kw = kw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
  }
  if (!kw.length) {
    kw = cleanNama.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  }

  const newJabatan = {
    id: `jab-${Date.now()}`,
    nama: cleanNama,
    kategori: (kategori || "Umum Kedinasan").trim(),
    keywords: kw,
    contohKasaran: Array.isArray(contohKasaran) ? contohKasaran : []
  };

  list.push(newJabatan);
  saveMasterJabatan(list);
  return newJabatan;
}

// 6. Update Jabatan
export function updateJabatan(id, updateData) {
  const list = getMasterJabatan();
  const index = list.findIndex(j => j.id === id);
  if (index === -1) {
    throw new Error("Jabatan tidak ditemukan.");
  }

  let kw = updateData.keywords !== undefined ? updateData.keywords : list[index].keywords;
  if (typeof kw === "string") {
    kw = kw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
  }

  list[index] = {
    ...list[index],
    nama: updateData.nama ? updateData.nama.trim() : list[index].nama,
    kategori: updateData.kategori ? updateData.kategori.trim() : list[index].kategori,
    keywords: kw,
    contohKasaran: updateData.contohKasaran || list[index].contohKasaran
  };

  saveMasterJabatan(list);
  return list[index];
}

// 7. Hapus Jabatan
export function deleteJabatan(id) {
  const list = getMasterJabatan();
  const filtered = list.filter(j => j.id !== id);
  if (filtered.length === list.length) {
    throw new Error("Jabatan tidak ditemukan.");
  }
  saveMasterJabatan(filtered);
  return true;
}

// 8. Tambah Contoh Kasaran ke Jabatan Tertentu
export function addContohKasaran(jabatanId, contohText) {
  if (!contohText || !contohText.trim()) {
    throw new Error("Teks contoh kasaran tidak boleh kosong!");
  }

  const cleanText = contohText.trim();
  const list = getMasterJabatan();
  const index = list.findIndex(j => j.id === jabatanId);
  if (index === -1) {
    throw new Error("Jabatan tidak ditemukan.");
  }

  if (!list[index].contohKasaran) {
    list[index].contohKasaran = [];
  }

  // Hindari duplikat persis
  if (!list[index].contohKasaran.some(c => c.toLowerCase() === cleanText.toLowerCase())) {
    list[index].contohKasaran.push(cleanText);
    saveMasterJabatan(list);
  }

  return list[index];
}

// 9. Hapus Contoh Kasaran dari Jabatan Tertentu
export function deleteContohKasaran(jabatanId, contohIndex) {
  const list = getMasterJabatan();
  const index = list.findIndex(j => j.id === jabatanId);
  if (index === -1) {
    throw new Error("Jabatan tidak ditemukan.");
  }

  if (list[index].contohKasaran && list[index].contohKasaran[contohIndex] !== undefined) {
    list[index].contohKasaran.splice(contohIndex, 1);
    saveMasterJabatan(list);
  }

  return list[index];
}

// 10. Muat Ulang Seeder Bawaan (Reset ke 20 Jabatan Valid Resmi)
export function resetToDefaultJabatan() {
  saveMasterJabatan(DEFAULT_MASTER_JABATAN);
  return DEFAULT_MASTER_JABATAN;
}

// 11. Pencocokan Cerdas: Mencari Jabatan Master yang Paling Cocok dengan Jabatan Pengguna
export function findMatchingJabatan(userJabatanText = "") {
  const list = getMasterJabatan();
  if (!list.length) return null;

  const rawText = (userJabatanText || "").trim().toLowerCase();
  if (!rawText) return list[0]; // fallback default

  // 1. Exact match nama jabatan
  const exact = list.find(j => j.nama.toLowerCase() === rawText);
  if (exact) return exact;

  // 2. Contains match (jika rawText memuat nama jabatan master atau sebaliknya)
  const contains = list.find(j => 
    rawText.includes(j.nama.toLowerCase()) || 
    j.nama.toLowerCase().includes(rawText)
  );
  if (contains) return contains;

  // 3. Keyword matching (score-based)
  let bestMatch = null;
  let highestScore = 0;

  for (const item of list) {
    let score = 0;
    const keywords = item.keywords || [];
    for (const kw of keywords) {
      if (rawText.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    // Cek juga pecahan kata nama master
    const words = item.nama.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && rawText.includes(w)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore > 0) {
    return bestMatch;
  }

  // 4. Default fallback: kembalikan item pertama
  return list[0];
}

// 12. Dapatkan Contoh Kasaran untuk Pengguna Tertentu
// Menggabungkan contoh dari master seeder + masukan riil dari pengguna lain yang satu jabatan
export function getCasualExamplesForUser(userJabatanText = "", currentJournals = [], accounts = []) {
  const matched = findMatchingJabatan(userJabatanText);
  const masterList = getMasterJabatan();

  // Ambil contoh dari master jabatan yang cocok
  const seededExamples = matched?.contohKasaran ? [...matched.contohKasaran] : [];

  // Cari contoh dari jurnal riil akun lain yang memiliki jabatan serupa
  const peerExamples = [];
  const normalizedQuery = (userJabatanText || "").toLowerCase();

  // Kumpulkan username rekan yang satu jabatan
  const peerUsernames = new Set();
  if (Array.isArray(accounts)) {
    accounts.forEach(acc => {
      const j = (acc.jabatan || "").toLowerCase();
      if (j && (j.includes(normalizedQuery) || normalizedQuery.includes(j) || (matched && j.includes(matched.nama.toLowerCase())))) {
        if (acc.username) peerUsernames.add(acc.username);
      }
    });
  }

  // Jika ada jurnal dari rekan kerja
  if (Array.isArray(currentJournals)) {
    currentJournals.forEach(jrn => {
      // Jika jurnal mencatat aktivitasKasaran atau aktivitas yang pendek & belum formal
      const sampleText = jrn.aktivitasKasaran || jrn.aktivitas;
      if (sampleText && typeof sampleText === "string") {
        const clean = sampleText.trim();
        // Ambil yang tidak terlalu panjang dan belum ada di list
        if (clean.length > 10 && clean.length < 120) {
          if (!seededExamples.some(s => s.toLowerCase() === clean.toLowerCase()) &&
              !peerExamples.some(p => p.toLowerCase() === clean.toLowerCase())) {
            peerExamples.push(clean);
          }
        }
      }
    });
  }

  // Gabungkan contoh: utamakan seeder, lalu sertakan contoh riil rekan jika ada
  const combined = [...seededExamples, ...peerExamples.slice(0, 4)];

  return {
    matchedJabatan: matched || { nama: userJabatanText || "Umum", kategori: "Umum", contohKasaran: [] },
    examples: combined,
    allJabatanList: masterList
  };
}
