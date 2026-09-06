const prisma = require('../lib/prisma');
const crypto = require('crypto');
const whatsappManager = require('../services/whatsappManager');
const { generatePengirimanPDFBuffer } = require('../utils/pdfGenerator');
const { generateReportSlug } = require('./export.controller');

const toKg = (nilai, satuan) => satuan === 'MT' ? parseFloat(nilai) * 1000 : parseFloat(nilai);

const formatAngka = (n, decimal = 0) => {
  if (n === null || n === undefined) return '-';
  return parseFloat(n).toLocaleString('id-ID', { minimumFractionDigits: decimal, maximumFractionDigits: decimal });
};

const formatNomorWA = (nomor) => {
  return whatsappManager.cleanPhoneNumber(nomor);
};

const defaultTemplates = [
  {
    nama: 'Laporan Standar Lengkap',
    isDefault: true,
    isi: `*LAPORAN PERHITUNGAN MUATAN CPO*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Kapal:* {namaKapal}\n` +
      `*No. B/L:* {nomorBl}\n` +
      `*Berangkat:* {tglBerangkat}\n` +
      `*Tiba:* {tglTiba}\n` +
      `*Petugas Muat (SFAL):* {petugasMuat}\n` +
      `*Petugas Bongkar (SFBD):* {petugasBongkar}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*HASIL PERHITUNGAN*\n` +
      `• B/L (Kontrak): {blKg} KG\n` +
      `• SFAL (Total Muat): {sfal} KG\n` +
      `• SFBD (Total Bongkar): {sfbd} KG\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*ANALISA RASIO*\n` +
      `• R1 (SFAL vs BL): {r1Diff} KG ({r1Pct})\n` +
      `• R2 (SFBD vs SFAL): {r2Diff} KG ({r2Pct})\n` +
      `• R3 (SFBD vs BL): {r3Diff} KG ({r3Pct})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `{linkPdf}\n` +
      `_Dikirim otomatis via Sistem CPO Tanker._`
  },
  {
    nama: 'Ringkasan Singkat (Quick Summary)',
    isDefault: true,
    isi: `*RINGKASAN MUATAN CPO*\n` +
      `*Kapal:* {namaKapal} | *No. B/L:* {nomorBl}\n` +
      `*Tgl:* {tglBerangkat} - {tglTiba}\n\n` +
      `*Hasil Sounding:*\n` +
      `• B/L: {blKg} KG\n` +
      `• SFAL: {sfal} KG\n` +
      `• SFBD: {sfbd} KG\n\n` +
      `*Rasio Susut:*\n` +
      `• R1: {r1Pct}\n` +
      `• R2 (Susut Pelayaran): {r2Pct}\n` +
      `• R3: {r3Pct}\n\n` +
      `{linkPdf}`
  },
  {
    nama: 'Notifikasi Keberangkatan (SFAL)',
    isDefault: true,
    isi: `*PEMBERITAHUAN KEBERANGKATAN KAPAL*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Kapal:* {namaKapal}\n` +
      `*No. B/L:* {nomorBl}\n` +
      `*Tgl Berangkat:* {tglBerangkat}\n` +
      `*Total Muatan SFAL:* {sfal} KG\n` +
      `*Petugas Muat:* {petugasMuat}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Kapal telah selesai sounding keberangkatan dan sedang dalam perjalanan._`
  }
];

const generatePesanWA = (pengiriman, totalBerangkat, totalDatang, blKg, r1Pct, r2Pct, r3Pct, diffR1, diffR2, diffR3, pdfDownloadUrl) => {
  const tgl = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
  const sign = (n) => n > 0 ? `+${formatAngka(n, 0)}` : formatAngka(n, 0);
  const signPct = (n) => n > 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`;

  let linkSection = '';
  if (pdfDownloadUrl) {
    linkSection = `*DOKUMEN LAPORAN RESMI (PDF)*\n` +
      `Unduh/Buka PDF:\n${pdfDownloadUrl}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  return `*LAPORAN PERHITUNGAN MUATAN CPO*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*Kapal:* ${pengiriman.kapal?.namaKapal || '-'}\n` +
    `*No. B/L:* ${pengiriman.nomorBl || '-'}\n` +
    `*Berangkat:* ${tgl(pengiriman.tanggalBerangkat)}\n` +
    `*Tiba:* ${tgl(pengiriman.tanggalSampai)}\n` +
    `*Petugas Muat (SFAL):* ${pengiriman.createdBy?.nama || '-'}\n` +
    `*Petugas Bongkar (SFBD):* ${pengiriman.dischargedBy?.nama || '-'}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*HASIL PERHITUNGAN*\n` +
    `• B/L (Kontrak): ${formatAngka(blKg)} KG\n` +
    `• SFAL (Total Muat): ${formatAngka(totalBerangkat)} KG\n` +
    `• SFBD (Total Bongkar): ${formatAngka(totalDatang)} KG\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*ANALISA RASIO*\n` +
    `• R1 (SFAL vs BL): ${sign(diffR1)} KG (${signPct(r1Pct)})\n` +
    `• R2 (SFBD vs SFAL): ${sign(diffR2)} KG (${signPct(r2Pct)})\n` +
    `• R3 (SFBD vs BL): ${sign(diffR3)} KG (${signPct(r3Pct)})\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    (linkSection ? `${linkSection}\n` : '') +
    `_Dikirim otomatis via Sistem CPO Tanker._`;
};

// ─── TEMPLATES CONTROLLER ───

exports.getTemplates = async (req, res) => {
  try {
    let list = await prisma.templatePesan.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    if (list.length === 0) {
      for (const t of defaultTemplates) {
        await prisma.templatePesan.create({ data: t });
      }
      list = await prisma.templatePesan.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
    } else {
      for (const t of defaultTemplates) {
        const existing = list.find(item => item.nama === t.nama && item.isDefault);
        if (existing && existing.isi !== t.isi) {
          await prisma.templatePesan.update({
            where: { id: existing.id },
            data: { isi: t.isi }
          });
        }
      }
      list = await prisma.templatePesan.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
    }

    res.json(list);
  } catch (err) {
    console.error('getTemplates error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { nama, isi } = req.body;
    if (!nama || !isi) {
      return res.status(400).json({ error: 'Nama dan isi template wajib diisi.' });
    }

    const template = await prisma.templatePesan.create({
      data: {
        nama: nama.trim(),
        isi: isi.trim(),
        isDefault: false
      }
    });

    res.status(201).json({ message: 'Template pesan berhasil disimpan.', data: template });
  } catch (err) {
    console.error('createTemplate error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, isi } = req.body;

    const existing = await prisma.templatePesan.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Template tidak ditemukan.' });

    const updated = await prisma.templatePesan.update({
      where: { id: parseInt(id) },
      data: {
        nama: nama ? nama.trim() : existing.nama,
        isi: isi ? isi.trim() : existing.isi,
      }
    });

    res.json({ message: 'Template pesan berhasil diperbarui.', data: updated });
  } catch (err) {
    console.error('updateTemplate error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.templatePesan.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Template tidak ditemukan.' });

    await prisma.templatePesan.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Template pesan berhasil dihapus.' });
  } catch (err) {
    console.error('deleteTemplate error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── WA MULTI-DEVICE MANAGEMENT (NATIVE WHATSAPP WEB JS) ───

const resolveSenderDevice = async (req, deviceId) => {
  if (deviceId) {
    const dev = await prisma.deviceWa.findUnique({ where: { id: parseInt(deviceId) } });
    if (dev) return dev;
  }
  if (req.user?.id) {
    const userDev = await prisma.deviceWa.findFirst({ where: { userId: req.user.id } });
    if (userDev) return userDev;
  }
  const defaultDev = await prisma.deviceWa.findFirst({ where: { isDefault: true } });
  if (defaultDev) return defaultDev;
  const anyDev = await prisma.deviceWa.findFirst({ orderBy: { id: 'asc' } });
  return anyDev || null;
};

// 1. Ambil Semua Perangkat WhatsApp Terdaftar beserta Status Real-time
exports.getDevices = async (req, res) => {
  try {
    const devices = await prisma.deviceWa.findMany({
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    // Perkaya data dengan status live dari whatsappManager
    const enriched = await Promise.all(devices.map(async (dev) => {
      const live = await whatsappManager.getStatus(dev.id);
      return {
        ...dev,
        status: live.isConnected ? 'connected' : (dev.status === 'connected' && !live.isConnected ? 'disconnected' : dev.status),
        nomorWa: live.nomorWa || dev.nomorWa
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('getDevices error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Tambah Perangkat Baru (Native Multi-Session)
exports.addDeviceAuto = async (req, res) => {
  try {
    const { nama, device, userId, isDefault = false } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama perangkat wajib diisi.' });
    }

    // Jika dijadikan default, nonaktifkan isDefault pada perangkat lain
    if (isDefault) {
      await prisma.deviceWa.updateMany({ data: { isDefault: false } });
    }

    const token = 'wa_sess_' + crypto.randomBytes(12).toString('hex');
    const newDevice = await prisma.deviceWa.create({
      data: {
        nama: nama.trim(),
        token,
        nomorWa: device ? device.trim().replace(/[^0-9]/g, '') : null,
        status: 'disconnected',
        isDefault: Boolean(isDefault),
        userId: userId ? parseInt(userId) : null
      },
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      }
    });

    // Inisialisasi client browser WhatsApp untuk device ini di background
    whatsappManager.createClient(newDevice.id);

    res.status(201).json({
      success: true,
      message: 'Perangkat WhatsApp berhasil dibuat! Silakan scan QR Code.',
      device: newDevice,
      token
    });
  } catch (err) {
    console.error('addDeviceAuto error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Tambah Perangkat Manual (Kompatibilitas Form)
exports.addDeviceManual = async (req, res) => {
  return exports.addDeviceAuto(req, res);
};

// 4. Ambil QR Code Perangkat untuk Scan Langsung di Web
exports.getDeviceQr = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    const qrResult = await whatsappManager.getOrGenerateQr(device.id);

    if (qrResult.isConnected) {
      return res.json({
        success: true,
        isConnected: true,
        url: null,
        deviceId: device.id,
        nama: device.nama,
        message: 'Perangkat sudah terhubung.'
      });
    }

    if (qrResult.url) {
      return res.json({
        success: true,
        isConnected: false,
        url: qrResult.url, // Base64 data URL
        deviceId: device.id,
        nama: device.nama
      });
    }

    res.status(400).json({
      error: qrResult.error || 'Sedang menyiapkan QR Code, silakan segarkan dalam beberapa detik.',
      deviceId: device.id
    });
  } catch (err) {
    console.error('getDeviceQr error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Cek Status Perangkat Spesifik & Sinkronkan ke Database
exports.checkDeviceStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      }
    });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    const liveStatus = await whatsappManager.getStatus(device.id);
    const isConnected = Boolean(liveStatus.isConnected);

    let updatedDevice = device;
    const newDbStatus = isConnected ? 'connected' : 'disconnected';
    if (device.status !== newDbStatus || (liveStatus.nomorWa && liveStatus.nomorWa !== device.nomorWa)) {
      updatedDevice = await prisma.deviceWa.update({
        where: { id: device.id },
        data: {
          status: newDbStatus,
          nomorWa: liveStatus.nomorWa || device.nomorWa
        },
        include: {
          user: { select: { id: true, nama: true, username: true, role: true } }
        }
      });
    }

    res.json({
      success: true,
      isConnected,
      device: updatedDevice,
      liveStatus
    });
  } catch (err) {
    console.error('checkDeviceStatusById error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 6. Putuskan Koneksi Perangkat (Disconnect / Logout)
exports.disconnectDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    await whatsappManager.disconnect(device.id);

    const updated = await prisma.deviceWa.findUnique({ where: { id: device.id } });

    res.json({
      success: true,
      message: `Perangkat ${device.nama} berhasil diputuskan.`,
      device: updated
    });
  } catch (err) {
    console.error('disconnectDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 7. Jadikan Perangkat Sebagai Pengirim Default
exports.setDefaultDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deviceId = parseInt(id);

    await prisma.$transaction([
      prisma.deviceWa.updateMany({ data: { isDefault: false } }),
      prisma.deviceWa.update({ where: { id: deviceId }, data: { isDefault: true } })
    ]);

    res.json({ success: true, message: 'Perangkat berhasil dijadikan pengirim default.' });
  } catch (err) {
    console.error('setDefaultDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 8. Hapus Perangkat dari Sistem
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deviceId = parseInt(id);
    const device = await prisma.deviceWa.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    // Hapus sesi browser dan file dari disk
    await whatsappManager.deleteSession(deviceId);
    // Hapus data dari DB
    await prisma.deviceWa.delete({ where: { id: deviceId } });

    res.json({ success: true, message: 'Perangkat WhatsApp berhasil dihapus.' });
  } catch (err) {
    console.error('deleteDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 9. Tes Kirim Pesan untuk Perangkat Spesifik
exports.testDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { tujuanWa } = req.body;
    if (!tujuanWa) return res.status(400).json({ error: 'Nomor tujuan tes wajib diisi.' });

    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    const testMsg = `*TES KONEKSI SISTEM CPO TANKER*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Pengirim: ${device.nama}\n` +
      `📱 Nomor: ${device.nomorWa || '-'}\n` +
      `🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Pesan ini dikirim otomatis via Native WhatsApp Web JS._`;

    const result = await whatsappManager.sendMessage(device.id, [tujuanWa], testMsg);

    res.json({
      success: true,
      message: `Pesan tes berhasil dikirim ke ${tujuanWa}!`,
      result
    });
  } catch (err) {
    console.error('testDevice error:', err);
    res.status(400).json({ error: err.message || 'Gagal mengirim pesan tes.' });
  }
};

// ─── LEGACY / GLOBAL DEVICE STATUS & TEST ───

exports.checkDeviceStatus = async (req, res) => {
  try {
    const sender = await resolveSenderDevice(req);
    if (!sender) {
      return res.status(400).json({
        success: false,
        error: 'Belum ada perangkat WhatsApp yang terdaftar di sistem.'
      });
    }

    const live = await whatsappManager.getStatus(sender.id);
    res.json({
      success: live.isConnected,
      message: live.isConnected ? 'WhatsApp terhubung!' : 'WhatsApp belum terhubung.',
      device: live.nomorWa || sender.nomorWa || '-',
      name: sender.nama,
      deviceStatus: live.isConnected ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.testKoneksi = async (req, res) => {
  try {
    const sender = await resolveSenderDevice(req);
    if (!sender) {
      return res.status(400).json({ error: 'Belum ada perangkat WhatsApp yang terdaftar.' });
    }

    const { tujuanWa } = req.body;
    if (!tujuanWa) {
      return res.status(400).json({ error: 'Nomor WhatsApp tujuan tes wajib diisi.' });
    }

    const testMessage = `*TES KONEKSI SISTEM CPO TANKER*\n━━━━━━━━━━━━━━━━━━━━\n✅ Integrasi WhatsApp Berhasil!\n🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━\n_Pesan ini dikirim secara otomatis via Native WhatsApp Web JS._`;

    const result = await whatsappManager.sendMessage(sender.id, [tujuanWa], testMessage);

    res.json({ message: 'Pesan tes WhatsApp berhasil terkirim ke ' + tujuanWa, result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal kirim pesan tes.' });
  }
};

// ─── KIRIM LAPORAN SOUNDING (MENDUKUNG MULTI-DEVICE & BROADCAST) ───

exports.kirimLaporan = async (req, res) => {
  try {
    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id: parseInt(req.params.pengirimanId) },
      include: {
        kapal: true,
        createdBy: { select: { nama: true } },
        dischargedBy: { select: { nama: true } },
        dataPalka: { orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }] },
      },
    });
    if (!pengiriman) return res.status(404).json({ error: 'Pengiriman tidak ditemukan.' });

    const { tujuanWa, targets, attachPdf = true, pesanCustom, deviceId } = req.body;

    // Kumpulkan target penerima
    let rawTargets = [];
    if (Array.isArray(targets) && targets.length > 0) {
      rawTargets = targets;
    } else if (tujuanWa) {
      rawTargets = tujuanWa.toString().split(',');
    }

    const cleanedTargets = rawTargets
      .map(n => whatsappManager.cleanPhoneNumber(n))
      .filter(Boolean);

    if (cleanedTargets.length === 0) {
      return res.status(400).json({ error: 'Nomor WhatsApp tujuan wajib diisi (minimal 1 kontak).' });
    }

    // Ambil device pengirim
    const senderDevice = await resolveSenderDevice(req, deviceId);
    if (!senderDevice) {
      return res.status(400).json({
        error: 'Tidak ada Akun WhatsApp pengirim yang terdaftar. Silakan hubungkan akun WhatsApp di menu Pusat WhatsApp.'
      });
    }

    const blKg = pengiriman.nilaiBl ? toKg(pengiriman.nilaiBl, pengiriman.satuanBl) : 0;
    const keberangkatan = pengiriman.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN');
    const kedatangan = pengiriman.dataPalka.filter(d => d.tipe === 'KEDATANGAN');
    const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
    const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
    
    const diffR1 = totalBerangkat - blKg;
    const diffR2 = totalDatang - totalBerangkat;
    const diffR3 = totalDatang - blKg;
    
    const r1Pct = blKg > 0 ? (diffR1 / blKg * 100) : 0;
    const r2Pct = totalBerangkat > 0 ? (diffR2 / totalBerangkat * 100) : 0;
    const r3Pct = blKg > 0 ? (diffR3 / blKg * 100) : 0;

    const host = req.get('host');
    const protocol = req.protocol;
    const backendUrl = process.env.PUBLIC_BACKEND_URL || `${protocol}://${host}`;
    const reportSlug = generateReportSlug(pengiriman);
    const pdfDownloadUrl = `${backendUrl}/report/${reportSlug}`;

    // Gunakan pesanCustom jika ada, jika tidak gunakan pesan bawaan
    const pesan = (pesanCustom && pesanCustom.trim())
      ? pesanCustom.trim()
      : generatePesanWA(pengiriman, totalBerangkat, totalDatang, blKg, r1Pct, r2Pct, r3Pct, diffR1, diffR2, diffR3, pdfDownloadUrl);

    let pdfBuffer = null;
    const filename = `Laporan_CPO_${(pengiriman.kapal?.namaKapal || 'Kapal').replace(/\s/g, '_')}_${pengiriman.nomorBl || pengiriman.id}.pdf`;

    if (attachPdf) {
      try {
        pdfBuffer = await generatePengirimanPDFBuffer(pengiriman);
      } catch (pdfErr) {
        console.error('Gagal generate PDF buffer, tetap mengirim pesan teks:', pdfErr);
      }
    }

    // Kirim langsung via WhatsApp Web JS Native Engine (Mendukung broadcast array targets & PDF)
    const sendResult = await whatsappManager.sendMessage(
      senderDevice.id,
      cleanedTargets,
      pesan,
      pdfBuffer,
      filename
    );

    const penerimaText = cleanedTargets.length > 1
      ? `${cleanedTargets.length} penerima (Broadcast)`
      : cleanedTargets[0];

    res.json({
      success: true,
      message: `Laporan berhasil dikirim ke ${penerimaText}!`,
      pesan,
      totalPenerima: cleanedTargets.length,
      senderDevice: senderDevice.nama,
      pdfAttached: Boolean(pdfBuffer),
      sendResult
    });
  } catch (err) {
    console.error('kirimLaporan error:', err);
    res.status(400).json({ error: err.message || 'Gagal mengirim laporan WhatsApp.' });
  }
};
