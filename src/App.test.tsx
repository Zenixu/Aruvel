import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Aruvel app', () => {
  afterEach(() => {
    cleanup()
  })

  it('changes the display theme via settings', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Pengaturan' }))
    
    const malamBtn = screen.getByRole('button', { name: /Malam/i })
    fireEvent.click(malamBtn)
    expect(document.querySelector('.app')).toHaveAttribute('data-theme', 'malam')
  })

  it('navigates between tabs', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument()
    
    const bottomNav = document.querySelector('.app-bottom-nav')!
    const getNavBtn = (name: string) => {
      const btns = bottomNav.querySelectorAll('button')
      return Array.from(btns).find(b => b.textContent?.trim() === name)!
    }

    fireEvent.click(getNavBtn('Jelajah'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Jelajah' })).toBeInTheDocument()

    fireEvent.click(getNavBtn('Riwayat'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Riwayat' })).toBeInTheDocument()

    fireEvent.click(getNavBtn('Pengaturan'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Pengaturan' })).toBeInTheDocument()
  })
})