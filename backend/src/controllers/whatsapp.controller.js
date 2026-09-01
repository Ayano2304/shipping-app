const { PrismaClient } = require('@prisma/client');
const { generatePengirimanPDFBuffer } = require('../utils/pdfGenerator');
const { generatePdfToken } = require('./export.controller');
const prisma = new PrismaClient();

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

// ─── WA CONNECTION & SEND ───

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

    const { tujuanWa, attachPdf = true, pesanCustom } = req.body;
    if (!tujuanWa) return res.status(400).json({ error: 'Nomor WA tujuan wajib diisi.' });

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
    const pdfToken = generatePdfToken(pengiriman.id, pengiriman.createdAt);
    const pdfDownloadUrl = `${backendUrl}/api/export/public/pdf/${pengiriman.id}?token=${pdfToken}`;

    // Gunakan pesanCustom jika dikirimkan oleh user, jika tidak gunakan generatePesanWA default
    const pesan = (pesanCustom && pesanCustom.trim())
      ? pesanCustom.trim()
      : generatePesanWA(pengiriman, totalBerangkat, totalDatang, blKg, r1Pct, r2Pct, r3Pct, diffR1, diffR2, diffR3, pdfDownloadUrl);

    const fonnteToken = getFonnteToken(req);
    if (!fonnteToken) {
      return res.status(400).json({
        error: 'API Token Fonnte belum diatur. Silakan atur token di menu Pengaturan (Dashboard Admin) atau di file .env server.'
      });
    }

    const targetFormatted = formatNomorWA(tujuanWa);

    let result;
    if (attachPdf) {
      try {
        const pdfBuffer = await generatePengirimanPDFBuffer(pengiriman);
        const filename = `Laporan_CPO_${(pengiriman.kapal?.namaKapal || 'Kapal').replace(/\s/g, '_')}_${pengiriman.nomorBl || pengiriman.id}.pdf`;

        const formData = new FormData();
        formData.append('target', targetFormatted);
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
        // Fallback to text only
        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: targetFormatted, message: pesan, countryCode: '62' }),
        });
        result = await response.json();
      }
    } else {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetFormatted, message: pesan, countryCode: '62' }),
      });
      result = await response.json();
    }

    if (result && result.status) {
      res.json({
        success: true,
        message: attachPdf
          ? 'Laporan dan file dokumen PDF berhasil dikirim ke WhatsApp!'
          : 'Laporan berhasil dikirim via WhatsApp!',
        pesan,
        target: targetFormatted,
        pdfAttached: attachPdf,
        fonnteResult: result
      });
    } else {
      const reason = result?.reason || 'Unknown error dari Fonnte';
      console.warn('Fonnte send failed:', result);
      res.status(400).json({
        error: `Gagal kirim WhatsApp: ${reason}. ${reason.toLowerCase().includes('media') || reason.toLowerCase().includes('package') ? '(Catatan: Pengiriman dokumen PDF di Fonnte memerlukan paket yang mendukung media)' : ''}`,
        pesan,
        result
      });
    }
  } catch (err) {
    console.error('kirimLaporan error:', err);
    res.status(500).json({ error: err.message });
  }
};
