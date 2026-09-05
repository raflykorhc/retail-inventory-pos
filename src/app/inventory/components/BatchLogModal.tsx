import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { toast } from "@/components/ui/toast";
import {
  Loader2,
  Package,
  History,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  CalendarDays,
  MoreVertical,
  Edit,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { BatchProfitReportModal } from "./BatchProfitReportModal";

interface BatchLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
}

export function BatchLogModal({ isOpen, onClose, product }: BatchLogModalProps) {
  const [activeTab, setActiveTab] = useState("batches");

  // Pagination States
  const [batchesPage, setBatchesPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const batchesLimit = 4;
  const logsLimit = 5;

  // State for Batch Price Adjustment Modal
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [reportBatch, setReportBatch] = useState<any | null>(null);
  const [costPriceInput, setCostPriceInput] = useState<string>("");
  const [sellingPriceInput, setSellingPriceInput] = useState<string>("");
  const [unitPricesInput, setUnitPricesInput] = useState<
    Array<{ unitId: string; unitName: string; conversionFactor?: number; price: string }>
  >([]);

  const queryClient = useQueryClient();

  const safeFormatDate = (dateVal: string | Date | undefined | null, fmt: string) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? "-" : format(d, fmt);
    } catch {
      return "-";
    }
  };

  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ["product-batches", product?.id],
    queryFn: async () => {
      const res = await axiosClient.get(`/products/${product?.id}/batches`);
      return res.data;
    },
    enabled: isOpen && !!product?.id && activeTab === "batches",
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["product-logs", product?.id],
    queryFn: async () => {
      const res = await axiosClient.get(`/products/${product?.id}/logs`);
      return res.data;
    },
    enabled: isOpen && !!product?.id && activeTab === "logs",
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, payload }: { batchId: string; payload: any }) => {
      const res = await axiosClient.put(`/products/batches/${batchId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Harga batch berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["product-batches", product?.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingBatch(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui harga batch");
    },
  });

  const batches = Array.isArray(batchesData?.data) ? batchesData.data : Array.isArray(batchesData) ? batchesData : [];
  const logs = Array.isArray(logsData?.items) ? logsData.items : Array.isArray(logsData?.data) ? logsData.data : Array.isArray(logsData) ? logsData : [];

  // Pagination Calculations
  const totalBatches = batches.length;
  const totalBatchesPages = Math.ceil(totalBatches / batchesLimit) || 1;
  const paginatedBatches = batches.slice((batchesPage - 1) * batchesLimit, batchesPage * batchesLimit);

  const totalLogs = logs.length;
  const totalLogsPages = Math.ceil(totalLogs / logsLimit) || 1;
  const paginatedLogs = logs.slice((logsPage - 1) * logsLimit, logsPage * logsLimit);

  const mainPriceObj = product?.prices?.reduce(
    (max: any, p: any) => (!max || p.conversionFactor > max.conversionFactor ? p : max),
    null
  );
  const mainFactor = mainPriceObj?.conversionFactor || 1;
  const mainUnitName = mainPriceObj?.unit?.name || "";

  const handleOpenEdit = (batch: any) => {
    setEditingBatch(batch);
    const initialCost = Math.round(batch.costPrice * mainFactor);
    const initialSelling = Math.round((batch.sellingPrice || 0) * mainFactor);
    setCostPriceInput(String(initialCost));
    setSellingPriceInput(String(initialSelling));

    const pricesSource =
      product?.prices && Array.isArray(product.prices) && product.prices.length > 0
        ? product.prices
        : [
            {
              unitId: batch.unitId || "default",
              unit: { name: mainUnitName || "Satuan" },
              conversionFactor: 1,
              price: initialSelling,
            },
          ];

    const pricesList = pricesSource.map((p: any) => {
      const existingBatchPrice = batch.batchPrices?.find((bp: any) => bp.unitId === p.unitId);
      const val = existingBatchPrice ? Math.round(existingBatchPrice.price) : Math.round(p.price || 0);
      return {
        unitId: p.unitId,
        unitName: p.unit?.name || mainUnitName || "Satuan",
        conversionFactor: p.conversionFactor || 1,
        price: String(val),
      };
    });
    setUnitPricesInput(pricesList);
  };

  const costVal = Number(costPriceInput) || 0;
  const sellingVal = Number(sellingPriceInput) || 0;

  const isCostInvalid = costVal <= 0;
  const isSellingInvalid = sellingVal <= 0;
  const isUnitPricesInvalid = unitPricesInput.some((u) => (Number(u.price) || 0) <= 0);

  const hasValidationError = isCostInvalid || isSellingInvalid || isUnitPricesInvalid;

  const isMarginNegative = unitPricesInput.some((u) => {
    const uVal = Number(u.price) || 0;
    const unitCost = Math.round((costVal / mainFactor) * (u.conversionFactor || 1));
    return uVal > 0 && unitCost > 0 && uVal < unitCost;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || hasValidationError) return;

    const costPriceInBase = costVal / mainFactor;
    const sellingPriceInBase = sellingVal / mainFactor;

    const payload: any = {
      costPrice: costPriceInBase,
      sellingPrice: sellingPriceInBase,
    };

    if (unitPricesInput.length > 0) {
      payload.batchPrices = unitPricesInput.map((u) => ({
        unitId: u.unitId,
        price: Number(u.price) || 0,
      }));
    }

    updateBatchMutation.mutate({ batchId: editingBatch.id, payload });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(val) => {
          if (!val) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setBatchesPage(1);
            setLogsPage(1);
          }} className="flex flex-col overflow-hidden w-full shrink min-h-0">
            <DialogHeader className="pt-6 px-6 pb-0 flex-shrink-0">
              <DialogTitle>Manajemen Batch & Log Stok</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {product?.name} {product?.code && `(${product.code})`}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pt-3 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="batches">Batches ({totalBatches})</TabsTrigger>
                <TabsTrigger value="logs">Log Stok ({totalLogs})</TabsTrigger>
              </TabsList>
            </div>

            <div className="overflow-y-auto px-6 pb-6 shrink min-h-0">
              <TabsContent value="batches" className="mt-0">
                <div className="space-y-3">
                  {isLoadingBatches ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/30 rounded-xl">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>Memuat data batch...</p>
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/30 rounded-xl">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p>Tidak ada data batch untuk produk ini.</p>
                    </div>
                  ) : (
                    <>
                      {paginatedBatches.map((batch: any) => {
                        const currentQty = batch.currentQuantity / mainFactor;
                        const initialQty = batch.initialQuantity / mainFactor;
                        const costPrice = Math.round(batch.costPrice * mainFactor);
                        const sellingPrice = Math.round((batch.sellingPrice || 0) * mainFactor);

                        const isHabis = batch.currentQuantity <= 0;

                        return (
                          <div
                            key={batch.id}
                            className={`rounded-xl border border-border/80 shadow-xs p-4 transition-all ${
                              isHabis ? "bg-muted/30 opacity-60 grayscale-[0.2]" : "bg-card text-card-foreground hover:border-primary/40"
                            }`}
                          >
                            <div className="grid grid-cols-3 items-center gap-2 pb-2.5 border-b border-border/40">
                              <div className="flex justify-start text-left min-w-0 overflow-hidden">
                                {batch.purchaseItem?.purchase ? (
                                  <span
                                    className="inline-flex items-center text-xs font-semibold text-foreground bg-secondary/80 text-secondary-foreground border border-border/60 px-2.5 py-0.5 rounded-md truncate max-w-full"
                                    title={batch.purchaseItem.purchase.supplier?.name || "Tanpa Pemasok"}
                                  >
                                    {batch.purchaseItem.purchase.supplier?.name || "Tanpa Pemasok"}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center text-xs font-semibold text-foreground bg-secondary/80 text-secondary-foreground border border-border/60 px-2.5 py-0.5 rounded-md truncate max-w-full"
                                    title={product?.supplier?.name || "Stok Awal"}
                                  >
                                    {product?.supplier?.name || "Stok Awal"}
                                  </span>
                                )}
                              </div>

                              <div className="flex justify-center items-center gap-1.5 min-w-0">
                                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                                  {safeFormatDate(batch.createdAt, "dd MMM yyyy, HH:mm")}
                                </span>
                              </div>

                              <div className="flex justify-end items-center gap-1.5 min-w-0">
                                {batch.currentQuantity > 0 ? (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                    Habis
                                  </span>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 p-0 rounded-md hover:bg-muted/80 focus-visible:outline-none"
                                        title="Menu Aksi Batch"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReportBatch(batch);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <TrendingUp className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                      <span>Laporan Laba Batch</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEdit(batch);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Edit className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                      <span>Edit Harga Batch</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 text-center pt-3">
                              <div className="flex flex-col items-center justify-center pr-1 border-r border-border/40 min-w-0">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  Sisa / Awal {mainUnitName && `(${mainUnitName})`}
                                </p>
                                <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                                  {currentQty} / {initialQty}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center px-1 border-r border-border/40 min-w-0">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">H. Modal</p>
                                <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                                  {new Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    maximumFractionDigits: 0,
                                  }).format(costPrice)}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center px-1 border-r border-border/40 min-w-0">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">H. Jual</p>
                                <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                                  {new Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    maximumFractionDigits: 0,
                                  }).format(sellingPrice)}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center pl-1 min-w-0">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Laba Terjual</p>
                                <p
                                  className={`font-bold text-xs sm:text-sm truncate ${
                                    (batch.realizedProfit || 0) > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : (batch.realizedProfit || 0) < 0
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {(batch.realizedProfit || 0) > 0 ? "+" : ""}
                                  {new Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    maximumFractionDigits: 0,
                                  }).format(batch.realizedProfit || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Shadcn UI Pagination for Batches */}
                      {totalBatchesPages > 1 && (
                        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                          <div>
                            Menampilkan {((batchesPage - 1) * batchesLimit) + 1} - {Math.min(batchesPage * batchesLimit, totalBatches)} dari {totalBatches} batch
                          </div>
                          <Pagination className="w-auto m-0 justify-end">
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => {
                                    if (batchesPage > 1) setBatchesPage(batchesPage - 1);
                                  }}
                                  className={cn("h-7 text-xs cursor-pointer", batchesPage <= 1 && "pointer-events-none opacity-50")}
                                />
                              </PaginationItem>
                              {Array.from({ length: totalBatchesPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalBatchesPages || Math.abs(p - batchesPage) <= 1)
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
                                          onClick={() => setBatchesPage(p)}
                                          isActive={batchesPage === p}
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
                                    if (batchesPage < totalBatchesPages) setBatchesPage(batchesPage + 1);
                                  }}
                                  className={cn("h-7 text-xs cursor-pointer", batchesPage >= totalBatchesPages && "pointer-events-none opacity-50")}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <div className="space-y-3">
                  {isLoadingLogs ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/30 rounded-xl">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>Memuat data log stok...</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/30 rounded-xl">
                      <History className="h-8 w-8 mb-2 opacity-50" />
                      <p>Tidak ada log stok untuk produk ini.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute top-4 bottom-4 left-[19px] w-px bg-border z-0" />
                        <div className="flex flex-col gap-6">
                          {paginatedLogs.map((log: any) => {
                            const logQty = log.quantity / mainFactor;
                            return (
                              <div key={log.id} className="relative z-10 flex items-center justify-between pl-[48px] pr-2">
                                <div className="absolute left-[7px] top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-popover">
                                  {log.type === "IN" ? (
                                    <ArrowDown className="w-5 h-5 text-emerald-500" />
                                  ) : log.type === "OUT" ? (
                                    <ArrowUp className="w-5 h-5 text-rose-500" />
                                  ) : (
                                    <RefreshCw className="w-5 h-5 text-blue-500" />
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 text-left">
                                  <span className="font-medium text-sm text-foreground/90">
                                    {log.reason || (log.type === "IN" ? "Stok Masuk" : log.type === "OUT" ? "Stok Keluar" : "Penyesuaian")}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5">
                                    {safeFormatDate(log.createdAt, "dd MMM yyyy, HH:mm")}
                                  </span>
                                </div>
                                <div className="text-right ml-4">
                                  <span
                                    className={`text-sm font-semibold ${
                                      log.type === "IN" ? "text-emerald-600" : log.type === "OUT" ? "text-rose-600" : "text-blue-600"
                                    }`}
                                  >
                                    {log.type === "IN" ? "+" : log.type === "OUT" ? "-" : ""}
                                    {Number.isInteger(logQty) ? logQty : logQty.toFixed(2)} <span className="text-xs">{mainUnitName}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Shadcn UI Pagination for Logs */}
                      {totalLogsPages > 1 && (
                        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground border-t border-border/40">
                          <div>
                            Menampilkan {((logsPage - 1) * logsLimit) + 1} - {Math.min(logsPage * logsLimit, totalLogs)} dari {totalLogs} log
                          </div>
                          <Pagination className="w-auto m-0 justify-end">
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => {
                                    if (logsPage > 1) setLogsPage(logsPage - 1);
                                  }}
                                  className={cn("h-7 text-xs cursor-pointer", logsPage <= 1 && "pointer-events-none opacity-50")}
                                />
                              </PaginationItem>
                              {Array.from({ length: totalLogsPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalLogsPages || Math.abs(p - logsPage) <= 1)
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
                                          onClick={() => setLogsPage(p)}
                                          isActive={logsPage === p}
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
                                    if (logsPage < totalLogsPages) setLogsPage(logsPage + 1);
                                  }}
                                  className={cn("h-7 text-xs cursor-pointer", logsPage >= totalLogsPages && "pointer-events-none opacity-50")}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Edit Harga per Batch */}
      <Dialog
        open={!!editingBatch}
        onOpenChange={(val) => {
          if (!val) setEditingBatch(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Edit Harga per Batch
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 max-h-[65vh] overflow-y-auto pr-1">
              {/* Banner Warning Margin Negatif */}
              {isMarginNegative && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>PERINGATAN: Potensi Margin Negatif</span>
                  </div>
                  <p className="leading-relaxed">
                    Terdapat harga jual yang berada di bawah HPP modal. Transaksi ini berpotensi menghasilkan margin negatif.
                  </p>
                </div>
              )}

              {/* Input Harga Modal / HPP Batch */}
              <div className="space-y-1.5 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Harga Modal / HPP ({mainUnitName || "Satuan Utama"})
                  </Label>
                  {isCostInvalid && (
                    <span className="text-[11px] text-destructive font-medium">
                      Harus lebih dari 0
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="number"
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    placeholder="Masukkan harga modal"
                    className={`pl-9 text-xs font-medium h-9 ${
                      isCostInvalid ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Harga modal/HPP awal per {mainUnitName || "satuan"}. Mengubah modal akan menyesuaikan estimasi HPP di bawah.
                </p>
              </div>

              {/* Multi-unit list (Harga Jual per Satuan) */}
              <div className="space-y-4">
                {unitPricesInput.map((uItem, idx) => {
                  const uVal = Number(uItem.price) || 0;
                  const unitCostPrice = Math.round((costVal / mainFactor) * (uItem.conversionFactor || 1));
                  const isUnitCostInvalid = unitCostPrice <= 0;
                  const isUnitSellingInvalid = uVal <= 0;
                  const isUnitMarginNegative = uVal > 0 && unitCostPrice > 0 && uVal < unitCostPrice;

                  return (
                    <div key={uItem.unitId} className="space-y-2 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          Harga Jual - {uItem.unitName}
                          {uItem.conversionFactor === 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                              Satuan Utama
                            </Badge>
                          )}
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          Estimasi HPP: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(unitCostPrice)}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                          Rp
                        </span>
                        <Input
                          type="number"
                          value={uItem.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUnitPricesInput((prev) =>
                              prev.map((item) => (item.unitId === uItem.unitId ? { ...item, price: val } : item))
                            );
                            if (uItem.conversionFactor === 1) {
                              setSellingPriceInput(val);
                            }
                          }}
                          placeholder="Masukkan harga jual"
                          className={`pl-9 text-xs font-medium h-9 ${
                            isUnitSellingInvalid || isUnitCostInvalid
                              ? "border-destructive focus-visible:ring-destructive"
                              : isUnitMarginNegative
                              ? "border-amber-500 focus-visible:ring-amber-500"
                              : ""
                          }`}
                        />
                      </div>

                      {isUnitMarginNegative && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Harga jual di bawah HPP modal ({new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(unitCostPrice)})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBatch(null)}
                disabled={updateBatchMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={hasValidationError || updateBatchMutation.isPending}
              >
                {updateBatchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal Laporan Laba Batch */}
      <BatchProfitReportModal
        isOpen={!!reportBatch}
        onClose={() => setReportBatch(null)}
        batchId={reportBatch?.id || null}
        product={product}
      />
    </>
  );
}
