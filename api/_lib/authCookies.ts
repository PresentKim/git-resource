export type StoredSession = {
  at: string
  atExp: number | null
  rt: string | null
  rtExp: number | null
  login: string
  avatarUrl: string
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const name = part.slice(0, index).trim()
    if (!name || name in out) continue
    out[name] = part.slice(index + 1).trim()
  }
  return out
}

export function serializeCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  return `${name}=${value}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export function encodeSession(session: StoredSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64url')
}

function nullableNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function decodeSession(value: string | undefined): StoredSession | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const data: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    )
    if (typeof data !== 'object' || data === null) return null
    const o = data as Record<string, unknown>
    if (typeof o.at !== 'string' || typeof o.login !== 'string') return null
    const atExp = nullableNumber(o.atExp)
    const rtExp = nullableNumber(o.rtExp)
    if (atExp === undefined || rtExp === undefined) return null
    if (o.rt != null && typeof o.rt !== 'string') return null
    return {
      at: o.at,
      atExp,
      rt: typeof o.rt === 'string' ? o.rt : null,
      rtExp,
      login: o.login,
      avatarUrl: typeof o.avatarUrl === 'string' ? o.avatarUrl : '',
    }
  } catch {
    return null
  }
}

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.includes('\\')) return '/'
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return '/'
  }
  return value
}
