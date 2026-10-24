import { Capacitor, CapacitorHttp } from '@capacitor/core'

export async function requestHttp(url: string, options: { method?: string; headers?: Record<string, string>; timeout?: number } = {}): Promise<{ status: number; text: string }> {
  const method = options.method ?? 'GET'
  const timeout = options.timeout ?? 25_000

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url,
      method,
      headers: {
        'User-Agent': 'Aruvel/0.1 (Personal Novel Reader; Android)',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        ...options.headers,
      },
      connectTimeout: timeout,
      readTimeout: timeout,
      responseType: 'text',
    })
    return {
      status: res.status,
      text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
    }
  }

  // Browser development fallback
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      method,
      headers: options.headers,
      signal: controller.signal,
    })
    const text = await res.text()
    return { status: res.status, text }
  } finally {
    clearTimeout(timer)
  }
}

export async function requestJson<T>(url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<T> {
  const { status, text } = await requestHttp(url, options)
  if (status < 200 || status >= 300) {
    throw new Error(`Permintaan gagal dengan status HTTP ${status}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Respons bukan format JSON yang valid')
  }
}
