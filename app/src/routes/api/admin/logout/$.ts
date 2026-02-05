import { createFileRoute } from '@tanstack/react-router'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5051',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export const Route = createFileRoute('/api/admin/logout/$')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: CORS_HEADERS })
      },
      POST: async () => {
        return Response.json({
          success: true,
          message: 'Logged out successfully',
        }, { headers: CORS_HEADERS })
      },
    },
  },
})
