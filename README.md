# PD Sukses Bangunan - POS & Inventory System

Sistem Manajemen Penjualan (Point of Sale) dan Inventaris untuk PD Sukses Bangunan.

## 🚀 Fitur Utama
- **Multi-Unit Inventory**: Mendukung konversi satuan barang secara otomatis (misal: Dus -> Lusin -> Pcs).
- **FIFO Batch Tracking**: Pelacakan stok berdasarkan batch masuk untuk perhitungan modal dan profit yang akurat.
- **Management Dashboard**: Visualisasi ringkasan penjualan, hutang, dan pengeluaran.
- **Project Tracking**: Manajemen pengeluaran dan logistik khusus untuk proyek bangunan.
- **Reporting**: Laporan stok, penjualan, dan keuangan yang dapat diunduh.
- **Docker Ready**: Dukungan penuh untuk deployment menggunakan Docker.

## 🛠️ Stack Teknologi
- **Frontend**: [Next.js](https://nextjs.org/) (React), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js dengan Express.
- **Database**: PostgreSQL dengan [Prisma ORM](https://www.prisma.io/).
- **Containerization**: Docker & Docker Compose.

## 🏃 Cara Menjalankan

### Menggunakan Docker
1. Pastikan Docker dan Docker Compose sudah terinstal.
2. Jalankan perintah:
   ```bash
   docker-compose up --build -d
   ```
3. Aplikasi dapat diakses di `http://localhost:3000`.


### Cara Manual
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Konfigurasi `.env` (salin dari `.env.example`).
3. Setup Database & Prisma:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

## 🧪 Pengujian
Seluruh unit test sekarang berada di direktori `tests/`. Untuk menjalankan pengujian:
```bash
npm test
```

## 📂 Struktur Proyek
- `src/`: Kode sumber Frontend (Next.js pages & components).
- `server/`: Kode sumber Backend (Controllers, Services, Routes).
- `tests/`: Kumpulan unit test untuk backend dan frontend.
- `prisma/`: Skema database dan skrip seeding.
- `backups/`: Lokasi penyimpanan backup database otomatis.

## 🛠️ Skrip Pemeliharaan
- `backup.bat`: Melakukan backup database PostgreSQL secara manual.
- `restore.bat`: Memulihkan database dari file backup `.sql`.
- `prune-logs.bat`: Membersihkan log sistem yang sudah lama.

---
© 2026 PD Sukses Bangunan. All rights reserved.
