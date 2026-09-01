const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Creating kontak_wa table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "kontak_wa" (
        "id" SERIAL PRIMARY KEY,
        "nama" VARCHAR(100) NOT NULL,
        "nomor_wa" VARCHAR(50) NOT NULL,
        "jabatan" VARCHAR(100),
        "instansi" VARCHAR(100),
        "catatan" VARCHAR(255),
        "aktif" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Successfully created kontak_wa table!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
