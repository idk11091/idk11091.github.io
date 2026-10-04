import dotenv from 'dotenv';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { DUMMY_PASSWORD_HASH } from '../src/lib/password';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');
  const emailValue = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
  if (!args.includes('--confirm') || !emailValue) {
    throw new Error('Usage: npm run firebase:bootstrap-admin -- --email you@example.com --confirm');
  }

  const email = z.string().email().parse(emailValue.trim()).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.isActive === false) {
    throw new Error('This PostgreSQL user is inactive. Activate it through the normal user administration process first.');
  }

  if (existing?.role === 'ADMIN') {
    console.log(`Active TestForge admin already exists for ${email}; no database changes made.`);
    return;
  }

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`Promoted the existing active PostgreSQL user ${email} to ADMIN.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: email.split('@')[0],
      role: 'ADMIN',
      isActive: true,
      passwordHash: DUMMY_PASSWORD_HASH,
    },
  });
  console.log(`Created an active TestForge ADMIN record for ${email}. Firebase login can now use this database role.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Could not bootstrap the Firebase admin.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
