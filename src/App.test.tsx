import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Aruvel library', () => {
  it('changes the display theme and starts with an actionable empty library', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'malam' } })
    expect(document.querySelector('.app')).toHaveAttribute('data-theme', 'malam')
    expect(await screen.findByText(/Library kosong/)).toBeInTheDocument()
  })
})
