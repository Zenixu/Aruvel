import { useEffect, useState, type FormEvent } from 'react'
import { sourceRegistry } from '../../core/plugins/registry'
import { extensionManager } from '../../core/plugins/manager'
import type { ExtensionItemInfo } from '../../core/plugins/catalog'
import type { NovelItem, SourcePlugin } from '../../core/plugins/types'
import './browse-view.css'

interface BrowseViewProps {
  onSelectNovel: (sourceId: string, novelPath: string) => void
}

type BrowseTab = 'sources' | 'extensions' | 'migration'
type ExtFilter = 'all' | 'id' | 'en' | 'nsfw' | 'installed'

export default function BrowseView({ onSelectNovel }: BrowseViewProps) {
  const [activeTab, setActiveTab] = useState<BrowseTab>('extensions') // Default to extensions to immediately show the Mihon view
  const [selectedSource, setSelectedSource] = useState<SourcePlugin | null>(null)
  const [novels, setNovels] = useState<NovelItem[]>([])
  const [loadingNovels, setLoadingNovels] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  // Extensions list state
  const [catalog, setCatalog] = useState<ExtensionItemInfo[]>(() => extensionManager.getAllCatalog())
  const [installedCount, setInstalledCount] = useState<number>(() => extensionManager.getInstalledPlugins().length)
  const [extSearch, setExtSearch] = useState('')
  const [extFilter, setExtFilter] = useState<ExtFilter>('all')
  const [installingId, setInstallingId] = useState<string | null>(null)

  // Modals & Menu
  const [showMenu, setShowMenu] = useState(false)
  const [showAddCustomModal, setShowAddCustomModal] = useState(false)
  const [showRepoModal, setShowRepoModal] = useState(false)
  const [globeUrl, setGlobeUrl] = useState<string | null>(null)

  // Custom source form state
  const [customName, setCustomName] = useState('')
  const [customSite, setCustomSite] = useState('')
  const [customLang, setCustomLang] = useState<'id' | 'en'>('id')
  const [customEngine, setCustomEngine] = useState<'madara' | 'novelfull' | 'custom'>('madara')
  const [customNsfw, setCustomNsfw] = useState(false)
  const [repoInputUrl, setRepoInputUrl] = useState('')

  const [pinnedSourceIds, setPinnedSourceIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('aruvel.pinned-sources')
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch { return [] }
  })
  const [lastUsedSourceId, setLastUsedSourceId] = useState<string | null>(() =>
    localStorage.getItem('aruvel.last-source')
  )

  // Subscribe to extensionManager changes
  useEffect(() => {
    const unsubscribe = extensionManager.subscribe(() => {
      setCatalog(extensionManager.getAllCatalog())
      setInstalledCount(extensionManager.getInstalledPlugins().length)
    })
    return unsubscribe
  }, [])

  const installedSources = sourceRegistry.getAll()
  const indonesianSources = installedSources.filter((s) => s.lang === 'id')
  const englishSources = installedSources.filter((s) => s.lang === 'en')
  const pinnedSources = installedSources.filter((s) => pinnedSourceIds.includes(s.id))
  const lastUsedSource = lastUsedSourceId ? installedSources.find((s) => s.id === lastUsedSourceId) : null

  // Novel list loader when browsing a specific source
  useEffect(() => {
    if (!selectedSource) return
    let active = true

    async function loadNovels() {
      setLoadingNovels(true)
      setError('')
      try {
        const results = await selectedSource!.popularNovels(1)
        if (active) setNovels(results)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat daftar novel.')
      } finally {
        if (active) setLoadingNovels(false)
      }
    }

    void loadNovels()
    return () => { active = false }
  }, [selectedSource])

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!selectedSource) return
    setLoadingNovels(true)
    setError('')
    try {
      const results = await selectedSource.searchNovels(searchQuery, 1)
      setNovels(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pencarian gagal.')
    } finally {
      setLoadingNovels(false)
    }
  }

  function handleSelectSource(source: SourcePlugin) {
    setSelectedSource(source)
    setLastUsedSourceId(source.id)
    localStorage.setItem('aruvel.last-source', source.id)
  }

  function togglePin(sourceId: string) {
    setPinnedSourceIds((prev) => {
      const next = prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
      localStorage.setItem('aruvel.pinned-sources', JSON.stringify(next))
      return next
    })
  }

  async function handleInstall(id: string) {
    setInstallingId(id)
    try {
      await new Promise(r => setTimeout(r, 450)) // Smooth install feedback
      await extensionManager.installExtension(id)
    } finally {
      setInstallingId(null)
    }
  }

  async function handleUninstall(id: string) {
    setInstallingId(id)
    try {
      await new Promise(r => setTimeout(r, 200))
      await extensionManager.uninstallExtension(id)
    } finally {
      setInstallingId(null)
    }
  }

  async function handleAddCustomSource(e: FormEvent) {
    e.preventDefault()
    if (!customName.trim() || !customSite.trim()) return

    const cleanSite = customSite.trim().startsWith('http')
      ? customSite.trim()
      : `https://${customSite.trim()}`

    const id = `custom_${customName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`

    await extensionManager.addCustomSource({
      id,
      name: customName.trim(),
      site: cleanSite,
      version: '1.0.0',
      lang: customLang,
      legal: 'user-risk',
      engine: customEngine,
      isNsfw: customNsfw,
      icon: customLang === 'id' ? '🇮🇩' : '🌐',
      description: `Sumber kustom ${cleanSite}`,
    })

    setCustomName('')
    setCustomSite('')
    setShowAddCustomModal(false)
  }

  function handleAddRepo(e: FormEvent) {
    e.preventDefault()
    if (repoInputUrl.trim()) {
      extensionManager.addRepository(repoInputUrl.trim())
      setRepoInputUrl('')
      setShowRepoModal(false)
    }
  }

  // Filter extensions list
  const filteredExtensions = catalog.filter((ext) => {
    const isInst = extensionManager.isInstalled(ext.id)
    if (extFilter === 'installed' && !isInst) return false
    if (extFilter === 'id' && ext.lang !== 'id') return false
    if (extFilter === 'en' && ext.lang !== 'en') return false
    if (extFilter === 'nsfw' && !ext.isNsfw) return false

    if (extSearch.trim()) {
      const q = extSearch.toLowerCase()
      return ext.name.toLowerCase().includes(q) || ext.site.toLowerCase().includes(q)
    }
    return true
  })

  // === Source Explorer (Novel List from Selected Source) ===
  if (selectedSource) {
    return (
      <main className="browse-container">
        <header className="source-explorer-header">
          <button
            type="button"
            className="back-btn-browse"
            onClick={() => { setSelectedSource(null); setSearchQuery(''); setNovels([]) }}
            aria-label="Kembali ke Daftar Sumber"
          >
            ←
          </button>
          <div className="source-explorer-title">
            <span className="source-explorer-name">{selectedSource.name}</span>
            <span className="source-explorer-lang">{selectedSource.lang === 'id' ? 'Indonesia' : 'English'}</span>
          </div>
          <button
            type="button"
            className="pin-toggle-btn"
            onClick={() => togglePin(selectedSource.id)}
            aria-label={pinnedSourceIds.includes(selectedSource.id) ? 'Lepas pin' : 'Sematkan'}
          >
            {pinnedSourceIds.includes(selectedSource.id) ? '📌' : '📍'}
          </button>
        </header>

        <div className="explorer-search-bar">
          <form className="explorer-search-form" onSubmit={(e) => void handleSearch(e)}>
            <div className="search-icon-wrap">🔍</div>
            <input
              type="search"
              className="explorer-search-input"
              placeholder={`Cari novel di ${selectedSource.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </form>
        </div>

        {loadingNovels && (
          <div className="browse-loading">
            <div className="loading-spinner" />
            <p>Memuat novel dari {selectedSource.name}...</p>
          </div>
        )}

        {error && (
          <div className="browse-error-card">
            <span className="error-icon">⚠</span>
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={() => { setSelectedSource(null); setTimeout(() => setSelectedSource(selectedSource), 50) }}>
              Coba Lagi
            </button>
          </div>
        )}

        {!loadingNovels && novels.length === 0 && !error && (
          <div className="browse-empty">
            <span className="empty-icon">📚</span>
            <p>Tidak ada novel yang ditemukan.</p>
          </div>
        )}

        <div className="novels-grid">
          {novels.map((novel) => (
            <button
              key={novel.path}
              type="button"
              className="novel-grid-card"
              onClick={() => onSelectNovel(selectedSource.id, novel.path)}
            >
              <div className="novel-grid-cover-wrap">
                {novel.cover ? (
                  <img
                    src={novel.cover}
                    alt={novel.name}
                    className="novel-grid-cover-img"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const parent = img.parentElement
                      if (parent && !parent.querySelector('.novel-cover-placeholder')) {
                        const ph = document.createElement('div')
                        ph.className = 'novel-cover-placeholder'
                        ph.innerHTML = `<span>${novel.name.slice(0, 2).toUpperCase()}</span>`
                        parent.appendChild(ph)
                      }
                    }}
                  />
                ) : (
                  <div className="novel-cover-placeholder">
                    <span>{novel.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <span className="novel-grid-title">{novel.name}</span>
              {novel.author && <span className="novel-grid-author">{novel.author}</span>}
            </button>
          ))}
        </div>
      </main>
    )
  }

  // === Main Mihon-Style Browse View ===
  return (
    <main className="browse-container">
      {/* Top App Bar */}
      <header className="mihon-top-header">
        <div className="mihon-top-row">
          <h1 className="mihon-title">Jelajahi</h1>
          <div className="mihon-actions">
            <button
              type="button"
              className="mihon-icon-btn"
              onClick={() => {
                const searchEl = document.getElementById('ext-search-input')
                searchEl?.focus()
              }}
              aria-label="Cari"
            >
              🔍
            </button>
            <div className="menu-anchor-wrap">
              <button
                type="button"
                className="mihon-icon-btn"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="Menu Opsi"
              >
                ⋮
              </button>
              {showMenu && (
                <div className="mihon-dropdown-menu">
                  <button
                    type="button"
                    className="menu-item-row"
                    onClick={() => { setShowMenu(false); setShowAddCustomModal(true) }}
                  >
                    <span>➕ Tambah Sumber Kustom</span>
                  </button>
                  <button
                    type="button"
                    className="menu-item-row"
                    onClick={() => { setShowMenu(false); setShowRepoModal(true) }}
                  >
                    <span>🌐 Repositori Ekstensi</span>
                  </button>
                  <button
                    type="button"
                    className="menu-item-row"
                    onClick={() => {
                      setShowMenu(false)
                      setExtFilter(extFilter === 'nsfw' ? 'all' : 'nsfw')
                    }}
                  >
                    <span>🔞 Filter 18+ ({extFilter === 'nsfw' ? 'Aktif' : 'Semua'})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mihon Tab Bar: Sumber | Ekstensi (N) | Migrasi */}
        <nav className="mihon-tabs-bar" aria-label="Tab Jelajahi">
          <button
            type="button"
            className={`mihon-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Sumber
          </button>
          <button
            type="button"
            className={`mihon-tab-btn ${activeTab === 'extensions' ? 'active' : ''}`}
            onClick={() => setActiveTab('extensions')}
          >
            Ekstensi <span className="mihon-badge-pill">{installedCount}</span>
          </button>
          <button
            type="button"
            className={`mihon-tab-btn ${activeTab === 'migration' ? 'active' : ''}`}
            onClick={() => setActiveTab('migration')}
          >
            Migrasi
          </button>
        </nav>
      </header>

      {/* ─── TAB 1: SUMBER (Installed Sources Only) ─── */}
      {activeTab === 'sources' && (
        <div className="sources-tab-content">
          {installedSources.length === 0 ? (
            <div className="empty-sources-banner">
              <span className="empty-icon">📦</span>
              <h3>Belum ada sumber yang terpasang</h3>
              <p>Buka tab <strong>Ekstensi</strong> untuk memasang sumber novel dari repositori.</p>
              <button
                type="button"
                className="goto-ext-btn"
                onClick={() => setActiveTab('extensions')}
              >
                Buka Tab Ekstensi
              </button>
            </div>
          ) : (
            <>
              {/* Last Used */}
              {lastUsedSource && (
                <section className="source-group-section">
                  <h2 className="source-group-title">Terakhir digunakan</h2>
                  <div className="source-items-list">
                    <SourceRow
                      source={lastUsedSource}
                      isPinned={pinnedSourceIds.includes(lastUsedSource.id)}
                      onSelect={() => handleSelectSource(lastUsedSource)}
                      onTogglePin={() => togglePin(lastUsedSource.id)}
                    />
                  </div>
                </section>
              )}

              {/* Pinned */}
              {pinnedSources.length > 0 && (
                <section className="source-group-section">
                  <h2 className="source-group-title">Tersemat</h2>
                  <div className="source-items-list">
                    {pinnedSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        isPinned
                        onSelect={() => handleSelectSource(source)}
                        onTogglePin={() => togglePin(source.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Indonesian Sources */}
              {indonesianSources.length > 0 && (
                <section className="source-group-section">
                  <h2 className="source-group-title">Indonesia</h2>
                  <div className="source-items-list">
                    {indonesianSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        isPinned={pinnedSourceIds.includes(source.id)}
                        onSelect={() => handleSelectSource(source)}
                        onTogglePin={() => togglePin(source.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* English Sources */}
              {englishSources.length > 0 && (
                <section className="source-group-section">
                  <h2 className="source-group-title">English</h2>
                  <div className="source-items-list">
                    {englishSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        isPinned={pinnedSourceIds.includes(source.id)}
                        onSelect={() => handleSelectSource(source)}
                        onTogglePin={() => togglePin(source.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: EKSTENSI (Exact Mihon Extensions View) ─── */}
      {activeTab === 'extensions' && (
        <div className="extensions-tab-content">
          {/* Search bar inside Extensions */}
          <div className="ext-search-row">
            <span className="ext-search-icon">🔍</span>
            <input
              id="ext-search-input"
              type="search"
              className="ext-search-input"
              placeholder="Cari ekstensi novel..."
              value={extSearch}
              onChange={(e) => setExtSearch(e.target.value)}
            />
            {extSearch && (
              <button
                type="button"
                className="ext-search-clear"
                onClick={() => setExtSearch('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="ext-filter-chips">
            <button
              type="button"
              className={`filter-chip ${extFilter === 'all' ? 'active' : ''}`}
              onClick={() => setExtFilter('all')}
            >
              Semua ({catalog.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${extFilter === 'installed' ? 'active' : ''}`}
              onClick={() => setExtFilter('installed')}
            >
              Terpasang ({installedCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${extFilter === 'id' ? 'active' : ''}`}
              onClick={() => setExtFilter('id')}
            >
              🇮🇩 Indonesia
            </button>
            <button
              type="button"
              className={`filter-chip ${extFilter === 'en' ? 'active' : ''}`}
              onClick={() => setExtFilter('en')}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              className={`filter-chip ${extFilter === 'nsfw' ? 'active' : ''}`}
              onClick={() => setExtFilter('nsfw')}
            >
              🔞 18+
            </button>
          </div>

          {/* Extension Items List - Mihon Style */}
          <div className="mihon-ext-list">
            {filteredExtensions.map((ext) => {
              const isInstalled = extensionManager.isInstalled(ext.id)
              const isBusy = installingId === ext.id

              return (
                <div key={ext.id} className="mihon-ext-item">
                  {/* Left: Avatar / Logo */}
                  <div className="mihon-ext-icon-wrap">
                    {ext.iconUrl ? (
                      <img src={ext.iconUrl} alt={ext.name} className="mihon-ext-img" />
                    ) : (
                      <span className="mihon-ext-emoji">{ext.icon || '📖'}</span>
                    )}
                  </div>

                  {/* Center: Title & Version / 18+ meta */}
                  <div className="mihon-ext-info">
                    <span className="mihon-ext-name">{ext.name}</span>
                    <div className="mihon-ext-meta-line">
                      <span className="mihon-ext-ver">{ext.version}</span>
                      {ext.isNsfw && <span className="mihon-nsfw-tag">18+</span>}
                      <span className="mihon-lang-tag">
                        {ext.lang === 'id' ? 'ID' : 'EN'}
                      </span>
                      {ext.engine === 'madara' && <span className="mihon-engine-tag">Madara</span>}
                    </div>
                  </div>

                  {/* Right Actions: Globe & Download / Trash */}
                  <div className="mihon-ext-actions">
                    {/* Globe Icon */}
                    <button
                      type="button"
                      className="mihon-globe-btn"
                      onClick={() => setGlobeUrl(ext.site)}
                      title={`Buka situs ${ext.name}`}
                      aria-label={`Buka ${ext.name}`}
                    >
                      🌐
                    </button>

                    {/* Install / Uninstall Button */}
                    {isInstalled ? (
                      <button
                        type="button"
                        className="mihon-installed-btn"
                        onClick={() => void handleUninstall(ext.id)}
                        disabled={isBusy}
                        title="Terpasang (Klik untuk copot pemasangan)"
                        aria-label="Copot pemasangan"
                      >
                        {isBusy ? '...' : '🗑️'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mihon-download-btn"
                        onClick={() => void handleInstall(ext.id)}
                        disabled={isBusy}
                        title="Pasang ekstensi"
                        aria-label="Pasang ekstensi"
                      >
                        {isBusy ? (
                          <span className="mihon-mini-spinner" />
                        ) : (
                          <svg className="download-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Add Custom Source Banner */}
          <div className="custom-source-cta">
            <div className="cta-left">
              <span className="cta-icon">✨</span>
              <div className="cta-text">
                <strong>Punya sumber novel sendiri?</strong>
                <p>Tambah situs web novel apa saja dengan mesin scrapper otomatis.</p>
              </div>
            </div>
            <button
              type="button"
              className="cta-add-btn"
              onClick={() => setShowAddCustomModal(true)}
            >
              + Tambah Sumber
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MIGRASI ─── */}
      {activeTab === 'migration' && (
        <div className="migration-tab-content">
          <div className="migration-hero-card">
            <span className="mig-icon">🔄</span>
            <h2>Migrasi Sumber Novel</h2>
            <p>
              Pindah dari satu sumber ke sumber lain untuk novel yang sama saat sumber utama lambat atau bermasalah.
            </p>
          </div>

          <div className="migration-source-list">
            <h3 className="source-group-title">Pilih Sumber Asal</h3>
            {installedSources.map((s) => (
              <div key={s.id} className="source-card-item" onClick={() => handleSelectSource(s)}>
                <div className="source-card-left">
                  <span className="source-icon-badge">{s.icon || '📚'}</span>
                  <div className="source-info-text">
                    <span className="source-name">{s.name}</span>
                    <span className="source-meta-sub">{s.lang === 'id' ? 'Indonesia' : 'English'}</span>
                  </div>
                </div>
                <div className="source-card-right">
                  <span className="source-latest-label">Pilih →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: Tambah Sumber Kustom ─── */}
      {showAddCustomModal && (
        <div className="mihon-modal-backdrop" onClick={() => setShowAddCustomModal(false)}>
          <div className="mihon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Sumber Kustom</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddCustomModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => void handleAddCustomSource(e)} className="modal-form">
              <label className="form-label">
                Nama Sumber / Web Novel
                <input
                  type="text"
                  required
                  placeholder="Contoh: BacaNovelKeren"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="form-label">
                URL Situs (Base URL)
                <input
                  type="url"
                  required
                  placeholder="https://bacanovelkeren.com"
                  value={customSite}
                  onChange={(e) => setCustomSite(e.target.value)}
                  className="modal-input"
                />
              </label>

              <div className="form-row-half">
                <label className="form-label">
                  Bahasa
                  <select
                    value={customLang}
                    onChange={(e) => setCustomLang(e.target.value as 'id' | 'en')}
                    className="modal-select"
                  >
                    <option value="id">Indonesia (ID)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </label>

                <label className="form-label">
                  Tipe Mesin Parser
                  <select
                    value={customEngine}
                    onChange={(e) => setCustomEngine(e.target.value as 'madara' | 'novelfull' | 'custom')}
                    className="modal-select"
                  >
                    <option value="madara">Madara (WP Manga)</option>
                    <option value="novelfull">NovelFull Engine</option>
                    <option value="custom">Generic HTML</option>
                  </select>
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={customNsfw}
                  onChange={(e) => setCustomNsfw(e.target.checked)}
                />
                <span>Tandai konten 18+ (Dewasa)</span>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setShowAddCustomModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="modal-btn-submit">
                  Simpan & Pasang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Repositori Ekstensi ─── */}
      {showRepoModal && (
        <div className="mihon-modal-backdrop" onClick={() => setShowRepoModal(false)}>
          <div className="mihon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Repositori Ekstensi</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowRepoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content-repo">
              <p className="repo-intro">
                Tambahkan URL repositori ekstensi eksternal (JSON manifest) seperti repositori ekstensi Mihon/LNReader.
              </p>

              <form onSubmit={handleAddRepo} className="repo-form">
                <input
                  type="url"
                  placeholder="https://example.com/index.min.json"
                  value={repoInputUrl}
                  onChange={(e) => setRepoInputUrl(e.target.value)}
                  className="modal-input"
                  required
                />
                <button type="submit" className="modal-btn-submit">
                  + Tambah Repo
                </button>
              </form>

              <div className="repo-list-wrap">
                <h4>Repositori Terdaftar</h4>
                <div className="repo-item-row default-repo">
                  <div className="repo-info">
                    <strong>Aruvel Official Novel Repo</strong>
                    <span>Katalog 24+ sumber bawaan aktif</span>
                  </div>
                  <span className="repo-status-badge">Bawaan</span>
                </div>
                {extensionManager.getRepositories().map((url) => (
                  <div key={url} className="repo-item-row">
                    <div className="repo-info">
                      <strong className="repo-url-text">{url}</strong>
                    </div>
                    <button
                      type="button"
                      className="repo-del-btn"
                      onClick={() => extensionManager.removeRepository(url)}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Globe Site Preview ─── */}
      {globeUrl && (
        <div className="mihon-modal-backdrop" onClick={() => setGlobeUrl(null)}>
          <div className="mihon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kunjungi Sumber</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setGlobeUrl(null)}
              >
                ✕
              </button>
            </div>
            <div className="globe-preview-content">
              <p>Membuka alamat situs eksternal:</p>
              <code className="globe-url-code">{globeUrl}</code>
              <div className="globe-actions">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setGlobeUrl(null)}
                >
                  Tutup
                </button>
                <a
                  href={globeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-btn-submit modal-link-btn"
                >
                  Buka di Peramban Web ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// === Source Row Component ===
function SourceRow({
  source,
  isPinned,
  onSelect,
  onTogglePin,
}: {
  source: SourcePlugin
  isPinned: boolean
  onSelect: () => void
  onTogglePin: () => void
}) {
  return (
    <div className="source-card-item" onClick={onSelect}>
      <div className="source-card-left">
        <span className="source-icon-badge">{source.icon || '📚'}</span>
        <div className="source-info-text">
          <span className="source-name">{source.name}</span>
          <span className="source-meta-sub">
            {source.lang === 'id' ? 'Indonesia' : 'English'}
          </span>
        </div>
      </div>
      <div className="source-card-right">
        <span className="source-latest-label">Terbaru</span>
        <button
          type="button"
          className={`pin-btn ${isPinned ? 'pinned' : ''}`}
          onClick={(e) => { e.stopPropagation(); onTogglePin() }}
          aria-label={isPinned ? 'Lepas pin' : 'Sematkan'}
        >
          📌
        </button>
      </div>
    </div>
  )
}
