import { createMiddleware } from '@tanstack/react-start'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

/**
 * Authentication middleware for server-side route protection.
 * Checks if the user has a valid session before allowing access.
 * 
 * Usage with server functions:
 * ```ts
 * const protectedServerFn = createServerFn({ method: 'GET' })
 *   .middleware([authMiddleware])
 *   .handler(async ({ context }) => {
 *     // context.session is available here
 *     return { user: context.session.user }
 *   })
 * ```
 */
export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    // Return a redirect response to the home/login page
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
      },
    })
  }

  // Pass the session to the next handler via context
  return next({
    context: {
      session,
    },
  })
})

/**
 * Server function to get the current session.
 * Can be used in loaders or beforeLoad hooks for server-side auth checks.
 * Uses getWebRequest() to properly access cookies/headers from the incoming request.
 */
export const getServerSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) {
      return null
    }
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    return session
  }
)
