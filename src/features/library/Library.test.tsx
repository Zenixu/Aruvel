import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { db } from '../../core/db/database'
import Library from './Library'

beforeEach(async () => { await db.open() })
afterEach(async () => { cleanup(); await db.close(); await db.delete() })

function makeEpub() {
  const archive = zipSync({
    'META-INF/container.xml': strToU8('<container><rootfile full-path="book.opf"/></container>'),
    'book.opf': strToU8('<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Gema</dc:title><dc:creator>Penulis</dc:creator></metadata><manifest><item id="a" href="a.xhtml"/></manifest><spine><itemref idref="a"/></spine></package>'),
    'a.xhtml': strToU8('<html><body><h1>Bab 1</h1><p>Teks novel.</p></body></html>'),
  })
  return new File([archive], 'Gema.epub', { type: 'application/epub+zip' })
}

describe('Library EPUB import', () => {
  it('imports a selected EPUB into the library, reports status, and reuses its record', async () => {
    const { container } = render(<Library onRead={() => undefined} />)
    const input = screen.getByLabelText('Pilih berkas EPUB')
    const file = makeEpub()
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Gema'))
    expect(await db.novels.count()).toBe(1)
    expect(await db.chapters.count()).toBe(1)
    expect(await db.chapterContents.count()).toBe(1)
    expect(container.querySelector('.novel-item h2')).toHaveTextContent('Gema')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(db.novels.count()).resolves.toBe(1))
    expect(await db.chapters.count()).toBe(1)
  })

  it('shows a clear error and does not create a library row for an invalid EPUB', async () => {
    render(<Library onRead={() => undefined} />)
    fireEvent.change(screen.getByLabelText('Pilih berkas EPUB'), { target: { files: [new File(['bad'], 'bad.epub')] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('rusak'))
    expect(await db.novels.count()).toBe(0)
  })
})
