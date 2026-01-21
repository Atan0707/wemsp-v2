import type { FamilyRelation } from '@/generated/prisma/enums'

/**
 * Faraid (Islamic Inheritance) Rules
 * Based on Sunni Islamic jurisprudence for inheritance distribution
 */

// Fixed share recipients in Faraid
export interface FixedShare {
  relation: FamilyRelation
  share: number // Decimal representation (e.g., 1/6 = 0.1667)
  condition?: string // Conditions for this share to apply
  description: string // Human-readable description
}

// Result of Faraid calculation
export interface FaraidDistribution {
  shares: Map<FamilyRelation, number> // Relation -> share (decimal)
  residuary: FamilyRelation[] // Relations that receive residuary (remaining)
  totalFixedShares: number // Sum of fixed shares
  description: string // Explanation of the distribution
}

/**
 * Fixed shares in Faraid
 * These shares are prescribed by Quran and are fixed
 *
 * Note: For spouse shares (SPOUSE), the actual share depends on gender:
 * - Husband gets 1/4 (with children) or 1/2 (without children)
 * - Wife gets 1/8 (with children) or 1/4 (without children)
 * Since our schema uses a generic SPOUSE relation, the actual percentage
 * will depend on the specific case and should be validated accordingly.
 */
export const FIXED_SHARES: Record<FamilyRelation, { share: number; description: string }> = {
  // Fixed shares with Quranic basis
  FATHER: { share: 1/6, description: '1/6 fixed share, plus residuary if no male offspring' },
  MOTHER: { share: 1/6, description: '1/6 if children/grandchildren, 1/3 if no children' },
  SPOUSE: { share: 0, description: 'Husband: 1/4 (with children) or 1/2 (without); Wife: 1/8 (with children) or 1/4 (without)' },
  DAUGHTER: { share: 1/2, description: '1/2 if single, 2/3 if multiple daughters' },
  GRANDDAUGHTER: { share: 1/6, description: '1/6 when representing deceased daughter' },

  // Relations with only residuary shares (no fixed shares)
  SON: { share: 0, description: 'Residuary only - receives remaining portion' },
  GRANDSON: { share: 0, description: 'Residuary only - receives remaining portion' },
  SIBLING: { share: 0, description: 'Residuary in absence of descendants/ancestors' },
  GRANDFATHER: { share: 0, description: 'May receive fixed share or residuary' },
  GRANDMOTHER: { share: 1/6, description: '1/6 if no mother' },

  // Collateral relations (receive residuary in certain conditions)
  UNCLE: { share: 0, description: 'Residuary in absence of closer relatives' },
  AUNT: { share: 0, description: 'No fixed share in most schools' },
  NEPHEW: { share: 0, description: 'Residuary in absence of closer relatives' },
  NIECE: { share: 0, description: 'Residuary in certain conditions' },
  COUSIN: { share: 0, description: 'Distant residuary heir' },

  // Other
  OTHER: { share: 0, description: 'No prescribed share' },
}

/**
 * Calculate Faraid distribution based on surviving heirs
 * @param beneficiaries - List of beneficiaries with their relations
 * @param context - Additional context (e.g., hasChildren, hasSpouse, etc.)
 * @returns Distribution calculation
 */
