import { requestHttp } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin } from './types'

const POPULAR_NOVELS: NovelItem[] = [
  { name: 'The Wandering Inn', path: 'fiction/10073/the-wandering-inn', cover: 'https://www.royalroadcdn.com/public/covers-large/10073-the-wandering-inn.jpg', author: 'pirateaba' },
  { name: 'Mother of Learning', path: 'fiction/21220/mother-of-learning', cover: 'https://www.royalroadcdn.com/public/covers-large/21220-mother-of-learning.jpg', author: 'nobody103' },
  { name: 'Defiance of the Fall', path: 'fiction/24709/defiance-of-the-fall', cover: 'https://www.royalroadcdn.com/public/covers-large/24709-defiance-of-the-fall.jpg', author: 'TheFirstDefier' },
  { name: 'Beware Of Chicken', path: 'fiction/39408/beware-of-chicken', cover: 'https://www.royalroadcdn.com/public/covers-large/39408-beware-of-chicken.jpg', author: 'Casualfarmer' },
  { name: 'He Who Fights With Monsters', path: 'fiction/26294/he-who-fights-with-monsters', cover: 'https://www.royalroadcdn.com/public/covers-large/26294-he-who-fights-with-monsters.jpg', author: 'Shirtaloon' },
  { name: 'Salvos', path: 'fiction/37438/salvos', cover: 'https://www.royalroadcdn.com/public/covers-large/37438-salvos.jpg', author: 'MelasD' },
  { name: 'Azarinth Healer', path: 'fiction/16946/azarinth-healer', cover: 'https://www.royalroadcdn.com/public/covers-large/16946-azarinth-healer.jpg', author: 'Rhaegar' },
  { name: 'Super Minion', path: 'fiction/21410/super-minion', cover: 'https://www.royalroadcdn.com/public/covers-large/21410-super-minion.jpg', author: 'Graeme Ing' },
  { name: 'The Primal Hunter', path: 'fiction/36049/the-primal-hunter', cover: 'https://www.royalroadcdn.com/public/covers-large/36049-the-primal-hunter.jpg', author: 'Zogarth' },
  { name: 'Beneath the Dragoneye Moons', path: 'fiction/36299/beneath-the-dragoneye-moons', cover: 'https://www.royalroadcdn.com/public/covers-large/36299-beneath-the-dragoneye-moons.jpg', author: 'Selkie' },
  { name: 'The Perfect Run', path: 'fiction/36735/the-perfect-run', cover: 'https://www.royalroadcdn.com/public/covers-large/36735-the-perfect-run.jpg', author: 'Maxime J. Durand' },
  { name: 'Dungeon Crawler Carl', path: 'fiction/29358/dungeon-crawler-carl', cover: 'https://www.royalroadcdn.com/public/covers-large/29358-dungeon-crawler-carl.jpg', author: 'Matt Dinniman' },
]

function parseHtml(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

export class RoyalRoadPlugin implements SourcePlugin {
  id = 'royalroad'
  name = 'Royal Road'
  site = 'https://www.royalroad.com'
  version = 1
  lang = 'en' as const
  legal = 'author-platform' as const
  icon = '👑'

  async popularNovels(_page = 1): Promise<NovelItem[]> {
    try {
      const { text } = await requestHttp(`https://www.royalroad.com/fictions/best-rated?page=${_page}`)
      const doc = parseHtml(text)
      const items: NovelItem[] = []
      doc.querySelectorAll('.fiction-list-item').forEach((el) => {
        const titleEl = el.querySelector('.fiction-title a')
        const imgEl = el.querySelector('img')
        const authorEl = el.querySelector('.author span')
        if (titleEl) {
          const href = titleEl.getAttribute('href') || ''
          items.push({
            name: titleEl.textContent?.trim() || '',
            path: href.startsWith('/') ? href.slice(1) : href,
            cover: imgEl?.getAttribute('src') || undefined,
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
    // Local fallback search
    const q = query.toLowerCase()
    const localMatch = POPULAR_NOVELS.filter(
      (n) => n.name.toLowerCase().includes(q) || n.author?.toLowerCase().includes(q)
    )
    try {
      const { text } = await requestHttp(`https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`)
      const doc = parseHtml(text)
      const items: NovelItem[] = []
      doc.querySelectorAll('.fiction-list-item').forEach((el) => {
        const titleEl = el.querySelector('.fiction-title a')
        const imgEl = el.querySelector('img')
        const authorEl = el.querySelector('.author span')
        if (titleEl) {
          const href = titleEl.getAttribute('href') || ''
          items.push({
            name: titleEl.textContent?.trim() || '',
            path: href.startsWith('/') ? href.slice(1) : href,
            cover: imgEl?.getAttribute('src') || undefined,
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
    const { text } = await requestHttp(`https://www.royalroad.com/${path}`)
    const doc = parseHtml(text)

    const title = doc.querySelector('h1')?.textContent?.trim() || path
    const cover = doc.querySelector('.fic-header img')?.getAttribute('src') || undefined
    const author = doc.querySelector('.fic-header .author span a')?.textContent?.trim() || 'Unknown'
    const summary = doc.querySelector('.description .hidden-content')?.textContent?.trim()
      || doc.querySelector('.description')?.textContent?.trim() || ''

    const genres = Array.from(doc.querySelectorAll('.tags .fiction-tag'))
      .map((el) => el.textContent?.trim() || '')
      .filter(Boolean)
      .join(', ')

    const statusText = doc.querySelector('.fiction-info .label')?.textContent?.trim()?.toLowerCase() || ''
    const status = statusText.includes('completed') ? 'completed' as const
      : statusText.includes('hiatus') ? 'hiatus' as const
      : statusText.includes('ongoing') ? 'ongoing' as const
      : 'ongoing' as const

    const chapters: ChapterItem[] = []
    doc.querySelectorAll('#chapters tbody tr').forEach((row, idx) => {
      const link = row.querySelector('a')
      const timeEl = row.querySelector('time')
      if (link) {
        const href = link.getAttribute('href') || ''
        chapters.push({
          name: link.textContent?.trim() || `Chapter ${idx + 1}`,
          path: href.startsWith('/') ? href.slice(1) : href,
          chapterNumber: idx + 1,
          releaseTime: timeEl?.getAttribute('datetime') || undefined,
        })
      }
    })

    if (chapters.length === 0) {
      chapters.push({ name: 'Chapter 1', path, chapterNumber: 1 })
    }

    return {
      path,
      name: title,
      cover,
      author,
      summary,
      genres,
      status,
      declaredChapterCount: chapters.length,
      chapters,
    }
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const { text } = await requestHttp(`https://www.royalroad.com/${chapterPath}`)
    const doc = parseHtml(text)

    const contentEl = doc.querySelector('.chapter-content')
    if (contentEl) {
      // Remove ads and author notes
      contentEl.querySelectorAll('.portlet, .authors-note, script, style, .ad-container').forEach((el) => el.remove())
      const paragraphs = Array.from(contentEl.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() ?? '')
        .filter((t) => t.length > 0)
      if (paragraphs.length > 0) return paragraphs.join('\n\n')
    }

    return 'Konten chapter tidak dapat dimuat dari Royal Road. Coba lagi nanti.'
  }
}
