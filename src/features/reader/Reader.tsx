import { useEffect, useRef, useState } from 'react'
import { db } from '../../core/db/database'
import { isEpubChapterContent } from '../../core/db/types'
import { sourceRegistry } from '../../core/plugins/registry'
import type { ChapterItem, SourceNovel } from '../../core/plugins/types'
import './reader.css'

export interface ActivePluginNovel {
  sourceId: string
  novel: SourceNovel
  chapter: ChapterItem
  allChapters: ChapterItem[]
  libraryNovelId?: number
}

type ReaderSettings = {
  fontSize: number
  lineHeight: number
  columnWidth: number
  paragraphStyle: 'indent' | 'spacing'
  align: 'left' | 'justify'
  theme: 'kertas' | 'sepia' | 'malam' | 'hitam'
}

const defaults: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.65,
  columnWidth: 66,
  paragraphStyle: 'indent',
  align: 'left',
  theme: 'malam',
}

const sampleParagraphs = [
  'Hujan turun sejak matahari tenggelam. Di ujung jalan, sebuah toko buku kecil masih menyalakan lampunya.',
  'Nara mendorong pintu kayu itu. Lonceng di atasnya berbunyi pelan, disusul aroma kertas tua dan teh hangat.',
  '“Kau terlambat,” kata penjaga toko tanpa mengangkat kepala dari bukunya.',
  'Nara melihat jam di dinding. Jarumnya berhenti tepat di tengah malam, padahal ponselnya menunjukkan pukul sembilan.',
  'Di rak paling belakang, sebuah buku terbuka sendiri. Halaman kosongnya mulai dipenuhi tulisan yang ia kenal.',
]

interface ReaderProps {
  onClose: () => void
  novelId?: number
  pluginNovel?: ActivePluginNovel
}

