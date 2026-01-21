import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/admin/logout/$')({
  server: {
    handlers: {
      POST: async () => {
        const response = Response.json({
          success: true,
          message: 'Logged out successfully',
        })

        // Clear the session cookie by setting it with an expired date
        response.headers.set(
          'Set-Cookie',
          'admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
        )

        return response
      },
    },
  },
})
