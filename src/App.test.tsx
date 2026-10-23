import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { loadCatalog } from './features/plugins/catalog'

vi.mock('./features/plugins/catalog', () => ({ loadCatalog: vi.fn() }))

describe('Aruvel library', () => {
  it('changes the display theme and starts with an actionable empty library', async () => {
    vi.mocked(loadCatalog).mockResolvedValue([])
    render(<App />)
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'malam' } })
    expect(document.querySelector('.app')).toHaveAttribute('data-theme', 'malam')
    expect(await screen.findByText(/Library kosong/)).toBeInTheDocument()
    expect(await screen.findByText('Katalog sumber ID & EN')).toBeInTheDocument()
  })
})
