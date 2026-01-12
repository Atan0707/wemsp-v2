import { prisma } from '../db'

/**
 * Family relation types - matches the FamilyRelation enum in schema.prisma
 */
export const FamilyRelation = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  SON: 'SON',
  DAUGHTER: 'DAUGHTER',
  BROTHER: 'BROTHER',
  SISTER: 'SISTER',
  SPOUSE: 'SPOUSE',
  GRANDFATHER: 'GRANDFATHER',
  GRANDMOTHER: 'GRANDMOTHER',
  GRANDSON: 'GRANDSON',
  GRANDDAUGHTER: 'GRANDDAUGHTER',
  UNCLE: 'UNCLE',
  AUNT: 'AUNT',
  NEPHEW: 'NEPHEW',
  NIECE: 'NIECE',
  COUSIN: 'COUSIN',
  OTHER: 'OTHER',
} as const

export type FamilyRelationType = (typeof FamilyRelation)[keyof typeof FamilyRelation]

/**
 * Mapping of family relations to their inverse relations.
 * When User A adds User B with a relation, User B gets the inverse relation for User A.
 */
export const INVERSE_RELATIONS: Record<FamilyRelationType, FamilyRelationType> = {
  // Parent ↔ Child
  [FamilyRelation.FATHER]: FamilyRelation.SON,      // If A's father is B, then B's son is A
  [FamilyRelation.MOTHER]: FamilyRelation.SON,      // If A's mother is B, then B's son is A
  [FamilyRelation.SON]: FamilyRelation.FATHER,      // If A's son is B, then B's father is A
  [FamilyRelation.DAUGHTER]: FamilyRelation.FATHER, // If A's daughter is B, then B's father is A

  // Siblings (symmetric)
  [FamilyRelation.BROTHER]: FamilyRelation.BROTHER, // If A's brother is B, then B's sibling is A
  [FamilyRelation.SISTER]: FamilyRelation.SISTER,   // If A's sister is B, then B's sibling is A

  // Spouse (symmetric)
  [FamilyRelation.SPOUSE]: FamilyRelation.SPOUSE,

  // Grandparent ↔ Grandchild
  [FamilyRelation.GRANDFATHER]: FamilyRelation.GRANDSON,
  [FamilyRelation.GRANDMOTHER]: FamilyRelation.GRANDSON,
  [FamilyRelation.GRANDSON]: FamilyRelation.GRANDFATHER,
  [FamilyRelation.GRANDDAUGHTER]: FamilyRelation.GRANDFATHER,

  // Uncle/Aunt ↔ Nephew/Niece
  [FamilyRelation.UNCLE]: FamilyRelation.NEPHEW,
  [FamilyRelation.AUNT]: FamilyRelation.NEPHEW,
  [FamilyRelation.NEPHEW]: FamilyRelation.UNCLE,
  [FamilyRelation.NIECE]: FamilyRelation.UNCLE,

  // Cousin (symmetric)
  [FamilyRelation.COUSIN]: FamilyRelation.COUSIN,

  // Other (symmetric)
  [FamilyRelation.OTHER]: FamilyRelation.OTHER,
}

/**
 * Get the inverse relation for a given family relation.
 * Note: For gender-specific relations (like SON/DAUGHTER), you may want to
 * pass the actual gender of the user to get the correct inverse.
 */
export function getInverseRelation(relation: FamilyRelationType): FamilyRelationType {
  return INVERSE_RELATIONS[relation]
}

/**
 * Creates a bidirectional family relationship between two users.
 * When User A adds User B with a relation, this also creates the inverse relation from B to A.
 *
 * @param userId - The user creating the family link
 * @param familyMemberUserId - The user being added as family member
 * @param relation - The relation from userId's perspective (e.g., FATHER means "my father")
 * @returns Both created family member records
 */
export async function createBidirectionalFamilyRelation(
  userId: string,
  familyMemberUserId: string,
  relation: FamilyRelationType
) {
  const inverseRelation = getInverseRelation(relation)

  // Use a transaction to ensure both records are created or neither
  const [familyMember, inverseFamilyMember] = await prisma.$transaction([
    // Create the original relation (A -> B)
    prisma.familyMember.create({
      data: {
        userId,
        familyMemberUserId,
        relation,
      },
    }),
    // Create the inverse relation (B -> A)
    prisma.familyMember.create({
      data: {
        userId: familyMemberUserId,
        familyMemberUserId: userId,
        relation: inverseRelation,
      },
    }),
  ])

  return { familyMember, inverseFamilyMember }
}

/**
 * Deletes a bidirectional family relationship between two users.
 * Removes both the original relation and its inverse.
 *
 * @param userId - One user in the relationship
 * @param familyMemberUserId - The other user in the relationship
 */
export async function deleteBidirectionalFamilyRelation(
  userId: string,
  familyMemberUserId: string
) {
  await prisma.$transaction([
    // Delete A -> B
    prisma.familyMember.deleteMany({
      where: {
        userId,
        familyMemberUserId,
      },
    }),
    // Delete B -> A
    prisma.familyMember.deleteMany({
      where: {
        userId: familyMemberUserId,
        familyMemberUserId: userId,
      },
    }),
  ])
}

/**
 * Get all family members for a user (from their familyMembers relation).
 * This returns people the user has explicitly added as family.
 */
export async function getFamilyMembers(userId: string) {
  return prisma.familyMember.findMany({
    where: { userId },
    include: {
      familyMemberUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          icNumber: true,
        },
      },
    },
  })
}
