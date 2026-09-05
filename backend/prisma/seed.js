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

  // Seed surveyor user
  const surveyorPassword = await bcrypt.hash('surveyor123', 10);
  const surveyor = await prisma.user.upsert({
    where: { username: 'surveyor1' },
    update: {},
    create: {
      nama: 'Siti Rahma',
      username: 'surveyor1',
      password: surveyorPassword,
      role: 'SURVEYOR',
    },
  });
  console.log('✅ Surveyor user:', surveyor.username);

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
