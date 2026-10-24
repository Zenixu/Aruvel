import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { db } from './database'
import { categoryRepository, libraryRepository } from './repository'
import type { ImportedEpub } from '../../features/reader/epub'

const testDb = db

beforeEach(async () => { await testDb.open() })
afterEach(async () => { cleanup(); await testDb.close(); await testDb.delete() })

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

  it('imports EPUB chapters and content atomically, reuses the novel on re-import, and removes them on delete', async () => {
    const epub: ImportedEpub = { novel: { sourceId: 'local', path: 'epub:test.epub:1:1', name: 'EPUB Uji', localFile: 'test.epub', status: 'completed' }, chapters: [
      { name: 'Bab 1', path: 'Text/1.xhtml', position: 0, chapterNumber: 1, content: 'Isi bab pertama.' },
      { name: 'Bab 2', path: 'Text/2.xhtml', position: 1, chapterNumber: 2, content: 'Isi bab kedua.' },
    ] }
    const categoryId = await categoryRepository.add('Favorit')
    const novelId = await libraryRepository.importEpub(epub, categoryId)
    const chapter = await libraryRepository.getEpubChapter(novelId, 1)
    expect(chapter).toMatchObject({ chapter: { name: 'Bab 2', position: 1 }, content: { content: 'Isi bab kedua.', filePath: 'test.epub' } })
    expect((await libraryRepository.list())[0]).toMatchObject({ name: 'EPUB Uji', unreadCount: 2, categories: [{ id: categoryId }] })
    expect(await libraryRepository.importEpub(epub)).toBe(novelId)
    expect(await testDb.novels.count()).toBe(1)
    expect(await testDb.chapters.count()).toBe(2)
    expect(await testDb.chapterContents.count()).toBe(2)
    await libraryRepository.remove(novelId)
    expect(await testDb.chapterContents.count()).toBe(0)
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

  it('menyimpan chapter unduhan dan melaporkan chapter yang sudah tersimpan', async () => {
    const novelId = await libraryRepository.add({ sourceId: 'gutenberg', path: '1885', name: 'The Picture of Dorian Gray', status: 'completed' })
    await libraryRepository.downloadChapter(novelId, { name: 'Teks lengkap', path: 'https://www.gutenberg.org/cache/epub/1885/pg1885.txt', position: 0, chapterNumber: 1 }, 'Isi lengkap.')

    expect(await libraryRepository.getDownloadedChapters(novelId)).toMatchObject([{ name: 'Teks lengkap', chapterNumber: 1 }])
    expect(await testDb.chapterContents.count()).toBe(1)

    await libraryRepository.remove(novelId)
    expect(await testDb.chapterContents.count()).toBe(0)
  })
})
