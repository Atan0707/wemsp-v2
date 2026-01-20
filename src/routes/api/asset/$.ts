import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { prisma } from '@/db'
import { AssetType } from '@/generated/prisma/enums'

export const Route = createFileRoute('/api/asset/$')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const body = await request.json()
          const { name, type, description, value, documentUrl } = body

          // Validate required fields
          if (!name || !type || value === undefined || value === null) {
            return Response.json(
              { error: 'Missing required fields' },
              { status: 400 }
            )
          }

          // Validate asset type
          if (!Object.values(AssetType).includes(type)) {
            return Response.json(
              { error: 'Invalid asset type' },
              { status: 400 }
            )
          }

          // Validate value is a positive number
          const numValue = parseFloat(value)
          if (isNaN(numValue) || numValue < 0) {
            return Response.json(
              { error: 'Value must be a positive number' },
              { status: 400 }
            )
          }

          // Create asset in database
          const asset = await prisma.asset.create({
            data: {
              name,
              type,
              description: description || null,
              value: numValue,
              documentUrl: documentUrl || null,
              userId: session.user.id,
            },
          })

          return Response.json({
            success: true,
            asset: {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              description: asset.description,
              value: asset.value,
              documentUrl: asset.documentUrl,
            },
          }, { status: 201 })
        } catch (error) {
          console.error('Error creating asset:', error)
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
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const assets = await prisma.asset.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
          })

          return Response.json({ assets })
        } catch (error) {
          console.error('Error fetching assets:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
