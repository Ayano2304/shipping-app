const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Sounding Table
  const sounding = await p.soundingTable.findMany({ orderBy: { tinggiCm: 'asc' } });
  console.log('=== SOUNDING TABLE ===');
  console.log('Total rows:', sounding.length);
  console.log('\nSample (first 30):');
  sounding.slice(0, 30).forEach(d => {
    console.log(`  tinggiCm=${d.tinggiCm}, volumeLiter=${parseFloat(d.volumeLiter)}, bedaLiter=${parseFloat(d.bedaLiter)}, kapalId=${d.kapalId}`);
  });

  console.log('\n... (last 10):');
  sounding.slice(-10).forEach(d => {
    console.log(`  tinggiCm=${d.tinggiCm}, volumeLiter=${parseFloat(d.volumeLiter)}, bedaLiter=${parseFloat(d.bedaLiter)}, kapalId=${d.kapalId}`);
  });

  // Density Table
  const density = await p.densityTable.findMany({ orderBy: { suhu: 'asc' } });
  console.log('\n=== DENSITY TABLE ===');
  console.log('Total rows:', density.length);
  density.forEach(d => {
    console.log(`  suhu=${d.suhu}, density=${parseFloat(d.density)}, kapalId=${d.kapalId}`);
  });

  await p.$disconnect();
})();
