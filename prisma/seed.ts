import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { KNOWN_TRACKER_DOMAINS } from '@guardian/shared';
import { UserRole } from '@guardian/shared';

const prisma = new PrismaClient();

async function main() {
  for (const domain of KNOWN_TRACKER_DOMAINS) {
    await prisma.domainReputation.upsert({
      where: { domain },
      create: { domain, isTracker: true, category: 'TRACKER', reputationScore: 10 },
      update: { isTracker: true },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@guardian.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
    update: {
      name: 'Platform Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
}

main().finally(() => prisma.$disconnect());
