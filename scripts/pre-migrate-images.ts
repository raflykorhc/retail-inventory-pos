import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for legacy image data...');
  
  try {
    // 1. Check if column exists
    const columnCheck: any[] = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'image';
    `;

    if (columnCheck.length === 0) {
      console.log('Legacy image column not found. Skipping pre-migration.');
      return;
    }

    console.log('Legacy image column found! Preparing data...');

    // 2. Create ProductImage table manually so we can move data before db push drops the image column
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductImage" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "data" BYTEA NOT NULL,
        "mimeType" TEXT NOT NULL,
        CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_productId_key" ON "ProductImage"("productId");
    `);

    // 3. Move the data!
    const products: any[] = await prisma.$queryRaw`SELECT id, name, image FROM "Product" WHERE image IS NOT NULL`;
    
    let successCount = 0;
    for (const product of products) {
      if (!product.image) continue;
      try {
        let base64String = product.image;
        let mimeType = 'image/jpeg';
        if (base64String.startsWith('data:')) {
          const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64String = matches[2];
          }
        }
        
        const buffer = Buffer.from(base64String, 'base64');
        const newId = 'img_' + product.id;
        
        await prisma.$executeRaw`
          INSERT INTO "ProductImage" ("id", "productId", "data", "mimeType")
          VALUES (${newId}, ${product.id}, ${buffer}, ${mimeType})
          ON CONFLICT ("productId") DO UPDATE 
          SET "data" = ${buffer}, "mimeType" = ${mimeType};
        `;
        successCount++;
      } catch (e) {
        console.error(`Failed to migrate ${product.id}`, e);
      }
    }

    console.log(`Successfully pre-migrated ${successCount} images. It is now safe to drop the image column.`);
  } catch (error) {
    console.error('Error during pre-migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
