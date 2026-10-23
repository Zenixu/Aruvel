# design.md — Aplikasi Pembaca Novel Pribadi

Dokumen ini adalah acuan tampilan untuk PRD aplikasi pembaca novel. Aturan di sini mengikat: kalau sebuah layar butuh sesuatu yang tidak ada di sini, perbarui dokumen ini dulu, baru tambahkan ke aplikasi.

## 1. Sudut pandang

**Aplikasi ini adalah buku, bukan dasbor.** Produknya adalah teks. Antarmuka menepi saat membaca dan hadir secukupnya saat mengelola library.

Tiga prinsip yang dipakai untuk memutuskan semua hal lain:

1. **Tipografi dulu, dekorasi nanti.** Hierarki dibangun dari ukuran, bobot, jarak, dan garis tipis, bukan dari kotak, bayangan, atau warna.
2. **Tenang dan padat informasi.** Pengguna tunggal yang membaca tiap hari butuh daftar yang rapat dan mudah dipindai, bukan layar yang lapang dan kosong.
3. **Jujur.** Pesan, status, dan label menyebut apa yang sebenarnya terjadi. Tidak ada angka palsu, tidak ada kata penyemangat.

## 2. Daftar anti-"AI slop"

Ciri tampilan generik hasil otomatis, dan penggantinya di proyek ini.

| Ciri generik yang dihindari | Gantinya |
| --- | --- |
| Gradien ungu-biru, kilau, dan glassmorphism | Warna datar, satu aksen, tanpa gradien |
| Kartu bersudut sangat bulat dengan bayangan lembut di mana-mana | Garis tipis 1px sebagai pemisah, sudut kecil (4 sampai 6px), tanpa bayangan |
| Emoji sebagai ikon atau hiasan judul | Teks, atau satu set ikon garis yang konsisten dan hanya bila perlu |
| Satu font sans-serif netral untuk semuanya | Serif untuk bacaan dan judul, sans humanis untuk kontrol |
| Layar sambutan berpusat, ilustrasi kosong, dan "Selamat datang kembali!" | Langsung ke library. Keadaan kosong berisi instruksi nyata |
| Pesan galat ramah tapi kosong ("Oops, ada yang salah!") | Pesan spesifik: apa yang gagal dan apa yang bisa dilakukan |
| Statistik dan grafik hiasan yang tidak diminta | Hanya data yang dipakai membaca: posisi, jumlah chapter, chapter baru |
| Animasi masuk di mana-mana, efek pegas, skeleton berkilau | Gerak fungsional saja (bagian 8) |
| Teks abu-abu muda di atas putih | Kontras jelas, uji dengan pemeriksa kontras |
| Tata letak simetris sempurna dengan ikon besar di atas judul | Tata letak berbasis garis dasar teks, rata kiri |

## 3. Warna

Satu aksen, tiga tema. Semua warna dipakai lewat variabel CSS, tidak ada nilai heksa langsung di komponen.

Nilai kontras di bawah adalah perkiraan hitungan kasar. Verifikasi dengan alat pemeriksa kontras sebelum dipakai. Target: teks isi minimal 4,5 banding 1.

| Token | Kertas (terang) | Sepia | Malam (indigo, gelap) |
| --- | --- | --- | --- |
| `--bg` | `#F6F1E7` | `#EADFC6` | `#14163A` |
| `--surface` | `#EFE8DA` | `#E0D3B6` | `#252B6B` |
| `--text` | `#1F1B16` | `#33291C` | `#F4EFE1` |
| `--muted` | `#6B6358` | `#665A47` | `#A9ADE0` |
| `--rule` | `#D9D0BF` | `#CFC09F` | `#343B80` |
| `--accent` | `#8C2F1B` | `#7A3B1E` | `#C8A45C` |
| `--on-accent` | `#F6F1E7` | `#EADFC6` | `#14163A` |

Aturan pemakaian:

