import React, { useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useStockSummary } from "@/hooks/queries/useStockReports";
import { useAuthStore, isOwnerRole } from "@/store/useAuthStore";

interface InventoryKpiSummaryProps {
  onSelectStockFilter?: (status: string) => void;
  onSelectAbcTab?: () => void;
  activeProducts?: any[];
  isFiltered?: boolean;
  totalFilteredCount?: number;
}

export function InventoryKpiSummary({
  onSelectStockFilter,
  onSelectAbcTab,
  activeProducts = [],
  isFiltered = false,
  totalFilteredCount = 0,
}: InventoryKpiSummaryProps) {
  const { user } = useAuthStore();
  const isOwner = isOwnerRole(user?.role);
  const { data: summary, isLoading } = useStockSummary();

  const filteredMetrics = useMemo(() => {
    if (!isFiltered || !activeProducts || !Array.isArray(activeProducts)) return null;

    let totalAssetValue = 0;
    let totalPhysicalItems = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const abcCounts = { A: 0, B: 0, C: 0, unclassified: 0 };

    activeProducts.forEach((p) => {
      const stock = Number(p.stock || 0);

      const mainPriceObj = p.prices?.reduce(
        (max: any, item: any) => (!max || item.conversionFactor > max.conversionFactor ? item : max),
        null
      );
      const mainFactor = mainPriceObj?.conversionFactor || 1;
      const baseCostPrice = (Number(p.costPrice) || 0) / mainFactor;
      totalAssetValue += stock * baseCostPrice;

      totalPhysicalItems += stock / mainFactor;

      const minStock = Number(p.minStock || 0);
      if (stock <= 0) {
        outOfStockCount++;
      } else if (minStock > 0 && stock <= minStock) {
        lowStockCount++;
      }

      const category = (p.abcCategory || "").toUpperCase();
      if (category === "A") abcCounts.A++;
      else if (category === "B") abcCounts.B++;
      else if (category === "C") abcCounts.C++;
      else abcCounts.unclassified++;
    });

    return {
      totalAssetValue,
      totalPhysicalItems,
      totalProducts: activeProducts.length,
      outOfStockCount,
      lowStockCount,
      abcCounts,
    };
  }, [isFiltered, activeProducts]);

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", isOwner ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
        {[1, 2, 3, isOwner ? 4 : null].filter(Boolean).map((i) => (
          <div key={i} className="border border-border/60 bg-card rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    );
  }

  const totalAsset = filteredMetrics ? filteredMetrics.totalAssetValue : (summary?.totalAssetValue || 0);
  const totalItems = filteredMetrics ? filteredMetrics.totalPhysicalItems : (summary?.totalItems || 0);
  const totalProducts = filteredMetrics ? filteredMetrics.totalProducts : (summary?.totalProducts || 0);
  const outOfStock = filteredMetrics ? filteredMetrics.outOfStockCount : (summary?.outOfStockCount || 0);
  const lowStock = filteredMetrics ? filteredMetrics.lowStockCount : (summary?.lowStockCount || 0);
  const abc = filteredMetrics ? filteredMetrics.abcCounts : (summary?.abcCounts || { A: 0, B: 0, C: 0, unclassified: 0 });
  const todayMovements = summary?.todayMovements || { inQty: 0, outQty: 0, totalLogs: 0 };

  const getFontSizeClass = (value: number) => {
    const absVal = Math.abs(value);
    if (absVal >= 1000000000) {
      return "text-base sm:text-lg";
    }
    if (absVal >= 100000000) {
      return "text-lg sm:text-xl";
    }
    if (absVal >= 10000000) {
      return "text-xl sm:text-2xl";
    }
    return "text-2xl sm:text-[28px]";
  };

  const needAttentionCount = outOfStock + lowStock;

  return (
    <div className={cn("grid gap-4", isOwner ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
      {/* CARD 1: TOTAL NILAI ASET STOK (Untuk Kasir: Hanya Total Fisik Barang) */}
      <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between h-6">
          <span className="text-xs font-medium text-muted-foreground">
            {isOwner ? "Total Nilai Aset" : "Total Stok Fisik"}
          </span>
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
            <span>{totalProducts} SKU</span>
          </div>
        </div>
        <div className="my-2.5 h-8 flex items-center">
          {isOwner ? (
            <div className={cn("font-extrabold font-mono tracking-tight text-foreground transition-all", getFontSizeClass(totalAsset))}>
              {formatCurrency(totalAsset)}
            </div>
          ) : (
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
              <span>{Math.round(totalItems).toLocaleString("id-ID")}</span>
              <span className="text-xs font-normal text-muted-foreground">Unit Fisik</span>
            </div>
          )}
        </div>
        <div className="min-h-[22px] flex items-center text-[11px] text-muted-foreground truncate">
          <span>{isOwner ? `Total fisik ${Math.round(totalItems).toLocaleString("id-ID")} unit di gudang` : `${totalProducts} jenis produk terdaftar`}</span>
        </div>
      </div>

      {/* CARD 2: PERINGATAN STATUS STOK */}
      <div 
        onClick={() => onSelectStockFilter?.("low_stock")}
        className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between h-6">
          <span className="text-xs font-medium text-muted-foreground">Status Stok</span>
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-[11px] font-semibold font-mono text-amber-600 dark:text-amber-400">
            <span>{needAttentionCount} Atensi</span>
          </div>
        </div>
        <div className="my-2.5 h-8 flex items-center">
          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-rose-600 dark:text-rose-400 flex items-baseline gap-1.5">
            <span>{needAttentionCount}</span>
            <span className="text-xs font-normal text-muted-foreground">Item Restock</span>
          </div>
        </div>
        <div className="min-h-[22px] flex items-center text-[11px] text-muted-foreground truncate">
          <span><span className="font-semibold text-rose-600 dark:text-rose-400">{outOfStock}</span> habis, <span className="font-semibold text-amber-600 dark:text-amber-400">{lowStock}</span> menipis</span>
        </div>
      </div>

      {/* CARD 3: KLASIFIKASI ABC (Khusus Pemilik Usaha) */}
      {isOwner && (
        <div 
          onClick={onSelectAbcTab}
          className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between h-6">
            <span className="text-xs font-medium text-muted-foreground">Klasifikasi ABC</span>
            <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
              <span>Pareto</span>
            </div>
          </div>
          <div className="my-2.5 h-8 flex items-center">
            <div className="flex items-baseline gap-2.5 font-mono">
              <span className="font-extrabold text-xl sm:text-2xl text-[#F1416C]">
                <span className="text-xs font-normal text-muted-foreground mr-0.5">A:</span>
                {abc.A}
              </span>
              <span className="font-extrabold text-xl sm:text-2xl text-[#F79417]">
                <span className="text-xs font-normal text-muted-foreground mr-0.5">B:</span>
                {abc.B}
              </span>
              <span className="font-extrabold text-xl sm:text-2xl text-[#50CD89]">
                <span className="text-xs font-normal text-muted-foreground mr-0.5">C:</span>
                {abc.C}
              </span>
            </div>
          </div>
          <div className="min-h-[22px] flex items-center text-[11px] text-muted-foreground truncate">
            {abc.unclassified > 0 ? (
              <span><span className="font-semibold font-mono text-foreground">{abc.unclassified}</span> produk belum dianalisis</span>
            ) : (
              <span>Klasifikasi ABC optimal</span>
            )}
          </div>
        </div>
      )}

      {/* CARD 4: MUTASI STOK HARI INI */}
      <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between h-6">
          <span className="text-xs font-medium text-muted-foreground">Mutasi Hari Ini</span>
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
            <span>{todayMovements.totalLogs} Log</span>
          </div>
        </div>
        <div className="my-2.5 h-8 flex items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">+{todayMovements.inQty}</span>
              <span className="text-xs font-normal text-muted-foreground">Masuk</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-border/80 my-auto shrink-0" />
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">-{todayMovements.outQty}</span>
              <span className="text-xs font-normal text-muted-foreground">Keluar</span>
            </div>
          </div>
        </div>
        <div className="min-h-[22px] flex items-center text-[11px] text-muted-foreground truncate">
          <span>Aktivitas mutasi stok hari ini</span>
        </div>
      </div>
    </div>
  );
}
