import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getJson, get } = vi.hoisted(() => ({ getJson: vi.fn(), get: vi.fn() }))
vi.mock('../../core/http/request', () => ({ getJson }))
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get } }))

import { importOpenLibraryBook, searchOpenLibrary } from './open-library'

describe('open catalogues', () => {
  beforeEach(() => { getJson.mockReset(); get.mockReset() })

  it('searches Gutenberg and returns only plain-text downloads', async () => {
    getJson.mockResolvedValue({ results: [
      { id: 11, title: 'Novel', authors: [{ name: 'Author' }], formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/cache/epub/11/pg11.txt' } },
      { id: 12, title: 'No text', authors: [], formats: {} },
    ] })
    await expect(searchOpenLibrary('  novel ', 'en')).resolves.toEqual([{ id: '11', title: 'Novel', author: 'Author', format: 'https://www.gutenberg.org/cache/epub/11/pg11.txt', lang: 'en' }])
    expect(getJson).toHaveBeenCalledWith(expect.stringContaining('search=novel'), 1_000_000)
  })

  it('imports a complete public-domain Gutenberg text as an offline chapter', async () => {
    get.mockResolvedValue({ status: 200, data: 'Header\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\nThis is a sufficiently long paragraph of public domain text for the simple import parser to retain.\n\n*** END OF THE PROJECT GUTENBERG EBOOK X ***' })
    const result = await importOpenLibraryBook({ id: '11', title: 'Novel', author: 'Author', format: 'https://www.gutenberg.org/cache/epub/11/pg11.txt', lang: 'en' }, 'en')
    expect(result.novel.sourceId).toBe('gutenberg')
    expect(result.chapters[0].content).toContain('public domain text')
    expect(get).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://www.gutenberg.org/cache/epub/11/pg11.txt' }))
  })

  it('refuses a non-Gutenberg download host', async () => {
    await expect(importOpenLibraryBook({ id: '11', title: 'Novel', author: 'Author', format: 'https://example.org/book.txt', lang: 'en' }, 'en')).rejects.toThrow('Tautan buku Project Gutenberg tidak valid.')
    expect(get).not.toHaveBeenCalled()
  })

  it('searches Wikisource with its API and imports plain text', async () => {
    get.mockResolvedValueOnce({ status: 200, data: JSON.stringify({ query: { search: [{ title: 'Contoh', pageid: 21 }] } }) })
      .mockResolvedValueOnce({ status: 200, data: JSON.stringify({ query: { pages: [{ title: 'Contoh', extract: 'Isi karya yang tersedia terbuka.' }] } }) })
    const results = await searchOpenLibrary('contoh', 'id')
    expect(results).toEqual([{ id: '21', title: 'Contoh', author: 'Wikisumber', format: 'Contoh', lang: 'id' }])
    const imported = await importOpenLibraryBook(results[0], 'id')
    expect(imported.novel.sourceId).toBe('wikisource-id')
    expect(imported.chapters[0].content).toBe('Isi karya yang tersedia terbuka.')
  })
})
