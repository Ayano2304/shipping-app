# CPO Tanker — Sistem Perhitungan Muatan
## Stack: React + Vite + shadcn/ui | Node.js + Express + Prisma | PostgreSQL

---

## ⚡ Cara Setup (Langkah Demi Langkah)

### 1. Pastikan Sudah Terinstall
- [Node.js](https://nodejs.org) v18+
- [PostgreSQL](https://www.postgresql.org/download/) (sudah running)
- npm / npx

---

### 2. Setup Database PostgreSQL

Buka pgAdmin atau psql, lalu buat database baru:
```sql
CREATE DATABASE cpo_shipping;
```

---

### 3. Setup Backend

```bash
cd backend

# Salin file env
copy .env.example .env
```

Edit file `.env`:
```env
DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/cpo_shipping"
JWT_SECRET="ganti-dengan-random-string-panjang-minimal-32-karakter"
JWT_EXPIRES_IN="7d"
PORT=3001
FONNTE_TOKEN="token-fonnte-anda-opsional"
FRONTEND_URL="http://localhost:5173"
```

Lalu jalankan:
```bash
# Generate Prisma client
npx prisma generate

# Buat semua tabel di database
npx prisma migrate dev --name init

# Isi data awal (admin user + contoh kapal)
node prisma/seed.js

# Jalankan server
npm run dev
```

Server backend berjalan di: **http://localhost:3001**

> **Tip:** Jalankan `npm run db:studio` untuk membuka GUI database Prisma Studio.

---

### 4. Setup Frontend

```bash
cd frontend

# Install shadcn/ui (jika belum)
npx shadcn@latest init

# Jalankan dev server
npm run dev
```

Frontend berjalan di: **http://localhost:5173**

---

### 5. Login Default

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Admin   | admin     | admin123    |
| Petugas | petugas1  | petugas123  |
| Viewer  | viewer1   | viewer123   |

> **Segera ganti password default setelah login pertama!**

---

## 📁 Struktur Proyek

```
shipping-cpo/
├── frontend/          ← React + Vite + shadcn/ui
│   └── src/
│       ├── pages/     ← Semua halaman
│       ├── components/← Komponen reusable
│       ├── lib/       ← API client, kalkulasi, utils
│       └── store/     ← Zustand state
│
└── backend/           ← Node.js + Express + Prisma
    ├── prisma/        ← Schema & seed
    └── src/
        ├── routes/    ← Route definitions
        ├── controllers/← Business logic
        └── middleware/ ← Auth & role guard
```

---

## 🧮 Rumus Perhitungan

```
Berat Palka (KG)     = Volume (L) × Density × Faktor Koreksi
Total Berat          = Σ Berat semua palka
Selisih vs B/L       = Total Kedatangan − B/L (dalam KG)
Persentase Susut (%) = (B/L − Total Kedatangan) / B/L × 100
Susut Perjalanan     = Total Keberangkatan − Total Kedatangan
```

---

## 📱 Fitur

| Fitur | Status |
|-------|--------|
| Login & Role (Admin/Petugas/Viewer) | ✅ |
| Dashboard + Grafik tren susut | ✅ |
| Form pengiriman dengan palka dinamis | ✅ |
| Kalkulasi real-time (tanpa klik hitung) | ✅ |
| Satuan B/L: MT atau KG | ✅ |
| Riwayat pengiriman + filter + search | ✅ |
| Detail pengiriman dengan tab palka | ✅ |
| Export Excel (.xlsx) | ✅ |
| Kirim laporan via WhatsApp (Fonnte) | ✅ |
| Master data kapal | ✅ |
| Manajemen users | ✅ |
| Mobile responsive | ✅ |

---

## 🚀 Deploy ke Production

### Frontend (build):
```bash
cd frontend
npm run build
# Output di folder dist/
```

### Backend:
```bash
cd backend
npm run db:migrate   # Pastikan DB production sudah siap
npm start
```

Gunakan PM2 untuk production:
```bash
npm install -g pm2
pm2 start src/index.js --name cpo-backend
```

---

## 📊 Export ke Excel

Data bisa diexport langsung dari aplikasi (tombol "Export Excel" di halaman detail & list).

Untuk export manual dari pgAdmin:
1. Buka pgAdmin → Database → Schema → Tables
2. Klik kanan tabel → View/Edit Data → Export
3. Pilih format CSV → Buka di Excel

---

## 💬 WhatsApp Integration

1. Daftar di [fonnte.com](https://fonnte.com)
2. Hubungkan nomor WA Anda
3. Copy token dari dashboard Fonnte
4. Isi di file `backend/.env` → `FONNTE_TOKEN=...`
5. Restart backend

Laporan akan dikirim dalam format teks terformat lengkap.
