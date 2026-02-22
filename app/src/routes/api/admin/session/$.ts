import { createFileRoute } from '@tanstack/react-router'
import { verifyAdminSessionToken } from '@/lib/admin-auth'
import { corsHeaders } from '@/lib/cors'

export const adminSessionHandlers = {
  OPTIONS: async () => {
    return new Response(null, { headers: corsHeaders })
  },
  GET: async ({ request }: { request: Request }) => {
        // Check Authorization header
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json(
            { admin: null },
            { status: 401, headers: corsHeaders }
          )
        }

        const token = authHeader.substring(7)
        const adminSession = await verifyAdminSessionToken(token)

        if (!adminSession) {
          return Response.json(
            { admin: null },
            { status: 401, headers: corsHeaders }
          )
        }

        return Response.json({
          admin: {
            id: adminSession.adminId,
            email: adminSession.email,
            name: adminSession.name,
          },
        }, { headers: corsHeaders })
  },
}

export const Route = createFileRoute('/api/admin/session/$')({
  server: {
    handlers: adminSessionHandlers,
  },
})
