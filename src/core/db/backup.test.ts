import { afterEach, describe, expect, it } from 'vitest'
import { db } from './database'
import { exportBackup, restoreBackup } from './backup'

async function clearDatabase() {
  await Promise.all([db.sources.clear(), db.novels.clear(), db.chapters.clear(), db.chapterContents.clear(), db.categories.clear(), db.novelCategories.clear(), db.settings.clear()])
}

afterEach(clearDatabase)

describe('local backup', () => {
  it('exports library and chapter text and restores it after clearing local data', async () => {
    await db.sources.put({ id: 'local', name: 'Local', site: '', lang: 'local', legal: 'public-domain' })
    const novelId = await db.novels.add({ sourceId: 'local', path: 'epub:test', name: 'Book', status: 'completed', localFile: 'book.epub', cover: 'data:image/png;base64,AA==' })
    const chapterId = await db.chapters.add({ novelId, name: 'Chapter 1', path: 'chapter-1', position: 0, isRead: true, lastParagraph: 4, updatedAt: 10 })
    await db.chapterContents.add({ chapterId, filePath: 'local:chapter-1', size: 17, downloadedAt: 10, content: 'Paragraph one.\nParagraph two.' })
    await db.categories.add({ name: 'Read later', order: 0 })
    await db.settings.put({ key: 'reader.settings', value: '{"theme":"sepia"}' })

    const blob = await exportBackup()
    const parsed = JSON.parse(await blob.text()) as { format: string; version: number; chapterContents: Array<{ content?: string }> }
    expect(parsed.format).toBe('aruvel-backup')
    expect(parsed.version).toBe(1)
    expect(parsed.chapterContents[0]?.content).toBe('Paragraph one.\nParagraph two.')

    await clearDatabase()
    await restoreBackup(new File([blob], 'backup.json', { type: 'application/json' }))
    expect(await db.novels.get(novelId)).toMatchObject({ name: 'Book', cover: 'data:image/png;base64,AA==' })
    expect(await db.chapters.get(chapterId)).toMatchObject({ isRead: true, lastParagraph: 4 })
    expect(await db.chapterContents.get(chapterId)).toMatchObject({ content: 'Paragraph one.\nParagraph two.' })
    expect(await db.settings.get('reader.settings')).toMatchObject({ value: '{"theme":"sepia"}' })
  })

  it('rejects invalid backups without clearing existing library data', async () => {
    await db.sources.put({ id: 'local', name: 'Local', site: '', lang: 'local', legal: 'public-domain' })
    const novelId = await db.novels.add({ sourceId: 'local', path: 'epub:test', name: 'Keep me', status: 'completed' })
    const invalid = new File(['{"format":"aruvel-backup","version":1,"novels":[]}'], 'bad.json')
    await expect(restoreBackup(invalid)).rejects.toThrow('Data backup tidak lengkap')
    expect(await db.novels.get(novelId)).toMatchObject({ name: 'Keep me' })
  })
})
