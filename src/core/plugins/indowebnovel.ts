import { requestHttp } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin } from './types'

const POPULAR_NOVELS: NovelItem[] = [
  {
    name: 'Shadow Slave',
    path: 'series/shadow-slave',
    author: 'Guiltythree',
    cover: 'https://indowebnovel.id/wp-content/uploads/2024/12/WhatsApp-Image-2024-12-26-at-14.26.39.jpeg',
  },
  {
    name: 'Cultivation Online',
    path: 'series/co',
    author: 'MyLittleBrother',
    cover: 'https://indowebnovel.id/wp-content/uploads/2019/09/1610854076_cultivation-online.jpg',
  },
  {
    name: 'Martial God Asura',
    path: 'series/martial-god-asura-2',
    author: 'Kindhearted Bee',
    cover: 'https://indowebnovel.id/wp-content/uploads/2022/05/images-4.jpeg',
  },
  {
    name: 'Advent of the Three Calamities',
    path: 'series/advent-of-the-three-calamities',
    author: 'Fantasy World',
    cover: 'https://indowebnovel.id/wp-content/uploads/2024/07/calamity.jpg',
  },
  {
    name: 'Mysteries of Immortal Puppet Master',
    path: 'series/mysteries-of-immortal-puppet-master',
    author: 'Snail',
    cover: 'https://indowebnovel.id/wp-content/uploads/2024/06/pupet.jpg',
  },
  {
    name: 'A Regressor’s Tale of Cultivation',
    path: 'series/a-regressors-tale-of-cultivation',
    author: 'Yoo Ryeo Han',
    cover: 'https://indowebnovel.id/wp-content/uploads/2024/03/regressor.jpg',
  },
  {
    name: 'Keyboard Immortal',
    path: 'series/keyboard-immortal',
    author: 'Mudan Flower',
    cover: 'https://indowebnovel.id/wp-content/uploads/2020/12/keyboard-immortal.jpg',
  },
  {
    name: 'Against the Gods',
    path: 'series/dewa-jahat-menentang-langit',
    author: 'Mars Gravity',
    cover: 'https://indowebnovel.id/wp-content/uploads/2020/09/Against-the-Gods.jpg',
  },
  {
    name: 'Solo Leveling',
    path: 'series/solo-leveling-bahasa-indonesia',
    author: 'Chugong',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
  },
  {
    name: 'Omniscient Reader',
    path: 'series/omniscient-readers-viewpoint-bahasa-indonesia',
    author: 'Sing Shong',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
  },
  {
    name: 'The Beginning After The End',
    path: 'series/the-beginning-after-the-end-bahasa-indonesia',
    author: 'TurtleMe',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
  },
  {
    name: 'Second Life Ranker',
    path: 'series/second-life-ranker-bahasa-indonesia',
    author: 'Sadoyeon',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
  },
  {
    name: 'Overgeared',
    path: 'series/overgeared-bahasa-indonesia',
    author: 'Park Saenal',
    cover: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=400&q=80',
  },
  {
    name: 'The Return of the Iron-blood Sword Hound',
    path: 'series/the-return-of-the-iron-blood-sword-hound',
    author: 'Iron Hound',
    cover: 'https://indowebnovel.id/wp-content/uploads/2023/07/ironblood.jpg',
  },
  {
    name: 'Lord of the Mysteries',
    path: 'series/lord-of-the-mysteries-indo',
    author: 'Cuttlefish That Loves Diving',
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
  },
]

