import { useState } from 'react'
import { checkCatalogEntry, loadCatalog, type CatalogEntry, type SourceCheck } from './catalog'

export default function PluginCatalog() {
  const [entries, setEntries] = useState<CatalogEntry[]>()
  const [language, setLanguage] = useState<'all' | CatalogEntry['lang']>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checks, setChecks] = useState<Record<string, SourceCheck>>({})
  const [checking, setChecking] = useState<Record<string, boolean>>({})

  async function verify(entry: CatalogEntry) {
    setChecking((current) => ({ ...current, [entry.id]: true }))
    try {
      const result = await checkCatalogEntry(entry)
      setChecks((current) => ({ ...current, [entry.id]: result }))
    } catch {
      setChecks((current) => ({ ...current, [entry.id]: { checkedAt: Date.now() } }))
    } finally {
      setChecking((current) => ({ ...current, [entry.id]: false }))
    }
  }

  function checkLabel(check?: SourceCheck) {
    if (!check) return 'Belum dicek'
    const site = check.siteStatus === undefined ? 'Situs: gagal diakses' : `Situs: HTTP ${check.siteStatus}`
    const plugin = check.pluginStatus === undefined ? 'File plugin: gagal diakses' : `File plugin: HTTP ${check.pluginStatus}`
    return `${site} · ${plugin}`
  }

  async function refresh() {
    setLoading(true)
    setError('')
    try { setEntries(await loadCatalog()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Katalog tidak dapat dimuat.') }
    finally { setLoading(false) }
  }

  const shown = (entries ?? []).filter((entry) => language === 'all' || entry.lang === language)
  return (
    <section className="plugin-catalog" aria-labelledby="plugin-title">
      <div className="plugin-heading">
        <div><p className="eyebrow">SUMBER BACAAN</p><h2 id="plugin-title">Katalog sumber ID &amp; EN</h2></div>
        <button type="button" onClick={refresh} disabled={loading}>{loading ? 'Memuat…' : entries ? 'Perbarui' : 'Muat katalog'}</button>
      </div>
      <p className="plugin-note">Daftar dari LNReader. Katalog saja—kode plugin tidak dijalankan. Periksa izin sumber sebelum memakai konten.</p>
      {error && <p role="alert">{error}</p>}
      {entries && <>
        <div className="plugin-filters" aria-label="Filter bahasa">
          {(['all', 'Bahasa Indonesia', 'English'] as const).map((value) => <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>{value === 'all' ? 'Semua' : value}</button>)}
        </div>
        <p className="plugin-count">{shown.length} sumber tercantum. Pemeriksaan ini hanya menguji URL; bukan uji fungsi plugin atau izin konten.</p>
        <ul className="plugin-list">{shown.map((entry) => <li key={entry.id}><div><strong>{entry.name}</strong><span>{entry.lang} · {entry.site}</span><span className="plugin-check" role="status">{checkLabel(checks[entry.id])}{checks[entry.id] && ` · ${new Date(checks[entry.id].checkedAt).toLocaleString()}`}</span><a href={entry.site} target="_blank" rel="noreferrer">Buka situs</a></div><button type="button" disabled={checking[entry.id]} onClick={() => void verify(entry)}>{checking[entry.id] ? 'Memeriksa…' : checks[entry.id] ? 'Cek ulang' : 'Cek akses'}</button></li>)}</ul>
      </>}
    </section>
  )
}
