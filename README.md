# Laporan Kinerja AI 🚀

Aplikasi cerdas pelaporan kinerja harian dan bulanan pegawai/ASN berbasis AI. Membantu pegawai mencatat aktivitas kerja harian apa adanya dengan bahasa santai / kasaran, kemudian otomatis dipoles oleh kecerdasan buatan (Gemini AI) menjadi narasi formal kedinasan standar ASN beserta penentuan hasil/output kerja yang terukur, serta langsung menghasilkan Laporan Bulanan resmi siap cetak A4/PDF dan integrasi tautan Google Drive.

---

## ✨ Fitur Unggulan

1. **📝 Catatan Harian Kasaran & Pemoles AI ASN**:
   - Pegawai cukup mengetik catatan tugas apa adanya (misal: *"tadi benerin wifi guru yg mati trs cek mikrotik lab"*).
   - Tombol **`✨ AI Poles Jadi Bahasa Formal ASN`** mengubah kalimat menjadi narasi formal kedinasan yang baku dan santun.
   - Otomatis menentukan **Output Kegiatan** (misal: *1 Berkas Berita Acara Perbaikan*).
   - Lampirkan dokumentasi foto atau berkas digital.
   - Masukkan tautan online (Google Drive / Cloud Folder).

2. **📄 Laporan Bulanan (PDF & Google Drive)**:
   - Format tabel bersih tanpa kop surat dan tanpa TTD rumit.
   - Terdiri dari:
     - **I. DATA PEGAWAI** (Nama Lengkap, NIP, Pangkat/Golongan, Jabatan, Unit Kerja).
     - **II. TABEL KEGIATAN & FOTO DOKUMENTASI** (No, Hari/Tanggal, Uraian Tugas Kedinasan, Output, Foto & Tautan Google Drive).
   - Tombol **`🖨️ Cetak / Simpan PDF (A4)`** siap cetak dokumen resmi.
   - Tautan Google Drive aktif dan dapat diklik langsung di PDF maupun terbaca di cetak fisik.

3. **🗄️ Database Akun & Seeder Superadmin**:
   - Multi-user management dengan role `superadmin` dan `pegawai`.
   - Kata sandi Superadmin dapat disetel / direset secara aman dari CLI Terminal Server via `npm run reset-admin <password_baru>`.
   - Panel Superadmin untuk mengelola, menambah, mengubah, mereset password, dan menghapus akun pegawai.

4. **📊 Template & Impor Massal Akun via Excel (.xlsx)**:
   - Tombol **`📥 Unduh Template Excel (.xlsx)`** menghasilkan file template resmi `Template_Import_Akun_Pegawai.xlsx` dengan contoh pengisian data.
   - Tombol **`📂 Impor Excel Pegawai`** untuk mendaftarkan puluhan hingga ratusan akun pegawai baru secara instan.

5. **🛡️ Setup Wajib Identitas Awal**:
   - Akun baru yang belum memiliki kelengkapan NIP, Pangkat, Jabatan, atau Unit Kerja akan otomatis diarahkan untuk melengkapi identitasnya terlebih dahulu sebelum mulai mencatat kinerja.

6. **🧭 Navigasi & URL Khusus Setiap Bagian**:
   - `#/home` ➔ Beranda & Ringkasan Dashboard
   - `#/jurnal` ➔ Jurnal & Bukti Foto (Input Kasaran + AI Poles)
   - `#/laporan` ➔ Laporan Bulanan (PDF & Drive)
   - Mendukung tombol Back / Forward browser serta refresh tanpa kehilangan halaman.

---

## 🛠️ Cara Menjalankan

```bash
# 1. Instalasi dependensi
npm install

# 2. Jalankan server pengembangan lokal
npm run dev

# 3. Bangun paket produksi (build)
npm run build
```

---

## 🤖 Bot Telegram E-Kinerja AI (Input Jurnal & Unduh PDF Tanpa Web)

Aplikasi telah dilengkapi integrasi **Bot Telegram** penuh sehingga pegawai ASN terdaftar dapat mencatat jurnal dan meminta laporan PDF bulanan langsung melalui Telegram:

1. **Konfigurasi di `.env`**:
   ```env
   # Token didapatkan dari @BotFather di Telegram (perintah: /newbot)
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567
   TELEGRAM_BOT_USERNAME=ekinerja_ai_bot
   ```

2. **Menjalankan Bot**:
   ```bash
   npm run bot
   ```

