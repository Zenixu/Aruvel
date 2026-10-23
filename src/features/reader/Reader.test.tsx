import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/database'
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

  it('renders chapter content as selectable plain text', () => {
    const { container } = render(<Reader onClose={() => undefined} />)
    const passage = container.querySelector('.reader-content p:not(.reader-chapter-label)')!
    expect(passage.textContent).toMatch(/Hujan turun sejak matahari tenggelam/)
    expect(passage.querySelector('*')).toBeNull()
  })
})
