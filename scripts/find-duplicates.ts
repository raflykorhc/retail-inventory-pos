import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.expenseCategory.findMany();
  
  const grouped: Record<string, typeof categories> = {};
  
  for (const cat of categories) {
    // normalize name
    let normalized = cat.name.toLowerCase().trim();
    if (!grouped[normalized]) {
      grouped[normalized] = [];
    }
    grouped[normalized].push(cat);
  }
  
  const duplicates = Object.entries(grouped).filter(([_, cats]) => cats.length > 1);
  
  console.log(`Found ${duplicates.length} sets of duplicates.`);
  
  for (const [name, cats] of duplicates) {
    console.log(`\nMerging duplicates for: "${name}"`);
    
    // Prefer the one without trailing/leading spaces in its actual name
    cats.sort((a, b) => a.name.length - b.name.length);
    
    const primary = cats[0];
    const toMerge = cats.slice(1);
    
    console.log(`Primary category: [${primary.id}] "${primary.name}"`);
    
    for (const dup of toMerge) {
      console.log(`Merging [${dup.id}] "${dup.name}" into primary...`);
      
      // Update all expenses that use the duplicate category
      const updateResult = await prisma.expense.updateMany({
        where: { categoryId: dup.id },
        data: { categoryId: primary.id }
      });
      console.log(`Updated ${updateResult.count} expenses.`);
      
      // Delete the duplicate category
      await prisma.expenseCategory.delete({
        where: { id: dup.id }
      });
      console.log(`Deleted duplicate category [${dup.id}].`);
    }
  }
  
  console.log("\nDone merging categories.");
}

main().finally(() => prisma.$disconnect());
