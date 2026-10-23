# PRD — Aplikasi Pembaca Novel Pribadi

Oct 23, 2026 · @Zennrch

## 1. Ringkasan eksekutif

Produk ini adalah aplikasi Android pribadi untuk membaca novel berbahasa Inggris dan Indonesia, dibangun dengan React dan Capacitor, berjalan penuh di HP tanpa server, dan tanpa biaya. Proyek dinyatakan selesai ketika versi 1.0 bisa dipakai membaca harian dan semua kriteria di bagian 15 terpenuhi.

| Aspek | Keputusan |
| --- | --- |
| Apa | Pembaca novel dengan library, pembaca chapter, unduhan offline, impor EPUB, dan sistem plugin sumber |
| Untuk siapa | Satu pengguna: pembuatnya sendiri |
| Kenapa | Kontrol penuh atas sumber dan data, kelengkapan sumber Inggris dan Indonesia, serta sarana belajar |
| Platform | Android saja, dipasang sebagai APK pribadi (sideload) |
| Stack | React, TypeScript, Vite, Capacitor, Dexie/SQLite |
| Backend | Tidak ada pada v1.0. Server sinkronisasi (Go) hanya opsional setelah v1.0 |
| Biaya | Nol rupiah untuk seluruh perangkat lunak yang dipakai |
| Arah | Mulai dari pembaca EPUB lokal, lalu plugin sumber, lalu perawatan dan sinkronisasi |
| Batas | Tidak dipublikasikan ke Play Store, tidak ada iOS, tidak ada akun pengguna, tidak ada fitur sosial |

## 2. Latar belakang dan masalah

Pembaca novel digital yang sudah ada belum menjamin kelengkapan, kestabilan, dan kontrol bagi pembaca yang ingin membaca novel Inggris dan Indonesia secara lengkap dan tahan lama.

**Latar belakang.** Mihon (penerus Tachiyomi) membuktikan model "aplikasi pembaca + sumber yang bisa dipasang" untuk manga. LNReader menerapkan model serupa untuk novel dengan plugin berbentuk file JavaScript. Keduanya open-source dan menjadi referensi utama proyek ini.

**Masalah yang ditemukan dari riset (Oktober 2026).**

| Masalah | Bukti | Dampak bagi pembaca |
| --- | --- | --- |
| Plugin sumber sering rusak | Laporan chapter gagal dimuat, nomor chapter hilang, dan teks bercampur karakter lain pada plugin WTR-LAB | Novel yang sedang dibaca berhenti di tengah jalan |
| Cloudflare memblokir pemuatan | Laporan WebView kosong pada plugin Crimson Scrolls | Sumber tertentu tidak bisa dibuka sama sekali |
| Daftar chapter bisa terpotong | Laporan Royal Road: novel dengan "volume" tidak menampilkan semua chapter | Chapter hilang tanpa peringatan |
| Backup tidak sempurna | Laporan sampul tidak muncul setelah restore (RanobeLib) | Data tidak sepenuhnya bisa dipindah |
| TTS bermasalah | Laporan TTS membaca tiap paragraf dua kali (Royal Road, Android 16) | Fitur dengarkan sulit dipakai |
| Migrasi besar memutus data | Rilis 2.0 LNReader menyatakan unduhan dan progres lama tidak bisa dipindah | Kehilangan riwayat baca |
| Sumber Indonesia sedikit | Dari pencarian, hanya satu plugin Indonesia yang ditemukan (Meionovel), itu pun belum merged | Kelengkapan bacaan Indonesia tidak terjamin |

**Kenapa tetap membuat sendiri, bukan memakai LNReader saja.** LNReader tetap pilihan yang layak bila tujuannya hanya membaca. Proyek ini dibuat karena tiga hal: kontrol penuh atas sumber, format data, dan jadwal pembaruan; kemampuan menambah sumber bahasa Indonesia sendiri; dan belajar membangun aplikasi dari ujung ke ujung. Jika setelah fase 2 aplikasi ini tidak lebih berguna daripada LNReader untuk bacaanmu, memakai LNReader adalah jalan keluar yang sah.

## 3. Tujuan, non-tujuan, dan metrik keberhasilan

Tujuan v1.0 adalah satu aplikasi yang membuat membaca novel Inggris dan Indonesia nyaman setiap hari, dengan sumber yang mudah diperbaiki saat rusak.

**Tujuan**

