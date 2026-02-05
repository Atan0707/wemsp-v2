import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'
import { corsHeaders } from '@/lib/cors'

export const Route = createFileRoute('/api/admin/users/$id/detail')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders })
      },

      GET: async ({ request }: { request: Request }) => {
        try {
          // Verify admin session
          const admin = await getAdminFromSession(request.headers)
          if (!admin) {
            return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
          }

          // Extract user ID from URL
          const url = new URL(request.url)
          const pathParts = url.pathname.split('/')
          const userId = pathParts[pathParts.length - 2]

          if (!userId) {
            return Response.json({ error: 'User ID is required' }, { status: 400, headers: corsHeaders })
          }

          // Get user by ID with all related data
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              icNumber: true,
              phoneNumber: true,
              address: true,
              emailVerified: true,
              image: true,
              createdAt: true,
              updatedAt: true,
              assets: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  description: true,
                  value: true,
                  documentUrl: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              agreements: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  distributionType: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  assets: {
                    select: {
                      id: true,
                      assetId: true,
                      allocatedValue: true,
                      allocatedPercentage: true,
                      asset: {
                        select: {
                          name: true,
                          type: true,
                        },
                      },
                    },
                  },
                  beneficiaries: {
                    select: {
                      id: true,
                      familyMemberId: true,
                      nonRegisteredFamilyMemberId: true,
                      sharePercentage: true,
                      shareDescription: true,
                      hasSigned: true,
                      isAccepted: true,
                      familyMember: {
                        select: {
                          relation: true,
                          familyMemberUser: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      },
                      nonRegisteredFamilyMember: {
                        select: {
                          name: true,
                          relation: true,
                        },
                      },
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
              },
              familyMembers: {
                select: {
                  id: true,
                  relation: true,
                  familyMemberUser: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              nonRegisteredFamilyMembers: {
                select: {
                  id: true,
                  name: true,
                  relation: true,
                  icNumber: true,
                  phoneNumber: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              sessions: {
                select: {
                  id: true,
                  token: true,
                  expiresAt: true,
                  createdAt: true,
                  ipAddress: true,
                  userAgent: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              accounts: {
                select: {
                  id: true,
                  providerId: true,
                  accountId: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          })

          if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
          }

          return Response.json({ user }, { headers: corsHeaders })
        } catch (error) {
          console.error('Error fetching user details:', error)
          return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
        }
      },
    },
  },
})
