import type { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';
import type { ProfileInput } from '../schemas/profile.schemas';

export interface ProfileDto {
  name: string;
  mobile: string;
  address: string;
  businessName: string | null;
}

/** What the app needs to decide which screen to show after login or restart. */
export interface AccountSummary {
  id: string;
  email: string;
  emailVerified: boolean;
  profileComplete: boolean;
  hasSelectedTasks: boolean;
  profile: ProfileDto | null;
}

export async function getAccountSummary(prisma: PrismaClient, userId: string): Promise<AccountSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, _count: { select: { tasks: true } } },
  });
  // A valid token for a deleted user is treated like an expired session.
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.');

  const p = user.profile;
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    profileComplete: p !== null,
    hasSelectedTasks: user._count.tasks > 0,
    profile: p ? { name: p.name, mobile: p.mobile, address: p.address, businessName: p.businessName } : null,
  };
}

export async function saveProfile(
  prisma: PrismaClient,
  userId: string,
  input: ProfileInput,
): Promise<AccountSummary> {
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
  return getAccountSummary(prisma, userId);
}
