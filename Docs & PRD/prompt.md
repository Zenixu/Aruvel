# prompt.md — Kumpulan prompt untuk agen kode

Cara memakai: salin satu prompt, isi bagian `[DALAM KURUNG SIKU]`, tempel ke agen. Satu prompt untuk satu tugas. Jangan menggabungkan beberapa prompt dalam satu sesi tugas.

Agar hasilnya konsisten, taruh `agent.md`, `design.md`, dan `docs/prd.md` di repositori sebelum memulai. Banyak alat agen membaca berkas panduan dengan nama tertentu: setahu saya Claude Code membaca `CLAUDE.md`, dan banyak agen lain membaca `AGENTS.md`. Bila alatmu memakai nama itu, salin `agent.md` ke nama tersebut atau buat berkas pendek yang merujuk ke `agent.md`. Cek dokumentasi alat yang kamu pakai.

## Pembuka standar

Tempel di awal setiap tugas:

```
Baca agent.md, design.md, dan bagian PRD yang disebut di bawah sebelum mulai.
Kerjakan hanya tugas ini. Bila menyentuh lebih dari 3 berkas, tulis rencana singkat
dan tunggu persetujuan saya. Jangan menambah dependensi, mengubah skema, atau mengubah
kontrak plugin tanpa bertanya. Setelah selesai, laporkan memakai format di agent.md
bagian 10 dan sebutkan apa yang belum teruji.
```

## Fase 0: Orientasi dan spike

### P0.1 Orientasi tanpa kode

```
[Pembuka standar]
Tugas: baca agent.md, design.md, dan docs/prd.md. Jangan menulis kode.
Keluaran: (1) ringkasan proyek dalam 5 kalimat dengan kata-katamu sendiri,
(2) daftar hal yang kamu anggap ambigu atau bertentangan antardokumen,
(3) daftar pertanyaan yang harus saya jawab sebelum fase 1,
(4) risiko teknis terbesar menurutmu dan mana yang perlu dibuktikan dulu.
Selesai bila: keempat keluaran ada dan tidak ada kode yang ditulis.
```

### P0.2 Spike pembuktian (sehari)

```
[Pembuka standar]
Bagian PRD: 9 (arsitektur), 14 (risiko R3, R9).
Tugas: buat proyek Vite + React + TypeScript + Capacitor Android yang minimal,
dengan CapacitorHttp aktif. Buktikan tiga hal di HP asli, bukan hanya browser:
(1) aplikasi terpasang sebagai APK dan terbuka tanpa laptop menyala,
(2) satu permintaan HTTP ke [URL SUMBER LEGAL, mis. halaman karya domain publik]
    berhasil tanpa terblokir CORS,
(3) data kecil yang disimpan (Dexie) tetap ada setelah aplikasi ditutup paksa dan
    setelah APK dipasang ulang di atas versi lama dengan keystore yang sama.
Batasan: tanpa UI yang rapi, tanpa fitur lain. Jangan menyisakan server.url.
Selesai bila: tiga bukti di atas dilaporkan beserta langkah pengujiannya, dan
langkah membangun APK ditulis di docs/keputusan.md.
```

## Fase 1: Fondasi pembaca

### P1.1 Inisialisasi proyek

```
[Pembuka standar]
Bagian PRD: 9, 12. Acuan: design.md bagian 3, 4, 5, 12.
Tugas: susun proyek sesuai struktur di agent.md bagian 3. Pasang TypeScript ketat,
lint, format, dan kerangka uji. Buat token CSS dari design.md bagian 12 untuk tema
kertas, sepia, malam, dan hitam, plus pengalih tema. Buat skrip yang tercantum di
agent.md bagian 4.
Batasan: belum ada fitur bisnis. Komponen UI dasar hanya yang dibutuhkan untuk
menampilkan halaman uji tema.
Selesai bila: npm run typecheck, lint, dan test lulus; halaman uji menampilkan
keempat tema; tidak ada nilai warna langsung di komponen.
```

### P1.2 Database dan library

