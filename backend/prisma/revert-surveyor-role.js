const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertRole() {
  console.log('🔄 Reverting SURVEYOR role to PETUGAS...\n');

  // 1. Update any users with role 'SURVEYOR' back to 'PETUGAS'
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE users SET role = 'PETUGAS' WHERE role = 'SURVEYOR'`
  );
  console.log(`✅ Updated ${updated} user(s) from SURVEYOR to PETUGAS.`);

  // 2. List all users and their roles
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  console.log('\n📋 Current Users:');
  console.table(users);
}

revertRole()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
