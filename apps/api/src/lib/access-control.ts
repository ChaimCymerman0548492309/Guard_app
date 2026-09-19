import type { AuthUser } from '@guardian/shared';
import { UserRole } from '@guardian/shared';

export interface AccessContext {
  user: AuthUser;
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === UserRole.ADMIN;
}

export function canAccessOwner(ownerUserId: string, user: AuthUser): boolean {
  return isAdmin(user) || ownerUserId === user.id;
}

export function deviceWhereForUser(user: AuthUser): { userId?: string } {
  if (isAdmin(user)) return {};
  return { userId: user.id };
}
