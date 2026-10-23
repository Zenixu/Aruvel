# agent.md — Panduan untuk agen kode

Berlaku untuk setiap agen AI (atau manusia) yang mengubah repositori ini. Baca seluruhnya sebelum mengerjakan tugas. Dokumen acuan lain: `docs/prd.md` (PRD) dan `design.md` (acuan tampilan). Bila ada konflik, urutan prioritasnya: instruksi tugas dari pemilik proyek, lalu `agent.md`, lalu PRD, lalu `design.md`.

## 1. Proyek ini

Aplikasi Android pribadi untuk membaca novel berbahasa Inggris dan Indonesia. Dibangun dengan React, TypeScript, Vite, dan Capacitor. Semua berjalan di HP, tanpa backend pada v1.0. Pengguna tunggal: pemilik proyek. Tidak dipublikasikan ke Play Store.

Yang **bukan** bagian proyek v1.0: iOS, akun pengguna, fitur sosial, terjemahan otomatis, anotasi, server sinkronisasi, penyediaan atau penghostingan konten novel.

## 2. Fakta teknis yang harus selalu diingat

- Aplikasi dibungkus Capacitor dan berjalan di WebView. `fetch` biasa ke situs lain diblokir CORS. Semua permintaan ke situs sumber **wajib lewat CapacitorHttp** (satu pembungkus di `src/core/http`).
- Aplikasi harus berfungsi tanpa laptop menyala. Jangan menyisakan `server.url` (live reload) di konfigurasi build harian.
- Offline-first: chapter terunduh dan EPUB lokal harus terbuka tanpa internet.
- Plugin sumber berbentuk file TypeScript yang dikompilasi menjadi JS, mengikuti kontrak di PRD bagian 10.
- Data utama: tujuh tabel sesuai ERD di PRD bagian 11. Mulai dengan Dexie (IndexedDB). Akses data hanya lewat lapisan repository agar bisa pindah ke SQLite tanpa mengubah fitur.

## 3. Struktur repositori yang diharapkan

```
/
  agent.md  design.md  prompt.md
  docs/            prd.md, keputusan.md, ide.md
  src/
    app/           routing, provider, tema
    features/      library, reader, browse, settings, downloads, backup
    core/
      http/        pembungkus CapacitorHttp
      db/          skema, repository
      plugins/     kontrak, pemuat, error bertipe
      storage/     Filesystem, berkas sampul dan unduhan
    ui/            komponen dasar sesuai design.md
  plugins/
    en/  id/       satu berkas per sumber
  scripts/         build-plugins, live-check-plugin
  tests/
    fixtures/      cuplikan HTML nyata untuk uji parser
```

Bila struktur nyata berbeda, perbarui bagian ini di commit yang sama.

## 4. Perintah

Perbarui tabel ini saat skrip dibuat atau berubah. Jangan mengarang perintah yang belum ada.

| Tujuan | Perintah |
| --- | --- |
| Jalankan di browser | `npm run dev` |
| Cek tipe | `npm run typecheck` |
| Lint dan format | `npm run lint` |
| Uji unit | `npm test` |
| Bangun web | `npm run build` |
| Sinkron ke Android | `npx cap sync android` |
| Buka Android Studio | `npx cap open android` |
| Uji plugin langsung ke situs | `npm run check:plugin -- plugins/<bahasa>/<nama>.ts` |

## 5. Cara bekerja per tugas

1. Baca bagian PRD yang relevan dan `design.md` bila menyentuh tampilan.
2. Bila tugas menyentuh lebih dari 3 berkas, tulis rencana singkat dan tunggu persetujuan.
3. Kerjakan **satu fitur atau satu perbaikan per tugas**. Jangan menyelipkan perbaikan lain.
4. Commit kecil dengan pesan yang menyebut fitur (misalnya `F7: daftar chapter menggabungkan volume`).
5. Jalankan cek tipe, lint, dan uji sebelum menyatakan selesai.
6. Fitur yang menyentuh jaringan atau fitur native diuji di perangkat atau emulator, bukan hanya di browser. Bila tidak bisa diuji, katakan terus terang.
7. Laporkan hasil dengan format di bagian 10.

### Boleh tanpa bertanya

- Mengubah kode di dalam lingkup tugas, menambah uji, dan merapikan kode di berkas yang memang disentuh.

### Wajib bertanya dulu

- Menambah dependensi baru.
- Mengubah skema database atau format backup.
- Mengubah kontrak plugin.
- Mengubah token desain atau menambah gaya baru.
- Menghapus atau mengubah fitur di luar tugas.
- Menyentuh konfigurasi build atau rilis (keystore, `capacitor.config`, penandatanganan).
- Hal apa pun yang tidak ada di PRD. Catat sebagai usulan di `docs/ide.md`, jangan langsung dikerjakan.

## 6. Aturan kode

