import { db } from './database'
import { isEpubChapterContent, type Category, type Chapter, type EpubChapterContent, type LibraryNovel, type Novel } from './types'
import type { ImportedEpub } from '../../features/reader/epub'

export const libraryRepository = {
  async list(categoryId?: number): Promise<LibraryNovel[]> {
    const links = categoryId === undefined
      ? await db.novelCategories.toArray()
      : await db.novelCategories.where('categoryId').equals(categoryId).toArray()
    const allowed = categoryId === undefined ? undefined : new Set(links.map(({ novelId }) => novelId))
    const novels = (await db.novels.toArray()).filter(({ id }) => id !== undefined && (!allowed || allowed.has(id)))
    const [chapters, categories, assignments] = await Promise.all([
      db.chapters.toArray(), db.categories.toArray(), db.novelCategories.toArray(),
    ])
    return novels.map((novel) => {
      const id = novel.id!
      const novelLinks = assignments.filter((link) => link.novelId === id)
      return {
        ...novel,
        id,
        unreadCount: chapters.filter((chapter) => chapter.novelId === id && !chapter.isRead).length,
        lastReadAt: novel.lastReadAt ?? 0,
        categories: novelLinks.flatMap(({ categoryId: assignedId }) => {
          const category = categories.find(({ id: categoryKey }) => categoryKey === assignedId)
          return category ? [category] : []
        }),
      }
    })
  },

  async add(novel: Novel): Promise<number> {
    const existing = await db.novels.where('[sourceId+path]').equals([novel.sourceId, novel.path]).first()
    if (existing?.id !== undefined) return existing.id
    return db.novels.add(novel)
  },

  async importEpub(epub: ImportedEpub, categoryId?: number): Promise<number> {
    return db.transaction('rw', db.novels, db.chapters, db.chapterContents, db.categories, db.novelCategories, async () => {
      const existing = await db.novels.where('[sourceId+path]').equals([epub.novel.sourceId, epub.novel.path]).first()
      if (existing?.id !== undefined) {
        const existingChapterIds = await db.chapters.where('novelId').equals(existing.id).primaryKeys()
        await db.chapterContents.where('chapterId').anyOf(existingChapterIds).delete()
        await db.chapters.where('novelId').equals(existing.id).delete()
        await db.novels.update(existing.id, epub.novel)
        for (const [position, chapter] of epub.chapters.entries()) {
          const chapterId = await db.chapters.add({ novelId: existing.id, name: chapter.name, path: chapter.path, position: chapter.position, chapterNumber: chapter.chapterNumber, isRead: false, lastParagraph: 0, updatedAt: Date.now() + position })
          await db.chapterContents.add({ chapterId, filePath: epub.novel.localFile ?? epub.novel.name, size: new TextEncoder().encode(chapter.content).byteLength, downloadedAt: Date.now(), content: chapter.content } as EpubChapterContent)
        }
        return existing.id
      }
      const novelId = await db.novels.add(epub.novel)
      for (const [position, chapter] of epub.chapters.entries()) {
        const chapterId = await db.chapters.add({ novelId, name: chapter.name, path: chapter.path, position: chapter.position, chapterNumber: chapter.chapterNumber, isRead: false, lastParagraph: 0, updatedAt: Date.now() + position })
        await db.chapterContents.add({ chapterId, filePath: epub.novel.localFile ?? epub.novel.name, size: new TextEncoder().encode(chapter.content).byteLength, downloadedAt: Date.now(), content: chapter.content } as EpubChapterContent)
      }
      const targetCategory = categoryId ?? (await db.categories.where('name').equals('Belum dikategorikan').first())?.id
      if (targetCategory !== undefined) await db.novelCategories.put({ novelId, categoryId: targetCategory })
      return novelId
    })
  },

  async getEpubChapter(novelId: number, position: number): Promise<{ chapter: import('./types').Chapter; content: EpubChapterContent } | undefined> {
    const chapter = await db.chapters.where('[novelId+position]').equals([novelId, position]).first()
    if (chapter?.id === undefined) return undefined
    const content = await db.chapterContents.where('chapterId').equals(chapter.id).first()
    return isEpubChapterContent(content) ? { chapter, content } : undefined
  },

  async remove(id: number): Promise<void> {
    await db.transaction('rw', db.novels, db.chapters, db.chapterContents, db.novelCategories, async () => {
      const chapters = await db.chapters.where('novelId').equals(id).toArray()
      await db.chapterContents.where('chapterId').anyOf(chapters.flatMap(({ id: chapterId }) => chapterId === undefined ? [] : [chapterId])).delete()
      await db.chapters.where('novelId').equals(id).delete()
      await db.novelCategories.where('novelId').equals(id).delete()
      await db.novels.delete(id)
    })
  },

  async downloadChapter(novelId: number, chapter: Pick<Chapter, 'name' | 'path' | 'position' | 'chapterNumber'>, content: string): Promise<void> {
    await db.transaction('rw', db.chapters, db.chapterContents, async () => {
      const chapterId = await db.chapters.add({
        novelId,
        name: chapter.name,
        path: chapter.path,
        position: chapter.position,
        chapterNumber: chapter.chapterNumber,
        isRead: false,
        lastParagraph: 0,
        updatedAt: Date.now(),
      })
      await db.chapterContents.add({
        chapterId,
        filePath: '',
        size: new TextEncoder().encode(content).byteLength,
        downloadedAt: Date.now(),
        content,
      } as EpubChapterContent)
    })
  },

  async getDownloadedChapters(novelId: number): Promise<Array<import('./types').Chapter>> {
    const chapters = await db.chapters.where('novelId').equals(novelId).toArray()
    const contents = await db.chapterContents.toArray()
    const contentByChapter = new Map(contents.flatMap((c) => c.id === undefined ? [] : [[c.id, c]]))
    return chapters.filter((chapter) => chapter.id !== undefined && contentByChapter.has(chapter.id))
  },
}

export const categoryRepository = {
  list: (): Promise<Category[]> => db.categories.orderBy('order').toArray(),
  add: (name: string): Promise<number> => db.categories.add({ name: name.trim(), order: Date.now() }),
  async assign(novelId: number, categoryId: number): Promise<void> {
    await db.novelCategories.put({ novelId, categoryId })
  },
}
