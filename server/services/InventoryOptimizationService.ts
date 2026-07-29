import prisma from "../config/db.ts";

/**
 * InventoryOptimizationService
 *
 * Mengimplementasikan dua metode inti manajemen persediaan dinamis:
 * 1. Klasifikasi ABC (Analisis Pareto) - mengelompokkan barang berdasarkan
 *    kontribusi nilai investasi (Usage Value = Qty Terjual x Harga Beli)
 *
 * 2. Sistem Min-Max Dinamis berbasis Peak Demand (Bulan Tersibuk) -
 *    menghitung rekomendasi stok minimum menggunakan rata-rata penjualan
 *    pada bulan dengan penjualan tertinggi dalam kuartal terakhir.
 *
 * CATATAN MULTI-SATUAN: Semua kalkulasi kuantitas dilakukan dalam
 * Base Unit (satuan terkecil / conversionFactor = 1) untuk menghindari
 * bias konversi antar satuan.
 */
export class InventoryOptimizationService {

  /**
   * Menghitung data optimasi untuk semua produk aktif dengan parameter dinamis.
   * Solusi 1: Agregasi di level Database (Raw SQL) untuk performa tinggi.
   * Solusi 2: Penyesuaian margin 15% jika averageCost produk = 0.
   * Solusi 3 & 5: Mendukung parameter dinamis dari controller.
   * Solusi 4: Menangani Cold Start untuk produk tanpa penjualan.
   *
   * @param monthsRange - Jumlah bulan ke belakang untuk analisis historis
   * @param limitA - Ambang batas atas kumulatif untuk kategori A (persen)
   * @param limitB - Ambang batas atas kumulatif untuk kategori B (persen)
   * @param holdingInterval - Jumlah hari penahanan stok untuk batas maksimum
   * @returns Array hasil kalkulasi per produk.
   */
  static async calculateOptimization(
    monthsRange: number = 3,
    limitA: number = 80,
    limitB: number = 95,
    holdingInterval: number = 14
  ): Promise<OptimizationResult[]> {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - monthsRange);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 1. Agregasi penjualan per produk, per bulan langsung di Database (Solusi 1 & 2)
    //    Menggunakan prisma.$queryRaw untuk PostgreSQL dengan join ke SaleItemBatch untuk FIFO murni.
    //    Jika data batch tidak tersedia (fallback), gunakan averageCost atau priceAtSale * 0.85 (Solusi 2).
    const rawSales: any[] = await prisma.$queryRaw`
      SELECT 
        si."productId",
        TO_CHAR(s."createdAt", 'YYYY-MM') AS "monthKey",
        SUM(
          CASE 
            WHEN sib."id" IS NOT NULL THEN CAST(sib."quantity" AS double precision)
            ELSE CAST(si."quantity" * COALESCE(pp."conversionFactor", 1.0) AS double precision)
          END
        )::float AS "totalBaseUnits",
        SUM(
          CASE
            WHEN sib."id" IS NOT NULL THEN CAST(sib."quantity" * sib."costPrice" AS double precision)
            ELSE CAST(si."quantity" * COALESCE(pp."conversionFactor", 1.0) * 
              CASE 
                WHEN p."averageCost" > 0 THEN CAST(p."averageCost" AS double precision)
                ELSE CAST(si."priceAtSale" AS double precision) * 0.85
              END
            AS double precision)
          END
        )::float AS "totalUsageValue"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s."id"
      JOIN "Product" p ON si."productId" = p."id"
      LEFT JOIN "ProductPrice" pp ON si."productId" = pp."productId" AND si."unitId" = pp."unitId"
      LEFT JOIN "SaleItemBatch" sib ON sib."saleItemId" = si."id"
      WHERE s."createdAt" >= ${start} AND s."createdAt" <= ${end} AND s."deletedAt" IS NULL
      GROUP BY si."productId", "monthKey"
    `;

    // 2. Ambil semua product price untuk mendapat conversionFactor per unit (beserta nama satuan)
    const allProductPrices = await prisma.productPrice.findMany({
      select: {
        productId: true,
        unitId: true,
        conversionFactor: true,
        unit: { select: { name: true } },
      },
    });

