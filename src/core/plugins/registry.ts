import { extensionManager } from './manager'
import type { SourcePlugin } from './types'

export const sourceRegistry = {
  getAll(): SourcePlugin[] {
    return extensionManager.getInstalledPlugins()
  },

  get(id: string): SourcePlugin | undefined {
    return extensionManager.getPlugin(id)
  },

  register(_plugin: SourcePlugin): void {
    // Kept for backward compatibility
  },
}
