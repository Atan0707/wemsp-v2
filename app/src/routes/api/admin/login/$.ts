import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { verifyPassword, createAdminSessionToken } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/admin/login/$')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json()
          const { email, password } = body

          if (!email || !password) {
            return Response.json(
              { error: 'Email and password are required' },
              { status: 400 }
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
              { status: 401 }
            )
          }

          // Check if admin is active
          if (!admin.isActive) {
            return Response.json(
              { error: 'Account is inactive' },
              { status: 401 }
            )
          }

          // Verify password
          const isValidPassword = await verifyPassword(password, admin.password)
          if (!isValidPassword) {
            return Response.json(
              { error: 'Invalid credentials' },
              { status: 401 }
            )
          }

          // Create session token
          const sessionToken = await createAdminSessionToken({
            id: admin.id,
            email: admin.email,
            name: admin.name,
          })

          // Create response with session cookie
          const response = Response.json({
            success: true,
            admin: {
              id: admin.id,
              email: admin.email,
              name: admin.name,
            },
          })

          // Set HTTP-only cookie
          response.headers.set(
            'Set-Cookie',
            `admin_session=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}` // 24 hours
          )

          return response
        } catch (error) {
          console.error('Admin login error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