    // Buat lookup map: productId -> (unitId -> conversionFactor)
    const priceFactorMap = new Map<string, Map<string, number>>();
    // Map satuan utama: productId -> { factor: number; unitName: string }
    // Satuan utama = satuan dengan conversionFactor TERBESAR (mis: Karung > Pcs)
    const mainUnitMap = new Map<string, { factor: number; unitName: string }>();

    for (const pp of allProductPrices) {
      if (!priceFactorMap.has(pp.productId)) {
        priceFactorMap.set(pp.productId, new Map());
      }
      priceFactorMap.get(pp.productId)!.set(pp.unitId, pp.conversionFactor);

      // Track satuan utama (conversionFactor terbesar)
      const current = mainUnitMap.get(pp.productId);
      if (!current || pp.conversionFactor > current.factor) {
        mainUnitMap.set(pp.productId, {
          factor: pp.conversionFactor,
          unitName: pp.unit.name,
        });
      }
    }

    // 3. Gabungkan hasil kueri agregat mentah ke dalam Map terstruktur
    const productAggMap = new Map<string, {
      monthlyData: Map<string, number>; // monthKey -> totalBaseUnits
      totalUsageValue: number;
    }>();

    for (const row of rawSales) {
      const productId = row.productId;
      const monthKey = row.monthKey;
      const totalBaseUnits = Number(row.totalBaseUnits) || 0;
      const totalUsageValue = Number(row.totalUsageValue) || 0;

      if (!productAggMap.has(productId)) {
        productAggMap.set(productId, {
          monthlyData: new Map(),
          totalUsageValue: 0,
        });
      }

      const agg = productAggMap.get(productId)!;
      agg.monthlyData.set(monthKey, totalBaseUnits);
      agg.totalUsageValue += totalUsageValue;
    }