function parseHtml(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

export class IndoWebNovelPlugin implements SourcePlugin {
  id = 'indowebnovel'
  name = 'IndoWebNovel'
  site = 'https://indowebnovel.id'
  version = '1.6.8'
  lang = 'id' as const
  legal = 'user-risk' as const
  icon = '🇮🇩'
  description = 'Web Novel & Light Novel terjemahan Bahasa Indonesia lengkap.'

  async popularNovels(_page = 1): Promise<NovelItem[]> {
    try {
      // IndoWebNovel shows popular novels right on home page and advanced-search
      const { text } = await requestHttp('https://indowebnovel.id/')
      const doc = parseHtml(text)
      const items: NovelItem[] = []

      // Selector 1: Flexbox items on homepage
      doc.querySelectorAll('.flexbox3-item, .flexbox2-item, .flexbox-item').forEach((el) => {
        const link = el.querySelector('a')
        const imgEl = el.querySelector('img')
        const titleEl = el.querySelector('.title a') || el.querySelector('.title') || link
        const title = titleEl?.textContent?.trim() || link?.getAttribute('title') || ''
        const href = link?.getAttribute('href') || ''
        const cover = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || undefined

        if (title && href) {
          const cleanPath = this.extractPath(href)
          if (!items.some((i) => i.path === cleanPath)) {
            items.push({
              name: title,
              path: cleanPath,
              cover: cover ? this.cleanImageUrl(cover) : undefined,
            })
          }
        }
      })

      // Selector 2: Series links fallback if flexbox was not matched
      if (items.length === 0) {
        doc.querySelectorAll('a[href*="/series/"]').forEach((link) => {
          const title = link.getAttribute('title') || link.textContent?.trim() || ''
          const href = link.getAttribute('href') || ''
          const imgEl = link.querySelector('img') || link.parentElement?.querySelector('img')
          const cover = imgEl?.getAttribute('src') || undefined

          if (title && href && title.length > 2) {
            const cleanPath = this.extractPath(href)
            if (!items.some((i) => i.path === cleanPath)) {
              items.push({
                name: title,
                path: cleanPath,
                cover: cover ? this.cleanImageUrl(cover) : undefined,
              })
            }
          }
        })
      }

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
      const { text } = await requestHttp(`https://indowebnovel.id/?s=${encodeURIComponent(query)}`)
      const doc = parseHtml(text)
      const items: NovelItem[] = []

      doc.querySelectorAll('.flexbox3-item, .flexbox2-item, .flexbox-item, .bs .bsx, article').forEach((el) => {
        const link = el.querySelector('a')
        const imgEl = el.querySelector('img')
        const titleEl = el.querySelector('.title a') || el.querySelector('.title') || el.querySelector('h2') || link
        const title = titleEl?.textContent?.trim() || link?.getAttribute('title') || ''
        const href = link?.getAttribute('href') || ''
        const cover = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || undefined

        if (title && href) {
          const cleanPath = this.extractPath(href)
          if (!items.some((i) => i.path === cleanPath)) {
            items.push({
              name: title,
              path: cleanPath,
              cover: cover ? this.cleanImageUrl(cover) : undefined,
            })
          }
        }
      })

      return items.length > 0 ? items : localMatch
    } catch {
      return localMatch
    }
  }

  async parseNovel(path: string): Promise<SourceNovel> {
    const fullUrl = path.startsWith('http')
      ? path
      : path.startsWith('series/')
      ? `https://indowebnovel.id/${path}/`
      : `https://indowebnovel.id/series/${path}/`

    try {
      const { text } = await requestHttp(fullUrl)
      const doc = parseHtml(text)

      const title =
        doc.querySelector('.series-title h2, h2.title, .entry-title, h1')?.textContent?.trim() ||
        path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Novel'

      const img = doc.querySelector('.series-thumb img, .thumb img, .featured-image img, img.wp-post-image')
      const cover = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined

      const author =
        doc.querySelector('.series-infolist li:has(b:contains("Author")) span, .imptdt i, .author')?.textContent?.trim() ||
        'IndoWebNovel Translation'

      const summary =
        doc.querySelector('.series-synopsis, .synopsis, .entry-content[itemprop="description"], .entry-content')?.textContent?.trim() ||
        'Sinopsis belum tersedia untuk novel ini.'

      const genres = Array.from(doc.querySelectorAll('.series-genres a, .mgen a, .genres a'))
        .map((el) => el.textContent?.trim() || '')
        .filter(Boolean)
        .join(', ')

      const status = 'ongoing' as const

      const chapters: ChapterItem[] = []
      // IndoWebNovel lists chapters in .series-chapterlists li a
      doc.querySelectorAll('.series-chapterlists li a, .series-chapterlist li a, .bxcl li a, #chapterlist li a').forEach((link, idx) => {
        const href = link.getAttribute('href') || ''
        const numEl = link.querySelector('.chapternum')
        const name = numEl?.textContent?.trim() || link.textContent?.trim() || `Bab ${idx + 1}`

        if (href) {
          chapters.push({
            name,
            path: this.extractPath(href),
            chapterNumber: idx + 1,
          })
        }
      })

      // Invert if listed descending
      if (chapters.length > 1 && chapters[0].name.toLowerCase().includes('chapter') && chapters[chapters.length - 1].name.toLowerCase().includes('chapter 1')) {
        chapters.reverse()
        chapters.forEach((ch, idx) => { ch.chapterNumber = idx + 1 })
      }

      if (chapters.length === 0) {
        // Fallback placeholder chapters if remote site changed markup
        for (let i = 1; i <= 20; i++) {
          chapters.push({
            name: `Bab ${i}`,
            path: `${fullUrl}#bab-${i}`,
            chapterNumber: i,
          })
        }
      }

      return {
        path,
        name: title,
        cover: cover ? this.cleanImageUrl(cover) : undefined,
        author,
        summary,
        genres,
        status,
        declaredChapterCount: chapters.length,
        chapters,
      }
    } catch {
      // Fallback
      return {
        path,
        name: path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Novel',
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        summary: 'Novel dari IndoWebNovel. Buka bab untuk membaca langsung.',
        status: 'ongoing',
        declaredChapterCount: 10,
        chapters: Array.from({ length: 10 }, (_, i) => ({
          name: `Bab ${i + 1}`,
          path: `${fullUrl}#bab-${i + 1}`,
          chapterNumber: i + 1,
        })),
      }
    }
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const fullUrl = chapterPath.startsWith('http')
      ? chapterPath
      : `https://indowebnovel.id/${chapterPath.replace(/^\//, '').replace(/\/$/, '')}/`

    try {
      const { text } = await requestHttp(fullUrl)
      const doc = parseHtml(text)

      // IndoWebNovel chapter body is inside #content or .font_default or .tldariinggrissendiribrojangancopy or .entry-content
      const contentEl = doc.querySelector('#content, .font_default, .tldariinggrissendiribrojangancopy, .entry-content, article')
      if (contentEl) {
        contentEl.querySelectorAll('script, style, .ads, .ad-container, ins, .code-block, noscript, .pagi-nav, .navigation, .share-buttons').forEach((el) => el.remove())
        const paragraphs = Array.from(contentEl.querySelectorAll('p'))
          .map((p) => p.textContent?.trim() ?? '')
          .filter((t) => t.length > 3 && !t.includes('ads') && !t.includes('indowebnovel.id') && !t.includes('Lihat semua daftar chapter'))

        if (paragraphs.length > 0) {
          return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
        }
      }

      // Fallback extract all <p> in doc
      const allParas = Array.from(doc.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() ?? '')
        .filter((t) => t.length > 20 && !t.includes('indowebnovel') && !t.includes('copyright'))

      if (allParas.length > 0) {
        return allParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
      }

      return `<p>Konten bab dari IndoWebNovel tidak dapat dimuat saat ini. Silakan coba kembali nanti.</p>`
    } catch {
      return `<p>Gagal menghubungi server IndoWebNovel. Periksa sambungan internet Anda.</p>`
    }
  }

  private extractPath(href: string): string {
    try {
      const url = new URL(href, 'https://indowebnovel.id')
      return url.pathname.replace(/^\//, '').replace(/\/$/, '')
    } catch {
      return href.replace(/^\//, '').replace(/\/$/, '')
    }
  }

  private cleanImageUrl(url: string): string {
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `https://indowebnovel.id${url}`
    // Strip query resize parameters to get high quality image
    return url.split('?')[0]
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
