// Presets RHK (Rencana Hasil Kerja) & IKI (Indikator Kinerja Individu) untuk berbagai Jabatan ASN
// Berdasarkan PermenPAN-RB No. 6 Tahun 2022 & Standar BKN

export const ASN_PRESETS = [
  {
    id: "guru_ahli",
    title: "Guru (Ahli Pertama / Muda / Madya)",
    category: "Pendidikan",
    jabatanDefault: "Guru Ahli Pertama",
    unitKerjaDefault: "SMP Negeri 1 Pembina / Dinas Pendidikan",
    intervensiPimpinanDefault: "Meningkatnya kualitas mutu proses dan output pembelajaran peserta didik yang berkarakter Profil Pelajar Pancasila",
    rhkList: [
      {
        id: "rhk-g-1",
        jenis: "UTAMA",
        rhkPimpinan: "Terlaksananya pembelajaran bermutu sesuai kurikulum yang berlaku",
        rhkIndividu: "Terlaksananya perencanaan dan pelaksanaan pembelajaran, evaluasi dan penilaian hasil belajar, serta pelaksanaan tindak lanjut hasil penilaian pada mata pelajaran yang diampu",
        aspekList: [
          {
            id: "asp-1",
            aspek: "Kuantitas",
            indikator: "Jumlah perangkat pembelajaran (Modul Ajar/RPP, Silabus, LKPD) dan laporan evaluasi belajar yang disusun",
            target: "2 Dokumen / Semester (4 Laporan/Tahun)",
            satuan: "Dokumen/Laporan",
            buktiDukungDefault: "Modul Ajar, Silabus, Jadwal Mengajar, Lembar Penilaian Peserta Didik",
            realisasiDefault: "4 dokumen perangkat ajar dan laporan evaluasi telah tersusun lengkap sesuai kurikulum nasional"
          },
          {
            id: "asp-2",
            aspek: "Kualitas",
            indikator: "Tingkat kesesuaian modul ajar dengan capaian pembelajaran dan standar kompetensi peserta didik",
            target: "85 - 95%",
            satuan: "%",
            buktiDukungDefault: "Instrumen Telaah Modul Ajar oleh Kepala Sekolah/Pengawas, Raport Mutu",
            realisasiDefault: "Tercapai 92% berdasarkan hasil supervisi akademik oleh Kepala Sekolah"
          },
          {
            id: "asp-3",
            aspek: "Waktu",
            indikator: "Ketepatan waktu pelaksanaan kegiatan pembelajaran dan pelaporan hasil belajar siswa",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Jurnal Harian Mengajar, Rekapitulasi Presensi Kelas",
            realisasiDefault: "12 bulan pelaksanaan pembelajaran tuntas tepat jadwal kalender pendidikan"
          }
        ]
      },
      {
        id: "rhk-g-2",
        jenis: "UTAMA",
        rhkPimpinan: "Meningkatnya kompetensi dan prestasi akademik serta non-akademik peserta didik",
        rhkIndividu: "Terlaksananya program bimbingan belajar intensif, remedial, dan pengayaan bagi peserta didik guna optimalisasi capaian kompetensi",
        aspekList: [
          {
            id: "asp-4",
            aspek: "Kuantitas",
            indikator: "Jumlah program bimbingan, remedial, dan pengayaan yang terdokumentasi",
            target: "2 Laporan Semester",
            satuan: "Laporan",
            buktiDukungDefault: "Daftar Hadir Remedial/Pengayaan, Lembar Hasil Analisis Butir Soal",
            realisasiDefault: "2 laporan analisis hasil remedial dan pengayaan terselesaikan"
          },
          {
            id: "asp-5",
            aspek: "Kualitas",
            indikator: "Persentase peserta didik yang mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)",
            target: "85 - 90%",
            satuan: "%",
            buktiDukungDefault: "Buku Rekap Nilai Formatif & Sumatif, Ledger Nilai",
            realisasiDefault: "89% peserta didik melampaui standar KKTP yang ditetapkan"
          },
          {
            id: "asp-6",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyerahan laporan capaian belajar peserta didik pada akhir semester",
            target: "2 Kali Setahun",
            satuan: "Kali",
            buktiDukungDefault: "Tanda Terima Pembagian Buku Raport",
            realisasiDefault: "Tepat waktu diserahkan sebelum tanggal pembagian raport semester"
          }
        ]
      },
      {
        id: "rhk-g-3",
        jenis: "UTAMA",
        rhkPimpinan: "Meningkatnya profesionalisme dan kompetensi pendidik berkelanjutan",
        rhkIndividu: "Meningkatnya kompetensi pedagogik dan profesional melalui keikutsertaan dalam Pengembangan Keprofesian Berkelanjutan (PKB) / Diklat Fungsional / Komunitas Belajar (Kombel)",
        aspekList: [
          {
            id: "asp-7",
            aspek: "Kuantitas",
            indikator: "Jumlah sertifikat/laporan kegiatan diklat, workshop, webinar atau kegiatan Kombel yang diikuti",
            target: "3 - 5 Sertifikat / Laporan",
            satuan: "Sertifikat",
            buktiDukungDefault: "Sertifikat Pelatihan (min. 32 JP), Surat Tugas, Laporan Diseminasi Hasil Belajar",
            realisasiDefault: "4 sertifikat pelatihan PMM dan diklat teknis kependidikan diperoleh"
          },
          {
            id: "asp-8",
            aspek: "Kualitas",
            indikator: "Kesesuaian materi pelatihan dengan kebutuhan peningkatan mutu pembelajaran di kelas",
            target: "90 - 100%",
            satuan: "%",
            buktiDukungDefault: "Laporan Aksi Nyata PMM / Resume Pembelajaran",
            realisasiDefault: "100% materi pelatihan relevan dan telah diimplementasikan di kelas"
          },
          {
            id: "asp-9",
            aspek: "Waktu",
            indikator: "Ketepatan waktu pelaksanaan pengembangan diri sesuai jadwal kalender kerja",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Jadwal kegiatan Kombel / Undangan Diklat",
            realisasiDefault: "Terlaksana teratur sepanjang tahun anggaran"
          }
        ]
      },
      {
        id: "rhk-g-4",
        jenis: "TAMBAHAN",
        rhkPimpinan: "Tertatanya manajemen kesiswaan dan kelembagaan sekolah yang efektif",
        rhkIndividu: "Terlaksananya tugas tambahan sebagai Wali Kelas / Pembina Ekstrakurikuler / Koordinator P5",
        aspekList: [
          {
            id: "asp-10",
            aspek: "Kuantitas",
            indikator: "Jumlah laporan pelaksanaan tugas tambahan yang disahkan oleh Kepala Sekolah",
            target: "2 Laporan",
            satuan: "Laporan",
            buktiDukungDefault: "SK Pembagian Tugas Tambahan Kepala Sekolah, Laporan Pembinaan Kesiswaan",
            realisasiDefault: "2 laporan pembinaan kelas dan rekapitulasi konseling wali kelas tuntas"
          },
          {
            id: "asp-11",
            aspek: "Kualitas",
            indikator: "Persentase keterlaksanaan program kerja pembinaan wali kelas/ekstrakurikuler",
            target: "90 - 95%",
            satuan: "%",
            buktiDukungDefault: "Notula Rapat Orang Tua Siswa, Buku Catatan Bimbingan",
            realisasiDefault: "95% program kerja pendampingan kelas terlaksana dengan baik"
          },
          {
            id: "asp-12",
            aspek: "Waktu",
            indikator: "Ketepatan waktu masa periode penugasan",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "SK Penugasan Tahunan",
            realisasiDefault: "12 bulan pelaksanaan tugas tambahan selesai dengan akuntabel"
          }
        ]
      }
    ]
  },
  {
    id: "pranata_komputer",
    title: "Pranata Komputer (IT Specialist / SPBE)",
    category: "Teknologi Informasi",
    jabatanDefault: "Pranata Komputer Ahli Pertama",
    unitKerjaDefault: "Dinas Komunikasi, Informatika, dan Statistik",
    intervensiPimpinanDefault: "Meningkatnya Indeks Sistem Pemerintahan Berbasis Elektronik (SPBE) dan keterpaduan layanan publik digital",
    rhkList: [
      {
        id: "rhk-prakom-1",
        jenis: "UTAMA",
        rhkPimpinan: "Terwujudnya infrastruktur TIK dan sistem informasi pemerintahan yang andal dan terintegrasi",
        rhkIndividu: "Terlaksananya perancangan, pengembangan, dan implementasi modul aplikasi/sistem informasi instansi sesuai kebutuhan operasional unit kerja",
        aspekList: [
          {
            id: "asp-pk-1",
            aspek: "Kuantitas",
            indikator: "Jumlah modul sistem informasi / fitur aplikasi layanan digital yang dibangun dan diuji",
            target: "4 Modul / Aplikasi",
            satuan: "Modul",
            buktiDukungDefault: "Dokumen Spesifikasi Teknis (SRS), Source Code Repository, Berita Acara Uji Fungsi (UAT)",
            realisasiDefault: "4 modul aplikasi layanan mandiri berhasil diimplementasikan dan lulus pengujian UAT"
          },
          {
            id: "asp-pk-2",
            aspek: "Kualitas",
            indikator: "Tingkat keberhasilan fungsi sistem dan persentase ketiadaan error/bug kritikal saat rilis",
            target: "95 - 99%",
            satuan: "%",
            buktiDukungDefault: "Laporan Testing Bug Tracker, Log Uptime Server",
            realisasiDefault: "98% bebas bug dan siap operasional tanpa kendala sistem"
          },
          {
            id: "asp-pk-3",
            aspek: "Waktu",
            indikator: "Ketepatan waktu siklus deployment dan pelaporan progres pengembangan",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Timeline Project / Changelog Rilis",
            realisasiDefault: "Tepat waktu sesuai jadwal rilis sprint pengembangan"
          }
        ]
      },
      {
        id: "rhk-prakom-2",
        jenis: "UTAMA",
        rhkPimpinan: "Terjaminnya ketersediaan, integritas, dan keamanan aset informasi instansi",
        rhkIndividu: "Terlaksananya pemeliharaan server, basis data, jaringan komunikasi data, serta penerapan prosedur backup dan keamanan siber berkala",
        aspekList: [
          {
            id: "asp-pk-4",
            aspek: "Kuantitas",
            indikator: "Jumlah laporan pemeliharaan infrastruktur TIK dan log pelaksanaan backup berkala data instansi",
            target: "12 Laporan Bulanan",
            satuan: "Laporan",
            buktiDukungDefault: "Logbook Pemeliharaan Server, Bukti Verifikasi Restore Backup, Laporan Monitoring Jaringan",
            realisasiDefault: "12 laporan bulanan pemeliharaan dan verifikasi integritas backup tuntas"
          },
          {
            id: "asp-pk-5",
            aspek: "Kualitas",
            indikator: "Persentase ketersediaan sistem (Service Level Agreement - SLA Uptime)",
            target: "98 - 99.5%",
            satuan: "%",
            buktiDukungDefault: "Laporan Uptime Monitoring Tool / Dashboard Grafana",
            realisasiDefault: "SLA uptime tercapai 99.2% melampaui target minimum"
          },
          {
            id: "asp-pk-6",
            aspek: "Waktu",
            indikator: "Waktu tanggap (response time) penanganan insiden teknis TIK",
            target: "< 2 Jam per insiden",
            satuan: "Jam",
            buktiDukungDefault: "Ticket Helpdesk IT, Log Penyelesaian Insiden",
            realisasiDefault: "Rata-rata waktu tanggap 45 menit untuk seluruh tiket gangguan"
          }
        ]
      },
      {
        id: "rhk-prakom-3",
        jenis: "UTAMA",
        rhkPimpinan: "Meningkatnya literasi digital dan kepatuhan standar keamanan informasi pegawai instansi",
        rhkIndividu: "Terlaksananya bimbingan teknis, pendampingan user, dan penyusunan panduan pengguna (User Manual) sistem aplikasi instansi",
        aspekList: [
          {
            id: "asp-pk-7",
            aspek: "Kuantitas",
            indikator: "Jumlah dokumen SOP / User Manual dan sesi pendampingan operasional sistem bagi ASN",
            target: "4 Buku Panduan / Sesi",
            satuan: "Dokumen",
            buktiDukungDefault: "Buku Petunjuk Pengoperasian Aplikasi (BPP), Daftar Hadir Sosialisasi/Bimtek",
            realisasiDefault: "4 dokumen panduan pengguna telah disahkan dan didistribusikan"
          },
          {
            id: "asp-pk-8",
            aspek: "Kualitas",
            indikator: "Tingkat pemahaman dan kepuasan pengguna terhadap pendampingan teknis TIK",
            target: "85 - 90%",
            satuan: "%",
            buktiDukungDefault: "Kuesioner Evaluasi Kepuasan Pengguna Layanan IT",
            realisasiDefault: "Skor survei kepuasan mencapai 91% (Sangat Baik)"
          },
          {
            id: "asp-pk-9",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyediaan materi panduan sebelum sistem beroperasi",
            target: "Sesuai Jadwal Rilis",
            satuan: "Hari/Bulan",
            buktiDukungDefault: "Notula Serah Terima Aplikasi",
            realisasiDefault: "Materi panduan tersedia 7 hari sebelum peluncuran resmi sistem"
          }
        ]
      }
    ]
  },
  {
    id: "tenaga_kesehatan_perawat",
    title: "Tenaga Kesehatan (Perawat / Bidan / Fasyankes)",
    category: "Kesehatan",
    jabatanDefault: "Perawat Ahli Pertama",
    unitKerjaDefault: "RSUD / UPTD Puskesmas Rawat Inap",
    intervensiPimpinanDefault: "Meningkatnya mutu pelayanan kesehatan rujukan dan keselamatan pasien (Patient Safety) sesuai standar akreditasi",
    rhkList: [
      {
        id: "rhk-nakes-1",
        jenis: "UTAMA",
        rhkPimpinan: "Terlaksananya pelayanan asuhan keperawatan yang komprehensif dan berorientasi pada keselamatan pasien",
        rhkIndividu: "Terlaksananya pengkajian keperawatan, perumusan diagnosa, perencanaan, implementasi tindakan keperawatan mandiri/kolaboratif, dan evaluasi pada pasien rawat inap/jalan",
        aspekList: [
          {
            id: "asp-nk-1",
            aspek: "Kuantitas",
            indikator: "Jumlah berkas catatan asuhan keperawatan terstandar dan tindakan medis yang dilaksanakan",
            target: "300 - 500 Berkas Pasien",
            satuan: "Berkas/Pasien",
            buktiDukungDefault: "Formulir Catatan Perkembangan Pasien Terintegrasi (CPPT), Logbook Harian Keperawatan",
            realisasiDefault: "420 berkas CPPT pasien rawat inap terselesaikan secara akurat"
          },
          {
            id: "asp-nk-2",
            aspek: "Kualitas",
            indikator: "Tingkat kepatuhan penerapan Sasaran Keselamatan Pasien (SKP) dan ketiadaan kejadian tidak diharapkan",
            target: "95 - 100%",
            satuan: "%",
            buktiDukungDefault: "Form Audit Rekam Medis Keperawatan, Laporan Insiden Keselamatan Pasien (IKP)",
            realisasiDefault: "Kepatuhan SOP keselamatan pasien 98% tanpa insiden medis"
          },
          {
            id: "asp-nk-3",
            aspek: "Waktu",
            indikator: "Ketepatan waktu pendokumentasian rekam medis segera setelah tindakan diberikan",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Timestamp Rekam Medis Elektronik (RME) / Tanda Tangan CPPT",
            realisasiDefault: "100% pendokumentasian tercatat secara real-time"
          }
        ]
      },
      {
        id: "rhk-nakes-2",
        jenis: "UTAMA",
        rhkPimpinan: "Meningkatnya cakupan program promotif dan preventif kesehatan masyarakat",
        rhkIndividu: "Terlaksananya kegiatan edukasi kesehatan, penyuluhan pencegahan penyakit menular/tidak menular, dan penatalaksanaan skrining kesehatan dasar",
        aspekList: [
          {
            id: "asp-nk-4",
            aspek: "Kuantitas",
            indikator: "Jumlah kegiatan penyuluhan kesehatan individu/kelompok dan laporan skrining kesehatan",
            target: "12 Kegiatan / Laporan",
            satuan: "Kegiatan",
            buktiDukungDefault: "Daftar Hadir Penyuluhan, Satuan Acara Penyuluhan (SAP), Foto Dokumentasi, Form Skrining",
            realisasiDefault: "12 sesi edukasi kesehatan pasien & keluarga terlaksana lengkap"
          },
          {
            id: "asp-nk-5",
            aspek: "Kualitas",
            indikator: "Persentase pemahaman pasien terhadap materi edukasi pola hidup bersih dan sehat",
            target: "85 - 90%",
            satuan: "%",
            buktiDukungDefault: "Lembar Evaluasi Pemahaman Edukasi Terintegrasi",
            realisasiDefault: "88% pasien memahami edukasi perawatan mandiri pasca rawat"
          },
          {
            id: "asp-nk-6",
            aspek: "Waktu",
            indikator: "Ketepatan waktu pelaksanaan program sesuai jadwal bulanan",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Jadwal Tugas Pelayanan Ruangan",
            realisasiDefault: "Sesuai jadwal dinas shift dan kalender kerja puskesmas"
          }
        ]
      },
      {
        id: "rhk-nakes-3",
        jenis: "TAMBAHAN",
        rhkPimpinan: "Terpenuhinya standar akreditasi dan peningkatan mutu fasilitas pelayanan kesehatan",
        rhkIndividu: "Terlaksananya peran aktif sebagai anggota Tim Pencegahan dan Pengendalian Infeksi (PPI) / Tim Mutu Akreditasi Fasyankes",
        aspekList: [
          {
            id: "asp-nk-7",
            aspek: "Kuantitas",
            indikator: "Jumlah laporan audit kepatuhan kebersihan tangan (Hand Hygiene) dan audit PPI ruangan",
            target: "4 Laporan Triwulanan",
            satuan: "Laporan",
            buktiDukungDefault: "SK Tim PPI/Mutu dari Direktur/Kepala Fasyankes, Lembar Audit Kepatuhan Hand Hygiene",
            realisasiDefault: "4 laporan audit triwulanan kepatuhan PPI diserahkan ke komite mutu"
          },
          {
            id: "asp-nk-8",
            aspek: "Kualitas",
            indikator: "Tingkat kesesuaian tindakan sterilisasi dan penanganan limbah medis dengan standar PPI",
            target: "95 - 100%",
            satuan: "%",
            buktiDukungDefault: "Hasil Audit Mutu Internal",
            realisasiDefault: "Tercapai 97% kepatuhan standar PPI di unit kerja"
          },
          {
            id: "asp-nk-9",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyampaian rekomendasi hasil audit mutu",
            target: "Setiap Akhir Triwulan",
            satuan: "Triwulan",
            buktiDukungDefault: "Notula Rapat Komite Medis / Mutu",
            realisasiDefault: "Laporan diserahkan tepat waktu pada forum rapat tinjauan manajemen"
          }
        ]
      }
    ]
  },
  {
    id: "pengadministrasi_perkantoran",
    title: "Pengadministrasi Perkantoran / Pelaksana Umum",
    category: "Administrasi & Umum",
    jabatanDefault: "Pengadministrasi Perkantoran",
    unitKerjaDefault: "Bagian Umum dan Kepegawaian / Sekretariat",
    intervensiPimpinanDefault: "Terwujudnya tata kelola persuratan, kearsipan, dan pelayanan administrasi perkantoran yang tertib, cepat, dan akuntabel",
    rhkList: [
      {
        id: "rhk-adm-1",
        jenis: "UTAMA",
        rhkPimpinan: "Terwujudnya efektivitas tata kelola naskah dinas dan persuratan instansi",
        rhkIndividu: "Terlaksananya pengelolaan registrasi, verifikasi, distribusi, dan pengarsipan surat masuk dan surat keluar melalui aplikasi persuratan kedinasan (Srikandi / E-Office)",
        aspekList: [
          {
            id: "asp-adm-1",
            aspek: "Kuantitas",
            indikator: "Jumlah surat dinas masuk dan keluar yang diproses, diberi nomor agenda, dan didistribusikan",
            target: "1000 - 1500 Surat / Berkas",
            satuan: "Surat",
            buktiDukungDefault: "Buku Agenda Surat Masuk/Keluar, Log Tracking Aplikasi Srikandi, Ekspedisi Tanda Terima",
            realisasiDefault: "1.250 surat masuk dan keluar telah tuntas diproses dan terdistribusi ke unit terkait"
          },
          {
            id: "asp-adm-2",
            aspek: "Kualitas",
            indikator: "Tingkat ketepatan tujuan distribusi surat dinas dan ketiadaan surat yang tertunda/salah alamat",
            target: "98 - 100%",
            satuan: "%",
            buktiDukungDefault: "Laporan Evaluasi Ketepatan Distribusi Naskah Dinas",
            realisasiDefault: "99.5% surat didistribusikan tanpa kekeliruan disposisi"
          },
          {
            id: "asp-adm-3",
            aspek: "Waktu",
            indikator: "Waktu pemrosesan penerimaan hingga penyampaian surat dinas kepada pimpinan",
            target: "Maksimal 1 Hari Kerja",
            satuan: "Hari",
            buktiDukungDefault: "Lembar Disposisi Elektronik",
            realisasiDefault: "Rata-rata disposisi tersampaikan dalam kurun waktu 3 jam setelah diterima"
          }
        ]
      },
      {
        id: "rhk-adm-2",
        jenis: "UTAMA",
        rhkPimpinan: "Tertatanya sarana administrasi dan kearsipan unit kerja sesuai kaidah kearsipan",
        rhkIndividu: "Terlaksananya penataan arsip aktif dan inaktif, pemberkasan dokumen pertanggungjawaban kegiatan, serta pembuatan daftar inventaris arsip",
        aspekList: [
          {
            id: "asp-adm-4",
            aspek: "Kuantitas",
            indikator: "Jumlah berkas arsip yang diklasifikasikan dan disusun ke dalam filing cabinet / boks arsip",
            target: "12 Laporan Rekapitulasi Berkas",
            satuan: "Laporan",
            buktiDukungDefault: "Daftar Pertelaan Arsip (DPA), Berita Acara Penataan Arsip, Labelisasi Boks Arsip",
            realisasiDefault: "12 rekapitulasi penataan arsip bulanan selesai sesuai pedoman ANRI"
          },
          {
            id: "asp-adm-5",
            aspek: "Kualitas",
            indikator: "Kemudahan dan kecepatan penemuan kembali (retrieval) berkas arsip dinas yang dibutuhkan",
            target: "< 5 Menit penemuan berkas",
            satuan: "Menit",
            buktiDukungDefault: "Log Peminjaman Arsip Kantor",
            realisasiDefault: "Sistem pengindeksan memudahkan penemuan berkas di bawah 3 menit"
          },
          {
            id: "asp-adm-6",
            aspek: "Waktu",
            indikator: "Ketepatan periode pemeliharaan dan pembaruan buku inventaris arsip",
            target: "12 Bulan",
            satuan: "Bulan",
            buktiDukungDefault: "Buku Register Arsip Aktif",
            realisasiDefault: "Konsisten diperbarui setiap akhir bulan kerja"
          }
        ]
      },
      {
        id: "rhk-adm-3",
        jenis: "UTAMA",
        rhkPimpinan: "Terselenggaranya fasilitasi rapat kedinasan dan keprotokolan yang optimal",
        rhkIndividu: "Terlaksananya penyiapan administrasi pertemuan kedinasan, penyusunan daftar hadir, notula rapat, dan fasilitasi akomodasi kedinasan pimpinan",
        aspekList: [
          {
            id: "asp-adm-7",
            aspek: "Kuantitas",
            indikator: "Jumlah dokumen fasilitasi rapat dinas (Undangan, Notula, Absensi, Dokumentasi Foto)",
            target: "24 - 36 Berkas Notula Rapat",
            satuan: "Berkas Rapat",
            buktiDukungDefault: "Undangan Rapat, Notula Rapat, Daftar Hadir Peserta, Foto Dokumentasi Rapat",
            realisasiDefault: "30 berkas notula rapat kedinasan selesai disusun rapi"
          },
          {
            id: "asp-adm-8",
            aspek: "Kualitas",
            indikator: "Kelengkapan dan kejelasan butir-butir kesepakatan notula rapat tindak lanjut",
            target: "90 - 95%",
            satuan: "%",
            buktiDukungDefault: "Pengesahan Notula oleh Pimpinan Rapat",
            realisasiDefault: "Seluruh notula telah diverifikasi dan disetujui pimpinan"
          },
          {
            id: "asp-adm-9",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyelesaian notula rapat paling lambat H+1 setelah rapat selesai",
            target: "1 Hari Kerja",
            satuan: "Hari",
            buktiDukungDefault: "Tanda Terima Distribusi Notula Rapat",
            realisasiDefault: "100% notula tuntas didistribusikan dalam waktu 24 jam"
          }
        ]
      }
    ]
  },
  {
    id: "analis_kebijakan",
    title: "Analis Kebijakan / Perencana Ahli",
    category: "Perencanaan & Analisis",
    jabatanDefault: "Analis Kebijakan Ahli Pertama",
    unitKerjaDefault: "Badan Perencanaan Pembangunan Daerah / Biro Organisasi",
    intervensiPimpinanDefault: "Meningkatnya kualitas perumusan kebijakan publik dan dokumen perencanaan pembangunan berbasis data dan bukti (evidence-based)",
    rhkList: [
      {
        id: "rhk-ak-1",
        jenis: "UTAMA",
        rhkPimpinan: "Tersusunnya dokumen perencanaan pembangunan daerah / renstra instansi yang akuntabel",
        rhkIndividu: "Terlaksananya pengumpulan bahan, pengolahan data makro/sektoral, dan penyusunan draf dokumen perencanaan program tahunan (Renja / RKT)",
        aspekList: [
          {
            id: "asp-ak-1",
            aspek: "Kuantitas",
            indikator: "Jumlah dokumen perencanaan program dan anggaran tahunan yang tersusun",
            target: "1 Dokumen Rencana Kerja (Renja)",
            satuan: "Dokumen",
            buktiDukungDefault: "Draft Renja, Matriks Kerangka Pendanaan, Rekapitulasi Usulan Indikator Program",
            realisasiDefault: "1 Dokumen Renja telah selesai dan disinkronkan dengan target RPJMD"
          },
          {
            id: "asp-ak-2",
            aspek: "Kualitas",
            indikator: "Tingkat keselarasan cascading indikator kinerja Renja dengan sasaran strategis pimpinan",
            target: "90 - 100%",
            satuan: "%",
            buktiDukungDefault: "Matriks Cascading Kinerja, Berita Acara Review Inspektorat/Bappeda",
            realisasiDefault: "Cascading program selaras 95% dengan target IKU pimpinan"
          },
          {
            id: "asp-ak-3",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyampaian dokumen sesuai siklus perencanaan pembangunan",
            target: "Sesuai Jadwal Musrenbang",
            satuan: "Bulan",
            buktiDukungDefault: "Surat Pengantar Penyampaian Dokumen Renja",
            realisasiDefault: "Tepat waktu diserahkan sebelum batas akhir input SIPD"
          }
        ]
      },
      {
        id: "rhk-ak-2",
        jenis: "UTAMA",
        rhkPimpinan: "Terwujudnya rekomendasi kebijakan strategis yang berbasis bukti dan analisis komprehensif",
        rhkIndividu: "Terlaksananya analisis telaahan staf, policy brief, dan perumusan rekomendasi pemecahan isu strategis pelayanan publik",
        aspekList: [
          {
            id: "asp-ak-4",
            aspek: "Kuantitas",
            indikator: "Jumlah naskah rekomendasi kebijakan / policy brief / telaahan staf yang dihasilkan",
            target: "4 Naskah Policy Brief",
            satuan: "Naskah",
            buktiDukungDefault: "Naskah Policy Brief, Lembar Telaahan Staf kepada Pimpinan, Hasil FGD Stakeholder",
            realisasiDefault: "4 naskah telaahan kebijakan publik telah diserahkan dan ditindaklanjuti"
          },
          {
            id: "asp-ak-5",
            aspek: "Kualitas",
            indikator: "Persentase rekomendasi yang diadopsi atau mendapat arahan tindak lanjut dari pimpinan",
            target: "80 - 90%",
            satuan: "%",
            buktiDukungDefault: "Disposisi dan Catatan Arahan Pimpinan atas Telaahan",
            realisasiDefault: "85% substansi rekomendasi diadopsi dalam SOP dinas terbaru"
          },
          {
            id: "asp-ak-6",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyelesaian kajian sesuai target triwulanan",
            target: "4 Triwulan",
            satuan: "Triwulan",
            buktiDukungDefault: "Laporan Evaluasi Pelaksanaan Tugas Analisis",
            realisasiDefault: "Tepat waktu terselesaikan di tiap akhir triwulan"
          }
        ]
      },
      {
        id: "rhk-ak-3",
        jenis: "UTAMA",
        rhkPimpinan: "Terukurnya capaian kinerja organisasi dan efektivitas belanja program kegiatan",
        rhkIndividu: "Terlaksananya monitoring, evaluasi berkala, dan penyusunan Laporan Kinerja Instansi Pemerintah (LKjIP / LAKIP)",
        aspekList: [
          {
            id: "asp-ak-7",
            aspek: "Kuantitas",
            indikator: "Jumlah laporan evaluasi capaian kinerja triwulanan dan dokumen LAKIP tahunan",
            target: "4 Laporan Triwulan + 1 LKjIP Tahunan",
            satuan: "Laporan",
            buktiDukungDefault: "Dokumen LKjIP Tahunan, Laporan Monev Realisasi Renja Triwulanan, Lembar Verifikasi SAKIP",
            realisasiDefault: "Laporan evaluasi triwulanan 1-4 dan 1 LKjIP tersusun lengkap"
          },
          {
            id: "asp-ak-8",
            aspek: "Kualitas",
            indikator: "Predikat dan nilai evaluasi akuntabilitas kinerja instansi (SAKIP)",
            target: "Nilai SAKIP Kategori A / BB",
            satuan: "Predikat",
            buktiDukungDefault: "Laporan Hasil Evaluasi (LHE) SAKIP dari Inspektorat/KemenPAN-RB",
            realisasiDefault: "Nilai SAKIP unit kerja memperoleh predikat SANGAT BAIK (BB)"
          },
          {
            id: "asp-ak-9",
            aspek: "Waktu",
            indikator: "Ketepatan batas waktu upload dokumen LAKIP ke aplikasi pelaporan kinerja nasional",
            target: "Bulan Maret Tahun Berjalan",
            satuan: "Bulan",
            buktiDukungDefault: "Bukti Unggah Aplikasi esr.menpan.go.id",
            realisasiDefault: "Berhasil diunggah sebelum tanggal 31 Maret"
          }
        ]
      }
    ]
  },
  {
    id: "pengelola_keuangan",
    title: "Pengelola Keuangan / Bendahara Pengeluaran",
    category: "Keuangan & Anggaran",
    jabatanDefault: "Bendahara Pengeluaran / Pengelola Keuangan",
    unitKerjaDefault: "Subbagian Keuangan dan Pengelolaan Aset",
    intervensiPimpinanDefault: "Terwujudnya pengelolaan perbendaharaan dan realisasi APBD/APBN yang taat asas, tertib administrasi, dan berpredikat WTP",
    rhkList: [
      {
        id: "rhk-keu-1",
        jenis: "UTAMA",
        rhkPimpinan: "Terlaksananya pengelolaan kas dan pertanggungjawaban belanja negara/daerah yang akuntabel",
        rhkIndividu: "Terlaksananya penerimaan, penyimpanan, pembayaran, pengujian keabsahan bukti tagihan (SPJ), dan penatausahaan kas perbendaharaan",
        aspekList: [
          {
            id: "asp-keu-1",
            aspek: "Kuantitas",
            indikator: "Jumlah berkas Surat Pertanggungjawaban (SPJ) belanja UP/GU/TU/LS yang diverifikasi dan dibukukan",
            target: "12 Buku Kas Umum (BKU) & LPJ",
            satuan: "Berkas LPJ",
            buktiDukungDefault: "Buku Kas Umum (BKU), Buku Pembantu Kas, Rekening Koran Bank, Berita Acara Penutupan Kas",
            realisasiDefault: "12 laporan pertanggungjawaban BKU bulanan disahkan Pengguna Anggaran"
          },
          {
            id: "asp-keu-2",
            aspek: "Kualitas",
            indikator: "Tingkat kepatuhan kelengkapan bukti kuitansi dan persentase nihil selisih saldo kas fisik dengan BKU",
            target: "100% Cocok (0 Selisih)",
            satuan: "%",
            buktiDukungDefault: "Berita Acara Pemeriksaan Kas (Cash Count) oleh Pejabat Penilai / Inspektorat",
            realisasiDefault: "100% saldo kas fisik akurat sesuai pembukuan tanpa temuan selisih"
          },
          {
            id: "asp-keu-3",
            aspek: "Waktu",
            indikator: "Ketepatan waktu penyampaian Laporan Pertanggungjawaban (LPJ) Bendahara ke KPPN / BPKAD",
            target: "Tanggal 10 Tiap Bulan",
            satuan: "Hari/Bulan",
            buktiDukungDefault: "Surat Bukti Penerimaan LPJ dari KPPN / BPKAD",
            realisasiDefault: "Selalu disampaikan sebelum batas tanggal 10 setiap awal bulan"
          }
        ]
      },
      {
        id: "rhk-keu-2",
        jenis: "UTAMA",
        rhkPimpinan: "Kepatuhan terhadap kewajiban perpajakan instansi pemerintah",
        rhkIndividu: "Terlaksananya pemotongan, penyetoran, dan pelaporan Surat Pemberitahuan (SPT) Masa Pajak PPh dan PPN atas transaksi belanja kedinasan",
        aspekList: [
          {
            id: "asp-keu-4",
            aspek: "Kuantitas",
            indikator: "Jumlah bukti setor pajak (BPN) dan bukti potong pajak elektronik (e-Bupot) yang diterbitkan",
            target: "12 Laporan SPT Masa Pajak",
            satuan: "Laporan",
            buktiDukungDefault: "Bukti Penerimaan Negara (BPN), Bukti Potong Pajak e-Bupot Unifikasi, Bukti Lapor SPT Masa",
            realisasiDefault: "12 masa pajak disetorkan dan dilaporkan ke Direktorat Jenderal Pajak"
          },
          {
            id: "asp-keu-5",
            aspek: "Kualitas",
            indikator: "Ketepatan penghitungan tarif pajak dan ketiadaan sanksi denda keterlambatan setor pajak",
            target: "100% Tepat Tarif & Nihil Denda",
            satuan: "%",
            buktiDukungDefault: "Rekapitulasi Setoran Pajak Terverifikasi",
            realisasiDefault: "100% pajak disetor tepat tarif dan tanpa sanksi denda administrasi"
          },
          {
            id: "asp-keu-6",
            aspek: "Waktu",
            indikator: "Ketepatan batas waktu penyetoran pajak setelah pembayaran transaksi belanja dilakukan",
            target: "Maksimal 7 Hari Kerja",
            satuan: "Hari",
            buktiDukungDefault: "Kode Billing Pajak dan Bukti Transaksi",
            realisasiDefault: "Pajak langsung disetor pada hari yang sama saat penerbitan SP2D"
          }
        ]
      }
    ]
  }
];

