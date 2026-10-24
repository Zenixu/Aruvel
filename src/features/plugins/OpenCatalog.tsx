import { useState, type FormEvent } from 'react'
import { libraryRepository } from '../../core/db/repository'
import { importOpenLibraryBook, searchOpenLibrary, type OpenBook } from './open-library'

export default function OpenCatalog({ onImported }: { onImported: () => void }) {
  const [language, setLanguage] = useState<'en' | 'id'>('en')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenBook[]>([])
  const [selected, setSelected] = useState<OpenBook | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice(''); setSelected(undefined)
    try { setResults(await searchOpenLibrary(query, language)) }
    catch (cause) { setResults([]); setError(cause instanceof Error ? cause.message : 'Pencarian gagal.') }
    finally { setBusy(false) }
  }

  async function importBook(book: OpenBook) {
    setBusy(true); setError(''); setNotice('')
    try {
      await libraryRepository.importEpub(await importOpenLibraryBook(book, language))
      setNotice(`“${book.title}” tersimpan offline di Library.`)
      onImported()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Karya tidak dapat diimpor.') }
    finally { setBusy(false) }
  }

  return <section className="open-catalog" aria-label="Jelajah karya terbuka">
    <header className="explore-header"><div><p className="eyebrow">KOLEKSI TERBUKA</p><h1>Jelajah</h1><p className="explore-description">Cari karya yang tersedia melalui sumber terbuka. Status hak penggunaan berbeda untuk tiap karya; pastikan lisensinya sebelum memakai.</p></div></header>
    <div className="source-switch" aria-label="Sumber karya">
      <button type="button" aria-pressed={language === 'en'} onClick={() => { setLanguage('en'); setResults([]); setSelected(undefined); setError('') }}>Inggris · Project Gutenberg</button>
      <button type="button" aria-pressed={language === 'id'} onClick={() => { setLanguage('id'); setResults([]); setSelected(undefined); setError('') }}>Indonesia · Wikisumber</button>
    </div>
    <form className="catalog-search" onSubmit={(event) => void search(event)}>
      <label htmlFor="catalog-query">Judul atau kata kunci</label>
      <div><input id="catalog-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Contoh: Pride and Prejudice" required /><button type="submit" disabled={busy}>{busy ? 'Mencari…' : 'Cari'}</button></div>
    </form>
    {error && <p className="catalog-error" role="alert">{error}</p>}
    {notice && <p className="catalog-notice" role="status">{notice}</p>}
    {!results.length && !busy && !error && <p className="catalog-empty">Cari berdasarkan judul atau nama penulis untuk melihat karya yang tersedia.</p>}
    <ul className="catalog-results">{results.map((book) => <li key={`${book.lang}:${book.id}`}>
      <button type="button" className="catalog-result-title" aria-expanded={selected?.id === book.id} onClick={() => setSelected(selected?.id === book.id ? undefined : book)}><span>{book.title}</span><span>{book.author}</span></button>
      {selected?.id === book.id && <div className="catalog-detail"><p>{language === 'en' ? 'Project Gutenberg · naskah teks lengkap' : 'Wikisumber · halaman karya'}</p><p>Konten akan disimpan lokal untuk dibaca offline. Verifikasi hak penggunaan karya sebelum mengimpor.</p><button type="button" disabled={busy} onClick={() => void importBook(book)}>{busy ? 'Mengimpor…' : 'Simpan offline'}</button></div>}
    </li>)}</ul>
    <div className="catalog-diagnostics"><h2>Katalog pemeriksaan sumber</h2><p>Pemeriksaan URL teknis saja; hasilnya tidak membuktikan legalitas atau kompatibilitas plugin.</p>
    </div>
  </section>
}