1. Membaca novel dengan nyaman: pengaturan font, jarak baris, tema, dan lanjut dari posisi terakhir.
2. Mengelola library pribadi dengan kategori dan pembaruan chapter.
3. Membaca offline lewat unduhan chapter dan impor EPUB.
4. Menambah atau memperbaiki sumber tanpa membuat ulang aplikasi.
5. Menjaga data aman lewat backup dan restore yang lengkap.

**Non-tujuan (sengaja tidak dikerjakan di v1.0)**

- Publikasi ke Google Play atau toko aplikasi lain.
- Dukungan iOS.
- Akun pengguna, fitur sosial, komentar, atau rekomendasi.
- Terjemahan otomatis dan anotasi mendalam (highlight, catatan).
- Server sinkronisasi. Ini dipertimbangkan setelah v1.0.
- Menyediakan atau menghosting konten novel apa pun.

**Metrik keberhasilan**

| Metrik | Target v1.0 | Cara mengukur |
| --- | --- | --- |
| Aplikasi berjalan tanpa laptop | 100% fitur inti jalan di HP | Matikan laptop, jalankan skenario di bagian 7 |
| Waktu buka chapter dari library | 3 detik atau kurang untuk chapter yang sudah diunduh | Uji manual dengan stopwatch di HP sendiri |
| Lanjut baca dari posisi terakhir | Tepat di paragraf terakhir dalam 10 dari 10 uji | Tutup paksa aplikasi, buka lagi |
| Kelengkapan daftar chapter | Jumlah chapter di aplikasi sama dengan jumlah di situs sumber untuk 5 novel uji | Bandingkan manual |
| Restore backup | Library, progres, kategori, dan sampul pulih utuh pada 3 uji | Backup, hapus data, restore |
| Waktu memperbaiki satu plugin rusak | 1 jam atau kurang, tanpa membangun ulang APK jika plugin dimuat dari file | Catat waktu saat perbaikan nyata pertama |

Angka target di atas adalah usulan awal untuk disetujui pemilik proyek, bukan hasil pengukuran.

## 4. Pengguna dan skenario pemakaian

Pengguna tunggal produk ini adalah pembuatnya: pengembang yang akrab dengan React, Next.js, Laravel, dan JavaScript, sedang belajar Go, memakai HP Android, dan membaca novel berbahasa Inggris dan Indonesia untuk keperluan pribadi.

| Skenario | Konteks | Hasil yang diharapkan |
| --- | --- | --- |
| Membaca di perjalanan | Sinyal lemah atau tidak ada | Chapter yang sudah diunduh terbuka tanpa internet |
| Melanjutkan bacaan | Membuka aplikasi setelah beberapa hari | Satu ketukan dari library langsung ke posisi terakhir |
| Mengikuti novel yang masih berjalan | Penulis menambah chapter baru | Library menandai novel yang punya chapter baru |
| Sumber berhenti berfungsi | Situs berubah struktur | Pengguna memperbaiki satu file plugin dan melanjutkan membaca |
| Membaca buku milik sendiri | Punya file EPUB | Impor ke library dan dibaca seperti novel lain |
| Berganti HP | HP lama rusak atau diganti | Restore dari file backup memulihkan semuanya |
| Membaca malam hari | Kondisi gelap | Tema gelap, ukuran font, dan jarak baris bisa diatur cepat dari layar baca |

Pembatasan: karena pengguna hanya satu orang, tidak ada kebutuhan onboarding, peran, atau izin. Antarmuka boleh dioptimalkan penuh untuk kebiasaan pemiliknya.

## 5. Riset referensi

Mihon dan LNReader sama-sama memisahkan aplikasi pembaca dari sumber bacaan, dan perbedaan terbesarnya ada pada bentuk sumbernya: APK untuk Mihon, file JavaScript untuk LNReader.

|  | Mihon | LNReader |
| --- | --- | --- |
| Jenis bacaan | Manga/komik | Novel |
| Bentuk sumber | Ekstensi APK (Kotlin) | Plugin file JavaScript/TypeScript |
| Cara pasang sumber | Instal APK dari repositori GitHub | Unduh file JS dari repositori plugin |
| Teknologi aplikasi | Kotlin, native | React Native |
| Menambah sumber baru | Perlu membangun APK | Cukup satu file, tanpa membangun ulang aplikasi |
| Pelajaran untuk proyek ini | Pemisahan aplikasi dan sumber, restore dari backup | Kontrak plugin sederhana, multisrc, uji langsung ke situs |

