import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import { categoryRepository, libraryRepository } from './repository'

const testDb = db

beforeEach(async () => { await testDb.open() })
afterEach(async () => { await testDb.close(); await testDb.delete() })

describe('Aruvel repositories', () => {
  it('adds novels, assigns categories, and lists unread counts', async () => {
    const novelId = await libraryRepository.add({ sourceId: 'local', path: 'test:Novel A', name: 'Novel A', status: 'unknown' })
    const categoryId = await categoryRepository.add('Favorit')
    await categoryRepository.assign(novelId, categoryId)
    await testDb.chapters.add({ novelId, name: 'Bab 1', path: 'chapter/1', position: 0, isRead: false, lastParagraph: 0, updatedAt: 1 })
    await testDb.chapters.add({ novelId, name: 'Bab 2', path: 'chapter/2', position: 1, isRead: true, lastParagraph: 0, updatedAt: 2 })

    expect(await libraryRepository.add({ sourceId: 'local', path: 'test:Novel A', name: 'Novel A duplikat', status: 'unknown' })).toBe(novelId)
    expect(await libraryRepository.list()).toMatchObject([{ id: novelId, unreadCount: 1, categories: [{ id: categoryId, name: 'Favorit' }] }])
    expect((await libraryRepository.list(categoryId))).toHaveLength(1)
    expect(await libraryRepository.list(-1)).toHaveLength(0)
  })

  it('removes a novel and its related chapters, downloads, and category links', async () => {
    const novelId = await libraryRepository.add({ sourceId: 'local', path: 'test:Novel B', name: 'Novel B', status: 'unknown' })
    const categoryId = await categoryRepository.add('Favorit')
    await categoryRepository.assign(novelId, categoryId)
    const chapterId = await testDb.chapters.add({ novelId, name: 'Bab 1', path: 'chapter/1', position: 0, isRead: false, lastParagraph: 0, updatedAt: 1 })
    await testDb.chapterContents.add({ chapterId, filePath: 'downloads/1.html', size: 10, downloadedAt: 1 })
    await libraryRepository.remove(novelId)
    expect(await testDb.novels.count()).toBe(0)
    expect(await testDb.chapters.count()).toBe(0)
    expect(await testDb.chapterContents.count()).toBe(0)
    expect(await testDb.novelCategories.count()).toBe(0)
  })
})