```
[Pembuka standar]
Bagian PRD: 11 (ERD), F1. 
Tugas: buat skema Dexie untuk tabel di ERD (source, novel, chapter, chapter_content,
category, novel_category, setting) dan lapisan repository. Buat layar Library:
grid sampul 3 kolom dengan opsi daftar, kategori sebagai tab teks, tambah dan hapus
novel, ubah kategori, jumlah chapter belum dibaca sebagai angka kecil di sampul.
Sampul yang hilang memakai sampul tipografis (design.md bagian 9).
Batasan: data contoh dari fixture, belum ada sumber nyata. Komponen tidak boleh
memanggil Dexie langsung.
Selesai bila: operasi repository teruji unit; library tetap utuh setelah aplikasi
ditutup paksa; uji di design.md bagian 13 dijalankan dan dilaporkan.
```

### P1.3 Pembaca chapter

```
[Pembuka standar]
Bagian PRD: F2, F3, 12. Acuan: design.md bagian 4, 6.
Tugas: buat pembaca chapter yang merender teks sebagai DOM. Pengaturan: ukuran font,
tinggi baris, lebar kolom, gaya paragraf (jarak atau indentasi), perataan, tema.
Ketuk tengah menampilkan atau menyembunyikan kontrol. Garis progres 2 px di bawah.
Pengaturan dalam lembar dari bawah dengan pratinjau langsung. Simpan posisi baca
sebagai indeks paragraf dan offset, dan pulihkan tepat di tempat yang sama setelah
aplikasi ditutup paksa, juga setelah ukuran font diubah.
Batasan: pakai isi chapter contoh. Jangan menduplikasi node teks.
Selesai bila: lanjut baca tepat di paragraf terakhir pada 10 dari 10 uji; teks bisa
diseleksi; diuji di HP pada tema malam dan kertas.
```

### P1.4 Impor EPUB

```
[Pembuka standar]
Bagian PRD: F4, 8 (lapis 1), 11 (source id local).
Tugas: impor berkas EPUB dari penyimpanan HP memakai [epub.js atau foliate-js;
bandingkan dulu dan tanyakan pilihanmu]. Baca metadata dan daftar bagian,
buat novel dengan source "local", simpan sampul, dan buka di pembaca dari P1.3.
Batasan: hanya EPUB tanpa DRM. Sanitasi HTML sebelum ditampilkan.
Selesai bila: tiga EPUB berbeda terbaca di HP tanpa laptop; chapter dengan skrip
di dalamnya tidak menjalankan skrip; hasil diuji dan dilaporkan.
```

### P1.5 Tinjauan gerbang 1

```
Periksa gerbang 1 di PRD bagian 13: EPUB lokal terbuka dan terbaca di HP tanpa laptop,
library dan posisi terakhir berfungsi. Jalankan skenario di PRD bagian 7 alur B dan C.
Laporkan tiap kriteria sebagai LULUS atau GAGAL beserta buktinya. Jangan memperbaiki
apa pun dalam tugas ini, hanya melaporkan.
```

## Fase 2: Plugin sumber

### P2.1 Kontrak dan pemuat plugin

```
[Pembuka standar]
Bagian PRD: 10, F5. Acuan: agent.md bagian 7.
Tugas: implementasikan tipe kontrak persis seperti di PRD bagian 10, pembungkus
CapacitorHttp di src/core/http, error bertipe (SiteBlockedError, ParseError),
pemuat dan validator bentuk plugin, serta helper terbatas yang diberikan ke plugin.
Plugin tidak boleh mengakses database.
Batasan: plugin dikemas di dalam aplikasi dulu. Pemuatan dari berkas ditunda
sampai akhir fase 2.
Selesai bila: plugin tiruan lolos validator; plugin yang bentuknya salah ditolak
dengan pesan jelas; uji unit lulus.
```

### P2.2 Verifikasi sumber (riset, tanpa kode)

```
[Pembuka standar]
Bagian PRD: 8.
Tugas: untuk bahasa [INGGRIS atau INDONESIA], kumpulkan kandidat sumber yang memenuhi
empat syarat di PRD bagian 8 (legal, daftar chapter lengkap, bisa diuji langsung,
jalur Cloudflare). Hanya sumber lapis 1 dan 2. Jangan merekomendasikan situs yang
menyalin karya tanpa izin.
Keluaran: tabel dengan kolom nama, jenis (domain publik, lisensi terbuka, platform
penulis), bukti statusnya, ada API atau tidak, perlindungan Cloudflare, dan risiko.
Cantumkan sumber tiap fakta dan tandai yang tidak bisa diverifikasi.
Selesai bila: tabel ada, tiap baris punya bukti, dan ada rekomendasi satu sumber
untuk dibuatkan plugin pertama.
```

