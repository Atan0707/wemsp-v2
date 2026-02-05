import { corsHeaders } from '@/lib/cors'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/admin/logout/$')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders })
      },
      POST: async () => {
        return Response.json({
          success: true,
          message: 'Logged out successfully',
        }, { headers: corsHeaders })
      },
    },
  },
})
