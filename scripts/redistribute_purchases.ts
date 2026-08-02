import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

async function redistributePurchases() {
  console.log('Redistributing the large seed purchase into multiple smaller purchases...');

  // Find the large seed purchase
  const seedPurchase = await prisma.purchase.findFirst({
    where: {
      invoiceNumber: {
        startsWith: 'INV-SEED-',
      }
    },
    include: {
      items: {
        include: {
          stockBatch: true,
          product: true,
        }
      }
    }
  });

  if (!seedPurchase) {
    console.log('No seed purchase found to redistribute.');
    return;
  }

  // Set date range (last 3 months)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  // Shuffle items and create chunks of 5-8 items
  const items = shuffle([...seedPurchase.items]);
  const chunks = [];
  let i = 0;
  while (i < items.length) {
    const chunkSize = Math.floor(Math.random() * 4) + 5; // 5 to 8
    chunks.push(items.slice(i, i + chunkSize));
    i += chunkSize;
  }

  console.log(`Splitting ${items.length} items into ${chunks.length} purchases...`);

  let count = 1;
  for (const chunk of chunks) {
    const randomDate = getRandomDate(startDate, endDate);
    
    // Calculate total amount for this chunk
    let totalAmount = 0;
    for (const item of chunk) {
      totalAmount += (Number(item.costPrice) * item.quantity);
    }

    // Create new Purchase
    const newPurchase = await prisma.purchase.create({
      data: {
        invoiceNumber: `INV-SEED-SP-${Date.now()}-${count}`,
        supplierId: seedPurchase.supplierId,
        totalAmount: totalAmount,
        paymentStatus: seedPurchase.paymentStatus,
        paymentMethod: seedPurchase.paymentMethod,
        createdAt: randomDate,
        updatedAt: randomDate,
      }
    });

    // Move items to new purchase and update dates
    for (const item of chunk) {
      // Update PurchaseItem
      await prisma.purchaseItem.update({
        where: { id: item.id },
        data: { purchaseId: newPurchase.id }
      });

      // Update StockBatch
      if (item.stockBatch) {
        await prisma.stockBatch.update({
          where: { id: item.stockBatch.id },
          data: {
            createdAt: randomDate,
            updatedAt: randomDate,
          }
        });
        
        // Find and update StockLogs
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
            data: { createdAt: randomDate }
          });
        }
      }
    }
    
    console.log(`Created new purchase ${newPurchase.invoiceNumber} on ${randomDate.toISOString().split('T')[0]} with ${chunk.length} items.`);
    count++;
  }

  // Delete the old seed purchase
  await prisma.purchase.delete({
    where: { id: seedPurchase.id }
  });

  console.log('✅ Purchases redistributed successfully!');
}

redistributePurchases()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
