const prisma = require('../lib/prisma');

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
    const { search, aktifOnly, scope } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';
    const userId = req.user?.id;

    const where = {};

    if (aktifOnly === 'true') {
      where.aktif = true;
    }

    // Filter Privasi: Non-admin hanya melihat kontaknya sendiri + kontak kantor (isGlobal atau dibuat oleh admin)
    if (!isAdmin) {
      where.OR = [
        { userId: userId },
        { isGlobal: true },
        { user: { role: 'ADMIN' } }
      ];
    } else if (scope === 'mine') {
      where.userId = userId;
    } else if (scope === 'global') {
      where.OR = [{ isGlobal: true }, { user: { role: 'ADMIN' } }];
    }

    // Search query
    if (search && search.trim()) {
      const searchConditions = [
        { nama: { contains: search.trim(), mode: 'insensitive' } },
        { nomorWa: { contains: search.trim(), mode: 'insensitive' } },
        { jabatan: { contains: search.trim(), mode: 'insensitive' } },
        { instansi: { contains: search.trim(), mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const kontak = await prisma.kontakWa.findMany({
      where,
      include: {
        user: { select: { id: true, nama: true, role: true } }
      },
      orderBy: [
        { isGlobal: 'desc' },
        { aktif: 'desc' },
        { nama: 'asc' }
      ],
    });

    res.json(kontak);
  } catch (err) {
    console.error('kontak getAll error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/kontak-wa/:id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const kontak = await prisma.kontakWa.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nama: true, role: true } }
      }
    });

    if (!kontak) return res.status(404).json({ error: 'Kontak WhatsApp tidak ditemukan.' });

    // Cek hak akses privasi jika bukan admin
    if (req.user?.role !== 'ADMIN' && kontak.userId && kontak.userId !== req.user?.id && !kontak.isGlobal) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke kontak ini.' });
    }

    res.json(kontak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/kontak-wa
exports.create = async (req, res) => {
  try {
    const { nama, nomorWa, jabatan, instansi, catatan, aktif, isGlobal } = req.body;
    if (!nama || !nomorWa) {
      return res.status(400).json({ error: 'Nama kontak dan nomor WhatsApp wajib diisi.' });
    }

    const formattedNomor = formatNomorWA(nomorWa);
    const isAdmin = req.user?.role === 'ADMIN';

    const kontak = await prisma.kontakWa.create({
      data: {
        nama: nama.trim(),
        nomorWa: formattedNomor,
        jabatan: jabatan ? jabatan.trim() : null,
        instansi: instansi ? instansi.trim() : null,
        catatan: catatan ? catatan.trim() : null,
        aktif: true, // Otomatis aktif saat penambahan kontak baru
        // Hanya admin yang bisa membuat kontak kantor/global
        isGlobal: isAdmin ? Boolean(isGlobal) : false,
        userId: req.user?.id || null,
      },
      include: {
        user: { select: { id: true, nama: true, role: true } }
      }
    });

    res.status(201).json(kontak);
  } catch (err) {
    console.error('kontak create error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/kontak-wa/:id
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.kontakWa.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Kontak WhatsApp tidak ditemukan.' });

    const isAdmin = req.user?.role === 'ADMIN';

    // Privasi: Non-admin hanya bisa edit kontak miliknya sendiri
    if (!isAdmin && existing.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Anda hanya dapat mengubah kontak milik Anda sendiri.' });
    }

    const { nama, nomorWa, jabatan, instansi, catatan, aktif, isGlobal } = req.body;
    const updateData = {};

    if (nama !== undefined) updateData.nama = nama.trim();
    if (nomorWa !== undefined) updateData.nomorWa = formatNomorWA(nomorWa);
    if (jabatan !== undefined) updateData.jabatan = jabatan ? jabatan.trim() : null;
    if (instansi !== undefined) updateData.instansi = instansi ? instansi.trim() : null;
    if (catatan !== undefined) updateData.catatan = catatan ? catatan.trim() : null;
    if (aktif !== undefined) updateData.aktif = Boolean(aktif);
    if (isAdmin && isGlobal !== undefined) updateData.isGlobal = Boolean(isGlobal);

    const kontak = await prisma.kontakWa.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, nama: true, role: true } }
      }
    });

    res.json(kontak);
  } catch (err) {
    console.error('kontak update error:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/kontak-wa/:id
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.kontakWa.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Kontak WhatsApp tidak ditemukan.' });

    const isAdmin = req.user?.role === 'ADMIN';

    // Privasi: Non-admin hanya bisa hapus kontak miliknya sendiri
    if (!isAdmin && existing.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus kontak milik Anda sendiri.' });
    }

    await prisma.kontakWa.delete({ where: { id } });
    res.json({ message: 'Kontak WhatsApp berhasil dihapus.' });
  } catch (err) {
    console.error('kontak remove error:', err);
    res.status(500).json({ error: err.message });
  }
};
