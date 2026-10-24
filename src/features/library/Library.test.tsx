import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByText('Penulis')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cari di library' }))
    fireEvent.change(screen.getByPlaceholderText('Judul atau penulis'), { target: { value: 'Penulis' } })
    expect(screen.getAllByText('Gema')).toHaveLength(2)
    fireEvent.change(screen.getByPlaceholderText('Judul atau penulis'), { target: { value: 'tidak ada' } })
    expect(screen.getByText('Tidak ada novel yang cocok dengan filter ini.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Judul atau penulis'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^Hapus$/ }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Hapus$/ }))
    expect(screen.getByRole('button', { name: 'Hapus novel: Gema' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
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

describe('Library unduhan offline', () => {
  function mockFetch(body: string, server = 'nginx') {
    return vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'server' ? server : null) },
      text: async () => body,
    }))
  }

  it('mengunduh chapter dari sumber dan menyimpannya untuk dibaca offline', async () => {
    await db.novels.add({ sourceId: 'gutenberg', path: '1885', name: 'The Picture of Dorian Gray', status: 'completed' })
    const body = '*** START OF THE PROJECT GUTENBERG EBOOK DORIAN ***\n\nBab pertama isi buku.\n\nBab kedua isi buku.\n\n*** END OF THE PROJECT GUTENBERG EBOOK DORIAN ***'
    vi.stubGlobal('fetch', mockFetch(body))

    render(<Library onRead={() => undefined} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Unduh offline' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('diunduh'))
    expect(await db.chapters.count()).toBe(1)
    expect(await db.chapterContents.count()).toBe(1)
    vi.unstubAllGlobals()
  })

  it('tidak menyimpan apa pun saat sumber memblokir unduhan otomatis', async () => {
    await db.novels.add({ sourceId: 'gutenberg', path: '1885', name: 'Dorian Gray', status: 'completed' })
    vi.stubGlobal('fetch', mockFetch('Checking your browser before accessing', 'cloudflare'))

    render(<Library onRead={() => undefined} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Unduh offline' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Cloudflare'))
    expect(await db.chapters.count()).toBe(0)
    vi.unstubAllGlobals()
  })
})