### P2.3 Plugin pertama

```
[Pembuka standar]
Bagian PRD: F6, F7, 10. Acuan: agent.md bagian 7 dan 9.
Tugas: buat plugin untuk [SUMBER YANG LOLOS P2.2] di plugins/[en atau id]/[nama].ts.
Simpan minimal dua cuplikan HTML nyata di tests/fixtures/ dan tulis uji parser
terhadap cuplikan itu. Plugin menggabungkan daftar chapter yang terpecah, mengisi
declaredChapterCount bila ada, meng-encode kata pencarian, dan memberi jeda antar
permintaan.
Selesai bila: uji parser lulus; plugin berjalan di HP lewat CapacitorHttp untuk
cari, detail, dan baca chapter; jumlah chapter di aplikasi sama dengan di situs
untuk tiga novel uji.
```

### P2.4 Skrip uji langsung plugin

```
[Pembuka standar]
Bagian PRD: 10 (tabel siklus hidup, tahap "Diuji").
Tugas: buat scripts/live-check-plugin yang membundel satu plugin dan menjalankan
populer, cari, detail, lalu chapter ke situs sungguhan. Tiap langkah menghasilkan
LULUS, GAGAL, atau TIDAK PASTI (situs down atau diblokir). Skrip hanya gagal pada
GAGAL yang nyata. Tambahkan perintah npm run check:plugin.
Selesai bila: plugin dari P2.3 lolos; plugin yang selektornya sengaja dirusak
gagal tepat di langkah yang benar; cara pakainya ditulis di agent.md bagian 4.
```

### P2.5 Plugin kedua dan tinjauan gerbang 2

```
Ulangi P2.3 untuk bahasa [yang belum punya plugin]. Setelah itu periksa gerbang 2
di PRD bagian 13 dan laporkan tiap kriteria sebagai LULUS atau GAGAL beserta
buktinya. Ingatkan saya untuk memutuskan: lanjut, atau pakai LNReader (PRD bagian 16).
```

## Fase 3: Offline dan pembaruan

### P3.1 Unduh chapter

```
[Pembuka standar]
Bagian PRD: F8, 11 (chapter_content).
Tugas: unduh satu chapter, beberapa chapter, atau seluruh novel. Isi disimpan sebagai
berkas di Filesystem, tabel chapter_content hanya menyimpan path, ukuran, dan waktu.
Tampilkan status unduhan dengan satu tanda yang konsisten. Dukung hentikan dan
ulangi setelah gagal.
Selesai bila: chapter terunduh terbuka di mode pesawat; unduhan yang terputus bisa
dilanjutkan; diuji di HP.
```

### P3.2 Chapter baru dan pembaruan library

```
[Pembuka standar]
Bagian PRD: F9, 14 (R10).
Tugas: cek chapter baru untuk novel di library saat aplikasi dibuka dan lewat
tarik-untuk-segarkan. Tandai novel yang punya chapter baru.
Batasan: tidak ada pembaruan latar belakang terus-menerus.
Selesai bila: chapter baru terdeteksi pada novel uji; kegagalan satu sumber tidak
menghentikan pembaruan sumber lain dan pesannya spesifik.
```

### P3.3 Jalur Cloudflare lewat WebView

```
[Pembuka standar]
Bagian PRD: F10, 14 (R2), 7 (alur D).
Tugas: saat plugin melempar SiteBlockedError, tampilkan pesan spesifik dan tombol
untuk membuka situs lewat WebView dalam aplikasi, lalu coba lagi permintaan yang
gagal setelah pengguna menyelesaikan verifikasi.
Batasan: jangan menyimpan kredensial. Bila cookie perlu dibawa ke permintaan
berikutnya, jelaskan mekanismenya dulu dan tunggu persetujuan.
Selesai bila: skenario diuji pada sumber yang benar-benar memblokir, atau dengan
simulasi bila tidak ada, dan keterbatasannya dilaporkan.
```

## Fase 4: Keandalan data

### P4.1 Backup dan restore

