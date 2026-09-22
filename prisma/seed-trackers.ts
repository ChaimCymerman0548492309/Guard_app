import { PrismaClient } from '@prisma/client';
import { KNOWN_TRACKER_DOMAINS } from '@guardian/shared';

const prisma = new PrismaClient();

/** Dev/local: populate tracker domain DB (requires monorepo workspace). */
async function main() {
  for (const domain of KNOWN_TRACKER_DOMAINS) {
    await prisma.domainReputation.upsert({
      where: { domain },
      create: { domain, isTracker: true, category: 'TRACKER', reputationScore: 10 },
      update: { isTracker: true },
    });
  }
}

main().finally(() => prisma.$disconnect());
