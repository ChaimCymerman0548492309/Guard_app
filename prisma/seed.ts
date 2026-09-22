import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Production/Docker-safe seed — no workspace imports (Render entrypoint). */
async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@guardian.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      passwordHash,
      role: 'ADMIN',
    },
    update: {
      name: 'Platform Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
}

main()
  .then(() => {
    console.info('Admin user seeded:', (process.env.ADMIN_EMAIL ?? 'admin@guardian.local').toLowerCase());
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