    // 4. Ambil semua produk aktif (termasuk yang tidak memiliki transaksi)
    const allProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        averageCost: true,
        stock: true,
        minStock: true,
        leadTime: true,
        maxStock: true,
        abcCategory: true,
        suggestedMin: true,
        suggestedMax: true,
      },
    });

    // 5. Hitung total keseluruhan Usage Value untuk persentase kumulatif
    let grandTotalUsageValue = 0;
    for (const [, agg] of productAggMap) {
      grandTotalUsageValue += agg.totalUsageValue;
    }

    // 6. Urutkan semua produk berdasarkan Usage Value (tertinggi ke terendah)
    const sortedProducts = allProducts.map(product => {
      const agg = productAggMap.get(product.id) || {
        monthlyData: new Map<string, number>(),
        totalUsageValue: 0,
      };
      return { product, agg };
    }).sort((a, b) => b.agg.totalUsageValue - a.agg.totalUsageValue);

    // 7. Klasifikasi ABC & Hitung Min-Max per produk
    let cumulativeUsageValue = 0;
    const results: OptimizationResult[] = [];

    for (const entry of sortedProducts) {
      const { product, agg } = entry;
      const { monthlyData, totalUsageValue } = agg;

      // --- Klasifikasi ABC (Solusi 4: Cold Start Safe) ---
      cumulativeUsageValue += totalUsageValue;
      const cumulativePercentage =
        grandTotalUsageValue > 0
          ? (cumulativeUsageValue / grandTotalUsageValue) * 100
          : 100;

      let newAbcCategory: "A" | "B" | "C";
      if (grandTotalUsageValue === 0 || totalUsageValue === 0) {
        // Solusi 4: Jika produk baru / tidak ada transaksi penjualan,
        // pertahankan kategori ABC manual lama jika sudah diset pemilik, alih-alih paksa ke C.
        newAbcCategory = (product.abcCategory as "A" | "B" | "C") || "C";
      } else if (cumulativePercentage <= limitA) {
        newAbcCategory = "A";
      } else if (cumulativePercentage <= limitB) {
        newAbcCategory = "B";
      } else {
        newAbcCategory = "C";
      }

      // --- Min-Max Berbasis Peak Demand (Bulan Tersibuk) ---
      let peakMonthTotal = 0;
      let peakMonthKey = "";

      for (const [month, total] of monthlyData) {
        if (total > peakMonthTotal) {
          peakMonthTotal = total;
          peakMonthKey = month;
        }
      }

      // Rata-rata penjualan harian pada bulan tersibuk
      const peakDailyDemand = peakMonthTotal / 30;

      // Gunakan leadTime dari database produk (default 3 hari jika tidak diisi pemilik)
      const leadTime = product.leadTime ?? 3;

      // Rumus Min-Max (Solusi 3 & 5: Menggunakan parameter dinamis holdingInterval)
      const suggestedMin = peakDailyDemand > 0
        ? Math.ceil(peakDailyDemand * leadTime)
        : product.minStock;

      const suggestedMax = peakDailyDemand > 0
        ? Math.ceil(suggestedMin + (peakDailyDemand * holdingInterval))
        : product.maxStock ?? suggestedMin * 2;

      // Satuan utama barang ini (untuk konversi tampilan ke satuan terbesar)
      const mainUnit = mainUnitMap.get(product.id) ?? { factor: 1, unitName: "unit" };

      results.push({
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        currentStock: product.stock,
        currentMinStock: product.minStock,
        currentMaxStock: product.maxStock ?? null,
        currentAbcCategory: product.abcCategory as "A" | "B" | "C" | null,
        leadTime,
        totalBaseUnitsSold: [...monthlyData.values()].reduce((s, v) => s + v, 0),
        peakMonthKey: peakMonthKey || null,
        peakMonthSales: peakMonthTotal,
        peakDailyDemand: Math.round(peakDailyDemand * 100) / 100,
        totalUsageValue,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        newAbcCategory,
        suggestedMin,
        suggestedMax,
        mainConversionFactor: mainUnit.factor,
        mainUnitName: mainUnit.unitName,
        hasChanged:
          product.abcCategory !== newAbcCategory ||
          Math.abs((product.suggestedMin ?? -1) - suggestedMin) > 0.01 ||
          Math.abs((product.suggestedMax ?? -1) - suggestedMax) > 0.01,
      });
    }

    return results;
  }

  /**
   * Menerapkan rekomendasi langsung menggunakan data perubahan terhitung dari frontend.
   * Solusi 6: Menghilangkan redundansi kalkulasi database yang berat di sisi server.
   *
   * @param optimizations - Array berisi objek perubahan rekomendasi per produk yang disetujui
   * @param applyMinStock - Jika true, minStock aktif akan diupdate ke suggestedMin
   * @returns Jumlah produk yang berhasil diupdate
   */
  static async applyOptimization(
    optimizations: Array<{
      productId: string;
      newAbcCategory: "A" | "B" | "C";
      suggestedMin: number;
      suggestedMax: number;
    }>,
    applyMinStock: boolean = true,
    userId?: string
  ): Promise<{ updatedCount: number }> {
    if (!optimizations || optimizations.length === 0) {
      return { updatedCount: 0 };
    }

    // Jalankan seluruh pembaruan dalam satu transaksi Prisma untuk integritas & kecepatan maksimal
    await prisma.$transaction(
      optimizations.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            abcCategory: item.newAbcCategory,
            suggestedMin: item.suggestedMin,
            suggestedMax: item.suggestedMax,
            ...(applyMinStock && { minStock: item.suggestedMin }),
          },
        })
      )
    );

    if (userId && optimizations.length > 0) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "OPTIMIZE_INVENTORY",
        entity: "Product",
        entityId: "BULK",
        details: { count: optimizations.length, applyMinStock }
      });
    }

    return { updatedCount: optimizations.length };
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface OptimizationResult {
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  currentMinStock: number;
  currentMaxStock: number | null;
  currentAbcCategory: "A" | "B" | "C" | null;
  leadTime: number;
  totalBaseUnitsSold: number;
  peakMonthKey: string | null;
  peakMonthSales: number;
  peakDailyDemand: number;
  totalUsageValue: number;
  cumulativePercentage: number;
  newAbcCategory: "A" | "B" | "C";
  suggestedMin: number;  // dalam Base Unit (untuk disimpan ke DB)
  suggestedMax: number;  // dalam Base Unit (untuk disimpan ke DB)
  mainConversionFactor: number; // faktor konversi satuan terbesar (untuk tampilan)
  mainUnitName: string;         // nama satuan terbesar (mis: "Karung", "Dus")
  hasChanged: boolean;
}
