import type { Novel } from '../../core/db/types'
import type { SourcePlugin } from './types'
import { GutenbergPlugin, WikisourcePlugin } from './open-plugin'

// Sumber yang didukung Aruvel. Sumber berisiko (agregator tanpa izin) sengaja tidak ada di sini.
const plugins: Record<string, SourcePlugin> = {
  gutenberg: new GutenbergPlugin(),
  'wikisource-id': new WikisourcePlugin(),
}

// Bangun ulang URL sumber dari sourceId + path yang tersimpan di database.
export function novelSourceUrl(novel: Pick<Novel, 'sourceId' | 'path'>): string | undefined {
  if (novel.sourceId === 'gutenberg' && /^\d+$/.test(novel.path)) return `https://www.gutenberg.org/cache/epub/${novel.path}/pg${novel.path}.txt`
  if (novel.sourceId === 'wikisource-id' && /^\d+$/.test(novel.path)) return `https://id.wikisource.org/wiki/${novel.path}`
  return undefined
}

export function novelPlugin(novel: Pick<Novel, 'sourceId' | 'path'>): SourcePlugin | undefined {
  return plugins[novel.sourceId]
}
