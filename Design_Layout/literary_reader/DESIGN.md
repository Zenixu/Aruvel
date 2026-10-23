---
name: Literary Reader
colors:
  surface: '#fff8f3'
  surface-dim: '#e2d8d0'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf2e9'
  surface-container: '#f6ece4'
  surface-container-high: '#f0e7de'
  surface-container-highest: '#eae1d8'
  on-surface: '#1f1b16'
  on-surface-variant: '#56423d'
  inverse-surface: '#34302a'
  inverse-on-surface: '#f9efe6'
  outline: '#8a726c'
  outline-variant: '#ddc0ba'
  surface-tint: '#a13e29'
  primary: '#6c1806'
  on-primary: '#ffffff'
  primary-container: '#8c2f1b'
  on-primary-container: '#ffab99'
  inverse-primary: '#ffb4a4'
  secondary: '#655d52'
  on-secondary: '#ffffff'
  secondary-container: '#e9ded0'
  on-secondary-container: '#696156'
  tertiary: '#003d52'
  on-tertiary: '#ffffff'
  tertiary-container: '#005572'
  on-tertiary-container: '#8bc8ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a4'
  on-primary-fixed: '#3d0600'
  on-primary-fixed-variant: '#812714'
  secondary-fixed: '#ece1d3'
  secondary-fixed-dim: '#d0c5b8'
  on-secondary-fixed: '#201b12'
  on-secondary-fixed-variant: '#4d463c'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#91cef0'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d67'
  background: '#fff8f3'
  on-background: '#1f1b16'
  surface-variant: '#eae1d8'
  paper-bg: '#F6F1E7'
  paper-surface: '#EFE8DA'
  paper-text: '#1F1B16'
  paper-muted: '#6B6358'
  paper-rule: '#D9D0BF'
  paper-accent: '#8C2F1B'
  paper-on-accent: '#F6F1E7'
  sepia-bg: '#EADFC6'
  sepia-surface: '#E0D3B6'
  sepia-text: '#33291C'
  sepia-muted: '#665A47'
  sepia-rule: '#CFC09F'
  sepia-accent: '#7A3B1E'
  sepia-on-accent: '#EADFC6'
  night-bg: '#14163A'
  night-surface: '#252B6B'
  night-muted: '#A9ADE0'
  night-text: '#F4EFE1'
  night-accent: '#C8A45C'
  night-rule: '#343B80'
  night-text-read: '#E4DECF'
  night-on-accent: '#14163A'
  amoled-bg: '#000000'
  amoled-surface: '#121212'
  amoled-text: '#F4EFE1'
  amoled-muted: '#A9ADE0'
  amoled-rule: '#2A2A2A'
  amoled-accent: '#C8A45C'
typography:
  headline-lg:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Literata
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-reading:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-lg:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Literata
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

# design.md — Aplikasi Pembaca Novel Pribadi (Aruvel)

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
| Animasi masuk di mana-mana, efek pegas, skeleton berkilau | Gerak fungsional saja |
| Teks abu-abu muda di atas putih | Kontras jelas, uji dengan pemeriksa kontras |
| Tata letak simetris sempurna dengan ikon besar di atas judul | Tata letak berbasis garis dasar teks, rata kiri |

## 3. Warna

Satu aksen, tiga tema utama + tema hitam AMOLED. Semua warna dipakai lewat variabel CSS, tidak ada nilai heksa langsung di komponen.

- **Aksen hanya untuk tiga hal:** aksi utama, tautan, dan indikator progres. Bila aksen dihapus, hierarki harus tetap terbaca.
- Tema Malam memakai palet indigo dan emas, bukan hitam pekat (kecuali opsi tema Hitam AMOLED khusus).
- Status galat dan peringatan memakai teks yang menyebut masalahnya, ditambah warna sebagai pendukung, bukan satu-satunya penanda.

### Tema Kertas (Terang)
- `--bg`: `#F6F1E7`
- `--surface`: `#EFE8DA`
- `--text`: `#1F1B16`
- `--muted`: `#6B6358`
- `--rule`: `#D9D0BF`
- `--accent`: `#8C2F1B`
- `--on-accent`: `#F6F1E7`

### Tema Sepia
- `--bg`: `#EADFC6`
- `--surface`: `#E0D3B6`
- `--text`: `#33291C`
- `--muted`: `#665A47`
- `--rule`: `#CFC09F`
- `--accent`: `#7A3B1E`
- `--on-accent`: `#EADFC6`

### Tema Malam: Indigo dan Emas
- Deep indigo (`--bg`): `#14163A` (Latar halaman dan pembaca)
- Royal indigo (`--surface`): `#252B6B` (Permukaan terangkat: lembar bawah, panel, baris terpilih)
- Sweet indigo (`--muted`): `#A9ADE0` (Teks pendukung: penulis, tanggal, label, chapter sudah dibaca)
- Ivory (`--text`): `#F4EFE1` (Teks utama dan judul)
- Muted gold (`--accent`): `#C8A45C` (Satu-satunya aksen: aksi utama, tautan, garis progres)
- Rule (`--rule`): `#343B80`
- Reading text (`--text-read`): `#E4DECF`
- `--on-accent`: `#14163A`

### Tema Hitam AMOLED
- `--bg`: `#000000`
- `--surface`: `#121212`
- `--text`: `#F4EFE1`
- `--muted`: `#A9ADE0`
- `--rule`: `#2A2A2A`
- `--accent`: `#C8A45C`

Aturan palet:
- Warna datar. Tanpa gradien, kilau, atau glow.
- Indigo condong ke biru (rona ~235°).
- Emas hanya untuk peran aksen kecil.

## 4. Tipografi

Dua keluarga font saja:
- Isi bacaan dan judul: Literata (alternatif: Source Serif 4, Georgia)
- Kontrol dan label: Hanken Grotesk (alternatif: Source Sans 3, system-ui)

Skala UI (px): 12, 14, 16, 20, 28. Tidak ada ukuran di luar skala.
- Pengaturan pembaca bawaan: Font 18px, Line-height 1.65, Lebar kolom maks 66ch, indentasi paragraf, rata kiri.
- Angka di daftar chapter: `font-variant-numeric: tabular-nums`.

## 5. Tata Letak dan Bentuk

- Grid dasar 4px (Token: 4, 8, 12, 16, 24, 32px).
- Gutter layar: 16px. Area sentuh minimal: 48px.
- Sudut (border-radius): 4px untuk sampul dan kontrol kecil, 6px untuk panel/sheet. Maksimal 8px.
- Pemisah: garis 1px berwarna `--rule`. Tanpa bayangan (box-shadow: none).
- Sampul: rasio 2:3, sudut 4px, border 1px tipis.
