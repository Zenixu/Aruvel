import { requestHttp, requestJson } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin } from './types'

interface GutendexBook {
  id: number
  title: string
  authors: Array<{ name: string }>
  summaries?: string[]
  subjects?: string[]
  formats: Record<string, string>
}

interface GutendexResponse {
  count: number
  results: GutendexBook[]
}

const GUTENBERG_TEXT_CACHE = new Map<string, string>()

export class GutenbergPlugin implements SourcePlugin {
  id = 'gutenberg'
  name = 'Project Gutenberg'
  site = 'https://www.gutenberg.org'
  version = 1
  lang = 'en' as const
  legal = 'public-domain' as const
  icon = '📚'

  async popularNovels(page = 1): Promise<NovelItem[]> {
    try {
      const data = await requestJson<GutendexResponse>(`https://gutendex.com/books/?languages=en&page=${page}`)
      return data.results.map((b) => ({
        name: b.title,
        path: String(b.id),
        cover: b.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`,
        author: b.authors[0]?.name ? b.authors[0].name.split(',').reverse().join(' ').trim() : 'Unknown Author',
      }))
    } catch {
      // Fallback popular books if API is unreachable
      return [
        { name: 'Pride and Prejudice', path: '1342', cover: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg', author: 'Jane Austen' },
        { name: 'Frankenstein', path: '84', cover: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg', author: 'Mary Wollstonecraft Shelley' },
        { name: 'The Adventures of Sherlock Holmes', path: '1661', cover: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg', author: 'Arthur Conan Doyle' },
        { name: 'Alice\'s Adventures in Wonderland', path: '11', cover: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg', author: 'Lewis Carroll' },
        { name: 'Dracula', path: '345', cover: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg', author: 'Bram Stoker' },
        { name: 'The Great Gatsby', path: '64317', cover: 'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg', author: 'F. Scott Fitzgerald' },
        { name: 'Moby Dick', path: '2701', cover: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg', author: 'Herman Melville' },
        { name: 'A Tale of Two Cities', path: '98', cover: 'https://www.gutenberg.org/cache/epub/98/pg98.cover.medium.jpg', author: 'Charles Dickens' },
      ]
    }
  }

  async searchNovels(query: string, page = 1): Promise<NovelItem[]> {
    if (!query.trim()) return this.popularNovels(page)
    const data = await requestJson<GutendexResponse>(
      `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=en&page=${page}`
    )
    return data.results.map((b) => ({
      name: b.title,
      path: String(b.id),
      cover: b.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`,
      author: b.authors[0]?.name ? b.authors[0].name.split(',').reverse().join(' ').trim() : 'Unknown Author',
    }))
  }

  private async fetchBookText(id: string): Promise<string> {
    if (GUTENBERG_TEXT_CACHE.has(id)) {
      return GUTENBERG_TEXT_CACHE.get(id)!
    }

    const urls = [
      `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
      `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
    ]

    let fullText = ''
    for (const url of urls) {
      try {
        const { status, text } = await requestHttp(url, { timeout: 20_000 })
        if (status === 200 && text.length > 500) {
          fullText = text
          break
        }
      } catch {
        // try next url
      }
    }

    if (!fullText) {
      throw new Error(`Tidak dapat mengunduh teks buku Gutenberg #${id}. Periksa koneksi internet.`)
    }

    // Strip Gutenberg header and footer
    const startIdx = fullText.search(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
    const endIdx = fullText.search(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
    const cleaned = fullText.slice(
      startIdx >= 0 ? fullText.indexOf('\n', startIdx) + 1 : 0,
      endIdx > 0 ? endIdx : undefined
    ).trim()

    GUTENBERG_TEXT_CACHE.set(id, cleaned)
    return cleaned
  }

  async parseNovel(path: string): Promise<SourceNovel> {
    let bookMeta: GutendexBook | undefined
    try {
      const data = await requestJson<GutendexBook>(`https://gutendex.com/books/${path}`)
      bookMeta = data
    } catch {
      // ignore
    }

    const text = await this.fetchBookText(path)

    // Regex to detect chapter headings like "CHAPTER I", "Chapter 1", "Letter 1", etc.
    const chapterRegex = /(?:^|\n\n+)(?:CHAPTER|Chapter|Letter|Book|BOOK|ACT|Act)\s+([IVXLCDM\d]+[^\n]*)/g
    const matches: Array<{ title: string; index: number }> = []

    let match: RegExpExecArray | null
    while ((match = chapterRegex.exec(text)) !== null) {
      matches.push({
        title: match[0].trim(),
        index: match.index,
      })
    }

    const chapters: ChapterItem[] = []
    if (matches.length > 1) {
      matches.forEach((m, idx) => {
        chapters.push({
          name: m.title.replace(/\n/g, ' '),
          path: `${path}#ch-${idx}`,
          chapterNumber: idx + 1,
        })
      })
    } else {
      // Single full text chapter
      chapters.push({
        name: 'Teks Lengkap',
        path: `${path}#ch-0`,
        chapterNumber: 1,
      })
    }

    const authorName = bookMeta?.authors[0]?.name
      ? bookMeta.authors[0].name.split(',').reverse().join(' ').trim()
      : 'Jane Austen'

    return {
      path,
      name: bookMeta?.title || 'Pride and Prejudice',
      cover: bookMeta?.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${path}/pg${path}.cover.medium.jpg`,
      summary: bookMeta?.summaries?.[0] || 'Karya sastra klasik dari arsip Project Gutenberg.',
      author: authorName,
      genres: bookMeta?.subjects?.slice(0, 4).join(', ') || 'Sastra Klasik, Romansa',
      status: 'completed',
      declaredChapterCount: chapters.length,
      chapters,
    }
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const [bookId, fragment] = chapterPath.split('#')
    const text = await this.fetchBookText(bookId)

    if (!fragment || !fragment.startsWith('ch-')) {
      return text
    }

    const chapterIdx = parseInt(fragment.replace('ch-', ''), 10)
    const chapterRegex = /(?:^|\n\n+)(?:CHAPTER|Chapter|Letter|Book|BOOK|ACT|Act)\s+([IVXLCDM\d]+[^\n]*)/g
    const positions: number[] = []

    let match: RegExpExecArray | null
    while ((match = chapterRegex.exec(text)) !== null) {
      positions.push(match.index)
    }

    if (positions.length <= 1 || chapterIdx >= positions.length) {
      return text
    }

    const start = positions[chapterIdx]
    const end = chapterIdx + 1 < positions.length ? positions[chapterIdx + 1] : text.length
    return text.slice(start, end).trim()
  }
}
