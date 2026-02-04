import { createFileRoute } from '@tanstack/react-router'
import { getAdminFromSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/admin/session/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const adminSession = await getAdminFromSession(request.headers)

        if (!adminSession) {
          return Response.json(
            { admin: null },
            { status: 401 }
          )
        }

        return Response.json({
          admin: {
            id: adminSession.adminId,
            email: adminSession.email,
            name: adminSession.name,
          },
        })
      },
    },
  },
})
