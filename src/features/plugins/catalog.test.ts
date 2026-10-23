import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getJson } = vi.hoisted(() => ({ getJson: vi.fn() }))
vi.mock('../../core/http/request', () => ({ getJson }))

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { request } }))

import { checkCatalogEntry, loadCatalog, LNREADER_CATALOG_URL } from './catalog'

describe('LNReader catalogue', () => {
  beforeEach(() => { getJson.mockReset(); request.mockReset() })

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

  it('checks site and plugin file reachability through native HTTP without executing code', async () => {
    request.mockResolvedValue({ status: 200 })
    const result = await checkCatalogEntry({ id: 'x', name: 'X', lang: 'English', version: '1', site: 'https://example.org', url: 'https://raw.githubusercontent.com/a/b/main/x.js' })
    expect(request).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.org', method: 'HEAD' }))
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://raw.githubusercontent.com/a/b/main/x.js', method: 'GET', headers: { Range: 'bytes=0-1023' } }))
    expect(result).toMatchObject({ siteStatus: 200, pluginStatus: 200 })
  })

  it('keeps an individual network failure in the result', async () => {
    request.mockResolvedValueOnce({ status: 200 }).mockRejectedValueOnce(new Error('offline'))
    const result = await checkCatalogEntry({ id: 'x', name: 'X', lang: 'English', version: '1', site: 'https://example.org', url: 'https://raw.githubusercontent.com/a/b/main/x.js' })
    expect(result.siteStatus).toBe(200)
    expect(result.pluginStatus).toBeUndefined()
  })

  it('rejects malformed catalog payloads', async () => {
    getJson.mockResolvedValue({ entries: [] })
    await expect(loadCatalog()).rejects.toThrow('Struktur katalog tidak valid.')
  })
})