- **Aksen hanya untuk tiga hal:** aksi utama, tautan, dan indikator progres. Bila aksen dihapus, hierarki harus tetap terbaca.
- Tema Malam memakai palet indigo dan emas (lihat subbagian berikut), bukan hitam. Sediakan opsi Hitam (`#000000`) untuk layar AMOLED sebagai pilihan terpisah, dengan teks dan aksen yang sama seperti Malam.
- Status galat dan peringatan memakai teks yang menyebut masalahnya, ditambah warna sebagai pendukung, bukan satu-satunya penanda.

### Tema Malam: indigo dan emas

Lima warna pilihan pemilik proyek, dengan peran yang tetap:

| Warna | Nilai | Peran |
| --- | --- | --- |
| Deep indigo | `#14163A` | Latar halaman dan pembaca |
| Royal indigo | `#252B6B` | Permukaan terangkat: lembar bawah, panel, baris terpilih |
| Sweet indigo | `#A9ADE0` | Teks pendukung: penulis, tanggal, label, chapter yang sudah dibaca |
| Ivory | `#F4EFE1` | Teks utama dan judul |
| Muted gold | `#C8A45C` | Satu-satunya aksen: aksi utama, tautan, garis progres |

Turunan: `--rule` adalah `#343B80` (royal indigo yang lebih terang) untuk garis pemisah, dan `--text-read` adalah `#E4DECF` (ivory yang diredam) khusus paragraf bacaan panjang agar tidak menyilaukan di ruang gelap.

Perkiraan kontras dari hitungan kasar, verifikasi dengan alat pemeriksa kontras:

| Pasangan | Perkiraan |
| --- | --- |
| Ivory di atas deep indigo | sekitar 15 banding 1 |
| Sweet indigo di atas deep indigo | sekitar 8 banding 1 |
| Sweet indigo di atas royal indigo | sekitar 6 banding 1 |
| Muted gold di atas deep indigo | sekitar 7 banding 1 |
| Muted gold di atas royal indigo | sekitar 5,5 banding 1 |
| Deep indigo di atas tombol muted gold | sekitar 7 banding 1 |

Aturan agar palet ini tidak jadi tampilan "mewah" yang generik:

- Warna datar. Tidak ada gradien indigo ke ungu, tidak ada kilau atau glow emas.
- Indigo dijaga condong ke biru (rona sekitar 235 derajat), tidak ke arah ungu.
- Emas hanya untuk peran aksen di atas. Jangan dipakai untuk isian area besar, bingkai hias, atau ikon dekoratif. Bila emas dihapus, hierarki tetap terbaca.
- Royal indigo hanya untuk permukaan yang terangkat, tidak untuk latar halaman penuh.
- Teks di atas tombol emas memakai `--on-accent` (deep indigo).

## 4. Tipografi

Dua keluarga font saja, dibundel lokal agar aplikasi tetap tampil benar saat offline (misalnya lewat paket `@fontsource`; cek ketersediaan paket sebelum memakai).

| Peran | Pilihan | Catatan |
| --- | --- | --- |
| Isi bacaan dan judul | Literata (alternatif: Source Serif 4, Newsreader) | Serif yang dirancang untuk membaca di layar |
| Kontrol dan label | Hanken Grotesk (alternatif: Source Sans 3) | Sans humanis, jelas di ukuran kecil |

Skala UI (px): 12, 14, 16, 20, 28. Tidak ada ukuran di luar skala.

**Pengaturan pembaca (F2)**

| Pengaturan | Rentang | Bawaan |
| --- | --- | --- |
| Ukuran font | 14 sampai 28 px | 18 px |
| Tinggi baris | 1,4 sampai 2,0 | 1,65 |
| Lebar kolom | maks 66 karakter (`66ch`) | 66ch |
| Gaya paragraf | jarak antarparagraf, atau indentasi baris pertama | indentasi (rasa buku) |
| Perataan | rata kiri, atau rata kiri-kanan | rata kiri |

Detail yang menentukan mutu bacaan:

- Setel atribut `lang` per novel (`en` atau `id`) agar pemenggalan kata (`hyphens: auto`) benar.
- Pakai `text-wrap: pretty` untuk isi paragraf.
- Angka di daftar chapter memakai `font-variant-numeric: tabular-nums` supaya sejajar.
- Teks dirender sebagai DOM, bisa diseleksi dan dibaca TTS (sesuai PRD bagian 12).

