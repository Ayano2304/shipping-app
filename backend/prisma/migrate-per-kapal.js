/**
 * Migration Script: Restructure SoundingTable & DensityTable per Kapal
 * 
 * This script:
 * 1. Creates kapal "HK III" if not exists
 * 2. Adds kapal_id column to sounding_table and density_table
 * 3. Assigns all existing data to HK III
 * 4. Makes kapal_id NOT NULL
 * 5. Updates unique constraints
 * 6. Updates Role enum (PETUGAS → SURVEYOR)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration: SoundingTable & DensityTable per Kapal...\n');

  // Step 1: Create HK III kapal if not exists
  console.log('1️⃣  Creating kapal HK III...');
  let hkiii = await prisma.kapal.findFirst({ where: { namaKapal: 'HK III' } });
  if (!hkiii) {
    hkiii = await prisma.kapal.create({ data: { namaKapal: 'HK III' } });
    console.log(`   ✅ Created kapal HK III with id=${hkiii.id}`);
  } else {
    console.log(`   ⏭️  Kapal HK III already exists with id=${hkiii.id}`);
  }

  // Step 2: Raw SQL to add kapal_id columns and migrate data
  console.log('\n2️⃣  Adding kapal_id to sounding_table...');
  
  // Check if kapal_id column already exists in sounding_table
  const soundingCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'sounding_table' AND column_name = 'kapal_id'
  `;
  
  if (soundingCols.length === 0) {
    // Add nullable column first
    await prisma.$executeRawUnsafe(`ALTER TABLE sounding_table ADD COLUMN kapal_id INTEGER`);
    console.log('   ✅ Added kapal_id column (nullable)');
    
    // Assign all existing data to HK III
    const updatedSounding = await prisma.$executeRawUnsafe(
      `UPDATE sounding_table SET kapal_id = ${hkiii.id} WHERE kapal_id IS NULL`
    );
    console.log(`   ✅ Assigned ${updatedSounding} sounding rows to HK III`);
    
    // Make NOT NULL
    await prisma.$executeRawUnsafe(`ALTER TABLE sounding_table ALTER COLUMN kapal_id SET NOT NULL`);
    console.log('   ✅ Made kapal_id NOT NULL');
    
    // Drop old unique constraint on tinggi_cm
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE sounding_table DROP CONSTRAINT IF EXISTS sounding_table_tinggi_cm_key`);
      console.log('   ✅ Dropped old unique constraint on tinggi_cm');
    } catch (e) {
      console.log('   ⏭️  No old unique constraint to drop');
    }
    
    // Add composite unique constraint
    await prisma.$executeRawUnsafe(
      `ALTER TABLE sounding_table ADD CONSTRAINT sounding_table_kapal_id_tinggi_cm_key UNIQUE (kapal_id, tinggi_cm)`
    );
    console.log('   ✅ Added composite unique constraint [kapal_id, tinggi_cm]');
    
    // Add foreign key
    await prisma.$executeRawUnsafe(
      `ALTER TABLE sounding_table ADD CONSTRAINT sounding_table_kapal_id_fkey FOREIGN KEY (kapal_id) REFERENCES kapal(id) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log('   ✅ Added foreign key to kapal');
  } else {
    console.log('   ⏭️  kapal_id already exists in sounding_table');
  }

  // Step 3: Same for density_table
  console.log('\n3️⃣  Adding kapal_id to density_table...');
  
  const densityCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'density_table' AND column_name = 'kapal_id'
  `;
  
  if (densityCols.length === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE density_table ADD COLUMN kapal_id INTEGER`);
    console.log('   ✅ Added kapal_id column (nullable)');
    
    const updatedDensity = await prisma.$executeRawUnsafe(
      `UPDATE density_table SET kapal_id = ${hkiii.id} WHERE kapal_id IS NULL`
    );
    console.log(`   ✅ Assigned ${updatedDensity} density rows to HK III`);
    
    await prisma.$executeRawUnsafe(`ALTER TABLE density_table ALTER COLUMN kapal_id SET NOT NULL`);
    console.log('   ✅ Made kapal_id NOT NULL');
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE density_table DROP CONSTRAINT IF EXISTS density_table_suhu_key`);
      console.log('   ✅ Dropped old unique constraint on suhu');
    } catch (e) {
      console.log('   ⏭️  No old unique constraint to drop');
    }
    
    await prisma.$executeRawUnsafe(
      `ALTER TABLE density_table ADD CONSTRAINT density_table_kapal_id_suhu_key UNIQUE (kapal_id, suhu)`
    );
    console.log('   ✅ Added composite unique constraint [kapal_id, suhu]');
    
    await prisma.$executeRawUnsafe(
      `ALTER TABLE density_table ADD CONSTRAINT density_table_kapal_id_fkey FOREIGN KEY (kapal_id) REFERENCES kapal(id) ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log('   ✅ Added foreign key to kapal');
  } else {
    console.log('   ⏭️  kapal_id already exists in density_table');
  }

  // Step 4: Update Role enum - Add SURVEYOR, keep PETUGAS temporarily for backward compat
  console.log('\n4️⃣  Updating Role enum...');
  try {
    // Check if SURVEYOR already exists
    const enumCheck = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'Role' AND pg_enum.enumlabel = 'SURVEYOR'
    `;
    
    if (enumCheck.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SURVEYOR'`);
      console.log('   ✅ Added SURVEYOR to Role enum');
    } else {
      console.log('   ⏭️  SURVEYOR already exists in Role enum');
    }
    
    // Migrate existing PETUGAS users to SURVEYOR
    const migratedUsers = await prisma.$executeRawUnsafe(
      `UPDATE users SET role = 'SURVEYOR' WHERE role = 'PETUGAS'`
    );
    console.log(`   ✅ Migrated ${migratedUsers} PETUGAS users to SURVEYOR`);
  } catch (e) {
    console.log(`   ⚠️  Role enum update: ${e.message}`);
  }

  // Step 5: Verify
  console.log('\n5️⃣  Verification...');
  const soundingCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM sounding_table WHERE kapal_id = ${hkiii.id}`;
  const densityCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM density_table WHERE kapal_id = ${hkiii.id}`;
  console.log(`   📊 Sounding entries for HK III: ${soundingCount[0].count}`);
  console.log(`   📊 Density entries for HK III: ${densityCount[0].count}`);
  
  const kapalCount = await prisma.kapal.count();
  console.log(`   📊 Total kapal: ${kapalCount}`);

  console.log('\n✅ Migration completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
