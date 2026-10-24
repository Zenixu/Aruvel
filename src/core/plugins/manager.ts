import { EXTENSION_CATALOG, type ExtensionItemInfo } from './catalog'
import { GenericNovelPlugin, type SourceDefinition } from './generic'
import { GutenbergPlugin } from './gutenberg'
import { IndoWebNovelPlugin } from './indowebnovel'
import { NovelFullPlugin } from './novelfull'
import { RoyalRoadPlugin } from './royalroad'
import { WikisourcePlugin } from './wikisource'
import type { SourcePlugin } from './types'

const STORAGE_KEY_INSTALLED = 'aruvel.installed-extensions'
const STORAGE_KEY_CUSTOM_SOURCES = 'aruvel.custom-sources'
const STORAGE_KEY_REPOSITORIES = 'aruvel.extension-repos'

const DEFAULT_INSTALLED = ['wikisource', 'indowebnovel', 'novelfull', 'royalroad', 'gutenberg']

type Listener = () => void

class ExtensionManager {
  private installedIds: Set<string>
  private customSources: Map<string, SourceDefinition>
  private repoUrls: Set<string>
  private listeners: Set<Listener> = new Set()
  private pluginCache: Map<string, SourcePlugin> = new Map()

  constructor() {
    this.installedIds = this.loadInstalledIds()
    this.customSources = this.loadCustomSources()
    this.repoUrls = this.loadRepositories()
    this.initBuiltinPlugins()
  }

  private initBuiltinPlugins() {
    // Register specialized plugins
    const builtins: SourcePlugin[] = [
      new WikisourcePlugin(),
      new IndoWebNovelPlugin(),
      new NovelFullPlugin(),
      new RoyalRoadPlugin(),
      new GutenbergPlugin(),
    ]
    for (const b of builtins) {
      this.pluginCache.set(b.id, b)
    }
  }

  private loadInstalledIds(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INSTALLED)
      if (stored) {
        const arr = JSON.parse(stored) as string[]
        if (Array.isArray(arr) && arr.length > 0) {
          return new Set(arr)
        }
      }
    } catch {
      // ignore
    }
    return new Set(DEFAULT_INSTALLED)
  }

  private saveInstalledIds() {
    localStorage.setItem(STORAGE_KEY_INSTALLED, JSON.stringify(Array.from(this.installedIds)))
  }

  private loadCustomSources(): Map<string, SourceDefinition> {
    const map = new Map<string, SourceDefinition>()
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_SOURCES)
      if (stored) {
        const arr = JSON.parse(stored) as SourceDefinition[]
        for (const item of arr) {
          map.set(item.id, item)
        }
      }
    } catch {
      // ignore
    }
    return map
  }

  private saveCustomSources() {
    localStorage.setItem(
      STORAGE_KEY_CUSTOM_SOURCES,
      JSON.stringify(Array.from(this.customSources.values()))
    )
  }

  private loadRepositories(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPOSITORIES)
      if (stored) {
        const arr = JSON.parse(stored) as string[]
        return new Set(arr)
      }
    } catch {
      // ignore
    }
    return new Set<string>()
  }

  private saveRepositories() {
    localStorage.setItem(STORAGE_KEY_REPOSITORIES, JSON.stringify(Array.from(this.repoUrls)))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => {
      try { l() } catch (err) { console.error(err) }
    })
  }

  // ─── Querying ───

  isInstalled(id: string): boolean {
    return this.installedIds.has(id)
  }

  getAllCatalog(): ExtensionItemInfo[] {
    const customItems: ExtensionItemInfo[] = Array.from(this.customSources.values()).map((c) => ({
      ...c,
      isBuiltin: false,
    }))
    return [...EXTENSION_CATALOG, ...customItems]
  }

  getInstalledPlugins(): SourcePlugin[] {
    const list: SourcePlugin[] = []
    for (const id of this.installedIds) {
      const plugin = this.getPlugin(id)
      if (plugin) list.push(plugin)
    }
    return list
  }

  getPlugin(id: string): SourcePlugin | undefined {
    if (this.pluginCache.has(id)) {
      return this.pluginCache.get(id)
    }

    // Check custom sources
    if (this.customSources.has(id)) {
      const def = this.customSources.get(id)!
      const p = new GenericNovelPlugin(def)
      this.pluginCache.set(id, p)
      return p
    }

    // Check catalog
    const catalogItem = EXTENSION_CATALOG.find((c) => c.id === id)
    if (catalogItem) {
      const p = new GenericNovelPlugin(catalogItem)
      this.pluginCache.set(id, p)
      return p
    }

    return undefined
  }

  // ─── Actions ───

  async installExtension(id: string): Promise<void> {
    this.installedIds.add(id)
    this.saveInstalledIds()
    this.notify()
  }

  async uninstallExtension(id: string): Promise<void> {
    this.installedIds.delete(id)
    this.saveInstalledIds()
    this.notify()
  }

  async addCustomSource(def: SourceDefinition): Promise<void> {
    this.customSources.set(def.id, def)
    this.saveCustomSources()
    // Auto install when user manually adds custom source
    this.installedIds.add(def.id)
    this.saveInstalledIds()
    this.pluginCache.set(def.id, new GenericNovelPlugin(def))
    this.notify()
  }

  async removeCustomSource(id: string): Promise<void> {
    this.customSources.delete(id)
    this.saveCustomSources()
    this.installedIds.delete(id)
    this.saveInstalledIds()
    this.pluginCache.delete(id)
    this.notify()
  }

  getRepositories(): string[] {
    return Array.from(this.repoUrls)
  }

  addRepository(url: string): void {
    if (url.trim()) {
      this.repoUrls.add(url.trim())
      this.saveRepositories()
      this.notify()
    }
  }

  removeRepository(url: string): void {
    this.repoUrls.delete(url)
    this.saveRepositories()
    this.notify()
  }
}

export const extensionManager = new ExtensionManager()