export function calculateFaraidDistribution(
  beneficiaries: Array<{ relation: FamilyRelation; count?: number }>,
  context?: {
    hasChildren?: boolean
    hasSpouse?: boolean
    hasParents?: boolean
    isMaleDescendant?: boolean
  }
): FaraidDistribution {
  const shares = new Map<FamilyRelation, number>()
  const residuary: FamilyRelation[] = []
  let totalFixedShares = 0
  const explanations: string[] = []

  const relations = new Map<FamilyRelation, number>()
  beneficiaries.forEach((b) => {
    relations.set(b.relation, (relations.get(b.relation) || 0) + (b.count || 1))
  })

  const hasChildren = context?.hasChildren ?? isDescendantPresent(relations)
  const hasSpouse = context?.hasSpouse ?? isSpousePresent(relations)
  const hasParents = context?.hasParents ?? isParentPresent(relations)
  const isMaleDescendant = context?.isMaleDescendant ?? hasMaleDescendant(relations)

  // Note: SPOUSE share calculation is context-dependent on gender
  // Since our schema uses a generic SPOUSE relation, we add a warning
  // rather than a strict calculation. The user should verify based on their specific case.
  if (relations.has('SPOUSE')) {
    explanations.push('SPOUSE: Share depends on gender - Husband: 1/4 (with children) or 1/2 (without); Wife: 1/8 (with children) or 1/4 (without)')
  }

  // Calculate parent shares
  if (relations.has('FATHER')) {
    const fatherShare = 1/6
    shares.set('FATHER', fatherShare)
    totalFixedShares += fatherShare
    // Father may also receive residuary if no male descendants
    if (!isMaleDescendant) {
      residuary.push('FATHER')
    }
    explanations.push(`Father: 1/6 fixed ${!isMaleDescendant ? '+ residuary' : ''}`)
  }

  if (relations.has('MOTHER')) {
    // Mother gets 1/3 if no children AND no siblings (simplified)
    // Otherwise 1/6
    const motherShare = hasChildren ? 1/6 : 1/3
    shares.set('MOTHER', motherShare)
    totalFixedShares += motherShare
    explanations.push(`Mother: ${motherShare} (${hasChildren ? 'with' : 'without'} children)`)
  } else if (relations.has('GRANDMOTHER') && !relations.has('MOTHER')) {
    // Paternal grandmother gets 1/6 if no mother
    const grandmotherShare = 1/6
    shares.set('GRANDMOTHER', grandmotherShare)
    totalFixedShares += grandmotherShare
    explanations.push('Grandmother: 1/6 (in absence of mother)')
  }

  // Calculate daughter shares
  if (relations.has('DAUGHTER')) {
    const daughterCount = relations.get('DAUGHTER') || 1
    const hasSons = relations.has('SON')

    if (daughterCount === 1 && !hasSons) {
      const daughterShare = 1/2
      shares.set('DAUGHTER', daughterShare)
      totalFixedShares += daughterShare
      explanations.push('Daughter: 1/2 (single daughter)')
    } else if (daughterCount > 1 && !hasSons) {
      const daughterShare = 2/3
      shares.set('DAUGHTER', daughterShare)
      totalFixedShares += daughterShare
      explanations.push(`Daughters: 2/3 total (${daughterCount} daughters)`)
    } else if (hasSons) {
      // Daughters become residuary with sons (son gets 2:1 ratio)
      residuary.push('DAUGHTER')
      residuary.push('SON')
      explanations.push('Daughters and Sons: Residuary (son receives 2x daughter share)')
    }
  }

  // If we have granddaughters but no daughters
  if (relations.has('GRANDDAUGHTER') && !relations.has('DAUGHTER')) {
    const granddaughterShare = 1/6
    shares.set('GRANDDAUGHTER', granddaughterShare)
    totalFixedShares += granddaughterShare
    explanations.push('Granddaughter: 1/6 (representing deceased daughter)')
  }

  // Sons are always residuary
  if (relations.has('SON') && !residuary.includes('SON')) {
    residuary.push('SON')
    explanations.push('Son: Residuary (remaining portion)')
  }

  // Grandsons are residuary in absence of sons
  if (relations.has('GRANDSON') && !relations.has('SON')) {
    residuary.push('GRANDSON')
    explanations.push('Grandson: Residuary (in absence of son)')
  }

  // Siblings receive residuary when no descendants, parents, or grandparents
  if (
    relations.has('SIBLING') &&
    !hasParents &&
    !hasChildren &&
    !relations.has('GRANDFATHER')
  ) {
    residuary.push('SIBLING')
    explanations.push('Siblings: Residuary (absence of descendants/ascendants)')
  }

  return {
    shares,
    residuary,
    totalFixedShares,
    description: explanations.join('. ') || 'No valid Faraid heirs identified',
  }
}

