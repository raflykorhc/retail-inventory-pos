import prisma from "../config/db.ts";

/**
 * InventoryOptimizationService
 *
 * Mengimplementasikan dua metode inti manajemen persediaan dinamis:
 * 1. Algoritma Klasifikasi ABC (Analisis Pareto):
 *    - Langkah 1: Pengumpulan Nilai Penjualan Historis per produk dari entitas Item Penjualan
 *      berdasarkan HPP aktual FIFO. Baseline 85% harga jual untuk produk tanpa batch terjual (margin 15%).
 *    - Langkah 2: Pengurutan seluruh produk dari nilai penjualan tertinggi ke terendah dan
 *      perhitungan persentase kontribusi serta kontribusi kumulatif.
 *    - Langkah 3: Penetapan kategori Pareto (Kategori A: 0-80%, Kategori B: 80-95%, Kategori C: 95-100%).
 *    - Langkah 4: Pembaruan Klasifikasi di entitas produk & pencatatan timestamp reklasifikasi.
 *
 * 2. Algoritma Kalkulasi Batas Stok Dinamis:
 *    - Peak Daily Demand (PDD): Nilai penjualan harian tertinggi dalam satuan dasar pada periode historis.
 *    - Stok Minimum = Lead Time (hari) x Peak Daily Demand
 *    - Stok Maksimum = Stok Minimum + (Peak Daily Demand x 14)
 *    - Fallback tanpa riwayat penjualan: Stok Maksimum = 2 x Stok Minimum
 */
export class InventoryOptimizationService {

