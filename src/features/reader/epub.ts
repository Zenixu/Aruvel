import { unzipSync } from 'fflate'
import type { Chapter, Novel } from '../../core/db/types'

export type ImportedEpub = { novel: Novel; chapters: (Omit<Chapter, 'id' | 'novelId' | 'isRead' | 'lastParagraph' | 'updatedAt'> & { content: string })[] }

async function readZip(buffer: ArrayBuffer) {
  try {
    const files = unzipSync(new Uint8Array(buffer))
    const decoder = new TextDecoder()
    return { entries: new Map(Object.keys(files).map((path) => [path, files[path]])), get: async (path: string) => {
      const content = files[path]
      if (!content) throw new Error(`Berkas EPUB tidak ditemukan: ${path}`)
      return decoder.decode(content)
    } }
  } catch { throw new Error('Berkas ZIP/EPUB rusak atau terenkripsi.') }
}

function safePath(base: string, path: string) {
  const parts = base.split('/').filter(Boolean)
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') { if (parts.length) parts.pop() }
    else parts.push(part)
  }
  return parts.join('/')
}

export async function parseEpub(file: File): Promise<ImportedEpub> {
  if (!file.name.toLowerCase().endsWith('.epub')) throw new Error('Pilih berkas dengan ekstensi .epub.')
  if (file.size > 100 * 1024 * 1024) throw new Error('Ukuran EPUB melebihi batas 100 MB.')
  const zip = await readZip(await file.arrayBuffer())
  const container = new DOMParser().parseFromString(await zip.get('META-INF/container.xml'), 'application/xml')
  if (container.querySelector('parsererror')) throw new Error('Container EPUB rusak.')
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path')
  if (opfPath && (/^(?:\/|[a-z]+:)/i.test(opfPath) || opfPath.split('/').includes('..') || decodeURIComponent(opfPath).split('/').includes('..'))) throw new Error('Path paket EPUB tidak valid.')
  if (opfPath && !zip.entries.has(opfPath)) throw new Error(`Berkas EPUB tidak ditemukan: ${opfPath}`)
  if (!opfPath) throw new Error('Paket EPUB tidak memiliki OPF yang valid.')
  const opf = new DOMParser().parseFromString(await zip.get(opfPath), 'application/xml')
  if (opf.querySelector('parsererror')) throw new Error('Metadata OPF EPUB rusak.')
  const title = opf.getElementsByTagNameNS('*', 'title')[0]?.textContent?.trim() || file.name.replace(/\.epub$/i, '')
  const author = opf.getElementsByTagNameNS('*', 'creator')[0]?.textContent?.trim()
  const manifest = new Map(Array.from(opf.getElementsByTagNameNS('*', 'item')).map((item) => [item.getAttribute('id') ?? '', item.getAttribute('href') ?? '']))
  const spine = Array.from(opf.getElementsByTagNameNS('*', 'itemref'))
  const base = opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
  const chapters = []
  for (const [position, itemref] of spine.entries()) {
    const href = manifest.get(itemref.getAttribute('idref') ?? '')
    if (!href || /^(https?:|data:|\/\/)/i.test(href)) continue
    let chapterPath: string
    const decodedHref = decodeURIComponent(href.split('#')[0].split('?')[0])
    if (decodedHref.split('/').includes('..')) throw new Error(`Bagian EPUB tidak ditemukan atau path tidak valid: ${href}`)
    try { chapterPath = safePath(base, decodedHref) } catch { throw new Error(`Path bagian EPUB tidak valid: ${href}`) }
    if (!zip.entries.has(chapterPath)) throw new Error(`Bagian EPUB tidak ditemukan atau path tidak valid: ${href}`)
    const document = new DOMParser().parseFromString(await zip.get(chapterPath), 'application/xhtml+xml')
    if (document.querySelector('parsererror')) throw new Error(`Bagian EPUB tidak valid: ${href}`)
    for (const node of document.querySelectorAll('script,style,iframe,object,embed,form,svg,math')) node.remove()
    const body = document.querySelector('body')
    if (!body) continue
    const blocks = Array.from(body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,dt,dd,figcaption'))
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '').filter(Boolean)
    const content = (blocks.length ? blocks : [body.textContent ?? '']).join('\n').trim()
    if (!content) continue
    const chapterName = body.querySelector('h1,h2,h3,h4,h5,h6')?.textContent?.trim() || document.querySelector('title')?.textContent?.trim() || `Bagian ${position + 1}`
    chapters.push({ name: chapterName, path: href, position, chapterNumber: position + 1, releaseTime: undefined, content })
  }
  if (chapters.length === 0) throw new Error('EPUB tidak berisi bagian teks yang dapat dibaca.')
  return { novel: { sourceId: 'local', path: `epub:${file.name}:${file.size}:${file.lastModified}`, name: title, author, localFile: file.name, status: 'completed' }, chapters }
}
