import type { HttpResponse, HttpOptions } from '@capacitor/core'
import { CapacitorHttp } from '@capacitor/core'

export interface NovelMeta {
  id: string
  title: string
  alternativeTitles?: string[]
  author: string
  authorSlug?: string
  description?: string
  genres?: string[]
  coverUrl?: string
  language: 'en' | 'id'
  source: string
}

export interface ChapterMeta {
  number: number
  title: string
  url: string
  chapterId?: number
}

export interface SourcePlugin {
  id: string
  name: string
  site: string
  baseUrl: string
  language: 'en' | 'id'
  hasCloudflare: boolean

  search(query: string, filters?: { genres?: string[]; page?: number }): Promise<SearchResponse>
  getNovelMeta(url: string): Promise<NovelMeta>
  listChapters(novelId: string, url: string): Promise<ChapterMeta[]>
  getChapterContent(url: string): Promise<{ content: string; hasCloudflare: boolean }>
  checkUpdates(novelId: string, chapters: ChapterMeta[]): Promise<{ newChapter: ChapterMeta | null }>
}

export interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  nextPage?: string
}

export interface SearchResult {
  id: string
  title: string
  author: string
  url: string
  coverUrl?: string
  genres?: string[]
  description?: string
}

export function detectCloudflare(response: HttpResponse): boolean {
  const server = response.headers?.['server']
  if (server?.includes('cloudflare') || server?.includes('CLOUD')) return true
  if (response.data?.includes?.('Checking your browser before accessing')) return true
  if (response.data?.includes?.('DDoS protection')) return true
  return false
}

export async function fetchWithHeaders(url: string, options: Partial<HttpOptions> = {}): Promise<HttpResponse> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    ...options.headers,
  }

  const config: HttpOptions = {
    url,
    method: 'GET',
    headers,
    responseType: 'text',
    connectTimeout: options.connectTimeout ?? 30_000,
    readTimeout: options.readTimeout ?? 60_000,
  }

  return CapacitorHttp.request(config)
}
