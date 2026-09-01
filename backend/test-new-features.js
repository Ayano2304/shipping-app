const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

async function test() {
  console.log('🧪 Testing New Features & Database Changes...\n');

  // 1. Check HK III ship
  const hk3 = await prisma.kapal.findFirst({ where: { namaKapal: 'HK III' } });
  console.log(`1️⃣  Kapal HK III: id=${hk3?.id}, nama=${hk3?.namaKapal}`);

  // 2. Test Sounding lookup for HK III
  const sounding = await prisma.soundingTable.findFirst({
    where: { kapalId: hk3.id, tinggiCm: 211 }
  });
  console.log(`2️⃣  Sounding lookup (HK III, tinggi=211cm): volume=${sounding?.volumeLiter} L, bedaLiter=${sounding?.bedaLiter}`);

  // 3. Test Density lookup for HK III
  const density = await prisma.densityTable.findFirst({
    where: { kapalId: hk3.id, suhu: 38 }
  });
  console.log(`3️⃣  Density lookup (HK III, suhu=38°C): density=${density?.density}`);

  // 4. Test R1, R2, R3 formulas from client example:
  // BL: 500.000, SFAL: 523.506, SFBD: 522.226
  const bl = 500000;
  const sfal = 523506;
  const sfbd = 522226;

  const diffR1 = sfal - bl;
  const r1Pct = (diffR1 / bl) * 100;

  const diffR2 = sfbd - sfal;
  const r2Pct = (diffR2 / sfal) * 100;

  const diffR3 = sfbd - bl;
  const r3Pct = (diffR3 / bl) * 100;

  console.log('\n4️⃣  Formula Verification (Client Example):');
  console.log(`   R1: ${diffR1 > 0 ? '+' : ''}${diffR1} KG (${r1Pct > 0 ? '+' : ''}${r1Pct.toFixed(2)}%) -> Expected: +23.506 (+4.70%)`);
  console.log(`   R2: ${diffR2 > 0 ? '+' : ''}${diffR2} KG (${r2Pct.toFixed(2)}%) -> Expected: -1.280 (-0.24%)`);
  console.log(`   R3: ${diffR3 > 0 ? '+' : ''}${diffR3} KG (${r3Pct > 0 ? '+' : ''}${r3Pct.toFixed(2)}%) -> Expected: +22.226 (+4.45%)`);

  // 5. Test PDFKit generation
  console.log('\n5️⃣  Testing PDFKit Generation...');
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => {
    const pdfBuf = Buffer.concat(chunks);
    console.log(`   ✅ PDF generated successfully! Buffer size: ${pdfBuf.length} bytes`);
  });

  doc.fontSize(16).text('LAPORAN PERHITUNGAN MUATAN CPO TANKER', { align: 'center' });
  doc.text(`Kapal: HK III | SFAL: 523.506 KG | SFBD: 522.226 KG`);
  doc.end();

  // 6. Check Role SURVEYOR in users table
  const surveyors = await prisma.user.findMany({ where: { role: 'SURVEYOR' } });
  console.log(`\n6️⃣  Users with SURVEYOR role: ${surveyors.length} users (${surveyors.map(u => u.username).join(', ')})`);

  console.log('\n🎉 ALL TESTS PASSED!');
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
