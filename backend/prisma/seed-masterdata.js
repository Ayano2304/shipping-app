const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data Sounding untuk HK III (dari Excel)
const soundingData = [
  // Palka 1P
  { namaPalka: 'Palka 1P', tinggiCm: 150, volumeLiter: 0.0000, bedaLiter: 403.2258 },
  { namaPalka: 'Palka 1P', tinggiCm: 151, volumeLiter: 403.2258, bedaLiter: 403.2258 },
  { namaPalka: 'Palka 1P', tinggiCm: 152, volumeLiter: 806.4516, bedaLiter: 403.2258 },
  // ... (contoh data, lengkapi sesuai Excel)
  { namaPalka: 'Palka 1P', tinggiCm: 211, volumeLiter: 85121.0000, bedaLiter: 403.2258 },
  { namaPalka: 'Palka 1P', tinggiCm: 212, volumeLiter: 85524.2258, bedaLiter: 403.2258 },
  
  // Palka 1S
  { namaPalka: 'Palka 1S', tinggiCm: 150, volumeLiter: 0.0000, bedaLiter: 403.2258 },
  { namaPalka: 'Palka 1S', tinggiCm: 211, volumeLiter: 85121.0000, bedaLiter: 403.2258 },
  
  // Tambahkan palka lainnya...
];

// Data Density (dari Excel)
const densityData = [
  { suhu: 25, density: 0.9080 },
  { suhu: 26, density: 0.9070 },
  { suhu: 27, density: 0.9061 },
  { suhu: 28, density: 0.9051 },
  { suhu: 29, density: 0.9041 },
  { suhu: 30, density: 0.9032 },
  { suhu: 31, density: 0.9022 },
  { suhu: 32, density: 0.9012 },
  { suhu: 33, density: 0.9003 },
  { suhu: 34, density: 0.8993 },
  { suhu: 35, density: 0.8983 },
  { suhu: 36, density: 0.8974 },
  { suhu: 37, density: 0.8964 },
  { suhu: 38, density: 0.8954 },
  { suhu: 39, density: 0.8945 },
  { suhu: 40, density: 0.8935 },
  { suhu: 41, density: 0.8925 },
  { suhu: 42, density: 0.8916 },
  { suhu: 43, density: 0.8906 },
  { suhu: 44, density: 0.8897 },
  { suhu: 45, density: 0.8887 },
  { suhu: 46, density: 0.8877 },
  { suhu: 47, density: 0.8868 },
  { suhu: 48, density: 0.8858 },
  { suhu: 49, density: 0.8848 },
  { suhu: 50, density: 0.8839 },
  // ... lanjutkan hingga 74
];

// Data Faktor Koreksi (dari Excel)
const faktorKoreksiData = [
  { suhu: 25, faktorKoreksi: 1.015080 },
  { suhu: 26, faktorKoreksi: 1.014000 },
  { suhu: 27, faktorKoreksi: 1.012920 },
  { suhu: 28, faktorKoreksi: 1.011840 },
  { suhu: 29, faktorKoreksi: 1.010760 },
  { suhu: 30, faktorKoreksi: 1.009680 },
  { suhu: 31, faktorKoreksi: 1.008600 },
  { suhu: 32, faktorKoreksi: 1.007520 },
  { suhu: 33, faktorKoreksi: 1.006440 },
  { suhu: 34, faktorKoreksi: 1.005360 },
  { suhu: 35, faktorKoreksi: 1.004280 },
  { suhu: 36, faktorKoreksi: 1.003200 },
  { suhu: 37, faktorKoreksi: 1.002120 },
  { suhu: 38, faktorKoreksi: 1.001040 },
  { suhu: 39, faktorKoreksi: 0.999960 },
  { suhu: 40, faktorKoreksi: 0.998880 },
  { suhu: 41, faktorKoreksi: 0.997800 },
  { suhu: 42, faktorKoreksi: 0.996720 },
  { suhu: 43, faktorKoreksi: 0.995640 },
  { suhu: 44, faktorKoreksi: 0.994560 },
  { suhu: 45, faktorKoreksi: 0.993480 },
  { suhu: 46, faktorKoreksi: 0.992400 },
  { suhu: 47, faktorKoreksi: 0.991320 },
  { suhu: 48, faktorKoreksi: 0.990240 },
  { suhu: 49, faktorKoreksi: 0.989160 },
  { suhu: 50, faktorKoreksi: 0.988080 },
  // ... lanjutkan hingga 74
];

async function seedMasterData() {
  try {
    console.log('🌱 Seeding master data...');

    // Clear existing data
    await prisma.soundingTable.deleteMany({});
    await prisma.densityTable.deleteMany({});
    await prisma.faktorKoreksiTable.deleteMany({});

    // Seed Sounding Table
    console.log('📊 Seeding sounding table...');
    await prisma.soundingTable.createMany({
      data: soundingData,
      skipDuplicates: true,
    });

    // Seed Density Table
    console.log('🌡️  Seeding density table...');
    await prisma.densityTable.createMany({
      data: densityData,
      skipDuplicates: true,
    });

    // Seed Faktor Koreksi Table
    console.log('📐 Seeding faktor koreksi table...');
    await prisma.faktorKoreksiTable.createMany({
      data: faktorKoreksiData,
      skipDuplicates: true,
    });

    console.log('✅ Master data seeded successfully!');
    console.log(`   - Sounding: ${soundingData.length} records`);
    console.log(`   - Density: ${densityData.length} records`);
    console.log(`   - Faktor Koreksi: ${faktorKoreksiData.length} records`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedMasterData();
}

module.exports = { seedMasterData };
