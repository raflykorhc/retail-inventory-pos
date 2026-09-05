"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Receipt,
  Printer,
  FileText,
  Copy,
  Check,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  Package,
  Clock,
  Banknote,
  QrCode,
  Wallet,
  Layers,
  Sparkles,
  Tag,
  Loader2,
  DollarSign
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PrinterService } from "@/services/printerService";
import { handlePrintInvoice } from "@/lib/printUtils";
import { useSaleDetail } from "@/hooks/queries/useSales";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any | null;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  sale: initialSale,
}: TransactionDetailModalProps) {
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const settings = useSettingsStore((state) => state.settings);

  // Fetch full details if initialSale only has partial data or to get latest batch allocations
  const saleIdentifier = initialSale?.id || initialSale?.invoiceNumber || initialSale?.invoice;
  const { data: fetchedSale, isLoading: isFetchingDetail } = useSaleDetail(isOpen && saleIdentifier ? saleIdentifier : null);

  const sale = fetchedSale || initialSale;

  const handleCopyInvoice = () => {
    const inv = sale?.invoiceNumber || sale?.invoice;
    if (inv) {
      navigator.clipboard.writeText(inv);
      setCopiedInvoice(true);
      toast.success("Nomor invoice disalin ke clipboard", {
        description: inv,
      });
      setTimeout(() => setCopiedInvoice(false), 2000);
    }
  };

  // --- FINANCIAL & PROFIT CALCULATIONS ---
  const calculation = useMemo(() => {
    if (!sale) {
      return {
        items: [],
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        marginPercent: 0,
        totalItemsCount: 0,
        totalUnitsCount: 0,
      };
    }

    const rawItems = sale.items || [];
    let totalRev = 0;
    let totalCostVal = 0;
    let totalUnits = 0;

    const computedItems = rawItems.map((item: any, idx: number) => {
      const product = item.product || {};
      const unitName = item.unit?.name || item.unit || "Pcs";
      const quantity = Number(item.quantity) || 0;
      const isBonus = Boolean(item.isBonus);
      const priceAtSale = isBonus ? 0 : Number(item.priceAtSale ?? item.price ?? 0);
      const conversionFactor = Number(item.conversionFactor) || 1;
      const qtyInBaseUnits = quantity * conversionFactor;

      // Calculate Item Cost (HPP)
      let itemTotalCost = 0;
      let costSource = "FIFO Batch";

      if (item.batchAllocations && item.batchAllocations.length > 0) {
        itemTotalCost = item.batchAllocations.reduce((sum: number, b: any) => {
          return sum + (Number(b.costPrice) * Number(b.quantity));
        }, 0);
      } else {
        const avgCost = Number(product.averageCost || 0);
        itemTotalCost = avgCost * qtyInBaseUnits;
        costSource = avgCost > 0 ? "Rata-rata (Avg)" : "Estimasi";
      }

      const itemRevenue = isBonus ? 0 : (priceAtSale * quantity);
      const itemProfit = itemRevenue - itemTotalCost;
      const itemMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : (itemProfit < 0 ? -100 : 0);
      const unitCost = quantity > 0 ? (itemTotalCost / quantity) : 0;

      totalRev += itemRevenue;
      totalCostVal += itemTotalCost;
      totalUnits += quantity;

      return {
        id: item.id || idx,
        productName: product.name || item.name || "Produk",
        productCode: product.code || item.code || "-",
        category: product.category?.name || item.category || "Umum",
        unitName,
        quantity,
        conversionFactor,
        isBonus,
        isManualPrice: Boolean(item.isManualPrice),
        priceAtSale,
        unitCost,
        itemTotalCost,
        itemRevenue,
        itemProfit,
        itemMargin,
        costSource,
        batchAllocations: item.batchAllocations || [],
      };
    });

    // Use sale total amount if provided by API, otherwise fallback to item calculation
    const recordedTotal = Number(sale.totalAmount ?? sale.total ?? totalRev);
    const finalTotalRevenue = recordedTotal > 0 ? recordedTotal : totalRev;
    const finalTotalProfit = finalTotalRevenue - totalCostVal;
    const finalMarginPercent = finalTotalRevenue > 0 ? (finalTotalProfit / finalTotalRevenue) * 100 : 0;

    return {
      items: computedItems,
      totalRevenue: finalTotalRevenue,
      totalCost: totalCostVal,
      totalProfit: finalTotalProfit,
      marginPercent: finalMarginPercent,
      totalItemsCount: computedItems.length,
      totalUnitsCount: totalUnits,
    };
  }, [sale]);

  // Format Helpers
  const txDate = useMemo(() => {
    if (!sale?.createdAt && !sale?.date) return "-";
    try {
      const d = new Date(sale.createdAt || sale.date);
      if (isNaN(d.getTime())) return String(sale.date || "-");
      return format(d, "dd MMMM yyyy, HH:mm", { locale: idLocale });
    } catch {
      return String(sale.date || "-");
    }
  }, [sale]);

  const cashierName = sale?.user?.fullName || sale?.user?.username || sale?.cashier || "Kasir Toko";

  const paymentMethodInfo = useMemo(() => {
    const method = (sale?.paymentMethod || sale?.method || "CASH").toUpperCase();
    if (method.includes("QRIS")) return { label: "QRIS", icon: QrCode, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (method.includes("TRANSFER")) return { label: "Transfer Bank", icon: CreditCard, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" };
    if (method.includes("DEBIT") || method.includes("CARD")) return { label: "Kartu Debit/Kredit", icon: Wallet, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (method.includes("SPLIT")) return { label: "Split Payment", icon: CreditCard, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    return { label: "TUNAI", icon: Banknote, color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" };
  }, [sale]);

  // --- PRINT RECEIPT HANDLERS ---
  const triggerBrowserThermalPrint = (saleData: any) => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) return;

    const shopName = settings.shopName || 'Toko Retail POS';
    const shopAddress = settings.shopAddress || '';
    const shopPhone = settings.shopPhone || '';
    const cashier = cashierName;
    const invoiceNum = saleData.invoiceNumber || saleData.invoice || `INV-${Date.now()}`;
    const txTimeStr = txDate;

    const items = calculation.items;
    const itemsHtml = items.map((item: any) => {
      const name = item.productName;
      const qtyStr = `${item.quantity} ${item.unitName}`;
      const priceStr = `Rp ${item.priceAtSale.toLocaleString('id-ID')}`;
      const subtotalStr = `Rp ${item.itemRevenue.toLocaleString('id-ID')}`;
      return `
        <div style="margin-bottom: 4px;">
          <div style="font-weight: 600; text-transform: uppercase;">${name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
            <span>${qtyStr} x ${priceStr}</span>
            <span>${subtotalStr}</span>
          </div>
        </div>
      `;
    }).join('');

    const totalAmount = calculation.totalRevenue;
    const amountPaid = Number(saleData.amountPaid ?? totalAmount);
    const changeAmount = Number(saleData.changeAmount ?? 0);

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk ${invoiceNum}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 11px; 
              margin: 0; 
              padding: 10px; 
              width: 54mm; 
              line-height: 1.3; 
              color: #000; 
              background: #fff; 
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .dash-line { border-bottom: 1px dashed #444; margin: 6px 0; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 13px; text-transform: uppercase;">${shopName}</div>
          ${shopAddress ? `<div class="text-center" style="font-size: 9px; color: #444;">${shopAddress}</div>` : ''}
          ${shopPhone ? `<div class="text-center" style="font-size: 9px; color: #444;">Telp: ${shopPhone}</div>` : ''}
          <div class="dash-line"></div>
          <div class="flex-between" style="font-size: 9px;">
            <span>No: ${invoiceNum}</span>
          </div>
          <div class="flex-between" style="font-size: 9px;">
            <span>Tgl: ${txTimeStr}</span>
            <span>Kasir: ${cashier}</span>
          </div>
          <div class="dash-line"></div>
          ${itemsHtml}
          <div class="dash-line"></div>
          <div class="flex-between" style="font-size: 10px;">
            <span>Subtotal:</span>
            <span>Rp ${totalAmount.toLocaleString('id-ID')}</span>
          </div>
          <div class="flex-between bold" style="font-size: 12px; margin-top: 3px;">
            <span>TOTAL:</span>
            <span>Rp ${totalAmount.toLocaleString('id-ID')}</span>
          </div>
          <div class="flex-between" style="margin-top: 2px; font-size: 10px;">
            <span>Metode:</span>
            <span>${paymentMethodInfo.label}</span>
          </div>
          ${amountPaid > 0 ? `
          <div class="flex-between" style="font-size: 10px;">
            <span>Bayar:</span>
            <span>Rp ${amountPaid.toLocaleString('id-ID')}</span>
          </div>
          ` : ''}
          ${changeAmount > 0 ? `
          <div class="flex-between" style="font-size: 10px;">
            <span>Kembalian:</span>
            <span>Rp ${changeAmount.toLocaleString('id-ID')}</span>
          </div>
          ` : ''}
          <div class="dash-line"></div>
          <div class="text-center" style="margin-top: 8px; font-size: 10px;">*** Terima Kasih ***</div>
          <div class="text-center" style="font-size: 8px; color: #666;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch (e) {}
      }, 1000);
    }, 250);
  };

  const handlePrintReceiptThermal = async () => {
    if (!sale) return;
    setIsPrintingThermal(true);
    try {
      const printerConfig = localStorage.getItem('printerSettings');
      if (!printerConfig) {
        triggerBrowserThermalPrint(sale);
        toast.info("Mencetak Struk via Browser", {
          description: "Printer hardware thermal belum dikonfigurasi. Menampilkan jendela cetak browser.",
        });
        return;
      }

      // Format payload for printerService
      const payload = {
        invoiceNumber: sale.invoiceNumber || sale.invoice,
        createdAt: sale.createdAt || sale.date,
        totalAmount: calculation.totalRevenue,
        paymentMethod: paymentMethodInfo.label,
        amountPaid: sale.amountPaid,
        changeAmount: sale.changeAmount,
        items: calculation.items.map((i: any) => ({
          name: i.productName,
          quantity: i.quantity,
          price: i.priceAtSale,
          isBonus: i.isBonus,
        })),
      };

      await PrinterService.printReceipt(payload);
      toast.success("Struk thermal berhasil dicetak!");
    } catch (err: any) {
      console.warn("Thermal hardware print error, fallback to browser:", err);
      triggerBrowserThermalPrint(sale);
      toast.info("Mencetak Struk via Browser", {
        description: "Printer thermal hardware offline. Struk dialihkan ke dialog cetak browser.",
      });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handlePrintA4Invoice = () => {
    if (!sale) return;
    try {
      const formattedSale = {
        invoiceNumber: sale.invoiceNumber || sale.invoice || `INV-${Date.now()}`,
        createdAt: sale.createdAt || sale.date || new Date().toISOString(),
        totalAmount: calculation.totalRevenue,
        paymentMethod: paymentMethodInfo.label,
        items: calculation.items.map((i: any) => ({
          product: { name: i.productName },
          unit: { name: i.unitName },
          quantity: i.quantity,
          priceAtSale: i.priceAtSale,
          isBonus: i.isBonus,
        })),
      };
      handlePrintInvoice(formattedSale);
      toast.success("Nota faktur siap dicetak", {
        description: "Jendela pratinjau nota faktur penjualan telah dibuka.",
      });
    } catch (err) {
      toast.error("Gagal membuka faktur nota", {
        description: "Terjadi kesalahan saat memproses template faktur.",
      });
    }
  };

  if (!isOpen) return null;

  const invoiceNumber = sale?.invoiceNumber || sale?.invoice || "INV-UNKNOWN";
  const isProfitPositive = calculation.totalProfit >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh] w-full">
          <div className="p-6">
            
            {/* DIALOG HEADER */}
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Receipt className="size-4 text-primary shrink-0" />
                  <span>Detail Transaksi</span>
                </DialogTitle>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={handleCopyInvoice}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/60"
                        >
                          <span>#{invoiceNumber}</span>
                          {copiedInvoice ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3 text-muted-foreground" />
                          )}
                        </button>
                      }
                    />
                    <TooltipContent side="top">
                      <p className="text-xs">Klik untuk menyalin No. Invoice</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Rincian item penjualan, margin laba per barang, dan rekapitulasi pembayaran.
              </DialogDescription>
            </DialogHeader>

            {/* FORM / BODY CONTAINER (IDENTIK DENGAN MODAL TAMBAH BARANG) */}
            <div className="space-y-5 pt-4">

              {/* 1. METADATA INFO BAR (3 Kolom: Kiri, Center, Kanan) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 border border-border/60 p-3.5 rounded-lg">
                {/* Kiri: Kasir / Petugas */}
                <div className="flex flex-col justify-center items-start text-left">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1">
                    <User className="size-3 text-muted-foreground shrink-0" />
                    Kasir / Petugas
                  </span>
                  <span className="font-semibold text-foreground truncate text-xs leading-none">
                    {cashierName}
                  </span>
                </div>

                {/* Center: Waktu Transaksi */}
                <div className="flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1.5 mb-1">
                    <Clock className="size-3 text-muted-foreground shrink-0" />
                    Waktu Transaksi
                  </span>
                  <span className="font-semibold text-foreground text-xs leading-none">
                    {txDate}
                  </span>
                </div>

                {/* Kanan: Metode Pembayaran */}
                <div className="flex flex-col justify-center items-end text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-end gap-1.5 mb-1">
                    <CreditCard className="size-3 text-muted-foreground shrink-0" />
                    Metode Pembayaran
                  </span>
                  <div className="flex items-center justify-end">
                    <Badge variant="outline" className={cn("text-[11px] font-medium py-0 px-2 h-5 gap-1.5 leading-none", paymentMethodInfo.color)}>
                      <paymentMethodInfo.icon className="size-3 shrink-0" />
                      <span>{paymentMethodInfo.label}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 2. FINANCIAL KPI CARDS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Total Omzet */}
                <div className="bg-card p-3.5 rounded-lg border border-border/80 shadow-2xs flex flex-col justify-between h-[76px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Total Belanja</span>
                    <DollarSign className="size-3.5 text-primary opacity-80" />
                  </div>
                  <p className="text-sm sm:text-base font-mono font-bold text-foreground truncate">
                    {formatCurrency(calculation.totalRevenue)}
                  </p>
                </div>

                {/* Card 2: Total HPP */}
                <div className="bg-card p-3.5 rounded-lg border border-border/80 shadow-2xs flex flex-col justify-between h-[76px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Total Modal (HPP)</span>
                    <Layers className="size-3.5 text-muted-foreground opacity-80" />
                  </div>
                  <p className="text-sm sm:text-base font-mono font-bold text-muted-foreground truncate">
                    {formatCurrency(calculation.totalCost)}
                  </p>
                </div>

                {/* Card 3: Total Laba */}
                <div className={cn(
                  "p-3.5 rounded-lg border shadow-2xs flex flex-col justify-between h-[76px] transition-colors",
                  isProfitPositive 
                    ? "bg-emerald-500/5 border-emerald-500/30" 
                    : "bg-destructive/5 border-destructive/30"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-foreground">Total Laba</span>
                    <TrendingUp className={cn("size-3.5", isProfitPositive ? "text-emerald-500" : "text-destructive")} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={cn(
                      "text-sm sm:text-base font-mono font-bold truncate",
                      isProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}>
                      {isProfitPositive ? "+" : ""}{formatCurrency(calculation.totalProfit)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0 font-semibold font-mono",
                        isProfitPositive 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {calculation.marginPercent >= 0 ? "+" : ""}{calculation.marginPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Card 4: Total Qty / Produk */}
                <div className="bg-card p-3.5 rounded-lg border border-border/80 shadow-2xs flex flex-col justify-between h-[76px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Rincian Barang</span>
                    <Package className="size-3.5 text-muted-foreground opacity-80" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm sm:text-base font-bold text-foreground">
                      {calculation.totalItemsCount}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Item ({calculation.totalUnitsCount} Qty)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. ITEM DETAILS TABLE */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="size-3.5 text-primary" />
                    <span>Rincian Produk & Laba per Item</span>
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground font-mono">
                    {calculation.items.length} jenis produk
                  </span>
                </div>

                <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
                        <TableHead className="w-[36px] text-center text-xs">#</TableHead>
                        <TableHead className="text-xs min-w-[170px]">Nama Produk</TableHead>
                        <TableHead className="text-center text-xs w-[100px]">Qty</TableHead>
                        <TableHead className="text-right text-xs">Harga Jual</TableHead>
                        <TableHead className="text-right text-xs">HPP Satuan</TableHead>
                        <TableHead className="text-right text-xs">Subtotal</TableHead>
                        <TableHead className="text-right text-xs min-w-[130px] font-semibold text-foreground">
                          Laba / Margin
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isFetchingDetail && calculation.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-28 text-center text-xs text-muted-foreground">
                            <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                            Memuat rincian produk...
                          </TableCell>
                        </TableRow>
                      ) : calculation.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                            Tidak ada rincian item pada transaksi ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        calculation.items.map((item: any, idx: number) => {
                          const isItemProfitPositive = item.itemProfit >= 0;
                          return (
                            <TableRow key={item.id || idx} className="hover:bg-muted/30 border-b border-border/40 last:border-0">
                              {/* No */}
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>

                              {/* Produk */}
                              <TableCell className="py-3">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                    <span>{item.productName}</span>
                                    {item.isBonus && (
                                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0 px-1">
                                        <Sparkles className="size-2.5 mr-0.5" /> Bonus
                                      </Badge>
                                    )}
                                    {item.isManualPrice && (
                                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 py-0 px-1">
                                        Harga Khusus
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                                    <span>{item.productCode}</span>
                                    <span>•</span>
                                    <span>{item.category}</span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Qty & Unit */}
                              <TableCell className="text-center font-mono text-xs">
                                <span className="font-bold text-foreground">{item.quantity}</span>
                                <span className="text-muted-foreground text-[11px] ml-1 uppercase">{item.unitName}</span>
                              </TableCell>

                              {/* Harga Jual */}
                              <TableCell className="text-right font-mono text-xs text-foreground">
                                {item.isBonus ? (
                                  <span className="line-through text-muted-foreground">Gratis</span>
                                ) : (
                                  formatCurrency(item.priceAtSale)
                                )}
                              </TableCell>

                              {/* HPP Satuan */}
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <span className="cursor-help">
                                          {formatCurrency(item.unitCost)}
                                        </span>
                                      }
                                    />
                                    <TooltipContent side="top" className="text-xs">
                                      <p className="font-medium">Sumber HPP: {item.costSource}</p>
                                      {item.batchAllocations?.length > 0 && (
                                        <div className="mt-1 text-[11px] space-y-0.5">
                                          {item.batchAllocations.map((b: any, bIdx: number) => (
                                            <div key={bIdx}>
                                              Alokasi {b.quantity} item @ {formatCurrency(Number(b.costPrice))}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                                {formatCurrency(item.itemRevenue)}
                              </TableCell>

                              {/* LABA & MARGIN PER ITEM */}
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className={cn(
                                    "font-mono font-bold text-xs",
                                    isItemProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                  )}>
                                    {isItemProfitPositive ? "+" : ""}{formatCurrency(item.itemProfit)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1 py-0 font-semibold font-mono",
                                      isItemProfitPositive 
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                    )}
                                  >
                                    {item.itemMargin >= 0 ? "+" : ""}{item.itemMargin.toFixed(1)}%
                                  </Badge>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 4. PAYMENT SUMMARY BOX */}
              <div className="p-3.5 bg-muted/25 rounded-lg border border-border/70 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-medium">Total Belanja Produk</span>
                  <span className="font-mono font-semibold text-foreground text-xs">{formatCurrency(calculation.totalRevenue)}</span>
                </div>

                {sale?.amountPaid !== undefined && Number(sale.amountPaid) > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-medium">Pembayaran Diterima (Bayar)</span>
                    <span className="font-mono font-semibold text-foreground text-xs">{formatCurrency(Number(sale.amountPaid))}</span>
                  </div>
                )}

                {sale?.changeAmount !== undefined && Number(sale.changeAmount) > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-medium">Uang Kembalian</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(Number(sale.changeAmount))}
                    </span>
                  </div>
                )}

                {sale?.notes && (
                  <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Catatan: </span>
                    <span>{sale.notes}</span>
                  </div>
                )}
              </div>

            </div>

            {/* DIALOG FOOTER (PERSIS IDENTIK DENGAN MODAL TAMBAH BARANG / EDIT PRODUK) */}
            <DialogFooter className="mt-6 -mx-6 -mb-6 px-6 py-4 flex flex-row items-center justify-between sm:justify-between border-t border-border bg-muted/50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintA4Invoice}
                >
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                  Cetak Nota Faktur
                </Button>
                <Button
                  type="button"
                  onClick={handlePrintReceiptThermal}
                  disabled={isPrintingThermal}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isPrintingThermal ? "Mencetak..." : "Cetak Struk Kasir"}
                </Button>
              </div>
            </DialogFooter>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
