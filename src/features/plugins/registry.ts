import type { SourcePlugin } from './types'

export class SourcePluginRegistry {
  private plugins: SourcePlugin[] = []

  register(plugin: SourcePlugin): void {
    this.plugins.push(plugin)
  }

  async get(pluginId: string): Promise<SourcePlugin> {
    const plugin = this.plugins.find((p) => p.id === pluginId)
    if (plugin) return plugin
    throw new Error(`Plugin sumber '${pluginId}' tidak ditemukan.`)
  }

  getAllPlugins(): SourcePlugin[] {
    return this.plugins
  }
}