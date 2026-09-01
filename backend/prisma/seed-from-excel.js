const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding data dari Excel files...');

  // 1. Hapus data lama
  await prisma.dataPalka.deleteMany({});
  await prisma.soundingTable.deleteMany({});
  await prisma.densityTable.deleteMany({});
  console.log('✅ Data lama dihapus');

  // 2. Baca Data_Density.xlsx untuk SoundingTable (Tinggi cm -> Volume liter)
  const volumeWorkbook = new ExcelJS.Workbook();
  await volumeWorkbook.xlsx.readFile(path.join(__dirname, '../../Data_Density.xlsx'));
  const volumeSheet = volumeWorkbook.worksheets[0];
  
  const soundingData = [];
  volumeSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const tinggiCm = row.getCell(1).value;
    const volumeLiter = row.getCell(2).value;
    
    if (tinggiCm && volumeLiter) {
      soundingData.push({
        tinggiCm: parseInt(tinggiCm),
        volumeLiter: parseFloat(volumeLiter),
        bedaLiter: 403, // Fixed value as per requirement
      });
    }
  });
  
  await prisma.soundingTable.createMany({ data: soundingData });
  console.log(`✅ Sounding table: ${soundingData.length} rows inserted`);
  console.log(`   Sample - Tinggi 151: ${soundingData.find(d => d.tinggiCm === 151)?.volumeLiter} liter`);

  // 3. Baca Data_Suhu.xlsx untuk DensityTable (Temp -> Density)
  const densityWorkbook = new ExcelJS.Workbook();
  await densityWorkbook.xlsx.readFile(path.join(__dirname, '../../Data_Suhu.xlsx'));
  const densitySheet = densityWorkbook.worksheets[0];
  
  const densityData = [];
  densitySheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const suhu = row.getCell(1).value;
    const density = row.getCell(2).value;
    
    if (suhu && density) {
      densityData.push({
        suhu: parseInt(suhu),
        density: parseFloat(density),
      });
    }
  });
  
  await prisma.densityTable.createMany({ data: densityData });
  console.log(`✅ Density table: ${densityData.length} rows inserted`);
  console.log(`   Sample - Suhu 32: ${densityData.find(d => d.suhu === 32)?.density} density`);

  console.log('🎉 Seeding completed successfully!');
  console.log('\n📊 Verification:');
  console.log(`   Total SoundingTable rows: ${soundingData.length}`);
  console.log(`   Total DensityTable rows: ${densityData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
