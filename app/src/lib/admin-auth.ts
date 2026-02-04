import { prisma } from '@/db'
import bcrypt from 'bcrypt'
import { SignJWT, jwtVerify } from 'jose'

const SALT_ROUNDS = 10

// Use a secret key for signing JWT tokens
// In production, this should be stored in environment variables
const getSecretKey = () => {
  return new TextEncoder().encode(
    process.env.ADMIN_SESSION_SECRET || 'your-secret-key-change-in-production'
  )
}

export interface AdminSession {
  adminId: string
  email: string
  name: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * Create an admin session token
 */
export async function createAdminSessionToken(admin: { id: string; email: string; name: string }): Promise<string> {
  const secretKey = getSecretKey()

  const token = await new SignJWT({
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)

  return token
}

/**
 * Verify an admin session token and return the session data
 */
export async function verifyAdminSessionToken(token: string): Promise<AdminSession | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey)

    // Verify admin still exists and is active
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId as string },
      select: { id: true, email: true, name: true, isActive: true },
    })

    if (!admin || !admin.isActive) {
      return null
    }

    return {
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    }
  } catch {
    return null
  }
}

/**
 * Extract session token from request headers
 */
export function getSessionTokenFromHeaders(headers: Headers): string | null {
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith('admin_session='))
  if (!sessionCookie) {
    return null
  }

  return sessionCookie.split('=')[1]
}

/**
 * Get admin session from request headers
 */
export async function getAdminFromSession(headers: Headers): Promise<AdminSession | null> {
  const token = getSessionTokenFromHeaders(headers)
  if (!token) {
    return null
  }

  return await verifyAdminSessionToken(token)
}
