import { useState } from 'react'
import './App.css'

const themes = ['kertas', 'sepia', 'malam', 'hitam'] as const
type Theme = (typeof themes)[number]

export default function App() {
  const [theme, setTheme] = useState<Theme>('kertas')

  return (
    <main className="app" data-theme={theme}>
      <header className="topbar"><span className="wordmark">Aruvel</span><span className="eyebrow">PEMBACA NOVEL PRIBADI</span></header>
      <section className="intro" aria-labelledby="title">
        <p className="eyebrow">P1.1 · FONDASI</p>
        <h1 id="title">Ruang untuk membaca.</h1>
        <p className="description">Fondasi aplikasi siap. Pilih tema untuk melihat tampilan dasar.</p>
      </section>
      <section className="theme-picker" aria-labelledby="themes-heading">
        <h2 id="themes-heading">Tema tampilan</h2>
        <div className="theme-options">{themes.map((item) => (
          <button key={item} type="button" aria-pressed={theme === item} onClick={() => setTheme(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
        ))}</div>
      </section>
      <article className="reading-sample" lang="id">
        <p className="chapter-label">CONTOH TIPOGRAFI PEMBACA</p>
        <h2>Halaman pertama</h2>
        <p>Setiap cerita dimulai dari sebuah kalimat. Di sini, teks menjadi pusat perhatian—tanpa hiasan yang mengganggu, dengan ruang yang cukup untuk mengikuti alurnya.</p>
      </article>
      <footer>ARUVEL · FONDASI PEMBACA</footer>
    </main>
  )
}
