const prisma = require('../lib/prisma');
const XLSX = require('xlsx');

// GET /api/masterdata/sounding
exports.getSoundingTable = async (req, res) => {
  try {
    const { kapalId, namaPalka, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (kapalId) where.kapalId = parseInt(kapalId);
    if (namaPalka && namaPalka.trim() && namaPalka !== 'ALL') {
      where.namaPalka = { equals: namaPalka.trim(), mode: 'insensitive' };
    }
    if (search && !isNaN(parseInt(search))) {
      where.tinggiCm = parseInt(search);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.soundingTable.findMany({
        where,
        include: { kapal: true },
        orderBy: [{ kapalId: 'asc' }, { namaPalka: 'asc' }, { tinggiCm: 'asc' }],
        skip,
        take: parseInt(limit)
      }),
      prisma.soundingTable.count({ where })
    ]);

    let palkaList = [];
    if (kapalId) {
      palkaList = await prisma.palkaKapal.findMany({
        where: { kapalId: parseInt(kapalId) },
        orderBy: { urutan: 'asc' }
      });
    }

    res.json({
      data,
      palkaList,
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
    const { kapalId, search } = req.query;
    const where = {};
    if (kapalId) where.kapalId = parseInt(kapalId);
    if (search && !isNaN(parseInt(search))) {
      where.suhu = parseInt(search);
    }
    
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

    // Sheet 1: Sounding Table (Format Multi-Palka Standar Maritim & Kompartemen)
    const soundingHeaders = [
      ['PALKA 1 P', null, null, null, 'PALKA 1 S', null, null, null, 'PALKA 2 P', null, null, null, 'PALKA 2 S', null, null, null, 'PALKA 3 P', null, null, null, 'PALKA 3 S'],
      ['Tinggi cm', 'Volume liter', 'Beda  liter', null, 'Tinggi cm', 'Volume liter', 'Beda  liter', null, 'Tinggi cm', 'Volume liter', 'Beda  liter', null, 'Tinggi cm', 'Volume liter', 'Beda  liter', null, 'Tinggi cm', 'Volume liter', 'Beda  liter', null, 'Tinggi cm', 'Volume liter', 'Beda  liter']
    ];
    const soundingSample = [
      [150, 60450, 403, null, 150, 60450, 403, null, 150, 60451, 403, null, 150, 60451, 403, null, 150, 60451, 403, null, 150, 60451, 403],
      [151, 60853, 403, null, 151, 60853, 403, null, 151, 60854, 403, null, 151, 60854, 403, null, 151, 60854, 403, null, 151, 60854, 403],
      [152, 61256, 403, null, 152, 61256, 403, null, 152, 61257, 403, null, 152, 61257, 403, null, 152, 61257, 403, null, 152, 61257, 403],
      [153, 61659, 403, null, 153, 61659, 403, null, 153, 61660, 403, null, 153, 61660, 403, null, 153, 61660, 403, null, 153, 61660, 403],
      [154, 62062, 403, null, 154, 62062, 403, null, 154, 62063, 403, null, 154, 62063, 403, null, 154, 62063, 403, null, 154, 62063, 403],
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
      ['PETUNJUK PENGISIAN TEMPLATE KALIBRASI KAPAL (SISTEM PALKA KONSTAN)'],
      [''],
      ['1. Sheet "Sounding":'],
      ['   - Baris 1: Nama kompartemen palka kapal (contoh: PALKA 1 P, PALKA 1 S, PALKA 2 P, dst).'],
      ['   - Baris 2: Sub-judul per kompartemen ("Tinggi cm", "Volume liter", "Beda  liter").'],
      ['   - Baris 3 ke bawah: Angka data kalibrasi.'],
      ['   - Sistem akan otomatis mendeteksi setiap kompartemen palka pada Baris 1 dan menjadikannya palka tetap kapal.'],
      ['   - Jika kapal hanya memiliki 1 set tabel sounding global, Anda dapat menggunakan format 3 kolom: Tinggi cm, Volume liter, Beda liter.'],
      [''],
      ['2. Sheet "Density":'],
      ['   - Kolom A (Temp): Nilai suhu cairan dalam derajat Celcius (°C) (angka bulat: 25, 26, dst).'],
      ['   - Kolom B (Density): Nilai kerapatan/densitas cairan pada suhu tersebut (desimal hingga 4 digit, misal: 0.9066).'],
      [''],
      ['3. Catatan Penting:'],
      ['   - Jangan mengubah nama sheet ("Sounding" dan "Density").'],
      ['   - Pastikan data sounding berurutan dari tinggi terendah ke tertinggi.'],
      ['   - Beda liter/cm merupakan selisih volume per 1 cm tinggi sounding.']
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
    let imported = { sounding: 0, density: 0, faktorKoreksi: 0, palka: 0 };

    // Cari sheet Density (case-insensitive)
    const densitySheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === 'density');
    if (densitySheetName) {
      const sheet = workbook.Sheets[densitySheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        await prisma.densityTable.deleteMany({ where: { kapalId: kapalIdInt } });
        
        const densityData = [];
        for (const row of jsonData) {
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
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (allRows.length > 0) {
        // Cek apakah format multi-palka (Baris 0 berisi nama palka di beberapa kolom)
        const row0 = allRows[0] || [];
        const palkaBlocks = [];
        for (let c = 0; c < row0.length; c++) {
          const val = row0[c];
          if (val && typeof val === 'string' && val.trim().length > 0) {
            palkaBlocks.push({
              namaPalka: val.trim().toUpperCase(),
              colIndex: c
            });
          }
        }

        const soundingData = [];

        if (palkaBlocks.length > 1) {
          // FORMAT MULTI-PALKA (seperti file HK III)
          await prisma.palkaKapal.deleteMany({ where: { kapalId: kapalIdInt } });
          for (let i = 0; i < palkaBlocks.length; i++) {
            await prisma.palkaKapal.create({
              data: {
                kapalId: kapalIdInt,
                namaPalka: palkaBlocks[i].namaPalka,
                urutan: i + 1
              }
            });
          }
          imported.palka = palkaBlocks.length;

          // Baca baris data (mulai baris 2)
          for (let r = 2; r < allRows.length; r++) {
            const row = allRows[r];
            if (!row || row.length === 0) continue;

            for (const block of palkaBlocks) {
              const tinggiVal = row[block.colIndex];
              const volumeVal = row[block.colIndex + 1];
              const bedaVal = row[block.colIndex + 2];

              if (tinggiVal !== undefined && tinggiVal !== null && tinggiVal !== '' &&
                  volumeVal !== undefined && volumeVal !== null && volumeVal !== '') {
                const tinggiCm = parseInt(tinggiVal);
                const volumeLiter = parseFloat(volumeVal);
                let bedaLiter = bedaVal !== undefined && bedaVal !== null && bedaVal !== '' ? parseFloat(bedaVal) : 403;

                if (!isNaN(tinggiCm) && !isNaN(volumeLiter)) {
                  soundingData.push({
                    kapalId: kapalIdInt,
                    namaPalka: block.namaPalka,
                    tinggiCm,
                    volumeLiter,
                    bedaLiter: isNaN(bedaLiter) ? 403 : bedaLiter
                  });
                }
              }
            }
          }
        } else {
          // FORMAT SINGLE TABLE
          const range = XLSX.utils.decode_range(sheet['!ref']);
          const defaultNamaPalka = palkaBlocks.length === 1 ? palkaBlocks[0].namaPalka : '';

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
              const bedaCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
              if (bedaCell && bedaCell.v !== undefined && bedaCell.v !== null && !isNaN(parseFloat(bedaCell.v))) {
                bedaLiter = parseFloat(bedaCell.v);
              } else {
                const nextVolumeCell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
                if (nextVolumeCell && nextVolumeCell.v !== undefined && nextVolumeCell.v !== null && !isNaN(parseFloat(nextVolumeCell.v))) {
                  bedaLiter = parseFloat(nextVolumeCell.v) - volumeLiter;
                } else {
                  bedaLiter = 403;
                }
              }

              soundingData.push({
                kapalId: kapalIdInt,
                namaPalka: defaultNamaPalka,
                tinggiCm,
                volumeLiter,
                bedaLiter: isNaN(bedaLiter) ? 403 : bedaLiter
              });
            }
          }
        }

        if (soundingData.length > 0) {
          await prisma.soundingTable.deleteMany({ where: { kapalId: kapalIdInt } });
          const chunkSize = 200;
          for (let i = 0; i < soundingData.length; i += chunkSize) {
            await prisma.soundingTable.createMany({
              data: soundingData.slice(i, i + chunkSize),
              skipDuplicates: true
            });
          }
          imported.sounding = soundingData.length;
        }
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
    const { kapalId, namaPalka = '', tinggiCm, volumeLiter, bedaLiter } = req.body;
    
    if (!kapalId || tinggiCm === undefined || volumeLiter === undefined) {
      return res.status(400).json({ error: 'kapalId, tinggiCm, dan volumeLiter wajib diisi' });
    }

    const data = await prisma.soundingTable.create({
      data: {
        kapalId: parseInt(kapalId),
        namaPalka: (namaPalka || '').trim().toUpperCase(),
        tinggiCm: parseInt(tinggiCm),
        volumeLiter: parseFloat(volumeLiter),
        bedaLiter: bedaLiter !== null && bedaLiter !== undefined && bedaLiter !== '' ? parseFloat(bedaLiter) : 403
      }
    });
    
    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Data sounding untuk palka dan tinggi ini sudah ada.' });
    }
    console.error('Create sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateSounding = async (req, res) => {
  try {
    const { id } = req.params;
    const { kapalId, namaPalka, tinggiCm, volumeLiter, bedaLiter } = req.body;
    
    const updateData = {};
    if (kapalId) updateData.kapalId = parseInt(kapalId);
    if (namaPalka !== undefined) updateData.namaPalka = (namaPalka || '').trim().toUpperCase();
    if (tinggiCm !== undefined) updateData.tinggiCm = parseInt(tinggiCm);
    if (volumeLiter !== undefined) updateData.volumeLiter = parseFloat(volumeLiter);
    if (bedaLiter !== undefined) updateData.bedaLiter = bedaLiter !== null && bedaLiter !== '' ? parseFloat(bedaLiter) : null;

    const data = await prisma.soundingTable.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Data sounding untuk kombinasi tersebut sudah ada.' });
    }
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
    res.json({ message: 'Data sounding berhasil dihapus' });
  } catch (err) {
    console.error('Delete sounding error:', err);
    res.status(500).json({ error: err.message });
  }
};

// CRUD operations for Density Table
exports.createDensity = async (req, res) => {
  try {
    const { kapalId, suhu, density } = req.body;
    if (!kapalId || suhu === undefined || density === undefined) {
      return res.status(400).json({ error: 'kapalId, suhu, dan density wajib diisi' });
    }

    const data = await prisma.densityTable.create({
      data: {
        kapalId: parseInt(kapalId),
        suhu: parseInt(suhu),
        density: parseFloat(density)
      }
    });
    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Data density untuk suhu ini sudah ada pada kapal tersebut.' });
    }
    console.error('Create density error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDensity = async (req, res) => {
  try {
    const { id } = req.params;
    const { suhu, density } = req.body;

    const updateData = {};
    if (suhu !== undefined) updateData.suhu = parseInt(suhu);
    if (density !== undefined) updateData.density = parseFloat(density);

    const data = await prisma.densityTable.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Data density untuk suhu tersebut sudah ada.' });
    }
    console.error('Update density error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDensity = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.densityTable.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Data density berhasil dihapus' });
  } catch (err) {
    console.error('Delete density error:', err);
    res.status(500).json({ error: err.message });
  }
};

// CRUD operations for Palka Kapal (Kompartemen Konstan)
exports.getPalkaKapal = async (req, res) => {
  try {
    const { kapalId } = req.params;
    const data = await prisma.palkaKapal.findMany({
      where: { kapalId: parseInt(kapalId) },
      orderBy: { urutan: 'asc' }
    });
    res.json(data);
  } catch (err) {
    console.error('Get palka kapal error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createPalkaKapal = async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { namaPalka, urutan } = req.body;
    if (!namaPalka || !namaPalka.trim()) {
      return res.status(400).json({ error: 'Nama palka wajib diisi' });
    }

    const kapalIdInt = parseInt(kapalId);
    let nextUrutan = urutan ? parseInt(urutan) : null;
    if (!nextUrutan) {
      const lastPalka = await prisma.palkaKapal.findFirst({
        where: { kapalId: kapalIdInt },
        orderBy: { urutan: 'desc' }
      });
      nextUrutan = (lastPalka?.urutan || 0) + 1;
    }

    const data = await prisma.palkaKapal.create({
      data: {
        kapalId: kapalIdInt,
        namaPalka: namaPalka.trim().toUpperCase(),
        urutan: nextUrutan
      }
    });
    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Nama palka tersebut sudah ada untuk kapal ini.' });
    }
    console.error('Create palka kapal error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePalkaKapal = async (req, res) => {
  try {
    const { id } = req.params;
    const { namaPalka, urutan } = req.body;

    const updateData = {};
    if (namaPalka !== undefined && namaPalka.trim()) updateData.namaPalka = namaPalka.trim().toUpperCase();
    if (urutan !== undefined) updateData.urutan = parseInt(urutan);

    const oldPalka = await prisma.palkaKapal.findUnique({ where: { id: parseInt(id) } });
    if (!oldPalka) return res.status(404).json({ error: 'Palka tidak ditemukan' });

    const data = await prisma.palkaKapal.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    if (updateData.namaPalka && updateData.namaPalka !== oldPalka.namaPalka) {
      await prisma.soundingTable.updateMany({
        where: { kapalId: oldPalka.kapalId, namaPalka: oldPalka.namaPalka },
        data: { namaPalka: updateData.namaPalka }
      });
    }

    res.json(data);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Nama palka sudah terdaftar di kapal ini.' });
    }
    console.error('Update palka kapal error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deletePalkaKapal = async (req, res) => {
  try {
    const { id } = req.params;
    const palka = await prisma.palkaKapal.findUnique({ where: { id: parseInt(id) } });
    if (!palka) return res.status(404).json({ error: 'Palka tidak ditemukan' });

    await prisma.soundingTable.deleteMany({
      where: { kapalId: palka.kapalId, namaPalka: palka.namaPalka }
    });

    await prisma.palkaKapal.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: `Palka ${palka.namaPalka} berhasil dihapus` });
  } catch (err) {
    console.error('Delete palka kapal error:', err);
    res.status(500).json({ error: err.message });
  }
};
