const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const soundingCount = await prisma.soundingTable.count();
    const densityCount = await prisma.densityTable.count();
    
    console.log('✅ Verification Results:');
    console.log('   - Sounding Table:', soundingCount, 'rows');
    console.log('   - Density Table:', densityCount, 'rows');
    
    if (soundingCount === 121 && densityCount === 50) {
      console.log('\n🎉 Data seeding berhasil!');
    } else {
      console.log('\n⚠️ Data belum lengkap. Jalankan: node prisma/seed-new-data.js');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
