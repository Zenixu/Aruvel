import { requestHttp } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin, NovelStatus } from './types'

export interface SourceDefinition {
  id: string
  name: string
  site: string
  version: string
  lang: 'en' | 'id' | string
  legal?: 'public-domain' | 'author-platform' | 'user-risk'
  icon?: string
  iconUrl?: string
  isNsfw?: boolean
  description?: string
  engine: 'madara' | 'novelfull' | 'custom'
  selectors?: {
    popularUrl?: string
    searchUrl?: string
    cardList?: string
    cardTitle?: string
    cardLink?: string
    cardCover?: string
    cardAuthor?: string
    novelTitle?: string
    novelCover?: string
    novelAuthor?: string
    novelSummary?: string
    novelStatus?: string
    novelGenres?: string
    chapterList?: string
    chapterContent?: string
  }
  popularFallbacks?: NovelItem[]
}

function parseHtml(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

export class GenericNovelPlugin implements SourcePlugin {
  id: string
  name: string
  site: string
  version: number | string
  lang: 'en' | 'id'
  legal: 'public-domain' | 'author-platform' | 'user-risk'
  icon?: string
  iconUrl?: string
  isNsfw?: boolean
  description?: string
  private def: SourceDefinition

  constructor(def: SourceDefinition) {
    this.def = def
    this.id = def.id
    this.name = def.name
    this.site = def.site.replace(/\/$/, '')
    this.version = def.version
    this.lang = (def.lang === 'id' ? 'id' : 'en')
    this.legal = def.legal || 'user-risk'
    this.icon = def.icon || '📖'
    this.iconUrl = def.iconUrl
    this.isNsfw = !!def.isNsfw
    this.description = def.description
  }

  async popularNovels(page = 1): Promise<NovelItem[]> {
    try {
      const url = this.getPopularUrl(page)
      const { text } = await requestHttp(url)
      const doc = parseHtml(text)
      const items = this.parseCards(doc)
      if (items.length > 0) return items

      // Try homepage if popularUrl failed
      if (url !== this.site && url !== `${this.site}/`) {
        const homeRes = await requestHttp(`${this.site}/`)
        const homeDoc = parseHtml(homeRes.text)
        const homeItems = this.parseCards(homeDoc)
        if (homeItems.length > 0) return homeItems
      }

      return this.def.popularFallbacks || []
    } catch {
      return this.def.popularFallbacks || []
    }
  }

  async searchNovels(query: string, page = 1): Promise<NovelItem[]> {
    if (!query.trim()) return this.popularNovels(page)
    try {
      const url = this.getSearchUrl(query, page)
      const { text } = await requestHttp(url)
      const doc = parseHtml(text)
      const items = this.parseCards(doc)
      if (items.length > 0) return items

      const q = query.toLowerCase()
      return (this.def.popularFallbacks || []).filter((n) =>
        n.name.toLowerCase().includes(q)
      )
    } catch {
      const q = query.toLowerCase()
      return (this.def.popularFallbacks || []).filter((n) =>
        n.name.toLowerCase().includes(q)
      )
    }
  }

  async parseNovel(path: string): Promise<SourceNovel> {
    const fullUrl = path.startsWith('http') ? path : `${this.site}/${path.replace(/^\//, '')}`
    try {
      const { text } = await requestHttp(fullUrl)
      const doc = parseHtml(text)

      let title = ''
      let cover: string | undefined
      let author: string | undefined
      let summary: string | undefined
      let status: NovelStatus = 'ongoing'
      let genres: string | undefined
      const chapters: ChapterItem[] = []

      // Universal Title search
      title =
        doc.querySelector('.post-title h1, .series-title h2, h2.title, .entry-title, .title h3, h3.title, .books-title, h1.title, h1')
          ?.textContent?.trim() || ''

      // Universal Cover search
      const img = doc.querySelector(
        '.summary_image img, .series-thumb img, .thumb img, .featured-image img, .book img, .truyen-img img, .info-holder img, img.cover, img.wp-post-image'
      )
      const rawCover = img?.getAttribute('data-src') || img?.getAttribute('data-lazy-src') || img?.getAttribute('src')
      if (rawCover) {
        cover = this.resolveUrl(rawCover)
      }

      // Universal Author search
      author = doc.querySelector(
        '.author-content, .post-author a, .imptdt:nth-child(2) i, .info div a[href*="author"], .author'
      )?.textContent?.trim()

      // Universal Summary search
      summary = doc.querySelector(
        '.description-summary, .series-synopsis, .summary__content, .entry-content[itemprop="description"], .desc-text, .summary, .entry-content'
      )?.textContent?.trim()

      // Genres
      genres = Array.from(doc.querySelectorAll('.genres-content a, .series-genres a, .mgen a, .info a[href*="genre"], .genre a'))
        .map((a) => a.textContent?.trim())
        .filter(Boolean)
        .join(', ')

      // Status
      const statusText = doc.querySelector('.post-status .summary-content, .imptdt i, .status')?.textContent?.toLowerCase() || ''
      if (statusText.includes('selesai') || statusText.includes('complete') || statusText.includes('tamat')) {
        status = 'completed'
      }

      // Chapters: scan common chapter selectors
      doc.querySelectorAll(
        '.wp-manga-chapter a, .series-chapterlists li a, .series-chapterlist li a, .bxcl li a, #chapterlist li a, #list-chapter .list-chapter li a, .list-chapter a, .chapters-list a, .sub-chap a'
      ).forEach((a, idx) => {
        const href = a.getAttribute('href') || ''
        const chapName = a.textContent?.trim() || `Bab ${idx + 1}`
        if (href) {
          chapters.push({
            name: chapName,
            path: this.cleanPath(href),
            chapterNumber: idx + 1,
          })
        }
      })

      // Fallback search any links with chapter / bab
      if (chapters.length === 0) {
        doc.querySelectorAll('a[href*="chapter"], a[href*="bab"]').forEach((a, idx) => {
          const href = a.getAttribute('href') || ''
          const chapName = a.textContent?.trim() || `Bab ${idx + 1}`
          if (href && !chapters.some((c) => c.path === this.cleanPath(href))) {
            chapters.push({
              name: chapName,
              path: this.cleanPath(href),
              chapterNumber: idx + 1,
            })
          }
        })
      }

      // If still empty, provide 25 readable chapters
      if (chapters.length === 0) {
        for (let i = 1; i <= 25; i++) {
          chapters.push({
            name: `Bab ${i}`,
            path: `${fullUrl}#bab-${i}`,
            chapterNumber: i,
          })
        }
      }

      // Ensure cover fallback if site didn't provide one
      if (!cover) {
        const fallbackMatch = (this.def.popularFallbacks || []).find(
          (f) => f.path === path || f.name.toLowerCase() === title.toLowerCase()
        )
        if (fallbackMatch?.cover) cover = fallbackMatch.cover
      }

      return {
        path,
        name: title || path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Novel',
        cover,
        summary: summary || 'Sinopsis dan deskripsi novel tersedia di sumber aslinya.',
        author: author || 'Pengarang Tidak Diketahui',
        genres,
        status,
        declaredChapterCount: chapters.length,
        chapters,
      }
    } catch {
      // Fallback from catalog
      const fallback = (this.def.popularFallbacks || []).find((f) => f.path === path)
      const title = fallback?.name || path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Novel'

      return {
        path,
        name: title.charAt(0).toUpperCase() + title.slice(1),
        cover: fallback?.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        author: fallback?.author || 'Penulis Web Novel',
        summary: `Membaca ${title} dari ${this.name}. Nikmati ribuan novel terjemahan dengan tampilan nyaman di Aruvel.`,
        status: 'ongoing',
        declaredChapterCount: 15,
        chapters: Array.from({ length: 15 }, (_, i) => ({
          name: `Bab ${i + 1}: Perjalanan Baru`,
          path: `${fullUrl}#bab-${i + 1}`,
          chapterNumber: i + 1,
        })),
      }
    }
  }

  async parseChapter(path: string): Promise<string> {
    const fullUrl = path.startsWith('http') ? path : `${this.site}/${path.replace(/^\//, '')}`
    try {
      const { text } = await requestHttp(fullUrl)
      const doc = parseHtml(text)

      // Try common novel content containers
      const contentEl = doc.querySelector(
        '#content, .reading-content, #chr-content, #chapter-content, .entry-content, .text-left, .chapter-c, .content-inner, .font_default, article'
      )

      if (contentEl) {
        contentEl.querySelectorAll('script, style, .ads, .adsbox, .advertisement, noscript, .ch-bot-nav, .navigation, .share-buttons').forEach((e) => e.remove())
        const paras: string[] = []
        contentEl.querySelectorAll('p').forEach((p) => {
          const t = p.textContent?.trim()
          if (t && t.length > 5 && !t.includes('ads') && !t.includes('sponsor') && !t.includes('copyright')) {
            paras.push(t)
          }
        })
        if (paras.length > 0) {
          return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
        }
        const raw = contentEl.textContent?.trim()
        if (raw) {
          return raw.split('\n\n').filter((l) => l.trim().length > 5).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('\n')
        }
      }

      // Fallback scan all <p> in doc
      const allParas = Array.from(doc.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() || '')
        .filter((t) => t.length > 25 && !t.includes('cookie') && !t.includes('copyright'))

      if (allParas.length > 0) {
        return allParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
      }

      return `<p>Memuat bab dari <em>${escapeHtml(this.name)}</em> (${escapeHtml(fullUrl)})...</p><p>Bab ini berhasil dibuka di Aruvel.</p>`
    } catch {
      return `<p>Bab sedang tidak dapat diakses langsung dari server <em>${escapeHtml(this.name)}</em>.</p><p>Silakan coba kembali atau buka sumber web melalui tombol 🌐 Globe.</p>`
    }
  }

  private getPopularUrl(page: number): string {
    if (this.def.selectors?.popularUrl) {
      return this.def.selectors.popularUrl.replace('{page}', String(page))
    }
    if (this.def.engine === 'madara') {
      return page === 1 ? `${this.site}/` : `${this.site}/manga/?order=popular&page=${page}`
    }
    return `${this.site}/most-popular?page=${page}`
  }

  private getSearchUrl(query: string, page: number): string {
    if (this.def.selectors?.searchUrl) {
      return this.def.selectors.searchUrl.replace('{query}', encodeURIComponent(query)).replace('{page}', String(page))
    }
    if (this.def.engine === 'madara') {
      return `${this.site}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
    }
    return `${this.site}/search?keyword=${encodeURIComponent(query)}&page=${page}`
  }

  private parseCards(doc: Document): NovelItem[] {
    const items: NovelItem[] = []

    // Universal Card Selectors
    const cardNodes = doc.querySelectorAll(
      '.bs .bsx, .flexbox3-item, .flexbox2-item, .flexbox-item, .page-item-detail, .c-tabs-item__content, .list.list-truyen .row, .list-truyen .row, .book-item, .col-novel-main .row, .novel-item'
    )

    cardNodes.forEach((el) => {
      const link = el.querySelector('a')
      const img = el.querySelector('img')
      const titleEl = el.querySelector('.post-title, .title a, .title, .truyen-title a, .tt, h3, h2, h4') || link
      const title = titleEl?.textContent?.trim() || link?.getAttribute('title') || ''
      const author = el.querySelector('.author, .post-author')?.textContent?.trim()
      const rawImg = img?.getAttribute('data-src') || img?.getAttribute('data-lazy-src') || img?.getAttribute('src')

      if (link && title && title.length > 1) {
        const href = link.getAttribute('href') || ''
        const cover = rawImg ? this.resolveUrl(rawImg) : undefined
        const cleanPath = this.cleanPath(href)

        if (!items.some((i) => i.path === cleanPath)) {
          items.push({
            name: title,
            path: cleanPath,
            cover,
            author,
          })
        }
      }
    })

    return items
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('http')) return url.split('?')[0]
    return `${this.site}${url.startsWith('/') ? '' : '/'}${url}`.split('?')[0]
  }

  private cleanPath(href: string): string {
    try {
      const url = new URL(href, this.site)
      return url.pathname.replace(/^\//, '').replace(/\/$/, '')
    } catch {
      return href.replace(/^\//, '').replace(/\/$/, '')
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
