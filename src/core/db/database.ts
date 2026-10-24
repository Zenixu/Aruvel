import Dexie, { type Table } from 'dexie'
import type { Category, Chapter, ChapterContent, EpubChapterContent, Novel, NovelCategory, Setting, Source } from './types'

export class AruvelDatabase extends Dexie {
  sources!: Table<Source, string>
  novels!: Table<Novel, number>
  chapters!: Table<Chapter, number>
  chapterContents!: Table<ChapterContent | EpubChapterContent, number>
  categories!: Table<Category, number>
  novelCategories!: Table<NovelCategory, number>
  settings!: Table<Setting, string>

  constructor() {
    super('aruvel')
    this.version(1).stores({
      sources: 'id',
      novels: '++id, sourceId, lastReadAt, &[sourceId+path]',
      chapters: '++id, novelId, [novelId+position], isRead, updatedAt',
      chapterContents: '++id, &chapterId',
      categories: '++id, &name, order',
      novelCategories: '++id, novelId, categoryId, &[novelId+categoryId]',
      settings: 'key',
    })
  }
}

export const db = new AruvelDatabase()
