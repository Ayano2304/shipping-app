const prisma = require('../lib/prisma');
const { generatePengirimanPDFBuffer } = require('../utils/pdfGenerator');
const crypto = require('crypto');

const generatePdfToken = (id, createdAt) => {
  const secret = process.env.JWT_SECRET || 'shipping_secret';
  const timestamp = createdAt ? new Date(createdAt).getTime() : 0;
  return crypto.createHmac('sha256', secret).update(`${id}:${timestamp}`).digest('hex').slice(0, 10);
};

const generateReportSlug = (pengiriman) => {
  const kapalSlug = (pengiriman.kapal?.namaKapal || 'KAPAL')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
  const token = generatePdfToken(pengiriman.id, pengiriman.createdAt);
  return `${kapalSlug}-${pengiriman.id}-${token}`;
};

exports.generatePdfToken = generatePdfToken;
exports.generateReportSlug = generateReportSlug;

// Endpoint publik via slug bersih: /report/HK-III-20-a8f93e7c1b
exports.exportPublicReportBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) return res.status(400).json({ error: 'Kode dokumen tidak valid.' });

    // Parse format: [NAMA-KAPAL]-[ID]-[TOKEN]
    const match = slug.match(/^(.*)-(\d+)-([a-f0-9]+)$/i);
    if (!match) {
      return res.status(400).json({ error: 'Format tautan dokumen tidak valid.' });
    }

    const id = parseInt(match[2]);
    const providedToken = match[3].toLowerCase();

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id },
      include: {
        kapal: true,
        createdBy: { select: { nama: true } },
        dischargedBy: { select: { nama: true } },
        dataPalka: { orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }] },
      },
    });

    if (!pengiriman) return res.status(404).json({ error: 'Dokumen pengiriman tidak ditemukan.' });

    // Validasi Signed Security Token (HMAC)
    const validToken = generatePdfToken(pengiriman.id, pengiriman.createdAt);
    if (providedToken !== validToken.toLowerCase()) {
      return res.status(403).json({
        error: 'Akses ditolak. Tautan dokumen tidak valid atau telah kedaluwarsa.'
      });
    }

    const buffer = await generatePengirimanPDFBuffer(pengiriman);
    const filename = `Laporan_CPO_${(pengiriman.kapal?.namaKapal || 'Kapal').replace(/\s/g, '_')}_${pengiriman.nomorBl || pengiriman.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Export Public Report error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Endpoint internal terotentikasi
exports.exportPengirimanPDF = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'ID pengiriman tidak valid.' });

    const pengiriman = await prisma.pengiriman.findUnique({
      where: { id },
      include: {
        kapal: true,
        createdBy: { select: { nama: true } },
        dischargedBy: { select: { nama: true } },
        dataPalka: { orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }] },
      },
    });

    if (!pengiriman) return res.status(404).json({ error: 'Dokumen pengiriman tidak ditemukan.' });

    const buffer = await generatePengirimanPDFBuffer(pengiriman);
    const filename = `Laporan_CPO_${(pengiriman.kapal?.namaKapal || 'Kapal').replace(/\s/g, '_')}_${pengiriman.nomorBl || pengiriman.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};
