import { Capacitor, CapacitorHttp } from '@capacitor/core'

export async function getJson<T>(url: string, maximumBytes = 2_000_000): Promise<T> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'raw.githubusercontent.com') {
    throw new Error('Alamat katalog tidak diizinkan.')
  }
  const response = Capacitor.isNativePlatform()
    ? await CapacitorHttp.get({ url, responseType: 'text', connectTimeout: 15_000, readTimeout: 15_000 })
    : await fetch(url, { signal: AbortSignal.timeout(15_000) }).then(async (result) => ({ status: result.status, data: await result.text() }))
  if (response.status < 200 || response.status >= 300) throw new Error(`Katalog gagal diambil (HTTP ${response.status}).`)
  const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) throw new Error('Ukuran katalog melebihi batas aman.')
  try { return JSON.parse(raw) as T } catch { throw new Error('Format katalog bukan JSON yang valid.') }
}
