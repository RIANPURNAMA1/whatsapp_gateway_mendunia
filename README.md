# 🚀 WA Blast Pro — WhatsApp Blast System

Sistem blast pesan WhatsApp berbasis web dengan teknologi modern.

## 🛠 Teknologi

| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + Socket.IO |
| WA Engine | Baileys (@whiskeysockets/baileys) |
| Database | MySQL + Sequelize ORM |
| Auth | JWT |

---

## ✅ Fitur Utama

- **Multi Perangkat** — Hubungkan beberapa nomor WhatsApp sekaligus via QR Code
- **Manajemen Kontak** — Tambah manual, import CSV/TXT, kelompokkan per grup
- **Blast Kampanye** — Kirim pesan massal dengan delay acak anti-ban
- **Real-time Progress** — Monitor pengiriman secara live via WebSocket
- **Template Pesan** — Simpan & gunakan ulang template pesan
- **Auto Reply** — Balas pesan masuk otomatis berdasarkan kata kunci
- **Dashboard** — Statistik lengkap & grafik pengiriman 7 hari terakhir

---

## 📦 Persyaratan Sistem

- Node.js >= 18
- MySQL >= 5.7 / MariaDB >= 10
- npm >= 9

---

## 🚀 Cara Menjalankan

### 1. Setup Database

```bash
# Login ke MySQL
mysql -u root -p

# Jalankan SQL schema
source /path/to/wa-blast-system/backend/database.sql
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy file .env
cp .env.example .env

# Edit .env sesuai konfigurasi database Anda
nano .env

# Jalankan server
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

### 4. Akses Aplikasi

Buka browser: **http://localhost:5173**

**Login Default:**
- Email: `admin@wablast.com`
- Password: `admin123`

---

## ⚙️ Konfigurasi .env Backend

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wa_blast_db
DB_USER=root
DB_PASSWORD=yourpassword
JWT_SECRET=ganti_dengan_string_random_panjang
FRONTEND_URL=http://localhost:5173
SESSIONS_DIR=./sessions
```

---

## 📱 Cara Menghubungkan WhatsApp

1. Masuk ke menu **Perangkat WhatsApp**
2. Klik **Tambah Perangkat** → beri nama
3. Klik **Hubungkan** → tunggu QR Code muncul
4. Buka WhatsApp di HP → **Perangkat Tertaut** → **Tautkan Perangkat**
5. Scan QR Code yang tampil di layar
6. Status akan berubah menjadi **Terhubung** ✅

---

## 📤 Format Import Kontak (CSV/TXT)

```
6281234567890,John Doe
6289876543210,Jane Smith
6285555666777
```

- Kolom 1: Nomor HP (wajib, format: 62xxx)
- Kolom 2: Nama (opsional)
- Pemisah: koma, titik koma, atau tab

---

## ⚠️ Disclaimer

Sistem ini dibuat untuk keperluan komunikasi bisnis yang sah. Penggunaan untuk spam atau aktivitas yang melanggar kebijakan WhatsApp adalah tanggung jawab pengguna sepenuhnya.

---

## 🏗 Struktur Folder

```
wa-blast-system/
├── frontend/          # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── layout/    # Sidebar, Layout
│       │   ├── pages/     # Semua halaman
│       │   └── ui/        # shadcn components
│       ├── hooks/         # Custom hooks
│       ├── lib/           # API client, utils
│       ├── store/         # Zustand state
│       └── types/         # TypeScript types
└── backend/           # Node.js + Express backend
    ├── src/
    │   ├── config/    # Database config
    │   ├── middleware/ # Auth middleware
    │   ├── models/    # Sequelize models
    │   ├── routes/    # API routes
    │   └── services/  # Baileys & blast services
    ├── sessions/      # WA session files
    ├── uploads/       # Media uploads
    └── database.sql   # SQL schema
```
