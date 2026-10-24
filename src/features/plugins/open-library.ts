import { CapacitorHttp } from '@capacitor/core'
import { getJson } from '../../core/http/request'
import type { ImportedEpub } from '../reader/epub'

const endpoint = 'https://gutendex.com/books/'
type Gutendex = { results: Array<{ id: number; title: string; authors: Array<{ name: string }>; formats: Record<string, string> }> }
type Wiki = { query?: { search?: Array<{ title: string; pageid: number }> } }
export type OpenBook = { id: string; title: string; author: string; format: string; lang: 'en' | 'id' }

async function text(url: string) {
  const result = await CapacitorHttp.get({ url, headers: { 'User-Agent': 'Aruvel/0.1 (personal reader)' }, responseType: 'text', connectTimeout: 15_000, readTimeout: 25_000 })
  if (result.status < 200 || result.status >= 300) throw new Error(`Sumber merespons HTTP ${result.status}.`)
  if (typeof result.data !== 'string' || new TextEncoder().encode(result.data).byteLength > 8_000_000) throw new Error('Respons sumber kosong atau melebihi batas 8 MB.')
  return result.data
}

export async function searchOpenLibrary(query: string, lang: 'en' | 'id'): Promise<OpenBook[]> {
  const q = query.trim()
  if (!q) throw new Error('Masukkan judul atau kata kunci.')
  if (lang === 'en') {
    const data = await getJson<Gutendex>(`${endpoint}?${new URLSearchParams({ search: q, languages: 'en', page: '1' })}`, 1_000_000)
    return data.results.slice(0, 30).map((book) => ({ id: String(book.id), title: book.title, author: book.authors[0]?.name ?? 'Tidak diketahui', format: book.formats['text/plain; charset=utf-8'] ?? book.formats['text/plain; charset=us-ascii'] ?? book.formats['text/plain'] ?? '', lang })).filter((book) => Boolean(book.format))
  }
  const api = new URL('https://id.wikisource.org/w/api.php')
  api.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: q, srlimit: '30', format: 'json', formatversion: '2' }).toString()
  const data = JSON.parse(await text(api.href)) as Wiki
  return (data.query?.search ?? []).map((page) => ({ id: String(page.pageid), title: page.title, author: 'Wikisumber', format: page.title, lang }))
}

export async function importOpenLibraryBook(book: OpenBook, lang: 'en' | 'id'): Promise<ImportedEpub> {
  if (lang === 'en') {
    const id = Number(book.id)
    const downloadUrl = new URL(book.format)
    if (!Number.isSafeInteger(id) || id < 1 || downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'www.gutenberg.org') throw new Error('Tautan buku Project Gutenberg tidak valid.')
    const content = await text(book.format)
    const start = content.search(/\*{3} START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
    const end = content.search(/\*{3} END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
    const body = content.slice(start >= 0 ? content.indexOf('\n', start) + 1 : 0, end > 0 ? end : undefined).trim()
    const paragraphs = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 60)
    if (!paragraphs.length) throw new Error('Naskah tidak memiliki teks yang bisa diimpor.')
    return { novel: { sourceId: 'gutenberg', path: String(id), name: book.title, author: book.author, status: 'completed' }, chapters: [{ name: 'Teks lengkap', path: `gutenberg:${id}`, position: 0, chapterNumber: 1, content: paragraphs.join('\n') }] }
  }
  const pageid = Number(book.id)
  if (!Number.isSafeInteger(pageid) || pageid < 1) throw new Error('ID halaman Wikisumber tidak valid.')
  const api = new URL('https://id.wikisource.org/w/api.php')
  api.search = new URLSearchParams({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', pageids: String(pageid), format: 'json', formatversion: '2' }).toString()
  const data = JSON.parse(await text(api.href)) as { query?: { pages?: Array<{ title: string; extract?: string }> } }
  const page = data.query?.pages?.[0]
  const content = page?.extract?.trim()
  if (!page || !content) throw new Error('Halaman Wikisumber tidak menyediakan teks yang dapat dibaca.')
  return { novel: { sourceId: 'wikisource-id', path: String(pageid), name: page.title, author: 'Wikisumber', status: 'completed' }, chapters: [{ name: page.title, path: `wikisource:${pageid}`, position: 0, chapterNumber: 1, content }] }
}