- TypeScript mode ketat. Hindari `any`. Bila terpaksa, beri komentar alasannya.
- Fungsi kecil dengan satu tugas. Logika bisnis tidak ditaruh di komponen UI.
- Akses jaringan hanya lewat `src/core/http`. Akses native (Filesystem, pemilih berkas, browser) lewat satu lapisan adapter agar mudah diganti.
- Akses data hanya lewat repository. Komponen tidak memanggil Dexie langsung.
- Kegagalan dilaporkan sebagai error bertipe (`SiteBlockedError`, `ParseError`, dan sejenisnya), bukan string.
- HTML isi chapter **wajib disanitasi** sebelum disimpan atau ditampilkan (pakai pustaka sanitasi yang sudah mapan, dan cek status perawatannya).
- Tanpa telemetri, tanpa analitik, tanpa pelacak. Tidak ada rahasia atau kredensial di repositori.
- Keystore penandatanganan tidak boleh masuk repositori. Tambahkan ke `.gitignore`.
- Tidak ada `console.log` tertinggal di kode rilis.
- Komentar menjelaskan *kenapa*, bukan *apa*.

## 7. Aturan plugin sumber

- Ikuti kontrak PRD bagian 10: `popularNovels`, `searchNovels`, `parseNovel`, `parseChapter`.
- `path` selalu relatif (tanpa domain). Domain hanya di `site`.
- `chapters` urut dari chapter paling awal dan **lengkap**. Bila situs memecah daftar per volume atau halaman, plugin menggabungkannya. Isi `declaredChapterCount` bila situs menyediakannya.
- Kata pencarian wajib di-encode (`encodeURIComponent`).
- Selector diverifikasi terhadap cuplikan HTML nyata yang disimpan di `tests/fixtures/`. Dilarang menebak selector.
- Bersihkan isi chapter dari iklan, skrip, dan elemen pelacak.
- Beri jeda antarpermintaan (batas laju) agar situs tidak terbebani.
- Plugin mendapat helper terbatas (HTTP dan parser HTML), bukan akses ke database.
- Naikkan `version` setiap kali plugin diubah.
- Isi field `legal` dengan jujur: `public-domain`, `author-platform`, atau `user-risk`.
- Setiap plugin wajib lolos `check:plugin` (populer, cari, detail, chapter) dengan hasil LULUS, GAGAL, atau TIDAK PASTI (situs sedang down atau diblokir).
- Agen hanya membuat plugin untuk sumber yang lolos syarat PRD bagian 8. Sumber lapis 3 di luar komitmen v1.0 dan tidak dikerjakan agen. Agen tidak mencari atau merekomendasikan situs yang menyalin karya tanpa izin.

## 8. Aturan tampilan

- Ikuti `design.md`. Semua warna, jarak, dan sudut lewat variabel CSS.
- Dilarang: gradien, bayangan, emoji, kartu bersudut bulat, animasi masuk, teks sambutan, ikon dekoratif.
- Teks UI dalam bahasa Indonesia yang lugas, tanpa tanda seru. Pesan galat menyebut apa yang gagal dan jalan keluarnya.
- Periksa `src/ui` sebelum membuat komponen baru.
- Setelah mengubah layar, jalankan uji di `design.md` bagian 13 dan laporkan hasilnya.

## 9. Kesalahan yang sudah pernah terjadi di proyek serupa

Hindari ini sejak awal:

- Menyambung URL dengan `+=` sehingga alamat jadi rusak. Bangun URL dengan `URL` dan `URLSearchParams`.
- Regex nomor chapter yang menghasilkan `NaN`. Uji dengan fixture.
- Daftar chapter yang terpotong karena volume atau halaman. Uji jumlah chapter terhadap situs.
- Sampul hilang setelah restore backup. Backup wajib menyertakan berkas sampul dan diuji restore-nya.
- Teks diucapkan dua kali oleh TTS. Jangan menduplikasi node teks di DOM pembaca.
- Lolos lint dan tipe tidak berarti plugin berfungsi. Selalu jalankan uji langsung.
- `server.url` live reload tertinggal di build harian sehingga aplikasi kosong saat laptop mati.

## 10. Format laporan setelah tugas

```
Ringkasan: satu atau dua kalimat apa yang berubah.
Berkas: daftar berkas yang diubah.
Pengujian: apa yang dijalankan dan hasilnya (tipe, lint, uji, perangkat).
Belum selesai atau belum teruji: apa adanya.
Pertanyaan: hal yang butuh keputusan pemilik proyek.
```

Jangan menyatakan "selesai" bila ada bagian yang belum diuji. Sebutkan bagian itu.

## 11. Keputusan yang masih terbuka (tanya, jangan menebak)

- Versi Android minimum pada HP acuan.
- Dexie atau langsung SQLite (usulan: Dexie dulu).
- Plugin dikemas di aplikasi atau dimuat dari berkas/URL (usulan: dikemas dulu, pemuatan berkas di akhir fase 2).
- Daftar sumber Indonesia yang lolos verifikasi.
- Boleh tidaknya memakai ulang kode atau format plugin LNReader (cek lisensi dulu, jangan menyalin apa pun sebelum jelas).

Keputusan yang sudah final dicatat di `docs/keputusan.md` beserta tanggal dan alasannya.

## 12. Gerbang fase

Agen tidak memulai fase berikutnya sebelum pemilik proyek menyatakan gerbang fase sebelumnya lolos. Kriteria ada di PRD bagian 13 dan 15. Fitur yang tidak muat di fase berjalan dipindah ke fase 5, bukan ditambahkan ke fase berjalan.
