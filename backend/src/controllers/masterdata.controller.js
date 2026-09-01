const prisma = require('../lib/prisma');
const XLSX = require('xlsx');

// GET /api/masterdata/sounding
exports.getSoundingTable = async (req, res) => {
  try {
    const { kapalId, page = 1, limit = 100 } = req.query;
    const where = kapalId ? { kapalId: parseInt(kapalId) } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.soundingTable.findMany({
        where,
        include: { kapal: true },
        orderBy: [{ kapalId: 'asc' }, { tinggiCm: 'asc' }],
        skip,
        take: parseInt(limit)
      }),
      prisma.soundingTable.count({ where })
    ]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get sounding table error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/masterdata/density
exports.getDensityTable = async (req, res) => {
  try {
    const { kapalId } = req.query;
    const where = kapalId ? { kapalId: parseInt(kapalId) } : {};
    
    const data = await prisma.densityTable.findMany({ 
      where,
      include: { kapal: true },
      orderBy: [{ kapalId: 'asc' }, { suhu: 'asc' }]
    });
    res.json(data);
  } catch (err) {
    console.error('Get density table error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/masterdata/faktor-koreksi
exports.getFaktorKoreksiTable = async (req, res) => {
  try {
    const data = await prisma.faktorKoreksiTable.findMany({ 
      orderBy: { suhu: 'asc' } 
    });
    res.json(data);
  } catch (err) {
    console.error('Get faktor koreksi table error:', err);
    res.status(500).json({ error: err.message });
  }
};


// POST /api/masterdata/import-excel
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel wajib diupload' });
    }
    
    const { kapalId } = req.body;
    if (!kapalId) {
      return res.status(400).json({ error: 'kapalId wajib diisi' });
    }

    const kapalIdInt = parseInt(kapalId);
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    let imported = { sounding: 0, density: 0, faktorKoreksi: 0 };

    // Import Density Table
    if (workbook.SheetNames.includes('Density')) {
      const sheet = workbook.Sheets['Density'];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        await prisma.densityTable.deleteMany({ where: { kapalId: kapalIdInt } });
        
        const densityData = jsonData
          .filter(row => row.Temp && row.Density)
          .map(row => ({
            kapalId: kapalIdInt,
            suhu: parseInt(row.Temp),
            density: parseFloat(row.Density)
          }));

        await prisma.densityTable.createMany({
          data: densityData,
          skipDuplicates: true
        });
        
        imported.density = densityData.length;
      }
    }

    // Import Faktor Koreksi Table
    if (workbook.SheetNames.includes('Faktor Koreksi')) {
      const sheet = workbook.Sheets['Faktor Koreksi'];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        await prisma.faktorKoreksiTable.deleteMany({});
        
        const fkData = jsonData
          .filter(row => row.Temp && row['Faktor Koreksi'])
          .map(row => ({
            suhu: parseInt(row.Temp),
            faktorKoreksi: parseFloat(row['Faktor Koreksi'])
          }));

        await prisma.faktorKoreksiTable.createMany({
          data: fkData,
          skipDuplicates: true
        });
        
        imported.faktorKoreksi = fkData.length;
      }
    }

    // Import Sounding Table
    if (workbook.SheetNames.includes('Sounding')) {
      const sheet = workbook.Sheets['Sounding'];
      const range = XLSX.utils.decode_range(sheet['!ref']);
      await prisma.soundingTable.deleteMany({ where: { kapalId: kapalIdInt } });
      
      const soundingData = [];
      
      // Baca data per row
      for (let row = 1; row <= range.e.r; row++) {
        const tinggiCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
        if (!tinggiCell || !tinggiCell.v) continue;
        
        const tinggiCm = parseInt(tinggiCell.v);
        if (isNaN(tinggiCm)) continue;

        const volumeCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
        if (volumeCell && volumeCell.v) {
          const volumeLiter = parseFloat(volumeCell.v);
          
          let bedaLiter = null;
          const nextVolumeCell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
          if (nextVolumeCell && nextVolumeCell.v) {
            bedaLiter = parseFloat(nextVolumeCell.v) - volumeLiter;
          }

          soundingData.push({
            kapalId: kapalIdInt,
            tinggiCm,
            volumeLiter,
            bedaLiter
          });
        }
      }

      if (soundingData.length > 0) {
        await prisma.soundingTable.createMany({
          data: soundingData,
          skipDuplicates: true
        });
        imported.sounding = soundingData.length;
      }
    }

    res.json({ 
      message: 'Import berhasil', 
      imported,
      details: `Density: ${imported.density}, Faktor Koreksi: ${imported.faktorKoreksi}, Sounding: ${imported.sounding}`
    });
  } catch (err) {
    console.error('Import Excel error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Import Sounding Table from Excel
exports.importSoundingFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel wajib diupload' });
    }
    
    const { kapalId } = req.body;
    if (!kapalId) {
      return res.status(400).json({ error: 'kapalId wajib diisi' });
    }

    const kapalIdInt = parseInt(kapalId);
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    
    if (!workbook.SheetNames.includes('Sounding')) {
      return res.status(400).json({ error: 'Sheet "Sounding" tidak ditemukan' });
    }

    const sheet = workbook.Sheets['Sounding'];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    await prisma.soundingTable.deleteMany({ where: { kapalId: kapalIdInt } });
    
    const soundingData = [];
    
    // Baca data per row
    for (let row = 1; row <= range.e.r; row++) {
      const tinggiCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (!tinggiCell || !tinggiCell.v) continue;
      
      const tinggiCm = parseInt(tinggiCell.v);
      if (isNaN(tinggiCm)) continue;

      const volumeCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
      if (volumeCell && volumeCell.v) {
        const volumeLiter = parseFloat(volumeCell.v);
        
        let bedaLiter = null;
        const nextVolumeCell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
        if (nextVolumeCell && nextVolumeCell.v) {
          bedaLiter = parseFloat(nextVolumeCell.v) - volumeLiter;
        }

        soundingData.push({
          kapalId: kapalIdInt,
          tinggiCm,
          volumeLiter,
          bedaLiter
        });
      }
    }

    if (soundingData.length > 0) {
      await prisma.soundingTable.createMany({
        data: soundingData,
        skipDuplicates: true
      });
    }

    res.json({ 
      message: 'Import sounding berhasil', 
      count: soundingData.length
    });
  } catch (err) {
    console.error('Import sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};

// CRUD operations for Sounding Table
exports.createSounding = async (req, res) => {
  try {
    const { kapalId, tinggiCm, volumeLiter, bedaLiter } = req.body;
    
    const data = await prisma.soundingTable.create({
      data: {
        kapalId: parseInt(kapalId),
        tinggiCm: parseInt(tinggiCm),
        volumeLiter: parseFloat(volumeLiter),
        bedaLiter: bedaLiter ? parseFloat(bedaLiter) : null
      }
    });
    
    res.json(data);
  } catch (err) {
    console.error('Create sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateSounding = async (req, res) => {
  try {
    const { id } = req.params;
    const { kapalId, tinggiCm, volumeLiter, bedaLiter } = req.body;
    
    const data = await prisma.soundingTable.update({
      where: { id: parseInt(id) },
      data: {
        kapalId: parseInt(kapalId),
        tinggiCm: parseInt(tinggiCm),
        volumeLiter: parseFloat(volumeLiter),
        bedaLiter: bedaLiter ? parseFloat(bedaLiter) : null
      }
    });
    
    res.json(data);
  } catch (err) {
    console.error('Update sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSounding = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.soundingTable.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error('Delete sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};
