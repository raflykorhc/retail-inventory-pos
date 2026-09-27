import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

let idCounter = 1000;
function makeId(prefix: string): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

async function generate() {
  console.log('Generating simulation SQL script and seeding database with updated pricing & conversions...');

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

  // Products (Updated with new modal, selling prices, and conversions)
  // Products (Updated with new modal, selling prices, and conversions)
  const pSemen = {
    id: 'prod_semen_01',
    code: 'BRG-SEM-001',
    name: 'SEMEN GARUDA 40KG',
    description: 'Semen PCC Garuda Kemasan 40 KG',
    categoryId: catSemenId,
    stock: 60, // 300 bought - 240 sold
    minStock: 64,
    maxStock: 176,
    averageCost: 43000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 4,
    safetyStockDays: 4,
    warehouseCapacity: 250,
    suggestedMin: 64,
    suggestedMax: 176,
    baseUnitId: uZakId,
  };

  const pBesi = {
    id: 'prod_besi_01',
    code: 'BRG-BSI-001',
    name: 'Besi 10MM Uril',
    description: 'Besi Beton Polos/Uril Diameter 10 mm Panjang 12m',
    categoryId: catBesiId,
    stock: 20, // 120 bought - 100 sold
    minStock: 20,
    maxStock: 67,
    averageCost: 52500,
    supplierId: supplierId,
    abcCategory: 'B',
    leadTime: 5,
    safetyStockDays: 1,
    warehouseCapacity: 100,
    suggestedMin: 20,
    suggestedMax: 67,
    baseUnitId: uBatangId,
  };

  const pPasir = {
    id: 'prod_pasir_01',
    code: 'BRG-PSR-001',
    name: 'Pasir Cor',
    description: 'Pasir Cor Kualitas Tinggi Bulk / Karung',
    categoryId: catPasirId,
    stock: 540, // 1800 bought - 1260 sold
    minStock: 126,
    maxStock: 714,
    averageCost: 7222.22,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 2,
    safetyStockDays: 1,
    warehouseCapacity: 800,
    suggestedMin: 126,
    suggestedMax: 714,
    baseUnitId: uKarungId,
  };

  const pSplit = {
    id: 'prod_split_01',
    code: 'BRG-SPL-001',
    name: 'Split',
    description: 'Batu Split Batu Pecah 2/3 Karung',
    categoryId: catPasirId,
    stock: 270, // 900 bought - 630 sold
    minStock: 63,
    maxStock: 300, // clamped from 357 to capacity 300
    averageCost: 10555.56,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 2,
    safetyStockDays: 1,
    warehouseCapacity: 300,
    suggestedMin: 63,
    suggestedMax: 300,
    baseUnitId: uKarungId,
  };

  const pHebel = {
    id: 'prod_hebel_01',
    code: 'BRG-HBL-001',
    name: 'Bata Ringan / Hebel 10',
    description: 'Bata Ringan AAC Ketebalan 10 cm',
    categoryId: catBataId,
    stock: 425, // 2550 bought (30 kubik x 85) - 2125 sold (25 kubik x 85)
    minStock: 355,
    maxStock: 1347,
    averageCost: 6000,
    supplierId: supplierId,
    abcCategory: 'A',
    leadTime: 4,
    safetyStockDays: 1,
    warehouseCapacity: 1500,
    suggestedMin: 355,
    suggestedMax: 1347,
    baseUnitId: uPcsId,
  };

  const pCat = {
    id: 'prod_cat_01',
    code: 'BRG-CAT-001',
    name: 'Cat Aries 725 Putih Salju',
    description: 'Cat Tembok Aries 725 Putih Salju 5 KG Galon',
    categoryId: catCatId,
    stock: 10, // 40 bought - 30 sold
    minStock: 0,
    maxStock: 0,
    averageCost: 83000,
    supplierId: supplierId,
    abcCategory: 'C',
    leadTime: 7,
    safetyStockDays: 1,
    warehouseCapacity: 80,
    suggestedMin: 0,
    suggestedMax: 0,
    baseUnitId: uGalonId,
  };

  const pPaku = {
    id: 'prod_paku_01',
    code: 'BRG-PKU-001',
    name: 'Paku 5',
    description: 'Paku Kayu Ukuran 5 cm (2 inchi)',
    categoryId: catPakuId,
    stock: 200, // 1000 bought - 800 sold
    minStock: 107,
    maxStock: 481,
    averageCost: 3600,
    supplierId: supplierId,
    abcCategory: 'B',
    leadTime: 3,
    safetyStockDays: 1,
    warehouseCapacity: 600,
    suggestedMin: 107,
    suggestedMax: 481,
    baseUnitId: uQuarterKgId,
  };

  const products = [pSemen, pBesi, pPasir, pSplit, pHebel, pCat, pPaku];

  // Product Prices (Table 4.1 multi-unit conversions)
  const prices: { id: string; productId: string; unitId: string; price: number; convFactor: number }[] = [
    // Semen Garuda 40KG
    { id: 'pp_sem_1', productId: pSemen.id, unitId: uZakId, price: 45000, convFactor: 1 },

    // Besi 10MM Uril
    { id: 'pp_bsi_1', productId: pBesi.id, unitId: uBatangId, price: 72000, convFactor: 1 },

    // Pasir Cor (Karung base, 1 Kol = 30 karung, 1 Truk = 360 karung)
    { id: 'pp_psr_1', productId: pPasir.id, unitId: uKarungId, price: 30000, convFactor: 1 },
    { id: 'pp_psr_2', productId: pPasir.id, unitId: uKolId, price: 450000, convFactor: 30 },
    { id: 'pp_psr_3', productId: pPasir.id, unitId: uTrukId, price: 3500000, convFactor: 360 },

    // Split (Karung base, 1 Kol = 30 karung, 1 Truk = 360 karung)
    { id: 'pp_spl_1', productId: pSplit.id, unitId: uKarungId, price: 30000, convFactor: 1 },
    { id: 'pp_spl_2', productId: pSplit.id, unitId: uKolId, price: 550000, convFactor: 30 },
    { id: 'pp_spl_3', productId: pSplit.id, unitId: uTrukId, price: 4500000, convFactor: 360 },

    // Hebel (PCS base, 1 Kubik = 85 pcs)
    { id: 'pp_hbl_1', productId: pHebel.id, unitId: uPcsId, price: 8000, convFactor: 1 },
    { id: 'pp_hbl_2', productId: pHebel.id, unitId: uKubikId, price: 650000, convFactor: 85 },

    // Cat Aries (Galon base)
    { id: 'pp_cat_1', productId: pCat.id, unitId: uGalonId, price: 90000, convFactor: 1 },

    // Paku 5 (1/4 KG base, 1 KG = 4, 1 BOX = 100)
    { id: 'pp_pku_1', productId: pPaku.id, unitId: uQuarterKgId, price: 4500, convFactor: 1 },
    { id: 'pp_pku_2', productId: pPaku.id, unitId: uKgId, price: 18000, convFactor: 4 },
    { id: 'pp_pku_3', productId: pPaku.id, unitId: uBoxId, price: 450000, convFactor: 100 },
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
      qty: 100,
      costPrice: 42000,
      sellingPrice: 45000,
      convFactor: 1,
      batchId: 'batch_b1_sem',
      baseQty: 100,
      costPriceBase: 42000,
      sellingPriceBase: 45000,
    },
    {
      id: 'purch_02',
      inv: 'PO/20260801/0002',
      date: '2026-08-01 08:30:00',
      batchCode: 'B1-BSI',
      product: pBesi,
      unitId: uBatangId,
      qty: 60,
      costPrice: 52000,
      sellingPrice: 72000,
      convFactor: 1,
      batchId: 'batch_b1_bsi',
      baseQty: 60,
      costPriceBase: 52000,
      sellingPriceBase: 72000,
    },
    {
      id: 'purch_03',
      inv: 'PO/20260801/0003',
      date: '2026-08-01 09:00:00',
      batchCode: 'B1-SPL',
      product: pSplit,
      unitId: uTrukId,
      qty: 2.5,
      costPrice: 3800000,
      sellingPrice: 4500000,
      convFactor: 360,
      batchId: 'batch_b1_spl',
      baseQty: 900,
      costPriceBase: 10555.56,
      sellingPriceBase: 30000,
    },
    {
      id: 'purch_04',
      inv: 'PO/20260801/0004',
      date: '2026-08-01 09:30:00',
      batchCode: 'B1-HBL',
      product: pHebel,
      unitId: uKubikId,
      qty: 30,
      costPrice: 510000,
      sellingPrice: 650000,
      convFactor: 85,
      batchId: 'batch_b1_hbl',
      baseQty: 2550,
      costPriceBase: 6000,
      sellingPriceBase: 8000,
    },
    {
      id: 'purch_05',
      inv: 'PO/20260801/0005',
      date: '2026-08-01 10:00:00',
      batchCode: 'B1-CAT',
      product: pCat,
      unitId: uGalonId,
      qty: 40,
      costPrice: 83000,
      sellingPrice: 90000,
      convFactor: 1,
      batchId: 'batch_b1_cat',
      baseQty: 40,
      costPriceBase: 83000,
      sellingPriceBase: 90000,
    },
    {
      id: 'purch_06',
      inv: 'PO/20260801/0006',
      date: '2026-08-01 10:30:00',
      batchCode: 'B1-PKU',
      product: pPaku,
      unitId: uBoxId,
      qty: 10,
      costPrice: 360000,
      sellingPrice: 450000,
      convFactor: 100,
      batchId: 'batch_b1_pku',
      baseQty: 1000,
      costPriceBase: 3600,
      sellingPriceBase: 4500,
    },
    {
      id: 'purch_07',
      inv: 'PO/20260801/0007',
      date: '2026-08-01 11:00:00',
      batchCode: 'B1-PSR',
      product: pPasir,
      unitId: uTrukId,
      qty: 5,
      costPrice: 2600000,
      sellingPrice: 3500000,
      convFactor: 360,
      batchId: 'batch_b1_psr',
      baseQty: 1800,
      costPriceBase: 7222.22,
      sellingPriceBase: 30000,
    },
    {
      id: 'purch_08',
      inv: 'PO/20260810/0001',
      date: '2026-08-10 08:00:00',
      batchCode: 'B2-SEM',
      product: pSemen,
      unitId: uZakId,
      qty: 100,
      costPrice: 43000,
      sellingPrice: 45000,
      convFactor: 1,
      batchId: 'batch_b2_sem',
      baseQty: 100,
      costPriceBase: 43000,
      sellingPriceBase: 45000,
    },
    {
      id: 'purch_09',
      inv: 'PO/20260820/0001',
      date: '2026-08-20 08:00:00',
      batchCode: 'B3-SEM',
      product: pSemen,
      unitId: uZakId,
      qty: 100,
      costPrice: 44000,
      sellingPrice: 45000,
      convFactor: 1,
      batchId: 'batch_b3_sem',
      baseQty: 100,
      costPriceBase: 44000,
      sellingPriceBase: 45000,
    },
    {
      id: 'purch_10',
      inv: 'PO/20260820/0002',
      date: '2026-08-20 08:30:00',
      batchCode: 'B2-BSI',
      product: pBesi,
      unitId: uBatangId,
      qty: 60,
      costPrice: 53000,
      sellingPrice: 72000,
      convFactor: 1,
      batchId: 'batch_b2_bsi',
      baseQty: 60,
      costPriceBase: 53000,
      sellingPriceBase: 72000,
    },
  ];

  // Map remaining quantities after all sales
  const batchRemainingQty: Record<string, number> = {
    'batch_b1_sem': 0,
    'batch_b2_sem': 0,
    'batch_b3_sem': 60,
    'batch_b1_bsi': 0,
    'batch_b2_bsi': 20,
    'batch_b1_psr': 540,
    'batch_b1_spl': 270,
    'batch_b1_hbl': 425,
    'batch_b1_cat': 10,
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

  // --- Semen Garuda 40KG Sales trajectory (Total 240 ZAK) ---
  // Batch 1 (100 ZAK bought): 60 sold before Aug 10, 40 sold on Aug 10.
  addSale('2026-08-01 11:15:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 8 }]);
  addSale('2026-08-02 10:20:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 6 }]);
  addSale('2026-08-03 14:10:00', [{ product: pSemen, unitId: uZakId, qty: 7, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 7 }]);
  addSale('2026-08-04 15:45:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 5 }]);
  addSale('2026-08-05 13:00:00', [{ product: pSemen, unitId: uZakId, qty: 9, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 9 }]);
  addSale('2026-08-06 09:30:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 6 }]);
  addSale('2026-08-07 16:20:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 8 }]);
  addSale('2026-08-08 11:00:00', [{ product: pSemen, unitId: uZakId, qty: 6, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 6 }]);
  addSale('2026-08-09 14:50:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 5 }]);

  // Aug 10: FIFO Test sale (50 ZAK: 40 from Batch 1, 10 from Batch 2)
  addSale('2026-08-10 10:15:00', [
    { product: pSemen, unitId: uZakId, qty: 40, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b1_sem', costPriceBase: 42000, baseQty: 40 },
    { product: pSemen, unitId: uZakId, qty: 10, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 10 },
  ]);

  // Batch 2 (100 ZAK bought, 10 sold on Aug 10, 90 sold Aug 11-19)
  addSale('2026-08-11 11:30:00', [{ product: pSemen, unitId: uZakId, qty: 12, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 12 }]);
  addSale('2026-08-12 09:40:00', [{ product: pSemen, unitId: uZakId, qty: 10, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 10 }]);
  addSale('2026-08-13 14:00:00', [{ product: pSemen, unitId: uZakId, qty: 15, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 15 }]);
  addSale('2026-08-14 16:10:00', [{ product: pSemen, unitId: uZakId, qty: 10, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 10 }]);
  addSale('2026-08-15 10:00:00', [{ product: pSemen, unitId: uZakId, qty: 15, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 15 }]);
  addSale('2026-08-16 13:20:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 8 }]);
  addSale('2026-08-17 15:10:00', [{ product: pSemen, unitId: uZakId, qty: 7, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 7 }]);
  addSale('2026-08-18 11:45:00', [{ product: pSemen, unitId: uZakId, qty: 8, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 8 }]);
  addSale('2026-08-19 14:30:00', [{ product: pSemen, unitId: uZakId, qty: 5, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b2_sem', costPriceBase: 43000, baseQty: 5 }]);

  // Batch 3 (100 ZAK bought, 40 sold Aug 20-29, 60 remaining)
  addSale('2026-08-20 11:00:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-21 14:15:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-22 10:30:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-23 15:00:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-24 09:45:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-25 13:40:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-26 16:00:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-27 11:20:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-28 14:10:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);
  addSale('2026-08-29 10:50:00', [{ product: pSemen, unitId: uZakId, qty: 4, priceAtSale: 45000, convFactor: 1, batchId: 'batch_b3_sem', costPriceBase: 44000, baseQty: 4 }]);

  // --- Besi 10MM Uril Sales trajectory (Total 100 BATANG) ---
  addSale('2026-08-01 14:00:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 5 }]);
  addSale('2026-08-03 11:30:00', [{ product: pBesi, unitId: uBatangId, qty: 8, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 8 }]);
  addSale('2026-08-05 15:10:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 6 }]);
  addSale('2026-08-08 10:45:00', [{ product: pBesi, unitId: uBatangId, qty: 7, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 7 }]);
  addSale('2026-08-10 14:20:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 5 }]);
  addSale('2026-08-12 11:00:00', [{ product: pBesi, unitId: uBatangId, qty: 15, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 15 }]);
  addSale('2026-08-14 13:50:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 6 }]);
  addSale('2026-08-17 16:00:00', [{ product: pBesi, unitId: uBatangId, qty: 8, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b1_bsi', costPriceBase: 52000, baseQty: 8 }]);

  addSale('2026-08-20 13:30:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 5 }]);
  addSale('2026-08-22 14:00:00', [{ product: pBesi, unitId: uBatangId, qty: 4, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 4 }]);
  addSale('2026-08-24 10:15:00', [{ product: pBesi, unitId: uBatangId, qty: 6, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 6 }]);
  addSale('2026-08-26 15:40:00', [{ product: pBesi, unitId: uBatangId, qty: 5, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 5 }]);
  addSale('2026-08-28 11:10:00', [{ product: pBesi, unitId: uBatangId, qty: 10, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 10 }]);
  addSale('2026-08-29 14:20:00', [{ product: pBesi, unitId: uBatangId, qty: 10, priceAtSale: 72000, convFactor: 1, batchId: 'batch_b2_bsi', costPriceBase: 53000, baseQty: 10 }]);

  // --- Pasir Cor Sales trajectory (Total 1.260 KARUNG = 42 KOL @ 30 karung) ---
  const pasirDays = [
    '2026-08-03 14:00:00', '2026-08-05 14:00:00', '2026-08-07 13:20:00', '2026-08-09 15:10:00',
    '2026-08-11 11:40:00', '2026-08-13 10:30:00', '2026-08-15 16:00:00', '2026-08-17 14:15:00',
    '2026-08-19 11:20:00', '2026-08-21 14:00:00', '2026-08-23 13:40:00', '2026-08-25 15:10:00',
    '2026-08-27 10:50:00', '2026-08-29 14:30:00',
  ];
  pasirDays.forEach((d) => {
    addSale(d, [{ product: pPasir, unitId: uKolId, qty: 3, priceAtSale: 450000, convFactor: 30, batchId: 'batch_b1_psr', costPriceBase: 7222.22, baseQty: 90 }]);
  });

  // --- Split Sales trajectory (Total 630 KARUNG = 21 KOL @ 30 karung) ---
  const splitDays = [
    '2026-08-02 13:00:00', '2026-08-06 10:45:00', '2026-08-10 15:30:00',
    '2026-08-14 11:20:00', '2026-08-18 14:10:00', '2026-08-22 16:30:00',
    '2026-08-27 15:00:00',
  ];
  splitDays.forEach((d) => {
    addSale(d, [{ product: pSplit, unitId: uKolId, qty: 3, priceAtSale: 550000, convFactor: 30, batchId: 'batch_b1_spl', costPriceBase: 10555.56, baseQty: 90 }]);
  });

  // --- Bata Ringan / Hebel 10 Sales trajectory (Total 2.125 PCS = 25 KUBIK @ 85 pcs) ---
  const hebelDays = [
    { date: '2026-08-01 14:30:00', qty: 140 },
    { date: '2026-08-03 10:15:00', qty: 135 },
    { date: '2026-08-05 16:00:00', qty: 150 },
    { date: '2026-08-07 11:30:00', qty: 140 },
    { date: '2026-08-09 13:00:00', qty: 140 },
    { date: '2026-08-11 15:20:00', qty: 150 },
    { date: '2026-08-13 09:40:00', qty: 140 },
    { date: '2026-08-15 14:15:00', qty: 150 },
    { date: '2026-08-17 11:00:00', qty: 130 },
    { date: '2026-08-19 15:40:00', qty: 140 },
    { date: '2026-08-21 10:20:00', qty: 150 },
    { date: '2026-08-23 16:10:00', qty: 140 },
    { date: '2026-08-25 13:30:00', qty: 130 },
    { date: '2026-08-27 11:00:00', qty: 140 },
    { date: '2026-08-29 15:30:00', qty: 150 },
  ];
  hebelDays.forEach((h) => {
    addSale(h.date, [{ product: pHebel, unitId: uPcsId, qty: h.qty, priceAtSale: 8000, convFactor: 1, batchId: 'batch_b1_hbl', costPriceBase: 6000, baseQty: h.qty }]);
  });

  // --- Cat Aries 725 Sales trajectory (Total 30 GALON) ---
  const catDays = [
    { date: '2026-08-04 14:30:00', qty: 5 },
    { date: '2026-08-09 15:20:00', qty: 5 },
    { date: '2026-08-14 11:00:00', qty: 5 },
    { date: '2026-08-19 16:10:00', qty: 5 },
    { date: '2026-08-24 10:30:00', qty: 5 },
    { date: '2026-08-29 15:30:00', qty: 5 },
  ];
  catDays.forEach((c) => {
    addSale(c.date, [{ product: pCat, unitId: uGalonId, qty: c.qty, priceAtSale: 90000, convFactor: 1, batchId: 'batch_b1_cat', costPriceBase: 83000, baseQty: c.qty }]);
  });

  // --- Paku 5 Sales trajectory (Total 800 quarter-kg = 200 KG = 8 BOX) ---
  const pakuDays = [
    '2026-08-03 16:45:00', '2026-08-07 16:45:00', '2026-08-11 16:45:00', '2026-08-15 16:45:00',
    '2026-08-19 16:45:00', '2026-08-23 16:45:00', '2026-08-26 16:45:00', '2026-08-29 16:45:00',
  ];
  pakuDays.forEach((d) => {
    addSale(d, [{ product: pPaku, unitId: uKgId, qty: 25, priceAtSale: 18000, convFactor: 4, batchId: 'batch_b1_pku', costPriceBase: 3600, baseQty: 100 }]);
  });

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
    "sellingPrice" numeric(65,30) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "unitId" text,
    "conversionFactor" double precision DEFAULT 1 NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
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

  // Foreign keys
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
  const outputFiles = [
    path.resolve(process.cwd(), 'simulasi_pengujian.sql'),
    path.resolve(process.cwd(), 'prisma', 'simulasi_pengujian.sql'),
    path.resolve(process.cwd(), 'docs', 'simulasi_pengujian.sql'),
  ];

  for (const f of outputFiles) {
    fs.writeFileSync(f, sqlContent, 'utf-8');
    console.log(`Successfully written SQL script to: ${f} (${(fs.statSync(f).size / 1024).toFixed(2)} KB)`);
  }

  console.log(`Total Sales Invoices generated: ${salesList.length}`);

  // Seeding directly to PostgreSQL database via Prisma
  console.log('\n--- SEEDING DIRECTLY TO ACTIVE DATABASE VIA PRISMA ---');
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      console.log('1. Clearing existing transactions and products...');
      await tx.saleItemBatch.deleteMany();
      await tx.saleItem.deleteMany();
      await tx.sale.deleteMany();
      await tx.stockLog.deleteMany();
      await tx.stockBatchPrice.deleteMany();
      await tx.stockBatch.deleteMany();
      await tx.purchaseItem.deleteMany();
      await tx.purchase.deleteMany();
      await tx.cartItem.deleteMany();
      await tx.cart.deleteMany();
      await tx.productPrice.deleteMany();
      await tx.productImage.deleteMany();
      await tx.product.deleteMany();

      console.log('2. Inserting products...');
      for (const p of products) {
        await tx.product.create({
          data: {
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            categoryId: p.categoryId,
            stock: p.stock,
            minStock: p.minStock,
            averageCost: p.averageCost,
            supplierId: p.supplierId,
            abcCategory: p.abcCategory,
            leadTime: p.leadTime,
            maxStock: p.maxStock,
            suggestedMin: p.suggestedMin,
            suggestedMax: p.suggestedMax,
            warehouseCapacity: p.warehouseCapacity,
            safetyStockDays: p.safetyStockDays,
          },
        });
      }

      console.log('3. Inserting product prices...');
      for (const pp of prices) {
        await tx.productPrice.create({
          data: {
            id: pp.id,
            productId: pp.productId,
            unitId: pp.unitId,
            price: pp.price,
            conversionFactor: pp.convFactor,
          },
        });
      }

      console.log('4. Inserting purchases & batches...');
      for (const p of purchasesData) {
        const totalAmount = p.qty * p.costPrice;
        await tx.purchase.create({
          data: {
            id: p.id,
            invoiceNumber: p.inv,
            supplierId: supplierId,
            totalAmount: totalAmount,
            paymentStatus: 'PAID',
            paymentMethod: 'TRANSFER',
            createdAt: new Date(p.date),
            updatedAt: new Date(p.date),
          },
        });

        const piId = `pi_${p.id}`;
        await tx.purchaseItem.create({
          data: {
            id: piId,
            purchaseId: p.id,
            productId: p.product.id,
            unitId: p.unitId,
            quantity: p.qty,
            costPrice: p.costPrice,
          },
        });

        const initialQtyBase = p.baseQty || (p.qty * p.convFactor);
        const currQtyBase = batchRemainingQty[p.batchId] ?? 0;
        const costPriceBase = p.costPriceBase || p.costPrice;
        const sellingPriceBase = p.sellingPriceBase || p.sellingPrice;

        await tx.stockBatch.create({
          data: {
            id: p.batchId,
            productId: p.product.id,
            purchaseItemId: piId,
            initialQuantity: initialQtyBase,
            currentQuantity: currQtyBase,
            costPrice: costPriceBase,
            sellingPrice: sellingPriceBase,
            unitId: p.product.baseUnitId,
            conversionFactor: 1,
            createdAt: new Date(p.date),
            updatedAt: new Date(p.date),
          },
        });

        // Stock log for purchase
        const unitName = unitNameMap[p.unitId] || p.unitId;
        await tx.stockLog.create({
          data: {
            id: makeId('log'),
            productId: p.product.id,
            type: 'IN',
            quantity: initialQtyBase,
            unitName: unitName,
            unitQuantity: p.qty,
            reason: `Pembelian ${p.batchCode} (${p.inv})`,
            createdAt: new Date(p.date),
          },
        });
      }

      console.log('5. Inserting batch prices...');
      for (const bp of batchPrices) {
        await tx.stockBatchPrice.create({
          data: {
            id: bp.id,
            batchId: bp.batchId,
            unitId: bp.unitId,
            price: bp.price,
          },
        });
      }

      console.log('6. Inserting 30-day sales trajectory...');
      for (const s of salesList) {
        let totalSaleAmount = 0;
        s.items.forEach((item) => {
          totalSaleAmount += item.qty * item.priceAtSale;
        });

        const saleId = makeId('sale');
        await tx.sale.create({
          data: {
            id: saleId,
            invoiceNumber: s.invNumber,
            totalAmount: totalSaleAmount,
            paymentStatus: 'PAID',
            paymentMethod: 'CASH',
            amountPaid: totalSaleAmount,
            changeAmount: 0,
            userId: userIdKasir,
            createdAt: new Date(s.date),
          },
        });

        for (const item of s.items) {
          const saleItemId = makeId('sitem');
          await tx.saleItem.create({
            data: {
              id: saleItemId,
              saleId: saleId,
              productId: item.product.id,
              unitId: item.unitId,
              quantity: item.qty,
              priceAtSale: item.priceAtSale,
              isManualPrice: false,
              isBonus: false,
              conversionFactor: item.convFactor,
            },
          });

          await tx.saleItemBatch.create({
            data: {
              id: makeId('sibatch'),
              saleItemId: saleItemId,
              batchId: item.batchId,
              quantity: item.baseQty,
              costPrice: item.costPriceBase,
            },
          });

          const unitName = unitNameMap[item.unitId] || item.unitId;
          await tx.stockLog.create({
            data: {
              id: makeId('log'),
              productId: item.product.id,
              type: 'OUT',
              quantity: item.baseQty,
              unitName: unitName,
              unitQuantity: item.qty,
              reason: `Penjualan Nota ${s.invNumber}`,
              createdAt: new Date(s.date),
            },
          });
        }
      }
    });

    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Database seeding error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
