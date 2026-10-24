import { requestHttp } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin } from './types'

const POPULAR_NOVELS: NovelItem[] = [
  {
    name: 'Reincarnation Of The Strongest Sword God',
    path: 'reincarnation-of-the-strongest-sword-god.html',
    author: 'Lucky Old Cat',
    cover: 'https://novelfull.com/uploads/webp/novel/reincarnation-of-the-strongest-s-4064914555.webp',
  },
  {
    name: 'Martial God Asura',
    path: 'martial-god-asura.html',
    author: 'Kindhearted Bee',
    cover: 'https://novelfull.com/uploads/webp/novel/martial-god-asura-4fbd99df7b.webp',
  },
  {
    name: 'Hidden Marriage',
    path: 'hidden-marriage.html',
    author: 'Jiong Jiong You Yao',
    cover: 'https://novelfull.com/uploads/webp/novel/hidden-marriage-f01a027382.webp',
  },
  {
    name: 'Super Gene',
    path: 'super-gene.html',
    author: 'Twelve-Winged Dark Seraphim',
    cover: 'https://novelfull.com/uploads/webp/novel/super-gene-c33ca6fce8.webp',
  },
  {
    name: 'Martial Peak',
    path: 'martial-peak.html',
    author: 'Momo',
    cover: 'https://novelfull.com/uploads/webp/novel/martial-peak-685987ce01.webp',
  },
  {
    name: 'Against the Gods',
    path: 'against-the-gods.html',
    author: 'Mars Gravity',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
  },
  {
    name: 'Battle Through the Heavens',
    path: 'battle-through-the-heavens.html',
    author: 'Heavenly Silkworm Potato',
    cover: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&q=80',
  },
  {
    name: 'I Shall Seal the Heavens',
    path: 'i-shall-seal-the-heavens.html',
    author: 'Er Gen',
    cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80',
  },
  {
    name: 'Coiling Dragon',
    path: 'coiling-dragon.html',
    author: 'I Eat Tomatoes',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
  },
  {
    name: 'Desolate Era',
    path: 'desolate-era.html',
    author: 'I Eat Tomatoes',
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
  },
  {
    name: 'Stellar Transformations',
    path: 'stellar-transformations.html',
    author: 'I Eat Tomatoes',
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
  },
  {
    name: 'Tales of Demons and Gods',
    path: 'tales-of-demons-and-gods.html',
    author: 'Mad Snail',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
  },
]

