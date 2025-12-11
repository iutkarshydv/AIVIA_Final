import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './db';
import { createApiError } from './errors';
import { logger } from './logger';
import { UserRole } from '@prisma/client';

export interface AuthContext {
  userId: string;
  clerkId: string;
  email: string;
  role: string;
}

/**
 * Get authenticated user context from Clerk
 * Throws error if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId } = await auth();

  if (!userId) {
    throw createApiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  // Get or create user in database
  const user = await ensureUserExists(userId);

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: user.role,
  };
}

/**
 * Ensure user exists in database, create if not
 */
async function ensureUserExists(clerkId: string) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw createApiError('USER_NOT_FOUND', 'User not found in Clerk', 404);
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw createApiError('INVALID_USER', 'User email not found', 400);
  }

  // Check if user exists in database
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  // Create user if doesn't exist
  if (!user) {
    logger.info({ clerkId, email }, 'Creating new user in database');

    user = await prisma.user.create({
      data: {
        clerkId,
        email,
        role: UserRole.CANDIDATE, // Use the enum value
      },
    });
  }

  return user;
}

/**
 * Verify session ownership
 * Throws error if user doesn't own the session
 */
export async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!session) {
    throw createApiError('NOT_FOUND', 'Session not found', 404);
  }

  if (session.userId !== userId) {
    throw createApiError(
      'FORBIDDEN',
      'You do not have permission to access this session',
      403
    );
  }
}

/**
 * Check if user has required role
 */
export function hasRole(context: AuthContext, allowedRoles: string[]): boolean {
  return allowedRoles.includes(context.role);
}
