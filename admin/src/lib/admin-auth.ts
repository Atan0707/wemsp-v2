import { endpoint } from './config'

const TOKEN_KEY = 'admin_token'

export interface AdminSession {
  id: string
  email: string
  name: string
}

/**
 * Store the admin token in localStorage
 */
export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Get the admin token from localStorage
 */
export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Clear the admin token from localStorage
 */
export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Get auth headers with Authorization token
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken()
  return token
    ? { 'Authorization': `Bearer ${token}` }
    : {}
}

/**
 * Verify admin session by calling the API
 * This validates the admin token from localStorage
 */
export async function verifyAdminSession(): Promise<AdminSession | null> {
  try {
    const response = await fetch(`${endpoint}/api/admin/session`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.admin as AdminSession
  } catch {
    return null
  }
}

/**
 * Login admin user
 */
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean
  admin?: AdminSession
  error?: string
}> {
  try {
    const response = await fetch(`${endpoint}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' }
    }

    // Store the token from response
    if (data.token) {
      setAdminToken(data.token)
    }

    return { success: true, admin: data.admin as AdminSession }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Logout admin user
 */
export async function logoutAdmin(): Promise<void> {
  try {
    await fetch(`${endpoint}/api/admin/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
  } catch {
    // Ignore errors during logout
  }
  clearAdminToken()
}