## 5. Tata letak dan bentuk

- Grid dasar 4 px. Token jarak: 4, 8, 12, 16, 24, 32.
- Gutter layar 16 px. Area sentuh minimal 48 px.
- Sudut: 4 px untuk sampul dan kontrol kecil, 6 px untuk panel. Tidak ada sudut di atas 8 px.
- Pemisah: garis 1 px berwarna `--rule`. Tanpa bayangan di mana pun.
- Sampul: rasio 2:3, sudut 4 px, garis dalam 1 px tipis agar sampul terang tidak melebur dengan latar.

## 6. Komponen dan layar

**Library**
- Grid sampul 3 kolom, dengan opsi tampilan daftar.
- Jumlah chapter belum dibaca ditulis sebagai angka kecil di pojok sampul, bukan gelembung merah.
- Kategori sebagai tab teks di atas, bukan chip berwarna.

**Detail novel**
- Judul serif besar, penulis dan status sebagai satu baris `--muted`.
- Daftar chapter rapat: satu baris per chapter, nomor di kiri dengan angka tabular, tanggal di kanan.
- Chapter yang sudah dibaca ditandai dengan teks yang lebih pudar, bukan ikon centang.
- Chapter terunduh ditandai dengan satu tanda kecil yang konsisten, dijelaskan di legenda sekali.

**Pembaca**
- Layar penuh untuk teks. Ketuk tengah untuk menampilkan atau menyembunyikan kontrol.
- Progres berupa garis 2 px di tepi bawah, bukan bilah tebal.
- Pengaturan tampilan dalam lembar dari bawah (bottom sheet) dengan pratinjau langsung.

**Jelajah**
- Pemilih sumber berupa daftar teks polos. Tiap baris menampilkan nama, bahasa, dan status `legal` (domain publik, platform penulis, atau risiko pengguna) sebagai kata, bukan warna.

**Pengaturan**
- Daftar bergrup dengan judul grup kecil dan baris teks. Tanpa ikon di setiap baris.

## 7. Bahasa dan nada teks UI

- Bahasa Indonesia yang lugas. Istilah teknis dipakai bila memang lazim (misalnya "library", "plugin").
- Tanpa tanda seru, tanpa emoji, tanpa basa-basi.
- Pesan galat menyebut apa yang gagal dan jalan keluarnya.

Contoh:

| Alih-alih | Tulis |
| --- | --- |
| "Oops! Terjadi kesalahan." | "Cloudflare memblokir permintaan. Buka lewat WebView, selesaikan verifikasi, lalu coba lagi." |
| "Belum ada novel. Yuk mulai!" | "Library kosong. Buka Jelajah untuk menambah novel, atau impor berkas EPUB." |
| "Berhasil!" | "Backup tersimpan di Dokumen/novel-backup-2026-10-23.json." |

## 8. Gerak

- Hanya untuk fungsi: lembar dari bawah muncul 150 ms, `ease-out`. Perubahan tema melebur 150 ms.
- Tidak ada animasi masuk untuk daftar, efek pegas, parallax, atau animasi hias.
- Hormati `prefers-reduced-motion`: semua gerak dimatikan.
- Keadaan memuat memakai teks atau indikator statis, bukan skeleton berkilau.

## 9. Sampul yang hilang

Bila sumber tidak punya sampul, jangan pakai ikon buku generik. Buat **sampul tipografis**: judul dalam serif di atas warna datar yang dipilih secara deterministik dari hash judul, dari enam warna tanah berikut.

| Nama | Warna |
| --- | --- |
| Merah hati | `#8C2F1B` |
| Lumut | `#3F5B4A` |
| Biru tinta | `#2F4A5E` |
| Oker | `#7A5A22` |
| Ungu buah | `#5A3F5E` |
| Grafit | `#4A4A44` |

Teks sampul memakai `#F6F1E7`. Judul besar saja, tanpa gradien, tanpa ornamen.

