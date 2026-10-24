import { useEffect, useState } from 'react'
import { sourceRegistry } from '../../core/plugins/registry'
import type { ChapterItem, SourceNovel } from '../../core/plugins/types'
import { db } from '../../core/db/database'
import './novel-detail.css'

interface NovelDetailProps {
  sourceId: string
  novelPath: string
  onBack: () => void
  onReadChapter: (novel: SourceNovel, chapter: ChapterItem, allChapters: ChapterItem[], libraryNovelId?: number) => void
}

export default function NovelDetail({ sourceId, novelPath, onBack, onReadChapter }: NovelDetailProps) {
  const [novel, setNovel] = useState<SourceNovel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inLibrary, setInLibrary] = useState<number | null>(null)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [chapterSortAsc, setChapterSortAsc] = useState(true)
  const [searchChapter, setSearchChapter] = useState('')
  const [readChapterPaths, setReadChapterPaths] = useState<Set<string>>(new Set())

  const plugin = sourceRegistry.get(sourceId)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        // Check if novel is already saved in Dexie library
        const existing = await db.novels.where('[sourceId+path]').equals([sourceId, novelPath]).first()
        if (existing?.id) {
          if (active) setInLibrary(existing.id)
          const readChapters = await db.chapters.where('novelId').equals(existing.id).filter((c) => c.isRead).toArray()
          if (active) setReadChapterPaths(new Set(readChapters.map((c) => c.path)))
        }

        if (!plugin) {
          throw new Error(`Plugin sumber '${sourceId}' tidak ditemukan.`)
        }

        const data = await plugin.parseNovel(novelPath)
        if (active) {
          setNovel(data)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat detail novel dari sumber.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => { active = false }
  }, [sourceId, novelPath, plugin])

  async function toggleLibrary() {
    if (!novel) return

    if (inLibrary !== null) {
      // Remove from library
      const novelId = inLibrary
      await db.transaction('rw', db.novels, db.chapters, db.chapterContents, db.novelCategories, async () => {
        const chapters = await db.chapters.where('novelId').equals(novelId).toArray()
        const chapterIds = chapters.flatMap((c) => (c.id !== undefined ? [c.id] : []))
        await db.chapterContents.where('chapterId').anyOf(chapterIds).delete()
        await db.chapters.where('novelId').equals(novelId).delete()
        await db.novelCategories.where('novelId').equals(novelId).delete()
        await db.novels.delete(novelId)
      })
      setInLibrary(null)
      setReadChapterPaths(new Set())
    } else {
      // Add to library
      const novelId = await db.transaction('rw', db.novels, db.chapters, db.categories, db.novelCategories, async () => {
        const id = await db.novels.add({
          sourceId,
          path: novelPath,
          name: novel.name,
          cover: novel.cover,
          summary: novel.summary,
          author: novel.author,
          status: novel.status,
          declaredChapters: novel.declaredChapterCount,
          lastReadAt: Date.now(),
        })

        // Add all chapters
        for (const [idx, ch] of novel.chapters.entries()) {
          await db.chapters.add({
            novelId: id,
            name: ch.name,
            path: ch.path,
            chapterNumber: ch.chapterNumber ?? idx + 1,
            position: idx,
            isRead: false,
            lastParagraph: 0,
            updatedAt: Date.now(),
          })
        }

        // Assign to default category
        const defaultCat = await db.categories.where('name').equals('Belum dikategorikan').first()
        if (defaultCat?.id) {
          await db.novelCategories.add({ novelId: id, categoryId: defaultCat.id })
        }

        return id
      })
      setInLibrary(novelId)
    }
  }

  if (loading) {
    return (
      <main className="novel-detail-page">
        <header className="novel-detail-header">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <span className="novel-header-title">Memuat...</span>
          <div style={{ width: 28 }} />
        </header>
        <div className="chapter-loading-container">
          <p>Mengambil data novel dan seluruh daftar bab dari {plugin?.name || sourceId}...</p>
        </div>
      </main>
    )
  }

  if (error || !novel) {
    return (
      <main className="novel-detail-page">
        <header className="novel-detail-header">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <span className="novel-header-title">Kesalahan</span>
          <div style={{ width: 28 }} />
        </header>
        <div className="chapter-empty">
          <p>{error || 'Novel tidak ditemukan.'}</p>
          <button type="button" className="btn-secondary-lib" style={{ margin: '16px auto', display: 'block' }} onClick={onBack}>
            Kembali ke Jelajah
          </button>
        </div>
      </main>
    )
  }

  const sortedChapters = [...novel.chapters].sort((a, b) => {
    const numA = a.chapterNumber ?? 0
    const numB = b.chapterNumber ?? 0
    return chapterSortAsc ? numA - numB : numB - numA
  })

  const filteredChapters = sortedChapters.filter((ch) =>
    ch.name.toLowerCase().includes(searchChapter.trim().toLowerCase())
  )

  const firstUnreadChapter = novel.chapters.find((ch) => !readChapterPaths.has(ch.path)) || novel.chapters[0]

  return (
    <main className="novel-detail-page">
      <header className="novel-detail-header">
        <div className="novel-header-left">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <div className="novel-header-info">
            <span className="novel-header-title">{novel.name}</span>
            <span className="novel-header-source">Sumber: {plugin?.name}</span>
          </div>
        </div>
        <button
          type="button"
          className="action-icon-btn"
          aria-label={inLibrary !== null ? 'Hapus dari Pustaka' : 'Tambah ke Pustaka'}
          onClick={() => void toggleLibrary()}
        >
          {inLibrary !== null ? '★' : '☆'}
        </button>
      </header>

      {/* Hero Section */}
      <section className="novel-hero-section">
        <div className="novel-cover-wrapper">
          {novel.cover ? (
            <img src={novel.cover} alt={novel.name} className="novel-cover-img" referrerPolicy="no-referrer" />
          ) : (
            <div className="novel-cover-placeholder">
              <span>{novel.name}</span>
            </div>
          )}
        </div>

        <div className="novel-main-meta">
          <div>
            <h1 className="novel-title-large">{novel.name}</h1>
            <p className="novel-sub-meta">
              {novel.author || 'Penulis Tidak Diketahui'} · {novel.status === 'completed' ? 'Tamat' : 'Berjalan'} · {plugin?.legal === 'public-domain' ? 'Domain Publik' : 'Platform'}
            </p>
          </div>

          <div className="meta-stats-grid">
            <div className="meta-stat-item">
              <span className="stat-label">Total Bab</span>
              <span className="stat-val">{novel.chapters.length} Bab</span>
            </div>
            <div className="meta-stat-item">
              <span className="stat-label">Progres Baca</span>
              <span className="stat-val">
                {readChapterPaths.size} / {novel.chapters.length} ({novel.chapters.length ? Math.round((readChapterPaths.size / novel.chapters.length) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Actions */}
      <div className="novel-action-buttons">
        {novel.chapters.length > 0 && (
          <button
            type="button"
            className="btn-primary-read"
            onClick={() => onReadChapter(novel, firstUnreadChapter, novel.chapters, inLibrary ?? undefined)}
          >
            📖 {readChapterPaths.size > 0 ? `Lanjut Baca ${firstUnreadChapter.name}` : `Mulai Baca Bab 1`}
          </button>
        )}
        <button
          type="button"
          className={`btn-secondary-lib ${inLibrary !== null ? 'in-lib' : ''}`}
          onClick={() => void toggleLibrary()}
        >
          {inLibrary !== null ? '✓ Dalam Pustaka' : '+ Pustaka'}
        </button>
      </div>

      {/* Synopsis Section */}
      {novel.summary && (
        <section className="novel-synopsis-section">
          <div className="section-label-row">
            <span>SINOPSIS</span>
            <span>ID: {sourceId.toUpperCase()}</span>
          </div>
          <p className={`synopsis-text ${synopsisExpanded ? 'expanded' : 'collapsed'}`}>
            {novel.summary}
          </p>
          <button
            type="button"
            className="expand-synopsis-btn"
            onClick={() => setSynopsisExpanded((open) => !open)}
          >
            {synopsisExpanded ? 'Tutup ringkasan ▲' : 'Selengkapnya ▼'}
          </button>

          {novel.genres && (
            <div className="novel-genres-row">
              {novel.genres.split(',').map((g) => (
                <span key={g.trim()} className="genre-tag">{g.trim()}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Chapters Section */}
      <section className="novel-chapters-section">
        <div className="chapters-section-header">
          <h2 className="chapters-title">Daftar Bab ({novel.chapters.length})</h2>
          <div className="chapters-toolbar">
            <button
              type="button"
              className="sort-toggle-btn"
              onClick={() => setChapterSortAsc((asc) => !asc)}
            >
              {chapterSortAsc ? '↑ Terlama' : '↓ Terbaru'}
            </button>
          </div>
        </div>

        {novel.chapters.length > 8 && (
          <div className="chapter-search-box">
            <input
              type="search"
              className="chapter-search-input"
              placeholder="Cari nomor atau judul bab..."
              value={searchChapter}
              onChange={(e) => setSearchChapter(e.target.value)}
            />
          </div>
        )}

        <ul className="chapters-list">
          {filteredChapters.map((ch, idx) => {
            const isRead = readChapterPaths.has(ch.path)
            const isNext = ch.path === firstUnreadChapter.path
            const displayNum = String(ch.chapterNumber ?? (chapterSortAsc ? idx + 1 : novel.chapters.length - idx)).padStart(2, '0')

            return (
              <li key={ch.path}>
                <button
                  type="button"
                  className="chapter-row-btn"
                  onClick={() => onReadChapter(novel, ch, novel.chapters, inLibrary ?? undefined)}
                >
                  <div className="chapter-left">
                    <span className="chapter-num">{displayNum}</span>
                    <span className="chapter-name">{ch.name}</span>
                  </div>
                  <div className="chapter-right">
                    {isRead && <span className="chapter-badge read">Dibaca</span>}
                    {isNext && <span className="chapter-badge next">Berikutnya</span>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
