const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const count = await prisma.$queryRaw`SELECT COUNT(*) FROM notifikasi`;
  console.log('Notifikasi count:', count);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
