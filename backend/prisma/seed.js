const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      nama: 'Administrator',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      kontakWa: '628123456789',
    },
  });
  console.log('✅ Admin user:', admin.username);

  // Seed petugas user
  const petugasPassword = await bcrypt.hash('petugas123', 10);
  const petugas = await prisma.user.upsert({
    where: { username: 'petugas1' },
    update: {},
    create: {
      nama: 'Budi Santoso',
      username: 'petugas1',
      password: petugasPassword,
      role: 'PETUGAS',
      kontakWa: '628987654321',
    },
  });
  console.log('✅ Petugas user:', petugas.username);

  // Seed viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 10);
  const viewer = await prisma.user.upsert({
    where: { username: 'viewer1' },
    update: {},
    create: {
      nama: 'Siti Rahma',
      username: 'viewer1',
      password: viewerPassword,
      role: 'VIEWER',
    },
  });
  console.log('✅ Viewer user:', viewer.username);

  // Seed kapal
  const kapalData = [
    { namaKapal: 'MT Permata Nusantara' },
    { namaKapal: 'MT Sinar Bahari' },
    { namaKapal: 'MT Armada Jaya' },
    { namaKapal: 'MT Buana Sentosa' },
  ];

  for (const k of kapalData) {
    const kapal = await prisma.kapal.upsert({
      where: { namaKapal: k.namaKapal },
      update: {},
      create: k,
    });
    console.log('✅ Kapal:', kapal.namaKapal);
  }

  console.log('\n🎉 Seeding selesai!');
  console.log('---');
  console.log('Login credentials:');
  console.log('  Admin   : admin / admin123');
  console.log('  Petugas : petugas1 / petugas123');
  console.log('  Viewer  : viewer1 / viewer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
