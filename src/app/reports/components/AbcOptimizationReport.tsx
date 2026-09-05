"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { TableVirtuoso } from "react-virtuoso";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  Calendar,
  FileSpreadsheet,
  Filter,
  Check,
  ArrowRight,
  Workflow,
  MoreVertical,
  Edit
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { type DateRange } from "react-day-picker";

import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, PackageSearch } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import axiosClient from "@/lib/axiosClient";
import { useAuthStore } from "@/store/useAuthStore";
import { CalculationProcessModal } from "./CalculationProcessModal";
import { GlobalSettingsModal } from "./GlobalSettingsModal";

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
  averageDailyDemand: number;
  totalUsageValue: number;
  individualPercentage: number;
  cumulativePercentage: number;
  newAbcCategory: "A" | "B" | "C" | null;
  suggestedMin: number;
  suggestedMax: number;
  currentHoldingInterval: number | null;
  mainConversionFactor: number;
  mainUnitName: string;
  safetyStockDays: number;
  warehouseCapacity?: number | null;
  hasChanged: boolean;
}

// Helper: konversi dari base unit ke satuan terbesar untuk tampilan
const toMainUnit = (baseValue: number, factor: number): number =>
  Math.ceil(baseValue / (factor || 1));

const getRelativeTime = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return `${diffInSeconds}d lalu`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}j lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}h lalu`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}bln lalu`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} thn lalu`;
};

const getAbcConfig = (limitA: number, limitB: number) => ({
  A: {
    label: "Kategori A",
    badge: "A",
    color: "text-[#F1416C]",
    bg: "bg-[#F1416C]/10 dark:bg-[#F1416C]/15",
    border: "border-[#F1416C]/20 dark:border-[#F1416C]/30",
    pillBg: "bg-[#F1416C]/15 text-[#F1416C]",
    desc: `0 - ${limitA}% Nilai Penjualan`
  },
  B: {
    label: "Kategori B",
    badge: "B",
    color: "text-[#F79417]",
    bg: "bg-[#F79417]/10 dark:bg-[#F79417]/15",
    border: "border-[#F79417]/20 dark:border-[#F79417]/30",
    pillBg: "bg-[#F79417]/15 text-[#F79417]",
    desc: `${limitA} - ${limitB}% Nilai Penjualan`
  },
  C: {
    label: "Kategori C",
    badge: "C",
    color: "text-[#50CD89]",
    bg: "bg-[#50CD89]/10 dark:bg-[#50CD89]/15",
    border: "border-[#50CD89]/20 dark:border-[#50CD89]/30",
    pillBg: "bg-[#50CD89]/15 text-[#50CD89]",
    desc: `${limitB} - 100% Nilai Penjualan`
  }
});

const ABC_COLORS = {
  A: {
    color: "text-[#F1416C]",
    bg: "bg-[#F1416C]/10 dark:bg-[#F1416C]/15",
    border: "border-[#F1416C]/20 dark:border-[#F1416C]/30",
  },
  B: {
    color: "text-[#F79417]",
    bg: "bg-[#F79417]/10 dark:bg-[#F79417]/15",
    border: "border-[#F79417]/20 dark:border-[#F79417]/30",
  },
  C: {
    color: "text-[#50CD89]",
    bg: "bg-[#50CD89]/10 dark:bg-[#50CD89]/15",
    border: "border-[#50CD89]/20 dark:border-[#50CD89]/30",
  }
};

const AbcBadge = ({ category }: { category: "A" | "B" | "C" | null }) => {
  if (!category) return <span className="text-[10px] text-muted-foreground font-mono">—</span>;
  const cfg = ABC_COLORS[category] || ABC_COLORS.C;
  return (
    <span className={cn("px-2 py-0.5 rounded text-[11px] font-bold border inline-flex items-center", cfg.color, cfg.bg, cfg.border)}>
      {category}
    </span>
  );
};

const formatDate = (isoString: string | null) => {
  if (!isoString) return "Belum pernah";
  try {
    const d = new Date(isoString);
    return format(d, "dd MMM yyyy, HH:mm", { locale: idLocale });
  } catch {
    return "Format salah";
  }
};

export function AbcOptimizationReport() {
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyMinStock, setApplyMinStock] = useState(true);
  const [applyMaxStock, setApplyMaxStock] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterChanged, setFilterChanged] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [calculationStep, setCalculationStep] = useState(0);
  const [activeSubtask, setActiveSubtask] = useState(0);
  const [isLiveCalculating, setIsLiveCalculating] = useState(false);

  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; leadTime: number; holdingInterval: number | null; safetyStockDays: number | string; warehouseCapacity: number | null } | null>(null);
  const [isSavingParams, setIsSavingParams] = useState(false);


  const [timeRange, setTimeRange] = useState("90d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 90)),
    to: new Date(),
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const res = await axiosClient.get("/settings");
      return res.data;
    }
  });

  const limitA = settings?.abcLimitA ?? 80;
  const limitB = settings?.abcLimitB ?? 95;
  const ABC_CONFIG = getAbcConfig(limitA, limitB);

  const fetchLastStatePage = async ({ pageParam = "" }) => {
    const res = await axiosClient.get("/inventory-optimization/last-state", {
      params: {
        cursor: pageParam || undefined,
        limit: 30,
        search: searchQuery || undefined,
        filterCategory: filterCategory !== "ALL" ? filterCategory : undefined,
        changedOnly: filterChanged,
      }
    });
    return res.data;
  };

  const {
    data: queryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ["abcOptimization", searchQuery, filterCategory, filterChanged],
    queryFn: fetchLastStatePage,
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const displayedResults = useMemo(() => {
    return queryData?.pages.flatMap(page => page.data) || [];
  }, [queryData]);

  const abcSummary = useMemo(() => {
    return queryData?.pages[0]?.summary || {
      A: { count: 0, totalValue: 0 },
      B: { count: 0, totalValue: 0 },
      C: { count: 0, totalValue: 0 },
      totalValue: 0,
      totalCount: 0,
      changedCount: 0
    };
  }, [queryData]);

  const flatData = useMemo(() => {
    const result: { type: 'main' | 'detail', product: OptimizationResult }[] = [];
    displayedResults.forEach(r => {
      result.push({ type: 'main', product: r });
      if (expandedRows.has(r.productId)) {
        result.push({ type: 'detail', product: r });
      }
    });
    return result;
  }, [displayedResults, expandedRows]);

  const lastAutoRun = queryData?.pages[0]?.lastAutoRun || null;
  const lastManualRun = queryData?.pages[0]?.lastManualRun || null;
  const lastCalculationRun = queryData?.pages[0]?.lastCalculationRun || null;

  // Generate Date Filters
  const dateParams = useMemo(() => {
    if (timeRange === "custom" && customDateRange?.from) {
      const startDate = customDateRange.from.toISOString().split("T")[0];
      const endDate = (customDateRange.to || customDateRange.from).toISOString().split("T")[0];
      return { startDate, endDate };
    }

    let months = 3;
    if (timeRange === "30d") months = 1;
    if (timeRange === "90d") months = 3;
    if (timeRange === "180d") months = 6;
    if (timeRange === "365d") months = 12;

    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDateObj = new Date(today);
    startDateObj.setMonth(startDateObj.getMonth() - months);
    const startDate = startDateObj.toISOString().split("T")[0];

    return { startDate, endDate, monthsRange: months };
  }, [timeRange, customDateRange]);

  const fetchCalculation = useCallback(async () => {
    setIsProcessModalOpen(true);
    setIsLiveCalculating(true);
    setCalculationStep(1);
    setActiveSubtask(0);

    try {
      const params = new URLSearchParams();

      if (dateParams.startDate && dateParams.endDate) {
        params.append("startDate", dateParams.startDate);
        params.append("endDate", dateParams.endDate);
      }
      if (dateParams.monthsRange) {
        params.append("monthsRange", dateParams.monthsRange.toString());
      }
      
      const token = useAuthStore.getState().token || "";
      if (token) {
        params.append("token", token); // some SSE endpoints need token in query param
      }

      // We'll use fetch manually to read stream, or use EventSource.
      // fetch provides more control over headers (e.g. Authorization)
      const url = `${axiosClient.defaults.baseURL || '/api'}/inventory-optimization/preview-stream?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok || !res.body) throw new Error(`Failed to connect to stream: ${res.status} ${res.statusText}. URL: ${url}`);
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            if (part.startsWith("data: ")) {
              const dataStr = part.replace("data: ", "");
              try {
                const data = JSON.parse(dataStr);
                
                if (data.step !== undefined) {
                  setCalculationStep(data.step);
                  setActiveSubtask(data.subtaskIndex);
                }
                
                if (data.success !== undefined) {
                  // This is the final result
                  if (data.success) {
                    setCalculationStep(5);
                    toast.success("Kalkulasi Berhasil Diperbarui", {
                      description: `${data.total || 0} produk berhasil dianalisis.`
                    });
                    setSelectedIds(new Set());
                    refetch();
                  } else {
                    throw new Error(data.message);
                  }
                }
              } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes("JSON")) {
                   throw e; // Rethrow actual backend errors
                }
                console.error("Failed to parse SSE data", e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      toast.error("Gagal melakukan kalkulasi", {
        description: err.message || "Terjadi kesalahan pada server."
      });
      setIsProcessModalOpen(false);
    } finally {
      setIsLiveCalculating(false);
    }
  }, [dateParams, refetch]);

  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingParams(true);
    try {
      await axiosClient.put(`/products/${editingProduct.id}`, {
        leadTime: editingProduct.leadTime,
        holdingInterval: editingProduct.holdingInterval,
        safetyStockDays: editingProduct.safetyStockDays === "" ? 1 : Number(editingProduct.safetyStockDays),
        warehouseCapacity: editingProduct.warehouseCapacity,
      });
      toast.success("Parameter Tersimpan", {
        description: "Silakan jalankan 'Hitung Ulang' untuk memperbarui rekomendasi.",
      });
      setEditingProduct(null);
    } catch (error: any) {
      toast.error("Gagal Menyimpan", {
        description: error.response?.data?.error || "Terjadi kesalahan",
      });
    } finally {
      setIsSavingParams(false);
    }
  };

  // Terapkan Reklasifikasi
  const handleApply = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Pilih Produk", {
        description: "Silakan pilih minimal 1 produk untuk diperbarui."
      });
      return;
    }

    setIsApplying(true);
    try {
      // Karena pagination, selectedIds mungkin berisi ID yang belum diload di displayedResults.
      // Ambil seluruh data dari server untuk mendapatkan detail lengkap produk yang dipilih
      const stateRes = await axiosClient.get("/inventory-optimization/last-state", {
        params: {
          limit: 100000,
          search: searchQuery || undefined,
          filterCategory: filterCategory !== "ALL" ? filterCategory : undefined,
          changedOnly: filterChanged,
        }
      });
      const allData = stateRes.data.data || [];

      const selectedOptimizations = allData
        .filter((r: any) => selectedIds.has(r.productId))
        .map((r: any) => ({
          productId: r.productId,
          newAbcCategory: r.newAbcCategory,
          suggestedMin: r.suggestedMin,
          suggestedMax: r.suggestedMax
        }));

      if (selectedOptimizations.length === 0) {
        toast.error("Gagal menerapkan", { description: "Data produk terpilih tidak ditemukan." });
        setIsApplying(false);
        return;
      }

      const res = await axiosClient.post("/inventory-optimization/apply", {
        optimizations: selectedOptimizations,
        applyMinStock,
        applyMaxStock
      });

      if (res.data.success) {
        toast.success("Klasifikasi ABC & Min-Max Diperbarui", {
          description: `${res.data.updatedCount} produk berhasil diperbarui di database.`
        });
        setSelectedIds(new Set());
        refetch();
      }
    } catch (err: any) {
      toast.error("Gagal Menerapkan Reklasifikasi", {
        description: err.response?.data?.message || "Terjadi kesalahan saat menyimpan."
      });
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = abcSummary.totalCount > 0 && selectedIds.size === abcSummary.totalCount;

  const toggleAll = async () => {
    if (isAllSelected || selectedIds.size > 0) {
      // Unselect all if currently all or partially selected
      setSelectedIds(new Set());
    } else {
      // Fetch all matching data and select them
      toast.info("Memilih semua produk...");
      try {
        const res = await axiosClient.get("/inventory-optimization/last-state", {
          params: {
            limit: 100000,
            search: searchQuery || undefined,
            filterCategory: filterCategory !== "ALL" ? filterCategory : undefined,
            changedOnly: filterChanged,
          }
        });
        if (res.data.success) {
          const allIds = res.data.data.map((r: any) => r.productId);
          setSelectedIds(new Set(allIds));
          toast.success(`${allIds.length} produk dipilih`);
        }
      } catch (err) {
        toast.error("Gagal memilih semua produk");
      }
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportExcel = async () => {
    try {
      toast.info("Mengambil seluruh data untuk diekspor...");
      const res = await axiosClient.get("/inventory-optimization/last-state", {
        params: {
          limit: 100000,
          search: searchQuery || undefined,
          filterCategory: filterCategory !== "ALL" ? filterCategory : undefined,
          changedOnly: filterChanged,
        }
      });
      const exportData = res.data.data;
      if (!exportData || exportData.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }

      const exportRows = exportData.map((r: any, index: number) => ({
        "No": index + 1,
        "Kode Produk": r.productCode,
        "Nama Produk": r.productName,
        "Kategori Lama": r.currentAbcCategory || "-",
        "Kategori Baru": r.newAbcCategory,
        "Nilai HPP (FIFO)": r.totalUsageValue,
        "Kontribusi (%)": r.individualPercentage,
        "Kumulatif (%)": r.cumulativePercentage,
        "Avg. Daily Demand": r.averageDailyDemand,
        "Lead Time (Hari)": r.leadTime,
        "Stok Saat Ini": `${toMainUnit(r.currentStock, r.mainConversionFactor)} ${r.mainUnitName}`,
        "Min Lama": `${toMainUnit(r.currentMinStock, r.mainConversionFactor)} ${r.mainUnitName}`,
        "Rec. Min": `${toMainUnit(r.suggestedMin, r.mainConversionFactor)} ${r.mainUnitName}`,
        "Rec. Max": `${toMainUnit(r.suggestedMax, r.mainConversionFactor)} ${r.mainUnitName}`,
        "Satuan": r.mainUnitName,
        "Status": r.hasChanged ? "Berubah" : "Tetap"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Klasifikasi ABC");

      const dateTag = format(new Date(), "yyyy-MM-dd");
      XLSX.writeFile(workbook, `Laporan_Klasifikasi_ABC_${dateTag}.xlsx`);

      toast.success("Excel Berhasil Diunduh");
    } catch (e) {
      toast.error("Gagal mengekspor data");
    }
  };

  const virtuosoComponents = useMemo(() => ({
    Table: (props: any) => <table {...props} className="w-full text-left border-collapse text-xs table-fixed" />,
    TableHead: React.forwardRef<HTMLTableSectionElement>((props: any, ref) => <thead {...props} ref={ref} className="bg-card border-b border-border/60 text-[11px] text-muted-foreground font-semibold" />),
    TableBody: React.forwardRef<HTMLTableSectionElement>((props: any, ref) => <tbody {...props} ref={ref} className="divide-y divide-border/40" />),
    TableRow: (props: any) => {
      const { children, context, ...rest } = props;
      const index = props["data-index"];
      const item = context.flatData[index];
      if (!item) return <tr {...rest} />;

      if (item.type === 'detail') {
        return <tr {...rest} className="bg-muted/15 border-b border-border/60">{children}</tr>;
      }

      const r = item.product;
      const isSelected = context.selectedIds.has(r.productId);
      
      return (
        <tr {...rest} 
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input')) return;
            context.toggleRowExpand(r.productId);
          }}
          className={cn(
            "hover:bg-muted/30 transition-colors border-b border-border/40 cursor-pointer",
            isSelected && "bg-primary/[0.03]"
          )}>
          {children}
        </tr>
      );
    }
  }), []);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Klasifikasi ABC & Stok Min-Max
            </h2>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 bg-background shadow-2xs gap-1.5 text-xs font-medium"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="size-3.5 text-muted-foreground shrink-0" />
              Setting
            </Button>

            <Select
              value={timeRange}
              onValueChange={(val: any) => {
                if (val) setTimeRange(typeof val === "string" ? val : val.value);
              }}
              items={[
                { label: "1 Bulan (30 Hari)", value: "30d" },
                { label: "3 Bulan (90 Hari)", value: "90d" },
                { label: "6 Bulan (180 Hari)", value: "180d" },
                { label: "1 Tahun (365 Hari)", value: "365d" },
                { label: "Rentang Kustom", value: "custom" },
              ]}
            >
              <SelectTrigger className="w-[155px] bg-background shadow-2xs h-8 text-xs font-medium">
                <Calendar className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">1 Bulan (30 Hari)</SelectItem>
                <SelectItem value="90d">3 Bulan (90 Hari)</SelectItem>
                <SelectItem value="180d">6 Bulan (180 Hari)</SelectItem>
                <SelectItem value="365d">1 Tahun (365 Hari)</SelectItem>
                <SelectItem value="custom">Rentang Kustom</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === "custom" && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 justify-start text-xs font-normal bg-background shadow-2xs gap-1.5"
                    >
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "dd MMM yyyy", { locale: idLocale })} -{" "}
                            {format(customDateRange.to, "dd MMM yyyy", { locale: idLocale })}
                          </>
                        ) : (
                          format(customDateRange.from, "dd MMM yyyy", { locale: idLocale })
                        )
                      ) : (
                        <span>Pilih Tanggal</span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="end">
                  <UICalendar
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}


            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCalculation}
              disabled={isLoading}
              className="h-8 px-3 gap-1.5 text-xs font-medium shadow-2xs bg-background hover:bg-accent"
            >
              <RefreshCw className={cn("size-3.5 text-muted-foreground", isLoading && "animate-spin text-primary")} />
              <span>{isLoading ? "Menghitung..." : `Hitung Ulang (${getRelativeTime(lastCalculationRun)})`}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={abcSummary.totalCount === 0}
              className="h-8 px-2.5 gap-1.5 shadow-2xs border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium text-xs"
            >
              <FileSpreadsheet className="size-3.5" />
              <span>Excel</span>
            </Button>
          </div>
        </div>        {/* ========================================================================= */}
        {/* SUMMARY CARDS KATEGORI A, B, C */}
        {/* ========================================================================= */}
        {(() => {
          const totalVal = abcSummary.totalValue || 0;
          const shareA = totalVal > 0 ? Math.round((abcSummary.A.totalValue / totalVal) * 100) : 0;
          const shareB = totalVal > 0 ? Math.round((abcSummary.B.totalValue / totalVal) * 100) : 0;
          const shareC = totalVal > 0 ? Math.max(0, 100 - shareA - shareB) : 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["A", "B", "C"] as const).map((cat) => {
                const cfg = ABC_CONFIG[cat];
                const data = abcSummary[cat];
                const share = cat === "A" ? shareA : cat === "B" ? shareB : shareC;
                const isFilterActive = filterCategory === cat;

                return (
                  <div
                    key={cat}
                    onClick={() => setFilterCategory(isFilterActive ? "ALL" : cat)}
                    className={cn(
                      "border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs cursor-pointer select-none group",
                      isFilterActive && "ring-2 ring-primary border-primary bg-primary/[0.03]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.2 rounded font-bold font-mono text-[11px] border", cfg.color, cfg.bg, cfg.border)}>
                          {cat}
                        </span>
                        <span>{cfg.label}</span>
                      </span>
                      <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold font-mono", cfg.color, cfg.bg, cfg.border)}>
                        <span>{share}% Nilai</span>
                      </div>
                    </div>

                    <div className="mt-2 mb-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-foreground">
                          {data.count} <span className="text-xs font-normal text-muted-foreground">Produk</span>
                        </div>
                        <div className="text-right font-mono font-bold text-sm text-foreground">
                          {formatCurrency(data.totalValue)}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {cfg.desc}
                    </p>

                    {/* Stacked 3-Color Progress Bar (Focused Category Highlighted, Non-Target Dimmed) */}
                    <div className="mt-3.5 w-full bg-muted/50 h-2 rounded-full overflow-hidden flex shadow-2xs">
                      {shareA > 0 && (
                        <div
                          className={cn(
                            "h-full bg-[#F1416C] transition-all duration-500",
                            cat === "A" ? "opacity-100" : "opacity-15 dark:opacity-20"
                          )}
                          style={{ width: `${shareA}%` }}
                          title={`Kategori A: ${shareA}% Nilai`}
                        />
                      )}
                      {shareB > 0 && (
                        <div
                          className={cn(
                            "h-full bg-[#F79417] transition-all duration-500",
                            cat === "B" ? "opacity-100" : "opacity-15 dark:opacity-20"
                          )}
                          style={{ width: `${shareB}%` }}
                          title={`Kategori B: ${shareB}% Nilai`}
                        />
                      )}
                      {shareC > 0 && (
                        <div
                          className={cn(
                            "h-full bg-[#50CD89] transition-all duration-500",
                            cat === "C" ? "opacity-100" : "opacity-15 dark:opacity-20"
                          )}
                          style={{ width: `${shareC}%` }}
                          title={`Kategori C: ${shareC}% Nilai`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* TABEL HASIL ANALISIS & REKLASIFIKASI */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
          
          {/* TOOLBAR */}
          <div className="p-3 border-b border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 bg-card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-60">
                <Input
                  placeholder="Cari kode atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background h-8 text-xs pl-8 shadow-2xs"
                />
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>

              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterChanged}
                  onChange={(e) => setFilterChanged(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-3.5"
                />
                <span>Hanya yang berubah ({abcSummary.changedCount})</span>
              </label>

            </div>

            {/* Reklasifikasi Action Group */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground mr-1">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyMinStock}
                    onChange={(e) => setApplyMinStock(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>Update Min Stock</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyMaxStock}
                    onChange={(e) => setApplyMaxStock(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-3.5"
                  />
                  <span>Update Max Stock</span>
                </label>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={isApplying || selectedIds.size === 0}
                className="h-8 px-3 gap-1.5 shadow-2xs font-semibold text-xs transition-transform active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Zap className={cn("size-3.5", isApplying && "animate-spin")} />
                <span>{isApplying ? "Menerapkan..." : `Terapkan (${selectedIds.size}) • ${getRelativeTime(lastManualRun || lastAutoRun)}`}</span>
              </Button>
            </div>
          </div>

          {/* VIRTUALIZED TABLE */}
          <div className="w-full relative" style={{ height: "60vh" }}>
            {isLoading && displayedResults.length === 0 ? (
               <div className="p-4 space-y-4">
                 {Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-10 w-full" />)}
               </div>
            ) : displayedResults.length === 0 ? (
                <Empty className="h-full">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PackageSearch className="size-5 text-muted-foreground stroke-[1.75]" />
                    </EmptyMedia>
                    <EmptyTitle>Tidak Ada Data Produk</EmptyTitle>
                    <EmptyDescription>
                      Tidak ada data produk yang cocok dengan pencarian atau filter yang dipilih.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
            ) : (
              <TableVirtuoso
                data={flatData}
                context={{ flatData, selectedIds, toggleRowExpand }}
                computeItemKey={(index, item) => `${item.product.productId}-${item.type}`}
                components={virtuosoComponents}
                endReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                fixedHeaderContent={() => (
                  <tr className="bg-card">
                    <th className="px-2 py-2.5 w-10 text-center bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">
                      <button
                        onClick={toggleAll}
                        className={cn(
                          "size-4 rounded border flex items-center justify-center transition-colors mx-auto",
                          isAllSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : selectedIds.size > 0
                              ? "bg-primary border-primary text-primary-foreground" // Indeterminate look
                              : "border-border/80 bg-card"
                        )}
                      >
                        {isAllSelected && <Check className="size-3 stroke-[3]" />}
                        {!isAllSelected && selectedIds.size > 0 && <div className="w-2 h-0.5 bg-current rounded-full" />}
                      </button>
                    </th>
                    <th className="px-2 py-2.5 w-10 text-center bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">No</th>
                    <th className="px-2 py-2.5 bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Produk</th>
                    <th className="px-2 py-2.5 text-center w-20 bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Kategori</th>
                    <th className="px-2 py-2.5 text-right w-[110px] bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Nilai HPP (FIFO)</th>
                    <th className="px-2 py-2.5 text-right w-[80px] bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Kumulatif</th>
                    <th className="px-2 py-2.5 text-right w-[90px] bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Avg Demand</th>
                    <th className="px-2 py-2.5 text-right w-[70px] bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Lead Time</th>
                    <th className="px-2 py-2.5 text-right w-[80px] bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Stok Fisik</th>
                    <th className="px-2 py-2.5 text-right w-[80px] font-bold text-foreground bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Rec. Min</th>
                    <th className="px-2 py-2.5 text-right w-[80px] font-bold text-primary bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]">Rec. Max</th>
                    <th className="px-2 py-2.5 w-10 bg-card z-10 border-b border-border/60 shadow-[0_1px_0_hsl(var(--border))]"></th>
                  </tr>
                )}
                itemContent={(index, item) => {
                  const r = item.product;
                  const minMain = toMainUnit(r.suggestedMin, r.mainConversionFactor);
                  const currentMinMain = toMainUnit(r.currentMinStock, r.mainConversionFactor);
                  const stockMain = toMainUnit(r.currentStock, r.mainConversionFactor);
                  const maxMain = toMainUnit(r.suggestedMax, r.mainConversionFactor);
                  
                  if (item.type === 'detail') {
                    return (
                      <td colSpan={12} className="pl-10 pr-5 py-4 border-b border-border/40 bg-muted/10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          
                          <div className="p-2.5 rounded bg-neutral-50/50 dark:bg-neutral-900/50 border border-border/50 space-y-0.5 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Penjualan Rata-rata
                              </span>
                              <p className="font-semibold text-foreground">
                                {r.averageDailyDemand > 0 ? "Berdasarkan histori" : "Tidak ada transaksi"}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                                Avg Demand: {r.averageDailyDemand} Base Unit/hr
                              </p>
                            </div>
                            {r.averageDailyDemand > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Setara {Math.round((r.averageDailyDemand / (r.mainConversionFactor || 1)) * 100) / 100} {r.mainUnitName}/hr
                              </p>
                            )}
                          </div>

                          <div className="p-2.5 rounded bg-neutral-50/50 dark:bg-neutral-900/50 border border-border/50 space-y-0.5 flex flex-col justify-between">
                            <div>
                              <HoverCard>
                                <HoverCardTrigger>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 cursor-help underline decoration-dashed underline-offset-2 w-fit">
                                    Formula Stok Min
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 z-50">
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground normal-case tracking-normal">Rumus Stok Min</h4>
                                    <p className="text-xs text-muted-foreground normal-case tracking-normal">
                                      Stok Minimum dihitung berdasarkan rata-rata penjualan harian dikalikan dengan Lead Time (Waktu Tunggu), ditambah dengan Safety Stock.
                                    </p>
                                    <div className="text-xs font-mono bg-muted p-2 rounded-md font-medium text-foreground tracking-normal normal-case">
                                      (Lead Time × Avg Demand) + Safety Stock
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                              {r.averageDailyDemand > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] mt-1 mb-1">
                                  <span className="bg-background border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded" title="Lead Time (Hari) × Avg Demand">({r.leadTime}h × {r.averageDailyDemand})</span>
                                  <span className="text-muted-foreground">+</span>
                                  <span className="bg-background border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded" title="Safety Stock">{Math.round((r.safetyStockDays || 1) * r.averageDailyDemand * 100) / 100}</span>
                                  <span className="text-muted-foreground">=</span>
                                  <span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{r.suggestedMin}</span>
                                </div>
                              ) : (
                                <p className="font-semibold text-foreground text-[11px] mt-1 mb-1">Fallback: {r.suggestedMin} unit</p>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Setara {minMain} {r.mainUnitName}
                            </p>
                          </div>

                          <div className="p-2.5 rounded bg-neutral-50/50 dark:bg-neutral-900/50 border border-border/50 space-y-0.5 flex flex-col justify-between">
                            <div>
                              <HoverCard>
                                <HoverCardTrigger>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 cursor-help underline decoration-dashed underline-offset-2 w-fit">
                                    Formula Stok Max
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 z-50">
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground normal-case tracking-normal">Rumus Stok Max</h4>
                                    <p className="text-xs text-muted-foreground normal-case tracking-normal">
                                      Stok Maksimum dihitung dengan menambahkan Stok Minimum dengan rata-rata penjualan harian dikalikan durasi Tahan Stok (Interval).
                                    </p>
                                    <div className="text-xs font-mono bg-muted p-2 rounded-md font-medium text-foreground tracking-normal normal-case">
                                      Stok Min + (Avg Demand × Tahan Stok)
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                              {r.averageDailyDemand > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] mt-1 mb-1">
                                  <span className="bg-background border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded" title="Stok Min">{r.suggestedMin}</span>
                                  <span className="text-muted-foreground">+</span>
                                  <span className="bg-background border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded" title="Avg Demand × Tahan Stok (Hari)">({r.averageDailyDemand} × {r.currentHoldingInterval ?? 14}h)</span>
                                  <span className="text-muted-foreground">=</span>
                                  <span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{r.suggestedMax}</span>
                                </div>
                              ) : (
                                <p className="font-semibold text-foreground text-[11px] mt-1 mb-1">Fallback (2 × Min) = {r.suggestedMax} unit</p>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Setara {maxMain} {r.mainUnitName}
                            </p>
                          </div>

                          <div className="p-2.5 rounded bg-neutral-50/50 dark:bg-neutral-900/50 border border-border/50 space-y-0.5 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Multi-Satuan
                              </span>
                              <p className="font-semibold text-foreground">
                                1 {r.mainUnitName} = {r.mainConversionFactor} Base Unit
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Total Terjual: {r.totalBaseUnitsSold} Base Unit
                              </p>
                            </div>
                            {r.totalBaseUnitsSold > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Setara {Math.round((r.totalBaseUnitsSold / (r.mainConversionFactor || 1)) * 100) / 100} {r.mainUnitName}
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-4 p-2.5 rounded bg-neutral-50/50 dark:bg-neutral-900/50 border border-border/60 flex items-start gap-2">
                            <Info className="size-4 text-primary shrink-0 mt-0.5" />
                            <div className="text-xs space-y-0.5">
                              <span className="font-bold text-foreground">Rekomendasi Pengadaan:</span>
                              {stockMain < minMain ? (
                                <p className="text-rose-700 dark:text-rose-300">
                                  Stok di bawah ambang pesan ulang. Pesan ke pemasok sebanyak{" "}
                                  <strong>{Math.max(0, maxMain - stockMain)} {r.mainUnitName}</strong> untuk mencapai batas maksimum ({maxMain} {r.mainUnitName}).
                                </p>
                              ) : stockMain > maxMain ? (
                                <p className="text-amber-700 dark:text-amber-300">
                                  Stok melebihi batas maksimum ({stockMain} {r.mainUnitName} &gt; {maxMain} {r.mainUnitName}). Tunda pemesanan baru untuk menghindari kelebihan persediaan.
                                </p>
                              ) : (
                                <p className="text-muted-foreground">
                                  Stok dalam batas aman operasional. Lakukan pemesanan ulang saat stok mendekati {minMain} {r.mainUnitName} sebanyak {Math.max(0, maxMain - stockMain)} {r.mainUnitName}.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  }

                  const isSelected = selectedIds.has(r.productId);
                  const isMinCritical = stockMain < minMain;

                  return (
                    <>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => toggleSelect(r.productId)}
                          className={cn(
                            "size-4 rounded border flex items-center justify-center transition-colors mx-auto",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background hover:border-primary"
                          )}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-muted-foreground text-[11px]">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="font-semibold text-foreground">{r.productName}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{r.productCode}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AbcBadge category={r.currentAbcCategory} />
                          {r.currentAbcCategory !== r.newAbcCategory && (
                            <>
                              <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                              <AbcBadge category={r.newAbcCategory} />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-medium text-foreground">
                        {formatCurrency(r.totalUsageValue)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono">
                        <span className="font-semibold text-foreground">{r.cumulativePercentage}%</span>
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          ({r.individualPercentage}%)
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono">
                        <span className="font-semibold text-foreground">{r.averageDailyDemand}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">unit/hr</span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">
                        {r.leadTime} hr
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono">
                        <span className={cn("font-bold", isMinCritical ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                          {stockMain}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">{r.mainUnitName}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono">
                        <span className={cn("font-bold", minMain > currentMinMain ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                          {minMain}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">{r.mainUnitName}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-bold text-primary">
                        {maxMain}
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">{r.mainUnitName}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground mx-auto"><MoreVertical className="h-4 w-4" /></Button>} />
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem 
                              onClick={() => setEditingProduct({
                                id: r.productId,
                                name: r.productName,
                                leadTime: r.leadTime,
                                holdingInterval: r.currentHoldingInterval,
                                safetyStockDays: r.safetyStockDays,
                                warehouseCapacity: r.warehouseCapacity
                              })}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Parameter Stok
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </>
                  );
                }}
              />
            )}
          </div>

          {/* FOOTER */}
          <div className="p-3 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <div>
                Reklasifikasi Terakhir: <strong className="text-foreground font-medium">{formatDate(lastManualRun || lastAutoRun)}</strong>
              </div>
              <Separator orientation="vertical" className="h-3 w-px bg-muted-foreground/40 shrink-0 mx-0.5" />
              <div>
                Kalkulasi Terakhir: <strong className="text-foreground font-medium">{formatDate(lastCalculationRun)}</strong>
              </div>
            </div>

            <div className="text-[11px] flex items-center gap-2">
               {isFetchingNextPage && <RefreshCw className="size-3 animate-spin" />}
               Menampilkan {displayedResults.length} dari {abcSummary.totalCount || 0} total produk
            </div>
          </div>
        </div>

        <CalculationProcessModal
          isOpen={isProcessModalOpen}
          onOpenChange={setIsProcessModalOpen}
          currentStep={calculationStep}
          activeSubtask={activeSubtask}
          isLiveCalculating={isLiveCalculating}
          onViewResults={() => setIsProcessModalOpen(false)}
          totalProductsCount={abcSummary.totalCount}
          limitA={limitA}
          limitB={limitB}
        />

        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Parameter Stok</DialogTitle>
              <DialogDescription>
                Produk: <strong className="text-foreground">{editingProduct?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveParams}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="leadTime" className="text-right whitespace-nowrap">
                    Lead Time
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="leadTime"
                      type="number"
                      min="1"
                      required
                      value={editingProduct?.leadTime || ""}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, leadTime: Number(e.target.value) } : null)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">Hari</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="holdingInterval" className="text-right whitespace-nowrap">
                    Tahan Stok
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="holdingInterval"
                      type="number"
                      min="1"
                      value={editingProduct?.holdingInterval || ""}
                      placeholder="Default (14)"
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, holdingInterval: e.target.value ? Number(e.target.value) : null } : null)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">Hari</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="safetyStockDays" className="text-right whitespace-nowrap">
                    Safety Stock
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="safetyStockDays"
                      type="number"
                      min="0"
                      value={editingProduct?.safetyStockDays ?? ""}
                      placeholder="Default (1)"
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, safetyStockDays: e.target.value === "" ? "" : Number(e.target.value) } : null)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">Hari</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="warehouseCapacity" className="text-right whitespace-nowrap">
                    Kapasitas Maks
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="warehouseCapacity"
                      type="number"
                      min="0"
                      value={editingProduct?.warehouseCapacity || ""}
                      placeholder="Tanpa Batas"
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, warehouseCapacity: e.target.value ? Number(e.target.value) : null } : null)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">Unit</span>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4 mt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>Batal</Button>
                <Button type="submit" disabled={isSavingParams}>
                  {isSavingParams ? "Menyimpan..." : "Simpan & Hitung Ulang"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <GlobalSettingsModal
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />

      </div>
    </TooltipProvider>
  );
}
