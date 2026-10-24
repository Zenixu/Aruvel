import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { categoryRepository, libraryRepository } from '../../core/db/repository'
import type { Category, LibraryNovel } from '../../core/db/types'
import { parseEpub } from '../reader/epub'
import { exportBackup, restoreBackup } from '../../core/db/backup'
import { novelPlugin, novelSourceUrl } from '../plugins/novel-source'
import type { ChapterMeta } from '../plugins/types'
import './library.css'

type View = 'grid' | 'list'
type Sort = 'recent' | 'name' | 'unread'

export default function Library({ onRead, onOpenDetail }: { onRead: (novelId: number) => void; onOpenDetail?: (sourceId: string, path: string) => void }) {
  const [novels, setNovels] = useState<LibraryNovel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | undefined>(undefined)
  const [view, setView] = useState<View>('grid')
  const [sort, setSort] = useState<Sort>('recent')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | undefined>()
  const [title, setTitle] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const [nextNovels, nextCategories] = await Promise.all([
      libraryRepository.list(activeCategory), categoryRepository.list(),
    ])
    setNovels(nextNovels)
    setCategories(nextCategories)
  }, [activeCategory])

  useEffect(() => {
    let current = true
    void Promise.all([libraryRepository.list(activeCategory), categoryRepository.list()])
      .then(([nextNovels, nextCategories]) => {
        if (current) {
          setNovels(nextNovels)
          setCategories(nextCategories)
        }
      })
      .catch(() => { if (current) setError('Library tidak dapat dibuka. Muat ulang aplikasi untuk mencoba lagi.') })
    return () => { current = false }
  }, [activeCategory])

  const deleteTargetName = novels.find((novel) => novel.id === deleteTarget)?.name

  useEffect(() => {
    if (deleteTarget === undefined) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setDeleteTarget(undefined) }
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [deleteTarget])

  function handleDeleteKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const dialog = event.currentTarget.querySelector('[role="alertdialog"]')
    const items = dialog?.querySelectorAll<HTMLElement>('button:not([disabled])')
    if (!items?.length) return
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus() }
    else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus() }
  }

  async function changeCategory(novelId: number, categoryId: number) {
    try {
      await categoryRepository.assign(novelId, categoryId)
      await refresh()
    } catch {
      setError('Kategori novel tidak dapat diperbarui. Coba lagi.')
    }
  }

  async function addNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = title.trim()
    if (!name) return
    try {
      const id = await libraryRepository.add({ sourceId: 'local', path: `manual:${crypto.randomUUID()}`, name, status: 'unknown' })
      const defaultCategory = categories.find(({ name: category }) => category === 'Belum dikategorikan')
      if (defaultCategory?.id !== undefined) await categoryRepository.assign(id, defaultCategory.id)
      setTitle('')
      setError('')
      await refresh()
    } catch {
      setError('Novel tidak dapat ditambahkan. Coba lagi.')
    }
  }

  async function importFile(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setImporting(true)
    setError('')
    setNotice('')
    try {
      const epub = await parseEpub(file)
      await libraryRepository.importEpub(epub)
      await refresh()
      setNotice(`“${epub.novel.name}” berhasil diimpor (${epub.chapters.length} bagian).`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'EPUB tidak dapat diimpor.')
    } finally {
      setImporting(false)
    }
  }

  async function backupLibrary() {
    try {
      const blob = await exportBackup()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `aruvel-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice('Backup library berhasil dibuat.')
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup gagal dibuat.') }
  }

  async function restoreLibrary(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      await restoreBackup(file)
      await refresh()
      setNotice('Backup berhasil dipulihkan ke perangkat.')
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup tidak dapat dipulihkan.') }
  }

  async function downloadNovel(novel: LibraryNovel) {
    if (novel.id === undefined) return
    const plugin = novelPlugin(novel)
    const url = novelSourceUrl(novel)
    if (!plugin || !url) { setError(`Novel “${novel.name}” bukan dari sumber yang mendukung unduhan.`); return }
    setDownloading(novel.id)
    setError('')
    setNotice('')
    try {
      const existing = await libraryRepository.getDownloadedChapters(novel.id)
      const downloadedNumbers = new Set(existing.flatMap((chapter) => chapter.chapterNumber === undefined ? [] : [chapter.chapterNumber]))
      const chapters: ChapterMeta[] = await plugin.listChapters(String(novel.id), url)
      const fresh = chapters.filter((chapter) => !downloadedNumbers.has(chapter.number))
      if (!fresh.length) {
        setNotice(`“${novel.name}” sudah tersimpan offline.`)
        return
      }
      let saved = 0
      for (const chapter of fresh) {
        const { content, hasCloudflare } = await plugin.getChapterContent(chapter.url)
        if (hasCloudflare) { setError('Sumber memblokir unduhan otomatis (Cloudflare). Buka di browser lalu impor manual.'); continue }
        if (!content.trim()) { setError(`Chapter “${chapter.title}” kosong.`); continue }
        await libraryRepository.downloadChapter(novel.id, { name: chapter.title, path: chapter.url, position: chapter.number - 1, chapterNumber: chapter.number }, content)
        saved += 1
      }
      await refresh()
      setNotice(saved ? `${saved} chapter “${novel.name}” diunduh untuk dibaca offline.` : `Tidak ada chapter baru untuk “${novel.name}”.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unduhan gagal.')
    } finally {
      setDownloading(undefined)
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) return
    try {
      await categoryRepository.add(name)
      setCategoryName('')
      setError('')
      await refresh()
    } catch {
      setError('Kategori tidak dapat ditambahkan. Periksa apakah nama sudah digunakan.')
    }
  }

  const visibleNovels = novels
    .filter((novel) => !libraryQuery.trim() || `${novel.name} ${novel.author ?? ''}`.toLocaleLowerCase().includes(libraryQuery.trim().toLocaleLowerCase()))
    .filter((novel) => statusFilter === 'all' || novel.unreadCount > 0)
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'unread' ? b.unreadCount - a.unreadCount : b.lastReadAt - a.lastReadAt)

  return (
    <main className="library-page">
      <section className="library-intro">
        <div><p className="library-caption">KOLEKSI PRIBADI</p><h1 id="library">Library</h1></div>
        <div className="library-intro-actions"><span className="library-total">{visibleNovels.length} karya</span><button type="button" className="library-search-toggle" aria-label={showSearch ? 'Tutup pencarian' : 'Cari di library'} aria-expanded={showSearch} onClick={() => { setShowSearch((open) => !open); if (showSearch) setLibraryQuery('') }}>{showSearch ? 'Tutup' : 'Cari'}</button></div>
      </section>
      {showSearch && <label className="library-search">Cari judul atau penulis<input autoFocus type="search" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Judul atau penulis" /></label>}
      <nav className="library-status-tabs" aria-label="Status bacaan">
        {([['all', 'Semua'], ['unread', 'Ada yang belum dibaca']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>{label}{value === 'all' ? ` (${novels.length})` : ` (${novels.filter((novel) => novel.unreadCount > 0).length})`}</button>)}
      </nav>
      <nav className="category-tabs" aria-label="Kategori library">
        <button type="button" aria-pressed={activeCategory === undefined} onClick={() => setActiveCategory(undefined)}>Semua kategori</button>
        {categories.map((category) => category.id === undefined ? null : (
          <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.name}</button>
        ))}
      </nav>
      <section className="library-toolbar" aria-label="Urutan dan tampilan library">
        <label>Urutkan<select aria-label="Urutkan library" value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="recent">Terakhir dibaca</option><option value="name">Judul A–Z</option><option value="unread">Belum dibaca</option></select></label>
        <div className="view-toggle" aria-label="Tampilan library"><button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Daftar</button></div>
      </section>
      <section className="library-actions" aria-label="Pengelolaan library">
        <details className="library-manage"><summary>Kelola library</summary>
          <div className="library-manage-content">
            <label className="library-form epub-import">Impor EPUB<input type="file" accept=".epub,application/epub+zip" aria-label="Pilih berkas EPUB" disabled={importing} onChange={importFile} /></label>
            <button type="button" onClick={() => void backupLibrary()}>Ekspor backup</button>
            <label className="library-form epub-import">Pulihkan backup<input type="file" accept="application/json,.json" aria-label="Pilih berkas backup" onChange={restoreLibrary} /></label>
            <form onSubmit={addNovel} className="library-form">
              <label htmlFor="novel-title">Tambah novel</label>
              <input id="novel-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Judul novel" />
              <button type="submit">Tambah</button>
            </form>
            <form onSubmit={addCategory} className="library-form category-form">
              <label htmlFor="category-name">Kategori baru</label>
              <input id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nama kategori" />
              <button type="submit">Buat</button>
            </form>
          </div>
        </details>
      </section>
      {error && <p className="library-error" role="alert">{error}</p>}
      {notice && <p className="library-notice" role="status">{notice}</p>}
      {importing && <p role="status">Mengimpor EPUB…</p>}
      {visibleNovels.length === 0 ? <p className="library-empty">{novels.length === 0 ? 'Library kosong. Tambahkan novel di atas atau impor EPUB melalui Kelola library.' : 'Tidak ada novel yang cocok dengan filter ini.'}</p> : (
        <ul className={`novel-library ${view}`}>
          {visibleNovels.map((novel) => (
            <li key={novel.id} className="novel-item">
              <button
                type="button"
                className="typographic-cover"
                aria-label={`Buka novel: ${novel.name}`}
                onClick={() => {
                  if (onOpenDetail && novel.sourceId !== 'local') {
                    onOpenDetail(novel.sourceId, novel.path)
                  } else {
                    onRead(novel.id)
                  }
                }}
              >
                {novel.cover ? (
                  <img src={novel.cover} alt={novel.name} className="cover-img-inner" loading="lazy" />
                ) : (
                  <span>{novel.name}</span>
                )}
                {novel.unreadCount > 0 && <span className="cover-badge">{novel.unreadCount}</span>}
              </button>
              <div className="novel-details">
                <h2
                  onClick={() => {
                    if (onOpenDetail && novel.sourceId !== 'local') {
                      onOpenDetail(novel.sourceId, novel.path)
                    } else {
                      onRead(novel.id)
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {novel.name}
                </h2>
                <p>{novel.author ?? 'Buku lokal'}</p>
                <span className="unread-count">{novel.unreadCount ? `${novel.unreadCount} belum dibaca` : novel.status === 'completed' ? 'Selesai' : 'Belum ada progres'}</span>
                {categories.length > 0 && <label className="novel-category-label">Kategori <select aria-label={`Kategori ${novel.name}`} value={novel.categories[0]?.id ?? ''} onChange={(event) => { if (event.target.value) void changeCategory(novel.id, Number(event.target.value)) }}><option value="">Belum dikategorikan</option>{categories.map((category) => category.id === undefined ? null : <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
              </div>
              {novel.sourceId !== 'local' && <button type="button" className="download-novel" disabled={downloading === novel.id} onClick={() => void downloadNovel(novel)}>{downloading === novel.id ? 'Mengunduh…' : 'Unduh offline'}</button>}
              <button type="button" className="remove-novel" onClick={() => setDeleteTarget(novel.id)}>Hapus</button>
            </li>
          ))}
        </ul>
      )}
      {deleteTarget !== undefined && <div className="library-confirm-backdrop" role="presentation" onKeyDown={handleDeleteKey} onClick={(event) => { if (event.target === event.currentTarget) setDeleteTarget(undefined) }}><section className="library-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><h2 id="delete-title">Hapus novel dari library?</h2><p id="delete-description">Novel, chapter, dan progres bacanya akan dihapus dari perangkat. Tindakan ini tidak bisa dibatalkan.</p><div><button type="button" onClick={() => setDeleteTarget(undefined)}>Batal</button><button type="button" autoFocus onClick={async () => { const id = deleteTarget; if (id === undefined) return; try { await libraryRepository.remove(id); setDeleteTarget(undefined); await refresh() } catch { setDeleteTarget(undefined); setError('Novel tidak dapat dihapus. Coba lagi.') } }}>Hapus novel{deleteTargetName ? `: ${deleteTargetName}` : ''}</button></div></section></div>}
    </main>
  )
}
