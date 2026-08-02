import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const materialsData = [
  // Semen & Mortar
  { name: 'Semen Tiga Roda 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-TR-40', cost: 48000, price: 52000, stock: 100 },
  { name: 'Semen Tiga Roda 50Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-TR-50', cost: 58000, price: 63000, stock: 100 },
  { name: 'Semen Gresik 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-GR-40', cost: 47000, price: 51000, stock: 100 },
  { name: 'Semen Gresik 50Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-GR-50', cost: 57000, price: 62000, stock: 100 },
  { name: 'Semen Padang 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-PD-40', cost: 46000, price: 50000, stock: 100 },
  { name: 'Semen Padang 50Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-PD-50', cost: 56000, price: 61000, stock: 100 },
  { name: 'Semen Merah Putih 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-MP-40', cost: 45000, price: 49000, stock: 100 },
  { name: 'Semen Merah Putih 50Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-MP-50', cost: 55000, price: 60000, stock: 100 },
  { name: 'Semen Putih Tiga Roda 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'SMN-PT-40', cost: 95000, price: 105000, stock: 50 },
  { name: 'Mortar Utama (MU) 380 Perekat Bata 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'MU-380-40', cost: 85000, price: 92000, stock: 80 },
  { name: 'Mortar Utama (MU) 301 Pasangan Bata 40Kg', category: 'Semen & Mortar', unit: 'Sak', code: 'MU-301-40', cost: 75000, price: 82000, stock: 80 },

  // Besi & Baja
  { name: 'Besi Beton Polos 6mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-POL-6', cost: 22000, price: 26000, stock: 200 },
  { name: 'Besi Beton Polos 8mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-POL-8', cost: 38000, price: 43000, stock: 200 },
  { name: 'Besi Beton Polos 10mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-POL-10', cost: 58000, price: 65000, stock: 150 },
  { name: 'Besi Beton Polos 12mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-POL-12', cost: 82000, price: 90000, stock: 150 },
  { name: 'Besi Beton Ulir 10mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-ULR-10', cost: 60000, price: 68000, stock: 100 },
  { name: 'Besi Beton Ulir 13mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-ULR-13', cost: 98000, price: 108000, stock: 100 },
  { name: 'Besi Beton Ulir 16mm SNI', category: 'Besi & Baja', unit: 'Btg', code: 'BS-ULR-16', cost: 145000, price: 158000, stock: 80 },
  { name: 'Kawat Bendrat', category: 'Besi & Baja', unit: 'Kg', code: 'KWT-BDRT', cost: 14000, price: 18000, stock: 100 },
  { name: 'Kawat Nyamuk Baja', category: 'Besi & Baja', unit: 'Roll', code: 'KWT-NYMK-BJ', cost: 185000, price: 210000, stock: 20 },
  { name: 'Plat Besi 1mm', category: 'Besi & Baja', unit: 'Lbr', code: 'PLT-BS-1', cost: 420000, price: 460000, stock: 15 },
  { name: 'Plat Besi 2mm', category: 'Besi & Baja', unit: 'Lbr', code: 'PLT-BS-2', cost: 840000, price: 920000, stock: 10 },

  // Kayu & Triplek
  { name: 'Kayu Kaso Meranti 4x6 4m', category: 'Kayu & Triplek', unit: 'Btg', code: 'KY-KS-46', cost: 18000, price: 22000, stock: 150 },
  { name: 'Kayu Kaso Meranti 5x7 4m', category: 'Kayu & Triplek', unit: 'Btg', code: 'KY-KS-57', cost: 25000, price: 30000, stock: 150 },
  { name: 'Kayu Balok Meranti 6x12 4m', category: 'Kayu & Triplek', unit: 'Btg', code: 'KY-BL-612', cost: 65000, price: 75000, stock: 100 },
  { name: 'Kayu Balok Meranti 8x12 4m', category: 'Kayu & Triplek', unit: 'Btg', code: 'KY-BL-812', cost: 85000, price: 98000, stock: 100 },
  { name: 'Papan Kayu Meranti 2x20 4m', category: 'Kayu & Triplek', unit: 'Lbr', code: 'PPN-MR-220', cost: 35000, price: 42000, stock: 80 },
  { name: 'Papan Kayu Meranti 3x20 4m', category: 'Kayu & Triplek', unit: 'Lbr', code: 'PPN-MR-320', cost: 52000, price: 60000, stock: 80 },
  { name: 'Triplek 3mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-3', cost: 42000, price: 48000, stock: 120 },
  { name: 'Triplek 4mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-4', cost: 55000, price: 62000, stock: 100 },
  { name: 'Triplek 6mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-6', cost: 70000, price: 80000, stock: 80 },
  { name: 'Triplek 9mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-9', cost: 105000, price: 120000, stock: 70 },
  { name: 'Triplek 12mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-12', cost: 140000, price: 160000, stock: 60 },
  { name: 'Triplek 15mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-15', cost: 175000, price: 195000, stock: 50 },
  { name: 'Triplek 18mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-18', cost: 210000, price: 235000, stock: 40 },
  { name: 'Triplek Melamin 3mm 122x244cm', category: 'Kayu & Triplek', unit: 'Lbr', code: 'TRP-ML-3', cost: 75000, price: 85000, stock: 50 },

  // Paku, Baut & Sekrup
  { name: 'Paku Kayu 2cm', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-KY-2', cost: 15000, price: 18000, stock: 50 },
  { name: 'Paku Kayu 3cm', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-KY-3', cost: 14000, price: 17000, stock: 50 },
  { name: 'Paku Kayu 5cm', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-KY-5', cost: 13500, price: 16000, stock: 100 },
  { name: 'Paku Kayu 7cm', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-KY-7', cost: 13500, price: 16000, stock: 100 },
  { name: 'Paku Kayu 10cm', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-KY-10', cost: 13500, price: 16000, stock: 100 },
  { name: 'Paku Payung / Seng', category: 'Paku, Baut & Sekrup', unit: 'Kg', code: 'PK-PYG', cost: 22000, price: 26000, stock: 40 },
  { name: 'Paku Beton 3cm', category: 'Paku, Baut & Sekrup', unit: 'Dus', code: 'PK-BT-3', cost: 20000, price: 25000, stock: 30 },
  { name: 'Paku Beton 4cm', category: 'Paku, Baut & Sekrup', unit: 'Dus', code: 'PK-BT-4', cost: 20000, price: 25000, stock: 30 },
  { name: 'Paku Beton 5cm', category: 'Paku, Baut & Sekrup', unit: 'Dus', code: 'PK-BT-5', cost: 20000, price: 25000, stock: 30 },
  { name: 'Sekrup Gypsum Hitam 1 inch', category: 'Paku, Baut & Sekrup', unit: 'Dus', code: 'SKR-GY-1', cost: 45000, price: 55000, stock: 20 },
  { name: 'Baut Baja Ringan (Roofing)', category: 'Paku, Baut & Sekrup', unit: 'Dus', code: 'BT-RF-1', cost: 55000, price: 65000, stock: 30 },
  { name: 'Dinabolt 8x40', category: 'Paku, Baut & Sekrup', unit: 'Pcs', code: 'DNB-840', cost: 800, price: 1200, stock: 500 },
  { name: 'Dinabolt 10x50', category: 'Paku, Baut & Sekrup', unit: 'Pcs', code: 'DNB-1050', cost: 1200, price: 1800, stock: 400 },

  // Cat & Thinner
  { name: 'Cat Tembok Dulux Catylac Putih 5Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-DL-PT-5', cost: 110000, price: 125000, stock: 40 },
  { name: 'Cat Tembok Dulux Catylac Putih 25Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-DL-PT-25', cost: 480000, price: 540000, stock: 20 },
  { name: 'Cat Tembok Nippon Vinilex Putih 5Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-NP-PT-5', cost: 95000, price: 110000, stock: 45 },
  { name: 'Cat Tembok Nippon Vinilex Putih 25Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-NP-PT-25', cost: 450000, price: 495000, stock: 25 },
  { name: 'Cat Tembok Avitex Putih 5Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-AV-PT-5', cost: 85000, price: 100000, stock: 50 },
  { name: 'Cat Tembok Avitex Putih 25Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-AV-PT-25', cost: 410000, price: 460000, stock: 30 },
  { name: 'Cat Kayu & Besi Avian Hitam 1Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-KB-HT-1', cost: 48000, price: 55000, stock: 60 },
  { name: 'Cat Kayu & Besi Avian Putih 1Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-KB-PT-1', cost: 48000, price: 55000, stock: 60 },
  { name: 'Cat Dasar (Sealer) Nippon 5Kg', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-DS-NP-5', cost: 80000, price: 95000, stock: 30 },
  { name: 'Cat Genteng Jotun 2.5L', category: 'Cat & Thinner', unit: 'Klg', code: 'CT-GT-JT-25', cost: 135000, price: 155000, stock: 20 },
  { name: 'Thinner Impala 1L', category: 'Cat & Thinner', unit: 'Klg', code: 'THN-IMP-1', cost: 22000, price: 27000, stock: 100 },
  { name: 'Thinner ND 1L', category: 'Cat & Thinner', unit: 'Klg', code: 'THN-ND-1', cost: 25000, price: 30000, stock: 80 },
  { name: 'Kuas Cat 1"', category: 'Cat & Thinner', unit: 'Pcs', code: 'KS-CT-1', cost: 4000, price: 6000, stock: 150 },
  { name: 'Kuas Cat 2"', category: 'Cat & Thinner', unit: 'Pcs', code: 'KS-CT-2', cost: 6500, price: 9000, stock: 150 },
  { name: 'Kuas Cat 3"', category: 'Cat & Thinner', unit: 'Pcs', code: 'KS-CT-3', cost: 10000, price: 14000, stock: 100 },
  { name: 'Roll Cat Besar', category: 'Cat & Thinner', unit: 'Pcs', code: 'RL-CT-BS', cost: 18000, price: 25000, stock: 50 },
  { name: 'Roll Cat Kecil (Busa)', category: 'Cat & Thinner', unit: 'Pcs', code: 'RL-CT-KC', cost: 7000, price: 10000, stock: 80 },

  // Pipa & Aksesoris
  { name: 'Pipa PVC Wavin AW 1/2"', category: 'Pipa & Aksesoris', unit: 'Btg', code: 'PP-WV-AW-12', cost: 22000, price: 26000, stock: 200 },
  { name: 'Pipa PVC Wavin AW 3/4"', category: 'Pipa & Aksesoris', unit: 'Btg', code: 'PP-WV-AW-34', cost: 28000, price: 33000, stock: 200 },
  { name: 'Pipa PVC Wavin AW 1"', category: 'Pipa & Aksesoris', unit: 'Btg', code: 'PP-WV-AW-1', cost: 36000, price: 42000, stock: 150 },
  { name: 'Pipa PVC Wavin D 3"', category: 'Pipa & Aksesoris', unit: 'Btg', code: 'PP-WV-D-3', cost: 68000, price: 80000, stock: 100 },
  { name: 'Pipa PVC Wavin D 4"', category: 'Pipa & Aksesoris', unit: 'Btg', code: 'PP-WV-D-4', cost: 95000, price: 110000, stock: 80 },
  { name: 'Knee PVC AW 1/2"', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'KN-PVC-12', cost: 2000, price: 3000, stock: 300 },
  { name: 'Knee PVC AW 3/4"', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'KN-PVC-34', cost: 2500, price: 3500, stock: 300 },
  { name: 'Tee PVC AW 1/2"', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'TE-PVC-12', cost: 2500, price: 3500, stock: 250 },
  { name: 'Tee PVC AW 3/4"', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'TE-PVC-34', cost: 3000, price: 4000, stock: 200 },
  { name: 'Sok PVC AW 1/2"', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'SK-PVC-12', cost: 1500, price: 2500, stock: 300 },
  { name: 'Lem Pipa Isarplas Tube', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'LM-PP-TB', cost: 7500, price: 10000, stock: 100 },
  { name: 'Lem Pipa Isarplas Kaleng', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'LM-PP-KL', cost: 45000, price: 55000, stock: 40 },
  { name: 'Seal Tape Onda', category: 'Pipa & Aksesoris', unit: 'Pcs', code: 'SL-TP-OND', cost: 3500, price: 5000, stock: 200 },

  // Listrik & Lampu
  { name: 'Kabel Eterna NYM 2x1.5mm', category: 'Listrik & Lampu', unit: 'Roll', code: 'KB-ET-215', cost: 320000, price: 350000, stock: 30 },
  { name: 'Kabel Eterna NYM 2x2.5mm', category: 'Listrik & Lampu', unit: 'Roll', code: 'KB-ET-225', cost: 420000, price: 460000, stock: 30 },
  { name: 'Kabel Eterna NYM 3x1.5mm', category: 'Listrik & Lampu', unit: 'Roll', code: 'KB-ET-315', cost: 410000, price: 450000, stock: 25 },
  { name: 'Kabel Eterna NYM 3x2.5mm', category: 'Listrik & Lampu', unit: 'Roll', code: 'KB-ET-325', cost: 580000, price: 630000, stock: 20 },
  { name: 'Saklar Engkel Broco', category: 'Listrik & Lampu', unit: 'Pcs', code: 'SK-EK-BRC', cost: 12000, price: 16000, stock: 100 },
  { name: 'Saklar Seri / Ganda Broco', category: 'Listrik & Lampu', unit: 'Pcs', code: 'SK-SR-BRC', cost: 15000, price: 20000, stock: 80 },
  { name: 'Stop Kontak Broco', category: 'Listrik & Lampu', unit: 'Pcs', code: 'ST-KT-BRC', cost: 16000, price: 22000, stock: 100 },
  { name: 'Fitting Lampu Gantung Broco', category: 'Listrik & Lampu', unit: 'Pcs', code: 'FT-LG-BRC', cost: 8000, price: 12000, stock: 120 },
  { name: 'Fitting Lampu Plafon Broco', category: 'Listrik & Lampu', unit: 'Pcs', code: 'FT-LP-BRC', cost: 10000, price: 14000, stock: 120 },
  { name: 'Lampu LED Philips 4W', category: 'Listrik & Lampu', unit: 'Pcs', code: 'LP-LED-4W', cost: 18000, price: 25000, stock: 150 },
  { name: 'Lampu LED Philips 8W', category: 'Listrik & Lampu', unit: 'Pcs', code: 'LP-LED-8W', cost: 28000, price: 35000, stock: 150 },
  { name: 'Lampu LED Philips 12W', category: 'Listrik & Lampu', unit: 'Pcs', code: 'LP-LED-12W', cost: 38000, price: 45000, stock: 100 },
  { name: 'Isolasi Listrik Nitto Hitam', category: 'Listrik & Lampu', unit: 'Pcs', code: 'IS-LS-NT', cost: 5000, price: 8000, stock: 200 },

  // Atap & Baja Ringan
  { name: 'Baja Ringan Canal C 75-0.75', category: 'Atap & Baja Ringan', unit: 'Btg', code: 'BJ-CN-75', cost: 68000, price: 75000, stock: 200 },
  { name: 'Baja Ringan Canal C 75-1.00', category: 'Atap & Baja Ringan', unit: 'Btg', code: 'BJ-CN-100', cost: 85000, price: 95000, stock: 150 },
  { name: 'Reng Baja Ringan 0.40', category: 'Atap & Baja Ringan', unit: 'Btg', code: 'RG-BJ-40', cost: 30000, price: 35000, stock: 250 },
  { name: 'Reng Baja Ringan 0.45', category: 'Atap & Baja Ringan', unit: 'Btg', code: 'RG-BJ-45', cost: 34000, price: 40000, stock: 200 },
  { name: 'Spandek Pasir 0.30mm x 3m', category: 'Atap & Baja Ringan', unit: 'Lbr', code: 'SP-PS-3', cost: 135000, price: 155000, stock: 80 },
  { name: 'Spandek Pasir 0.30mm x 6m', category: 'Atap & Baja Ringan', unit: 'Lbr', code: 'SP-PS-6', cost: 270000, price: 310000, stock: 50 },
  { name: 'Asbes Gelombang Besar 180cm', category: 'Atap & Baja Ringan', unit: 'Lbr', code: 'AS-GB-18', cost: 42000, price: 50000, stock: 150 },
  { name: 'Asbes Gelombang Besar 240cm', category: 'Atap & Baja Ringan', unit: 'Lbr', code: 'AS-GB-24', cost: 58000, price: 68000, stock: 120 },
  { name: 'Genteng Metal Pasir', category: 'Atap & Baja Ringan', unit: 'Lbr', code: 'GT-MT-PS', cost: 28000, price: 35000, stock: 500 },
  { name: 'Nok Genteng Metal', category: 'Atap & Baja Ringan', unit: 'Pcs', code: 'NK-GT-MT', cost: 18000, price: 25000, stock: 200 },

  // Bata, Pasir & Batu
  { name: 'Bata Merah Press', category: 'Bata, Pasir & Batu', unit: 'Pcs', code: 'BT-MR-PR', cost: 600, price: 850, stock: 10000 },
  { name: 'Batako Press', category: 'Bata, Pasir & Batu', unit: 'Pcs', code: 'BT-KO-PR', cost: 2500, price: 3500, stock: 5000 },
  { name: 'Bata Ringan (Hebel) 7.5cm', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'HB-75', cost: 550000, price: 620000, stock: 20 },
  { name: 'Bata Ringan (Hebel) 10cm', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'HB-100', cost: 550000, price: 620000, stock: 20 },
  { name: 'Pasir Cor', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'PS-CR', cost: 280000, price: 320000, stock: 50 },
  { name: 'Pasir Pasang', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'PS-PSG', cost: 250000, price: 290000, stock: 50 },
  { name: 'Batu Split 1/2', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'BT-SP-12', cost: 260000, price: 300000, stock: 40 },
  { name: 'Batu Belah (Pondasi)', category: 'Bata, Pasir & Batu', unit: 'Kubik', code: 'BT-BL', cost: 220000, price: 260000, stock: 30 },

  // Keramik & Granit
  { name: 'Keramik Lantai Asia Tile 30x30 Putih', category: 'Keramik & Granit', unit: 'Dus', code: 'KR-AT-30-PT', cost: 38000, price: 45000, stock: 100 },
  { name: 'Keramik Lantai Asia Tile 40x40 Putih', category: 'Keramik & Granit', unit: 'Dus', code: 'KR-AT-40-PT', cost: 42000, price: 50000, stock: 100 },
  { name: 'Keramik Lantai Mulia 40x40 Motif', category: 'Keramik & Granit', unit: 'Dus', code: 'KR-ML-40-MT', cost: 48000, price: 58000, stock: 80 },
  { name: 'Keramik Dinding Roman 20x40', category: 'Keramik & Granit', unit: 'Dus', code: 'KR-DD-RM-2040', cost: 58000, price: 68000, stock: 60 },
  { name: 'Keramik Dinding Roman 25x50', category: 'Keramik & Granit', unit: 'Dus', code: 'KR-DD-RM-2550', cost: 72000, price: 85000, stock: 60 },
  { name: 'Granit Garuda 60x60 Putih Polos', category: 'Keramik & Granit', unit: 'Dus', code: 'GR-GD-60-PT', cost: 95000, price: 115000, stock: 150 },
  { name: 'Granit Garuda 60x60 Motif Kayu', category: 'Keramik & Granit', unit: 'Dus', code: 'GR-GD-60-KY', cost: 110000, price: 135000, stock: 120 },
  { name: 'Nat Keramik AM 53 Putih 1Kg', category: 'Keramik & Granit', unit: 'Sak', code: 'NT-AM-PT', cost: 12000, price: 16000, stock: 200 },
  { name: 'Nat Keramik AM 53 Hitam 1Kg', category: 'Keramik & Granit', unit: 'Sak', code: 'NT-AM-HT', cost: 12000, price: 16000, stock: 100 },

  // Alat Tukang & Sanitari
  { name: 'Kloset Duduk Toto', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'KL-DD-TT', cost: 1450000, price: 1750000, stock: 10 },
  { name: 'Kloset Jongkok Ina', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'KL-JG-IN', cost: 160000, price: 210000, stock: 30 },
  { name: 'Palu Besi Gagang Karet', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'PL-BS', cost: 25000, price: 35000, stock: 40 },
  { name: 'Gergaji Kayu Sandflex', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'GR-KY-SD', cost: 45000, price: 60000, stock: 30 },
  { name: 'Meteran 5m Tajima', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'MT-5M-TJ', cost: 28000, price: 38000, stock: 60 },
  { name: 'Cetok Semen Oval', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'CT-SM', cost: 12000, price: 18000, stock: 80 },
  { name: 'Cangkul Crocodile', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'CG-CR', cost: 65000, price: 85000, stock: 25 },
  { name: 'Sekop Pasir', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'SK-PS', cost: 45000, price: 60000, stock: 35 },
  { name: 'Mesin Gerinda Maktec', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'MG-GR-MK', cost: 350000, price: 420000, stock: 15 },
  { name: 'Mesin Bor Bosch 10mm', category: 'Alat Tukang & Sanitari', unit: 'Pcs', code: 'MB-BR-BS', cost: 480000, price: 580000, stock: 15 },
];

async function seedMaterials() {
  console.log('Seeding materials...');
  
  // Create Categories map
  const categoryNames = [...new Set(materialsData.map(m => m.category))];
  const categories: Record<string, string> = {};
  for (const catName of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
    categories[catName] = cat.id;
  }
  
  // Create Units map
  const unitNames = [...new Set(materialsData.map(m => m.unit))];
  const units: Record<string, string> = {};
  for (const unitName of unitNames) {
    const unit = await prisma.unit.upsert({
      where: { name: unitName },
      update: {},
      create: { name: unitName },
    });
    units[unitName] = unit.id;
  }
  
  // Create Supplier
  const supplierName = 'Distributor Pusat Bahan Bangunan';
  let supplier = await prisma.supplier.findFirst({
    where: { name: supplierName },
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: supplierName, contact: 'Bpk. Ahmad', phone: '08123456789' },
    });
  }

  // Create Purchase (Invoice)
  const totalPurchaseAmount = materialsData.reduce((sum, item) => sum + (item.cost * item.stock), 0);
  const purchase = await prisma.purchase.create({
    data: {
      invoiceNumber: `INV-SEED-${Date.now()}`,
      supplierId: supplier.id,
      totalAmount: totalPurchaseAmount,
      paymentStatus: 'PAID',
      paymentMethod: 'TRANSFER',
    }
  });

  console.log(`Created Purchase ${purchase.invoiceNumber}`);

  let i = 1;
  for (const item of materialsData) {
    const categoryId = categories[item.category];
    const unitId = units[item.unit];

    // 1. Create Product
    const product = await prisma.product.upsert({
      where: { code: item.code },
      update: {
        stock: { increment: item.stock },
        averageCost: item.cost,
      },
      create: {
        code: item.code,
        name: item.name,
        categoryId: categoryId,
        supplierId: supplier.id,
        stock: item.stock,
        averageCost: item.cost,
      }
    });

    // 2. Create ProductPrice
    await prisma.productPrice.deleteMany({
      where: { productId: product.id }
    });
    
    await prisma.productPrice.create({
      data: {
        productId: product.id,
        unitId: unitId,
        price: item.price,
        conversionFactor: 1,
      }
    });

    // 3. Create PurchaseItem
    const purchaseItem = await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        productId: product.id,
        unitId: unitId,
        quantity: item.stock,
        costPrice: item.cost,
      }
    });

    // 4. Create StockBatch
    await prisma.stockBatch.create({
      data: {
        productId: product.id,
        purchaseItemId: purchaseItem.id,
        initialQuantity: item.stock,
        currentQuantity: item.stock,
        costPrice: item.cost,
        sellingPrice: item.price,
        unitId: unitId,
        conversionFactor: 1,
      }
    });

    // 5. Create StockLog
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        type: 'IN',
        quantity: item.stock,
        reason: 'Initial Seed Stock',
      }
    });

    console.log(`[${i}/${materialsData.length}] Inserted: ${item.name} (${item.stock} ${item.unit})`);
    i++;
  }
  
  console.log('✅ Seed materials completed successfully!');
}

seedMaterials()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
