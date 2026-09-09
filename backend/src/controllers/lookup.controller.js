const prisma = require('../lib/prisma');

// GET /api/lookup/volume?kapalId=1&tinggi=211&point=0.5
exports.lookupVolume = async (req, res) => {
  try {
    const { kapalId, tinggi, point } = req.query;
    
    if (!kapalId || !tinggi) {
      return res.status(400).json({ error: 'kapalId dan tinggi wajib diisi' });
    }

    const tinggiInt = parseInt(tinggi);
    const pointDecimal = parseFloat(point || 0);

    // Cari data di sounding table
    const data = await prisma.soundingTable.findFirst({
      where: { kapalId: parseInt(kapalId), tinggiCm: tinggiInt }
    });

    if (!data) {
      return res.status(404).json({ 
        error: `Data sounding tidak ditemukan untuk kapal ini pada tinggi ${tinggiInt}cm` 
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
      point: pointDecimal
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
