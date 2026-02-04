import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { prisma } from '@/db'
import { AgreementStatus } from '@/generated/prisma/enums'

export const Route = createFileRoute('/api/agreement/$id/sign/owner/$')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
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

          // Only owner can sign
          if (agreement.ownerId !== session.user.id) {
            return Response.json(
              { error: 'Only the agreement owner can sign' },
              { status: 403 }
            )
          }

          // Can only sign in DRAFT or PENDING_SIGNATURES status
          if (agreement.status !== 'DRAFT' && agreement.status !== 'PENDING_SIGNATURES') {
            return Response.json(
              { error: `Cannot sign agreement in ${agreement.status} status` },
              { status: 400 }
            )
          }

          // Check if already signed
          if (agreement.ownerHasSigned) {
            return Response.json(
              { error: 'Owner has already signed this agreement' },
              { status: 400 }
            )
          }

          // Get body to check if we should also submit
          const body = await request.json()
          const { submit = false } = body

          // Sign agreement
          const updatedAgreement = await prisma.agreement.update({
            where: { id: agreementId },
            data: {
              ownerHasSigned: true,
              ownerSignedAt: new Date(),
              // Simple signature ref - can be enhanced later with crypto
              ownerSignatureRef: `owner-signed-${Date.now()}`,
              status: submit ? 'PENDING_SIGNATURES' : agreement.status,
            },
          })

          return Response.json({
            success: true,
            message: submit
              ? 'Agreement signed and submitted for beneficiary signatures'
              : 'Agreement signed successfully',
            agreement: {
              id: updatedAgreement.id,
              status: updatedAgreement.status,
              ownerHasSigned: updatedAgreement.ownerHasSigned,
              ownerSignedAt: updatedAgreement.ownerSignedAt?.toISOString(),
            },
          })
        } catch (error) {
          console.error('Error signing agreement as owner:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
