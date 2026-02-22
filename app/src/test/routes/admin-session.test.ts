import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyAdminSessionToken: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminSessionToken: mocks.verifyAdminSessionToken,
}))

import { adminSessionHandlers } from '@/routes/api/admin/session/$'

describe('adminSessionHandlers.GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const request = new Request('http://localhost/api/admin/session', {
      method: 'GET',
    })

    const response = await adminSessionHandlers.GET({ request })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.admin).toBeNull()
  })

  it('returns 401 when token is invalid', async () => {
    mocks.verifyAdminSessionToken.mockResolvedValueOnce(null)

    const request = new Request('http://localhost/api/admin/session', {
      method: 'GET',
      headers: { Authorization: 'Bearer bad-token' },
    })

    const response = await adminSessionHandlers.GET({ request })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.admin).toBeNull()
  })

  it('returns 200 with admin details when token is valid', async () => {
    mocks.verifyAdminSessionToken.mockResolvedValueOnce({
      adminId: 'a1',
      email: 'admin@test.com',
      name: 'Admin',
    })

    const request = new Request('http://localhost/api/admin/session', {
      method: 'GET',
      headers: { Authorization: 'Bearer good-token' },
    })

    const response = await adminSessionHandlers.GET({ request })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.admin).toEqual({
      id: 'a1',
      email: 'admin@test.com',
      name: 'Admin',
    })
  })

  it('OPTIONS returns CORS headers', async () => {
    const response = await adminSessionHandlers.OPTIONS()

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5051')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
