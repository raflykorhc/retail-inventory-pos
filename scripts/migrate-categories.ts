import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_CATEGORIES = [
  "GAJI MANG ATANG",
  "GAJI MANG ANANG",
  "GAJI MANG IPIN",
  "GAJI TEMEN MANG ANANG",
  "BENSIN APV",
  "BENSIN FUTURA",
  "UPAH BONGKAR BARANG",
  "KOMISI",
  "SEDEKAH",
  "OPERASIONAL TOKO",
  "OPERASIONAL MOBIL APV",
  "OPERASIONAL MOBIL FUTURA",
  "PRIBADI"
];

function getTargetCategoryName(oldName: string): string {
  const name = oldName.toLowerCase().trim();
  
  // Deteksi Gaji
  if (name.includes("atang")) return "GAJI MANG ATANG";
  if (name.includes("temen") || name.includes("teman")) return "GAJI TEMEN MANG ANANG";
  if (name.includes("anang")) return "GAJI MANG ANANG";
  if (name.includes("ipin")) return "GAJI MANG IPIN";
  
  // Deteksi Bensin
  if (name.includes("bensin") && name.includes("apv")) return "BENSIN APV";
  if (name.includes("bensin") && (name.includes("futura") || name.includes("ss"))) return "BENSIN FUTURA";
  
  // Deteksi Upah Bongkar
  if (name.includes("bongkar") || name.includes("kuli")) return "UPAH BONGKAR BARANG";
  
  // Deteksi Komisi & Sedekah
  if (name.includes("komisi") || name.includes("fee")) return "KOMISI";
  if (name.includes("sedekah") || name.includes("sumbangan") || name.includes("infak")) return "SEDEKAH";
  
  // Deteksi Operasional Mobil
  if (name.includes("mobil") || name.includes("service") || name.includes("servis") || name.includes("ban") || name.includes("oli") || name.includes("tol") || name.includes("parkir")) {
    if (name.includes("apv")) return "OPERASIONAL MOBIL APV";
    if (name.includes("futura") || name.includes("ss")) return "OPERASIONAL MOBIL FUTURA";
  }
  
  // Deteksi Operasional Toko Umum (PLN, PDAM, Internet, Kertas, Plastik, Lakban, dll)
  if (name.includes("operasional") || name.includes("oprasional") || name.includes("listrik") || name.includes("air") || name.includes("wifi") || name.includes("atk") || name.includes("plastik")) {
    return "OPERASIONAL TOKO";
  }
  
  // Jika Pakan Ayam, Rokok, Makan Pribadi dll masuk ke Pribadi
  if (name.includes("pakan") || name.includes("ayam") || name.includes("pribadi") || name.includes("rokok")) return "PRIBADI";
  
  // Jika tidak masuk aturan di atas, gabung ke OPERASIONAL TOKO sebagai default
  return "OPERASIONAL TOKO";
}

async function main() {
  console.log("Mulai migrasi kategori pengeluaran...");

  // 1. Pastikan semua target kategori sudah ada di DB
  const targetMap = new Map<string, string>(); // name -> id
  for (const tName of TARGET_CATEGORIES) {
    let cat = await prisma.expenseCategory.findUnique({
      where: { name: tName }
    });
    if (!cat) {
      cat = await prisma.expenseCategory.create({
        data: { name: tName }
      });
      console.log(`[+] Membuat kategori baru: ${tName}`);
    }
    targetMap.set(tName, cat.id);
  }

  // 2. Ambil semua kategori saat ini
  const allCategories = await prisma.expenseCategory.findMany();
  
  for (const oldCat of allCategories) {
    // Lewati jika ini sudah termasuk kategori target yang benar
    if (TARGET_CATEGORIES.includes(oldCat.name)) {
      continue;
    }
    
    // Tentukan kategori baru berdasarkan nama lama
    const targetName = getTargetCategoryName(oldCat.name);
    const targetId = targetMap.get(targetName);
    
    if (!targetId) {
      console.error(`Error: Target ID tidak ditemukan untuk ${targetName}`);
      continue;
    }

    console.log(`\nMigrasi: "${oldCat.name}" ---> "${targetName}"`);
    
    // 3. Pindahkan semua pengeluaran dari kategori lama ke kategori baru
    const updateResult = await prisma.expense.updateMany({
      where: { categoryId: oldCat.id },
      data: { categoryId: targetId }
    });
    console.log(`  - Mengupdate ${updateResult.count} pengeluaran.`);
    
    // 4. Hapus kategori lama
    await prisma.expenseCategory.delete({
      where: { id: oldCat.id }
    });
    console.log(`  - Menghapus kategori lama: ${oldCat.name}`);
  }
  
  console.log("\nSelesai! Semua data sudah di-mapping ke 13 kategori utama.");
}

main().finally(() => prisma.$disconnect());
