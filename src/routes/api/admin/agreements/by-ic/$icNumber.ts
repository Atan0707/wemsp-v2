import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/admin/agreements/by-ic/$icNumber')({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { icNumber: string } }) => {
        // 1. Verify admin session
        const admin = await getAdminFromSession(request.headers)
        if (!admin) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { icNumber } = params

        // 2. Validate IC format (12 digits)
        if (!/^\d{12}$/.test(icNumber)) {
          return Response.json(
            { error: 'Invalid IC number format. Must be 12 digits.' },
            { status: 400 }
          )
        }

        // 3. Check if IC exists in registry
        const icRegistry = await prisma.icRegistry.findUnique({
          where: { icNumber },
          include: {
            nonRegisteredFamilyMember: true,
          },
        })

        if (!icRegistry || !icRegistry.nonRegisteredFamilyMember) {
          return Response.json(
            { error: 'No non-registered family member found with this IC number' },
            { status: 404 }
          )
        }

        // 4. Find pending agreements for this IC
        const pendingBeneficiaries = await prisma.agreementBeneficiary.findMany({
          where: {
            nonRegisteredFamilyMemberId: icRegistry.nonRegisteredFamilyMember.id,
            hasSigned: false,
            agreement: {
              status: 'PENDING_SIGNATURES',
            },
          },
          include: {
            agreement: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        })

        return Response.json({
          agreements: pendingBeneficiaries.map((b) => ({
            beneficiaryId: b.id,
            agreementId: b.agreementId,
            title: b.agreement.title,
            status: b.agreement.status,
            owner: b.agreement.owner,
            memberName: icRegistry.nonRegisteredFamilyMember.name,
            sharePercentage: b.sharePercentage,
            shareDescription: b.shareDescription,
          })),
        })
      },
    },
  },
})
