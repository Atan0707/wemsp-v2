import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({
  prisma: {
    admin: {
      findUnique: vi.fn(),
    },
  },
}))

let getSessionTokenFromHeaders: (headers: Headers) => string | null

beforeAll(async () => {
  const mod = await import('@/lib/admin-auth')
  getSessionTokenFromHeaders = mod.getSessionTokenFromHeaders
})

describe('getSessionTokenFromHeaders', () => {
  it('prefers Authorization Bearer token', () => {
    const headers = new Headers({
      authorization: 'Bearer token-from-header',
      cookie: 'admin_session=token-from-cookie',
    })

    expect(getSessionTokenFromHeaders(headers)).toBe('token-from-header')
  })

  it('falls back to admin_session cookie', () => {
    const headers = new Headers({
      cookie: 'foo=bar; admin_session=token-from-cookie; hello=world',
    })

    expect(getSessionTokenFromHeaders(headers)).toBe('token-from-cookie')
  })

  it('returns null when neither auth header nor cookie is present', () => {
    const headers = new Headers()

    expect(getSessionTokenFromHeaders(headers)).toBeNull()
  })
})