/**
 * Validate if given shares conform to Faraid rules
 * @param beneficiaries - Array of beneficiaries with relation and proposed share
 * @returns Validation result with errors if any
 */
export function validateFaraidShares(
  beneficiaries: Array<{ relation: FamilyRelation; sharePercentage: number }>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check total is 100%
  const totalShare = beneficiaries.reduce((sum, b) => sum + b.sharePercentage, 0)
  if (Math.abs(totalShare - 100) > 0.01) {
    errors.push(`Total shares must equal 100%. Current total: ${totalShare.toFixed(2)}%`)
  }

  // Get unique relations with counts
  const relationCounts = new Map<FamilyRelation, number>()
  beneficiaries.forEach((b) => {
    relationCounts.set(b.relation, (relationCounts.get(b.relation) || 0) + 1)
  })

  const beneficiaryInput = Array.from(relationCounts.entries()).map(([relation, count]) => ({
    relation,
    count,
  }))

  const context = {
    hasChildren: hasChildren(beneficiaryInput),
    hasSpouse: hasSpouse(beneficiaryInput),
    hasParents: hasParents(beneficiaryInput),
    isMaleDescendant: hasMaleDescendant(beneficiaryInput),
  }

  const distribution = calculateFaraidDistribution(beneficiaryInput, context)

  // Check if fixed shares match
  beneficiaries.forEach((beneficiary) => {
    const expectedFixedShare = distribution.shares.get(beneficiary.relation)
    if (expectedFixedShare !== undefined && expectedFixedShare > 0) {
      const expectedPercentage = expectedFixedShare * 100
      // Allow small rounding differences
      if (Math.abs(beneficiary.sharePercentage - expectedPercentage) > 1) {
        errors.push(
          `${beneficiary.relation}: Expected ${expectedPercentage.toFixed(2)}% per Faraid rules, got ${beneficiary.sharePercentage}%`
        )
      }
    }
  })

  // Check if residuary heirs are getting fixed shares (should be residuary)
  beneficiaries.forEach((beneficiary) => {
    if (distribution.residuary.includes(beneficiary.relation)) {
      warnings.push(
        `${beneficiary.relation} should receive residuary portion (remaining after fixed shares), not a fixed percentage`
      )
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Helper functions
function isDescendantPresent(relations: Map<FamilyRelation, number>): boolean {
  return !!(
    relations.has('SON') ||
    relations.has('DAUGHTER') ||
    relations.has('GRANDSON') ||
    relations.has('GRANDDAUGHTER')
  )
}

function isSpousePresent(relations: Map<FamilyRelation, number>): boolean {
  return relations.has('SPOUSE')
}

function isParentPresent(relations: Map<FamilyRelation, number>): boolean {
  return !!(relations.has('FATHER') || relations.has('MOTHER'))
}

function hasMaleDescendant(relations: Map<FamilyRelation, number>): boolean {
  return !!(relations.has('SON') || relations.has('GRANDSON'))
}

function hasChildren(beneficiaries: Array<{ relation: FamilyRelation }>): boolean {
  return beneficiaries.some(
    (b) => b.relation === 'SON' || b.relation === 'DAUGHTER' || b.relation === 'GRANDSON' || b.relation === 'GRANDDAUGHTER'
  )
}

function hasSpouse(beneficiaries: Array<{ relation: FamilyRelation }>): boolean {
  return beneficiaries.some((b) => b.relation === 'SPOUSE')
}

function hasParents(beneficiaries: Array<{ relation: FamilyRelation }>): boolean {
  return beneficiaries.some((b) => b.relation === 'FATHER' || b.relation === 'MOTHER')
}

/**
 * Get human-readable explanation of Faraid shares for a relation
 */
export function getFaraidExplanation(relation: FamilyRelation): string {
  return FIXED_SHARES[relation]?.description || 'No specific Faraid rule for this relation'
}

/**
 * Check if a relation has a fixed share in Faraid
 */
export function hasFixedShare(relation: FamilyRelation): boolean {
  const share = FIXED_SHARES[relation]?.share || 0
  return share > 0
}