**Yang dipelajari dari kode plugin LNReader**

1. Setiap plugin menyediakan empat fungsi: daftar populer, pencarian, detail novel beserta daftar chapter, dan isi chapter.
2. Path disimpan relatif (tanpa domain), sehingga pindah domain cukup mengubah satu nilai.
3. Template "multisrc" membuat banyak plugin dari satu template dan satu daftar situs, efisien untuk situs yang memakai mesin yang sama.
4. Daftar chapter kadang harus diambil dari endpoint terpisah, bukan dari halaman novel.
5. Isi chapter perlu dibersihkan dari iklan dan skrip sebelum ditampilkan.
6. Error yang jelas (misalnya mengarahkan ke WebView) membantu saat Cloudflare memblokir.

**Yang dihindari**

- Selector generik tanpa verifikasi (terlihat pada plugin Indonesia yang masih berupa PR terbuka).
- Menganggap lolos lint dan type-check berarti plugin berfungsi. Satu fork repo plugin menambahkan uji langsung ke situs sungguhan karena plugin bisa rusak meski semua pemeriksaan statis lolos.
- Migrasi yang memutus data lama, seperti yang dialami pengguna rilis 2.0 LNReader.

Catatan: temuan dari kode adalah hasil membaca snapshot tertentu. Beberapa bug kecil terlihat pada snapshot lama ReadNovelFull (URL mode "terbaru" dan regex nomor chapter), dan mungkin sudah diperbaiki di versi sekarang.

**Sumber**

