import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { prisma } from '@/db'

type AgentRuntime = {
  userId: string
}

const explainFeature = tool(
  async ({ topic }) => {
    const normalized = topic.toLowerCase()

    if (normalized.includes('agreement')) {
      return [
        'Agreement quick flow:',
        '1) Create agreement in DRAFT.',
        '2) Add assets and beneficiaries.',
        '3) Owner signs and submit for signatures.',
        '4) Beneficiaries sign (or admin proxy for non-registered).',
        '5) Admin witnesses, then agreement becomes ACTIVE.',
      ].join('\n')
    }

    if (normalized.includes('family')) {
      return [
        'Family member flow:',
        '1) Search by IC number.',
        '2) If account exists: add as registered family member.',
        '3) If not: add as non-registered family member with details.',
      ].join('\n')
    }

    if (normalized.includes('asset')) {
      return [
        'Asset flow:',
        '1) Add asset name, type, and value.',
        '2) Optional: upload PDF document.',
        '3) Use assets when creating agreements.',
      ].join('\n')
    }

    return 'I can explain agreements, assets, and family management. Tell me which one you want.'
  },
  {
    name: 'explain_feature',
    description: 'Explain how a WEMSP feature works for end users.',
    schema: z.object({
      topic: z.string().min(1).describe('Feature topic such as agreement, family, or asset.'),
    }),
  }
)

export function buildAgentTools(runtime: AgentRuntime) {
  const listAgreements = tool(
    async () => {
      const agreements = await prisma.agreement.findMany({
        where: { ownerId: runtime.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          distributionType: true,
          createdAt: true,
        },
      })

      return agreements.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))
    },
    {
      name: 'list_my_agreements',
      description: 'List agreements owned by the current user.',
      schema: z.object({}).describe('No input required.'),
    }
  )

  const listFamilyMembers = tool(
    async () => {
      const [registered, nonRegistered] = await Promise.all([
        prisma.familyMember.findMany({
          where: { userId: runtime.userId },
          include: {
            familyMemberUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.nonRegisteredFamilyMember.findMany({
          where: { userId: runtime.userId },
          select: {
            id: true,
            name: true,
            relation: true,
            icNumber: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ])

      return {
        nonRegistered,
        registered: registered.map((m) => ({
          id: m.id,
          relation: m.relation,
          user: m.familyMemberUser,
        })),
      }
    },
    {
      name: 'list_my_family_members',
      description: 'List registered and non-registered family members of current user.',
      schema: z.object({}).describe('No input required.'),
    }
  )

  const listAssets = tool(
    async () => {
      const assets = await prisma.asset.findMany({
        where: { userId: runtime.userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          createdAt: true,
        },
      })

      return assets.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))
    },
    {
      name: 'list_my_assets',
      description: 'List user assets with type and value.',
      schema: z.object({}).describe('No input required.'),
    }
  )

  return [explainFeature, listAgreements, listFamilyMembers, listAssets]
}
