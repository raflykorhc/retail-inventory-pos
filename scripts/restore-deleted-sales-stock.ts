import prisma from "../server/config/db.ts";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
  console.log("Memulai pengecekan pemulihan stok untuk transaksi lama...");

  const deletedSales = await prisma.sale.findMany({
    where: {
      deletedAt: { not: null }
    },
    include: {
      items: {
        include: {
          product: true,
          batchAllocations: true
        }
      }
    },
    orderBy: { deletedAt: 'asc' }
  });

  console.log(`Ditemukan ${deletedSales.length} transaksi yang berstatus dihapus.\n`);
  let restoredCount = 0;

  for (const sale of deletedSales) {
    const existingLog = await prisma.stockLog.findFirst({
      where: {
        reason: `Pembatalan Penjualan ${sale.invoiceNumber}`,
        type: "IN"
      }
    });

    if (existingLog) {
      console.log(`- Invoice ${sale.invoiceNumber}: Stok sudah dikembalikan sebelumnya. Melewati...`);
      continue;
    }

    console.log(`\n======================================================`);
    console.log(`Invoice: ${sale.invoiceNumber}`);
    console.log(`Tanggal Dihapus: ${sale.deletedAt?.toLocaleString()}`);
    console.log(`Daftar Barang:`);
    
    let hasWarning = false;

    for (const item of sale.items) {
      let totalToReturn = 0;
      for (const alloc of item.batchAllocations) {
        totalToReturn += alloc.quantity;
      }
      
      console.log(`  - ${item.product.name} (Jumlah stok yang dipotong: ${totalToReturn})`);

      // Cek apakah ada penyesuaian stok manual setelah transaksi dihapus
      if (sale.deletedAt) {
        const manualLogs = await prisma.stockLog.findMany({
          where: {
            productId: item.productId,
            createdAt: { gt: sale.deletedAt },
            OR: [
              { reason: { contains: 'Manual', mode: 'insensitive' } },
              { reason: { contains: 'Penyesuaian', mode: 'insensitive' } },
              { reason: { contains: 'Opname', mode: 'insensitive' } }
            ]
          }
        });

        if (manualLogs.length > 0) {
          hasWarning = true;
          console.log(`    [!] PERINGATAN: Terdeteksi penyesuaian stok manual untuk barang ini setelah transaksi dihapus!`);
          manualLogs.forEach(log => {
            console.log(`        -> ${log.createdAt.toLocaleString()} | ${log.type} ${log.quantity} | ${log.reason}`);
          });
        }
      }
    }

    if (hasWarning) {
      console.log(`\n⚠️  HATI-HATI: Jika pegawai toko sudah menyesuaikan stok secara manual, memulihkan ini akan membuat stok menjadi dobel!`);
    }

    const answer = await askQuestion(`\nApakah Anda ingin mengembalikan stok untuk transaksi ${sale.invoiceNumber} ini? (y/n): `);
    
    if (answer.toLowerCase() === 'y') {
      await prisma.$transaction(async (tx) => {
        const today = new Date();

        for (const item of sale.items) {
          let totalReturned = 0;
          for (const alloc of item.batchAllocations) {
            if (alloc.quantity > 0) {
              await tx.stockBatch.update({
                where: { id: alloc.batchId },
                data: { currentQuantity: { increment: alloc.quantity } }
              });
              totalReturned += alloc.quantity;
            }
          }

          if (totalReturned > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: totalReturned } }
            });

            await tx.stockLog.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: totalReturned,
                reason: `Pembatalan Penjualan ${sale.invoiceNumber}`,
                createdAt: today
              }
            });
          }
        }
      });
      restoredCount++;
      console.log(`✔ Stok berhasil dikembalikan untuk ${sale.invoiceNumber}.`);
    } else {
      console.log(`Diabaikan.`);
    }
  }

  console.log(`\nSelesai! Berhasil mengembalikan stok untuk ${restoredCount} transaksi.`);
  rl.close();
}

main()
  .catch((e) => {
    console.error("Error restoring stock:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
