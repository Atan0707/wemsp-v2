import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'
import { getAdminFromSession } from '@/lib/admin-auth'
import { DistributionType, AgreementStatus } from '@/generated/prisma/enums'
import {
  validateAgreementInput,
  validateBeneficiaries,
  validateAssets,
} from '@/lib/agreement-validation'

export const Route = createFileRoute('/api/admin/agreements/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          // Verify admin session
          const admin = await getAdminFromSession(request.headers)
          if (!admin) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          // Get query parameters for pagination and filtering
          const url = new URL(request.url)
          const page = parseInt(url.searchParams.get('page') || '1')
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const search = url.searchParams.get('search') || ''

          const skip = (page - 1) * limit

          // Build where clause for search
          const where = search
            ? {
                OR: [
                  { title: { contains: search, mode: 'insensitive' as const } },
                  { status: { equals: search as AgreementStatus } },
                  {
                    owner: {
                      name: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                ],
              }
            : {}

          // Get total count for pagination
          const total = await prisma.agreement.count({ where })

          // Get agreements with pagination
          const agreements = await prisma.agreement.findMany({
            where,
            skip,
            take: limit,
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              witness: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  assets: true,
                  beneficiaries: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          })

          // Get signed beneficiary counts for each agreement
          const agreementsWithStats = await Promise.all(
            agreements.map(async (agreement) => {
              const signedBeneficiaries = await prisma.agreementBeneficiary.count({
                where: {
                  agreementId: agreement.id,
                  hasSigned: true,
                },
              })

              return {
                ...agreement,
                signedBeneficiaryCount: signedBeneficiaries,
              }
            })
          )

          return Response.json({
            agreements: agreementsWithStats,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          })
        } catch (error) {
          console.error('Error fetching agreements:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }: { request: Request }) => {
        try {
          // Verify admin session
          const admin = await getAdminFromSession(request.headers)
          if (!admin) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const body = await request.json()
          const {
            title,
            description,
            distributionType,
            effectiveDate,
            expiryDate,
            ownerId,
            assets,
            beneficiaries,
          } = body

          // Validate required fields
          if (!title || !distributionType || !ownerId) {
            return Response.json(
              { error: 'Missing required fields: title, distributionType, ownerId' },
              { status: 400 },
            )
          }

          // Validate basic input
          const basicValidation = validateAgreementInput({
            title,
            description,
            distributionType,
            effectiveDate,
            expiryDate,
          })

          if (!basicValidation.valid) {
            return Response.json(
              { error: 'Validation failed', details: basicValidation.errors },
              { status: 400 },
            )
          }

          // Validate distribution type
          if (!Object.values(DistributionType).includes(distributionType)) {
            return Response.json(
              { error: 'Invalid distribution type' },
              { status: 400 },
            )
          }

          // Validate beneficiaries
          const beneficiaryValidation = validateBeneficiaries(
            beneficiaries || [],
            distributionType
          )

          if (!beneficiaryValidation.valid) {
            return Response.json(
              { error: 'Beneficiary validation failed', details: beneficiaryValidation.errors },
              { status: 400 },
            )
          }

          // Validate assets
          const assetValidation = validateAssets(assets || [])

          if (!assetValidation.valid) {
            return Response.json(
              { error: 'Asset validation failed', details: assetValidation.errors },
              { status: 400 },
            )
          }

          // Validate user exists
          const user = await prisma.user.findUnique({
            where: { id: ownerId },
          })

          if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 })
          }

          // Verify all assets belong to the user
          const assetIds = (assets || []).map((a: any) => a.assetId)
          const userAssets = await prisma.asset.findMany({
            where: {
              id: { in: assetIds },
              userId: ownerId,
            },
          })

          if (userAssets.length !== assetIds.length) {
            return Response.json(
              { error: 'One or more assets do not belong to the specified owner' },
              { status: 400 },
            )
          }

          // Verify beneficiaries belong to user's family
          for (const beneficiary of beneficiaries || []) {
            if (beneficiary.familyMemberId) {
              const familyMember = await prisma.familyMember.findFirst({
                where: {
                  id: beneficiary.familyMemberId,
                  userId: ownerId,
                },
              })

              if (!familyMember) {
                return Response.json(
                  { error: `Family member ${beneficiary.familyMemberId} not found in owner's family` },
                  { status: 404 },
                )
              }
            } else if (beneficiary.nonRegisteredFamilyMemberId) {
              const nonRegMember = await prisma.nonRegisteredFamilyMember.findFirst({
                where: {
                  id: beneficiary.nonRegisteredFamilyMemberId,
                  userId: ownerId,
                },
              })

              if (!nonRegMember) {
                return Response.json(
                  { error: `Non-registered family member ${beneficiary.nonRegisteredFamilyMemberId} not found` },
                  { status: 404 },
                )
              }
            }
          }

          // Create agreement in transaction
          const agreement = await prisma.$transaction(async (tx) => {
            // Create agreement
            const newAgreement = await tx.agreement.create({
              data: {
                title,
                description,
                distributionType,
                ownerId,
                effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
              },
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                witness: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    assets: true,
                    beneficiaries: true,
                  },
                },
              },
            })

            // Add assets
            if (assets && assets.length > 0) {
              await tx.agreementAsset.createMany({
                data: assets.map((a: any) => ({
                  agreementId: newAgreement.id,
                  assetId: a.assetId,
                  allocatedValue: a.allocatedValue,
                  allocatedPercentage: a.allocatedPercentage,
                  notes: a.notes,
                })),
              })
            }

            // Add beneficiaries
            if (beneficiaries && beneficiaries.length > 0) {
              for (const beneficiary of beneficiaries) {
                await tx.agreementBeneficiary.create({
                  data: {
                    agreementId: newAgreement.id,
                    familyMemberId: beneficiary.familyMemberId,
                    nonRegisteredFamilyMemberId: beneficiary.nonRegisteredFamilyMemberId,
                    sharePercentage: beneficiary.sharePercentage,
                    shareDescription: beneficiary.shareDescription,
                  },
                })
              }
            }

            return newAgreement
          })

          return Response.json(
            {
              success: true,
              agreement,
            },
            { status: 201 },
          )
        } catch (error) {
          console.error('Error creating agreement:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      PUT: async ({ request }: { request: Request }) => {
        try {
          // Verify admin session
          const admin = await getAdminFromSession(request.headers)
          if (!admin) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const url = new URL(request.url)
          const id = url.pathname.split('/').pop()

          if (!id) {
            return Response.json({ error: 'Missing agreement id' }, { status: 400 })
          }

          // Check if agreement exists
          const existingAgreement = await prisma.agreement.findUnique({
            where: { id },
          })

          if (!existingAgreement) {
            return Response.json({ error: 'Agreement not found' }, { status: 404 })
          }

          // Only allow editing DRAFT agreements
          if (existingAgreement.status !== 'DRAFT') {
            return Response.json(
              { error: 'Only DRAFT agreements can be edited' },
              { status: 400 },
            )
          }

          const body = await request.json()
          const {
            title,
            description,
            distributionType,
            effectiveDate,
            expiryDate,
            ownerId,
            assets,
            beneficiaries,
          } = body

          // Validate basic input
          const basicValidation = validateAgreementInput({
            title,
            description,
            distributionType,
            effectiveDate,
            expiryDate,
          })

          if (!basicValidation.valid) {
            return Response.json(
              { error: 'Validation failed', details: basicValidation.errors },
              { status: 400 },
            )
          }

          // Validate distribution type if provided
          if (distributionType && !Object.values(DistributionType).includes(distributionType)) {
            return Response.json(
              { error: 'Invalid distribution type' },
              { status: 400 },
            )
          }

          // If beneficiaries are provided, validate them
          if (beneficiaries && beneficiaries.length > 0) {
            const beneficiaryValidation = validateBeneficiaries(
              beneficiaries,
              distributionType || existingAgreement.distributionType
            )

            if (!beneficiaryValidation.valid) {
              return Response.json(
                { error: 'Beneficiary validation failed', details: beneficiaryValidation.errors },
                { status: 400 },
              )
            }
          }

          // If assets are provided, validate them
          if (assets && assets.length > 0) {
            const assetValidation = validateAssets(assets)

            if (!assetValidation.valid) {
              return Response.json(
                { error: 'Asset validation failed', details: assetValidation.errors },
                { status: 400 },
              )
            }
          }

          // If changing owner, validate new owner exists
          if (ownerId && ownerId !== existingAgreement.ownerId) {
            const user = await prisma.user.findUnique({
              where: { id: ownerId },
            })

            if (!user) {
              return Response.json({ error: 'User not found' }, { status: 404 })
            }

            // Verify all assets belong to the new owner
            const assetIds = (assets || []).map((a: any) => a.assetId)
            if (assetIds.length > 0) {
              const userAssets = await prisma.asset.findMany({
                where: {
                  id: { in: assetIds },
                  userId: ownerId,
                },
              })

              if (userAssets.length !== assetIds.length) {
                return Response.json(
                  { error: 'One or more assets do not belong to the specified owner' },
                  { status: 400 },
                )
              }
            }

            // Verify beneficiaries belong to new owner's family
            for (const beneficiary of beneficiaries || []) {
              if (beneficiary.familyMemberId) {
                const familyMember = await prisma.familyMember.findFirst({
                  where: {
                    id: beneficiary.familyMemberId,
                    userId: ownerId,
                  },
                })

                if (!familyMember) {
                  return Response.json(
                    { error: `Family member ${beneficiary.familyMemberId} not found in owner's family` },
                    { status: 404 },
                  )
                }
              } else if (beneficiary.nonRegisteredFamilyMemberId) {
                const nonRegMember = await prisma.nonRegisteredFamilyMember.findFirst({
                  where: {
                    id: beneficiary.nonRegisteredFamilyMemberId,
                    userId: ownerId,
                  },
                })

                if (!nonRegMember) {
                  return Response.json(
                    { error: `Non-registered family member ${beneficiary.nonRegisteredFamilyMemberId} not found` },
                    { status: 404 },
                  )
                }
              }
            }
          }

          // Update agreement in transaction
          const agreement = await prisma.$transaction(async (tx) => {
            // Update basic fields
            const updatedAgreement = await tx.agreement.update({
              where: { id },
              data: {
                title: title ?? existingAgreement.title,
                description: description !== undefined ? description : existingAgreement.description,
                distributionType: distributionType ?? existingAgreement.distributionType,
                effectiveDate: effectiveDate !== undefined ? new Date(effectiveDate) : existingAgreement.effectiveDate,
                expiryDate: expiryDate !== undefined ? new Date(expiryDate) : existingAgreement.expiryDate,
                ownerId: ownerId ?? existingAgreement.ownerId,
              },
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                witness: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    assets: true,
                    beneficiaries: true,
                  },
                },
              },
            })

            // Replace assets if provided
            if (assets && assets.length > 0) {
              // Delete existing assets
              await tx.agreementAsset.deleteMany({
                where: { agreementId: id },
              })

              // Add new assets
              await tx.agreementAsset.createMany({
                data: assets.map((a: any) => ({
                  agreementId: id,
                  assetId: a.assetId,
                  allocatedValue: a.allocatedValue,
                  allocatedPercentage: a.allocatedPercentage,
                  notes: a.notes,
                })),
              })
            }

            // Replace beneficiaries if provided
            if (beneficiaries && beneficiaries.length > 0) {
              // Delete existing beneficiaries
              await tx.agreementBeneficiary.deleteMany({
                where: { agreementId: id },
              })

              // Add new beneficiaries
              for (const beneficiary of beneficiaries) {
                await tx.agreementBeneficiary.create({
                  data: {
                    agreementId: id,
                    familyMemberId: beneficiary.familyMemberId,
                    nonRegisteredFamilyMemberId: beneficiary.nonRegisteredFamilyMemberId,
                    sharePercentage: beneficiary.sharePercentage,
                    shareDescription: beneficiary.shareDescription,
                  },
                })
              }
            }

            return updatedAgreement
          })

          return Response.json({
            success: true,
            agreement,
          })
        } catch (error) {
          console.error('Error updating agreement:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      DELETE: async ({ request }: { request: Request }) => {
        try {
          // Verify admin session
          const admin = await getAdminFromSession(request.headers)
          if (!admin) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const url = new URL(request.url)
          const id = url.pathname.split('/').pop()

          if (!id) {
            return Response.json({ error: 'Missing agreement id' }, { status: 400 })
          }

          // Check if agreement exists
          const agreement = await prisma.agreement.findUnique({
            where: { id },
          })

          if (!agreement) {
            return Response.json({ error: 'Agreement not found' }, { status: 404 })
          }

          // Only allow deletion of DRAFT agreements
          if (agreement.status !== 'DRAFT') {
            return Response.json(
              { error: 'Only DRAFT agreements can be deleted' },
              { status: 400 },
            )
          }

          // Delete agreement (cascade will handle related records)
          await prisma.agreement.delete({
            where: { id },
          })

          return Response.json({
            success: true,
            message: 'Agreement deleted successfully',
          })
        } catch (error) {
          console.error('Error deleting agreement:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
