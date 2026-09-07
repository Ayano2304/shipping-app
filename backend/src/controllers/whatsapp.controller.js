const prisma = require('../lib/prisma');
const { generatePengirimanPDFBuffer } = require('../utils/pdfGenerator');
const { generatePdfToken, generateReportSlug } = require('./export.controller');
const { getFonnteAccountToken } = require('./settings.controller');

const toKg = (nilai, satuan) => satuan === 'MT' ? parseFloat(nilai) * 1000 : parseFloat(nilai);

const formatAngka = (n, decimal = 0) => {
  if (n === null || n === undefined) return '-';
  return parseFloat(n).toLocaleString('id-ID', { minimumFractionDigits: decimal, maximumFractionDigits: decimal });
};

const formatNomorWA = (nomor) => {
  if (!nomor) return '';
  let clean = nomor.toString().replace(/[^0-9,]/g, '');
  return clean.split(',').map(n => {
    let num = n.trim();
    if (num.startsWith('08')) {
      num = '628' + num.slice(2);
    } else if (num.startsWith('8')) {
      num = '628' + num.slice(1);
    }
    return num;
  }).filter(Boolean).join(',');
};

const getFonnteToken = (req) => {
  return req.body?.fonnteToken || req.headers['x-fonnte-token'] || process.env.FONNTE_TOKEN;
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

    // Inisialisasi atau sinkronisasi default templates
    if (list.length === 0) {
      for (const t of defaultTemplates) {
        await prisma.templatePesan.create({ data: t });
      }
      list = await prisma.templatePesan.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
    } else {
      // Perbarui template bawaan agar bebas dari emoji lama
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

// ─── WA MULTI-DEVICE MANAGEMENT (FONNTE) ───

const resolveSenderToken = async (req, deviceId) => {
  if (deviceId) {
    const dev = await prisma.deviceWa.findUnique({ where: { id: parseInt(deviceId) } });
    if (dev && dev.token) return { token: dev.token, device: dev };
  }
  if (req.user?.id) {
    const userDev = await prisma.deviceWa.findFirst({ where: { userId: req.user.id } });
    if (userDev && userDev.token) return { token: userDev.token, device: userDev };
  }
  const defaultDev = await prisma.deviceWa.findFirst({ where: { isDefault: true } });
  if (defaultDev && defaultDev.token) return { token: defaultDev.token, device: defaultDev };
  const anyDev = await prisma.deviceWa.findFirst({ orderBy: { id: 'asc' } });
  if (anyDev && anyDev.token) return { token: anyDev.token, device: anyDev };
  
  const fallback = req.body?.fonnteToken || req.headers['x-fonnte-token'] || process.env.FONNTE_TOKEN;
  return { token: fallback, device: null };
};

// 1. Ambil Semua Perangkat WhatsApp Terdaftar
exports.getDevices = async (req, res) => {
  try {
    const devices = await prisma.deviceWa.findMany({
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(devices);
  } catch (err) {
    console.error('getDevices error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Tambah Perangkat Otomatis via Fonnte API Add-Device (Cara 1)
exports.addDeviceAuto = async (req, res) => {
  try {
    const { nama, device, userId, isDefault = false, accountToken: customAccountToken } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama perangkat wajib diisi.' });
    }
    if (!device || !device.trim()) {
      return res.status(400).json({ error: 'Nomor HP / identifier device wajib diisi.' });
    }

    const accountToken = (customAccountToken && customAccountToken.trim()) 
      || await getFonnteAccountToken()
      || process.env.FONNTE_ACCOUNT_TOKEN 
      || process.env.FONNTE_TOKEN;

    if (!accountToken) {
      return res.status(400).json({
        error: 'Fonnte Account Token belum diatur di Pengaturan Sistem atau file .env server.'
      });
    }

    // Panggil Fonnte API Add-Device
    const response = await fetch('https://api.fonnte.com/add-device', {
      method: 'POST',
      headers: {
        'Authorization': accountToken.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: nama.trim().substring(0, 30),
        device: device.trim().replace(/[^0-9]/g, '')
      })
    });

    const result = await response.json();
    if (!result.status || !result.token) {
      return res.status(400).json({
        error: `Gagal membuat device di Fonnte: ${result.reason || 'Respons tidak valid dari Fonnte'}`,
        raw: result
      });
    }

    // Jika dijadikan default, nonaktifkan isDefault pada perangkat lain
    if (isDefault) {
      await prisma.deviceWa.updateMany({ data: { isDefault: false } });
    }

    const newDevice = await prisma.deviceWa.create({
      data: {
        nama: nama.trim(),
        token: result.token,
        nomorWa: result.device || device.trim(),
        status: 'disconnected',
        isDefault: Boolean(isDefault),
        userId: userId ? parseInt(userId) : null
      },
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Perangkat WhatsApp berhasil dibuat otomatis di Fonnte!',
      device: newDevice,
      token: result.token
    });
  } catch (err) {
    console.error('addDeviceAuto error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Tambah Perangkat Manual (Jika User Sudah Punya Device Token)
exports.addDeviceManual = async (req, res) => {
  try {
    const { nama, token, userId, isDefault = false } = req.body;
    if (!nama || !nama.trim() || !token || !token.trim()) {
      return res.status(400).json({ error: 'Nama perangkat dan Token Fonnte wajib diisi.' });
    }

    // Cek validitas token ke Fonnte
    const fonnteRes = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': token.trim() }
    });
    const fonnteData = await fonnteRes.json();

    const deviceStatus = fonnteData.status ? (fonnteData.device_status || 'connected') : 'disconnected';
    const nomorWa = fonnteData.device || null;

    if (isDefault) {
      await prisma.deviceWa.updateMany({ data: { isDefault: false } });
    }

    const newDevice = await prisma.deviceWa.create({
      data: {
        nama: nama.trim(),
        token: token.trim(),
        nomorWa,
        status: deviceStatus,
        isDefault: Boolean(isDefault),
        userId: userId ? parseInt(userId) : null
      },
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Perangkat WhatsApp berhasil ditambahkan!',
      device: newDevice,
      fonnteData
    });
  } catch (err) {
    console.error('addDeviceManual error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Ambil QR Code Perangkat untuk Scan Langsung di Web
exports.getDeviceQr = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    // Request QR Code dari Fonnte
    const response = await fetch('https://api.fonnte.com/qr', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'qr' })
    });
    const result = await response.json();

    if (result.status) {
      res.json({
        success: true,
        url: result.url, // Base64 image string atau image URL
        deviceId: device.id,
        nama: device.nama
      });
    } else {
      res.status(400).json({
        error: result.reason || 'Gagal menghasilkan QR Code dari Fonnte. Pastikan device belum terhubung atau lakukan reset.',
        raw: result
      });
    }
  } catch (err) {
    console.error('getDeviceQr error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Cek Status Perangkat Spesifik & Sinkronkan ke Database
exports.checkDeviceStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': device.token }
    });
    const result = await response.json();

    const isConnected = result.status && (result.device_status === 'connect' || result.device_status === 'connected');
    const newStatus = isConnected ? 'connected' : 'disconnected';
    const nomor = result.device || device.nomorWa;

    const updated = await prisma.deviceWa.update({
      where: { id: parseInt(id) },
      data: {
        status: newStatus,
        nomorWa: nomor
      },
      include: {
        user: { select: { id: true, nama: true, username: true, role: true } }
      }
    });

    res.json({
      success: true,
      device: updated,
      fonnte: result,
      isConnected
    });
  } catch (err) {
    console.error('checkDeviceStatusById error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 6. Putuskan Koneksi Perangkat (Disconnect)
exports.disconnectDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.deviceWa.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });

    const response = await fetch('https://api.fonnte.com/disconnect', {
      method: 'POST',
      headers: { 'Authorization': device.token }
    });
    const result = await response.json();

    await prisma.deviceWa.update({
      where: { id: parseInt(id) },
      data: { status: 'disconnected' }
    });

    res.json({
      success: true,
      message: `Perangkat ${device.nama} berhasil diputuskan.`,
      result
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
    await prisma.deviceWa.delete({ where: { id: parseInt(id) } });
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

    const targetFormatted = formatNomorWA(tujuanWa);
    const testMsg = `*TES KONEKSI SISTEM CPO TANKER*\n━━━━━━━━━━━━━━━━━━━━\n✅ Pengirim: ${device.nama}\n📱 Nomor: ${device.nomorWa || '-'}\n🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━\n_Pesan ini dikirim otomatis dari Dashboard Sistem CPO Tanker._`;

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target: targetFormatted, message: testMsg })
    });
    const result = await response.json();

    if (result.status) {
      res.json({ success: true, message: `Pesan tes berhasil dikirim ke ${targetFormatted}!`, result });
    } else {
      res.status(400).json({ error: result.reason || 'Gagal mengirim pesan tes.', result });
    }
  } catch (err) {
    console.error('testDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── USER SELF-SERVICE DEVICE (SURVEYOR / PETUGAS / ADMIN) ───

// A. Ambil Device Pengirim Milik User Sendiri
exports.getMyDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const device = await prisma.deviceWa.findFirst({
      where: { userId },
      include: { user: { select: { id: true, nama: true, username: true } } }
    });
    res.json({ device });
  } catch (err) {
    console.error('getMyDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// B. Minta QR Code Milik User Sendiri (Otomatis Buat / Pulihkan Device via Account Token)
exports.requestMyDeviceQr = async (req, res) => {
  try {
    const user = req.user;
    const { nomorWa: inputNomorWa } = req.body || {};
    let device = await prisma.deviceWa.findFirst({ where: { userId: user.id } });

    // Format nomor WhatsApp jika diinput oleh user
    let formattedPhone = '';
    if (inputNomorWa && inputNomorWa.trim()) {
      let raw = inputNomorWa.trim().replace(/[^0-9]/g, '');
      if (raw.startsWith('08')) raw = '628' + raw.slice(2);
      else if (raw.startsWith('8')) raw = '628' + raw.slice(1);
      formattedPhone = raw;
    } else if (user.kontakWa && user.kontakWa.trim()) {
      let raw = user.kontakWa.trim().replace(/[^0-9]/g, '');
      if (raw.startsWith('08')) raw = '628' + raw.slice(2);
      else if (raw.startsWith('8')) raw = '628' + raw.slice(1);
      formattedPhone = raw;
    }

    // Jika user menginput nomor baru yang berbeda dengan user.kontakWa, update profil user
    if (formattedPhone && formattedPhone !== user.kontakWa) {
      await prisma.user.update({
        where: { id: user.id },
        data: { kontakWa: formattedPhone }
      });
    }

    // Cek apakah device ada dan tokennya masih valid di Fonnte
    let isTokenValid = false;
    if (device && device.token) {
      // Jika nomor HP yang diminta berbeda dengan nomorWa device sekarang, buat ulang dengan nomor yang benar
      if (formattedPhone && device.nomorWa && formattedPhone !== device.nomorWa.replace(/[^0-9]/g, '')) {
        isTokenValid = false;
      } else {
        try {
          const checkRes = await fetch('https://api.fonnte.com/device', {
            method: 'POST',
            headers: { 'Authorization': device.token }
          });
          const checkData = await checkRes.json();
          // Token valid jika status true atau reason bukan token invalid
          if (checkData.status || (checkData.reason !== 'token invalid' && checkData.reason !== 'device not found')) {
            isTokenValid = true;
            // Jika ternyata sudah terhubung di Fonnte
            if (checkData.device_status === 'connect' || checkData.device_status === 'connected') {
              const updated = await prisma.deviceWa.update({
                where: { id: device.id },
                data: {
                  status: 'connected',
                  nomorWa: checkData.device || device.nomorWa
                }
              });
              return res.json({
                success: true,
                alreadyConnected: true,
                message: 'Perangkat WhatsApp Anda sudah terhubung!',
                device: updated
              });
            }
          }
        } catch (e) {
          console.warn('Gagal cek token device Fonnte:', e.message);
        }
      }
    }

    // Jika belum punya device atau token lama sudah tidak valid/expired/nomor berbeda
    if (!device || !isTokenValid) {
      const accountToken = await getFonnteAccountToken();
      if (!accountToken) {
        return res.status(400).json({
          error: 'Fonnte Account Token belum diatur oleh Admin di Pengaturan Sistem. Silakan hubungi Admin.'
        });
      }

      const deviceName = `WA - ${user.nama || user.username}`.substring(0, 30);
      
      // Validasi nomor WhatsApp asli
      let targetPhone = formattedPhone;
      if (!targetPhone || targetPhone.length < 9) {
        return res.status(400).json({
          error: 'Silakan masukkan nomor WhatsApp Anda terlebih dahulu sebelum memindai QR Code.'
        });
      }

      // Bersihkan device lama di Fonnte jika ada agar slot akun tidak penuh
      if (device && device.token) {
        try {
          await fetch('https://api.fonnte.com/delete-device', {
            method: 'POST',
            headers: { 'Authorization': accountToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: device.token })
          });
        } catch (e) {
          // Silent ignore
        }
      }

      let createRes = await fetch('https://api.fonnte.com/add-device', {
        method: 'POST',
        headers: {
          'Authorization': accountToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: deviceName,
          device: targetPhone
        })
      });
      let createData = await createRes.json();

      if (!createData.status || !createData.token) {
        return res.status(400).json({
          error: `Gagal mendaftarkan nomor ${targetPhone} ke Fonnte: ${createData.reason || 'Periksa nomor WhatsApp atau kuota device akun Fonnte Anda.'}`,
          raw: createData
        });
      }

      if (device) {
        device = await prisma.deviceWa.update({
          where: { id: device.id },
          data: {
            nama: deviceName,
            token: createData.token,
            nomorWa: createData.device || targetPhone,
            status: 'disconnected'
          }
        });
      } else {
        device = await prisma.deviceWa.create({
          data: {
            nama: deviceName,
            token: createData.token,
            nomorWa: createData.device || targetPhone,
            status: 'disconnected',
            isDefault: false,
            userId: user.id
          }
        });
      }
    }

    // Ambil QR Code dari Fonnte menggunakan device.token
    const qrRes = await fetch('https://api.fonnte.com/qr', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'qr' })
    });
    const qrData = await qrRes.json();

    if (qrData.status) {
      return res.json({
        success: true,
        url: qrData.url,
        deviceId: device.id,
        nama: device.nama,
        nomorWa: device.nomorWa
      });
    } else {
      // Jika Fonnte menolak karena device sudah connect
      if (qrData.reason && qrData.reason.includes('already connect')) {
        const updated = await prisma.deviceWa.update({
          where: { id: device.id },
          data: { status: 'connected' }
        });
        return res.json({
          success: true,
          alreadyConnected: true,
          message: 'Perangkat WhatsApp Anda sudah terhubung!',
          device: updated
        });
      }

      return res.status(400).json({
        error: qrData.reason || 'Gagal menghasilkan QR Code dari Fonnte. Silakan coba lagi beberapa saat.',
        raw: qrData
      });
    }
  } catch (err) {
    console.error('requestMyDeviceQr error:', err);
    res.status(500).json({ error: err.message });
  }
};

