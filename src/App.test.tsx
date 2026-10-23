import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Aruvel theme preview', () => {
  it('changes the active theme and exposes the reader sample', () => {
    render(<App />)
    expect(screen.getByText('Halaman pertama')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Malam' }))
    expect(screen.getByRole('button', { name: 'Malam' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('main')).toHaveAttribute('data-theme', 'malam')
  })
})
