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
