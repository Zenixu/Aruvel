import { useState } from 'react'
import Library from './features/library/Library'
import Reader from './features/reader/Reader'
import './App.css'

type Theme = 'kertas' | 'sepia' | 'malam' | 'hitam'

export default function App() {
  const [theme, setTheme] = useState<Theme>('kertas')
  const [reading, setReading] = useState<number | undefined>(undefined)
  return (
    <div className="app" data-theme={theme}>
      <div className="theme-control">
        <label htmlFor="theme-select">Tema</label>
        <select id="theme-select" value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
          <option value="kertas">Kertas</option><option value="sepia">Sepia</option><option value="malam">Malam</option><option value="hitam">Hitam</option>
        </select>
      </div>
      {reading === undefined && <Library onRead={setReading} />}
      {reading !== undefined && <Reader novelId={reading} onClose={() => setReading(undefined)} />}
    </div>
  )
}
