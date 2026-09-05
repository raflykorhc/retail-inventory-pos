import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let idCounter = 1000;
function makeId(prefix: string): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

async function generate() {
  console.log('Generating simulation SQL script with fixed batch unit prices...');

  const passwordHash = await bcrypt.hash('kasir123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);

  // Entities
  const userIdKasir = 'user_kasir_01';
  const userIdAdmin = 'user_admin_01';
  const userIdManager = 'user_manager_01';

  const supplierId = 'supp_distributor_01';

  // Categories
  const catSemenId = 'cat_semen';
  const catBesiId = 'cat_besi';
  const catPasirId = 'cat_pasir';
  const catBataId = 'cat_bata';
  const catCatId = 'cat_cat';
  const catPakuId = 'cat_paku';

  // Units
  const uZakId = 'unit_zak';
  const uBatangId = 'unit_batang';
  const uTrukId = 'unit_truk';
  const uKolId = 'unit_kol';
  const uKarungId = 'unit_karung';
  const uPcsId = 'unit_pcs';
  const uKubikId = 'unit_kubik';
  const uGalonId = 'unit_galon';
  const uBoxId = 'unit_box';
  const uKgId = 'unit_kg';
  const uQuarterKgId = 'unit_quarter_kg';

  // Products
  const pSemen = {
    id: 'prod_semen_01',
    code: 'BRG-SEM-001',
    name: 'Semen Tiga Roda 40 KG',
    description: 'Semen PCC Tiga Roda Kemasan 40 KG',
    categoryId: catSemenId,
    stock: 30, // 180 bought - 150 sold
    minStock: 45,
    maxStock: 255,
    averageCost: 59000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 3,
    safetyStockDays: 3,
    warehouseCapacity: 150,
    suggestedMin: 45,
    suggestedMax: 255,
    baseUnitId: uZakId,
  };

  const pBesi = {
    id: 'prod_besi_01',
    code: 'BRG-BSI-001',
    name: 'Besi 10',
    description: 'Besi Beton Polos Diameter 10 mm Panjang 12m',
    categoryId: catBesiId,
    stock: 20, // 120 bought - 100 sold
    minStock: 75,
    maxStock: 285,
    averageCost: 74000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 5,
    safetyStockDays: 1,
    warehouseCapacity: 100,
    suggestedMin: 75,
    suggestedMax: 285,
    baseUnitId: uBatangId,
  };

  const pPasir = {
    id: 'prod_pasir_01',
    code: 'BRG-PSR-001',
    name: 'Pasir Cor',
    description: 'Pasir Cor Kualitas Tinggi Bulk / Karung',
    categoryId: catPasirId,
    stock: 450, // 720 bought - 270 sold
    minStock: 120,
    maxStock: 150, // clamped from 960 to capacity 150
    averageCost: 25000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 2,
    safetyStockDays: 2,
    warehouseCapacity: 150,
    suggestedMin: 120,
    suggestedMax: 150,
    baseUnitId: uKarungId,
  };

  const pSplit = {
    id: 'prod_split_01',
    code: 'BRG-SPL-001',
    name: 'Split',
    description: 'Batu Split Batu Pecah 2/3 Karung',
    categoryId: catPasirId,
    stock: 90, // 360 bought - 270 sold
    minStock: 120,
    maxStock: 960,
    averageCost: 25000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 2,
    safetyStockDays: 1,
    warehouseCapacity: 200,
    suggestedMin: 120,
    suggestedMax: 960,
    baseUnitId: uKarungId,
  };

  const pHebel = {
    id: 'prod_hebel_01',
    code: 'BRG-HBL-001',
    name: 'Bata Ringan / Hebel 10',
    description: 'Bata Ringan AAC Ketebalan 10 cm',
    categoryId: catBataId,
    stock: 166, // 996 bought - 830 sold
    minStock: 400,
    maxStock: 1800,
    averageCost: 7228,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 4,
    safetyStockDays: 1,
    warehouseCapacity: 600,
    suggestedMin: 400,
    suggestedMax: 1800,
    baseUnitId: uPcsId,
  };

  const pCat = {
    id: 'prod_cat_01',
    code: 'BRG-CAT-001',
    name: 'Cat Aries 725 Putih Salju',
    description: 'Cat Tembok Aries 725 Putih Salju 5 KG Galon',
    categoryId: catCatId,
    stock: 24, // 100 bought - 76 sold
    minStock: 70,
    maxStock: 210,
    averageCost: 75000,
    supplierId: supplierId,
    abcCategory: 'B',
    leadTime: 7,
    safetyStockDays: 1,
    warehouseCapacity: 80,
    suggestedMin: 70,
    suggestedMax: 210,
    baseUnitId: uGalonId,
  };

  const pPaku = {
    id: 'prod_paku_01',
    code: 'BRG-PKU-001',
    name: 'Paku 5',
    description: 'Paku Kayu Ukuran 5 cm (2 inchi)',
    categoryId: catPakuId,
    stock: 200, // 1500 bought - 1300 sold
    minStock: 0,
    maxStock: 0,
    averageCost: 4000,
    supplierId: supplierId,
    abcCategory: 'C',
    leadTime: 0,
    safetyStockDays: 0,
    warehouseCapacity: 0,
    suggestedMin: 0,
    suggestedMax: 0,
    baseUnitId: uQuarterKgId,
  };

  const products = [pSemen, pBesi, pPasir, pSplit, pHebel, pCat, pPaku];

  // Product Prices (Table 4.1 multi-unit conversions)
  const prices: { id: string; productId: string; unitId: string; price: number; convFactor: number }[] = [
    // Semen Tiga Roda
    { id: 'pp_sem_1', productId: pSemen.id, unitId: uZakId, price: 65000, convFactor: 1 },

    // Besi 10
    { id: 'pp_bsi_1', productId: pBesi.id, unitId: uBatangId, price: 85000, convFactor: 1 },

    // Pasir Cor (Karung base, 1 Kol = 30 karung, 1 Truk = 360 karung)
    { id: 'pp_psr_1', productId: pPasir.id, unitId: uKarungId, price: 30000, convFactor: 1 },
    { id: 'pp_psr_2', productId: pPasir.id, unitId: uKolId, price: 900000, convFactor: 30 },
    { id: 'pp_psr_3', productId: pPasir.id, unitId: uTrukId, price: 10800000, convFactor: 360 },

    // Split (Karung base, 1 Kol = 30 karung, 1 Truk = 360 karung)
    { id: 'pp_spl_1', productId: pSplit.id, unitId: uKarungId, price: 30000, convFactor: 1 },
    { id: 'pp_spl_2', productId: pSplit.id, unitId: uKolId, price: 900000, convFactor: 30 },
    { id: 'pp_spl_3', productId: pSplit.id, unitId: uTrukId, price: 10800000, convFactor: 360 },

    // Hebel (PCS base, 1 Kubik = 83 pcs)
    { id: 'pp_hbl_1', productId: pHebel.id, unitId: uPcsId, price: 8500, convFactor: 1 },
    { id: 'pp_hbl_2', productId: pHebel.id, unitId: uKubikId, price: 705500, convFactor: 83 },

    // Cat Aries (Galon base)
    { id: 'pp_cat_1', productId: pCat.id, unitId: uGalonId, price: 88000, convFactor: 1 },

    // Paku 5 (1/4 KG base, 1 KG = 4, 1 BOX = 100)
    { id: 'pp_pku_1', productId: pPaku.id, unitId: uQuarterKgId, price: 5000, convFactor: 1 },
    { id: 'pp_pku_2', productId: pPaku.id, unitId: uKgId, price: 20000, convFactor: 4 },
    { id: 'pp_pku_3', productId: pPaku.id, unitId: uBoxId, price: 500000, convFactor: 100 },
  ];

  // Purchases (Table 4.2)
  const purchasesData = [
    {
      id: 'purch_01',
      inv: 'PO/20260801/0001',
      date: '2026-08-01 08:00:00',
      batchCode: 'B1-SEM',
      product: pSemen,
      unitId: uZakId,
      qty: 60,
      costPrice: 58000,
      sellingPrice: 65000,
      convFactor: 1,
      batchId: 'batch_b1_sem',
      costPriceBase: 58000,
      sellingPriceBase: 65000,
    },
    {
      id: 'purch_02',
      inv: 'PO/20260801/0002',
      date: '2026-08-01 08:30:00',
      batchCode: 'B1-BSI',
      product: pBesi,
      unitId: uBatangId,
      qty: 60,
      costPrice: 73000,
      sellingPrice: 85000,
      convFactor: 1,
      batchId: 'batch_b1_bsi',
      costPriceBase: 73000,
      sellingPriceBase: 85000,
    },
    {
      id: 'purch_03',
      inv: 'PO/20260801/0003',
      date: '2026-08-01 09:00:00',
      batchCode: 'B1-SPL',
      product: pSplit,
      unitId: uTrukId,
      qty: 1,
      costPrice: 9000000,
      sellingPrice: 10800000,
      convFactor: 360,
      batchId: 'batch_b1_spl',
      baseQty: 360,
      costPriceBase: 25000,
      sellingPriceBase: 30000,
    },
    {
      id: 'purch_04',
      inv: 'PO/20260801/0004',
      date: '2026-08-01 09:30:00',
      batchCode: 'B1-HBL',
      product: pHebel,
      unitId: uKubikId,
      qty: 12,
      costPrice: 599924,
      sellingPrice: 705500,
      convFactor: 83,
      batchId: 'batch_b1_hbl',
      baseQty: 996,
      costPriceBase: 7228,
      sellingPriceBase: 8500,
    },
    {
      id: 'purch_05',
      inv: 'PO/20260801/0005',
      date: '2026-08-01 10:00:00',
      batchCode: 'B1-CAT',
      product: pCat,
      unitId: uGalonId,
      qty: 100,
      costPrice: 75000,
      sellingPrice: 88000,
      convFactor: 1,
      batchId: 'batch_b1_cat',
      costPriceBase: 75000,
      sellingPriceBase: 88000,
    },
    {
      id: 'purch_06',
      inv: 'PO/20260801/0006',
      date: '2026-08-01 10:30:00',
      batchCode: 'B1-PKU',
      product: pPaku,
      unitId: uBoxId,
      qty: 15,
      costPrice: 400000,
      sellingPrice: 500000,
      convFactor: 100,
      batchId: 'batch_b1_pku',
      baseQty: 1500,
      costPriceBase: 4000,
      sellingPriceBase: 5000,
    },
    {
      id: 'purch_07',
      inv: 'PO/20260805/0001',
      date: '2026-08-05 08:00:00',
      batchCode: 'B1-PSR',
      product: pPasir,
      unitId: uTrukId,
      qty: 2,
      costPrice: 9000000,
      sellingPrice: 10800000,
      convFactor: 360,
      batchId: 'batch_b1_psr',
      baseQty: 720,
      costPriceBase: 25000,
      sellingPriceBase: 30000,
    },
    {
      id: 'purch_08',
      inv: 'PO/20260810/0001',
      date: '2026-08-10 08:00:00',
      batchCode: 'B2-SEM',
      product: pSemen,
      unitId: uZakId,
      qty: 60,
      costPrice: 59000,
      sellingPrice: 65000,
      convFactor: 1,
      batchId: 'batch_b2_sem',
      costPriceBase: 59000,
      sellingPriceBase: 65000,
    },
    {
      id: 'purch_09',
      inv: 'PO/20260820/0001',
      date: '2026-08-20 08:00:00',
      batchCode: 'B3-SEM',
      product: pSemen,
      unitId: uZakId,
      qty: 60,
      costPrice: 60000,
      sellingPrice: 65000,
      convFactor: 1,
      batchId: 'batch_b3_sem',
      costPriceBase: 60000,
      sellingPriceBase: 65000,
    },
    {
      id: 'purch_10',
      inv: 'PO/20260820/0002',
      date: '2026-08-20 08:30:00',
      batchCode: 'B2-BSI',
      product: pBesi,
      unitId: uBatangId,
      qty: 60,
      costPrice: 75000,
      sellingPrice: 85000,
      convFactor: 1,
      batchId: 'batch_b2_bsi',
      costPriceBase: 75000,
      sellingPriceBase: 85000,
    },
  ];

  // Map remaining quantities after all sales
  const batchRemainingQty: Record<string, number> = {
    'batch_b1_sem': 0,
    'batch_b2_sem': 0,
    'batch_b3_sem': 30,
    'batch_b1_bsi': 0,
    'batch_b2_bsi': 20,
    'batch_b1_psr': 450,
    'batch_b1_spl': 90,
    'batch_b1_hbl': 166,
    'batch_b1_cat': 24,
    'batch_b1_pku': 200,
  };

  interface SaleGenItem {
    product: typeof pSemen;
    unitId: string;
    qty: number;
    priceAtSale: number;
    convFactor: number;
    batchId: string;
    costPriceBase: number;
    baseQty: number;
  }

  interface DailySale {
    invNumber: string;
    date: string;
    items: SaleGenItem[];
  }

  const salesList: DailySale[] = [];
  const dailySaleCountMap: Record<string, number> = {};

  function addSale(dateStr: string, items: SaleGenItem[]) {
    const dateKey = dateStr.slice(0, 10).replace(/-/g, '');
    const count = (dailySaleCountMap[dateKey] || 0) + 1;
    dailySaleCountMap[dateKey] = count;
    const formattedSeq = String(count).padStart(3, '0');
    const invNumber = `INV-${dateKey}-${formattedSeq}`;
    salesList.push({
      invNumber,
      date: dateStr,
      items,
    });
  }

  // --- Semen Sales trajectory (Total 150 ZAK) ---
  addSale('2026-08-01 11:15:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 8 }]);
  addSale('2026-08-02 10:20:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 6 }]);
  addSale('2026-08-03 14:10:00', [{ product: pSemen, unitId: uZakId, qty: 7, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 7 }]);
  addSale('2026-08-04 15:45:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 5 }]);
  addSale('2026-08-05 13:00:00', [{ product: pSemen, unitId: uZakId, qty: 9, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 9 }]);
  addSale('2026-08-06 09:30:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 6 }]);
  addSale('2026-08-07 16:20:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 8 }]);
  addSale('2026-08-08 11:00:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 6 }]);
  addSale('2026-08-09 14:50:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 58000, baseQty: 5 }]);

  addSale('2026-08-10 10:15:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 6 }]);
  addSale('2026-08-11 11:30:00', [{ product: pSemen, unitId: uZakId, qty: 7, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 7 }]);
  addSale('2026-08-12 09:40:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 5 }]);
  addSale('2026-08-13 14:00:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 8 }]);
  addSale('2026-08-14 16:10:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 6 }]);
  addSale('2026-08-15 10:00:00', [{ product: pSemen, unitId: uZakId, qty: 15, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 15 }]);
  addSale('2026-08-16 13:20:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 4 }]);
  addSale('2026-08-17 15:10:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 3 }]);
  addSale('2026-08-18 11:45:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 4 }]);
  addSale('2026-08-19 14:30:00', [{ product: pSemen, unitId: uZakId, qty: 2, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 59000, baseQty: 2 }]);

  addSale('2026-08-20 11:00:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-21 14:15:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-22 10:30:00', [{ product: pSemen, unitId: uZakId, qty: 2, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 2 }]);
  addSale('2026-08-23 15:00:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-24 09:45:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-25 13:40:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-26 16:00:00', [{ product: pSemen, unitId: uZakId, qty: 2, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 2 }]);
  addSale('2026-08-27 11:20:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-28 14:10:00', [{ product: pSemen, unitId: uZakId, qty: 3, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 3 }]);
  addSale('2026-08-29 10:50:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 65000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 60000, baseQty: 5 }]);

  // --- Besi 10 Sales trajectory (Total 100 BATANG) ---
  addSale('2026-08-01 14:00:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 5 }]);
  addSale('2026-08-03 11:30:00', [{ product: pBesi, unitId: uBatangId, qty: 8, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 8 }]);
  addSale('2026-08-05 15:10:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 6 }]);
  addSale('2026-08-08 10:45:00', [{ product: pBesi, unitId: uBatangId, qty: 7, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 7 }]);
  addSale('2026-08-10 14:20:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 5 }]);
  addSale('2026-08-12 11:00:00', [{ product: pBesi, unitId: uBatangId, qty: 15, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 15 }]);
  addSale('2026-08-14 13:50:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 6 }]);
  addSale('2026-08-17 16:00:00', [{ product: pBesi, unitId: uBatangId, qty: 8, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 73000, baseQty: 8 }]);

  addSale('2026-08-20 13:30:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 5 }]);
  addSale('2026-08-22 14:00:00', [{ product: pBesi, unitId: uBatangId, qty: 4, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 4 }]);
  addSale('2026-08-24 10:15:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 6 }]);
  addSale('2026-08-26 15:40:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 5 }]);
  addSale('2026-08-28 11:10:00', [{ product: pBesi, unitId: uBatangId, qty: 10, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 10 }]);
  addSale('2026-08-29 14:20:00', [{ product: pBesi, unitId: uBatangId, qty: 10, priceAtSale: 85000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 75000, baseQty: 10 }]);

  // --- Pasir Cor Sales trajectory (Total 270 KARUNG / 9 KOL) ---
  addSale('2026-08-05 14:00:00', [{ product: pPasir, unitId: uKolId, qty: 2, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 60 }]);
  addSale('2026-08-08 13:20:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-11 15:10:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-15 11:40:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-19 10:30:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-22 16:00:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-26 14:15:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-29 11:20:00', [{ product: pPasir, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 25000, baseQty: 30 }]);

  // --- Split Sales trajectory (Total 270 KARUNG / 9 KOL) ---
  addSale('2026-08-02 13:00:00', [{ product: pSplit, unitId: uKolId, qty: 2, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 60 }]);
  addSale('2026-08-06 10:45:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-09 15:30:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-13 11:20:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-17 14:10:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-21 16:30:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-25 10:50:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);
  addSale('2026-08-28 15:00:00', [{ product: pSplit, unitId: uKolId, qty: 1, priceAtSale: 900000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 25000, baseQty: 30 }]);

  // --- Bata Ringan / Hebel 10 Sales trajectory (Total 830 PCS) ---
  const hebelDays = [
    { date: '2026-08-01 14:30:00', qty: 50 },
    { date: '2026-08-03 10:15:00', qty: 40 },
    { date: '2026-08-05 16:00:00', qty: 60 },
    { date: '2026-08-07 11:30:00', qty: 50 },
    { date: '2026-08-10 13:00:00', qty: 100 },
    { date: '2026-08-12 15:20:00', qty: 60 },
    { date: '2026-08-14 09:40:00', qty: 50 },
    { date: '2026-08-16 14:15:00', qty: 60 },
    { date: '2026-08-18 11:00:00', qty: 50 },
    { date: '2026-08-21 15:40:00', qty: 70 },
    { date: '2026-08-23 10:20:00', qty: 60 },
    { date: '2026-08-25 16:10:00', qty: 50 },
    { date: '2026-08-27 13:30:00', qty: 70 },
    { date: '2026-08-29 11:00:00', qty: 60 },
  ];

  hebelDays.forEach((h) => {
    addSale(h.date, [{ product: pHebel, unitId: uPcsId, qty: h.qty, priceAtSale: 8500, convFactor: 1, batchId: 'batch_b1_hbl', costPriceBase: 7228, baseQty: h.qty }]);
  });

  // --- Cat Aries 725 Sales trajectory (Total 76 GALON) ---
  const catDays = [
    { date: '2026-08-02 11:15:00', qty: 6 },
    { date: '2026-08-04 14:30:00', qty: 5 },
    { date: '2026-08-07 10:40:00', qty: 7 },
    { date: '2026-08-09 15:20:00', qty: 6 },
    { date: '2026-08-12 11:00:00', qty: 10 },
    { date: '2026-08-15 13:45:00', qty: 8 },
    { date: '2026-08-18 16:10:00', qty: 6 },
    { date: '2026-08-20 10:30:00', qty: 7 },
    { date: '2026-08-23 14:50:00', qty: 7 },
    { date: '2026-08-26 11:15:00', qty: 7 },
    { date: '2026-08-29 15:30:00', qty: 7 },
  ];

  catDays.forEach((c) => {
    addSale(c.date, [{ product: pCat, unitId: uGalonId, qty: c.qty, priceAtSale: 88000, convFactor: 1, batchId: 'batch_b1_cat', costPriceBase: 75000, baseQty: c.qty }]);
  });

  // --- Paku 5 Sales trajectory (Total 1300 quarter-kg = 325 KG) ---
  for (let i = 1; i <= 13; i++) {
    const day = String(i * 2).padStart(2, '0');
    const dateStr = `2026-08-${day} 16:45:00`;
    addSale(dateStr, [{ product: pPaku, unitId: uKgId, qty: 25, priceAtSale: 20000, convFactor: 4, batchId: 'batch_b1_pku', costPriceBase: 4000, baseQty: 100 }]);
  }

  // Build SQL Output
  const sqlLines: string[] = [];

  sqlLines.push(`-- ===================================================`);
  sqlLines.push(`-- DATABASE DUMP & SEED UNTUK SIMULASI PENGUJIAN POS`);
  sqlLines.push(`-- Berdasarkan dokumen: Simulasi Pengujian.md`);
  sqlLines.push(`-- ===================================================\n`);

  sqlLines.push(`SET statement_timeout = 0;`);
  sqlLines.push(`SET lock_timeout = 0;`);
  sqlLines.push(`SET client_encoding = 'UTF8';`);
  sqlLines.push(`SET standard_conforming_strings = on;`);
  sqlLines.push(`SELECT pg_catalog.set_config('search_path', '', false);\n`);

  // DDL Statements
  sqlLines.push(`-- ---------------------------------------------------`);
  sqlLines.push(`-- CREATE TABLES`);
  sqlLines.push(`-- ---------------------------------------------------\n`);

  sqlLines.push(`CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    CONSTRAINT "Category_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Category" OWNER TO user_pos;
CREATE UNIQUE INDEX "Category_name_key" ON public."Category"(name);\n`);

  sqlLines.push(`CREATE TABLE public."Unit" (
    id text NOT NULL,
    name text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    CONSTRAINT "Unit_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Unit" OWNER TO user_pos;
CREATE UNIQUE INDEX "Unit_name_key" ON public."Unit"(name);\n`);

  sqlLines.push(`CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "fullName" text NOT NULL,
    role text DEFAULT 'CASHIER'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."User" OWNER TO user_pos;
CREATE UNIQUE INDEX "User_username_key" ON public."User"(username);\n`);

  sqlLines.push(`CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    address text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Supplier" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."Product" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "categoryId" text NOT NULL,
    stock double precision DEFAULT 0 NOT NULL,
    "minStock" double precision DEFAULT 10 NOT NULL,
    "averageCost" numeric(65,30) DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "supplierId" text,
    "abcCategory" text,
    "leadTime" integer DEFAULT 3 NOT NULL,
    "holdingInterval" integer,
    "maxStock" double precision,
    "suggestedMin" double precision,
    "suggestedMax" double precision,
    "warehouseCapacity" double precision,
    "safetyStockDays" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Product" OWNER TO user_pos;
CREATE UNIQUE INDEX "Product_code_key" ON public."Product"(code);\n`);

  sqlLines.push(`CREATE TABLE public."ProductPrice" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "unitId" text NOT NULL,
    price numeric(65,30) NOT NULL,
    "conversionFactor" double precision NOT NULL,
    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."ProductPrice" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."Purchase" (
    id text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "supplierId" text NOT NULL,
    "totalAmount" numeric(65,30) NOT NULL,
    "paymentStatus" text NOT NULL,
    "paymentMethod" text DEFAULT 'TRANSFER'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Purchase" OWNER TO user_pos;
CREATE UNIQUE INDEX "Purchase_invoiceNumber_key" ON public."Purchase"("invoiceNumber");\n`);

  sqlLines.push(`CREATE TABLE public."PurchaseItem" (
    id text NOT NULL,
    "purchaseId" text NOT NULL,
    "productId" text NOT NULL,
    "unitId" text NOT NULL,
    quantity double precision NOT NULL,
    "costPrice" numeric(65,30) NOT NULL,
    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."PurchaseItem" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."StockBatch" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "purchaseItemId" text,
    "initialQuantity" double precision NOT NULL,
    "currentQuantity" double precision NOT NULL,
    "costPrice" numeric(65,30) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sellingPrice" numeric(65,30) DEFAULT 0 NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "unitId" text,
    "conversionFactor" double precision DEFAULT 1 NOT NULL,
    CONSTRAINT "StockBatch_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."StockBatch" OWNER TO user_pos;
CREATE UNIQUE INDEX "StockBatch_purchaseItemId_key" ON public."StockBatch"("purchaseItemId");\n`);

  sqlLines.push(`CREATE TABLE public."StockBatchPrice" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "unitId" text NOT NULL,
    price numeric(65,30) NOT NULL,
    CONSTRAINT "StockBatchPrice_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."StockBatchPrice" OWNER TO user_pos;
CREATE UNIQUE INDEX "StockBatchPrice_batchId_unitId_key" ON public."StockBatchPrice"("batchId", "unitId");\n`);

  sqlLines.push(`CREATE TABLE public."Sale" (
    id text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "totalAmount" numeric(65,30) NOT NULL,
    "paymentStatus" text NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "amountPaid" numeric(65,30),
    "changeAmount" numeric(65,30),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "userId" text,
    CONSTRAINT "Sale_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Sale" OWNER TO user_pos;
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON public."Sale"("invoiceNumber");\n`);

  sqlLines.push(`CREATE TABLE public."SaleItem" (
    id text NOT NULL,
    "saleId" text NOT NULL,
    "productId" text NOT NULL,
    "unitId" text NOT NULL,
    quantity double precision NOT NULL,
    "priceAtSale" numeric(65,30) NOT NULL,
    "isManualPrice" boolean DEFAULT false NOT NULL,
    "isBonus" boolean DEFAULT false NOT NULL,
    "conversionFactor" double precision DEFAULT 1 NOT NULL,
    CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."SaleItem" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."SaleItemBatch" (
    id text NOT NULL,
    "saleItemId" text NOT NULL,
    "batchId" text NOT NULL,
    quantity double precision NOT NULL,
    "costPrice" numeric(65,30) NOT NULL,
    CONSTRAINT "SaleItemBatch_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."SaleItemBatch" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."StockLog" (
    id text NOT NULL,
    "productId" text NOT NULL,
    type text NOT NULL,
    quantity double precision NOT NULL,
    "unitName" text,
    "unitQuantity" double precision,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "StockLog_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."StockLog" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."Cart" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."Cart" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."CartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "productId" text NOT NULL,
    "unitId" text,
    "batchId" text,
    price numeric(65,30),
    quantity double precision NOT NULL,
    "takenQuantity" double precision,
    "isBonus" boolean DEFAULT false NOT NULL,
    discount numeric(65,30) DEFAULT 0,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."CartItem" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."AuditLogs" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text NOT NULL,
    details text,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."AuditLogs" OWNER TO user_pos;\n`);

  sqlLines.push(`CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    data bytea NOT NULL,
    "mimeType" text NOT NULL,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."ProductImage" OWNER TO user_pos;\n`);

  // Foreign Keys
  sqlLines.push(`-- Foreign Keys --`);
  sqlLines.push(`ALTER TABLE ONLY public."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;`);
  sqlLines.push(`ALTER TABLE ONLY public."ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."ProductPrice" ADD CONSTRAINT "ProductPrice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."PurchaseItem" ADD CONSTRAINT "PurchaseItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockBatch" ADD CONSTRAINT "StockBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockBatch" ADD CONSTRAINT "StockBatch_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES public."PurchaseItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockBatch" ADD CONSTRAINT "StockBatch_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE SET NULL;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockBatchPrice" ADD CONSTRAINT "StockBatchPrice_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."StockBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockBatchPrice" ADD CONSTRAINT "StockBatchPrice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;`);
  sqlLines.push(`ALTER TABLE ONLY public."SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."SaleItem" ADD CONSTRAINT "SaleItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."SaleItemBatch" ADD CONSTRAINT "SaleItemBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."StockBatch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;`);
  sqlLines.push(`ALTER TABLE ONLY public."SaleItemBatch" ADD CONSTRAINT "SaleItemBatch_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES public."SaleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."StockLog" ADD CONSTRAINT "StockLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
  sqlLines.push(`ALTER TABLE ONLY public."AuditLogs" ADD CONSTRAINT "AuditLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;\n`);

  // DML Statements
  sqlLines.push(`-- ---------------------------------------------------`);
  sqlLines.push(`-- INSERT SEED DATA`);
  sqlLines.push(`-- ---------------------------------------------------\n`);

  // Users
  sqlLines.push(`INSERT INTO public."User" (id, username, password, "fullName", role, "isActive", "createdAt", "updatedAt") VALUES`);
  sqlLines.push(`('${userIdAdmin}', 'admin', '${adminPasswordHash}', 'Administrator', 'ADMIN', true, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),`);
  sqlLines.push(`('${userIdManager}', 'manager', '${managerPasswordHash}', 'Manager Toko', 'MANAGER', true, '2026-08-01 00:00:00', '2026-08-01 00:00:00'),`);
  sqlLines.push(`('${userIdKasir}', 'kasir', '${passwordHash}', 'Kasir Toko', 'CASHIER', true, '2026-08-01 00:00:00', '2026-08-01 00:00:00');\n`);

  // Supplier
  sqlLines.push(`INSERT INTO public."Supplier" (id, name, contact, phone, address, email, "createdAt", "updatedAt") VALUES`);
  sqlLines.push(`('${supplierId}', 'Distributor Utama Material', 'Budi Santoso', '08123456789', 'Jl. Material Raya No. 45', 'distributor@material.com', '2026-08-01 00:00:00', '2026-08-01 00:00:00');\n`);

  // Categories
  sqlLines.push(`INSERT INTO public."Category" (id, name) VALUES`);
  sqlLines.push(`('${catSemenId}', 'Semen & Adukan'),`);
  sqlLines.push(`('${catBesiId}', 'Besi & Logam'),`);
  sqlLines.push(`('${catPasirId}', 'Pasir & Batu'),`);
  sqlLines.push(`('${catBataId}', 'Bata & Hebel'),`);
  sqlLines.push(`('${catCatId}', 'Cat & Finishing'),`);
  sqlLines.push(`('${catPakuId}', 'Paku & Pengikat');\n`);

  // Units
  sqlLines.push(`INSERT INTO public."Unit" (id, name) VALUES`);
  sqlLines.push(`('${uZakId}', 'ZAK'),`);
  sqlLines.push(`('${uBatangId}', 'BATANG'),`);
  sqlLines.push(`('${uTrukId}', 'TRUK'),`);
  sqlLines.push(`('${uKolId}', 'KOL'),`);
  sqlLines.push(`('${uKarungId}', 'KARUNG'),`);
  sqlLines.push(`('${uPcsId}', 'PCS'),`);
  sqlLines.push(`('${uKubikId}', 'KUBIK'),`);
  sqlLines.push(`('${uGalonId}', 'GALON'),`);
  sqlLines.push(`('${uBoxId}', 'BOX'),`);
  sqlLines.push(`('${uKgId}', 'KG'),`);
  sqlLines.push(`('${uQuarterKgId}', '1/4 KG');\n`);

  // Products
  sqlLines.push(`INSERT INTO public."Product" (id, code, name, description, "categoryId", stock, "minStock", "averageCost", "supplierId", "abcCategory", "leadTime", "maxStock", "suggestedMin", "suggestedMax", "warehouseCapacity", "safetyStockDays") VALUES`);
  products.forEach((p, idx) => {
    const isLast = idx === products.length - 1;
    sqlLines.push(`('${p.id}', '${p.code}', '${p.name}', '${p.description}', '${p.categoryId}', ${p.stock}, ${p.minStock}, ${p.averageCost}, '${p.supplierId}', '${p.abcCategory}', ${p.leadTime}, ${p.maxStock}, ${p.suggestedMin}, ${p.suggestedMax}, ${p.warehouseCapacity}, ${p.safetyStockDays})${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  // Product Prices
  sqlLines.push(`INSERT INTO public."ProductPrice" (id, "productId", "unitId", price, "conversionFactor") VALUES`);
  prices.forEach((pp, idx) => {
    const isLast = idx === prices.length - 1;
    sqlLines.push(`('${pp.id}', '${pp.productId}', '${pp.unitId}', ${pp.price}, ${pp.convFactor})${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  // Purchases & Purchase Items & Stock Batches
  sqlLines.push(`INSERT INTO public."Purchase" (id, "invoiceNumber", "supplierId", "totalAmount", "paymentStatus", "paymentMethod", "createdAt", "updatedAt") VALUES`);
  purchasesData.forEach((p, idx) => {
    const isLast = idx === purchasesData.length - 1;
    const totalAmount = p.qty * p.costPrice;
    sqlLines.push(`('${p.id}', '${p.inv}', '${supplierId}', ${totalAmount}, 'PAID', 'TRANSFER', '${p.date}', '${p.date}')${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  sqlLines.push(`INSERT INTO public."PurchaseItem" (id, "purchaseId", "productId", "unitId", quantity, "costPrice") VALUES`);
  purchasesData.forEach((p, idx) => {
    const isLast = idx === purchasesData.length - 1;
    const piId = `pi_${p.id}`;
    sqlLines.push(`('${piId}', '${p.id}', '${p.product.id}', '${p.unitId}', ${p.qty}, ${p.costPrice})${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  // IMPORTANT FIX: StockBatch stores costPrice AND sellingPrice PER BASE UNIT!
  // initialQuantity and currentQuantity are in BASE UNITS!
  // unitId is set to baseUnitId, conversionFactor = 1.
  sqlLines.push(`INSERT INTO public."StockBatch" (id, "productId", "purchaseItemId", "initialQuantity", "currentQuantity", "costPrice", "sellingPrice", "createdAt", "updatedAt", "unitId", "conversionFactor") VALUES`);
  purchasesData.forEach((p, idx) => {
    const isLast = idx === purchasesData.length - 1;
    const piId = `pi_${p.id}`;
    const initialQtyBase = p.baseQty || (p.qty * p.convFactor);
    const currQtyBase = batchRemainingQty[p.batchId] ?? 0;
    const costPriceBase = p.costPriceBase || p.costPrice;
    const sellingPriceBase = p.sellingPriceBase || p.sellingPrice;
    sqlLines.push(`('${p.batchId}', '${p.product.id}', '${piId}', ${initialQtyBase}, ${currQtyBase}, ${costPriceBase}, ${sellingPriceBase}, '${p.date}', '${p.date}', '${p.product.baseUnitId}', 1)${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  // StockBatchPrice - Populate all ProductPrices for each batch
  sqlLines.push(`INSERT INTO public."StockBatchPrice" (id, "batchId", "unitId", price) VALUES`);
  const batchPrices: { id: string; batchId: string; unitId: string; price: number }[] = [];
  purchasesData.forEach((p) => {
    const productPrices = prices.filter(pr => pr.productId === p.product.id);
    productPrices.forEach((pr) => {
      batchPrices.push({
        id: `sbp_${p.batchId}_${pr.unitId}`,
        batchId: p.batchId,
        unitId: pr.unitId,
        price: pr.price,
      });
    });
  });

  batchPrices.forEach((bp, idx) => {
    const isLast = idx === batchPrices.length - 1;
    sqlLines.push(`('${bp.id}', '${bp.batchId}', '${bp.unitId}', ${bp.price})${isLast ? ';' : ','}`);
  });
  sqlLines.push('');

  // Sales, SaleItems, SaleItemBatches, StockLogs
  const saleSqlRows: string[] = [];
  const saleItemSqlRows: string[] = [];
  const saleItemBatchSqlRows: string[] = [];
  const stockLogSqlRows: string[] = [];

  const unitNameMap: Record<string, string> = {
    [uZakId]: 'ZAK',
    [uBatangId]: 'BATANG',
    [uTrukId]: 'TRUK',
    [uKolId]: 'KOL',
    [uKarungId]: 'KARUNG',
    [uPcsId]: 'PCS',
    [uKubikId]: 'KUBIK',
    [uGalonId]: 'GALON',
    [uBoxId]: 'BOX',
    [uKgId]: 'KG',
    [uQuarterKgId]: '1/4 KG',
  };

  purchasesData.forEach((p) => {
    const baseQty = p.baseQty || (p.qty * p.convFactor);
    const unitName = unitNameMap[p.unitId] || p.unitId;
    stockLogSqlRows.push(`('${makeId('log')}', '${p.product.id}', 'IN', ${baseQty}, '${unitName}', ${p.qty}, 'Pembelian ${p.batchCode} (${p.inv})', '${p.date}')`);
  });

  salesList.forEach((s) => {
    const saleId = makeId('sale');
    let totalSaleAmount = 0;

    s.items.forEach((item) => {
      totalSaleAmount += item.qty * item.priceAtSale;
    });

    saleSqlRows.push(`('${saleId}', '${s.invNumber}', ${totalSaleAmount}, 'PAID', 'TUNAI', ${totalSaleAmount}, 0, '${s.date}', '${userIdKasir}')`);

    s.items.forEach((item) => {
      const saleItemId = makeId('sitem');
      saleItemSqlRows.push(`('${saleItemId}', '${saleId}', '${item.product.id}', '${item.unitId}', ${item.qty}, ${item.priceAtSale}, false, false, ${item.convFactor})`);

      const saleItemBatchId = makeId('sibatch');
      saleItemBatchSqlRows.push(`('${saleItemBatchId}', '${saleItemId}', '${item.batchId}', ${item.baseQty}, ${item.costPriceBase})`);

      const unitName = unitNameMap[item.unitId] || item.unitId;
      stockLogSqlRows.push(`('${makeId('log')}', '${item.product.id}', 'OUT', ${item.baseQty}, '${unitName}', ${item.qty}, 'Penjualan Nota ${s.invNumber}', '${s.date}')`);
    });
  });

  sqlLines.push(`INSERT INTO public."Sale" (id, "invoiceNumber", "totalAmount", "paymentStatus", "paymentMethod", "amountPaid", "changeAmount", "createdAt", "userId") VALUES`);
  saleSqlRows.forEach((r, idx) => {
    sqlLines.push(`${r}${idx === saleSqlRows.length - 1 ? ';' : ','}`);
  });
  sqlLines.push('');

  sqlLines.push(`INSERT INTO public."SaleItem" (id, "saleId", "productId", "unitId", quantity, "priceAtSale", "isManualPrice", "isBonus", "conversionFactor") VALUES`);
  saleItemSqlRows.forEach((r, idx) => {
    sqlLines.push(`${r}${idx === saleItemSqlRows.length - 1 ? ';' : ','}`);
  });
  sqlLines.push('');

  sqlLines.push(`INSERT INTO public."SaleItemBatch" (id, "saleItemId", "batchId", quantity, "costPrice") VALUES`);
  saleItemBatchSqlRows.forEach((r, idx) => {
    sqlLines.push(`${r}${idx === saleItemBatchSqlRows.length - 1 ? ';' : ','}`);
  });
  sqlLines.push('');

  sqlLines.push(`INSERT INTO public."StockLog" (id, "productId", type, quantity, "unitName", "unitQuantity", reason, "createdAt") VALUES`);
  stockLogSqlRows.forEach((r, idx) => {
    sqlLines.push(`${r}${idx === stockLogSqlRows.length - 1 ? ';' : ','}`);
  });
  sqlLines.push('');

  sqlLines.push(`-- Selesai restore data simulasi.\n`);

  const sqlContent = sqlLines.join('\n');
  const outputPath = path.resolve(process.cwd(), 'simulasi_pengujian.sql');
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');

  console.log(`Successfully written SQL script to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`Total Sales Invoices generated: ${salesList.length}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
