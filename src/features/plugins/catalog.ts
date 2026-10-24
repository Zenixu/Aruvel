import { CapacitorHttp } from '@capacitor/core'
import { getJson } from '../../core/http/request'

export const LNREADER_CATALOG_URL = 'https://raw.githubusercontent.com/LNReader/lnreader-plugins/plugins/v3.0.0/.dist/plugins.min.json'

export interface CatalogEntry {
  id: string
  name: string
  lang: 'English' | 'Bahasa Indonesia'
  version: string
  site: string
  url: string
  iconUrl?: string
}

export interface SourceCheck {
  checkedAt: number
  siteStatus?: number
  pluginStatus?: number
}

export async function checkCatalogEntry(entry: CatalogEntry): Promise<SourceCheck> {
  const siteCheck = CapacitorHttp.request({ url: entry.site, method: 'HEAD', connectTimeout: 10_000, readTimeout: 10_000, responseType: 'text' })
  const pluginCheck = CapacitorHttp.request({ url: entry.url, method: 'HEAD', connectTimeout: 10_000, readTimeout: 10_000, responseType: 'text' })
  const [site, plugin] = await Promise.allSettled([siteCheck, pluginCheck])
  return {
    checkedAt: Date.now(),
    ...(site.status === 'fulfilled' ? { siteStatus: site.value.status } : {}),
    ...(plugin.status === 'fulfilled' ? { pluginStatus: plugin.value.status } : {}),
  }
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const value = await getJson<unknown>(LNREADER_CATALOG_URL)
  if (!Array.isArray(value) || value.length > 2_000) throw new Error('Struktur katalog tidak valid.')
  return value.flatMap((item): CatalogEntry[] => {
    if (!item || typeof item !== 'object') return []
    const entry = item as Record<string, unknown>
    if (entry.lang !== 'English' && entry.lang !== 'Bahasa Indonesia') return []
    if (![entry.id, entry.name, entry.version, entry.site, entry.url].every((field) => typeof field === 'string' && field.length > 0)) return []
    try {
      const site = new URL(entry.site as string)
      const pluginUrl = new URL(entry.url as string)
      if (site.protocol !== 'https:' || pluginUrl.protocol !== 'https:' || pluginUrl.hostname !== 'raw.githubusercontent.com') return []
    } catch { return [] }
    return [{ id: entry.id as string, name: entry.name as string, lang: entry.lang, version: entry.version as string, site: entry.site as string, url: entry.url as string, ...(typeof entry.iconUrl === 'string' ? { iconUrl: entry.iconUrl } : {}) }]
  })
}