3. **Perintah & Alur Bot Telegram**:
   - `/start` atau `/help` ➔ Panduan dan menu bot.
   - `/login <username> <password>` ➔ Masuk menggunakan akun pegawai terdaftar.
   - `/setprofil <NIP> | <Pangkat> | <Jabatan> | <Unit Kerja>` ➔ **Wajib Lengkapi Data Diri** jika akun baru belum memiliki data ASN lengkap sebelum dapat membuat jurnal/laporan (atau cukup ketik `/setprofil` untuk panduan interaktif bertahap).
   - **Kirim Pesan Teks Santai** ➔ AI otomatis memoles catatan menjadi uraian formal ASN, menentukan output terukur, dan menyimpannya ke logbook.
   - `/jurnal` ➔ Menampilkan 5 jurnal aktivitas terbaru.
   - `/laporan [bulan] [tahun]` ➔ Bot mengompilasi dan langsung mengirimkan dokumen PDF resmi A4 standar BKN (contoh: `/laporan Juli 2026`).
   - `/profil` ➔ Informasi data identitas pegawai aktif dan status kelengkapan data diri.
   - `/batal` ➔ Membatalkan proses pengisian data diri interaktif.
   - `/logout` ➔ Mengakhiri sesi akun.

> [!IMPORTANT]
> **Kebijakan Wajib Lengkapi Data Diri**:
> Jika akun pegawai belum memiliki NIP valid, Pangkat, Jabatan, atau Unit Kerja (misalnya akun hasil impor Excel massal dengan data minimal), bot Telegram akan secara otomatis menangguhkan pembuatan jurnal dan permintaan PDF hingga pegawai melengkapi identitasnya melalui perintah `/setprofil`.

---

## 🚀 Panduan Deploy & Auto-Start di Easypanel (Docker / VPS)

Aplikasi telah dirancang agar **Web App dan Bot Telegram langsung otomatis menyala bersamaan (Auto-Start)** tanpa perlu menjalankan terminal terpisah:

### 1. Pengaturan di Easypanel:
1. Buat **App Service** baru di Easypanel (pilih opsi **GitHub / Git** atau **Docker**).
2. Di tab **Environment**, masukkan variabel berikut:
   ```env
   PORT=3000
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567
   TELEGRAM_BOT_USERNAME=ekinerja_ai_bot
   VITE_GEMINI_API_KEY=AIzaSy... (API Key Gemini Anda)
   ```
3. Di tab **Build**:
   - Jika menggunakan **Nixpacks** (default):
     - Build Command: `npm run build`
     - Start Command: `npm start`
   - Jika menggunakan **Dockerfile**: Sistem akan otomatis mendeteksi berkas `Dockerfile` multi-stage bawaan.
4. **Mount Volume Permanen (Sangat Disarankan)**:
   - Tambahkan Volume di tab **Storage / Mounts**:
     - Host Path: `ekinerja_db`
     - Mount Path: `/app/database`
   - _(Tujuannya agar akun pegawai dan seluruh catatan jurnal tidak hilang saat kontainer di-restart atau di-redeploy)_.

