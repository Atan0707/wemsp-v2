import { endpoint } from './config'

export interface AdminSession {
  id: string
  email: string
  name: string
}

/**
 * Verify admin session by calling the API
 * This validates the admin_session cookie on the server
 */
export async function verifyAdminSession(): Promise<AdminSession | null> {
  try {
    const response = await fetch(`${endpoint}/api/admin/session`, {
      method: 'GET',
      credentials: 'include',
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
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' }
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
      credentials: 'include',
    })
  } catch {
    // Ignore errors during logout
  }
}
