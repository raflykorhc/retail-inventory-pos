import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
export function formatCompactCurrency(amount: number | string) {
  const value = Number(amount);
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'JT';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'RB';
  }
  return value.toString();
}

export function formatDate(date: string | Date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMultiUnitStock(stock: number, prices: any[]) {
  if (!prices || prices.length === 0) return `${stock} Unit`;
  
  // Urutkan dari yang terbesar untuk tampilan utama
  const sortedPrices = [...prices].sort((a, b) => b.conversionFactor - a.conversionFactor);
  
  let remainingStock = Math.round(stock * 1000) / 1000;
  const parts: string[] = [];
  
  for (const price of sortedPrices) {
    const factor = price.conversionFactor || 1;
    let unitName = price.unit?.name?.trim() || 'Unit';
    
    // Jika nama satuan mengandung '/' (seperti 1/2 KOL), kita anggap itu satuan harga saja,
    // dan kita abaikan dalam tampilan pecahan stok agar tidak membingungkan user.
    if (unitName.includes('/') && factor > 1) {
      continue;
    }

    if (remainingStock >= factor || (factor === 1 && remainingStock > 0)) {
      const unitQty = factor === 1 ? remainingStock : Math.floor(remainingStock / factor);
      if (unitQty > 0) {
        // Hapus angka '1' di depan nama satuan jika ada (misal "1 KOL" -> "KOL")
        // Tapi jangan hapus jika itu pecahan (misal "1/2 KOL")
        const displayName = unitName.replace(/^1\s+/, '');
        
        parts.push(`${unitQty} ${displayName}`);
        remainingStock = factor === 1 ? 0 : Math.round((remainingStock % factor) * 1000) / 1000;
      }
    }
    if (parts.length >= 2) break;
  }
  
  const mainUnitObj = sortedPrices[0];
  let mainUnitName = mainUnitObj?.unit?.name?.trim() || 'Unit';
  mainUnitName = mainUnitName.replace(/^1\s+/, '');

  return parts.length > 0 ? parts.join(' ') : `0 ${mainUnitName}`;
}

export function formatPaymentMethod(method: string): string {
  if (!method) return "TUNAI";
  const upper = method.toUpperCase();

  // If it starts with SPLIT:
  if (upper.startsWith("SPLIT:")) {
    const partsStr = method.substring(6); // remove "SPLIT:"
    const parts = partsStr.split(";");
    const formattedParts: string[] = [];

    for (const part of parts) {
      if (!part) continue;
      const [key, val] = part.split("=");
      if (!key || !val) continue;

      const amt = Number(val);
      if (amt <= 0) continue;

      let keyLabel = key;
      if (key === "CASH") keyLabel = "Tunai";
      else if (key === "DEBIT") keyLabel = "Debit";
      else if (key === "TRANSFER") keyLabel = "Transfer";
      else if (key === "DEBT") keyLabel = "Piutang";

      formattedParts.push(`${keyLabel}: ${formatCurrency(amt)}`);
    }

    if (formattedParts.length > 0) {
      return `Gabungan (${formattedParts.join(", ")})`;
    }
    return "Gabungan";
  }

  // Single methods translation
  if (upper === "CASH") return "Tunai";
  if (upper === "DEBT") return "Piutang";
  if (upper === "TRANSFER") return "Transfer Bank";
  if (upper === "DEBIT") return "Kartu Debit";
  if (upper === "SPLIT") return "Gabungan";
  return upper;
}

