import { execSync } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const serverDir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(serverDir, '.env') });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required to run tests. Use a dedicated disposable PostgreSQL database.');
}

const adminUrl = new URL(testDatabaseUrl);
if (!['postgres:', 'postgresql:'].includes(adminUrl.protocol)) {
  throw new Error('TEST_DATABASE_URL must use PostgreSQL.');
}
adminUrl.searchParams.set('schema', 'public');

function databaseIdentity(url: URL): string {
  return `${url.protocol}//${url.hostname}:${url.port}${url.pathname}`;
}

const developmentDatabaseUrl = process.env.DATABASE_URL;
if (developmentDatabaseUrl && databaseIdentity(new URL(developmentDatabaseUrl)) === databaseIdentity(adminUrl)) {
  throw new Error('TEST_DATABASE_URL must point to a separate database from DATABASE_URL.');
}

// Each test file receives a separate PostgreSQL schema. This keeps the existing per-file
// isolation while preventing tests from ever using DATABASE_URL (the development database).
const testSchema = `tf_test_${crypto.randomBytes(8).toString('hex')}`;
const schemaUrl = new URL(testDatabaseUrl);
schemaUrl.searchParams.set('schema', testSchema);

process.env.DATABASE_URL = adminUrl.toString();
execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', {
  cwd: serverDir,
  env: process.env,
  input: `CREATE SCHEMA "${testSchema}";`,
  stdio: ['pipe', 'ignore', 'ignore'],
});

process.env.DATABASE_URL = schemaUrl.toString();
execSync('npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma', {
  cwd: serverDir,
  env: process.env,
  stdio: 'ignore',
});

afterAll(async () => {
  const { prisma } = await import('../config/prisma-client');
  await prisma.$disconnect();

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await admin.$disconnect();
});
