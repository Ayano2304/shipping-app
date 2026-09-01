const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hitung berat palka dengan metode Excel (Rounding terpisah Tinggi + Point)
const hitungBerat = async (kapalId, tinggiCm, point, suhu, faktorKoreksi) => {
  if (!kapalId || !tinggiCm || suhu === undefined || suhu === null || !faktorKoreksi) return null;
  
  try {
    // Lookup volume dari sounding table
    const soundingData = await prisma.soundingTable.findFirst({
      where: { kapalId: parseInt(kapalId), tinggiCm: parseInt(tinggiCm) }
    });
    
    if (!soundingData) return null;
    
    // Lookup density dari density table
    const densityData = await prisma.densityTable.findFirst({
      where: { kapalId: parseInt(kapalId), suhu: parseInt(suhu) }
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
    
    // Metode Excel: Rounding terpisah Tinggi + Point
    const beratTinggi = Math.round(volumeBase * density * faktor);
    const beratPoint = pointValue > 0 ? Math.round(volumePoint * density * faktor) : 0;
    const beratHasil = beratTinggi + beratPoint;
    
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

    // Integritas data: Jangan izinkan modifikasi sounding jika pengiriman sudah SELESAI
    if (pengiriman.status === 'SELESAI' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Data sounding pengiriman ini telah dikunci karena status sudah SELESAI. Hanya Admin yang dapat merevisi.'
      });
    }
    
    let kapalId = req.body.kapalId || pengiriman.kapalId;

    if (tipe.toUpperCase() === 'KEDATANGAN') {
      if (req.user.role === 'PETUGAS' && pengiriman.createdById === req.user.id) {
        return res.status(403).json({
          error: 'Sebagai petugas pelabuhan muat, Anda tidak dapat menginput sounding kedatangan. Sounding kedatangan harus diinput oleh Petugas Pelabuhan Tujuan atau Admin.'
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
        p.faktorKoreksi || 1.0
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
