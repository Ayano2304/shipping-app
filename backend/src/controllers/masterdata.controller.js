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


// GET /api/masterdata/template-excel
exports.downloadTemplateExcel = async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sounding Table
    const soundingHeaders = [['Tinggi (cm)', 'Volume (Liter)', 'Beda (Liter/cm)']];
    const soundingSample = [
      [150, 60450, 403],
      [151, 60853, 403],
      [152, 61256, 403],
      [153, 61659, 403],
      [154, 62062, 403],
    ];
    const wsSounding = XLSX.utils.aoa_to_sheet([...soundingHeaders, ...soundingSample]);
    XLSX.utils.book_append_sheet(wb, wsSounding, 'Sounding');

    // Sheet 2: Density Table
    const densityHeaders = [['Temp', 'Density']];
    const densitySample = [
      [25, 0.9066],
      [26, 0.9060],
      [27, 0.9063],
      [28, 0.9047],
      [29, 0.9040],
      [30, 0.9034],
      [31, 0.9028],
      [32, 0.9021],
    ];
    const wsDensity = XLSX.utils.aoa_to_sheet([...densityHeaders, ...densitySample]);
    XLSX.utils.book_append_sheet(wb, wsDensity, 'Density');

    // Sheet 3: Petunjuk Pengisian
    const petunjuk = [
      ['PETUNJUK PENGISIAN TEMPLATE KALIBRASI KAPAL'],
      [''],
      ['1. Sheet "Sounding":'],
      ['   - Kolom A (Tinggi cm): Nilai tinggi sounding dalam sentimeter (angka bulat tanpa desimal, misal: 100, 101, dst).'],
      ['   - Kolom B (Volume Liter): Kapasitas volume cairan pada tinggi tersebut dalam satuan Liter.'],
      ['   - Kolom C (Beda Liter/cm - Opsional): Kenaikan volume per 1 cm tinggi. Jika dikosongkan, sistem akan menghitung selisih antar baris secara otomatis.'],
      [''],
      ['2. Sheet "Density":'],
      ['   - Kolom A (Temp): Nilai suhu cairan dalam derajat Celcius (°C) (angka bulat, misal: 28, 29, dst).'],
      ['   - Kolom B (Density): Nilai density minyak/cairan pada suhu tersebut (desimal hingga 4 angka di belakang koma, misal: 0.8628).'],
      [''],
      ['3. Catatan Penting:'],
      ['   - Jangan mengubah nama sheet ("Sounding" dan "Density").'],
      ['   - Baris pertama pada setiap sheet adalah judul kolom (header).'],
      ['   - Pastikan data sounding diurutkan dari tinggi terendah ke tertinggi.'],
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjuk);
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Kalibrasi_Kapal.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Download template excel error:', err);
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
      return res.status(400).json({ error: 'kapalId wajib diisi. Silakan pilih kapal terlebih dahulu.' });
    }

    const kapalIdInt = parseInt(kapalId);
    const kapal = await prisma.kapal.findUnique({ where: { id: kapalIdInt } });
    if (!kapal) {
      return res.status(404).json({ error: 'Kapal yang dipilih tidak ditemukan di sistem.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    let imported = { sounding: 0, density: 0, faktorKoreksi: 0 };

    // Cari sheet Density (case-insensitive)
    const densitySheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === 'density');
    if (densitySheetName) {
      const sheet = workbook.Sheets[densitySheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        await prisma.densityTable.deleteMany({ where: { kapalId: kapalIdInt } });
        
        const densityData = [];
        for (const row of jsonData) {
          // Cari key temp & density secara fleksibel
          const tempKey = Object.keys(row).find(k => /^(temp|suhu|temperature)$/i.test(k.trim()));
          const densityKey = Object.keys(row).find(k => /^(density|kerapatan|densitas)$/i.test(k.trim()));

          if (tempKey && densityKey && row[tempKey] !== undefined && row[densityKey] !== undefined) {
            const suhu = parseInt(row[tempKey]);
            const density = parseFloat(row[densityKey]);
            if (!isNaN(suhu) && !isNaN(density)) {
              densityData.push({
                kapalId: kapalIdInt,
                suhu,
                density
              });
            }
          }
        }

        if (densityData.length > 0) {
          await prisma.densityTable.createMany({
            data: densityData,
            skipDuplicates: true
          });
          imported.density = densityData.length;
        }
      }
    }

    // Cari sheet Faktor Koreksi (jika ada)
    const fkSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim().replace(/[\s_-]/g, '') === 'faktorkoreksi');
    if (fkSheetName) {
      const sheet = workbook.Sheets[fkSheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        await prisma.faktorKoreksiTable.deleteMany({});
        
        const fkData = jsonData
          .filter(row => row.Temp && row['Faktor Koreksi'])
          .map(row => ({
            suhu: parseInt(row.Temp),
            faktorKoreksi: parseFloat(row['Faktor Koreksi'])
          }));

        if (fkData.length > 0) {
          await prisma.faktorKoreksiTable.createMany({
            data: fkData,
            skipDuplicates: true
          });
          imported.faktorKoreksi = fkData.length;
        }
      }
    }

    // Cari sheet Sounding (case-insensitive)
    const soundingSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === 'sounding');
    if (soundingSheetName) {
      const sheet = workbook.Sheets[soundingSheetName];
      const range = XLSX.utils.decode_range(sheet['!ref']);
      await prisma.soundingTable.deleteMany({ where: { kapalId: kapalIdInt } });
      
      const soundingData = [];
      
      // Baca data per row
      for (let row = 1; row <= range.e.r; row++) {
        const tinggiCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
        if (!tinggiCell || tinggiCell.v === undefined || tinggiCell.v === null || tinggiCell.v === '') continue;
        
        const tinggiCm = parseInt(tinggiCell.v);
        if (isNaN(tinggiCm)) continue;

        const volumeCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
        if (volumeCell && volumeCell.v !== undefined && volumeCell.v !== null && volumeCell.v !== '') {
          const volumeLiter = parseFloat(volumeCell.v);
          if (isNaN(volumeLiter)) continue;
          
          let bedaLiter = null;
          // Cek apakah ada kolom beda (kolom C / index 2)
          const bedaCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
          if (bedaCell && bedaCell.v !== undefined && bedaCell.v !== null && !isNaN(parseFloat(bedaCell.v))) {
            bedaLiter = parseFloat(bedaCell.v);
          } else {
            // Hitung otomatis dari selisih baris berikutnya
            const nextVolumeCell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
            if (nextVolumeCell && nextVolumeCell.v !== undefined && nextVolumeCell.v !== null && !isNaN(parseFloat(nextVolumeCell.v))) {
              bedaLiter = parseFloat(nextVolumeCell.v) - volumeLiter;
            }
          }

          soundingData.push({
            kapalId: kapalIdInt,
            tinggiCm,
            volumeLiter,
            bedaLiter
          });
        }
      }

      // Jika baris terakhir tidak memiliki bedaLiter, warisi dari baris sebelumnya
      for (let i = 0; i < soundingData.length; i++) {
        if (soundingData[i].bedaLiter === null || isNaN(soundingData[i].bedaLiter)) {
          if (i > 0 && soundingData[i - 1].bedaLiter !== null) {
            soundingData[i].bedaLiter = soundingData[i - 1].bedaLiter;
          } else {
            soundingData[i].bedaLiter = 0;
          }
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

    const details = [];
    if (imported.sounding > 0) details.push(`${imported.sounding} data sounding`);
    if (imported.density > 0) details.push(`${imported.density} data density`);
    if (imported.faktorKoreksi > 0) details.push(`${imported.faktorKoreksi} data faktor koreksi`);

    const summaryText = details.length > 0 
      ? details.join(', ') 
      : 'Tidak ada data valid yang ditemukan pada sheet Sounding / Density';

    res.json({ 
      message: `Import kalibrasi untuk kapal "${kapal.namaKapal}" berhasil.`, 
      imported,
      kapal: { id: kapal.id, namaKapal: kapal.namaKapal },
      details: summaryText
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
