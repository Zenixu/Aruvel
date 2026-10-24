import { db } from './database'
import { isEpubChapterContent, type Category, type Chapter, type ChapterContent, type Novel, type NovelCategory, type Setting, type Source } from './types'

const BACKUP_VERSION = 1
const MAX_BACKUP_BYTES = 64 * 1024 * 1024

type BackupData = {
  format: 'aruvel-backup'
  version: 1
  exportedAt: string
  sources: Source[]
  novels: Novel[]
  chapters: Chapter[]
  chapterContents: Array<ChapterContent & { content?: string }>
  categories: Category[]
  novelCategories: NovelCategory[]
  settings: Setting[]
}

export async function exportBackup(): Promise<Blob> {
  const [sources, novels, chapters, rawContents, categories, novelCategories, settings] = await Promise.all([
    db.sources.toArray(), db.novels.toArray(), db.chapters.toArray(), db.chapterContents.toArray(),
    db.categories.toArray(), db.novelCategories.toArray(), db.settings.toArray(),
  ])
  const chapterContents: BackupData['chapterContents'] = rawContents.map((item) => {
    if (!isEpubChapterContent(item)) return item
    const { content, ...metadata } = item
    return { ...metadata, content }
  })
  const data: BackupData = { format: 'aruvel-backup', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), sources, novels, chapters, chapterContents, categories, novelCategories, settings }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  if (blob.size > MAX_BACKUP_BYTES) throw new Error('Backup melebihi batas ukuran 64 MB. Hapus chapter terunduh lalu coba lagi.')
  if (chapterContents.some((item) => item.content === undefined && novels.some(({ localFile }) => Boolean(localFile)))) throw new Error('Backup tidak dapat melindungi EPUB lokal lengkap. Simpan salinan EPUB asli secara terpisah sebelum melanjutkan.')
  if (novels.some(({ cover }) => Boolean(cover && /^https?:/i.test(cover)))) throw new Error('Sampul novel eksternal belum disalin ke backup. Unduh atau simpan salinan sampul terlebih dahulu.')
  
  return blob
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validRows<T>(value: unknown, fields: string[]): value is T[] {
  return Array.isArray(value) && value.every((row) => isRecord(row) && fields.every((field) => field in row))
}

export async function restoreBackup(file: File): Promise<void> {
  if (file.size <= 0 || file.size > MAX_BACKUP_BYTES) throw new Error('Berkas backup kosong atau melebihi 64 MB.')
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) as unknown }
  catch { throw new Error('Berkas backup bukan JSON yang valid.') }
  if (!isRecord(parsed) || parsed.format !== 'aruvel-backup' || parsed.version !== BACKUP_VERSION) throw new Error('Format atau versi backup tidak didukung.')
  const spec: Array<[keyof Omit<BackupData, 'format' | 'version' | 'exportedAt'>, string[]]> = [
    ['sources', ['id', 'name', 'site', 'lang', 'legal']],
    ['novels', ['sourceId', 'path', 'name', 'status']],
    ['chapters', ['novelId', 'name', 'path', 'position', 'isRead', 'lastParagraph', 'updatedAt']],
    ['chapterContents', ['chapterId', 'filePath', 'size', 'downloadedAt']],
    ['categories', ['name', 'order']],
    ['novelCategories', ['novelId', 'categoryId']],
    ['settings', ['key', 'value']],
  ]
  for (const [key, fields] of spec) if (!validRows(parsed[key], fields)) throw new Error(`Data backup tidak lengkap: ${key}.`)
  const data = parsed as unknown as BackupData
  await db.transaction('rw', [db.sources, db.novels, db.chapters, db.chapterContents, db.categories, db.novelCategories, db.settings], async () => {
    await Promise.all([db.sources.clear(), db.novels.clear(), db.chapters.clear(), db.chapterContents.clear(), db.categories.clear(), db.novelCategories.clear(), db.settings.clear()])
    await db.sources.bulkPut(data.sources)
    await db.novels.bulkPut(data.novels)
    await db.chapters.bulkPut(data.chapters)
    for (const item of data.chapterContents) {
      if (typeof item.content === 'string') await db.chapterContents.put(item as ChapterContent & { content: string })
      else await db.chapterContents.put(item)
    }
    await db.categories.bulkPut(data.categories)
    await db.novelCategories.bulkPut(data.novelCategories)
    await db.settings.bulkPut(data.settings)
  })
}
