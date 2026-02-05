import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { verifyPassword, createAdminSessionToken } from '@/lib/admin-auth'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5051',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}

export const Route = createFileRoute('/api/admin/login/$')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: CORS_HEADERS })
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json()
          const { email, password } = body

          if (!email || !password) {
            return Response.json(
              { error: 'Email and password are required' },
              { status: 400, headers: CORS_HEADERS }
            )
          }

          // Find admin by email
          const admin = await prisma.admin.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              isActive: true,
            },
          })

          if (!admin) {
            return Response.json(
              { error: 'Invalid credentials' },
              { status: 401, headers: CORS_HEADERS }
            )
          }

          // Check if admin is active
          if (!admin.isActive) {
            return Response.json(
              { error: 'Account is inactive' },
              { status: 401, headers: CORS_HEADERS }
            )
          }

          // Verify password
          const isValidPassword = await verifyPassword(password, admin.password)
          if (!isValidPassword) {
            return Response.json(
              { error: 'Invalid credentials' },
              { status: 401, headers: CORS_HEADERS }
            )
          }

          // Create session token
          const sessionToken = await createAdminSessionToken({
            id: admin.id,
            email: admin.email,
            name: admin.name,
          })

          // Return token in response body for client-side storage
          return Response.json({
            success: true,
            token: sessionToken,
            admin: {
              id: admin.id,
              email: admin.email,
              name: admin.name,
            },
          }, { headers: CORS_HEADERS })
        } catch (error) {
          console.error('Admin login error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500, headers: CORS_HEADERS }
          )
        }
      },
    },
  },
})
