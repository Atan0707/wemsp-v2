import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/agreement/$id/sign/witness/$')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const adminSession = await getAdminFromSession(request.headers)

        if (!adminSession) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { id: agreementId } = params

        try {
          // Check if agreement exists
          const agreement = await prisma.agreement.findUnique({
            where: { id: agreementId },
          })

          if (!agreement) {
            return Response.json(
              { error: 'Agreement not found' },
              { status: 404 }
            )
          }

          // Can only witness in PENDING_WITNESS status
          if (agreement.status !== 'PENDING_WITNESS') {
            return Response.json(
              { error: `Cannot witness agreement in ${agreement.status} status` },
              { status: 400 }
            )
          }

          // Check if already witnessed
          if (agreement.witnessedAt) {
            return Response.json(
              { error: 'Agreement has already been witnessed' },
              { status: 400 }
            )
          }

          // Verify admin is still active
          const admin = await prisma.admin.findFirst({
            where: {
              id: adminSession.adminId,
              isActive: true,
            },
          })

          if (!admin) {
            return Response.json(
              { error: 'Only active admins can witness agreements' },
              { status: 403 }
            )
          }

          // Witness agreement
          const updatedAgreement = await prisma.agreement.update({
            where: { id: agreementId },
            data: {
              witnessId: adminSession.adminId,
              witnessedAt: new Date(),
              status: 'ACTIVE',
            },
          })

          return Response.json({
            success: true,
            message: 'Agreement witnessed successfully',
            agreement: {
              id: updatedAgreement.id,
              status: updatedAgreement.status,
              witnessId: updatedAgreement.witnessId,
              witnessedAt: updatedAgreement.witnessedAt?.toISOString(),
            },
          })
        } catch (error) {
          console.error('Error witnessing agreement:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
