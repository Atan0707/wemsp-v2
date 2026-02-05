import { createMiddleware } from '@tanstack/react-start'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { verifyAdminSession, AdminSession } from './lib/admin-auth'

/**
 * Admin authentication middleware for server-side route protection.
 * Checks if the admin has a valid session before allowing access.
 *
 * Usage with server functions:
 * ```ts
 * const protectedAdminFn = createServerFn({ method: 'GET' })
 *   .middleware([adminAuthMiddleware])
 *   .handler(async ({ context }) => {
 *     // context.admin is available here
 *     return { admin: context.admin }
 *   })
 * ```
 */
export const adminAuthMiddleware = createMiddleware().server(async ({ next, request }) => {
  const admin = await verifyAdminSession()

  if (!admin) {
    // Return a redirect response to the login page
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login',
      },
    })
  }

  // Pass the admin data to the next handler via context
  return next({
    context: {
      admin,
    },
  })
})

/**
 * Server function to get the current admin session.
 * Can be used in loaders or beforeLoad hooks for server-side admin auth checks.
 * Uses getRequest() to properly access cookies/headers from the incoming request.
 */
export const getAdminSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) {
      return null
    }
    return await verifyAdminSession()
  }
)

/**
 * Server function to check if admin is authenticated.
 * Use this in route loaders or beforeLoad hooks.
 * Returns authentication status.
 */
export const requireAdminAuth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) {
      return null
    }

    const admin = await verifyAdminSession()

    if (!admin) {
      return { requiresAuth: true }
    }

    return {
      requiresAuth: false,
      admin,
    }
  }
)

/**
 * Server function to redirect authenticated admins away from login page.
 * Use this on the login route to redirect logged-in admins to dashboard.
 * Can be used in beforeLoad hooks.
 */
export const redirectIfAuthenticated = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) {
      return { admin: null }
    }

    const admin = await verifyAdminSession()

    return { admin }
  }
)
