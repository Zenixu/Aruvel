import { useState, useEffect } from 'react'
import { db } from '../../core/db/database'
import { exportBackup, restoreBackup } from '../../core/db/backup'
import { sourceRegistry } from '../../core/plugins/registry'
import './settings.css'

type Theme = 'kertas' | 'sepia' | 'malam' | 'hitam'

type SettingsTab = 'appearance' | 'reader' | 'sources' | 'backup' | 'about'

interface ReaderPreferences {
  fontSize: number
  lineHeight: number
  columnWidth: number
  paragraphStyle: 'indent' | 'spacing'
  align: 'left' | 'justify'
  theme: Theme
}

const defaultReaderPrefs: ReaderPreferences = {
  fontSize: 18,
  lineHeight: 1.65,
  columnWidth: 66,
  paragraphStyle: 'indent',
  align: 'left',
  theme: 'malam',
}

interface SettingsProps {
  theme: Theme
  onThemeChange: (t: Theme) => void
}

export default function Settings({ theme, onThemeChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(defaultReaderPrefs)
  const [backupStatus, setBackupStatus] = useState<'ready' | 'exporting' | 'importing' | 'success' | 'error'>('ready')
  const [backupMessage, setBackupMessage] = useState('')

  // Load reader preferences from Dexie
  useEffect(() => {
    async function loadPrefs() {
      try {
        const stored = await db.settings.get('reader.settings')
        if (stored?.value) {
          const parsed = JSON.parse(stored.value) as Partial<ReaderPreferences>
          setReaderPrefs((prev) => ({ ...prev, ...parsed }))
        }
      } catch {
        // use defaults
      }
    }
    void loadPrefs()
  }, [])

  async function updateReaderPref<K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) {
    const next = { ...readerPrefs, [key]: value }
    setReaderPrefs(next)
    await db.settings.put({ key: 'reader.settings', value: JSON.stringify(next) })
    if (key === 'theme') {
      onThemeChange(value as Theme)
    }
  }

  async function handleExportBackup() {
    setBackupStatus('exporting')
    setBackupMessage('')
    try {
      const blob = await exportBackup()
      const dateStr = new Date().toISOString().split('T')[0]
      const file = new File([blob], `aruvel-backup-${dateStr}.json`, { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setBackupStatus('success')
      setBackupMessage('Cadangan berhasil diekspor dan diunduh.')
    } catch {
      setBackupStatus('error')
      setBackupMessage('Gagal membuat berkas cadangan.')
    }
  }

  async function handleImportBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBackupStatus('importing')
    setBackupMessage('')
    try {
      await restoreBackup(file)
      setBackupStatus('success')
      setBackupMessage('Data pustaka dan riwayat berhasil dipulihkan!')
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setBackupStatus('error')
      setBackupMessage('Gagal memulihkan cadangan. Pastikan format berkas JSON valid.')
    }
  }

  const themes: Array<{ id: Theme; name: string; bg: string; text: string; hex: string }> = [
    { id: 'kertas', name: 'Kertas', bg: '#fbf8f1', text: '#28231d', hex: '#FBF8F1' },
    { id: 'sepia', name: 'Sepia', bg: '#efe4cb', text: '#3c2e1f', hex: '#EFE4CB' },
    { id: 'malam', name: 'Malam', bg: '#0b0c10', text: '#e7ecf2', hex: '#0B0C10' },
    { id: 'hitam', name: 'AMOLED', bg: '#000000', text: '#d1d5db', hex: '#000000' },
  ]

  const plugins = sourceRegistry.getAll()

  return (
    <div className="settings-page">
      <header className="settings-header">
        <p className="settings-eyebrow">Pengaturan Sistem</p>
        <h1 className="settings-title">Pengaturan</h1>
        <p className="settings-subtitle">Atur tipografi baca, tema tampilan, sumber novel, dan pencadangan.</p>
      </header>

      {/* Category Pills */}
      <nav className="settings-nav-scroll" aria-label="Kategori Pengaturan">
        <button
          type="button"
          className={`settings-nav-btn ${activeTab === 'reader' ? 'active' : ''}`}
          onClick={() => setActiveTab('reader')}
        >
          📖 Preferensi Pembaca
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          🎨 Tema & Tampilan
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          🧩 Sumber & Plugin
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          💾 Data & Cadangan
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ Tentang
        </button>
      </nav>

      {/* === Tab 1: Reader Preferences === */}
      {activeTab === 'reader' && (
        <section className="settings-section-card">
          <h2 className="settings-section-title">Tipografi & Tata Letak Baca</h2>
          <p className="settings-section-desc">
            Pengaturan ini akan diterapkan secara otomatis saat membaca bab novel dari plugin maupun EPUB.
          </p>

          <div className="settings-control-group">
            {/* Font Size */}
            <div className="settings-row">
              <div className="settings-row-label-wrap">
                <span className="settings-label">Ukuran Huruf (Font Size)</span>
                <span className="settings-value-badge">{readerPrefs.fontSize} px</span>
              </div>
              <input
                type="range"
                className="settings-slider"
                min="14"
                max="28"
                step="1"
                value={readerPrefs.fontSize}
                onChange={(e) => void updateReaderPref('fontSize', Number(e.target.value))}
              />
            </div>

            {/* Line Height */}
            <div className="settings-row">
              <div className="settings-row-label-wrap">
                <span className="settings-label">Jarak Antar Baris (Line Height)</span>
                <span className="settings-value-badge">{readerPrefs.lineHeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                className="settings-slider"
                min="1.4"
                max="2.2"
                step="0.05"
                value={readerPrefs.lineHeight}
                onChange={(e) => void updateReaderPref('lineHeight', Number(e.target.value))}
              />
            </div>

            {/* Column Width */}
            <div className="settings-row">
              <div className="settings-row-label-wrap">
                <span className="settings-label">Lebar Maksimal Teks (Column Width)</span>
                <span className="settings-value-badge">{readerPrefs.columnWidth} ch</span>
              </div>
              <input
                type="range"
                className="settings-slider"
                min="40"
                max="75"
                step="2"
                value={readerPrefs.columnWidth}
                onChange={(e) => void updateReaderPref('columnWidth', Number(e.target.value))}
              />
            </div>

            {/* Paragraph Format */}
            <div className="settings-row">
              <div className="settings-row-label-wrap">
                <span className="settings-label">Format Paragraf</span>
              </div>
              <div className="settings-button-group">
                <button
                  type="button"
                  className={`settings-pill-btn ${readerPrefs.paragraphStyle === 'indent' ? 'active' : ''}`}
                  onClick={() => void updateReaderPref('paragraphStyle', 'indent')}
                >
                  Indentasi Baris Pertama
                </button>
                <button
                  type="button"
                  className={`settings-pill-btn ${readerPrefs.paragraphStyle === 'spacing' ? 'active' : ''}`}
                  onClick={() => void updateReaderPref('paragraphStyle', 'spacing')}
                >
                  Jarak Antar Paragraf
                </button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="settings-row">
              <div className="settings-row-label-wrap">
                <span className="settings-label">Perataan Teks (Alignment)</span>
              </div>
              <div className="settings-button-group">
                <button
                  type="button"
                  className={`settings-pill-btn ${readerPrefs.align === 'left' ? 'active' : ''}`}
                  onClick={() => void updateReaderPref('align', 'left')}
                >
                  Rata Kiri
                </button>
                <button
                  type="button"
                  className={`settings-pill-btn ${readerPrefs.align === 'justify' ? 'active' : ''}`}
                  onClick={() => void updateReaderPref('align', 'justify')}
                >
                  Rata Kiri-Kanan (Justify)
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="reader-preview-box">
              <div className="preview-box-header">Pratinjau Langsung Tipografi Baca</div>
              <p
                className="preview-sample-text"
                style={{
                  fontSize: `${readerPrefs.fontSize}px`,
                  lineHeight: readerPrefs.lineHeight,
                  maxWidth: `${readerPrefs.columnWidth}ch`,
                  textAlign: readerPrefs.align,
                  textIndent: readerPrefs.paragraphStyle === 'indent' ? '1.5em' : '0',
                  marginBottom: readerPrefs.paragraphStyle === 'spacing' ? '1em' : '0.4em',
                }}
              >
                Hujan turun pelan di atas atap kota tua saat ia membalik halaman berikutnya. Huruf demi huruf mengalir tenang, memberikan ketenangan di tengah malam yang sunyi.
              </p>
              <p
                className="preview-sample-text"
                style={{
                  fontSize: `${readerPrefs.fontSize}px`,
                  lineHeight: readerPrefs.lineHeight,
                  maxWidth: `${readerPrefs.columnWidth}ch`,
                  textAlign: readerPrefs.align,
                  textIndent: readerPrefs.paragraphStyle === 'indent' ? '1.5em' : '0',
                }}
              >
                “Setiap cerita yang baik,” bisiknya perlahan, “adalah jendela menuju dunia lain yang menunggu untuk dijelajahi.”
              </p>
            </div>
          </div>
        </section>
      )}

      {/* === Tab 2: Appearance & Theme === */}
      {activeTab === 'appearance' && (
        <section className="settings-section-card">
          <h2 className="settings-section-title">Tema Aplikasi</h2>
          <p className="settings-section-desc">Pilih palet warna yang nyaman untuk mata saat membaca.</p>

          <div className="theme-options-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-card-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  onThemeChange(t.id)
                  void updateReaderPref('theme', t.id)
                }}
              >
                <div
                  className="theme-swatch"
                  style={{ backgroundColor: t.bg, color: t.text }}
                >
                  Aa
                </div>
                <span className="theme-name">{t.name}</span>
                {theme === t.id && <span className="theme-active-tag">✓ Aktif</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* === Tab 3: Sources & Extensions === */}
      {activeTab === 'sources' && (
        <section className="settings-section-card">
          <h2 className="settings-section-title">Sumber & Plugin Novel</h2>
          <p className="settings-section-desc">
            Daftar plugin bawaan yang aktif dan siap dibaca tanpa perlu instalasi tambahan.
          </p>

          <div className="settings-ext-list">
            {plugins.map((plugin) => (
              <div key={plugin.id} className="settings-ext-card">
                <div className="settings-ext-left">
                  <span className="settings-ext-icon">{plugin.icon || '📚'}</span>
                  <div className="settings-ext-info">
                    <span className="settings-ext-name">{plugin.name}</span>
                    <span className="settings-ext-meta">
                      {plugin.lang === 'id' ? 'Bahasa Indonesia' : 'English'} · v{plugin.version} · {plugin.site}
                    </span>
                  </div>
                </div>
                <span className="settings-ext-status">Aktif</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Tab 4: Backup & Data === */}
      {activeTab === 'backup' && (
        <section className="settings-section-card">
          <h2 className="settings-section-title">Pencadangan & Pemulihan</h2>
          <p className="settings-section-desc">
            Simpan pustaka, bookmark bab, dan riwayat bacaan ke berkas JSON lokal untuk dicadangkan atau dipindahkan ke perangkat lain.
          </p>

          <div className="backup-actions-row">
            <button
              type="button"
              className="settings-btn-primary"
              disabled={backupStatus === 'exporting'}
              onClick={() => void handleExportBackup()}
            >
              📤 {backupStatus === 'exporting' ? 'Mengekspor...' : 'Ekspor Cadangan (JSON)'}
            </button>

            <label className="settings-btn-secondary" style={{ cursor: 'pointer' }}>
              📥 Pulihkan Cadangan
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => void handleImportBackup(e)}
              />
            </label>
          </div>

          {backupMessage && (
            <div className={`backup-msg ${backupStatus === 'success' ? 'success' : 'error'}`}>
              {backupMessage}
            </div>
          )}
        </section>
      )}

      {/* === Tab 5: About === */}
      {activeTab === 'about' && (
        <section className="settings-section-card">
          <h2 className="settings-section-title">Aruvel</h2>
          <p className="settings-section-desc">
            Aplikasi pembaca web novel & EPUB mandiri dengan integrasi plugin sumber ala LNReader & Mihon.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
            <div><strong>Versi:</strong> 0.1.0 (Beta)</div>
            <div><strong>Dukungan Platform:</strong> Android (Capacitor) & Modern Web</div>
            <div><strong>Arsitektur:</strong> Dexie IndexedDB, Offline Cache, Plugin Scraper Engine</div>
            <div><strong>Desain:</strong> Terinspirasi oleh antarmuka Mihon & LNReader</div>
          </div>
        </section>
      )}
    </div>
  )
}