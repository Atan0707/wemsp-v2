import { createFileRoute } from '@tanstack/react-router'
import { getAdminFromSession } from '@/lib/admin-auth'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5051',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}

export const Route = createFileRoute('/api/admin/session/$')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: CORS_HEADERS })
      },
      GET: async ({ request }: { request: Request }) => {
        const adminSession = await getAdminFromSession(request.headers)

        if (!adminSession) {
          return Response.json(
            { admin: null },
            { status: 401, headers: CORS_HEADERS }
          )
        }

        return Response.json({
          admin: {
            id: adminSession.adminId,
            email: adminSession.email,
            name: adminSession.name,
          },
        }, { headers: CORS_HEADERS })
      },
    },
  },
})
