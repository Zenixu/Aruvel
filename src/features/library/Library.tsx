import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { categoryRepository, libraryRepository } from '../../core/db/repository'
import type { Category, LibraryNovel } from '../../core/db/types'
import './library.css'

type View = 'grid' | 'list'

export default function Library({ onRead }: { onRead: () => void }) {
  const [novels, setNovels] = useState<LibraryNovel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | undefined>()
  const [view, setView] = useState<View>('grid')
  const [title, setTitle] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState('')

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

  return (
    <main className="library-page">
      <header className="library-header">
        <a className="library-wordmark" href="#library">Aruvel</a>
        <span className="library-caption">PEMBACA NOVEL PRIBADI</span>
      </header>
      <section className="library-intro">
        <p className="library-caption">KOLEKSI PRIBADI</p>
        <h1 id="library">Library</h1>
      </section>
      <nav className="category-tabs" aria-label="Kategori library">
        <button type="button" aria-pressed={activeCategory === undefined} onClick={() => setActiveCategory(undefined)}>Semua</button>
        {categories.map((category) => category.id === undefined ? null : (
          <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.name}</button>
        ))}
      </nav>
      <section className="library-actions" aria-label="Pengelolaan library">
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
        <div className="view-toggle" aria-label="Tampilan library">
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Daftar</button>
        </div>
      </section>
      {error && <p className="library-error" role="alert">{error}</p>}
      {novels.length === 0 ? <p className="library-empty">Library kosong. Tambahkan novel di atas atau impor berkas EPUB.</p> : (
        <ul className={`novel-library ${view}`}>
          {novels.map((novel) => (
            <li key={novel.id} className="novel-item">
              <button type="button" className="typographic-cover" aria-label={`Buka pembaca contoh: ${novel.name}`} onClick={onRead}><span>{novel.name}</span></button>
              <div className="novel-details"><h2>{novel.name}</h2><p>{novel.author ?? 'Buku lokal'}</p><label className="novel-category-label">Kategori <select aria-label={`Kategori ${novel.name}`} value={novel.categories[0]?.id ?? ''} onChange={(event) => { if (event.target.value) void changeCategory(novel.id, Number(event.target.value)) }}><option value="">Belum dikategorikan</option>{categories.map((category) => category.id === undefined ? null : <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><span className="unread-count">{novel.unreadCount} belum dibaca</span></div>
              <button type="button" className="remove-novel" onClick={async () => { try { await libraryRepository.remove(novel.id); await refresh() } catch { setError('Novel tidak dapat dihapus. Coba lagi.') } }}>Hapus</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
