import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { prisma } from '@/db'

export const Route = createFileRoute('/api/user/profile/$')({
  server: {
    handlers: {
      PUT: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return Response.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        try {
          const body = await request.json()
          const { name, icNumber, phoneNumber, address } = body

          // Validate required fields
          if (!name || !icNumber || !phoneNumber || !address) {
            return Response.json(
              { error: 'Missing required fields' },
              { status: 400 }
            )
          }

          // Validate IC number is exactly 12 digits
          if (!/^\d{12}$/.test(icNumber)) {
            return Response.json(
              { error: 'IC number must be exactly 12 digits' },
              { status: 400 }
            )
          }

          // Check if IC number is already taken by another user
          const existingUser = await prisma.user.findFirst({
            where: {
              icNumber,
              id: { not: session.user.id },
            },
          })

          if (existingUser) {
            return Response.json(
              { error: 'IC number already exists' },
              { status: 409 }
            )
          }

          // Update user using Prisma
          const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
              name,
              icNumber,
              phoneNumber,
              address,
            },
          })

          return Response.json({
            success: true,
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              icNumber: updatedUser.icNumber,
              phoneNumber: updatedUser.phoneNumber,
              address: updatedUser.address,
              image: updatedUser.image,
            },
          })
        } catch (error) {
          console.error('Error updating profile:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
