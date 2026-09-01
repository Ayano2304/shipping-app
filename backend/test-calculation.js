const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCalculation() {
  console.log('\n🧪 Test Kasus dari User:\n');
  console.log('Input: Tinggi = 151 cm, Point = 0, Suhu = 32°C\n');
  
  // Get data from DB
  const vol = await prisma.soundingTable.findFirst({ where: { tinggiCm: 151 } });
  const den = await prisma.densityTable.findFirst({ where: { suhu: 32 } });
  
  console.log('Data dari Database:');
  console.log(`  Volume (tinggi 151): ${vol.volumeLiter} liter`);
  console.log(`  Density (suhu 32): ${den.density}`);
  
  // Calculate
  const point = 0;
  const faktorKoreksi = 1.000000;
  
  const volumeFinal = parseFloat(vol.volumeLiter) + (parseFloat(point) * 403);
  const berat = volumeFinal * parseFloat(den.density) * faktorKoreksi;
  
  console.log('\nPerhitungan:');
  console.log(`  Volume Final = ${vol.volumeLiter} + (${point} × 403) = ${volumeFinal} liter`);
  console.log(`  Berat = ${volumeFinal} × ${den.density} × ${faktorKoreksi}`);
  console.log(`  Berat = ${berat.toFixed(4)} KG`);
  
  console.log('\n✅ Hasil Akhir:');
  console.log(`  Volume: ${volumeFinal.toFixed(4)} liter`);
  console.log(`  Density: ${den.density}`);
  console.log(`  Berat: ${berat.toFixed(4)} KG`);
  
  console.log('\n📝 Expected dari User:');
  console.log(`  Volume: 60853.0000 liter`);
  console.log(`  Density: 0.9021`);
  console.log(`  Berat: ${(60853 * 0.9021).toFixed(4)} KG`);
  
  await prisma.$disconnect();
}

testCalculation().catch(console.error);

