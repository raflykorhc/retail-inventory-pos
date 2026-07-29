#!/bin/sh
set -e

echo "============================================"
echo "  PD Sukses Bangunan POS - Startup"
echo "============================================"

echo "[0/4] Menunggu koneksi database stabil..."
cat << 'EOF' > wait-for-db.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT 1`.then(() => process.exit(0)).catch(() => process.exit(1));
EOF
until node wait-for-db.mjs; do
  echo "      Database masih proses startup, tunggu 2 detik..."
  sleep 2
done
echo "      ✓ Database siap menerima koneksi."

echo "[1/4] Mengamankan data gambar produk..."
npx tsx scripts/pre-migrate-images.ts || echo "      (Migrasi gambar dilewati)"


echo "[2/4] Menerapkan migrasi database..."
if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations)" ]; then
  npx prisma migrate deploy
  echo "      ✓ Migrasi berhasil diterapkan."
else
  echo "      Tidak ada migrations, menggunakan prisma db push..."
  npx prisma db push --accept-data-loss
  echo "      ✓ Schema database berhasil disinkronkan."
fi

echo "[3/4] Menjalankan seed akun default..."
npx prisma db seed || echo "      (seed dilewati - akun mungkin sudah ada)"
echo "      ✓ Seed selesai."

echo "[4/4] Menjalankan server aplikasi..."
exec node dist/server.js
