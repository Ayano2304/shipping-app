const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding new soundingan data...');

  // 1. Hapus data lama
  await prisma.dataPalka.deleteMany({});
  await prisma.soundingTable.deleteMany({});
  await prisma.densityTable.deleteMany({});
  console.log('✅ Data lama dihapus');

  // 2. Insert Density Table (50 rows: suhu 25-74°C)
  const densityData = [
    { suhu: 25, density: 0.8652 }, { suhu: 26, density: 0.8644 }, { suhu: 27, density: 0.8636 },
    { suhu: 28, density: 0.8628 }, { suhu: 29, density: 0.8620 }, { suhu: 30, density: 0.8612 },
    { suhu: 31, density: 0.8604 }, { suhu: 32, density: 0.8596 }, { suhu: 33, density: 0.8588 },
    { suhu: 34, density: 0.8580 }, { suhu: 35, density: 0.8572 }, { suhu: 36, density: 0.8564 },
    { suhu: 37, density: 0.8556 }, { suhu: 38, density: 0.8548 }, { suhu: 39, density: 0.8540 },
    { suhu: 40, density: 0.8532 }, { suhu: 41, density: 0.8524 }, { suhu: 42, density: 0.8516 },
    { suhu: 43, density: 0.8508 }, { suhu: 44, density: 0.8500 }, { suhu: 45, density: 0.8492 },
    { suhu: 46, density: 0.8484 }, { suhu: 47, density: 0.8476 }, { suhu: 48, density: 0.8468 },
    { suhu: 49, density: 0.8460 }, { suhu: 50, density: 0.8452 }, { suhu: 51, density: 0.8444 },
    { suhu: 52, density: 0.8436 }, { suhu: 53, density: 0.8428 }, { suhu: 54, density: 0.8420 },
    { suhu: 55, density: 0.8412 }, { suhu: 56, density: 0.8404 }, { suhu: 57, density: 0.8396 },
    { suhu: 58, density: 0.8388 }, { suhu: 59, density: 0.8380 }, { suhu: 60, density: 0.8372 },
    { suhu: 61, density: 0.8364 }, { suhu: 62, density: 0.8356 }, { suhu: 63, density: 0.8348 },
    { suhu: 64, density: 0.8340 }, { suhu: 65, density: 0.8332 }, { suhu: 66, density: 0.8324 },
    { suhu: 67, density: 0.8316 }, { suhu: 68, density: 0.8308 }, { suhu: 69, density: 0.8300 },
    { suhu: 70, density: 0.8292 }, { suhu: 71, density: 0.8284 }, { suhu: 72, density: 0.8276 },
    { suhu: 73, density: 0.8268 }, { suhu: 74, density: 0.8260 },
  ];
  await prisma.densityTable.createMany({ data: densityData });
  console.log(`✅ Density table: ${densityData.length} rows inserted`);

  // 3. Insert Sounding Table (121 rows: tinggi 150-270cm, bedaLiter = 403)
  const soundingData = [];
  let volumeStart = 1500; // starting volume for tinggi 150cm
  for (let tinggi = 150; tinggi <= 270; tinggi++) {
    soundingData.push({
      tinggiCm: tinggi,
      volumeLiter: volumeStart,
      bedaLiter: 403,
    });
    volumeStart += 403; // increment by bedaLiter for next height
  }
  await prisma.soundingTable.createMany({ data: soundingData });
  console.log(`✅ Sounding table: ${soundingData.length} rows inserted`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
