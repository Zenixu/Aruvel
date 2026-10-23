import { db } from './database'
import type { Category, LibraryNovel, Novel } from './types'

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

  async remove(id: number): Promise<void> {
    await db.transaction('rw', db.novels, db.chapters, db.chapterContents, db.novelCategories, async () => {
      const chapters = await db.chapters.where('novelId').equals(id).toArray()
      await db.chapterContents.where('chapterId').anyOf(chapters.flatMap(({ id: chapterId }) => chapterId === undefined ? [] : [chapterId])).delete()
      await db.chapters.where('novelId').equals(id).delete()
      await db.novelCategories.where('novelId').equals(id).delete()
      await db.novels.delete(id)
    })
  },
}

export const categoryRepository = {
  list: (): Promise<Category[]> => db.categories.orderBy('order').toArray(),
  add: (name: string): Promise<number> => db.categories.add({ name: name.trim(), order: Date.now() }),
  async assign(novelId: number, categoryId: number): Promise<void> {
    await db.novelCategories.put({ novelId, categoryId })
  },
}