- [LNReader/lnreader issues](https://www.github.com/LNReader/lnreader/issues)
- [LNReader releases](https://lnreader.app/releases)
- [lnreader-plugins (repositori plugin)](https://github.com/lnreader/lnreader-plugins)
- [Plugin Meionovel, PR #2487](https://github.com/lnreader/lnreader-plugins/pull/2487/files)
- [Plugin ReadNovelFull, commit e09c58c](https://github.com/LNReader/lnreader-plugins/commit/e09c58c5f5fbc687d460a89074fb610de5f10a2f)
- [Royal Road: chapter dengan volume #1841](https://github.com/lnreader/lnreader-plugins/issues/1841)
- [Live-check CI (fork), PR #1](https://github.com/pdmacinnes/lnreader-plugins/pull/1)

## 6. Ruang lingkup dan fitur

v1.0 mencakup 14 fitur yang dibagi dalam tiga prioritas dan lima fase; semua yang tidak ada di tabel ini berada di luar v1.0.

| # | Fitur | Prioritas | Fase |
| --- | --- | --- | --- |
| F1 | Library: tambah, hapus, kategori, urutan | Wajib | 1 |
| F2 | Pembaca chapter: font, ukuran, jarak baris, tema terang dan gelap | Wajib | 1 |
| F3 | Lanjut dari posisi terakhir (per novel, per chapter) | Wajib | 1 |
| F4 | Impor EPUB dari penyimpanan HP | Wajib | 1 |
| F5 | Kontrak plugin dan pemuat plugin | Wajib | 2 |
| F6 | Penjelajahan dan pencarian novel lewat plugin | Wajib | 2 |
| F7 | Detail novel dan daftar chapter lengkap | Wajib | 2 |
| F8 | Unduh chapter untuk baca offline | Wajib | 3 |
| F9 | Penanda chapter baru dan pembaruan library | Wajib | 3 |
| F10 | Penanganan Cloudflare lewat WebView | Penting | 3 |
| F11 | Backup dan restore lengkap (data, progres, sampul) | Wajib | 4 |
| F12 | Pengecekan kelengkapan chapter | Penting | 4 |
| F13 | Text-to-speech | Opsional | 5 |
| F14 | Server sinkronisasi dengan Go | Opsional | 5 |

**Arti prioritas.** Wajib: tanpa ini v1.0 tidak dianggap selesai. Penting: dikerjakan bila waktu memungkinkan, dan v1.0 tetap sah tanpa ini. Opsional: setelah v1.0.

**Fase 5 sengaja di luar definisi selesai v1.0.** F13 dan F14 baru dikerjakan setelah kriteria di bagian 15 terpenuhi.

## 7. Alur pengguna

Tiga jalur masuk dari library (lanjut baca, jelajah sumber, impor EPUB) semuanya berakhir di pembaca, dan satu-satunya percabangan adalah saat sumber tidak merespons.

&#91;embedded content: alur utama · 3 jalur masuk, 1 percabangan\]

Lima alur rinci berikut menjadi dasar uji penerimaan tiap fase.

**Alur A. Membaca novel baru dari sumber**

1. Buka Jelajah, lalu pilih sumber (plugin).
2. Cari judul atau telusuri daftar populer.
3. Buka detail novel dan periksa daftar chapter.
4. Tambahkan ke library dan pilih kategori.
5. Buka chapter pertama. Posisi baca tersimpan otomatis.
6. Opsional: unduh chapter untuk dibaca offline.

**Alur B. Melanjutkan bacaan**

1. Buka library.
2. Ketuk novel. Aplikasi membuka chapter dan paragraf terakhir.
3. Baca. Saat chapter selesai, chapter berikutnya bisa dibuka dari pembaca.

**Alur C. Mengimpor EPUB**

1. Pilih Impor EPUB dan pilih berkas dari penyimpanan HP.
2. Aplikasi membaca metadata dan daftar bagian dari EPUB.
3. Novel muncul di library dengan sumber `local`.
4. Baca seperti novel lain.

**Alur D. Sumber bermasalah**

1. Aplikasi menampilkan error bertipe: `SiteBlockedError` atau `ParseError`.
2. Jika diblokir Cloudflare: buka WebView, selesaikan verifikasi, lalu coba lagi.
3. Jika struktur situs berubah: perbaiki file plugin, naikkan `version`, muat ulang plugin.
4. Jika tetap gagal: baca dari EPUB atau pindah ke sumber lain untuk bahasa yang sama.

**Alur E. Backup dan pindah HP**

1. Buka Pengaturan, pilih Backup, lalu simpan berkas ke tempat aman.
2. Di HP baru, pasang APK dan pilih Restore.
3. Library, kategori, progres, dan sampul pulih. Chapter terunduh tidak ikut backup dan diunduh ulang dari library (keputusan rancangan agar berkas backup kecil).

## 8. Sumber bacaan dan penggunaan konten

Kelengkapan bacaan dijamin dengan tiga lapis sumber, dan hanya lapis pertama dan kedua yang dibuat sebagai komitmen v1.0.

| Lapis | Jenis sumber | Contoh | Status |
| --- | --- | --- | --- |
| 1 | File EPUB milik sendiri | Buku yang dibeli atau dimiliki | Wajib, tidak bergantung situs mana pun |
| 2 | Karya domain publik, lisensi terbuka, dan platform tempat penulis mengunggah karyanya sendiri | Project Gutenberg, Wikisource, Royal Road | Wajib: minimal satu plugin Inggris dan satu plugin Indonesia berstatus legal |
| 3 | Situs lain, termasuk terjemahan penggemar | Ditentukan pemilik proyek | Di luar komitmen. Risiko dan tanggung jawab ada pada pengguna |

**Catatan kelengkapan bahasa Indonesia.** Hasil riset menunjukkan sumber Indonesia di ekosistem plugin yang ada sangat terbatas. Karena itu daftar kandidat sumber Indonesia diverifikasi lebih dulu di awal fase 2: status legal, stabilitas situs, ada tidaknya API, dan apakah dilindungi Cloudflare. Plugin baru dibuat hanya untuk yang lolos verifikasi.

**Syarat sebuah sumber boleh dibuatkan plugin**

1. Konten boleh diakses dan dibaca secara sah (domain publik, lisensi terbuka, atau diunggah penulisnya untuk dibaca publik).
2. Daftar chapter dan isi chapter bisa diambil secara lengkap, tanpa terpotong volume atau halaman.
3. Ada cara mengujinya langsung ke situs, bukan hanya pemeriksaan statis.
4. Jika dilindungi Cloudflare, ada jalur WebView yang bisa dilalui pengguna.

**Aturan penggunaan konten**

- Konten hanya disimpan di perangkat pengguna (unduhan dan cache) dan tidak diunggah ke server mana pun.
- Backup berisi data milik pengguna dan ditujukan untuk dipulihkan oleh pemiliknya sendiri, bukan dibagikan.
- Aplikasi tidak menyertakan novel dan tidak menyertakan daftar situs bajakan bawaan.
- Permintaan ke situs sumber dibatasi lajunya (ada jeda antar permintaan) agar tidak membebani situs.
- Mengambil karya berhak cipta dari sumber tanpa izin tetap melanggar hak cipta meski dipakai pribadi. Keputusan memakai sumber lapis 3 sepenuhnya tanggung jawab pemilik proyek.

## 9. Arsitektur dan tech stack

Semua komponen berjalan di dalam aplikasi di HP, dan satu-satunya lalu lintas keluar pada v1.0 adalah permintaan ke situs sumber lewat CapacitorHttp.

&#91;embedded content: arsitektur · 5 lapis, semua di HP\]

UI memanggil empat layanan. Layanan memakai plugin untuk mengambil data dan penyimpanan lokal untuk menyimpan. Jembatan Capacitor menghubungkan WebView ke jaringan dan berkas native. Server Go berada di luar v1.0.

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| UI | React + TypeScript | Sudah dikuasai, dan TypeScript membantu mendefinisikan kontrak plugin |
| Build | Vite | Menghasilkan file statis yang langsung dipakai Capacitor |
| Routing dan state | React Router, Zustand | Cukup untuk aplikasi satu halaman, tanpa banyak boilerplate |
| Pembungkus Android | Capacitor | Membungkus aplikasi web menjadi APK dan memberi akses fitur native |
| HTTP | CapacitorHttp | Mengirim permintaan lewat jaringan native sehingga CORS di WebView tidak memblokir scraping |
| Database | Dexie (IndexedDB), pindah ke SQLite bila library membesar | Dexie lebih mudah dimulai, SQLite lebih kuat untuk data besar |
| Daftar panjang | TanStack Virtual | Daftar chapter ribuan tetap mulus |
| EPUB | epub.js atau foliate-js | Untuk impor dan baca EPUB lokal |
| Plugin sumber | TypeScript, dikompilasi dengan esbuild menjadi file JS | Mudah diganti tanpa membangun ulang aplikasi |
| Parsing HTML | DOMParser bawaan WebView | Cheerio tidak wajib |
| Server opsional | Go | Hanya untuk sinkronisasi di fase 5, sekaligus latihan Go |

**Yang tidak dipakai pada v1.0.** Next.js tidak dipakai karena Capacitor hanya memuat file statis dan fitur server Next.js tidak terpakai. Laravel tidak dipakai karena tidak ada backend. Canvas tidak dipakai untuk pembaca karena teks di canvas tidak bisa diseleksi dan tidak ramah TTS.

## 10. Kontrak plugin sumber

Setiap sumber diwakili satu plugin dengan empat fungsi tetap, sehingga aplikasi memperlakukan semua sumber dengan cara yang sama dan memperbaiki satu sumber tidak menyentuh bagian lain.

```ts
type NovelStatus = 'ongoing' | 'completed' | 'hiatus' | 'unknown';

interface NovelItem   { name: string; path: string; cover?: string }
interface ChapterItem { name: string; path: string; chapterNumber?: number; releaseTime?: string }

interface SourceNovel {
  path: string; name: string; cover?: string;
  summary?: string; author?: string; genres?: string;
  status: NovelStatus;
  declaredChapterCount?: number;   // jumlah yang tertera di situs, untuk uji kelengkapan (F12)
  chapters: ChapterItem[];         // urut dari chapter paling awal
}

interface SourcePlugin {
  id: string; name: string; site: string; version: number;
  lang: 'en' | 'id';
  legal: 'public-domain' | 'author-platform' | 'user-risk';

  popularNovels(page: number, opts?: { latest?: boolean; filters?: unknown }): Promise<NovelItem[]>;
  searchNovels(query: string, page: number): Promise<NovelItem[]>;
  parseNovel(path: string): Promise<SourceNovel>;
  parseChapter(path: string): Promise<string>;   // HTML bersih
}
```

**Aturan kontrak**

1. `path` selalu relatif (tanpa domain). Domain hanya ada di `site`.
2. `chapters` selalu urut dari chapter paling awal dan lengkap. Jika situs memecah daftar per volume atau halaman, plugin menggabungkannya.
3. `parseChapter` mengembalikan HTML yang sudah dibersihkan dari iklan, skrip, dan elemen pelacak.
4. Kegagalan dilaporkan sebagai error bertipe. `SiteBlockedError` memicu jalur WebView untuk Cloudflare, dan `ParseError` menandai struktur situs berubah.
5. Plugin hanya menerima helper terbatas (permintaan HTTP dan parser HTML), tidak punya akses langsung ke database library.
6. Field `legal` wajib diisi dan ditampilkan di aplikasi.

**Siklus hidup plugin**

| Tahap | Apa yang terjadi | Fase |
| --- | --- | --- |
| Terdaftar | Plugin dikemas dalam aplikasi atau dimuat dari file/URL repositori milik sendiri | 2 |
| Dimuat | Aplikasi membaca metadata dan memvalidasi bentuknya | 2 |
| Dijalankan | Aplikasi memanggil empat fungsi lewat CapacitorHttp | 2 |
| Diuji | Skrip uji langsung menjalankan populer, cari, detail, dan chapter ke situs sungguhan; hasilnya LULUS, GAGAL, atau TIDAK PASTI (situs sedang down atau diblokir) | 2 |
| Diperbarui | Mengganti file plugin dan menaikkan `version`, tanpa membangun ulang APK jika dimuat dari file | 4 |

Pada v1.0 hanya plugin buatan sendiri atau dari repositori milik sendiri yang dimuat. Memasang plugin dari sumber tak dikenal tidak didukung.

## 11. Model data (ERD)

Data disimpan dalam tujuh tabel (enam berelasi dan satu tabel pengaturan) yang berpusat pada novel: satu sumber punya banyak novel, satu novel punya banyak chapter, dan satu chapter yang diunduh punya satu berkas isi.

&#91;embedded content: ERD · 6 tabel, 5 relasi\]

PK adalah kunci utama dan FK adalah kunci asing. `novel_category` menghubungkan novel dan kategori (banyak ke banyak).

**Catatan rancangan**

- Novel dari EPUB lokal memakai sumber khusus berid `local`, dan `local_file` menyimpan lokasi berkasnya.
- `source` yang `legal`-nya bernilai `user-risk` ditandai jelas di antarmuka.
- Progres baca disimpan di tabel `chapter` (`is_read`, `last_paragraph`, `updated_at`). Novel yang terakhir dibaca adalah chapter dengan `updated_at` terbaru.
- Isi chapter yang diunduh disimpan sebagai berkas di Filesystem. Tabel `chapter_content` hanya menyimpan path, ukuran, dan waktu unduh agar database tetap kecil.
- `declared_chapters` menyimpan jumlah chapter yang tertera di situs, dipakai pengecekan kelengkapan (F12).
- Kombinasi `source_id` dan `path` pada `novel` bersifat unik. `chapter` diindeks pada `novel_id` dan `position`.
- Pengaturan pembaca (font, ukuran, jarak baris, tema) disimpan sebagai pasangan kunci-nilai di tabel `setting`, tanpa relasi ke tabel lain.
- Backup menyerialkan semua tabel menjadi JSON dan menyertakan berkas sampul, sehingga restore memulihkan data utuh.

## 12. Persyaratan non-fungsional

Aplikasi harus tetap bisa dibaca offline, tidak kehilangan progres, dan mudah dirawat; angka di bawah adalah target awal yang disetujui pemilik proyek di akhir fase 1.

| Kategori | Persyaratan | Cara uji |
| --- | --- | --- |
| Offline | Chapter terunduh dan EPUB lokal terbuka tanpa internet | Mode pesawat, buka 3 chapter |
| Keandalan data | Progres baca tersimpan saat pindah halaman dan saat aplikasi ditutup paksa | Tutup paksa, buka lagi, cek posisi |
| Performa | Daftar chapter berisi ribuan item tetap mulus digulir (daftar divirtualisasi) | Uji dengan novel berchapter ribuan |
| Keamanan | Isi chapter disanitasi (tanpa skrip), plugin hanya mendapat helper terbatas, tidak ada kredensial atau token disimpan di aplikasi | Tinjau kode, uji chapter berisi skrip |
| Privasi | Tidak ada analitik, tidak ada pelacak, tidak ada data keluar selain permintaan ke sumber yang dipilih pengguna | Periksa lalu lintas jaringan sekali |
| Aksesibilitas | Teks dirender sebagai DOM (bisa diseleksi dan dibaca TTS), kontras tema cukup, ukuran font bisa diatur | Uji manual |
| Perawatan | Memperbaiki plugin rusak tidak butuh membangun ulang APK bila plugin dimuat dari file | Catat waktu perbaikan nyata pertama |
| Portabilitas data | Backup berupa file JSON beserta berkas sampul, dapat dibaca manusia | Buka file backup di editor teks |
| Rilis | APK ditandatangani dengan keystore tetap sehingga pembaruan menimpa versi lama dan data aman. Pengaturan `server.url` live-reload dihapus dari build harian | Pasang ulang di atas versi lama, data masih ada |
| Kompatibilitas | HP Android milik pemilik proyek menjadi perangkat acuan. Versi Android minimum ditetapkan saat proyek disiapkan | Uji di perangkat acuan |

## 13. Roadmap dan milestone

v1.0 dicapai lewat empat fase berurutan, tiap fase berakhir pada gerbang yang harus lolos sebelum fase berikutnya, dan fase 5 sengaja berada di luar definisi selesai.

&#91;embedded content: roadmap · 5 fase, 4 gerbang\]

Gambar ini tidak berskala waktu: dokumen sengaja tidak memberi tanggal karena belum ada data waktu pengerjaan. Pemilik proyek menetapkan perkiraan durasi sebelum tiap fase dimulai.

| Gerbang | Kriteria lolos | Jika tidak lolos |
| --- | --- | --- |
| 1 | EPUB lokal terbuka dan terbaca di HP tanpa laptop, library dan posisi terakhir berfungsi | Perbaiki pembaca dan penyimpanan sebelum menyentuh plugin |
| 2 | Satu plugin Inggris dan satu plugin Indonesia berstatus legal berjalan penuh (cari, detail, chapter lengkap) di HP, lewat CapacitorHttp | Kurangi cakupan ke satu bahasa, atau hentikan dan pakai LNReader |
| 3 | Chapter terunduh terbaca di mode pesawat, chapter baru terdeteksi, jalur WebView bekerja | Tunda fitur pembaruan, pertahankan unduhan |
| 4 | Semua kriteria di bagian 15 terpenuhi | Jangan mulai fase 5. Selesaikan yang tersisa |

**Aturan antarfase.** Di akhir tiap fase, tinjau cakupan: fitur yang tidak muat dipindahkan ke fase 5, bukan ditambahkan ke fase berjalan. Fase 5 (TTS dan server sinkronisasi Go) dimulai hanya setelah gerbang 4 lolos.

## 14. Risiko dan mitigasi

Risiko terbesar bukan teknis murni, melainkan sumber yang berubah dan tenaga perawatan satu orang; keduanya ditangani dengan desain plugin terisolasi dan jalur EPUB lokal yang tidak bisa rusak oleh situs.

| # | Risiko | Kemungkinan | Dampak | Mitigasi |
| --- | --- | --- | --- | --- |
| R1 | Situs sumber berubah struktur dan plugin rusak | Tinggi | Sedang | Plugin terisolasi per sumber, skrip uji langsung ke situs, plugin dimuat dari file agar mudah diganti |
| R2 | Cloudflare memblokir permintaan | Tinggi | Sedang | Jalur WebView untuk melewati verifikasi, error bertipe yang jelas, dan EPUB lokal sebagai cadangan |
| R3 | CORS memblokir permintaan dari WebView | Pasti jika tidak ditangani | Tinggi | Aktifkan CapacitorHttp sejak fase 2 dan uji di perangkat, bukan hanya di browser |
| R4 | Daftar chapter terpotong tanpa disadari | Sedang | Tinggi | Kolom `declaredChapterCount`, pengecekan kelengkapan (F12), aturan plugin menggabungkan volume dan halaman |
| R5 | Sumber Indonesia terlalu sedikit atau tidak stabil | Tinggi | Sedang | Verifikasi kandidat di awal fase 2, impor EPUB, dan menulis plugin sendiri bila perlu |
| R6 | Masalah hukum karena konten berhak cipta | Tergantung sumber | Tinggi | Pemakaian pribadi, tanpa distribusi, tanpa konten bawaan, prioritas pada sumber legal, field `legal` pada tiap plugin |
| R7 | Plugin Capacitor komunitas berhenti dirawat | Sedang | Sedang | Cek tanggal rilis dan issue sebelum memakai, bungkus akses native di satu lapisan sehingga mudah diganti |
| R8 | Performa buruk pada daftar panjang | Sedang | Sedang | Virtualisasi daftar sejak awal, indeks database pada kolom yang sering dicari |
| R9 | Kehilangan data saat pasang ulang APK | Sedang | Tinggi | Keystore tetap, backup rutin, restore diuji pada fase 4 |
| R10 | Pembaruan chapter latar belakang terbatas di WebView | Tinggi | Rendah | Pembaruan dijalankan saat aplikasi dibuka, bukan secara terus-menerus di latar belakang |
| R11 | Proyek melebar dan tidak selesai | Sedang | Tinggi | Non-tujuan yang tegas, fase 5 di luar definisi selesai, tinjau cakupan di akhir tiap fase |
| R12 | Tenaga perawatan hanya satu orang | Pasti | Sedang | Batasi jumlah plugin aktif, hapus sumber yang tidak dipakai, dokumentasikan cara memperbaiki plugin |

## 15. Definisi selesai

v1.0 selesai ketika seluruh kotak di bawah tercentang, diuji di HP acuan tanpa laptop menyala.

**Fungsi**

- [ ] Library dengan kategori berjalan (F1)
- [ ] Pembaca chapter dengan font, jarak baris, dan tema terang/gelap (F2)
- [ ] Lanjut dari posisi terakhir tepat di paragraf terakhir (F3)
- [ ] Impor dan baca EPUB lokal (F4)
- [ ] Kontrak plugin, pemuat plugin, penjelajahan, pencarian, dan detail novel (F5 sampai F7)
- [ ] Minimal satu plugin Inggris dan satu plugin Indonesia berstatus legal berfungsi penuh
- [ ] Unduh chapter dan baca offline (F8)
- [ ] Penanda chapter baru dan pembaruan library (F9)
- [ ] Jalur WebView untuk Cloudflare (F10)
- [ ] Backup dan restore lengkap, termasuk sampul dan progres (F11)
- [ ] Pengecekan kelengkapan chapter (F12)

**Mutu**

- [ ] Semua metrik di bagian 3 tercapai
- [ ] Semua persyaratan di bagian 12 lolos uji
- [ ] Pengecekan kelengkapan lolos untuk 5 novel uji
- [ ] Restore backup lolos 3 kali uji
- [ ] Pasang ulang APK di atas versi lama tidak menghapus data

**Penutup**

- [ ] APK harian dibangun dari konfigurasi produksi (tanpa `server.url`)
- [ ] Keystore dan file backup pertama tersimpan di tempat aman
- [ ] Dokumen singkat cara memperbaiki plugin yang rusak
- [ ] Aplikasi dipakai membaca selama 14 hari berturut-turut tanpa membuka laptop

Setelah semua tercentang, proyek dinyatakan selesai. Fase 5 (TTS dan server sinkronisasi) adalah proyek lanjutan yang terpisah dan tidak menunda status selesai v1.0.

## 16. Keputusan dan pertanyaan terbuka

Empat keputusan inti sudah diambil, dan enam pertanyaan masih menunggu jawaban pemilik proyek sebelum fase terkait dimulai.

**Keputusan yang sudah diambil**

| Keputusan | Alasan |
| --- | --- |
| Capacitor untuk Android | Cocok dengan keahlian web, plugin sumber berupa file JS mudah dimuat, gratis, dan bisa dipasang sebagai APK pribadi |
| React + TypeScript + Vite, bukan Next.js | Capacitor hanya memuat file statis, fitur server Next.js tidak terpakai |
| Tanpa backend pada v1.0 | Semua data dan scraping berjalan di HP, tidak perlu laptop menyala |
| Teks dirender dengan DOM, bukan canvas | Bisa diseleksi, ramah TTS dan aksesibilitas, pengaturan tampilan lewat CSS |

**Pertanyaan terbuka**

- [ ] Versi Android pada HP acuan, untuk menetapkan versi minimum (sebelum fase 1)
- [ ] Mulai dengan Dexie/IndexedDB atau langsung SQLite? Usulan: Dexie dulu, pindah bila library membesar (sebelum fase 1)
- [ ] Plugin v1.0 dikemas di dalam aplikasi atau dimuat dari file/URL repositori sendiri? Usulan: dikemas dulu, pemuatan dari file di akhir fase 2
- [ ] Daftar sumber Indonesia yang lolos verifikasi legal dan teknis (awal fase 2)
- [ ] Apakah kode atau format plugin LNReader boleh dipakai ulang? Perlu pengecekan lisensi repositori sebelum menyalin apa pun (awal fase 2)
- [ ] Setelah fase 2, apakah aplikasi ini lebih berguna daripada LNReader untuk bacaanmu? Jika tidak, hentikan dan pakai LNReader (akhir fase 2)

Semua angka target pada dokumen ini adalah usulan awal dan perlu disetujui pemilik proyek.
