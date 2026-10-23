import { useEffect, useRef, useState } from 'react'
import { db } from '../../core/db/database'
import './reader.css'

type ReaderSettings = { fontSize: number; lineHeight: number; columnWidth: number; paragraphStyle: 'indent' | 'spacing'; align: 'left' | 'justify'; theme: 'kertas' | 'sepia' | 'malam' | 'hitam' }
const defaults: ReaderSettings = { fontSize: 18, lineHeight: 1.65, columnWidth: 66, paragraphStyle: 'indent', align: 'left', theme: 'kertas' }
const sampleParagraphs = [
  'Hujan turun sejak matahari tenggelam. Di ujung jalan, sebuah toko buku kecil masih menyalakan lampunya.',
  'Nara mendorong pintu kayu itu. Lonceng di atasnya berbunyi pelan, disusul aroma kertas tua dan teh hangat.',
  '“Kau terlambat,” kata penjaga toko tanpa mengangkat kepala dari bukunya.',
  'Nara melihat jam di dinding. Jarumnya berhenti tepat di tengah malam, padahal ponselnya menunjukkan pukul sembilan.',
  'Di rak paling belakang, sebuah buku terbuka sendiri. Halaman kosongnya mulai dipenuhi tulisan yang ia kenal.',
]

export default function Reader({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ReaderSettings>(defaults)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [paragraphIndex, setParagraphIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([])
  const scrollTimer = useRef<number | undefined>(undefined)
  const touchStartX = useRef<number | undefined>(undefined)
  const touchStartY = useRef<number | undefined>(undefined)
  const touchMoved = useRef(false)
  const suppressNextClick = useRef(false)
  const touchResetTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    void Promise.all([
      db.settings.get('reader.settings'),
      db.settings.get('reader.sample.lastParagraph'),
    ]).then(([storedSettings, storedPosition]) => {
      if (storedSettings) {
        try { setSettings({ ...defaults, ...JSON.parse(storedSettings.value) as Partial<ReaderSettings> }) } catch { /* Abaikan data pengaturan rusak; nilai bawaan tetap aman. */ }
      }
      const index = Number(storedPosition?.value ?? 0)
      setParagraphIndex(Number.isInteger(index) ? Math.max(0, Math.min(index, sampleParagraphs.length - 1)) : 0)
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    paragraphRefs.current[paragraphIndex]?.scrollIntoView?.({ block: 'start' })
    void db.settings.put({ key: 'reader.sample.lastParagraph', value: String(paragraphIndex) })
  }, [paragraphIndex, ready])

  useEffect(() => () => {
    window.clearTimeout(scrollTimer.current)
    window.clearTimeout(touchResetTimer.current)
  }, [])

  function handleArticleClick(event: React.MouseEvent<HTMLElement>) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    if (event.detail === 0 || !window.getSelection()?.toString()) setControlsVisible((visible) => !visible)
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0]
    touchStartX.current = touch?.clientX
    touchStartY.current = touch?.clientY
    touchMoved.current = false
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0]
    const startX = touchStartX.current
    const startY = touchStartY.current
    if (!touch || startX === undefined || startY === undefined) return
    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) touchMoved.current = true
    if (Math.abs(deltaX) >= 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      setParagraphIndex((index) => Math.max(0, Math.min(sampleParagraphs.length - 1, index + (deltaX < 0 ? 1 : -1))))
      suppressNextClick.current = true
    } else if (!touchMoved.current && !window.getSelection()?.toString()) {
      setControlsVisible((visible) => !visible)
      suppressNextClick.current = true
    }
    window.clearTimeout(touchResetTimer.current)
    touchResetTimer.current = window.setTimeout(() => { suppressNextClick.current = false }, 500)
  }
  
  async function updateSettings(next: ReaderSettings) {
    setSettings(next)
    await db.settings.put({ key: 'reader.settings', value: JSON.stringify(next) })
  }

  function handleScroll() {
    window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      const firstVisible = paragraphRefs.current.findIndex((element) => element !== null && element.getBoundingClientRect().bottom > 72)
      if (firstVisible >= 0) {
        setParagraphIndex(firstVisible)
        void db.settings.put({ key: 'reader.sample.lastParagraph', value: String(firstVisible) })
      }
    }, 250)
  }

  return (
    <main className="reader-screen" data-theme={settings.theme} onScroll={handleScroll}>
      {controlsVisible && <header className="reader-toolbar"><button type="button" onClick={onClose}>Kembali ke library</button><span>Contoh chapter · bukan novel tersimpan</span></header>}
      <article className={`reader-content ${settings.paragraphStyle}`} onClick={handleArticleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ '--reader-size': `${settings.fontSize}px`, '--reader-lh': settings.lineHeight, '--reader-measure': `${settings.columnWidth}ch`, textAlign: settings.align } as React.CSSProperties} lang="id">
        <p className="reader-chapter-label">CONTOH BAB 1</p>
        <h1>Jam yang berhenti</h1>
        {sampleParagraphs.map((text, index) => <p key={text} ref={(element) => { paragraphRefs.current[index] = element }}>{text}</p>)}
      </article>
      {controlsVisible && <section className="reader-settings" aria-label="Pengaturan tampilan baca">
        <label>Ukuran <input aria-label="Ukuran font" type="range" min="14" max="28" value={settings.fontSize} onChange={(event) => void updateSettings({ ...settings, fontSize: Number(event.target.value) })} /><output>{settings.fontSize}px</output></label>
        <label>Jarak baris <input aria-label="Tinggi baris" type="range" min="1.4" max="2" step="0.05" value={settings.lineHeight} onChange={(event) => void updateSettings({ ...settings, lineHeight: Number(event.target.value) })} /><output>{settings.lineHeight.toFixed(2)}</output></label>
        <label>Lebar kolom <input aria-label="Lebar kolom" type="range" min="40" max="66" value={settings.columnWidth} onChange={(event) => void updateSettings({ ...settings, columnWidth: Number(event.target.value) })} /><output>{settings.columnWidth}ch</output></label>
        <label>Tema <select aria-label="Tema baca" value={settings.theme} onChange={(event) => void updateSettings({ ...settings, theme: event.target.value as ReaderSettings['theme'] })}><option value="kertas">Kertas</option><option value="sepia">Sepia</option><option value="malam">Malam</option><option value="hitam">Hitam</option></select></label>
        <label>Paragraf <select aria-label="Gaya paragraf" value={settings.paragraphStyle} onChange={(event) => void updateSettings({ ...settings, paragraphStyle: event.target.value as ReaderSettings['paragraphStyle'] })}><option value="indent">Indentasi</option><option value="spacing">Jarak</option></select></label>
        <label>Perataan <select aria-label="Perataan teks" value={settings.align} onChange={(event) => void updateSettings({ ...settings, align: event.target.value as ReaderSettings['align'] })}><option value="left">Rata kiri</option><option value="justify">Rata kiri-kanan</option></select></label>
      </section>}
      <nav className="reader-navigation" aria-label="Navigasi contoh chapter"><button type="button" disabled={!ready || paragraphIndex === 0} onClick={() => setParagraphIndex((index) => Math.max(0, index - 1))}>Sebelumnya</button><span>Paragraf {paragraphIndex + 1} dari {sampleParagraphs.length}</span><button type="button" disabled={!ready || paragraphIndex === sampleParagraphs.length - 1} onClick={() => setParagraphIndex((index) => Math.min(sampleParagraphs.length - 1, index + 1))}>Berikutnya</button></nav>
      <div className="reader-progress" style={{ transform: `scaleX(${(paragraphIndex + 1) / sampleParagraphs.length})` }} />
    </main>
  )
}