  /**
   * Menghitung data optimasi untuk semua produk aktif dengan parameter dinamis.
   * Mendukung rentang tanggal kustom (startDate - endDate) atau bulan (monthsRange).
   *
   * @param params - Konfigurasi kalkulasi (rentang tanggal, ambang batas A & B, holding interval)
   * @returns Array hasil kalkulasi per produk.
   */
  static async calculateOptimization(params: {
    startDate?: string;
    endDate?: string;
    monthsRange?: number;
    limitA?: number;
    limitB?: number;
    holdingInterval?: number;
    onProgress?: (step: number, subtaskIndex: number) => void;
  } | number = 3,
  limitAArg: number = 80,
  limitBArg: number = 95,
  holdingIntervalArg: number = 14
  ): Promise<OptimizationResult[]> {
    const { SettingsService } = await import("./SettingsService.ts");
    const settings = SettingsService.getSettings();

    // Normalisasi parameter input (kompatibel dengan signature lama maupun baru)
    let startDateStr: string | undefined;
    let endDateStr: string | undefined;
    let monthsRange = 3;
    let limitA = limitAArg !== 80 ? limitAArg : settings.abcLimitA ?? 80;
    let limitB = limitBArg !== 95 ? limitBArg : settings.abcLimitB ?? 95;
    let holdingInterval = holdingIntervalArg !== 14 ? holdingIntervalArg : settings.defaultHoldingInterval ?? 14;
    let onProgress: ((step: number, subtaskIndex: number) => void) | undefined;

    if (typeof params === "object" && params !== null) {
      startDateStr = params.startDate;
      endDateStr = params.endDate;
      monthsRange = params.monthsRange ?? 3;
      limitA = params.limitA ?? settings.abcLimitA ?? 80;
      limitB = params.limitB ?? settings.abcLimitB ?? 95;
      holdingInterval = params.holdingInterval ?? settings.defaultHoldingInterval ?? 14;
      onProgress = params.onProgress;
    } else if (typeof params === "number") {
      monthsRange = params;
    }

    const reportProgress = async (step: number, subtaskIndex: number) => {
      if (onProgress) {
        onProgress(step, subtaskIndex);
        // Add a small artificial delay so the UI progression is smooth and readable for the user,
        // preventing the modal from flashing through all steps instantly (since backend is too fast).
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };

    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDateStr && endDateStr) {
      start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      start = new Date(now);
      start.setMonth(start.getMonth() - monthsRange);
      start.setHours(0, 0, 0, 0);
    }

    await reportProgress(1, 0); // Mengambil riwayat transaksi penjualan
    // 1. Agregasi penjualan harian per produk di level Database (PostgreSQL)
    //    - Langkah 1: Pengumpulan Nilai Penjualan Historis dihitung dari HPP aktual FIFO (SaleItemBatch)
    //      atau estimasi 85% harga jual (baseline margin 15%) jika tidak ada alokasi batch.
    //    - Pengelompokan per hari ("dateKey") untuk menghitung Peak Daily Demand per produk dalam Base Unit.
    const rawDailySales: any[] = await prisma.$queryRaw`
      SELECT 
        si."productId",
        TO_CHAR(s."createdAt", 'YYYY-MM-DD') AS "dateKey",
        SUM(
          CASE 
            WHEN sib."id" IS NOT NULL THEN CAST(sib."quantity" AS double precision)
            ELSE CAST(si."quantity" * COALESCE(pp."conversionFactor", 1.0) AS double precision)
          END
        )::float AS "dailyBaseUnits",
        SUM(
          CASE
            WHEN sib."id" IS NOT NULL THEN CAST(sib."quantity" * sib."costPrice" AS double precision)
            ELSE CAST(si."quantity" * COALESCE(pp."conversionFactor", 1.0) * (si."priceAtSale" * 0.85) AS double precision)
          END
        )::float AS "dailyUsageValue"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s."id"
      JOIN "Product" p ON si."productId" = p."id"
      LEFT JOIN "ProductPrice" pp ON si."productId" = pp."productId" AND si."unitId" = pp."unitId"
      LEFT JOIN "SaleItemBatch" sib ON sib."saleItemId" = si."id"
      WHERE s."createdAt" >= ${start} AND s."createdAt" <= ${end} AND s."deletedAt" IS NULL
      GROUP BY si."productId", "dateKey"
    `;

    await reportProgress(1, 1); // Menghitung total nilai omzet per produk

    // 2. Ambil semua product price untuk mendapat conversionFactor per unit dan satuan utama
    const allProductPrices = await prisma.productPrice.findMany({
      select: {
        productId: true,
        unitId: true,
        conversionFactor: true,
        unit: { select: { name: true } },
      },
    });

    // Lookup map satuan utama: productId -> { factor, unitName } (satuan dengan faktor terbesar)
    const mainUnitMap = new Map<string, { factor: number; unitName: string }>();
    for (const pp of allProductPrices) {
      const current = mainUnitMap.get(pp.productId);
      if (!current || pp.conversionFactor > current.factor) {
        mainUnitMap.set(pp.productId, {
          factor: pp.conversionFactor,
          unitName: pp.unit.name,
        });
      }
    }

    await reportProgress(1, 2); // Merekapitulasi pergerakan barang
    
    // 3. Gabungkan hasil harian ke struktur Map per produk
    const productAggMap = new Map<string, {
      dailyData: Map<string, number>; // dateKey -> dailyBaseUnits
      totalUsageValue: number;
      totalBaseUnitsSold: number;
    }>();

    for (const row of rawDailySales) {
      const productId = row.productId;
      const dateKey = row.dateKey;
      const dailyBaseUnits = Number(row.dailyBaseUnits) || 0;
      const dailyUsageValue = Number(row.dailyUsageValue) || 0;

      if (!productAggMap.has(productId)) {
        productAggMap.set(productId, {
          dailyData: new Map(),
          totalUsageValue: 0,
          totalBaseUnitsSold: 0,
        });
      }

      const agg = productAggMap.get(productId)!;
      agg.dailyData.set(dateKey, dailyBaseUnits);
      agg.totalUsageValue += dailyUsageValue;
      agg.totalBaseUnitsSold += dailyBaseUnits;
    }

    // 4. Ambil semua produk aktif di katalog
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
        holdingInterval: true,
        warehouseCapacity: true,
        safetyStockDays: true,
      },
    });

    await reportProgress(2, 0); // Menyusun produk dari penjualan tertinggi
    // 5. Hitung Grand Total Nilai Penjualan untuk kontribusi Pareto
    let grandTotalUsageValue = 0;
    for (const [, agg] of productAggMap) {
      grandTotalUsageValue += agg.totalUsageValue;
    }

    await reportProgress(2, 1); // Menghitung persentase kontribusi per produk

    // 6. Langkah 2: Pengurutan seluruh produk dari nilai penjualan tertinggi ke terendah
    const sortedProducts = allProducts.map(product => {
      const agg = productAggMap.get(product.id) || {
        dailyData: new Map<string, number>(),
        totalUsageValue: 0,
        totalBaseUnitsSold: 0,
      };
      return { product, agg };
    }).sort((a, b) => b.agg.totalUsageValue - a.agg.totalUsageValue);

    await reportProgress(2, 2); // Mengakumulasi total kontribusi penjualan
    await reportProgress(3, 0); // Kelas A

    // 7. Langkah 3: Penetapan Kategori & Kalkulasi Batas Stok Dinamis Min-Max
    let cumulativeUsageValue = 0;
    const results: OptimizationResult[] = [];

    for (const entry of sortedProducts) {
      const { product, agg } = entry;
      const { dailyData, totalUsageValue, totalBaseUnitsSold } = agg;

      // Hitung persentase kontribusi individu dan kumulatif
      const individualPercentage =
        grandTotalUsageValue > 0
          ? (totalUsageValue / grandTotalUsageValue) * 100
          : 0;

      cumulativeUsageValue += totalUsageValue;
      const cumulativePercentage =
        grandTotalUsageValue > 0
          ? (cumulativeUsageValue / grandTotalUsageValue) * 100
          : 100;

      // Penetapan Kategori Pareto: A (0-80%), B (80-95%), C (95-100%)
      let newAbcCategory: "A" | "B" | "C";
      if (grandTotalUsageValue === 0 || totalUsageValue === 0) {
        // Cold start safe: jika produk tanpa penjualan, pertahankan kategori manual lama jika ada, atau default ke C
        newAbcCategory = (product.abcCategory as "A" | "B" | "C") || "C";
      } else if (cumulativePercentage <= limitA) {
        newAbcCategory = "A";
      } else if (cumulativePercentage <= limitB) {
        newAbcCategory = "B";
      } else {
        newAbcCategory = "C";
      }

      // Kalkulasi Average Daily Demand
      const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const averageDailyDemand = totalBaseUnitsSold / daysInPeriod;

      // Lead Time per produk (default dari setting global jika belum diisi)
      const leadTime = product.leadTime && product.leadTime > 0 ? product.leadTime : (settings.defaultLeadTime ?? 3);
      const safetyStockDays = product.safetyStockDays ?? settings.defaultSafetyStockDays ?? 1;

      // Formula Min-Max dengan Average Demand:
      // Stok Minimum = (Average Daily Demand x Lead Time) + Safety Stock (n hari Average Demand)
      // Stok Maksimum = Stok Minimum + (Average Daily Demand x Holding Interval)
      // Pembatasan: Maksimum tidak boleh melebihi warehouseCapacity jika diset.
      let suggestedMin: number;
      let suggestedMax: number;
      const productHoldingInterval = product.holdingInterval ?? holdingInterval;

      if (averageDailyDemand > 0) {
        const safetyStock = averageDailyDemand * safetyStockDays;
        suggestedMin = Math.ceil((leadTime * averageDailyDemand) + safetyStock);
        suggestedMax = Math.ceil(suggestedMin + (averageDailyDemand * productHoldingInterval));
      } else {
        suggestedMin = product.minStock > 0 ? product.minStock : 10;
        suggestedMax = product.maxStock && product.maxStock > 0 ? product.maxStock : suggestedMin * 2;
      }
      
      // Terapkan batas Kapasitas Gudang (Warehouse Capacity) jika ada
      if (product.warehouseCapacity && product.warehouseCapacity > 0) {
        if (suggestedMax > product.warehouseCapacity) {
          suggestedMax = product.warehouseCapacity;
        }
        if (suggestedMin > suggestedMax) {
          suggestedMin = suggestedMax;
        }
      }

      // Satuan utama untuk tampilan konversi di UI
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
        totalBaseUnitsSold,
        peakDateKey: null,
        peakDailyDemand: 0,
        averageDailyDemand: Math.round(averageDailyDemand * 100) / 100,
        totalUsageValue: Math.round(totalUsageValue),
        individualPercentage: Math.round(individualPercentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        newAbcCategory,
        suggestedMin: Math.round(suggestedMin),
        suggestedMax: Math.round(suggestedMax),
        currentHoldingInterval: product.holdingInterval,
        safetyStockDays,
        mainConversionFactor: mainUnit.factor,
        mainUnitName: mainUnit.unitName,
        warehouseCapacity: product.warehouseCapacity,
        hasChanged:
          product.abcCategory !== newAbcCategory ||
          Math.abs((product.suggestedMin ?? -1) - suggestedMin) > 0.01 ||
          Math.abs((product.suggestedMax ?? -1) - suggestedMax) > 0.01,
      });
    }

    // Simpan hasil kalkulasi ke cache status
    try {
      const { SchedulerService } = await import("./SchedulerService.ts");
      SchedulerService.saveLastCalculation(results, {
        startDate: startDateStr,
        endDate: endDateStr,
        monthsRange,
        limitA,
        limitB,
        holdingInterval,
      });
      SchedulerService.updateStatus("calculation");
    } catch (err) {
      console.error("[InventoryOptimizationService] Gagal menyimpan cache kalkulasi:", err);
    }

    // Karena proses loop sangat cepat, kita simulasikan transisi progress 
    // secara berurutan setelah loop selesai agar animasi UI berjalan mulus.
    await reportProgress(3, 1); // Kelas B
    await reportProgress(3, 2); // Kelas C
    await reportProgress(4, 0); // Menganalisis rata-rata penjualan harian
    await reportProgress(4, 1); // Safety stock
    await reportProgress(4, 2); // Menentukan batas minimum dan maksimum

    return results;
  }

  /**
   * Mengambil data kalkulasi terakhir dari cache, atau fallback ke status produk yang tersimpan di database.
   */
  static async getLastOrStoredState(options?: {
    cursor?: string;
    limit?: number;
    searchQuery?: string;
    filterCategory?: string;
    changedOnly?: boolean;
  }): Promise<{
    data: OptimizationResult[];
    nextCursor: string | null;
    summary: any;
    lastCalculationRun: string | null;
    lastManualRun: string | null;
    lastAutoRun: string | null;
    params: any;
  }> {
    const { SchedulerService } = await import("./SchedulerService.ts");
    const status = SchedulerService.getStatus();
    const cachedCalc = SchedulerService.getLastCalculation();

    const limit = options?.limit || 20;

    if (cachedCalc && Array.isArray(cachedCalc.data) && cachedCalc.data.length > 0) {
      let filteredData = cachedCalc.data;

      // Apply Filters in memory for cache
      if (options?.changedOnly) {
        filteredData = filteredData.filter((r) => r.hasChanged);
      }
      if (options?.filterCategory && options.filterCategory !== "ALL") {
        filteredData = filteredData.filter((r) => r.newAbcCategory === options.filterCategory);
      }
      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        filteredData = filteredData.filter(
          (r) => r.productName.toLowerCase().includes(q) || r.productCode.toLowerCase().includes(q)
        );
      }

      // Calculate global summary from unfiltered cached data
      const summary = {
        A: { count: 0, totalValue: 0 },
        B: { count: 0, totalValue: 0 },
        C: { count: 0, totalValue: 0 },
        totalValue: 0,
        totalCount: cachedCalc.data.length,
        changedCount: cachedCalc.data.filter((r) => r.hasChanged).length,
      };

      cachedCalc.data.forEach((r) => {
        if (summary[r.newAbcCategory as "A" | "B" | "C"]) {
          summary[r.newAbcCategory as "A" | "B" | "C"].count += 1;
          summary[r.newAbcCategory as "A" | "B" | "C"].totalValue += r.totalUsageValue;
        }
        summary.totalValue += r.totalUsageValue;
      });

      // Pagination
      let startIndex = 0;
      if (options?.cursor) {
        const cursorIndex = filteredData.findIndex((r) => r.productId === options.cursor);
        if (cursorIndex >= 0) {
          startIndex = cursorIndex + 1; // start after cursor
        }
      }

      const pagedData = filteredData.slice(startIndex, startIndex + limit);
      const nextCursor = pagedData.length > 0 ? pagedData[pagedData.length - 1].productId : null;

      return {
        data: pagedData,
        nextCursor,
        summary,
        lastCalculationRun: cachedCalc.timestamp || status.lastCalculationRun,
        lastManualRun: status.lastManualRun,
        lastAutoRun: status.lastAutoRun,
        params: cachedCalc.params,
      };
    }

    // Jika belum pernah ada cache kalkulasi, muat status produk aktif dari DB
    const storedState = await this.getCurrentStoredState(options);
    return {
      data: storedState.data,
      nextCursor: storedState.nextCursor,
      summary: storedState.summary,
      lastCalculationRun: status.lastCalculationRun,
      lastManualRun: status.lastManualRun,
      lastAutoRun: status.lastAutoRun,
      params: null,
    };
  }



  /**
   * Mengambil data produk aktif beserta status kategori ABC & Min-Max yang tersimpan saat ini di database.
   */
  static async getCurrentStoredState(options?: {
    cursor?: string;
    limit?: number;
    searchQuery?: string;
    filterCategory?: string;
    changedOnly?: boolean;
  }): Promise<{ data: OptimizationResult[], nextCursor: string | null, summary: any }> {
    const limit = options?.limit || 20;

    const whereClause: any = { deletedAt: null };
    
    if (options?.filterCategory && options.filterCategory !== "ALL") {
      whereClause.abcCategory = options.filterCategory;
    }

    if (options?.searchQuery) {
      whereClause.OR = [
        { name: { contains: options.searchQuery, mode: "insensitive" } },
        { code: { contains: options.searchQuery, mode: "insensitive" } }
      ];
    }

    const allProducts = await prisma.product.findMany({
      where: whereClause,
      take: limit,
      skip: options?.cursor ? 1 : 0,
      ...(options?.cursor ? { cursor: { id: options.cursor } } : {}),
      orderBy: { id: "asc" },
      include: {
        prices: {
          include: { unit: true },
          orderBy: { conversionFactor: "desc" },
        },
      },
    });

    // Calculate Summary from DB
    const counts = await prisma.product.groupBy({
      by: ["abcCategory"],
      where: { deletedAt: null },
      _count: true,
    });

    const totalCount = counts.reduce((acc, curr) => acc + curr._count, 0);
    const summary = {
      A: { count: counts.find(c => c.abcCategory === "A")?._count || 0, totalValue: 0 },
      B: { count: counts.find(c => c.abcCategory === "B")?._count || 0, totalValue: 0 },
      C: { count: counts.find(c => c.abcCategory === "C")?._count || 0, totalValue: 0 },
      totalValue: 0,
      totalCount: totalCount,
      changedCount: 0,
    };

    const nextCursor = allProducts.length > 0 && allProducts.length === limit ? allProducts[allProducts.length - 1].id : null;

    const data = allProducts.map((product) => {
      const sortedPrices = product.prices;
      const mainPrice = sortedPrices[0];
      const mainConversionFactor = mainPrice?.conversionFactor || 1;
      const mainUnitName = mainPrice?.unit?.name || "Unit";
      const currentCategory = (product.abcCategory as "A" | "B" | "C" | null) ?? null;
      const minStock = product.minStock || 10;
      const maxStock = product.maxStock || minStock * 2;
      const suggestedMin = product.suggestedMin || minStock;
      const suggestedMax = product.suggestedMax || maxStock;

      return {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        currentStock: product.stock,
        currentMinStock: product.minStock,
        currentMaxStock: product.maxStock,
        currentAbcCategory: currentCategory,
        leadTime: product.leadTime || 3,
        totalBaseUnitsSold: 0,
        peakDateKey: null,
        peakDailyDemand: 0,
        averageDailyDemand: 0,
        totalUsageValue: 0,
        individualPercentage: 0,
        cumulativePercentage: 0,
        newAbcCategory: currentCategory,
        suggestedMin,
        suggestedMax,
        currentHoldingInterval: product.holdingInterval,
        mainConversionFactor,
        mainUnitName,
        safetyStockDays: product.safetyStockDays ?? 1,
        warehouseCapacity: product.warehouseCapacity,
        hasChanged: false,
      };
    });

    return { data, nextCursor, summary };
  }

  /**
   * Langkah 4: Pembaruan Klasifikasi di entitas produk & database.
   *
   * @param optimizations - Array perubahan per produk
   * @param applyMinStock - Jika true, minStock aktif produk ikut diupdate
   * @param applyMaxStock - Jika true, maxStock aktif produk ikut diupdate
   * @param userId - ID user yang melakukan pembaruan untuk audit log
   * @returns Jumlah produk yang berhasil diperbarui
   */
  static async applyOptimization(
    optimizations: Array<{
      productId: string;
      newAbcCategory: "A" | "B" | "C";
      suggestedMin: number;
      suggestedMax: number;
    }>,
    applyMinStock: boolean = true,
    applyMaxStock: boolean = true,
    userId?: string
  ): Promise<{ updatedCount: number }> {
    if (!optimizations || optimizations.length === 0) {
      return { updatedCount: 0 };
    }

    // Jalankan seluruh pembaruan dalam satu transaksi Prisma untuk konsistensi data
    await prisma.$transaction(
      optimizations.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            abcCategory: item.newAbcCategory,
            suggestedMin: item.suggestedMin,
            suggestedMax: item.suggestedMax,
            ...(applyMinStock && { minStock: item.suggestedMin }),
            ...(applyMaxStock && { maxStock: item.suggestedMax }),
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
        details: { count: optimizations.length, applyMinStock, applyMaxStock }
      });
    }

    return { updatedCount: optimizations.length };
  }

  /**
   * Mereset hasil penerapan optimasi klasifikasi ABC & Stok Min-Max ke kondisi semula (unclassified / null).
   *
   * @param productIds - Array ID produk spesifik yang ingin di-reset, atau undefined jika reset seluruh produk
   * @param resetMinMax - Jika true, minStock dan maxStock ikut di-reset ke nilai default (minStock: 10, maxStock: null)
   * @param userId - ID user yang melakukan reset untuk audit log
   * @returns Jumlah produk yang berhasil di-reset
   */
  static async resetOptimization(
    productIds?: string[],
    resetMinMax: boolean = true,
    userId?: string
  ): Promise<{ resetCount: number }> {
    const whereClause: any = { deletedAt: null };
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const updateData: any = {
      abcCategory: null,
      suggestedMin: null,
      suggestedMax: null,
    };

    if (resetMinMax) {
      updateData.minStock = 10;
      updateData.maxStock = null;
    }

    const result = await prisma.product.updateMany({
      where: whereClause,
      data: updateData,
    });

    // Hapus cache hasil hitung ulang / kalkulasi terakhir
    try {
      const { SchedulerService } = await import("./SchedulerService.ts");
      SchedulerService.clearLastCalculation();
    } catch (err) {
      console.error("[InventoryOptimizationService] Gagal membersihkan cache kalkulasi:", err);
    }

    if (userId) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "RESET_INVENTORY_OPTIMIZATION",
        entity: "Product",
        entityId: productIds && productIds.length > 0 ? "SELECTED" : "ALL",
        details: { count: result.count, resetMinMax }
      });
    }

    return { resetCount: result.count };
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
  peakDateKey: string | null;
  peakDailyDemand: number;
  averageDailyDemand: number;
  totalUsageValue: number;
  individualPercentage: number;
  cumulativePercentage: number;
  newAbcCategory: "A" | "B" | "C" | null;
  suggestedMin: number;  // dalam Base Unit
  suggestedMax: number;  // dalam Base Unit
  currentHoldingInterval: number | null; // Nullable for global fallback
  safetyStockDays: number;
  mainConversionFactor: number; // faktor konversi satuan terbesar
  mainUnitName: string;         // nama satuan terbesar (mis: "Karung", "Dus", "Pcs")
  warehouseCapacity?: number | null;
  hasChanged: boolean;
}
