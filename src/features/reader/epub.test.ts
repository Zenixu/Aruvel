import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseEpub } from './epub'

function fixture(chapters = ['<h1>Bab Satu</h1><p>Paragraf pertama.</p><script>alert(1)</script><p>Paragraf kedua.</p>', '<h2>Bab Dua</h2><p>Isi bab kedua.</p>']) {
  return zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8('<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>'),
    'OPS/book.opf': strToU8('<package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Novel Uji</dc:title><dc:creator>Penulis Uji</dc:creator></metadata><manifest><item id="c1" href="Text/one.xhtml"/><item id="c2" href="Text/two.xhtml"/><item id="css" href="style.css" media-type="text/css"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'),
    'OPS/Text/one.xhtml': strToU8(`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Judul fallback</title></head><body>${chapters[0]}</body></html>`),
    'OPS/Text/two.xhtml': strToU8(`<html xmlns="http://www.w3.org/1999/xhtml"><body>${chapters[1]}</body></html>`),
    'OPS/style.css': strToU8('body { color: red; }'),
  }, { level: 6 })
}
function file(bytes: Uint8Array, name = 'novel.epub') {
  return new File([bytes as BlobPart], name, { type: 'application/epub+zip', lastModified: 123 })
}

describe('parseEpub', () => {
  it('extracts metadata and spine chapters in reading order, stripping unsafe and non-text content', async () => {
    const result = await parseEpub(file(fixture()))
    expect(result.novel).toMatchObject({ name: 'Novel Uji', author: 'Penulis Uji', sourceId: 'local', localFile: 'novel.epub', status: 'completed' })
    expect(result.chapters.map(({ name, position, content }) => ({ name, position, content }))).toEqual([
      { name: 'Bab Satu', position: 0, content: `Bab Satu\nParagraf pertama.\nParagraf kedua.` },
      { name: 'Bab Dua', position: 1, content: `Bab Dua\nIsi bab kedua.` },
    ])
    expect(result.chapters[0].content).not.toMatch(/alert|script|color: red/i)
  })

  it('accepts uppercase file extensions and falls back to the filename without a title', async () => {
    const result = await parseEpub(file(fixture(), 'TANPA-METADATA.EPUB'))
    expect(result.novel.name).toBe('Novel Uji')
  })

  it('rejects non-EPUB files, oversized files, invalid archives and missing containers', async () => {
    await expect(parseEpub(file(fixture(), 'novel.txt'))).rejects.toThrow('ekstensi .epub')
    const oversized = new File([new Uint8Array(100 * 1024 * 1024 + 1)], 'besar.epub')
    await expect(parseEpub(oversized)).rejects.toThrow('100 MB')
    await expect(parseEpub(file(strToU8('bukan zip')))).rejects.toThrow('ZIP/EPUB rusak')
    const noContainer = zipSync({ 'readme.txt': strToU8('empty') })
    await expect(parseEpub(file(noContainer))).rejects.toThrow('META-INF/container.xml')
  })

  it('rejects malformed OPF, missing spine files, traversal paths and EPUBs without readable text', async () => {
    const malformed = zipSync({ 'META-INF/container.xml': strToU8('<container><rootfile full-path="book.opf"/></container>'), 'book.opf': strToU8('<broken') })
    await expect(parseEpub(file(malformed))).rejects.toThrow()
    const missingChapter = zipSync({ 'META-INF/container.xml': strToU8('<container><rootfile full-path="book.opf"/></container>'), 'book.opf': strToU8('<package><manifest><item id="c" href="missing.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>') })
    await expect(parseEpub(file(missingChapter))).rejects.toThrow('missing.xhtml')
    const traversal = zipSync({ 'META-INF/container.xml': strToU8('<container><rootfile full-path="book.opf"/></container>'), 'book.opf': strToU8('<package><manifest><item id="c" href="%2e%2e/escape.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>'), 'escape.xhtml': strToU8('<html><body><p>escape</p></body></html>') })
    await expect(parseEpub(file(traversal))).rejects.toThrow('path tidak valid')
    const empty = fixture(['<img src="cover.jpg"/>', '<script>unsafe()</script>'])
    await expect(parseEpub(file(empty))).rejects.toThrow('tidak berisi bagian teks')
  })
})