function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function Reader({ onClose, novelId, pluginNovel }: ReaderProps) {
  const [settings, setSettings] = useState<ReaderSettings>(defaults)
  const [epubChapters, setEpubChapters] = useState<Array<{ id?: number; name: string; content: string; lastParagraph: number }>>([])
  const [chapterIndex, setChapterIndex] = useState(0)
  const [pluginChapterIndex, setPluginChapterIndex] = useState(() => {
    if (!pluginNovel) return 0
    const idx = pluginNovel.allChapters.findIndex((c) => c.path === pluginNovel.chapter.path)
    return idx >= 0 ? idx : 0
  })
  const [pluginParagraphs, setPluginParagraphs] = useState<string[]>([])
  const [readerError, setReaderError] = useState('')
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [paragraphIndex, setParagraphIndex] = useState(0)
  const [ready, setReady] = useState(false)

  const screenRef = useRef<HTMLElement | null>(null)
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([])
  const scrollTimer = useRef<number | undefined>(undefined)
  const touchStartX = useRef<number | undefined>(undefined)
  const touchStartY = useRef<number | undefined>(undefined)
  const touchMoved = useRef(false)
  const suppressNextClick = useRef(false)
  const touchResetTimer = useRef<number | undefined>(undefined)

  const isPlugin = Boolean(pluginNovel)
  const isEpub = !isPlugin && novelId !== undefined && epubChapters.length > 0

  // 1. Load reader settings
  useEffect(() => {
    void db.settings.get('reader.settings').then((stored) => {
      if (stored?.value) {
        try {
          setSettings({ ...defaults, ...(JSON.parse(stored.value) as Partial<ReaderSettings>) })
        } catch {
          // keep defaults
        }
      }
    })
  }, [])

  // 2. Load Local EPUB or Sample if not plugin
  useEffect(() => {
    if (isPlugin) return
    let current = true

    void Promise.all([
      novelId === undefined ? db.settings.get('reader.sample.lastParagraph') : Promise.resolve(undefined),
      novelId === undefined ? Promise.resolve([]) : db.chapters.where('novelId').equals(novelId).sortBy('position'),
    ]).then(async ([storedPosition, chapters]) => {
      if (!current) return
      if (novelId !== undefined) {
        const loaded = await Promise.all(
          chapters.map(async (chapter) => ({
            ...chapter,
            content: chapter.id === undefined
              ? ''
              : await db.chapterContents.where('chapterId').equals(chapter.id).first().then((c) => (isEpubChapterContent(c) ? c.content : '')),
          }))
        )
        const nonEmpty = loaded.filter(({ content }) => content.trim())
        if (current) {
          setEpubChapters(nonEmpty)
          setParagraphIndex(nonEmpty[0]?.lastParagraph ?? 0)
          if (nonEmpty.length === 0) setReaderError('Novel EPUB tidak memiliki bab yang tersimpan untuk dibaca.')
          setReady(true)
        }
      } else {
        const index = Number(storedPosition?.value ?? 0)
        setParagraphIndex(Number.isInteger(index) ? Math.max(0, Math.min(index, sampleParagraphs.length - 1)) : 0)
        setReady(true)
      }
    }).catch(() => {
      if (current) {
        setReaderError('Data bacaan tidak dapat dimuat dari penyimpanan lokal.')
        setReady(true)
      }
    })

    return () => { current = false }
  }, [novelId, isPlugin])

  // 3. Load Plugin Chapter dynamically
  useEffect(() => {
    if (!pluginNovel) return
    let active = true

    async function loadPluginChapter() {
      setLoadingChapter(true)
      setReaderError('')
      try {
        const currentChapter = pluginNovel!.allChapters[pluginChapterIndex] || pluginNovel!.chapter
        const plugin = sourceRegistry.get(pluginNovel!.sourceId)
        if (!plugin) throw new Error(`Plugin sumber '${pluginNovel!.sourceId}' tidak ditemukan.`)

        const rawText = await plugin.parseChapter(currentChapter.path)
        if (!active) return

        const paragraphs = rawText
          .split(/\n\s*\n+/)
          .map(sanitizeText)
          .filter((t) => t.length > 0)

        setPluginParagraphs(paragraphs.length ? paragraphs : ['[Teks bab kosong atau tidak dapat diuraikan dari sumber]'])
        setParagraphIndex(0)
        setReady(true)

        // Scroll to top of screen
        screenRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })

        // Save progress if novel is saved in library
        if (pluginNovel!.libraryNovelId) {
          const novelIdVal = pluginNovel!.libraryNovelId
          await db.novels.update(novelIdVal, { lastReadAt: Date.now() })
          const existingCh = await db.chapters.where('[novelId+position]').equals([novelIdVal, pluginChapterIndex]).first()
          if (existingCh?.id) {
            await db.chapters.update(existingCh.id, { isRead: true, updatedAt: Date.now() })
          }
        }
      } catch (err) {
        if (active) {
          setReaderError(err instanceof Error ? err.message : 'Gagal memuat isi bab dari sumber novel.')
        }
      } finally {
        if (active) setLoadingChapter(false)
      }
    }

    void loadPluginChapter()
    return () => { active = false }
  }, [pluginNovel, pluginChapterIndex])

  // 4. Save paragraph position
  useEffect(() => {
    if (!ready) return
    if (isEpub) {
      const chapter = epubChapters[chapterIndex]
      if (chapter?.id !== undefined) {
        void db.chapters.update(chapter.id, { lastParagraph: paragraphIndex, updatedAt: Date.now() })
        if (novelId !== undefined) void db.novels.update(novelId, { lastReadAt: Date.now() })
      }
    } else if (!isPlugin) {
      void db.settings.put({ key: 'reader.sample.lastParagraph', value: String(paragraphIndex) })
    }
  }, [paragraphIndex, ready, isEpub, epubChapters, chapterIndex, novelId, isPlugin])

  function moveChapter(delta: number) {
    if (isPlugin && pluginNovel) {
      const next = pluginChapterIndex + delta
      if (next >= 0 && next < pluginNovel.allChapters.length) {
        setPluginChapterIndex(next)
        screenRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })
      }
      return
    }

    const next = chapterIndex + delta
    if (next >= 0 && next < epubChapters.length) {
      const currentChapter = epubChapters[chapterIndex]
      if (currentChapter?.id !== undefined) {
        void db.chapters.update(currentChapter.id, { lastParagraph: paragraphIndex, updatedAt: Date.now() })
      }
      setEpubChapters((chapters) =>
        chapters.map((ch, idx) => (idx === chapterIndex ? { ...ch, lastParagraph: paragraphIndex } : ch))
      )
      setChapterIndex(next)
      setParagraphIndex(epubChapters[next].lastParagraph)
      screenRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })
    } else if (!isEpub) {
      setParagraphIndex((idx) => Math.max(0, Math.min(sampleParagraphs.length - 1, idx + delta)))
    }
  }

  function handleArticleClick(event: React.MouseEvent<HTMLElement>) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    if (event.detail === 0 || !window.getSelection()?.toString()) {
      setControlsVisible((visible) => !visible)
    }
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
      moveChapter(deltaX < 0 ? 1 : -1)
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
      const firstVisible = paragraphRefs.current.findIndex(
        (el) => el !== null && el.getBoundingClientRect().bottom > 72
      )
      if (firstVisible >= 0) setParagraphIndex(firstVisible)
    }, 250)
  }

  const activeParagraphs = isPlugin
    ? pluginParagraphs
    : isEpub
    ? epubChapters[chapterIndex]?.content.split(/\n+/).filter(Boolean) ?? []
    : sampleParagraphs

  const currentChapterTitle = isPlugin
    ? pluginNovel!.allChapters[pluginChapterIndex]?.name || 'Bab'
    : isEpub
    ? epubChapters[chapterIndex]?.name
    : 'Jam yang berhenti'

  const totalChapters = isPlugin
    ? pluginNovel!.allChapters.length
    : isEpub
    ? epubChapters.length
    : 1

  const currentChapterNum = isPlugin
    ? pluginChapterIndex + 1
    : isEpub
    ? chapterIndex + 1
    : 1

  return (
    <main
      ref={screenRef}
      className="reader-screen"
      data-theme={settings.theme}
      onScroll={handleScroll}
    >
      {/* Top Header Controls */}
      {controlsVisible && (
        <header className="reader-toolbar">
          <button type="button" onClick={onClose} className="reader-back-btn" aria-label="Kembali">
            ← Kembali
          </button>
          <div className="reader-header-center">
            <span className="reader-header-title">
              {isPlugin
                ? pluginNovel!.novel.name
                : isEpub
                ? 'Novel EPUB'
                : 'Contoh'}
            </span>
            <span className="reader-header-sub">
              {currentChapterTitle} ({currentChapterNum}/{totalChapters})
            </span>
          </div>
          <button
            type="button"
            className="reader-header-btn"
            onClick={() => setShowSettingsModal((open) => !open)}
            aria-label="Pengaturan Cepat Tampilan"
            title="Pengaturan Tampilan"
          >
            Aa
          </button>
        </header>
      )}

      {readerError && (
        <div className="reader-error-banner" role="alert">
          <p>{readerError}</p>
          <button
            type="button"
            className="reader-retry-btn"
            onClick={() => {
              setReaderError('')
              setLoadingChapter(true)
              setPluginChapterIndex((idx) => idx)
            }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {loadingChapter && (
        <div className="reader-loading-banner">
          <div className="loading-spinner-small" />
          <span>Memuat isi bab dari sumber...</span>
        </div>
      )}

      <article
        className={`reader-content ${settings.paragraphStyle}`}
        onClick={handleArticleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          '--reader-size': `${settings.fontSize}px`,
          '--reader-lh': settings.lineHeight,
          '--reader-measure': `${settings.columnWidth}ch`,
          textAlign: settings.align,
        } as React.CSSProperties}
        lang="id"
      >
        <p className="reader-chapter-label">BAB {currentChapterNum}</p>
        <h1>{currentChapterTitle}</h1>
        {activeParagraphs.map((text, index) => (
          <p
            key={`${currentChapterNum}-${index}`}
            ref={(element) => { paragraphRefs.current[index] = element }}
          >
            {text}
          </p>
        ))}
      </article>

      {/* Quick Settings Bottom Sheet Modal */}
      <div
        className="reader-settings-backdrop"
        style={{ display: showSettingsModal ? 'flex' : 'none' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowSettingsModal(false)
        }}
      >
        <aside className="reader-settings" aria-label="Pengaturan cepat tampilan baca">
          <div className="reader-settings-header">
            <h3 className="reader-settings-title">Pengaturan Tampilan Cepat</h3>
            <button
              type="button"
              className="reader-settings-close"
              onClick={() => setShowSettingsModal(false)}
              aria-label="Tutup Pengaturan"
            >
              ✕
            </button>
          </div>
          <div className="reader-settings-grid">
            <label>
              Ukuran font
              <input
                aria-label="Ukuran font"
                type="range"
                min="14"
                max="28"
                value={settings.fontSize}
                onChange={(event) => void updateSettings({ ...settings, fontSize: Number(event.target.value) })}
              />
              <output>{settings.fontSize}px</output>
            </label>
            <label>
              Jarak baris
              <input
                aria-label="Tinggi baris"
                type="range"
                min="1.4"
                max="2.2"
                step="0.05"
                value={settings.lineHeight}
                onChange={(event) => void updateSettings({ ...settings, lineHeight: Number(event.target.value) })}
              />
              <output>{settings.lineHeight.toFixed(2)}</output>
            </label>
            <label>
              Tema
              <select
                aria-label="Tema baca"
                value={settings.theme}
                onChange={(event) => void updateSettings({ ...settings, theme: event.target.value as ReaderSettings['theme'] })}
              >
                <option value="kertas">Kertas</option>
                <option value="sepia">Sepia</option>
                <option value="malam">Malam</option>
                <option value="hitam">Hitam</option>
              </select>
            </label>
            <label>
              Perataan
              <select
                aria-label="Perataan teks"
                value={settings.align}
                onChange={(event) => void updateSettings({ ...settings, align: event.target.value as ReaderSettings['align'] })}
              >
                <option value="left">Rata kiri</option>
                <option value="justify">Rata kiri-kanan</option>
              </select>
            </label>
          </div>
        </aside>
      </div>

      {/* Clean Bottom Navigation Controls */}
      {controlsVisible && (
        <nav className="reader-navigation" aria-label="Navigasi chapter">
          <button
            type="button"
            className="reader-nav-btn"
            disabled={!ready || (isPlugin ? currentChapterNum <= 1 : isEpub ? chapterIndex === 0 && paragraphIndex === 0 : paragraphIndex === 0)}
            onClick={() => {
              if (isPlugin) moveChapter(-1)
              else if (isEpub && paragraphIndex === 0) moveChapter(-1)
              else setParagraphIndex((index) => Math.max(0, index - 1))
            }}
          >
            Sebelumnya
          </button>
          <span className="reader-nav-counter">
            {isPlugin
              ? `Bab ${currentChapterNum}/${totalChapters} · paragraf ${paragraphIndex + 1}/${activeParagraphs.length}`
              : isEpub
              ? `Bab ${chapterIndex + 1}/${epubChapters.length} · paragraf ${paragraphIndex + 1}/${activeParagraphs.length}`
              : `Paragraf ${paragraphIndex + 1} dari ${sampleParagraphs.length}`}
          </span>
          <button
            type="button"
            className="reader-nav-btn"
            disabled={!ready || (isPlugin ? currentChapterNum >= totalChapters : isEpub ? chapterIndex === epubChapters.length - 1 && paragraphIndex >= activeParagraphs.length - 1 : paragraphIndex === sampleParagraphs.length - 1)}
            onClick={() => {
              if (isPlugin) moveChapter(1)
              else if (isEpub && paragraphIndex >= activeParagraphs.length - 1) moveChapter(1)
              else setParagraphIndex((index) => Math.min(activeParagraphs.length - 1, index + 1))
            }}
          >
            Berikutnya
          </button>
        </nav>
      )}

      <div
        className="reader-progress"
        style={{ transform: `scaleX(${currentChapterNum / Math.max(1, totalChapters)})` }}
      />
    </main>
  )
}
