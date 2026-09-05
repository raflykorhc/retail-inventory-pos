import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Dapatkan semua alokasi batch dari penjualan
      const saleItemBatches = await tx.saleItemBatch.findMany({
        include: {
          saleItem: true
        }
      });

      console.log(`Menemukan ${saleItemBatches.length} data pemotongan batch untuk direstore...`);

      // 2. Kembalikan stok ke batch dan produk
      for (const sib of saleItemBatches) {
        // Kembalikan ke batch
        await tx.stockBatch.update({
          where: { id: sib.batchId },
          data: { currentQuantity: { increment: sib.quantity } }
        });
        
        // Kembalikan ke produk utama
        if (sib.saleItem && sib.saleItem.productId) {
          await tx.product.update({
            where: { id: sib.saleItem.productId },
            data: { stock: { increment: sib.quantity } }
          });
        }
      }

      // 3. Hapus data penjualan
      await tx.saleItemBatch.deleteMany();
      await tx.saleItem.deleteMany();
      await tx.sale.deleteMany();
      
      console.log("Semua data transaksi (Sale, SaleItem, SalePayment, SaleItemBatch) berhasil dihapus.");

      // 4. Hapus log stok keluar akibat penjualan
      const deletedLogs = await tx.stockLog.deleteMany({
        where: {
          type: 'OUT',
          reason: { contains: 'Penjualan' }
        }
      });
      console.log(`${deletedLogs.count} log batch keluar akibat penjualan berhasil dihapus.`);

    }, {
      timeout: 30000 // Beri waktu ekstra kalau datanya banyak
    });

    console.log("Reset penjualan selesai. Stok telah dikembalikan.");
  } catch (err) {
    console.error("Terjadi kesalahan saat mereset penjualan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
