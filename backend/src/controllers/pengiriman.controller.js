const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('./notifikasi.controller');

exports.getAll = async (req, res) => {
  try {
    const { kapalId, status, startDate, endDate, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (kapalId) where.kapalId = parseInt(kapalId);
    if (status) where.status = status;
    if (startDate || endDate) {
      where.tanggalBerangkat = {};
      if (startDate) where.tanggalBerangkat.gte = new Date(startDate);
      if (endDate) where.tanggalBerangkat.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { nomorBl: { contains: search, mode: 'insensitive' } },
        { kapal: { namaKapal: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.pengiriman.findMany({
        where,
        include: {
          kapal: true,
          createdBy: { select: { id: true, nama: true } },
          dischargedBy: { select: { id: true, nama: true } },
          _count: { select: { dataPalka: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.pengiriman.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        kapal: true,
        createdBy: { select: { id: true, nama: true } },
        dischargedBy: { select: { id: true, nama: true } },
        dataPalka: { orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }] },
      },
    });
    if (!pengiriman) return res.status(404).json({ error: 'Pengiriman tidak ditemukan.' });

    // Populate volumeLiter & density jika ada data palka yang belum tersimpan
    const enrichedPalka = await Promise.all(
      pengiriman.dataPalka.map(async (p) => {
        let volumeLiter = p.volumeLiter ? parseFloat(p.volumeLiter) : null;
        let density = p.density ? parseFloat(p.density) : null;

        if ((!volumeLiter || !density) && p.tinggiCm && p.suhu) {
          try {
            const [sounding, den] = await Promise.all([
              prisma.soundingTable.findFirst({ where: { kapalId: pengiriman.kapalId, tinggiCm: parseInt(p.tinggiCm) } }),
              prisma.densityTable.findFirst({ where: { kapalId: pengiriman.kapalId, suhu: parseInt(p.suhu) } }),
            ]);
            if (sounding && !volumeLiter) {
              const beda = parseFloat(sounding.bedaLiter || 403);
              const pointVal = parseFloat(p.point || 0);
              volumeLiter = parseFloat(sounding.volumeLiter) + (pointVal * beda);
            }
            if (den && !density) {
              density = parseFloat(den.density);
            }
          } catch (e) {
            console.error('Error fallback lookup palka:', e);
          }
        }

        return {
          ...p,
          volumeLiter,
          density,
        };
      })
    );

    res.json({
      ...pengiriman,
      dataPalka: enrichedPalka,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { kapalId, tanggalBerangkat, tanggalSampai, nomorBl, nilaiBl, satuanBl, status } = req.body;
    if (!kapalId) return res.status(400).json({ error: 'Kapal wajib dipilih.' });
    const statusFinal = status || 'DRAFT';
    const pengiriman = await prisma.pengiriman.create({
      data: {
        kapalId: parseInt(kapalId),
        tanggalBerangkat: tanggalBerangkat ? new Date(tanggalBerangkat) : null,
        tanggalSampai: tanggalSampai ? new Date(tanggalSampai) : null,
        nomorBl: nomorBl || null,
        nilaiBl: nilaiBl ? parseFloat(nilaiBl) : null,
        satuanBl: satuanBl || 'MT',
        status: statusFinal,
        createdById: req.user.id,
      },
      include: { kapal: true },
    });

    // Pemicu Notifikasi Otomatis ke user lain
    if (statusFinal === 'DALAM_PERJALANAN') {
      createNotification({
        judul: 'Data Muatan Diinput',
        pesan: `Data muatan kapal ${pengiriman.kapal?.namaKapal || 'Tanker'} berhasil diinput oleh ${req.user.nama || 'Petugas'} (Status : Kapal Berlayar).`,
        tipe: 'KAPAL_BERANGKAT',
        pengirimanId: pengiriman.id,
        senderUserId: req.user.id,
      });
    } else {
      createNotification({
        judul: 'Pengiriman Baru Dibuat',
        pesan: `Draft pengiriman baru dibuat untuk kapal ${pengiriman.kapal?.namaKapal || 'Tanker'}.`,
        tipe: 'PENGIRIMAN_BARU',
        pengirimanId: pengiriman.id,
        senderUserId: req.user.id,
      });
    }

    res.status(201).json(pengiriman);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await prisma.pengiriman.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, status: true, createdById: true }
    });
    if (!existing) return res.status(404).json({ error: 'Pengiriman tidak ditemukan.' });

    // Integritas data: Jangan izinkan modifikasi pengiriman SELESAI kecuali oleh ADMIN
    if (existing.status === 'SELESAI' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Pengiriman ini sudah selesai dan datanya telah dikunci. Hanya Admin yang dapat melakukan revisi.'
      });
    }

    const { kapalId, tanggalBerangkat, tanggalSampai, nomorBl, nilaiBl, satuanBl, status } = req.body;
    const pengiriman = await prisma.pengiriman.update({
      where: { id: parseInt(req.params.id) },
      data: {
        kapalId: kapalId ? parseInt(kapalId) : undefined,
        tanggalBerangkat: tanggalBerangkat ? new Date(tanggalBerangkat) : undefined,
        tanggalSampai: tanggalSampai ? new Date(tanggalSampai) : undefined,
        nomorBl: nomorBl !== undefined ? nomorBl : undefined,
        nilaiBl: nilaiBl !== undefined ? parseFloat(nilaiBl) : undefined,
        satuanBl: satuanBl || undefined,
        status: status || undefined,
      },
      include: { kapal: true },
    });

    // Pemicu Notifikasi Otomatis saat status berubah
    if (status === 'DALAM_PERJALANAN') {
      createNotification({
        judul: 'Data Muatan Diinput',
        pesan: `Data muatan kapal ${pengiriman.kapal?.namaKapal || 'Tanker'} berhasil diinput (Status : Kapal Berlayar).`,
        tipe: 'KAPAL_BERANGKAT',
        pengirimanId: pengiriman.id,
        senderUserId: req.user.id,
      });
    } else if (status === 'SELESAI') {
      createNotification({
        judul: 'Muatan Selesai Dihitung (SFBD)',
        pesan: `Kapal ${pengiriman.kapal?.namaKapal || 'Tanker'} telah tiba di pelabuhan tujuan & perhitungan muatan kedatangan selesai.`,
        tipe: 'KAPAL_TIBA',
        pengirimanId: pengiriman.id,
        senderUserId: req.user.id,
      });
    }

    res.json(pengiriman);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.pengiriman.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Pengiriman berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
