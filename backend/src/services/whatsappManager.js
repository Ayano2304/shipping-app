const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');

class WhatsAppManager {
  constructor() {
    // Map of deviceId (Number) => { client, qr, status, info, qrResolvers: [] }
    this.sessions = new Map();
    this.sessionPath = path.join(__dirname, '../../.wwebjs_auth');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      try {
        fs.mkdirSync(this.sessionPath, { recursive: true });
      } catch (e) {
        console.error('Failed to create .wwebjs_auth directory:', e);
      }
    }
  }

  /**
   * Format nomor telepon ke format internasional tanpa tanda + (contoh: 628123456789)
   */
  cleanPhoneNumber(num) {
    if (!num) return '';
    let clean = num.toString().replace(/[^0-9]/g, '');
    if (clean.startsWith('08')) {
      clean = '628' + clean.slice(2);
    } else if (clean.startsWith('8')) {
      clean = '628' + clean.slice(1);
    }
    return clean;
  }

  /**
   * Inisialisasi semua device yang sebelumnya berstatus connected atau default saat server start
   */
  async initAll() {
    console.log('🔄 [WhatsAppManager] Memeriksa sesi WhatsApp tersimpan...');
    try {
      const devices = await prisma.deviceWa.findMany({
        where: {
          OR: [
            { status: 'connected' },
            { isDefault: true }
          ]
        }
      });

      console.log(`📱 [WhatsAppManager] Ditemukan ${devices.length} perangkat WhatsApp untuk auto-connect.`);
      for (const dev of devices) {
        console.log(`🚀 [WhatsAppManager] Memulai kembali sesi device: ${dev.nama} (ID: ${dev.id})`);
        this.createClient(dev.id);
        // Beri jeda 2 detik antar browser agar startup ringan
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('❌ [WhatsAppManager] Gagal menginisialisasi device:', err.message);
    }
  }

  /**
   * Membuat atau mengambil client untuk device tertentu
   */
  createClient(deviceId) {
    const id = parseInt(deviceId);
    if (this.sessions.has(id)) {
      const existing = this.sessions.get(id);
      if (existing.client && existing.status !== 'disconnected' && existing.status !== 'error') {
        return existing;
      }
    }

    console.log(`✨ [WhatsAppManager] Membuat WhatsApp Client baru untuk Device ID: ${id}`);
    const sessionState = {
      client: null,
      qr: null,
      status: 'initializing',
      info: null,
      qrResolvers: []
    };
    this.sessions.set(id, sessionState);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `device-${id}`,
        dataPath: this.sessionPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check'
        ]
      }
    });

    sessionState.client = client;

    // Event: QR Code diterima
    client.on('qr', async (qr) => {
      console.log(`📷 [WhatsAppManager] QR Code baru siap untuk Device ID: ${id}`);
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        sessionState.qr = qrDataUrl;
        sessionState.status = 'scan_qr';

        // Notify resolvers yang sedang menunggu QR
        while (sessionState.qrResolvers.length > 0) {
          const resolver = sessionState.qrResolvers.shift();
          resolver({ url: qrDataUrl, isConnected: false });
        }
      } catch (err) {
        console.error(`Error generating QR data URL for device ${id}:`, err);
      }
    });

    // Event: Client berhasil terhubung dan siap digunakan
    client.on('ready', async () => {
      const phoneNumber = client.info?.wid?.user || null;
      console.log(`✅ [WhatsAppManager] Device ID ${id} SIAP & TERHUBUNG! Nomor: ${phoneNumber || '-'}`);
      sessionState.status = 'connected';
      sessionState.qr = null;
      sessionState.info = client.info;

      // Update database status
      try {
        await prisma.deviceWa.update({
          where: { id },
          data: {
            status: 'connected',
            nomorWa: phoneNumber ? String(phoneNumber) : undefined
          }
        });
      } catch (dbErr) {
        console.error(`Gagal update status database untuk device ${id}:`, dbErr.message);
      }

      // Notify resolvers jika ada yang menunggu
      while (sessionState.qrResolvers.length > 0) {
        const resolver = sessionState.qrResolvers.shift();
        resolver({ url: null, isConnected: true, device: client.info });
      }
    });

    // Event: Berhasil diautentikasi
    client.on('authenticated', () => {
      console.log(`🔐 [WhatsAppManager] Device ID ${id} diautentikasi.`);
      sessionState.status = 'authenticated';
    });

    // Event: Autentikasi gagal
    client.on('auth_failure', async (msg) => {
      console.error(`❌ [WhatsAppManager] Device ID ${id} gagal diautentikasi:`, msg);
      sessionState.status = 'auth_failure';
      sessionState.qr = null;
      try {
        await prisma.deviceWa.update({
          where: { id },
          data: { status: 'disconnected' }
        });
      } catch (e) {}
    });

    // Event: Terputus (Disconnected / Logout)
    client.on('disconnected', async (reason) => {
      console.log(`⚠️ [WhatsAppManager] Device ID ${id} terputus: ${reason}`);
      sessionState.status = 'disconnected';
      sessionState.qr = null;
      sessionState.info = null;

      try {
        await prisma.deviceWa.update({
          where: { id },
          data: { status: 'disconnected' }
        });
      } catch (e) {}

      try {
        await client.destroy();
      } catch (e) {}
      this.sessions.delete(id);
    });

    // Jalankan inisialisasi client
    client.initialize().catch(err => {
      console.error(`❌ [WhatsAppManager] Gagal inisialisasi Puppeteer Device ${id}:`, err.message);
      sessionState.status = 'error';
      while (sessionState.qrResolvers.length > 0) {
        const resolver = sessionState.qrResolvers.shift();
        resolver({ error: err.message });
      }
    });

    return sessionState;
  }

  /**
   * Mengambil QR Code yang sudah ada atau menunggu QR Code baru dihasilkan
   */
  async getOrGenerateQr(deviceId, timeoutMs = 25000) {
    const id = parseInt(deviceId);
    let session = this.sessions.get(id);

    // Jika belum ada session atau sedang disconnected/error, buat baru
    if (!session || !session.client || session.status === 'disconnected' || session.status === 'error') {
      session = this.createClient(id);
    }

    // Jika sudah connected, kembalikan langsung
    if (session.status === 'connected') {
      return { isConnected: true, url: null, deviceId: id };
    }

    // Jika QR sudah siap
    if (session.qr) {
      return { isConnected: false, url: session.qr, deviceId: id };
    }

    // Jika masih initializing / scan_qr tapi belum dapat QR, tunggu via Promise
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          isConnected: session.status === 'connected',
          url: session.qr || null,
          deviceId: id,
          timeout: true
        });
      }, timeoutMs);

      session.qrResolvers.push((res) => {
        clearTimeout(timer);
        resolve({
          isConnected: res.isConnected,
          url: res.url,
          deviceId: id,
          error: res.error
        });
      });
    });
  }

  /**
   * Mendapatkan status terkini dari perangkat
   */
  async getStatus(deviceId) {
    const id = parseInt(deviceId);
    const session = this.sessions.get(id);

    if (session && session.status === 'connected') {
      const nomor = session.client?.info?.wid?.user || null;
      return {
        isConnected: true,
        status: 'connected',
        nomorWa: nomor,
        nama: session.client?.info?.pushname || null
      };
    }

    // Cek di database
    const dbDevice = await prisma.deviceWa.findUnique({ where: { id } });
    return {
      isConnected: false,
      status: session?.status || dbDevice?.status || 'disconnected',
      nomorWa: dbDevice?.nomorWa || null,
      nama: dbDevice?.nama || null
    };
  }

  /**
   * Kirim pesan teks dan/atau dokumen PDF ke satu atau banyak nomor WhatsApp (Broadcast)
   */
  async sendMessage(deviceId, targets, text, pdfBuffer = null, filename = 'Laporan.pdf') {
    const id = parseInt(deviceId);
    let session = this.sessions.get(id);

    if (!session || session.status !== 'connected' || !session.client) {
      throw new Error(`WhatsApp Pengirim (ID: ${id}) belum terhubung. Silakan hubungkan via Scan QR di Pusat WhatsApp.`);
    }

    const client = session.client;

    // Normalisasi targets menjadi array nomor bersih
    const rawTargets = Array.isArray(targets) ? targets : targets.toString().split(',');
    const cleanedTargets = rawTargets
      .map(t => this.cleanPhoneNumber(t))
      .filter(Boolean);

    if (cleanedTargets.length === 0) {
      throw new Error('Nomor tujuan pengiriman tidak valid.');
    }

    let media = null;
    if (pdfBuffer) {
      media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), filename);
    }

    const results = [];
    const errors = [];

    for (const target of cleanedTargets) {
      const chatId = `${target}@c.us`;
      try {
        console.log(`📤 [WhatsAppManager] Mengirim ke ${chatId} via Device ${id}...`);
        if (media) {
          await client.sendMessage(chatId, media, { caption: text });
        } else {
          await client.sendMessage(chatId, text);
        }
        results.push(target);

        // Beri jeda 800ms antar pesan untuk broadcast agar tidak dianggap spam
        if (cleanedTargets.length > 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      } catch (err) {
        console.error(`❌ [WhatsAppManager] Gagal kirim ke ${chatId}:`, err.message);
        errors.push({ target, error: err.message });
      }
    }

    return {
      success: results.length > 0,
      sentCount: results.length,
      targets: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Putuskan koneksi (Logout & Destroy)
   */
  async disconnect(deviceId) {
    const id = parseInt(deviceId);
    const session = this.sessions.get(id);

    if (session && session.client) {
      try {
        await session.client.logout();
      } catch (e) {
        console.warn(`Logout warning on device ${id}:`, e.message);
      }
      try {
        await session.client.destroy();
      } catch (e) {
        console.warn(`Destroy warning on device ${id}:`, e.message);
      }
    }

    this.sessions.delete(id);

    await prisma.deviceWa.update({
      where: { id },
      data: { status: 'disconnected' }
    }).catch(() => {});

    return { success: true };
  }

  /**
   * Hapus sesi perangkat secara tuntas dari disk dan memory
   */
  async deleteSession(deviceId) {
    const id = parseInt(deviceId);
    await this.disconnect(id);

    // Hapus direktori sesi LocalAuth jika ada
    const deviceSessionFolder = path.join(this.sessionPath, `session-device-${id}`);
    if (fs.existsSync(deviceSessionFolder)) {
      try {
        fs.rmSync(deviceSessionFolder, { recursive: true, force: true });
        console.log(`🗑️ [WhatsAppManager] Folder sesi device-${id} dihapus.`);
      } catch (err) {
        console.error(`Gagal menghapus folder sesi device-${id}:`, err.message);
      }
    }

    return { success: true };
  }
}

// Singleton pattern
const whatsappManager = new WhatsAppManager();
module.exports = whatsappManager;
