import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function randomizeDates() {
  console.log('Randomizing dates for Purchases, StockBatches, and StockLogs...');

  // Set range from 3 months ago to today
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  // Get the purchase we just made
  // If there are multiple, we'll just randomize all of them, or find the specific ones
  // We can just iterate through all StockLogs and StockBatches where createdAt is roughly today
  // Alternatively, just randomize ALL Purchases, StockBatches, and StockLogs
  // Let's get all purchases first
  const purchases = await prisma.purchase.findMany({
    include: {
      items: {
        include: {
          stockBatch: true,
        }
      }
    }
  });

  for (const purchase of purchases) {
    const randomDate = getRandomDate(startDate, endDate);

    // Update Purchase date
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { 
        createdAt: randomDate,
        updatedAt: randomDate,
      }
    });

    for (const item of purchase.items) {
      if (item.stockBatch) {
        // Update StockBatch date
        await prisma.stockBatch.update({
          where: { id: item.stockBatch.id },
          data: {
            createdAt: randomDate,
            updatedAt: randomDate,
          }
        });
        
        // Find corresponding stock log (type IN, same product, same quantity)
        // Since we seeded it, we can just update all stock logs for this product that match
        const stockLogs = await prisma.stockLog.findMany({
          where: {
            productId: item.productId,
            type: 'IN',
            quantity: item.stockBatch.initialQuantity
          }
        });

        for (const log of stockLogs) {
          await prisma.stockLog.update({
            where: { id: log.id },
            data: {
              createdAt: randomDate
            }
          });
        }
      }
    }
    
    console.log(`Updated Purchase ${purchase.invoiceNumber} and its items to ${randomDate.toISOString()}`);
  }

  console.log('✅ Dates randomized successfully!');
}

randomizeDates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
