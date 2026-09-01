const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  try {
    const kapal = await prisma.kapal.findMany({
      orderBy: { namaKapal: 'asc' },
      include: { _count: { select: { pengiriman: true, soundingTable: true, densityTable: true } } }
    });
    res.json(kapal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const kapal = await prisma.kapal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { pengiriman: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });
    if (!kapal) return res.status(404).json({ error: 'Kapal tidak ditemukan.' });
    res.json(kapal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { namaKapal } = req.body;
    if (!namaKapal || !namaKapal.trim()) return res.status(400).json({ error: 'Nama kapal wajib diisi.' });
    const kapal = await prisma.kapal.create({ data: { namaKapal: namaKapal.trim() } });
    res.status(201).json(kapal);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Nama kapal sudah ada.' });
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { namaKapal } = req.body;
    if (!namaKapal || !namaKapal.trim()) return res.status(400).json({ error: 'Nama kapal wajib diisi.' });
    const kapal = await prisma.kapal.update({
      where: { id: parseInt(req.params.id) },
      data: { namaKapal: namaKapal.trim() }
    });
    res.json(kapal);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Nama kapal sudah ada.' });
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'ID kapal tidak valid.' });

    const kapal = await prisma.kapal.findUnique({
      where: { id },
      include: { _count: { select: { pengiriman: true } } }
    });

    if (!kapal) {
      return res.status(404).json({ error: 'Kapal tidak ditemukan.' });
    }

    if (kapal._count?.pengiriman > 0) {
      return res.status(400).json({
        error: `Kapal "${kapal.namaKapal}" tidak dapat dihapus karena masih memiliki ${kapal._count.pengiriman} riwayat pengiriman. Hapus data pengiriman terkait terlebih dahulu.`
      });
    }

    // Hapus data kalibrasi sounding & density terkait lalu hapus kapal
    await prisma.$transaction([
      prisma.soundingTable.deleteMany({ where: { kapalId: id } }),
      prisma.densityTable.deleteMany({ where: { kapalId: id } }),
      prisma.kapal.delete({ where: { id } })
    ]);

    res.json({ message: `Kapal "${kapal.namaKapal}" berhasil dihapus.` });
  } catch (err) {
    console.error('Error delete kapal:', err);
    if (err.code === 'P2003' || (err.message && err.message.includes('foreign key constraint'))) {
      return res.status(400).json({ error: 'Kapal tidak dapat dihapus karena masih digunakan di data pengiriman.' });
    }
    res.status(500).json({ error: err.message || 'Gagal menghapus kapal.' });
  }
};