function parseHtml(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

export class NovelFullPlugin implements SourcePlugin {
  id = 'novelfull'
  name = 'NovelFull'
  site = 'https://novelfull.com'
  version = '1.6.67'
  lang = 'en' as const
  legal = 'user-risk' as const
  icon = '📖'

  async popularNovels(_page = 1): Promise<NovelItem[]> {
    try {
      const { text } = await requestHttp(`https://novelfull.com/most-popular?page=${_page}`)
      const doc = parseHtml(text)
      const items: NovelItem[] = []

      doc.querySelectorAll('.list.list-truyen .row, .list-truyen .row, .col-novel-main .row').forEach((el) => {
        const titleEl = el.querySelector('.truyen-title a')
        const imgEl = el.querySelector('img')
        const authorEl = el.querySelector('.author')
        if (titleEl) {
          const href = titleEl.getAttribute('href') || ''
          const rawCover = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src')
          let cover: string | undefined
          if (rawCover) {
            cover = rawCover.startsWith('http') ? rawCover : `https://novelfull.com${rawCover.startsWith('/') ? '' : '/'}${rawCover}`
          }

          items.push({
            name: titleEl.textContent?.trim() || '',
            path: href.startsWith('/') ? href.slice(1) : href,
            cover,
            author: authorEl?.textContent?.trim() || undefined,
          })
        }
      })
      return items.length > 0 ? items : POPULAR_NOVELS
    } catch {
      return POPULAR_NOVELS
    }
  }

  async searchNovels(query: string): Promise<NovelItem[]> {
    if (!query.trim()) return this.popularNovels()
    const q = query.toLowerCase()
    const localMatch = POPULAR_NOVELS.filter((n) => n.name.toLowerCase().includes(q))
    try {
      const { text } = await requestHttp(`https://novelfull.com/search?keyword=${encodeURIComponent(query)}`)
      const doc = parseHtml(text)
      const items: NovelItem[] = []
      doc.querySelectorAll('.list.list-truyen .row, .list-truyen .row, .col-novel-main .row').forEach((el) => {
        const titleEl = el.querySelector('.truyen-title a')
        const imgEl = el.querySelector('img')
        const authorEl = el.querySelector('.author')
        if (titleEl) {
          const href = titleEl.getAttribute('href') || ''
          const rawCover = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src')
          let cover: string | undefined
          if (rawCover) {
            cover = rawCover.startsWith('http') ? rawCover : `https://novelfull.com${rawCover.startsWith('/') ? '' : '/'}${rawCover}`
          }
          items.push({
            name: titleEl.textContent?.trim() || '',
            path: href.startsWith('/') ? href.slice(1) : href,
            cover,
            author: authorEl?.textContent?.trim() || undefined,
          })
        }
      })
      return items.length > 0 ? items : localMatch
    } catch {
      return localMatch
    }
  }

  async parseNovel(path: string): Promise<SourceNovel> {
    const fullUrl = path.startsWith('http') ? path : `https://novelfull.com/${path.replace(/^\//, '')}`
    const { text } = await requestHttp(fullUrl)
    const doc = parseHtml(text)

    const title = doc.querySelector('.title h3, h3.title, .books-title')?.textContent?.trim() || path.replace('.html', '').replace(/-/g, ' ')
    const imgEl = doc.querySelector('.book img, .truyen-img img, .info-holder img')
    let cover: string | undefined
    const rawCover = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src')
    if (rawCover) {
      cover = rawCover.startsWith('http') ? rawCover : `https://novelfull.com${rawCover.startsWith('/') ? '' : '/'}${rawCover}`
    }

    const author = doc.querySelector('.info div a[href*="author"], .author')?.textContent?.trim() || 'Unknown'
    const summary = doc.querySelector('.desc-text, .summary')?.textContent?.trim() || ''

    const genres = Array.from(doc.querySelectorAll('.info a[href*="genre"]'))
      .map((el) => el.textContent?.trim() || '')
      .filter(Boolean)
      .join(', ')

    const statusText = doc.querySelector('.info a[href*="status"]')?.textContent?.toLowerCase() || ''
    const status = statusText.includes('completed') ? 'completed' as const
      : 'ongoing' as const

    const chapters: ChapterItem[] = []
    doc.querySelectorAll('#list-chapter .list-chapter li a, .list-chapter a').forEach((link, idx) => {
      const href = link.getAttribute('href') || ''
      const name = link.textContent?.trim() || `Chapter ${idx + 1}`
      if (href) {
        chapters.push({
          name,
          path: href.startsWith('/') ? href.slice(1) : href,
          chapterNumber: idx + 1,
        })
      }
    })

    if (chapters.length === 0) {
      chapters.push({ name: 'Chapter 1', path, chapterNumber: 1 })
    }

    return { path, name: title, cover, author, summary, genres, status, declaredChapterCount: chapters.length, chapters }
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const fullUrl = chapterPath.startsWith('http') ? chapterPath : `https://novelfull.com/${chapterPath.replace(/^\//, '')}`
    const { text } = await requestHttp(fullUrl)
    const doc = parseHtml(text)

    const contentEl = doc.querySelector('#chr-content, .chapter-c, .content-inner')
    if (contentEl) {
      contentEl.querySelectorAll('script, style, .ads, .adsbox, noscript, .ch-bot-nav').forEach((el) => el.remove())
      const paragraphs = Array.from(contentEl.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() ?? '')
        .filter((t) => t.length > 5 && !t.includes('novelfull.com'))
      if (paragraphs.length > 0) return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n')
    }

    return '<p>Chapter content could not be loaded. Please try again later.</p>'
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