```
[Pembuka standar]
Bagian PRD: F11, 11, 12 (portabilitas data).
Tugas: backup berupa JSON ber-versi skema ditambah berkas sampul, dan restore yang
memulihkan library, kategori, progres, dan sampul. Chapter terunduh tidak ikut backup
(keputusan rancangan). Restore harus menolak backup berversi lebih baru dari
aplikasi dengan pesan jelas.
Selesai bila: tiga siklus backup, hapus data, restore memulihkan semuanya termasuk
sampul; file backup bisa dibuka di editor teks.
```

### P4.2 Pengecekan kelengkapan chapter

```
[Pembuka standar]
Bagian PRD: F12, 14 (R4).
Tugas: bandingkan jumlah chapter di aplikasi dengan declaredChapterCount dan tampilkan
peringatan spesifik bila berbeda. Untuk sumber tanpa declaredChapterCount, deteksi
celah nomor chapter.
Selesai bila: lima novel uji diperiksa, dan novel dengan volume atau halaman terpecah
menghasilkan hasil yang benar.
```

### P4.3 Tinjauan gerbang 3 dan 4

```
Periksa gerbang 3 dan 4 di PRD bagian 13 dan seluruh daftar di bagian 15.
Laporkan tiap kriteria sebagai LULUS atau GAGAL dengan bukti. Jangan memperbaiki
apa pun, hanya melaporkan.
```

## Prompt lintas fase

### Perbaiki plugin yang rusak

```
[Pembuka standar]
Plugin [NAMA] rusak: [GEJALA, mis. chapter kosong atau daftar chapter terpotong].
Langkah: (1) jalankan check:plugin dan laporkan langkah mana yang gagal,
(2) simpan cuplikan HTML situs yang sekarang ke tests/fixtures/, (3) cari
penyebabnya dari HTML itu, bukan dari tebakan, (4) perbaiki, tambah uji
dari fixture baru, dan naikkan version.
Selesai bila: check:plugin lulus dan uji fixture lulus. Catat penyebabnya
di docs/keputusan.md satu baris.
```

### Tinjauan tampilan anti-slop

```
Tinjau layar [NAMA LAYAR] terhadap design.md. Jalankan enam uji di bagian 13
(menyipit, abu-abu, tanpa aksen, hitung, kata, nyata) dan periksa daftar larangan di
bagian 2. Laporkan tiap pelanggaran dengan berkas dan barisnya, lalu usulkan
perbaikannya. Jangan mengubah kode dalam tugas ini.
```

### Tinjauan kode

```
Tinjau perubahan di [CABANG atau COMMIT] terhadap agent.md bagian 5 sampai 9.
Cari: pelanggaran aturan, logika bisnis di komponen, akses jaringan di luar
src/core/http, HTML yang tidak disanitasi, plugin tanpa fixture, dan kesalahan yang
tercantum di bagian 9. Urutkan temuan dari paling berat. Jangan mengubah kode.
```

### Bangun APK harian

```
[Pembuka standar]
Tugas: siapkan dan jalankan build harian. Pastikan server.url tidak ada di
konfigurasi, CapacitorHttp aktif, versi dinaikkan, dan penandatanganan memakai
keystore yang sama dengan sebelumnya (jangan membuat keystore baru). Bangun web,
jalankan npx cap sync android, lalu bangun APK.
Selesai bila: langkah dan hasilnya dilaporkan, dan pemasangan di atas versi lama
dinyatakan aman bagi data (diuji, atau ditandai belum teruji).
```

### Ubah PRD menjadi daftar tugas

```
Baca docs/prd.md. Buat daftar tugas berurutan per fase untuk fitur F1 sampai F12.
Tiap tugas: judul, bagian PRD yang dirujuk, kriteria selesai yang bisa diuji,
dan ketergantungannya. Satu tugas tidak lebih dari kira-kira satu sesi kerja.
Jangan menulis kode. Simpan ke docs/tugas.md.
```

## Cara menulis prompt sendiri

1. Satu tugas, satu hasil yang bisa diperiksa.
2. Rujuk bagian PRD dan `design.md` yang relevan, jangan menyalin isinya.
3. Nyatakan batasan: apa yang *tidak* boleh disentuh.
4. Tulis kriteria selesai yang bisa diuji, bukan "bagus" atau "rapi".
5. Minta rencana dulu untuk tugas besar.
6. Minta laporan jujur tentang apa yang belum teruji.
7. Bila agen menyimpang dari aturan, jangan membantah panjang. Tunjuk bagian `agent.md` yang dilanggar dan minta perbaikan.
