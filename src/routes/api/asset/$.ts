import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { prisma } from '@/db'
import { AssetType } from '@/generated/prisma/enums'
import { uploadFileToS3, generateS3Key, getFileUrl, deleteFileFromS3, extractKeyFromUrl } from '@/lib/aws'

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
          // Parse FormData instead of JSON
          const formData = await request.formData()
          const name = formData.get('name') as string
          const type = formData.get('type') as string
          const description = formData.get('description') as string | null
          const value = formData.get('value') as string
          const document = formData.get('document') as File | null

          // Validate required fields
          if (!name || !type || !value) {
            return Response.json(
              { error: 'Missing required fields' },
              { status: 400 }
            )
          }

          // Validate asset type
          if (!Object.values(AssetType).includes(type as AssetType)) {
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

          // Upload document to S3 if provided
          let documentUrl: string | null = null
          if (document && document.size > 0) {
            // Validate file type
            const allowedTypes = [
              'application/pdf',
            ]

            if (!allowedTypes.includes(document.type)) {
              return Response.json(
                { error: 'Invalid file type. Allowed types: PDF' },
                { status: 400 }
              )
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024 // 10MB
            if (document.size > maxSize) {
              return Response.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
              )
            }

            // Upload to S3
            const key = generateS3Key(document.name, 'documents')
            await uploadFileToS3(document, key)
            documentUrl = getFileUrl(key)
          }

          // Create asset in database
          const asset = await prisma.asset.create({
            data: {
              name,
              type: type as AssetType,
              description: description || null,
              value: numValue,
              documentUrl,
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

      DELETE: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const url = new URL(request.url)
          const id = url.pathname.split('/').pop()

          if (!id) {
            return Response.json(
              { error: 'Missing asset id' },
              { status: 400 }
            )
          }

          // Check if asset exists and belongs to user
          const asset = await prisma.asset.findFirst({
            where: {
              id: parseInt(id),
              userId: session.user.id,
            },
          })

          if (!asset) {
            return Response.json(
              { error: 'Asset not found' },
              { status: 404 }
            )
          }

          // Delete file from S3 if exists
          if (asset.documentUrl) {
            try {
              const key = extractKeyFromUrl(asset.documentUrl)
              await deleteFileFromS3(key)
            } catch (error) {
              console.error('Error deleting file from S3:', error)
              // Continue with asset deletion even if file deletion fails
            }
          }

          // Delete asset from database
          await prisma.asset.delete({
            where: { id: parseInt(id) },
          })

          return Response.json({
            success: true,
            message: 'Asset deleted successfully',
          })
        } catch (error) {
          console.error('Error deleting asset:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
