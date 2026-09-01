const prisma = require('../lib/prisma');

const toKg = (nilai, satuan) => satuan === 'MT' ? parseFloat(nilai) * 1000 : parseFloat(nilai);

exports.getStats = async (req, res) => {
  try {
    const [totalPengiriman, totalKapal, pengirimanSelesai, pengirimanBerlayar, pengirimanDraft] = await Promise.all([
      prisma.pengiriman.count(),
      prisma.kapal.count(),
      prisma.pengiriman.count({ where: { status: 'SELESAI' } }),
      prisma.pengiriman.count({ where: { status: 'DALAM_PERJALANAN' } }),
      prisma.pengiriman.count({ where: { status: 'DRAFT' } }),
    ]);

    // Fetch all completed shipments for aggregate calculations
    const pengirimanData = await prisma.pengiriman.findMany({
      where: { status: 'SELESAI', nilaiBl: { not: null } },
      include: { dataPalka: true },
    });

    let totalSusut = 0;
    let countSusut = 0;
    let totalTonaseMuat = 0;
    let totalTonaseBongkar = 0;
    let totalR2 = 0;
    let countR2 = 0;

    for (const p of pengirimanData) {
      const blKg = toKg(p.nilaiBl, p.satuanBl);
      const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
      const kedatangan = p.dataPalka.filter(d => d.tipe === 'KEDATANGAN');
      const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);

      totalTonaseMuat += totalBerangkat;

      if (kedatangan.length > 0) {
        totalTonaseBongkar += totalDatang;
        const susut = ((blKg - totalDatang) / blKg) * 100;
        totalSusut += susut;
        countSusut++;

        if (totalBerangkat > 0) {
          const r2 = ((totalDatang - totalBerangkat) / totalBerangkat) * 100;
          totalR2 += r2;
          countR2++;
        }
      }
    }

    // Also add tonnage from in-transit ships (keberangkatan only)
    const pengirimanBerlayarData = await prisma.pengiriman.findMany({
      where: { status: 'DALAM_PERJALANAN' },
      include: { dataPalka: true },
    });
    for (const p of pengirimanBerlayarData) {
      const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
      totalTonaseMuat += keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
    }

    const rataSusut = countSusut > 0 ? (totalSusut / countSusut).toFixed(4) : 0;
    const rataR2 = countR2 > 0 ? (totalR2 / countR2).toFixed(4) : 0;

    // Kapal sedang berlayar (detail for widget)
    const kapalBerlayarList = await prisma.pengiriman.findMany({
      where: { status: 'DALAM_PERJALANAN' },
      include: { kapal: true, dataPalka: true, createdBy: { select: { id: true, nama: true } } },
      orderBy: { tanggalBerangkat: 'asc' },
    });

    const kapalBerlayarDetail = kapalBerlayarList.map(p => {
      const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
      const totalSfal = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const blKg = p.nilaiBl ? toKg(p.nilaiBl, p.satuanBl) : 0;
      const hariLayar = Math.floor((Date.now() - new Date(p.tanggalBerangkat).getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: p.id,
        namaKapal: p.kapal?.namaKapal,
        nomorBl: p.nomorBl,
        tanggalBerangkat: p.tanggalBerangkat,
        hariLayar,
        totalSfal: Math.round(totalSfal),
        blKg: Math.round(blKg),
        jumlahPalka: keberangkatan.length,
        createdById: p.createdById,
        createdByNama: p.createdBy?.nama,
      };
    });

    // 5 pengiriman terbaru (semua status)
    const recentPengiriman = await prisma.pengiriman.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        kapal: true,
        dataPalka: true,
        createdBy: { select: { id: true, nama: true } },
        dischargedBy: { select: { id: true, nama: true } }
      },
    });

    const recentList = recentPengiriman.map(p => {
      const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
      const kedatangan = p.dataPalka.filter(d => d.tipe === 'KEDATANGAN');
      const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const blKg = p.nilaiBl ? toKg(p.nilaiBl, p.satuanBl) : 0;
      const r2 = totalBerangkat > 0 && kedatangan.length > 0
        ? ((totalDatang - totalBerangkat) / totalBerangkat * 100)
        : null;

      return {
        id: p.id,
        namaKapal: p.kapal?.namaKapal,
        nomorBl: p.nomorBl,
        tanggalBerangkat: p.tanggalBerangkat,
        status: p.status,
        totalSfal: Math.round(totalBerangkat),
        totalSfbd: kedatangan.length > 0 ? Math.round(totalDatang) : null,
        blKg: Math.round(blKg),
        r2: r2 !== null ? parseFloat(r2.toFixed(4)) : null,
        createdById: p.createdById,
        createdByNama: p.createdBy?.nama,
        dischargedByNama: p.dischargedBy?.nama,
      };
    });

    res.json({
      totalPengiriman,
      totalKapal,
      pengirimanSelesai,
      pengirimanBerlayar,
      pengirimanDraft,
      rataSusut: parseFloat(rataSusut),
      rataR2: parseFloat(rataR2),
      totalTonaseMuat: Math.round(totalTonaseMuat),
      totalTonaseBongkar: Math.round(totalTonaseBongkar),
      kapalBerlayarDetail,
      recentPengiriman: recentList,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTrenSusut = async (req, res) => {
  try {
    const { bulan = 12 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(bulan));

    const pengiriman = await prisma.pengiriman.findMany({
      where: {
        status: 'SELESAI',
        nilaiBl: { not: null },
        tanggalBerangkat: { gte: startDate },
      },
      include: { dataPalka: true, kapal: true },
      orderBy: { tanggalBerangkat: 'asc' },
    });

    const tren = pengiriman.map(p => {
      const blKg = toKg(p.nilaiBl, p.satuanBl);
      const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
      const kedatangan = p.dataPalka.filter(d => d.tipe === 'KEDATANGAN');
      const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      
      const r1 = blKg > 0 ? ((totalBerangkat - blKg) / blKg * 100) : 0;
      const r2 = totalBerangkat > 0 ? ((totalDatang - totalBerangkat) / totalBerangkat * 100) : 0;
      const r3 = blKg > 0 ? ((totalDatang - blKg) / blKg * 100) : 0;
      
      const susutBl = blKg > 0 ? ((blKg - totalDatang) / blKg * 100) : 0;
      const susutPerjalanan = totalBerangkat - totalDatang;
      return {
        id: p.id,
        tanggal: p.tanggalBerangkat,
        kapal: p.kapal.namaKapal,
        nomorBl: p.nomorBl,
        blKg,
        totalBerangkat,
        totalDatang,
        susutBl: parseFloat(susutBl.toFixed(4)),
        susutPerjalanan: parseFloat(susutPerjalanan.toFixed(4)),
        r1: parseFloat(r1.toFixed(4)),
        r2: parseFloat(r2.toFixed(4)),
        r3: parseFloat(r3.toFixed(4)),
      };
    });

    res.json(tren);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSusutPerKapal = async (req, res) => {
  try {
    const kapalList = await prisma.kapal.findMany({
      include: {
        pengiriman: {
          where: { status: 'SELESAI', nilaiBl: { not: null } },
          include: { dataPalka: true },
        },
      },
    });

    const result = kapalList.map(k => {
      let totalSusut = 0;
      let count = 0;
      for (const p of k.pengiriman) {
        const keberangkatan = p.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
        const kedatangan = p.dataPalka.filter(d => d.tipe === 'KEDATANGAN');
        const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
        const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
        if (kedatangan.length > 0 && totalBerangkat > 0) {
          const r2 = ((totalDatang - totalBerangkat) / totalBerangkat) * 100;
          totalSusut += Math.abs(r2);
          count++;
        }
      }
      return {
        kapal: k.namaKapal,
        totalPengiriman: k.pengiriman.length,
        rataSusut: count > 0 ? parseFloat((totalSusut / count).toFixed(4)) : 0,
      };
    }).filter(k => k.totalPengiriman > 0);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
