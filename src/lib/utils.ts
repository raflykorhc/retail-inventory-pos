import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tambahan fungsi sementara agar Vite tidak error / crash
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value || 0);
}

export function formatMultiUnitStock(stock: number, prices: any[]) {
  if (!prices || prices.length === 0) return `${stock}`;
  
  // Cari satuan dengan rasio (conversionFactor) terbesar
  const largestUnit = [...prices].sort((a, b) => (b.conversionFactor || 1) - (a.conversionFactor || 1))[0];
  
  if (!largestUnit || largestUnit.conversionFactor <= 1) {
    return `${stock} ${largestUnit?.unit?.name || ''}`.trim();
  }
  
  // Konversi ke satuan terbesar
  const convertedStock = stock / largestUnit.conversionFactor;
  const formattedStock = Number.isInteger(convertedStock) ? convertedStock : Number(convertedStock.toFixed(1));
  
  return `${formattedStock} ${largestUnit.unit?.name || ''}`.trim();
}

export function formatBaseUnitStock(stock: number, prices: any[]) {
  const numStock = Number(stock) || 0;
  const formattedStock = Number.isInteger(numStock) ? numStock : Number(numStock.toFixed(2));

  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    return `${formattedStock}`;
  }

  // Satuan dasar adalah satuan dengan conversionFactor = 1 (atau terkecil)
  const sortedPrices = [...prices].sort((a, b) => (a.conversionFactor || 1) - (b.conversionFactor || 1));
  const basePriceObj = sortedPrices.find(p => (p.conversionFactor || 1) === 1) || sortedPrices[0];

  const unitName = basePriceObj?.unit?.name || '';
  return `${formattedStock} ${unitName}`.trim();
}

export function hasLargerUnit(prices: any[]) {
  if (!prices || !Array.isArray(prices) || prices.length === 0) return false;
  const largestUnit = [...prices].sort((a, b) => (b.conversionFactor || 1) - (a.conversionFactor || 1))[0];
  return Boolean(largestUnit && (largestUnit.conversionFactor || 1) > 1);
}

export function formatCompactCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "0";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const formatted = abs / 1_000_000_000;
    return `${sign}${Number.isInteger(formatted) ? formatted : Number(formatted.toFixed(1))}M`;
  }
  if (abs >= 1_000_000) {
    const formatted = abs / 1_000_000;
    return `${sign}${Number.isInteger(formatted) ? formatted : Number(formatted.toFixed(1))}JT`;
  }
  if (abs >= 1_000) {
    const formatted = abs / 1_000;
    return `${sign}${Number.isInteger(formatted) ? formatted : Number(formatted.toFixed(1))}RB`;
  }
  return `${num}`;
}

export function formatMultiUnitMinMax(minStock: number, maxStock: number | null | undefined, prices: any[]) {
  if (!prices || prices.length === 0) {
    return `${minStock} / ${maxStock ?? '-'}`;
  }

  const largestUnit = [...prices].sort((a, b) => (b.conversionFactor || 1) - (a.conversionFactor || 1))[0];
  if (!largestUnit || largestUnit.conversionFactor <= 1) {
    return `${minStock} / ${maxStock ?? '-'}`;
  }

  const factor = largestUnit.conversionFactor;
  const minConverted = minStock / factor;
  const formattedMin = Number.isInteger(minConverted) ? minConverted : Number(minConverted.toFixed(1));

  let formattedMax = "-";
  if (maxStock !== null && maxStock !== undefined && maxStock > 0) {
    const maxConverted = maxStock / factor;
    formattedMax = String(Number.isInteger(maxConverted) ? maxConverted : Number(maxConverted.toFixed(1)));
  }

  return `${formattedMin} / ${formattedMax}`;
}

export function getMainUnitCost(averageCost: number, prices: any[]) {
  if (!averageCost) return 0;
  if (!prices || prices.length === 0) return Number(averageCost);

  const largestPriceObj = [...prices].sort((a, b) => (b.conversionFactor || 1) - (a.conversionFactor || 1))[0];
  const largestFactor = largestPriceObj?.conversionFactor || 1;

  return Number(averageCost) * largestFactor;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("id-ID");
}

export function formatPaymentMethod(method: string) {
  return method || "-";
}
