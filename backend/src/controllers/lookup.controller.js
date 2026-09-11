const prisma = require('../lib/prisma');

// GET /api/lookup/volume?kapalId=1&tinggi=211&point=0.5&namaPalka=PALKA%201%20P
exports.lookupVolume = async (req, res) => {
  try {
    const { kapalId, tinggi, point, namaPalka } = req.query;
    
    if (!kapalId || !tinggi) {
      return res.status(400).json({ error: 'kapalId dan tinggi wajib diisi' });
    }

    const kapalIdInt = parseInt(kapalId);
    const tinggiInt = parseInt(tinggi);
    const pointDecimal = parseFloat(point || 0);

    let data = null;

    // Jika namaPalka dikirim, coba cari spesifik palka terlebih dahulu
    if (namaPalka && typeof namaPalka === 'string' && namaPalka.trim()) {
      const cleanNama = namaPalka.trim();
      // 1. Coba exact case-insensitive match
      data = await prisma.soundingTable.findFirst({
        where: {
          kapalId: kapalIdInt,
          tinggiCm: tinggiInt,
          namaPalka: { equals: cleanNama, mode: 'insensitive' }
        }
      });

      // 2. Jika belum ketemu, coba normalisasi format misal '1P' match 'PALKA 1 P'
      if (!data) {
        const compact = cleanNama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const allPalkaRows = await prisma.soundingTable.findMany({
          where: { kapalId: kapalIdInt, tinggiCm: tinggiInt }
        });
        data = allPalkaRows.find(r => {
          const rCompact = (r.namaPalka || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return rCompact === compact || rCompact.endsWith(compact) || compact.endsWith(rCompact);
        });
      }
    }

    // 3. Fallback jika masih belum ketemu atau namaPalka tidak dikirim
    if (!data) {
      data = await prisma.soundingTable.findFirst({
        where: { kapalId: kapalIdInt, tinggiCm: tinggiInt }
      });
    }

    if (!data) {
      return res.status(404).json({ 
        error: `Data sounding tidak ditemukan untuk kapal ini pada tinggi ${tinggiInt}cm${namaPalka ? ` (${namaPalka})` : ''}` 
      });
    }

    // Hitung volume dengan interpolasi point
    const volumeBase = parseFloat(data.volumeLiter);
    const bedaLiter = parseFloat(data.bedaLiter || 403);
    const volume = volumeBase + (pointDecimal * bedaLiter);
    
    res.json({ 
      volume: parseFloat(volume.toFixed(4)), 
      volumeBase: parseFloat(volumeBase.toFixed(4)),
      bedaLiter: parseFloat(bedaLiter.toFixed(4)),
      tinggiCm: tinggiInt, 
      point: pointDecimal,
      namaPalka: data.namaPalka || ''
    });
  } catch (err) {
    console.error('Lookup volume error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/lookup/density?kapalId=1&suhu=38
exports.lookupDensity = async (req, res) => {
  try {
    const { kapalId, suhu } = req.query;
    
    if (!kapalId || !suhu) {
      return res.status(400).json({ error: 'kapalId dan suhu wajib diisi' });
    }

    const suhuInt = parseInt(suhu);
    const data = await prisma.densityTable.findFirst({ 
      where: { kapalId: parseInt(kapalId), suhu: suhuInt } 
    });
    
    if (!data) {
      return res.status(404).json({ 
        error: `Data density tidak ditemukan untuk kapal ini pada suhu ${suhuInt}°C` 
      });
    }
    
    res.json({ 
      density: parseFloat(data.density), 
      suhu: suhuInt 
    });
  } catch (err) {
    console.error('Lookup density error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/lookup/tinggi-range - range tinggi dan suhu yang tersedia per kapal
exports.getTinggiRange = async (req, res) => {
  try {
    const { kapalId } = req.query;
    const whereKapal = kapalId ? { kapalId: parseInt(kapalId) } : {};
    
    const [soundingData, densityData] = await Promise.all([
      prisma.soundingTable.findMany({
        where: whereKapal,
        select: { tinggiCm: true },
        orderBy: { tinggiCm: 'asc' },
        distinct: ['tinggiCm']
      }),
      prisma.densityTable.findMany({
        where: whereKapal,
        select: { suhu: true },
        orderBy: { suhu: 'asc' },
        distinct: ['suhu']
      })
    ]);
    
    if (soundingData.length === 0 && densityData.length === 0) {
      return res.json({
        min: null,
        max: null,
        count: 0,
        minSuhu: null,
        maxSuhu: null,
        densityCount: 0,
        available: []
      });
    }

    res.json({
      min: soundingData.length > 0 ? soundingData[0].tinggiCm : null,
      max: soundingData.length > 0 ? soundingData[soundingData.length - 1].tinggiCm : null,
      count: soundingData.length,
      minSuhu: densityData.length > 0 ? densityData[0].suhu : null,
      maxSuhu: densityData.length > 0 ? densityData[densityData.length - 1].suhu : null,
      densityCount: densityData.length,
      available: soundingData.map(d => d.tinggiCm)
    });
  } catch (err) {
    console.error('Get tinggi range error:', err);
    res.status(500).json({ error: err.message });
  }
};
