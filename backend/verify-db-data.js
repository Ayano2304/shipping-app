const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 Verifikasi Data di Database:\n');
  
  // Check tinggi 151
  const vol151 = await prisma.soundingTable.findFirst({ 
    where: { tinggiCm: 151 } 
  });
  console.log('✅ Tinggi 151 cm -> Volume:', vol151.volumeLiter, 'liter');
  console.log('   (Seharusnya: 60853)');
  
  // Check suhu 32
  const den32 = await prisma.densityTable.findFirst({ 
    where: { suhu: 32 } 
  });
  console.log('\n✅ Suhu 32°C -> Density:', den32.density);
  console.log('   (Seharusnya: 0.9021)');
  
  // Test perhitungan
  console.log('\n🧮 Test Perhitungan dengan Point = 0:');
  const point = 0;
  const volume = vol151.volumeLiter + (point * 403);
  const faktorKoreksi = 1.0;
  const berat = volume * den32.density * faktorKoreksi;
  
  console.log(`   Formula: (${vol151.volumeLiter} + ${point} × 403) × ${den32.density} × ${faktorKoreksi}`);
  console.log(`   Volume: ${volume} liter`);
  console.log(`   Berat: ${berat.toFixed(4)} KG`);
  console.log(`   Expected: ${(60853 * 0.9021).toFixed(4)} KG`);
  
  // Check count
  const soundingCount = await prisma.soundingTable.count();
  const densityCount = await prisma.densityTable.count();
  
  console.log('\n📊 Total Records:');
  console.log(`   SoundingTable: ${soundingCount} rows`);
  console.log(`   DensityTable: ${densityCount} rows`);
  
  await prisma.$disconnect();
}

verify().catch(console.error);
