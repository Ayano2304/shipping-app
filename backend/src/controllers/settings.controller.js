const prisma = require('../lib/prisma');

// Helper function untuk mengambil Fonnte Account Token dari DB atau .env
const getFonnteAccountToken = async () => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'FONNTE_ACCOUNT_TOKEN' }
    });
    if (setting && setting.value && setting.value.trim()) {
      return setting.value.trim();
    }
  } catch (err) {
    console.error('getFonnteAccountToken DB error:', err.message);
  }
  return (process.env.FONNTE_ACCOUNT_TOKEN || process.env.FONNTE_TOKEN || '').trim();
};

exports.getFonnteAccountToken = getFonnteAccountToken;

// GET /api/settings/fonnte - Ambil info token (disamarkan) dan info akun
exports.getFonnteSetting = async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'FONNTE_ACCOUNT_TOKEN' }
    });

    const rawToken = setting?.value || process.env.FONNTE_ACCOUNT_TOKEN || process.env.FONNTE_TOKEN || '';
    const hasToken = Boolean(rawToken && rawToken.trim());
    
    // Masking token (contoh: a1b2...x9z0)
    let maskedToken = '';
    if (hasToken) {
      const trimmed = rawToken.trim();
      if (trimmed.length > 8) {
        maskedToken = `${trimmed.substring(0, 4)}••••••••${trimmed.substring(trimmed.length - 4)}`;
      } else {
        maskedToken = '••••••••';
      }
    }

    res.json({
      hasToken,
      maskedToken,
      source: setting?.value ? 'database' : (process.env.FONNTE_ACCOUNT_TOKEN || process.env.FONNTE_TOKEN) ? 'env' : 'none',
      updatedAt: setting?.updatedAt || null
    });
  } catch (err) {
    console.error('getFonnteSetting error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/settings/fonnte - Simpan Fonnte Account Token ke Database
exports.updateFonnteSetting = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Token akun Fonnte tidak boleh kosong.' });
    }

    const cleanToken = token.trim();

    // Verifikasi ke Fonnte API
    let fonnteAccountInfo = null;
    try {
      const fonnteRes = await fetch('https://api.fonnte.com/get-devices', {
        method: 'POST',
        headers: { 'Authorization': cleanToken }
      });
      const fonnteData = await fonnteRes.json();
      if (!fonnteData.status) {
        return res.status(400).json({
          error: `Token Fonnte tidak valid: ${fonnteData.reason || 'Ditolak oleh Fonnte API'}`
        });
      }
      fonnteAccountInfo = fonnteData;
    } catch (apiErr) {
      console.warn('Gagal verifikasi awal Fonnte API:', apiErr.message);
    }

    // Upsert ke system_settings
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'FONNTE_ACCOUNT_TOKEN' },
      update: {
        value: cleanToken,
        deskripsi: 'Fonnte Master Account Token untuk pendaftaran multi-device surveyor'
      },
      create: {
        key: 'FONNTE_ACCOUNT_TOKEN',
        value: cleanToken,
        deskripsi: 'Fonnte Master Account Token untuk pendaftaran multi-device surveyor'
      }
    });

    res.json({
      success: true,
      message: 'Fonnte Account Token berhasil disimpan di database!',
      fonnteInfo: fonnteAccountInfo
    });
  } catch (err) {
    console.error('updateFonnteSetting error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/settings/fonnte/check - Cek status dan kuota akun Fonnte dari API
exports.checkFonnteAccount = async (req, res) => {
  try {
    const token = await getFonnteAccountToken();
    if (!token) {
      return res.status(400).json({
        error: 'Belum ada Fonnte Account Token yang disimpan. Silakan masukkan token terlebih dahulu.'
      });
    }

    // Call get-devices di Fonnte
    const fonnteRes = await fetch('https://api.fonnte.com/get-devices', {
      method: 'POST',
      headers: { 'Authorization': token }
    });
    const fonnteData = await fonnteRes.json();

    if (!fonnteData.status) {
      return res.status(400).json({
        error: fonnteData.reason || 'Gagal memverifikasi akun Fonnte.',
        raw: fonnteData
      });
    }

    res.json({
      success: true,
      status: fonnteData.status,
      devices: fonnteData.data || [],
      totalDevices: (fonnteData.data || []).length,
      raw: fonnteData
    });
  } catch (err) {
    console.error('checkFonnteAccount error:', err);
    res.status(500).json({ error: err.message });
  }
};
