const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Adding discharged_by column to pengiriman table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "pengiriman" 
      ADD COLUMN IF NOT EXISTS "discharged_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL;
    `);
    console.log('Successfully updated database column!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
