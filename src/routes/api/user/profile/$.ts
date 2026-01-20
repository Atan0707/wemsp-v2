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

          // Get the current user's IC number
          const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { icNumber: true },
          })

          // Check if IC number is already taken (in IcRegistry - covers both User and NonRegisteredFamilyMember)
          if (icNumber !== currentUser?.icNumber) {
            const existingIc = await prisma.icRegistry.findUnique({
              where: { icNumber },
            })

            if (existingIc) {
              return Response.json(
                { error: 'IC number already exists' },
                { status: 409 }
              )
            }
          }

          // Update user using Prisma with transaction to handle IcRegistry
          const updatedUser = await prisma.$transaction(async (tx) => {
            // If user had a previous IC number, delete it from registry
            if (currentUser?.icNumber && currentUser.icNumber !== icNumber) {
              await tx.icRegistry.delete({
                where: { icNumber: currentUser.icNumber },
              }).catch(() => {
                // Ignore if it doesn't exist (for legacy data)
              })
            }

            // Create new IC registry entry if it doesn't exist
            if (icNumber !== currentUser?.icNumber) {
              await tx.icRegistry.upsert({
                where: { icNumber },
                create: { icNumber },
                update: {},
              })
            }

            // Update the user
            return tx.user.update({
              where: { id: session.user.id },
              data: {
                name,
                icNumber,
                phoneNumber,
                address,
              },
            })
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
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        return Response.json({ user: session.user })
        try {
          return Response.json({ user: session?.user })
        } catch (error) {
          console.error('Error fetching profile:', error)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  },
})
