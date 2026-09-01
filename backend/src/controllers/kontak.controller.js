const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const formatNomorWA = (nomor) => {
  if (!nomor) return '';
  let clean = nomor.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) {
    clean = '628' + clean.slice(2);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return clean;
};

// GET /api/kontak-wa
exports.getAll = async (req, res) => {
  try {
    const { search, aktifOnly } = req.query;
    const where = {};

    if (aktifOnly === 'true') {
      where.aktif = true;
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nomorWa: { contains: search, mode: 'insensitive' } },
        { jabatan: { contains: search, mode: 'insensitive' } },
        { instansi: { contains: search, mode: 'insensitive' } },
      ];
    }

    const kontak = await prisma.kontakWa.findMany({
      where,
      orderBy: [{ aktif: 'desc' }, { nama: 'asc' }],
    });

    res.json(kontak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/kontak-wa/:id
exports.getById = async (req, res) => {
  try {
    const kontak = await prisma.kontakWa.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!kontak) return res.status(404).json({ error: 'Kontak WhatsApp tidak ditemukan.' });
    res.json(kontak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/kontak-wa
exports.create = async (req, res) => {
  try {
    const { nama, nomorWa, jabatan, instansi, catatan, aktif } = req.body;
    if (!nama || !nomorWa) {
      return res.status(400).json({ error: 'Nama kontak dan nomor WhatsApp wajib diisi.' });
    }

    const formattedNomor = formatNomorWA(nomorWa);

    const kontak = await prisma.kontakWa.create({
      data: {
        nama: nama.trim(),
        nomorWa: formattedNomor,
        jabatan: jabatan ? jabatan.trim() : null,
        instansi: instansi ? instansi.trim() : null,
        catatan: catatan ? catatan.trim() : null,
        aktif: aktif !== undefined ? Boolean(aktif) : true,
      },
    });

    res.status(201).json(kontak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/kontak-wa/:id
exports.update = async (req, res) => {
  try {
    const { nama, nomorWa, jabatan, instansi, catatan, aktif } = req.body;
    const updateData = {};

    if (nama !== undefined) updateData.nama = nama.trim();
    if (nomorWa !== undefined) updateData.nomorWa = formatNomorWA(nomorWa);
    if (jabatan !== undefined) updateData.jabatan = jabatan ? jabatan.trim() : null;
    if (instansi !== undefined) updateData.instansi = instansi ? instansi.trim() : null;
    if (catatan !== undefined) updateData.catatan = catatan ? catatan.trim() : null;
    if (aktif !== undefined) updateData.aktif = Boolean(aktif);

    const kontak = await prisma.kontakWa.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });

    res.json(kontak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/kontak-wa/:id
exports.remove = async (req, res) => {
  try {
    await prisma.kontakWa.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Kontak WhatsApp berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
