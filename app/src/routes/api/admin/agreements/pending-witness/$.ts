import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/api/admin/agreements/pending-witness/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const admin = await getAdminFromSession(request.headers)
        if (!admin) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const agreements = await prisma.agreement.findMany({
          where: { status: 'PENDING_WITNESS' },
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            beneficiaries: {
              include: {
                nonRegisteredFamilyMember: {
                  select: { id: true, name: true, icNumber: true },
                },
                familyMember: {
                  include: {
                    familyMemberUser: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
              },
            },
            assets: {
              include: {
                asset: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })

        return Response.json({ agreements })
      },
    },
  },
})