// C. Cek Status Koneksi WhatsApp User Sendiri
exports.checkMyDeviceStatus = async (req, res) => {
  try {
    const user = req.user;
    const device = await prisma.deviceWa.findFirst({ where: { userId: user.id } });
    if (!device) return res.json({ connected: false, device: null });

    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': device.token }
    });
    const result = await response.json();

    const isConnected = result.status && (result.device_status === 'connect' || result.device_status === 'connected');
    const newStatus = isConnected ? 'connected' : 'disconnected';
    const nomor = result.device || device.nomorWa;

    const updated = await prisma.deviceWa.update({
      where: { id: device.id },
      data: {
        status: newStatus,
        nomorWa: nomor
      }
    });

    res.json({
      connected: isConnected,
      status: newStatus,
      device: updated,
      raw: result
    });
  } catch (err) {
    console.error('checkMyDeviceStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

// D. Putuskan Koneksi WhatsApp User Sendiri
exports.disconnectMyDevice = async (req, res) => {
  try {
    const user = req.user;
    const device = await prisma.deviceWa.findFirst({ where: { userId: user.id } });
    if (!device) return res.status(404).json({ error: 'Perangkat WhatsApp tidak ditemukan.' });

    const accountToken = await getFonnteAccountToken();

    try {
      await fetch('https://api.fonnte.com/disconnect', {
        method: 'POST',
        headers: { 'Authorization': device.token }
      });
      if (accountToken) {
        await fetch('https://api.fonnte.com/delete-device', {
          method: 'POST',
          headers: { 'Authorization': accountToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: device.token })
        });
      }
    } catch (e) {
      console.warn('Fonnte disconnect error:', e.message);
    }

    await prisma.deviceWa.delete({
      where: { id: device.id }
    });

    res.json({ success: true, message: 'WhatsApp berhasil diputuskan dan siap dihubungkan kembali.' });
  } catch (err) {
    console.error('disconnectMyDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// E. Hubungkan Token WhatsApp Manual untuk User Sendiri
exports.saveMyDeviceToken = async (req, res) => {
  try {
    const { token, nama } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Token WhatsApp Fonnte wajib diisi.' });
    }

    const cleanToken = token.trim();
    const user = req.user;

    // Validasi token ke Fonnte
    const fonnteRes = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': cleanToken }
    });
    const fonnteData = await fonnteRes.json();
    const isConnected = fonnteData.status && (fonnteData.device_status === 'connect' || fonnteData.device_status === 'connected');
    const nomor = fonnteData.device || null;

    const existing = await prisma.deviceWa.findFirst({ where: { userId: user.id } });
    let device;
    if (existing) {
      device = await prisma.deviceWa.update({
        where: { id: existing.id },
        data: {
          token: cleanToken,
          nama: (nama && nama.trim()) || existing.nama,
          status: isConnected ? 'connected' : 'disconnected',
          nomorWa: nomor || existing.nomorWa
        }
      });
    } else {
      device = await prisma.deviceWa.create({
        data: {
          token: cleanToken,
          nama: (nama && nama.trim()) || `WA - ${user.nama}`,
          status: isConnected ? 'connected' : 'disconnected',
          nomorWa: nomor,
          userId: user.id,
          isDefault: false
        }
      });
    }

    res.json({
      success: true,
      message: 'Perangkat WhatsApp berhasil disimpan!',
      device
    });
  } catch (err) {
    console.error('saveMyDeviceToken error:', err);
    res.status(500).json({ error: err.message });
  }
};

// F. Tes Kirim Pesan dari WhatsApp User Sendiri
exports.testMyDevice = async (req, res) => {
  try {
    const user = req.user;
    const device = await prisma.deviceWa.findFirst({ where: { userId: user.id } });
    if (!device) return res.status(404).json({ error: 'Perangkat WhatsApp Anda belum terdaftar.' });

    const { tujuanWa } = req.body;
    const target = tujuanWa || device.nomorWa || user.kontakWa;
    if (!target) return res.status(400).json({ error: 'Nomor tujuan tes wajib diisi.' });

    const targetFormatted = formatNomorWA(target);
    const testMsg = `*TES KONEKSI WHATSAPP SURVEYOR*\n━━━━━━━━━━━━━━━━━━━━\n✅ Akun: ${user.nama} (${user.role})\n📱 Nomor WA: ${device.nomorWa || '-'}\n🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━\n_WhatsApp Anda siap digunakan untuk mengirim laporan otomatis dari aplikasi CPO Tanker._`;

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target: targetFormatted, message: testMsg })
    });
    const result = await response.json();

    if (result.status) {
      res.json({ success: true, message: `Pesan uji coba berhasil dikirim ke ${targetFormatted}!`, result });
    } else {
      res.status(400).json({ error: result.reason || 'Gagal mengirim pesan uji coba.', raw: result });
    }
  } catch (err) {
    console.error('testMyDevice error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── LEGACY / GLOBAL DEVICE STATUS & TEST ───

exports.checkDeviceStatus = async (req, res) => {
  try {
    const fonnteToken = getFonnteToken(req);
    if (!fonnteToken) {
      return res.status(400).json({ error: 'API Token Fonnte belum diatur. Silakan masukkan token di Pengaturan atau file .env.' });
    }

    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': fonnteToken },
    });
    const result = await response.json();

    if (result.status) {
      return res.json({
        success: true,
        message: 'Device Fonnte terhubung!',
        device: result.device || '-',
        name: result.name || '-',
        deviceStatus: result.device_status || 'connected',
        expired: result.expired || '-'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Device Fonnte tidak terhubung atau token salah.',
        raw: result
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.testKoneksi = async (req, res) => {
  try {
    const fonnteToken = getFonnteToken(req);
    if (!fonnteToken) {
      return res.status(400).json({ error: 'API Token Fonnte belum diatur.' });
    }

    const { tujuanWa } = req.body;
    if (!tujuanWa) {
      return res.status(400).json({ error: 'Nomor WhatsApp tujuan tes wajib diisi.' });
    }

    const targetFormatted = formatNomorWA(tujuanWa);
    const testMessage = `*TES KONEKSI SISTEM CPO TANKER*\n━━━━━━━━━━━━━━━━━━━━\n✅ Integrasi WhatsApp Fonnte Berhasil!\n🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━━━━━\n_Pesan ini dikirim secara otomatis dari Dashboard Pengaturan._`;

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetFormatted, message: testMessage }),
    });
    const result = await response.json();

    if (result.status) {
      res.json({ message: 'Pesan tes WhatsApp berhasil terkirim ke ' + targetFormatted, result });
    } else {
      res.status(400).json({ error: 'Gagal kirim pesan tes: ' + (result.reason || 'Token atau nomor tidak valid'), result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Kumpulkan target penerima (bisa dari array targets atau string koma tujuanWa)
    let rawTargets = [];
    if (Array.isArray(targets) && targets.length > 0) {
      rawTargets = targets;
    } else if (tujuanWa) {
      rawTargets = tujuanWa.toString().split(',');
    }

    const cleanedTargets = rawTargets
      .map(n => formatNomorWA(n))
      .filter(Boolean);

    if (cleanedTargets.length === 0) {
      return res.status(400).json({ error: 'Nomor WhatsApp tujuan wajib diisi (minimal 1 kontak).' });
    }

    // Ambil token pengirim berdasarkan deviceId atau default
    const { token: fonnteToken, device: senderDevice } = await resolveSenderToken(req, deviceId);
    if (!fonnteToken) {
      return res.status(400).json({
        error: 'Tidak ada Akun WhatsApp pengirim yang aktif. Silakan tambahkan dan hubungkan akun WhatsApp di menu Pusat WhatsApp.'
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

    // Gunakan pesanCustom jika dikirimkan oleh user, jika tidak gunakan template default
    const pesan = (pesanCustom && pesanCustom.trim())
      ? pesanCustom.trim()
      : generatePesanWA(pengiriman, totalBerangkat, totalDatang, blKg, r1Pct, r2Pct, r3Pct, diffR1, diffR2, diffR3, pdfDownloadUrl);

    // Target format Fonnte: dipisahkan koma untuk broadcast
    const targetString = cleanedTargets.join(',');

    let result;
    if (attachPdf) {
      try {
        const pdfBuffer = await generatePengirimanPDFBuffer(pengiriman);
        const filename = `Laporan_CPO_${(pengiriman.kapal?.namaKapal || 'Kapal').replace(/\s/g, '_')}_${pengiriman.nomorBl || pengiriman.id}.pdf`;

        const formData = new FormData();
        formData.append('target', targetString);
        formData.append('message', pesan);
        const file = new File([pdfBuffer], filename, { type: 'application/pdf' });
        formData.append('file', file);
        formData.append('filename', filename);
        formData.append('countryCode', '62');

        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': fonnteToken },
          body: formData,
        });
        result = await response.json();
      } catch (pdfErr) {
        console.error('Error sending PDF attachment with Fonnte, falling back to text:', pdfErr);
        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: targetString, message: pesan, countryCode: '62' }),
        });
        result = await response.json();
      }
    } else {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetString, message: pesan, countryCode: '62' }),
      });
      result = await response.json();
    }

    if (result && result.status) {
      const penerimaText = cleanedTargets.length > 1
        ? `${cleanedTargets.length} penerima (Broadcast)`
        : cleanedTargets[0];

      res.json({
        success: true,
        message: `Laporan berhasil dikirim ke ${penerimaText}!`,
        pesan,
        target: targetString,
        totalPenerima: cleanedTargets.length,
        senderDevice: senderDevice ? senderDevice.nama : 'Default',
        pdfAttached: attachPdf,
        fonnteResult: result
      });
    } else {
      const reason = result?.reason || 'Unknown error dari Fonnte';
      console.warn('Fonnte send failed:', result);
      res.status(400).json({
        error: `Gagal kirim WhatsApp: ${reason}.`,
        pesan,
        result
      });
    }
  } catch (err) {
    console.error('kirimLaporan error:', err);
    res.status(500).json({ error: err.message });
  }
};