// Bank kalimat rekomendasi Ekspektasi Khusus Pimpinan (EKP) untuk BerAKHLAK berdasarkan Jabatan
export const BERAKHLAK_EKP_BY_ROLE = {
  guru: {
    berorientasi_pelayanan: "Memberikan pelayanan pembelajaran yang ramah anak, sabar, adaptif terhadap kebutuhan individual siswa, dan responsif berkomunikasi dengan wali murid.",
    akuntabel: "Disiplin hadir di kelas tepat waktu, transparan dalam mengolah nilai raport, serta menjaga integritas integritas dalam pelaksanaan ujian sekolah.",
    kompeten: "Aktif mempelajari metode pengajaran interaktif modern, membagikan praktik baik (best practice) di forum KKG/MGMP, dan memanfaatkan Platform Merdeka Mengajar (PMM).",
    harmonis: "Membangun iklim kelas yang inklusif, menghargai perbedaan latar belakang murid, serta menjaga soliditas dan keharmonisan di ruang guru.",
    loyal: "Mendukung penuh kebijakan kepala sekolah dan dinas pendidikan, serta menjaga marwah dan kehormatan profesi guru di dalam maupun di luar sekolah.",
    adaptif: "Cepat menguasai aplikasi pembelajaran digital (Canva for Education, Google Classroom, AI kependidikan) dan kreatif mengemas materi ajar.",
    kolaboratif: "Sinergis bekerja sama dengan guru mata pelajaran lain, komite sekolah, dan orang tua dalam mendukung suksesnya program P5 dan kegiatan sekolah."
  },
  prakom: {
    berorientasi_pelayanan: "Memberikan pendampingan teknis helpdesk IT dengan ramah, komunikatif, solutif, dan cepat merespons keluhan pengguna sistem informasi di lingkungan instansi.",
    akuntabel: "Menjaga keandalan sistem informasi dan kerahasiaan data penting institusi secara berintegritas tanpa penyalahgunaan hak akses administratif (root).",
    kompeten: "Konsisten memperbarui keterampilan arsitektur cloud, pemrograman modern, keamanan siber, dan bersedia mentransfer ilmu kepada rekan sejawat.",
    harmonis: "Membangun hubungan koordinasi yang cair dengan user non-teknis, sabar menerangkan istilah IT, dan memupuk kerja tim yang kompak.",
    loyal: "Siap siaga dalam penanganan insiden darurat siber (cyber incident) bahkan di luar jam dinas demi menjaga kelangsungan layanan publik instansi.",
    adaptif: "Cepat mengadopsi perkembangan arsitektur AI, DevOps, microservices, dan proaktif memberi rekomendasi modernisasi teknologi tepat guna.",
    kolaboratif: "Aktif menjalin integrasi API data antar OPD / unit kerja dan berkolaborasi erat dengan tim pengembang eksternal demi suksesnya SPBE terpadu."
  },
  nakes: {
    berorientasi_pelayanan: "Menerapkan prinsip 5S (Senyum, Salam, Sapa, Sopan, Santun), mendengarkan keluhan pasien dengan empati, dan sigap dalam situasi gawat darurat.",
    akuntabel: "Mencatat rekam medis dengan akurat, jujur, tertib dosis, dan bertanggung jawab penuh atas seluruh tindakan medis/asuhan keperawatan yang didelegasikan.",
    kompeten: "Mengikuti seminar/pelatihan update kompetensi medis/keperawatan (CPD) dan menerapkan clinical pathway terkini demi keselamatan pasien.",
    harmonis: "Bekerja secara humanis, tidak diskriminatif dalam melayani pasien dari seluruh tingkatan sosial, serta menjaga iklim kerja yang kompak antar tenaga medis.",
    loyal: "Menjaga rahasia medis pasien sesuai sumpah jabatan dan berkomitmen menjaga nama baik rumah sakit/puskesmas.",
    adaptif: "Cepat beradaptasi dalam penggunaan Rekam Medis Elektronik (RME) dan sigap merespons perubahan protokol kesehatan dari Kementerian Kesehatan.",
    kolaboratif: "Membangun komunikasi interprofesional yang efektif (metode SBAR) antara dokter, perawat, apoteker, laboratorium, dan gizi."
  },
  umum: {
    berorientasi_pelayanan: "Selalu mengedepankan keramahan, kecepatan, dan ketuntasan solusi dalam memberikan pelayanan administrasi bagi pegawai internal maupun masyarakat luas.",
    akuntabel: "Bekerja dengan cermat, memegang teguh kejujuran, disiplin jam kerja, dan bertanggung jawab penuh atas barang milik negara (BMN) yang dikelola.",
    kompeten: "Terus meningkatkan kapabilitas diri melalui pembelajaran mandiri, tanggap terhadap regulasi baru, dan selalu berusaha menyajikan hasil kerja tanpa cacat.",
    harmonis: "Saling peduli, bersikap santun, menghargai keberagaman pendapat dalam rapat, dan sigap mengulurkan bantuan pada rekan tim yang sedang mengalami beban kerja tinggi.",
    loyal: "Menjaga etika aparatur sipil negara, menjunjung tinggi integritas instansi, serta memprioritaskan penuntasan tugas prioritas kedinasan.",
    adaptif: "Antusias mempelajari sistem digital baru perkantoran (e-office, Srikandi, SIMPEG) dan fleksibel saat terjadi restrukturisasi alur penugasan.",
    kolaboratif: "Proaktif berkoordinasi lintas seksi/bidang guna percepatan penyelesaian program kerja dan selalu terbuka terhadap masukan yang konstruktif."
  }
};
