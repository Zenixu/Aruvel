import type { SourcePlugin, SearchResponse, NovelMeta, ChapterMeta } from './types'

const GUTENBERG_ENDPOINT = 'https://gutendex.com/books/'
const gutenbergText = (id: string) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`

interface GutendexResult { id: number; title: string; authors: Array<{ name: string }>; formats: Record<string, string> }
interface GutendexResponse { results: GutendexResult[] }
interface WikiSearchResponse { query?: { search?: Array<{ title: string; pageid: number }> } }
interface WikiPageResponse { query?: { pages?: Array<{ title: string; extract?: string }> } }
interface Fetched { text: string; hasCloudflare: boolean }

// Ambil angka terakhir dari URL (id Gutenberg / pageid Wikisumber) tanpa peduli query string.
function lastNumber(value: string): number {
  const matches = [...value.matchAll(/\d+/g)]
  return Number(matches.at(-1)?.[0] ?? 0)
}

// Cloudflare memblokir unduhan otomatis; konten seperti itu tidak disimpan sebagai bab.
function blocked(headers: Headers, text: string): boolean {
  const server = headers.get('server') ?? ''
  return /cloudflare/i.test(server) || text.includes('Checking your browser before accessing') || text.includes('DDoS protection')
}

async function fetchText(url: string, label: string): Promise<Fetched> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} error ${res.status}`)
  const text = await res.text()
  return { text, hasCloudflare: blocked(res.headers, text) }
}

async function gutenberg(url: string): Promise<string> {
  const { text } = await fetchText(url, 'Gutenberg')
  const start = text.search(/\*\*\* START OF/i)
  const end = text.search(/\*\*\* END OF/i)
  return text.slice(start >= 0 ? text.indexOf('\n', start) + 1 : 0, end > 0 ? end : undefined)
}

async function wikisourcePage(url: string): Promise<WikiPageResponse> {
  const { text } = await fetchText(`https://id.wikisource.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&pageids=${lastNumber(url)}&format=json&formatversion=2`, 'Wikisource')
  return JSON.parse(text) as WikiPageResponse
}

async function searchGutenberg(query: string) {
  const res = await fetch(`${GUTENBERG_ENDPOINT}?search=${encodeURIComponent(query)}&languages=en&page=1`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Gutenberg error ${res.status}`)
  const data = (await res.json()) as GutendexResponse
  return data.results.map((b) => ({ id: String(b.id), title: b.title, author: b.authors[0]?.name ?? 'Tidak diketahui', url: gutenbergText(String(b.id)), genres: [], description: '' }))
}

async function searchWikisource(query: string) {
  const res = await fetch(`https://id.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=30&format=json&formatversion=2`)
  if (!res.ok) throw new Error(`Wikisource error ${res.status}`)
  const data = (await res.json()) as WikiSearchResponse
  return (data.query?.search ?? []).map((p) => ({ id: String(p.pageid), title: p.title, author: 'Wikisumber', url: `https://id.wikisource.org/wiki/${p.pageid}`, genres: [], description: '' }))
}

export class GutenbergPlugin implements SourcePlugin {
  id = 'gutenberg'
  name = 'Project Gutenberg'
  site = 'https://www.gutenberg.org'
  baseUrl = 'https://www.gutenberg.org'
  language = 'en' as const
  hasCloudflare = false

  async search(query: string): Promise<SearchResponse> {
    const results = await searchGutenberg(query)
    return { results, totalResults: results.length }
  }

  async getNovelMeta(url: string): Promise<NovelMeta> {
    const id = lastNumber(url)
    const body = await gutenberg(gutenbergText(String(id)))
    const titleMatch = body.match(/Title:\s*(.+)/i)
    const authorMatch = body.match(/Author:\s*(.+)/i)
    return { id: String(id), title: titleMatch?.[1]?.trim() ?? 'Tanpa judul', author: authorMatch?.[1]?.trim() ?? 'Tidak diketahui', language: this.language, source: this.id }
  }

  async listChapters(_novelId: string, url: string): Promise<ChapterMeta[]> {
    return [{ number: 1, title: 'Teks lengkap', url, chapterId: 1 }]
  }

  async getChapterContent(url: string): Promise<{ content: string; hasCloudflare: boolean }> {
    const { text, hasCloudflare } = await fetchText(url, 'Gutenberg')
    const start = text.search(/\*\*\* START OF/i)
    const end = text.search(/\*\*\* END OF/i)
    const body = text.slice(start >= 0 ? text.indexOf('\n', start) + 1 : 0, end > 0 ? end : undefined)
    const paragraphs = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 0)
    return { content: paragraphs.join('\n\n'), hasCloudflare }
  }

  async checkUpdates(_novelId: string, _chapters: ChapterMeta[]): Promise<{ newChapter: ChapterMeta | null }> {
    return { newChapter: null }
  }
}

export class WikisourcePlugin implements SourcePlugin {
  id = 'wikisource-id'
  name = 'Wikisumber Indonesia'
  site = 'https://id.wikisource.org'
  baseUrl = 'https://id.wikisource.org'
  language = 'id' as const
  hasCloudflare = false

  async search(query: string): Promise<SearchResponse> {
    const results = await searchWikisource(query)
    return { results, totalResults: results.length }
  }

  async getNovelMeta(url: string): Promise<NovelMeta> {
    const page = (await wikisourcePage(url)).query?.pages?.[0]
    return { id: String(lastNumber(url)), title: page?.title ?? 'Tanpa judul', author: 'Wikisumber', description: page?.extract?.trim() ?? '', language: 'id', source: this.id }
  }

  async listChapters(_novelId: string, url: string): Promise<ChapterMeta[]> {
    return [{ number: 1, title: 'Halaman lengkap', url, chapterId: lastNumber(url) }]
  }

  async getChapterContent(url: string): Promise<{ content: string; hasCloudflare: boolean }> {
    const { text, hasCloudflare } = await fetchText(`https://id.wikisource.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&pageids=${lastNumber(url)}&format=json&formatversion=2`, 'Wikisource')
    const page = JSON.parse(text) as WikiPageResponse
    return { content: page.query?.pages?.[0]?.extract ?? '', hasCloudflare }
  }

  async checkUpdates(_novelId: string, _chapters: ChapterMeta[]): Promise<{ newChapter: ChapterMeta | null }> {
    return { newChapter: null }
  }
}