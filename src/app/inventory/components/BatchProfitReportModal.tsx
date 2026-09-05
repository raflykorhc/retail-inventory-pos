import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Loader2,
  Search,
  Printer,
  AlertCircle,
  Receipt,
} from "lucide-react";
import axiosClient from "@/lib/axiosClient";

interface BatchProfitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string | null;
  product: any | null;
}

export function BatchProfitReportModal({
  isOpen,
  onClose,
  batchId,
  product,
}: BatchProfitReportModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const safeFormatDate = (dateVal: string | Date | undefined | null, fmt: string) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? "-" : format(d, fmt);
    } catch {
      return "-";
    }
  };

  const { data: batchData, isLoading, isError } = useQuery({
    queryKey: ["batch-profit-report", batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const res = await axiosClient.get(`/products/batches/${batchId}`);
      return res.data;
    },
    enabled: isOpen && !!batchId,
  });

  const mainPriceObj = product?.prices?.reduce(
    (max: any, p: any) => (!max || p.conversionFactor > max.conversionFactor ? p : max),
    null
  );
  const mainFactor = mainPriceObj?.conversionFactor || 1;
  const mainUnitName = mainPriceObj?.unit?.name || "Satuan";

  const sales = Array.isArray(batchData?.salesBreakdown) ? batchData.salesBreakdown : [];

  const filteredSales = sales.filter((item: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.invoiceNumber?.toLowerCase().includes(query) ||
      item.cashierName?.toLowerCase().includes(query) ||
      item.paymentMethod?.toLowerCase().includes(query)
    );
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const totalItems = filteredSales.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedSales = filteredSales.slice((page - 1) * limit, page * limit);

  const initialQty = (batchData?.initialQuantity || 0) / mainFactor;
  const currentQty = (batchData?.currentQuantity || 0) / mainFactor;
  const soldQty = Math.max(0, initialQty - currentQty);
  const soldPercent = initialQty > 0 ? Math.min(100, Math.round((soldQty / initialQty) * 100)) : 0;

  const costPrice = Math.round((batchData?.costPrice || 0) * mainFactor);
  const sellingPrice = Math.round((batchData?.sellingPrice || 0) * mainFactor);

  const realizedRevenue = batchData?.realizedRevenue || 0;
  const realizedCost = batchData?.realizedCost || 0;
  const realizedProfit = batchData?.realizedProfit || 0;
  const realizedMarginPercent = Number(batchData?.realizedMarginPercent) || 0;
  const potentialRemainingProfit = batchData?.potentialRemainingProfit || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="pt-5 px-6 pb-4 border-b border-border/80 flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Laporan Laba Per Batch
                {batchId && (
                  <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
                    #{batchId.slice(-6).toUpperCase()}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {product?.name} {product?.code && `(${product.code})`}
              </DialogDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 shrink min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin mb-2 text-primary" />
              <p className="text-xs font-medium">Memuat data laporan laba batch...</p>
            </div>
          ) : isError || !batchData ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-destructive/5 rounded-xl border border-destructive/20 p-4 text-center">
              <AlertCircle className="w-7 h-7 text-destructive mb-1.5" />
              <p className="text-xs font-semibold text-foreground">Gagal Memuat Detail Batch</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Data batch tidak ditemukan atau terjadi kesalahan server.
              </p>
            </div>
          ) : (
            <>
              {/* Metadata Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 border border-border/60 p-3 rounded-lg">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                    Pemasok / Sumber
                  </span>
                  <span className="font-semibold text-foreground truncate block mt-0.5">
                    {batchData.purchaseItem?.purchase?.supplier?.name ||
                      product?.supplier?.name ||
                      "Stok Awal"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                    Tanggal Dibuat
                  </span>
                  <span className="font-medium text-foreground block mt-0.5">
                    {safeFormatDate(batchData.createdAt, "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                    Modal Satuan ({mainUnitName})
                  </span>
                  <span className="font-medium text-foreground block mt-0.5">
                    {formatCurrency(costPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                    Harga Jual ({mainUnitName})
                  </span>
                  <span className="font-medium text-foreground block mt-0.5">
                    {formatCurrency(sellingPrice)}
                  </span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Omset */}
                <div className="bg-card p-3 rounded-lg border border-border/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Total Omset
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {formatCurrency(realizedRevenue)}
                  </p>
                </div>

                {/* HPP Terjual */}
                <div className="bg-card p-3 rounded-lg border border-border/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    HPP Terjual
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {formatCurrency(realizedCost)}
                  </p>
                </div>

                {/* Laba Realisasi */}
                <div
                  className={`p-3 rounded-lg border shadow-2xs ${
                    realizedProfit >= 0
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-destructive/5 border-destructive/30"
                  }`}
                >
                  <span className="text-[11px] font-medium text-foreground block">
                    Laba Realisasi
                  </span>
                  <div className="flex items-baseline gap-1 flex-wrap mt-1">
                    <p
                      className={`text-sm font-bold ${
                        realizedProfit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(realizedProfit)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 font-semibold ${
                        realizedProfit >= 0
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {realizedMarginPercent >= 0 ? "+" : ""}
                      {realizedMarginPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Potensi Laba Sisa */}
                <div className="bg-card p-3 rounded-lg border border-border/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Potensi Laba Sisa
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {formatCurrency(potentialRemainingProfit)}
                  </p>
                </div>
              </div>

              {/* Progress & Stock Status */}
              <div className="bg-card border border-border/80 p-3.5 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-foreground font-semibold">
                    Konsumsi Stok Batch
                  </span>
                  <span className="text-muted-foreground font-semibold">
                    {soldQty} / {initialQty} {mainUnitName} ({soldPercent}% Terjual)
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${soldPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                  <span>Stok Awal: {initialQty} {mainUnitName}</span>
                  <span>Sisa Stok: <strong className="text-foreground">{currentQty} {mainUnitName}</strong></span>
                </div>
              </div>

              {/* Sales Receipts / Nota-Nota Section */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Daftar Nota Penjualan
                    </h3>
                    <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0">
                      {sales.length} Nota
                    </Badge>
                  </div>

                  {/* Search Bar */}
                  {sales.length > 0 && (
                    <div className="relative w-44 sm:w-52">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cari No. Nota / Kasir..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-8 h-7 text-xs bg-card"
                      />
                    </div>
                  )}
                </div>

                {sales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-lg text-center">
                    <Receipt className="w-7 h-7 mb-1.5 opacity-40" />
                    <p className="text-xs font-semibold">Belum Ada Transaksi Nota</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                      Stok pada batch ini belum pernah terpotong oleh nota penjualan apapun.
                    </p>
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-muted/20 border border-border rounded-lg text-center">
                    <Search className="w-5 h-5 mb-1 opacity-40" />
                    <p className="text-xs font-semibold">Nota Tidak Ditemukan</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tidak ada nota yang cocok dengan kata kunci "{searchQuery}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border border-border/80 rounded-lg overflow-hidden shadow-2xs">
                      <div className="overflow-x-hidden">
                        <table className="w-full text-[11px] text-left border-collapse table-fixed">
                          <thead>
                            <tr>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-2 text-[10px] uppercase tracking-wider w-[19%]">
                                No. Nota
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-1.5 text-[10px] uppercase tracking-wider w-[14%]">
                                Waktu
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-1.5 text-[10px] uppercase tracking-wider w-[12%]">
                                Kasir
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-1.5 text-right text-[10px] uppercase tracking-wider w-[10%]">
                                Qty
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-1.5 text-right text-[10px] uppercase tracking-wider w-[14%]">
                                Omset
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-1.5 text-right text-[10px] uppercase tracking-wider w-[15%]">
                                HPP
                              </th>
                              <th className="bg-secondary text-secondary-foreground font-semibold border-b border-border/80 py-2 px-2 text-right text-[10px] uppercase tracking-wider w-[16%]">
                                Laba Item
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 bg-card">
                            {paginatedSales.map((item: any) => {
                              const isProfit = item.allocProfit >= 0;
                              const isDifferentUnit =
                                item.unitName &&
                                mainUnitName &&
                                item.unitName.trim().toLowerCase() !== mainUnitName.trim().toLowerCase();
                              const convertedBaseQty =
                                mainFactor > 0
                                  ? Math.round((item.baseQuantity / mainFactor) * 100) / 100
                                  : item.baseQuantity;
                              const marginPercentVal = Number(item.marginPercent) || 0;

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-muted/40 transition-colors text-foreground"
                                >
                                  <td className="py-2 px-2 font-semibold font-mono text-[11px] text-primary overflow-hidden">
                                    <div className="flex items-center gap-1 min-w-0" title={item.invoiceNumber}>
                                      <span className="truncate block flex-1">
                                        {item.invoiceNumber}
                                      </span>
                                      {item.isBonus && (
                                        <Badge
                                          variant="outline"
                                          className="shrink-0 text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20"
                                        >
                                          Bonus
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-1.5 text-muted-foreground whitespace-nowrap text-[11px]">
                                    {safeFormatDate(item.createdAt, "dd MMM, HH:mm")}
                                  </td>
                                  <td className="py-2 px-1.5 text-muted-foreground whitespace-nowrap">
                                    <span className="truncate max-w-[85px] block" title={item.cashierName}>
                                      {item.cashierName}
                                    </span>
                                  </td>
                                  <td className="py-2 px-1.5 text-right font-medium whitespace-nowrap">
                                    <span>
                                      {item.saleQuantity} {item.unitName}
                                    </span>
                                    {isDifferentUnit && (
                                      <span className="block text-[10px] text-muted-foreground font-normal">
                                        ({convertedBaseQty} {mainUnitName})
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-1.5 text-right font-medium whitespace-nowrap">
                                    {formatCurrency(item.allocRevenue)}
                                  </td>
                                  <td className="py-2 px-1.5 text-right text-muted-foreground whitespace-nowrap">
                                    {formatCurrency(item.allocCost)}
                                  </td>
                                  <td className="py-2 px-2 text-right whitespace-nowrap">
                                    <span
                                      className={`font-semibold block ${
                                        isProfit
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-destructive"
                                      }`}
                                    >
                                      {isProfit ? "+" : ""}
                                      {formatCurrency(item.allocProfit)}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground">
                                      Margin {marginPercentVal.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Shadcn UI Pagination (Identik dengan Inventory Page) */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-1 pt-1.5 text-xs text-muted-foreground">
                        <div>
                          Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, totalItems)} dari {totalItems} nota
                        </div>
                        <Pagination className="w-auto m-0 justify-end">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => {
                                  if (page > 1) setPage(page - 1);
                                }}
                                className={cn("h-7 text-xs cursor-pointer", page <= 1 && "pointer-events-none opacity-50")}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                              .map((p, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && p - prev > 1;
                                return (
                                  <React.Fragment key={p}>
                                    {showEllipsis && (
                                      <PaginationItem>
                                        <PaginationEllipsis className="h-7" />
                                      </PaginationItem>
                                    )}
                                    <PaginationItem>
                                      <PaginationLink
                                        onClick={() => setPage(p)}
                                        isActive={page === p}
                                        className="h-7 w-7 text-xs cursor-pointer"
                                      >
                                        {p}
                                      </PaginationLink>
                                    </PaginationItem>
                                  </React.Fragment>
                                );
                              })}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (page < totalPages) setPage(page + 1);
                                }}
                                className={cn("h-7 text-xs cursor-pointer", page >= totalPages && "pointer-events-none opacity-50")}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
