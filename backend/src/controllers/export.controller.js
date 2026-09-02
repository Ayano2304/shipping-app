const prisma = require('../lib/prisma');
const { generatePengirimanPDFBuffer } = require('../utils/pdfGenerator');
const crypto = require('crypto');

const generatePdfToken = (id, createdAt) => {
  const secret = process.env.JWT_SECRET || 'shipping_secret';
  const timestamp = createdAt ? new Date(createdAt).getTime() : 0;
  return crypto.createHmac('sha256', secret).update(`${id}:${timestamp}`).digest('hex').slice(0, 20);
};

exports.generatePdfToken = generatePdfToken;

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
