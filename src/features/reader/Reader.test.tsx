import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/database'
import type { EpubChapterContent } from '../../core/db/types'
import Reader from './Reader'

beforeEach(async () => { await db.open() })
afterEach(async () => { await db.close(); await db.delete() })

describe('Reader', () => {
  it('persists reading controls and restores position after reopening', async () => {
    const first = render(<Reader onClose={() => undefined} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))
    await waitFor(() => expect(screen.getByText('Paragraf 2 dari 5')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Ukuran font'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('Tema baca'), { target: { value: 'malam' } })
    await waitFor(async () => {
      expect((await db.settings.get('reader.sample.lastParagraph'))?.value).toBe('1')
      const saved = await db.settings.get('reader.settings')
      expect(saved?.value).toContain('"fontSize":22')
      expect(saved?.value).toContain('"theme":"malam"')
    })

    first.unmount()
    render(<Reader onClose={() => undefined} />)
    await waitFor(() => expect(screen.getByText('Paragraf 2 dari 5')).toBeInTheDocument())
    expect(screen.getByLabelText('Ukuran font')).toHaveValue('22')
    expect(screen.getByLabelText('Tema baca')).toHaveValue('malam')
    expect(document.querySelector('.reader-screen')).toHaveAttribute('data-theme', 'malam')
  })

  it('opens imported EPUB chapters, navigates within them, and restores the saved paragraph position', async () => {
    cleanup()
    const novelId = await db.novels.add({ sourceId: 'local', path: 'epub:reader', name: 'Novel Reader', status: 'completed' })
    const firstId = await db.chapters.add({ novelId, name: 'Bab Pertama', path: 'first.xhtml', position: 0, isRead: false, lastParagraph: 1, updatedAt: 1 })
    const secondId = await db.chapters.add({ novelId, name: 'Bab Kedua', path: 'second.xhtml', position: 1, isRead: false, lastParagraph: 0, updatedAt: 2 })
    await db.chapterContents.add({ chapterId: firstId, content: 'Baris 1\nBaris 2\nBaris 3', filePath: 'reader.epub', size: 20, downloadedAt: 1 } as EpubChapterContent)
    await db.chapterContents.add({ chapterId: secondId, content: 'Bab kedua\nLanjutan bab kedua', filePath: 'reader.epub', size: 20, downloadedAt: 1 } as EpubChapterContent)
    const view = render(<Reader novelId={novelId} onClose={() => undefined} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeEnabled())
    expect(screen.getByRole('heading', { name: 'Bab Pertama' })).toBeInTheDocument()
    expect(screen.getByText('Bab 1/2 · paragraf 2/3')).toBeInTheDocument()
    expect(await db.chapters.get(firstId)).toMatchObject({ lastParagraph: 1 })
    await waitFor(async () => expect((await db.novels.get(novelId))?.lastReadAt).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))
    await waitFor(() => expect(screen.getByText('Bab 1/2 · paragraf 3/3')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bab Kedua' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bab Pertama' })).toBeInTheDocument())
    expect(await db.chapters.get(firstId)).toMatchObject({ lastParagraph: 2 })
    view.unmount()
    cleanup()
    render(<Reader novelId={novelId} onClose={() => undefined} />)
    await waitFor(() => expect(screen.getByText('Bab 1/2 · paragraf 3/3')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Bab Pertama' })).toBeInTheDocument()
  })

  it('renders chapter content as selectable plain text', () => {
    const { container } = render(<Reader onClose={() => undefined} />)
    const passage = container.querySelector('.reader-content p:not(.reader-chapter-label)')!
    expect(passage.textContent).toMatch(/Hujan turun sejak matahari tenggelam/)
    expect(passage.querySelector('*')).toBeNull()
  })
})
