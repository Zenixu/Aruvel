import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getJson } = vi.hoisted(() => ({ getJson: vi.fn() }))
vi.mock('../../core/http/request', () => ({ getJson }))

import { loadCatalog, LNREADER_CATALOG_URL } from './catalog'

describe('LNReader catalogue', () => {
  beforeEach(() => getJson.mockReset())

  it('loads only English and Indonesian entries with HTTPS metadata', async () => {
    getJson.mockResolvedValue([
      { id: 'en', name: 'English Source', lang: 'English', version: '1', site: 'https://example.org', url: 'https://raw.githubusercontent.com/a/b/main/plugin.js' },
      { id: 'id', name: 'Indonesian Source', lang: 'Bahasa Indonesia', version: '1', site: 'https://example.id', url: 'https://raw.githubusercontent.com/a/b/main/id.js' },
      { id: 'xx', name: 'Other language', lang: 'Japanese', version: '1', site: 'https://example.jp', url: 'https://raw.githubusercontent.com/a/b/main/jp.js' },
      { id: 'bad', name: 'Unsafe', lang: 'English', version: '1', site: 'http://example.org', url: 'http://example.org/plugin.js' },
    ])
    const entries = await loadCatalog()
    expect(getJson).toHaveBeenCalledWith(LNREADER_CATALOG_URL)
    expect(entries.map(({ id }) => id)).toEqual(['en', 'id'])
  })

  it('rejects malformed catalog payloads', async () => {
    getJson.mockResolvedValue({ entries: [] })
    await expect(loadCatalog()).rejects.toThrow('Struktur katalog tidak valid.')
  })
})
