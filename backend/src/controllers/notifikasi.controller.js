const prisma = require('../lib/prisma');

// Helper internal: Kirim notifikasi ke semua user LAIN (kecuali sender/pembuat aksi)
const createNotification = async ({ judul, pesan, tipe, pengirimanId = null, senderUserId = null }) => {
  try {
    // Cari semua user selain pembuat aksi
    const otherUsers = await prisma.user.findMany({
      where: senderUserId ? { id: { not: parseInt(senderUserId) } } : {},
      select: { id: true },
    });

    if (!otherUsers || otherUsers.length === 0) return;

    // Buat baris notifikasi untuk masing-masing user penerima
    for (const u of otherUsers) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO notifikasi (user_id, judul, pesan, tipe, pengiriman_id, is_read, created_at) VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
        u.id,
        judul,
        pesan,
        tipe,
        pengirimanId ? parseInt(pengirimanId) : null
      );
    }
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// GET /api/notifikasi (Hanya notifikasi milik user yang sedang login)
const getNotifikasi = async (req, res) => {
  try {
    const userId = req.user.id;

    const list = await prisma.$queryRaw`
      SELECT id, judul, pesan, tipe, pengiriman_id as "pengirimanId", is_read as "isRead", created_at as "createdAt"
      FROM notifikasi
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 30
    `;

    const unreadResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as "unreadCount"
      FROM notifikasi
      WHERE user_id = ${userId} AND is_read = FALSE
    `;

    const unreadCount = unreadResult[0]?.unreadCount || 0;

    res.json({
      data: list,
      unreadCount,
    });
  } catch (err) {
    console.error('Error getNotifikasi:', err);
    res.status(500).json({ error: 'Gagal memuat notifikasi' });
  }
};

// PUT /api/notifikasi/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await prisma.$executeRawUnsafe(
      `UPDATE notifikasi SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      parseInt(id),
      userId
    );
    res.json({ message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error markAsRead:', err);
    res.status(500).json({ error: 'Gagal memperbarui notifikasi' });
  }
};

// PUT /api/notifikasi/read-all (Tandai semua notifikasi milik user ini sebagai dibaca)
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.$executeRawUnsafe(
      `UPDATE notifikasi SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      userId
    );
    res.json({ message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error markAllAsRead:', err);
    res.status(500).json({ error: 'Gagal memperbarui notifikasi' });
  }
};

// DELETE /api/notifikasi/:id
const deleteNotifikasi = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (id === 'all-read') {
      await prisma.$executeRawUnsafe(
        `DELETE FROM notifikasi WHERE user_id = $1 AND is_read = TRUE`,
        userId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM notifikasi WHERE id = $1 AND user_id = $2`,
        parseInt(id),
        userId
      );
    }
    res.json({ message: 'Notifikasi berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteNotifikasi:', err);
    res.status(500).json({ error: 'Gagal menghapus notifikasi' });
  }
};

module.exports = {
  createNotification,
  getNotifikasi,
  markAsRead,
  markAllAsRead,
  deleteNotifikasi,
};
