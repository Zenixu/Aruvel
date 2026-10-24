import { requestHttp, requestJson } from '../http/client'
import type { ChapterItem, NovelItem, SourceNovel, SourcePlugin } from './types'

interface WikiSearchResponse {
  query?: {
    search?: Array<{ title: string; pageid: number; snippet?: string }>
  }
}

interface WikiParseResponse {
  parse?: {
    title: string
    links?: Array<{ ns: number; title: string; exists: boolean }>
    wikitext?: string
  }
}

interface WikiExtractResponse {
  query?: {
    pages?: Array<{ title: string; extract?: string }>
  }
}

const INDONESIAN_CLASSICS: NovelItem[] = [
  {
    name: 'Sitti Nurbaya',
    path: 'Sitti_Nurbaya',
    author: 'Marah Rusli',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sitti_Nurbaya.jpg/440px-Sitti_Nurbaya.jpg',
  },
  {
    name: 'Salah Asuhan',
    path: 'Salah_Asuhan',
    author: 'Abdul Muis',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Salah_Asuhan_cover.jpg/440px-Salah_Asuhan_cover.jpg',
  },
  {
    name: 'Tenggelamnya Kapal Van Der Wijck',
    path: 'Tenggelamnya_Kapal_Van_Der_Wijck',
    author: 'Hamka',
    cover: 'https://upload.wikimedia.org/wikipedia/id/thumb/0/0e/Tenggelamnja_Kapal_van_der_Wijck.jpg/440px-Tenggelamnja_Kapal_van_der_Wijck.jpg',
  },
  {
    name: 'Azab dan Sengsara',
    path: 'Azab_dan_Sengsara',
    author: 'Merari Siregar',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Azab_dan_Sengsara_cover.jpg/440px-Azab_dan_Sengsara_cover.jpg',
  },
  {
    name: 'Layar Terkembang',
    path: 'Layar_Terkembang',
    author: 'Sutan Takdir Alisjahbana',
    cover: 'https://upload.wikimedia.org/wikipedia/id/thumb/2/23/Layar_Terkembang_novel_cover.jpg/440px-Layar_Terkembang_novel_cover.jpg',
  },
  {
    name: 'Si Doel Anak Betawi',
    path: 'Si_Doel_Anak_Betawi',
    author: 'Aman Datuk Madjoindo',
    cover: 'https://upload.wikimedia.org/wikipedia/id/thumb/a/a2/Si_Doel_Anak_Betawi.jpg/440px-Si_Doel_Anak_Betawi.jpg',
  },
]

export class WikisourcePlugin implements SourcePlugin {
  id = 'wikisource-id'
  name = 'Wikisumber Indonesia'
  site = 'https://id.wikisource.org'
  version = 1
  lang = 'id' as const
  legal = 'public-domain' as const
  icon = '🇮🇩'

  async popularNovels(): Promise<NovelItem[]> {
    return INDONESIAN_CLASSICS
  }

  async searchNovels(query: string): Promise<NovelItem[]> {
    const q = query.trim()
    if (!q) return this.popularNovels()

    const localMatch = INDONESIAN_CLASSICS.filter(
      (n) => n.name.toLowerCase().includes(q.toLowerCase()) || n.author?.toLowerCase().includes(q.toLowerCase())
    )
    if (localMatch.length > 0) return localMatch

    const apiUrl = `https://id.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=15&format=json&formatversion=2`
    try {
      const data = await requestJson<WikiSearchResponse>(apiUrl)
      return (data.query?.search ?? []).map((item) => ({
        name: item.title,
        path: item.title.replace(/\s+/g, '_'),
        author: 'Wikisumber',
      }))
    } catch {
      return localMatch
    }
  }

  async parseNovel(path: string): Promise<SourceNovel> {
    const titleFormatted = decodeURIComponent(path.replace(/_/g, ' '))
    const apiUrl = `https://id.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(path)}&prop=links|wikitext|extracts&format=json&formatversion=2`

    let chapters: ChapterItem[] = []
    let summary = 'Karya sastra klasik Indonesia dari Wikisumber.'
    let author = 'Sastrawan Indonesia'
    const classicMeta = INDONESIAN_CLASSICS.find((c) => c.path === path || c.name.toLowerCase() === titleFormatted.toLowerCase())

    if (classicMeta?.author) author = classicMeta.author

    try {
      const data = await requestJson<WikiParseResponse>(apiUrl)
      const links = data.parse?.links ?? []

      // Look for chapter links like "Sitti Nurbaya/Bab 1", "Sitti Nurbaya/Bab 2", etc.
      const chapterLinks = links.filter(
        (l) => l.ns === 0 && l.title.startsWith(`${titleFormatted}/`)
      )

      if (chapterLinks.length > 0) {
        // Natural sort by chapter numbers
        const sorted = chapterLinks.sort((a, b) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] ?? '0', 10)
          const numB = parseInt(b.title.match(/\d+/)?.[0] ?? '0', 10)
          return numA - numB
        })

        chapters = sorted.map((l, idx) => ({
          name: l.title.replace(`${titleFormatted}/`, ''),
          path: l.title.replace(/\s+/g, '_'),
          chapterNumber: idx + 1,
        }))
      }
    } catch {
      // ignore
    }

    if (chapters.length === 0) {
      // Fallback single chapter
      chapters = [
        {
          name: 'Halaman Lengkap',
          path,
          chapterNumber: 1,
        },
      ]
    }

    if (titleFormatted.includes('Sitti Nurbaya')) {
      summary = 'Kisah kasih tak sampai antara Samsulbahri dan Sitti Nurbaya yang terhalang oleh adat dan keserakahan Datuk Maringgih di ranah Minangkabau.'
    } else if (titleFormatted.includes('Salah Asuhan')) {
      summary = 'Konflik kebudayaan Timur dan Barat dalam kehidupan Hanafi dan Corrie du Bussee di masa Hindia Belanda.'
    }

    return {
      path,
      name: classicMeta?.name || titleFormatted,
      cover: classicMeta?.cover,
      author,
      summary,
      genres: 'Sastra Balai Pustaka, Roman Sejarah, Klasik',
      status: 'completed',
      declaredChapterCount: chapters.length,
      chapters,
    }
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const formattedTitle = decodeURIComponent(chapterPath.replace(/_/g, ' '))
    const apiUrl = `https://id.wikisource.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(formattedTitle)}&format=json&formatversion=2`

    try {
      const data = await requestJson<WikiExtractResponse>(apiUrl)
      const page = data.query?.pages?.[0]
      if (page?.extract && page.extract.trim().length > 50) {
        return page.extract.trim()
      }
    } catch {
      // fallback
    }

    // Try HTML fetch if explaintext extract was empty
    const { text } = await requestHttp(`https://id.wikisource.org/wiki/${encodeURIComponent(chapterPath)}`)
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    const contentEl = doc.querySelector('.mw-parser-output')
    if (contentEl) {
      contentEl.querySelectorAll('.mw-empty-elt, .navigation, .noprint').forEach((el) => el.remove())
      const paragraphs = Array.from(contentEl.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() ?? '')
        .filter((t) => t.length > 20)
      if (paragraphs.length > 0) {
        return paragraphs.join('\n\n')
      }
    }

    return 'Konten bab tidak tersedia atau sedang dalam proses digitalisasi Wikisumber.'
  }
}
