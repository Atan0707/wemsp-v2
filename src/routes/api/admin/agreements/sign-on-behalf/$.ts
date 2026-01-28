import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/admin/agreements/sign-on-behalf/$')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // 1. Verify admin session
        const admin = await getAdminFromSession(request.headers)
        if (!admin) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const body = await request.json()
          const { beneficiaryId, adminNotes } = body

          if (!beneficiaryId) {
            return Response.json(
              { error: 'Beneficiary ID is required' },
              { status: 400 }
            )
          }

          // 2. Find beneficiary with agreement
          const beneficiary = await prisma.agreementBeneficiary.findUnique({
            where: { id: beneficiaryId },
            include: {
              agreement: true,
              nonRegisteredFamilyMember: true,
            },
          })

          if (!beneficiary) {
            return Response.json(
              { error: 'Beneficiary not found' },
              { status: 404 }
            )
          }

          // 3. Verify agreement is in PENDING_SIGNATURES
          if (beneficiary.agreement.status !== 'PENDING_SIGNATURES') {
            return Response.json(
              { error: `Cannot sign agreement in ${beneficiary.agreement.status} status` },
              { status: 400 }
            )
          }

          // 4. Check if already signed
          if (beneficiary.hasSigned) {
            return Response.json(
              { error: 'This beneficiary has already signed' },
              { status: 400 }
            )
          }

          // 5. Update beneficiary signature
          const updatedBeneficiary = await prisma.$transaction(async (tx) => {
            // Update beneficiary
            const updated = await tx.agreementBeneficiary.update({
              where: { id: beneficiaryId },
              data: {
                hasSigned: true,
                signedAt: new Date(),
                signatureRef: `admin-signed-${admin.id}-${Date.now()}`,
                isAccepted: true,
                adminNotes: adminNotes || null,
                adminSignedById: admin.id,
              },
            })

            // Check if all beneficiaries signed
            const allBeneficiaries = await tx.agreementBeneficiary.findMany({
              where: { agreementId: beneficiary.agreementId },
            })

            const allSigned = allBeneficiaries.every(
              (b) => b.hasSigned && b.isAccepted !== false
            )

            // Update agreement status if all signed
            if (allSigned) {
              await tx.agreement.update({
                where: { id: beneficiary.agreementId },
                data: { status: 'PENDING_WITNESS' },
              })
            }

            return updated
          })

          // 6. Return success
          const allBeneficiaries = await prisma.agreementBeneficiary.findMany({
            where: { agreementId: beneficiary.agreementId },
          })

          const allSigned = allBeneficiaries.every(
            (b) => b.hasSigned && b.isAccepted !== false
          )

          return Response.json({
            success: true,
            message: `Signed successfully on behalf of ${beneficiary.nonRegisteredFamilyMember?.name || 'beneficiary'}`,
            agreementStatus: allSigned ? 'PENDING_WITNESS' : 'PENDING_SIGNATURES',
            beneficiary: {
              id: updatedBeneficiary.id,
              hasSigned: updatedBeneficiary.hasSigned,
              signedAt: updatedBeneficiary.signedAt?.toISOString(),
            },
          })
        } catch (error) {
          console.error('Error signing on behalf:', error)
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
