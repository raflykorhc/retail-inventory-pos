import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting fix for SELANG ONDA DOF 5/8" ...');

  // Find the batches with wrong costPrice
  const wrongBatches = await prisma.stockBatch.findMany({
    where: {
      product: {
        name: {
          contains: 'SELANG ONDA DOF 5/8"'
        }
      },
      costPrice: {
        gt: 50000 // anything way above the real cost per meter
      }
    }
  });

  if (wrongBatches.length === 0) {
    console.log('No wrong batches found.');
    return;
  }

  for (const batch of wrongBatches) {
    console.log(`Found wrong batch ID: ${batch.id} with costPrice: ${batch.costPrice}`);

    // We know it should be 4600 (229500 / 50)
    const newCost = 4590;

    // 1. Update StockBatch
    await prisma.stockBatch.update({
      where: { id: batch.id },
      data: { costPrice: newCost }
    });
    console.log(`Updated StockBatch ${batch.id} costPrice to ${newCost}`);

    // 2. Update SaleItemBatch allocations pointing to this batch
    const updatedAllocations = await prisma.saleItemBatch.updateMany({
      where: { batchId: batch.id },
      data: { costPrice: newCost }
    });

    console.log(`Updated ${updatedAllocations.count} SaleItemBatch allocations.`);
  }

  console.log('Fix completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