## 10. Ikon

- Satu set ikon garis dengan ketebalan konsisten (misalnya Phosphor, bobot Regular). Tidak mencampur set.
- Ikon dipakai bila teks tidak cukup. Aksi penting tetap berlabel teks.

## 11. Aksesibilitas

- Kontras teks isi minimal 4,5 banding 1 pada ketiga tema dan tema Hitam.
- Area sentuh minimal 48 px.
- Ukuran font mengikuti pengaturan pembaca dan tidak dikunci.
- Informasi tidak hanya disampaikan lewat warna.

## 12. Token CSS awal

```css
:root {
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s6: 24px; --s8: 32px;
  --r-sm: 4px; --r-md: 6px;
  --font-read: 'Literata', Georgia, serif;
  --font-ui: 'Hanken Grotesk', system-ui, sans-serif;
  --reader-size: 18px;
  --reader-lh: 1.65;
  --reader-measure: 66ch;
}

:root[data-theme='kertas'] {
  --bg: #F6F1E7; --surface: #EFE8DA; --text: #1F1B16;
  --muted: #6B6358; --rule: #D9D0BF; --accent: #8C2F1B;
}
:root[data-theme='sepia'] {
  --bg: #EADFC6; --surface: #E0D3B6; --text: #33291C;
  --muted: #665A47; --rule: #CFC09F; --accent: #7A3B1E;
}
:root[data-theme='malam'] {
  --bg: #14120F; --surface: #1C1915; --text: #E8E0D2;
  --muted: #A39A8A; --rule: #2E2922; --accent: #D98B6A;
}

.reader {
  font-family: var(--font-read);
  font-size: var(--reader-size);
  line-height: var(--reader-lh);
  max-width: var(--reader-measure);
  hyphens: auto;
  text-wrap: pretty;
  color: var(--text);
  background: var(--bg);
}
.chapter-number { font-variant-numeric: tabular-nums; }
```

## 13. Uji sebelum sebuah layar dianggap jadi

1. **Uji menyipit:** kecilkan tangkapan layar. Apakah hierarki masih terbaca tanpa membaca kata-katanya?
2. **Uji abu-abu:** ubah tangkapan layar menjadi hitam-putih. Apakah informasi tetap jelas tanpa warna?
3. **Uji tanpa aksen:** hapus warna aksen. Apakah layar tetap bisa dipakai?
4. **Hitung:** font tidak lebih dari 2 keluarga, bayangan 0, gradien 0, emoji 0, sudut di atas 8 px 0.
5. **Uji kata:** apakah ada kalimat yang tidak memberi informasi (basa-basi, tanda seru)?
6. **Uji nyata:** baca satu chapter penuh di HP sendiri pada tema Malam dan Kertas.

## 14. Aturan untuk agen kode

Bila kode UI dibuat dengan bantuan AI, sertakan aturan ini di awal setiap tugas:

- Baca `design.md` sebelum membuat atau mengubah tampilan.
- Semua warna, jarak, dan sudut lewat variabel CSS di bagian 12. Jangan menambah nilai baru tanpa memperbarui dokumen ini.
- Dilarang: gradien, bayangan, emoji, kartu bersudut bulat, animasi masuk, teks sambutan.
- Periksa komponen yang sudah ada sebelum membuat yang baru.
- Seluruh teks UI dalam bahasa Indonesia yang lugas, tanpa tanda seru.
- Setelah selesai, jalankan uji di bagian 13 pada layar yang diubah dan laporkan hasilnya.

## 15. Inspirasi (bukan untuk ditiru mentah-mentah)

- *Practical Typography* oleh Matthew Butterick: dasar pilihan ukuran, tinggi baris, dan lebar kolom.
- Standard Ebooks: contoh tipografi buku digital yang rapi untuk karya domain publik.
- Mihon dan LNReader: pola library, daftar chapter, dan pembaca yang sudah teruji pemakai.

Perlu diverifikasi sebelum dipakai: ketersediaan paket font lokal, keterbacaan font pilihan pada HP acuan, dan kontras tiap tema.
