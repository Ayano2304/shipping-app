const PDFDocument = require('pdfkit');

const toKg = (nilai, satuan) => satuan === 'MT' ? parseFloat(nilai) * 1000 : parseFloat(nilai);

const formatAngka = (n, decimal = 0) => {
  if (n === null || n === undefined || isNaN(n) || n === '') return '-';
  return parseFloat(n).toLocaleString('id-ID', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

/**
 * Generate PDF buffer for a Pengiriman record (with kapal, dataPalka, createdBy, dischargedBy included)
 * @param {Object} pengiriman
 * @returns {Promise<Buffer>}
 */
exports.generatePengirimanPDFBuffer = (pengiriman) => {
  return new Promise((resolve, reject) => {
    try {
      const blKg = pengiriman.nilaiBl ? toKg(pengiriman.nilaiBl, pengiriman.satuanBl) : 0;
      const keberangkatan = pengiriman.dataPalka ? pengiriman.dataPalka.filter(d => d.tipe === 'KEBERANGKATAN') : [];
      const kedatangan = pengiriman.dataPalka ? pengiriman.dataPalka.filter(d => d.tipe === 'KEDATANGAN') : [];
      const totalBerangkat = keberangkatan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      const totalDatang = kedatangan.reduce((s, d) => s + (parseFloat(d.beratHasil) || 0), 0);
      
      const isArrived = pengiriman.status === 'SELESAI' && totalDatang > 0;
      
      const diffR1 = totalBerangkat - blKg;
      const diffR2 = isArrived ? (totalDatang - totalBerangkat) : 0;
      const diffR3 = isArrived ? (totalDatang - blKg) : 0;
      
      const r1Pct = blKg > 0 ? (diffR1 / blKg * 100) : 0;
      const r2Pct = isArrived && totalBerangkat > 0 ? (diffR2 / totalBerangkat * 100) : 0;
      const r3Pct = isArrived && blKg > 0 ? (diffR3 / blKg * 100) : 0;

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header Title
      doc.fontSize(15).font('Helvetica-Bold').text('LAPORAN PERHITUNGAN MUATAN CPO TANKER', 40, 40, { align: 'center', width: 515 });
      doc.moveDown(0.2);
      doc.fontSize(9.5).font('Helvetica').text(`Kapal: ${pengiriman.kapal?.namaKapal || '-'}   |   No. B/L: ${pengiriman.nomorBl || '-'}`, 40, doc.y, { align: 'center', width: 515 });
      doc.moveDown(0.3);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      // Meta Info Box
      const startY = doc.y;
      doc.rect(40, startY, 515, 60).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
      
      doc.text(`Tanggal Berangkat: ${fmtDate(pengiriman.tanggalBerangkat)}`, 50, startY + 10);
      doc.text(`Tanggal Tiba: ${fmtDate(pengiriman.tanggalSampai)}`, 50, startY + 25);
      doc.text(`Status: ${pengiriman.status}`, 50, startY + 40);

      doc.text(`B/L (Kontrak): ${formatAngka(blKg)} KG`, 310, startY + 10);
      doc.text(`Petugas Muat: ${pengiriman.createdBy?.nama || '-'}`, 310, startY + 25);
      doc.text(`Petugas Bongkar: ${pengiriman.dischargedBy?.nama || '-'}`, 310, startY + 40);

      doc.x = 40;
      doc.y = startY + 75;

      // Helper for table rendering
      const renderPalkaTable = (title, palkaList, totalBerat, labelTotal) => {
        doc.x = 40;
        doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica-Bold').text(title, 40, doc.y);
        doc.moveDown(0.35);

        const tableTop = doc.y;
        const headers = ['Nama Palka', 'Tinggi (cm)', 'Point', 'Suhu (°C)', 'Volume (L)', 'Density', 'Berat (KG)'];
        const colWidths = [95, 65, 55, 60, 80, 65, 95];

        // Header row
        doc.rect(40, tableTop, 515, 20).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8);

        let curX = 45;
        headers.forEach((h, idx) => {
          doc.text(h, curX, tableTop + 6, { width: colWidths[idx] - 10, align: idx === 0 ? 'left' : 'right' });
          curX += colWidths[idx];
        });

        let rowY = tableTop + 20;
        doc.font('Helvetica').fontSize(8);

        palkaList.forEach((p, rIdx) => {
          const bg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(40, rowY, 515, 18).fillAndStroke(bg, '#e2e8f0');
          doc.fillColor('#1e293b');

          curX = 45;
          const rowData = [
            p.namaPalka,
            p.tinggiCm ? `${p.tinggiCm}` : '-',
            p.point !== null && p.point !== undefined ? `${p.point}` : '-',
            p.suhu ? `${p.suhu}°C` : '-',
            formatAngka(p.volumeLiter, 0),
            formatAngka(p.density, 4),
            `${formatAngka(p.beratHasil, 0)} KG`
          ];

          rowData.forEach((val, cIdx) => {
            doc.text(val, curX, rowY + 5, { width: colWidths[cIdx] - 10, align: cIdx === 0 ? 'left' : 'right' });
            curX += colWidths[cIdx];
          });
          rowY += 18;
        });

        // Total row
        doc.rect(40, rowY, 515, 20).fillAndStroke('#e0f2fe', '#bae6fd');
        doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(8.5);
        doc.text(labelTotal, 45, rowY + 6);
        doc.text(`${formatAngka(totalBerat, 0)} KG`, 555 - 120, rowY + 6, { width: 110, align: 'right' });

        doc.x = 40;
        doc.y = rowY + 38; // Jarak longgar setelah tabel
      };

      // Render SFAL Table (Left aligned title)
      renderPalkaTable('1. SFAL (Sounding Figure At Loading — Muatan Asal)', keberangkatan, totalBerangkat, 'TOTAL SFAL (MUAT)');

      // Render SFBD Table (Left aligned title)
      if (kedatangan.length > 0) {
        renderPalkaTable('2. SFBD (Sounding Figure Before Discharge — Muatan Tujuan)', kedatangan, totalDatang, 'TOTAL SFBD (BONGKAR)');
      }

      // 3. ANALISA RASIO SUSUT
      doc.x = 40;
      doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica-Bold').text('3. ANALISA RASIO SUSUT', 40, doc.y);
      doc.moveDown(0.4);

      const formatSignKg = (n) => {
        if (n === null || n === undefined) return '-';
        if (n > 0) return `+${formatAngka(n, 0)} KG`;
        if (n < 0) return `${formatAngka(n, 0)} KG`;
        return '0 KG';
      };

      const formatSignPct = (pct) => {
        if (pct === null || pct === undefined) return '-';
        if (pct > 0) return `+${pct.toFixed(4)} %`;
        if (pct < 0) return `${pct.toFixed(4)} %`;
        return '0.0000 %';
      };

      const renderRatioBox = (title, selisihText, rasioText) => {
        // Cek apakah sisa halaman cukup untuk 1 box (50pt) + buffer
        if (doc.y + 54 > 800) {
          doc.addPage();
        }

        const boxY = doc.y;
        const boxWidth = 515;
        const headerHeight = 19;
        const bodyHeight = 31;
        const totalHeight = headerHeight + bodyHeight;

        // Header Box
        doc.rect(40, boxY, boxWidth, headerHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(title, 50, boxY + 5.5, {
          width: boxWidth - 20,
          align: 'left'
        });

        // Body Box
        doc.rect(40, boxY + headerHeight, boxWidth, bodyHeight).fillAndStroke('#ffffff', '#cbd5e1');

        // Line 1: Selisih Muatan
        doc.fillColor('#475569').font('Helvetica').fontSize(8.5).text('Selisih Muatan', 50, boxY + headerHeight + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(`:  ${selisihText}`, 145, boxY + headerHeight + 6);

        // Line 2: Rasio
        doc.fillColor('#475569').font('Helvetica').fontSize(8.5).text('Rasio', 50, boxY + headerHeight + 18);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(`:  ${rasioText}`, 145, boxY + headerHeight + 18);

        // Update Y cursor for next box with 7pt gap
        doc.y = boxY + totalHeight + 7;
      };

      // Box R1
      renderRatioBox(
        'R1 - PERBANDINGAN SFAL TERHADAP BILL OF LADING',
        formatSignKg(diffR1),
        formatSignPct(r1Pct)
      );

      // Box R2
      renderRatioBox(
        'R2 - SUSUT PELAYARAN',
        isArrived ? formatSignKg(diffR2) : 'Menunggu Tiba (Kapal Dalam Pelayaran)',
        isArrived ? formatSignPct(r2Pct) : 'Menunggu Tiba'
      );

      // Box R3
      renderRatioBox(
        'R3 - HASIL AKHIR TERHADAP BILL OF LADING',
        isArrived ? formatSignKg(diffR3) : 'Menunggu Tiba',
        isArrived ? formatSignPct(r3Pct) : 'Menunggu Tiba'
      );

      // Selesai (Tanpa kolom tanda tangan)
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