### 2. Auto-Start & Database Seeder:
Saat kontainer mulai (boot up), `npm start` akan otomatis menjalankan [server/server.js](file:///Users/pt.bas/Project/E-Kinerja-AI/server/server.js):
- 🌐 **Web Server** langsung online melayani pengunjung di port 3000.
- 🤖 **Bot Telegram** langsung aktif polling dan siap menerima chat kapan pun.
- 💾 **Auto-Seeder**: Jika database baru pertama kali dijalankan, sistem otomatis memuat akun seeder awal dan contoh logbook resmi BKN. Data yang dimodifikasi tersimpan permanen di folder mount `/app/database`.
- 👁️ **Visibilitas Menu Otomatis**: Tombol "Chat di Telegram" di Header dan banner di Beranda web hanya akan tampil jika `TELEGRAM_BOT_TOKEN` diisi di konfigurasi `.env` (otomatis tersembunyi jika kosong).


## 🔐 Manajemen & Reset Kata Sandi (Password)

### A. Reset Password Superadmin (Khusus CLI Terminal / Console)
Demi standar keamanan tingkat tinggi di lingkungan produksi, kredensial Superadmin tidak dapat direset sembarangan dari web. Untuk mereset password Superadmin:
1. Buka tab **Console / Terminal** di Easypanel (atau SSH server Anda).
2. Jalankan perintah:
   ```bash
   npm run reset-admin <password_baru_anda>
   ```
   _Contoh:_
   ```bash
   npm run reset-admin RahasiaAdmin2026!
   ```
   *(Atau cukup ketik `npm run reset-admin` tanpa argumen untuk panduan interaktif / generate acak)*.

### B. Reset Password Pengguna / Pegawai (Melalui Web oleh Superadmin)
1. Login ke web menggunakan akun Superadmin.
2. Klik tombol **👑 Kelola Akun** di bilah navigasi Header.
3. Pada tabel daftar pegawai, klik tombol ikon kunci kuning **🔑 (Reset Password)** pada akun pegawai yang bersangkutan.
4. Masukkan password baru (atau klik 🎲 *Buat Acak*), lalu klik **Simpan Password Baru**.
5. Klik **Salin Kredensial** untuk mengirimkan username dan password baru ke pegawai via WhatsApp / Telegram.

### C. Pembersihan Data Jurnal via CLI (Hapus Semua atau Pengguna Tertentu)
Jika Anda ingin membersihkan jurnal demo atau mereset logbook pegawai tertentu langsung dari Terminal / Console Easypanel:
1. **Mode Menu Interaktif**:
   ```bash
   npm run clear-journals
   ```
2. **Lihat Statistik Jurnal Seluruh Pengguna**:
   ```bash
   npm run clear-journals -- --list
   ```
3. **Hapus Data Jurnal Milik Pengguna Tertentu Saja**:
   ```bash
   npm run clear-journals -- --user <username_pegawai>
   ```
   _Contoh (hapus jurnal milik user farras):_
   ```bash
   npm run clear-journals -- --user farras
   ```
   *(Tambahkan flag `-y` untuk langsung hapus tanpa dialog konfirmasi, misal: `npm run clear-journals -- --user farras -y`)*.
4. **Hapus SEMUA Data Jurnal di Sistem**:
   ```bash
   npm run clear-journals -- --all
   ```
   *(Tambahkan flag `-y` untuk eksekusi langsung, misal: `npm run clear-journals -- --all -y`)*.
   > **Catatan**: Berkas fisik eviden (foto / PDF lampiran) di folder `database/uploads/` yang terkait dengan jurnal yang dihapus juga akan otomatis dibersihkan. Jika ingin mempertahankan file fisik di disk, tambahkan opsi `--no-files`.

---

## 🎫 Fitur Registrasi Mandiri dengan Kode Undangan (Web & Telegram)

Untuk menjaga keamanan sistem agar **tidak sembarang orang dapat mendaftar**, pendaftaran akun baru di Web maupun Bot Telegram **wajib menyertakan Kode Registrasi resmi** yang diterbitkan oleh Superadmin.

### 1. Cara Superadmin Menerbitkan Kode Registrasi (Web Admin)
1. Login ke web sebagai **Superadmin**.
2. Buka menu **👑 Kelola Akun**, lalu pilih tab **🎫 Kode Registrasi**.
3. Atur parameter kode yang ingin diterbitkan:
   - **Kustom Kode**: Masukkan kode unik atau klik 🎲 untuk generate otomatis (format `EKIN-XXXX`).
   - **Batas Kuota Pemakaian**: Pilih `1x` (sekali pakai), `5x`, `10x`, `25x`, `50x`, kustom angka, atau `Unlimited`.
   - **Batas Waktu (Expired)**: Pilih `1 Jam`, `24 Jam`, `3 Hari`, `7 Hari`, `30 Hari`, atau `Tanpa Batas Waktu`.
   - **Catatan / Keperluan**: Tuliskan keterangan (contoh: *Undangan PPPK Tenaga Teknis 2026*).
4. Klik **+ Terbitkan Kode**. Salin kode tersebut dan bagikan kepada pegawai yang berhak.

### 2. Cara Registrasi Pegawai via Web
1. Buka halaman utama aplikasi E-Kinerja AI.
2. Pada form login, klik tab **Daftar Akun Baru**.
3. Masukkan **Kode Registrasi**, Nama Lengkap, NIP, Username, dan Password.
4. Klik **Daftar & Masuk Sekarang**. Akun langsung aktif dan otomatis masuk ke sistem.

### 3. Cara Registrasi Pegawai via Bot Telegram
1. Buka Bot Telegram E-Kinerja (`@nama_bot_anda_bot`).
2. Ketik perintah:
   ```text
   /register <KODE_REGISTRASI>
   ```
   *(Atau cukup ketik `/register` dan ikuti panduan interaktif)*
3. Masukkan Username, Password, Nama Lengkap, dan NIP sesuai arahan bot.
4. Akun langsung terdaftar dan sesi login Telegram otomatis aktif!

---

## 🔑 Pengaturan Gemini API Key

- Buat file `.env` di root direktori atau masukkan langsung via menu **Set API Key** di Header aplikasi:
  ```env
  VITE_GEMINI_API_KEY=your_gemini_api_key_here
  ```



