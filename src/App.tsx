import { useState } from 'react'
import Library from './features/library/Library'
import Reader, { type ActivePluginNovel } from './features/reader/Reader'
import Settings from './features/settings/Settings'
import BrowseView from './features/plugins/BrowseView'
import HistoryView from './features/history/HistoryView'
import NovelDetail from './features/novel/NovelDetail'
import type { ChapterItem, SourceNovel } from './core/plugins/types'
import './App.css'

type Theme = 'kertas' | 'sepia' | 'malam' | 'hitam'
type Tab = 'library' | 'explore' | 'history' | 'settings'

interface SelectedNovel {
  sourceId: string
  novelPath: string
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('aruvel.theme') as Theme | null) ?? 'malam')
  const [localReadingId, setLocalReadingId] = useState<number | undefined>(undefined)
  const [pluginReading, setPluginReading] = useState<ActivePluginNovel | undefined>(undefined)
  const [selectedNovel, setSelectedNovel] = useState<SelectedNovel | null>(null)
  const [tab, setTab] = useState<Tab>('library')

  function changeTheme(value: Theme) {
    setTheme(value)
    localStorage.setItem('aruvel.theme', value)
  }

  function handleStartPluginReading(
    novel: SourceNovel,
    chapter: ChapterItem,
    allChapters: ChapterItem[],
    libraryNovelId?: number
  ) {
    if (!selectedNovel) return
    setPluginReading({
      sourceId: selectedNovel.sourceId,
      novel,
      chapter,
      allChapters,
      libraryNovelId,
    })
  }

  const isReading = localReadingId !== undefined || pluginReading !== undefined

  return (
    <div className="app" data-theme={theme}>
      {isReading ? (
        <Reader
          novelId={localReadingId}
          pluginNovel={pluginReading}
          onClose={() => {
            setLocalReadingId(undefined)
            setPluginReading(undefined)
          }}
        />
      ) : selectedNovel ? (
        <NovelDetail
          sourceId={selectedNovel.sourceId}
          novelPath={selectedNovel.novelPath}
          onBack={() => setSelectedNovel(null)}
          onReadChapter={handleStartPluginReading}
        />
      ) : (
        <>
          <header className="app-header">
            <span className="app-mark" aria-hidden="true">◈</span>
            <span className="app-wordmark">ARUVEL</span>
          </header>

          <main className="app-main">
            {tab === 'library' && (
              <Library
                onRead={(id) => setLocalReadingId(id)}
                onOpenDetail={(sourceId, path) => setSelectedNovel({ sourceId, novelPath: path })}
              />
            )}
            {tab === 'explore' && (
              <BrowseView
                onSelectNovel={(sourceId, novelPath) => setSelectedNovel({ sourceId, novelPath })}
              />
            )}
            {tab === 'history' && (
              <HistoryView
                onReadNovel={(id) => setLocalReadingId(id)}
                onOpenDetail={(sourceId, path) => setSelectedNovel({ sourceId, novelPath: path })}
              />
            )}
            {tab === 'settings' && (
              <Settings theme={theme} onThemeChange={changeTheme} />
            )}
          </main>

          <nav className="app-bottom-nav" aria-label="Navigasi Utama">
            <button
              type="button"
              className={`nav-item nav-library ${tab === 'library' ? 'active' : ''}`}
              aria-current={tab === 'library' ? 'page' : undefined}
              onClick={() => { setSelectedNovel(null); setTab('library') }}
            >
              Library
            </button>
            <button
              type="button"
              className={`nav-item nav-explore ${tab === 'explore' ? 'active' : ''}`}
              aria-current={tab === 'explore' ? 'page' : undefined}
              onClick={() => { setSelectedNovel(null); setTab('explore') }}
            >
              Jelajah
            </button>
            <button
              type="button"
              className={`nav-item nav-history ${tab === 'history' ? 'active' : ''}`}
              aria-current={tab === 'history' ? 'page' : undefined}
              onClick={() => { setSelectedNovel(null); setTab('history') }}
            >
              Riwayat
            </button>
            <button
              type="button"
              className={`nav-item nav-settings ${tab === 'settings' ? 'active' : ''}`}
              aria-current={tab === 'settings' ? 'page' : undefined}
              onClick={() => { setSelectedNovel(null); setTab('settings') }}
            >
              Pengaturan
            </button>
          </nav>
        </>
      )}
    </div>
  )
}