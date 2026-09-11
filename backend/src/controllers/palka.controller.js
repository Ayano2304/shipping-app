const prisma = require('../lib/prisma');

// Hitung berat palka dengan metode Excel (Rounding terpisah Tinggi + Point)
const hitungBerat = async (kapalId, tinggiCm, point, suhu, faktorKoreksi, namaPalka) => {
  if (!kapalId || !tinggiCm || suhu === undefined || suhu === null || !faktorKoreksi) return null;
  
  try {
    const kapalIdInt = parseInt(kapalId);
    const tinggiInt = parseInt(tinggiCm);
    let soundingData = null;

    // Lookup volume dari sounding table berdasarkan palka spesifik
    if (namaPalka && typeof namaPalka === 'string' && namaPalka.trim()) {
      const cleanNama = namaPalka.trim();
      // 1. Coba exact case-insensitive match
      soundingData = await prisma.soundingTable.findFirst({
        where: {
          kapalId: kapalIdInt,
          tinggiCm: tinggiInt,
          namaPalka: { equals: cleanNama, mode: 'insensitive' }
        }
      });

      // 2. Normalisasi format (misal: '3P' -> 'PALKA 3 P')
      if (!soundingData) {
        const compact = cleanNama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const allPalkaRows = await prisma.soundingTable.findMany({
          where: { kapalId: kapalIdInt, tinggiCm: tinggiInt }
        });
        soundingData = allPalkaRows.find(r => {
          const rCompact = (r.namaPalka || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return rCompact === compact || rCompact.endsWith(compact) || compact.endsWith(rCompact);
        });
      }
    }

    // 3. Fallback jika namaPalka belum ada atau belum cocok
    if (!soundingData) {
      soundingData = await prisma.soundingTable.findFirst({
        where: { kapalId: kapalIdInt, tinggiCm: tinggiInt }
      });
    }
    
    if (!soundingData) return null;
    
    // Lookup density dari density table
    const densityData = await prisma.densityTable.findFirst({
      where: { kapalId: kapalIdInt, suhu: parseInt(suhu) }
    });
    
    if (!densityData) return null;
    
    // Hitung volume dasar & volume point
    const volumeBase = parseFloat(soundingData.volumeLiter);
    const bedaLiter = parseFloat(soundingData.bedaLiter || 403);
    const pointValue = parseFloat(point || 0);
    const volumePoint = pointValue * bedaLiter;
    const volumeFinal = volumeBase + volumePoint;
    
    const density = parseFloat(densityData.density);
    const faktor = parseFloat(faktorKoreksi || 1.0);
    
    // Standar sounding maritim / Berita Acara: Volume dibulatkan ke liter bulat, kemudian dikalikan density & faktor
    const volumeBulat = Math.round(volumeFinal);
    const beratHasil = Math.round(volumeBulat * density * faktor);
    
    return {
      volumeLiter: volumeFinal,
      density: density,
      beratHasil: beratHasil
    };
  } catch (err) {
    console.error('Error hitungBerat:', err);
    return null;
  }
};

exports.getByPengiriman = async (req, res) => {
  try {
    const palka = await prisma.dataPalka.findMany({
      where: { pengirimanId: parseInt(req.params.pengirimanId) },
      orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }],
    });
    res.json(palka);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveBatch = async (req, res) => {
  try {
    const { pengirimanId, tipe, palkaList } = req.body;
    if (!pengirimanId || !tipe || !palkaList) {
      return res.status(400).json({ error: 'Data tidak lengkap.' });
    }

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: parseInt(pengirimanId) },
      select: { kapalId: true, createdById: true, status: true }
    });
    if (!pengiriman) return res.status(404).json({ error: 'Pengiriman tidak ditemukan.' });

    // Integritas data: Jangan izinkan modifikasi sounding jika pengiriman sudah SELESAI kecuali ADMIN atau jika data kedatangan belum ada
    const existingKedatanganCount = await prisma.dataPalka.count({
      where: { pengirimanId: parseInt(pengirimanId), tipe: 'KEDATANGAN' }
    });

    if (pengiriman.status === 'SELESAI' && req.user.role !== 'ADMIN' && existingKedatanganCount > 0) {
      return res.status(403).json({
        error: 'Data sounding pengiriman ini telah dikunci karena status sudah SELESAI. Hanya Admin yang dapat merevisi.'
      });
    }
    
    let kapalId = req.body.kapalId || pengiriman.kapalId;

    if (tipe.toUpperCase() === 'KEBERANGKATAN') {
      if (req.user.role === 'SURVEYOR') {
        return res.status(403).json({
          error: 'Sebagai Surveyor Bongkar, Anda hanya berwenang menginput sounding kedatangan (SFBD).'
        });
      }
    }

    if (tipe.toUpperCase() === 'KEDATANGAN') {
      if (req.user.role === 'PETUGAS') {
        return res.status(403).json({
          error: 'Sebagai Petugas Muat, Anda hanya berwenang menginput sounding keberangkatan (SFAL). Sounding kedatangan harus diinput oleh Surveyor Bongkar atau Admin.'
        });
      }
      // Update dischargedById pada pengiriman
      await prisma.pengiriman.update({
        where: { id: parseInt(pengirimanId) },
        data: { dischargedById: req.user.id }
      });
    }

    // Hapus data palka lama untuk tipe ini
    await prisma.dataPalka.deleteMany({
      where: { pengirimanId: parseInt(pengirimanId), tipe: tipe.toUpperCase() }
    });

    // Hitung berat untuk setiap palka dan insert
    const dataToInsert = [];
    for (const [i, p] of palkaList.entries()) {
      const calc = await hitungBerat(
        kapalId,
        p.tinggiCm,
        p.point,
        p.suhu,
        p.faktorKoreksi || 1.0,
        p.namaPalka
      );
      
      dataToInsert.push({
        pengirimanId: parseInt(pengirimanId),
        tipe: tipe.toUpperCase(),
        urutan: i + 1,
        namaPalka: p.namaPalka,
        tinggiCm: p.tinggiCm ? parseInt(p.tinggiCm) : null,
        point: p.point !== undefined && p.point !== null && p.point !== '' ? parseFloat(p.point) : null,
        suhu: p.suhu ? parseInt(p.suhu) : null,
        faktorKoreksi: p.faktorKoreksi ? parseFloat(p.faktorKoreksi) : 1.0,
        volumeLiter: calc ? calc.volumeLiter : (p.volumeLiter ? parseFloat(p.volumeLiter) : null),
        density: calc ? calc.density : (p.density ? parseFloat(p.density) : null),
        beratHasil: calc ? calc.beratHasil : null,
      });
    }

    const created = await prisma.dataPalka.createMany({
      data: dataToInsert,
    });

    res.json({ message: 'Data palka berhasil disimpan.', count: created.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.dataPalka.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Palka berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
