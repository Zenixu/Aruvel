import { describe, expect, it } from 'vitest'
import { novelPlugin, novelSourceUrl } from './novel-source'

describe('novel-source', () => {
  it('membangun ulang URL sumber untuk sumber yang didukung', () => {
    expect(novelSourceUrl({ sourceId: 'gutenberg', path: '1885' })).toBe('https://www.gutenberg.org/cache/epub/1885/pg1885.txt')
    expect(novelSourceUrl({ sourceId: 'wikisource-id', path: '12345' })).toBe('https://id.wikisource.org/wiki/12345')
    expect(novelPlugin({ sourceId: 'gutenberg', path: '1885' })?.id).toBe('gutenberg')
    expect(novelPlugin({ sourceId: 'wikisource-id', path: '12345' })?.id).toBe('wikisource-id')
  })

  it('menolak sumber lokal dan id non-numerik', () => {
    expect(novelSourceUrl({ sourceId: 'local', path: 'manual:abc' })).toBeUndefined()
    expect(novelSourceUrl({ sourceId: 'gutenberg', path: 'test:Novel A' })).toBeUndefined()
    expect(novelPlugin({ sourceId: 'local', path: 'manual:abc' })).toBeUndefined()
  })
})