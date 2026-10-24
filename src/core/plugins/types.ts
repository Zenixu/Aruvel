export type NovelStatus = 'ongoing' | 'completed' | 'hiatus' | 'unknown'

export interface NovelItem {
  name: string
  path: string
  cover?: string
  author?: string
}

export interface ChapterItem {
  name: string
  path: string
  chapterNumber?: number
  releaseTime?: string
}

export interface SourceNovel {
  path: string
  name: string
  cover?: string
  summary?: string
  author?: string
  genres?: string
  status: NovelStatus
  declaredChapterCount?: number
  chapters: ChapterItem[]
}

export interface SourcePlugin {
  id: string
  name: string
  site: string
  version: number | string
  lang: 'en' | 'id' | string
  legal: 'public-domain' | 'author-platform' | 'user-risk'
  icon?: string
  iconUrl?: string
  isNsfw?: boolean
  description?: string

  popularNovels(page: number, opts?: { latest?: boolean; filters?: unknown }): Promise<NovelItem[]>
  searchNovels(query: string, page: number): Promise<NovelItem[]>
  parseNovel(path: string): Promise<SourceNovel>
  parseChapter(path: string): Promise<string>
}
