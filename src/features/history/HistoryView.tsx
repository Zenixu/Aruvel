import { useEffect, useState } from 'react'
import { db } from '../../core/db/database'
import type { Novel, Chapter } from '../../core/db/types'
import './history.css'

interface HistoryEntry {
  novel: Novel
  chapter: Chapter
}

interface HistoryViewProps {
  onReadNovel: (novelId: number) => void
  onOpenDetail?: (sourceId: string, path: string) => void
}

export default function HistoryView({ onReadNovel, onOpenDetail }: HistoryViewProps) {
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setLoading(true)
      try {
        // Find novels that have been read recently
        const readNovels = await db.novels.where('lastReadAt').above(0).reverse().sortBy('lastReadAt')
        const entries: HistoryEntry[] = []

        for (const novel of readNovels) {
          if (novel.id === undefined) continue
          // Find the latest updated chapter for this novel
          const latestChapter = await db.chapters
            .where('novelId')
            .equals(novel.id)
            .reverse()
            .sortBy('updatedAt')
            .then((res) => res[0])

          if (latestChapter) {
            entries.push({ novel, chapter: latestChapter })
          }
        }

        if (active) setHistoryItems(entries)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadHistory()
    return () => { active = false }
  }, [])

  async function removeFromHistory(novelId: number) {
    await db.novels.update(novelId, { lastReadAt: 0 })
    setHistoryItems((items) => items.filter((item) => item.novel.id !== novelId))
  }

  return (
    <main className="history-page">
      <header className="page-header" style={{ padding: '16px 16px 8px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', margin: 0 }}>Riwayat</h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
          Daftar bacaan yang baru-baru ini dibuka.
        </p>
      </header>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
          Memuat riwayat bacaan...
        </div>
      )}

      {!loading && historyItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--muted)' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Belum ada riwayat bacaan.</p>
          <p style={{ fontSize: '13px' }}>Buku atau bab yang kamu buka akan muncul di sini secara otomatis.</p>
        </div>
      )}

      <ul className="history-items-list" style={{ listStyle: 'none', margin: 0, padding: '0 16px' }}>
        {historyItems.map(({ novel, chapter }) => (
          <li
            key={novel.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--rule)',
              gap: '12px',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => {
                if (novel.id !== undefined) {
                  if (onOpenDetail && novel.sourceId !== 'local') {
                    onOpenDetail(novel.sourceId, novel.path)
                  } else {
                    onReadNovel(novel.id)
                  }
                }
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '70px',
                  flexShrink: 0,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                }}
              >
                {novel.cover ? (
                  <img src={novel.cover} alt={novel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      fontSize: '10px',
                      textAlign: 'center',
                    }}
                  >
                    {novel.name.slice(0, 8)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <strong style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {novel.name}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  {chapter.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>
                  Lanjut baca paragraf {chapter.lastParagraph + 1}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="action-icon-btn"
              style={{ fontSize: '16px', color: 'var(--muted)' }}
              title="Hapus dari riwayat"
              onClick={() => {
                if (novel.id !== undefined) void removeFromHistory(novel.id)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
