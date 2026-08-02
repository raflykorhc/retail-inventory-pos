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

const paymentMethods = ['CASH', 'CASH', 'CASH', 'TRANSFER', 'TRANSFER', 'DEBIT', 'QRIS'];

async function seedSales() {
  console.log('Generating realistic sales transactions (Uang Masuk)...');

  // Get a cashier or admin user
  let user = await prisma.user.findFirst({ where: { role: 'CASHIER' } });
  if (!user) {
    user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  }

  // Get all products with their active prices and stock batches
  // We need to fetch it fresh inside the loop or fetch once and manage state in-memory?
  // Since we run this sequentially, fetching inside loop is safer or we can manage state manually.
  // We'll manage stock locally for the script duration to avoid excessive DB queries.
  
  const productsRaw = await prisma.product.findMany({
    include: {
      prices: true,
      stockBatches: {
        where: { currentQuantity: { gt: 0 } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  // Map to hold mutable product states
  const products = productsRaw.map(p => ({
    ...p,
    currentStock: Number(p.stock),
    batches: p.stockBatches.map(b => ({ ...b, currentQuantity: Number(b.currentQuantity) }))
  }));

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const numSales = 150; // Generate 150 transactions

  console.log(`Creating ${numSales} sales...`);

  for (let i = 0; i < numSales; i++) {
    const randomDate = getRandomDate(startDate, endDate);
    
    // Pick 1 to 5 random products for this transaction
    const numItems = Math.floor(Math.random() * 5) + 1;
    const shuffledProducts = shuffle([...products]);
    const selectedProducts = [];
    
    for (const p of shuffledProducts) {
      if (p.currentStock > 0 && selectedProducts.length < numItems) {
        selectedProducts.push(p);
      }
    }

    if (selectedProducts.length === 0) continue; // Skip if no products with stock

    let totalAmount = 0;
    const saleItemsData = [];
    
    for (const p of selectedProducts) {
      // Determine quantity to sell
      let maxQty = Math.min(p.currentStock, 10);
      // If cheap item (< 50000), might buy up to 15
      const price = p.prices[0]?.price ? Number(p.prices[0].price) : 0;
      if (price < 50000) maxQty = Math.min(p.currentStock, 15);
      
      const quantityToSell = Math.floor(Math.random() * maxQty) + 1;
      
      if (quantityToSell <= 0 || price === 0) continue;

      totalAmount += (price * quantityToSell);

      saleItemsData.push({
        product: p,
        quantity: quantityToSell,
        priceAtSale: price,
        unitId: p.prices[0].unitId
      });
      
      // Update local state
      p.currentStock -= quantityToSell;
    }

    if (saleItemsData.length === 0) continue;

    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    // Sometimes they give exact amount, sometimes they give rounded up amount (change)
    const amountPaid = paymentMethod === 'CASH' ? totalAmount + (Math.floor(Math.random() * 5) * 10000) : totalAmount;
    const changeAmount = amountPaid - totalAmount;

    // Create the Sale
    // We use sequential operations because we need to allocate batches
    const invoiceNumber = `INV-OUT-${Math.floor(randomDate.getTime() / 1000)}-${i}`;
    
    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        totalAmount,
        paymentStatus: 'PAID',
        paymentMethod,
        amountPaid,
        changeAmount,
        createdAt: randomDate,
        userId: user?.id,
      }
    });

    for (const itemData of saleItemsData) {
      const p = itemData.product;
      let remainingQty = itemData.quantity;

      // Create SaleItem
      const saleItem = await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: p.id,
          unitId: itemData.unitId,
          quantity: itemData.quantity,
          priceAtSale: itemData.priceAtSale,
        }
      });

      // Allocate from batches
      for (const batch of p.batches) {
        if (remainingQty <= 0) break;
        if (batch.currentQuantity <= 0) continue;

        const allocQty = Math.min(remainingQty, batch.currentQuantity);
        
        await prisma.saleItemBatch.create({
          data: {
            saleItemId: saleItem.id,
            batchId: batch.id,
            quantity: allocQty,
            costPrice: batch.costPrice
          }
        });

        // Update DB StockBatch
        await prisma.stockBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: { decrement: allocQty } }
        });

        // Update local batch
        batch.currentQuantity -= allocQty;
        remainingQty -= allocQty;
      }

      // Update DB Product Stock
      await prisma.product.update({
        where: { id: p.id },
        data: { stock: { decrement: itemData.quantity } }
      });

      // Create StockLog
      await prisma.stockLog.create({
        data: {
          productId: p.id,
          type: 'OUT',
          quantity: itemData.quantity,
          reason: `Terjual [${sale.invoiceNumber}]`,
          createdAt: randomDate
        }
      });
    }

    if (i % 25 === 0) {
      console.log(`Generated ${i} sales...`);
    }
  }

  console.log(`✅ Successfully generated ${numSales} sales transactions!`);
}

seedSales()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
