require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

// Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Allows flexible API usage
}));

// Global API Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.' },
});
app.use('/api', globalLimiter);

// Middleware
app.use(cors({
  origin: true, // Allow all origins (mobile app + web frontend)
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/kapal', require('./routes/kapal.routes'));
app.use('/api/pengiriman', require('./routes/pengiriman.routes'));
app.use('/api/palka', require('./routes/palka.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/export', require('./routes/export.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp.routes'));
app.use('/api/kontak-wa', require('./routes/kontak.routes'));
app.use('/api/lookup', require('./routes/lookup.routes'));
app.use('/api/masterdata', require('./routes/masterdata.routes'));
app.use('/api/notifikasi', require('./routes/notifikasi.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Secure Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Terjadi kesalahan pada server.' : (err.message || 'Internal Server Error')
  });
});

const PORT = process.env.PORT || 3001;

// Hanya jalankan app.listen di development (bukan di Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server berjalan di http://0.0.0.0:${PORT}`);
    console.log(`📱 Akses dari HP: http://192.168.1.8:${PORT}/api`);
    console.log(`📊 Prisma Studio: npx prisma studio`);
  });
}

// Export untuk Vercel serverless
module.exports = app;
