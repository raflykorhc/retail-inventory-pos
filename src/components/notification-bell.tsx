import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Bell, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Package
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockSummary } from "@/hooks/queries/useStockReports";
import { useProducts } from "@/hooks/queries/useProducts";
import { formatMultiUnitStock, cn } from "@/lib/utils";
import { useAuthStore, isOwnerRole } from "@/store/useAuthStore";

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = isOwnerRole(user?.role);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mengambil ringkasan jumlah stok habis & menipis
  const { data: summary, isLoading: isSummaryLoading } = useStockSummary();

  // Mengambil daftar produk yang butuh reorder (stok <= minStock), terurut dari stok terkecil
  const { data: reorderResponse, isLoading: isProductsLoading } = useProducts({
    stockStatus: "reorder",
    limit: 25,
    sort: "stock_asc",
  });

  const outOfStockCount = summary?.outOfStockCount || 0;
  const lowStockCount = summary?.lowStockCount || 0;
  const totalAttentionCount = outOfStockCount + lowStockCount;

  const rawProducts = reorderResponse?.items || (Array.isArray(reorderResponse) ? reorderResponse : []);

  // Filter produk berdasarkan tab aktif di popover
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(rawProducts)) return [];

    if (activeTab === "out_of_stock") {
      return rawProducts.filter((p: any) => Number(p.stock) <= 0);
    }
    if (activeTab === "low_stock") {
      return rawProducts.filter((p: any) => {
        const min = p.suggestedMin || p.minStock || 10;
        return Number(p.stock) > 0 && Number(p.stock) <= min;
      });
    }
    return rawProducts;
  }, [rawProducts, activeTab]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Navigasi ke inventori dan langsung memfilter produk yang dipilih
  const handleProductClick = (product: any) => {
    setOpen(false);
    const targetTab = isOwner ? "reorder" : "catalog";
    const searchQuery = product.name || product.code || "";
    navigate(`/inventory?tab=${targetTab}&search=${encodeURIComponent(searchQuery)}`);
  };

  const handleNavigateToCatalog = () => {
    setOpen(false);
    navigate("/inventory?tab=catalog");
  };

  const handleNavigateToReorder = () => {
    setOpen(false);
    navigate("/inventory?tab=reorder");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-1"
          aria-label="Notifikasi Stok"
          title={`Notifikasi Stok (${totalAttentionCount} perlu perhatian)`}
        />
      }>
        <Bell className="size-4" />
        {totalAttentionCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[9px] font-bold text-white shadow-xs ring-2 ring-background">
            {totalAttentionCount > 99 ? "99+" : totalAttentionCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent 
        className="w-84 sm:w-96 p-0 overflow-hidden shadow-lg border border-border/60 rounded-xl" 
        align="end"
        sideOffset={8}
      >
        {/* Header Notifikasi */}
        <div className="flex items-center justify-between p-3.5 pb-2.5 bg-muted/20 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground">Notifikasi Stok</span>
                {totalAttentionCount > 0 ? (
                  <Badge variant="destructive" className="h-4.5 px-1.5 text-[10px] font-mono font-bold">
                    {totalAttentionCount} Perlu Restock
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/10">
                    Aman
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {outOfStockCount > 0 
                  ? `${outOfStockCount} produk habis, ${lowStockCount} menipis` 
                  : lowStockCount > 0 
                    ? `${lowStockCount} produk di bawah batas minimum` 
                    : "Semua persediaan berada pada batas aman"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-md"
            title="Segarkan data stok"
          >
            <RefreshCw className={cn("size-3", isRefreshing && "animate-spin text-primary")} />
          </Button>
        </div>

        {/* Tab Filter Notifikasi */}
        <div className="p-2 pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 h-7 w-full p-0.5 bg-muted/60">
              <TabsTrigger value="all" className="text-[11px] h-6 px-1">
                Semua ({totalAttentionCount})
              </TabsTrigger>
              <TabsTrigger value="out_of_stock" className="text-[11px] h-6 px-1">
                Habis ({outOfStockCount})
              </TabsTrigger>
              <TabsTrigger value="low_stock" className="text-[11px] h-6 px-1">
                Menipis ({lowStockCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Konten Notifikasi (ScrollArea) */}
        <ScrollArea className="h-[270px] px-2 py-2">
          {isSummaryLoading || isProductsLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg border border-border/40 bg-card">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-center px-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">Stok Terkendali</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeTab === "out_of_stock" 
                  ? "Tidak ada produk dengan stok habis (0)." 
                  : activeTab === "low_stock"
                    ? "Tidak ada produk dengan stok menipis."
                    : "Semua produk dalam inventori berada pada tingkat aman."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 p-0.5">
              {filteredProducts.map((product: any) => {
                const stock = Number(product.stock) || 0;
                const min = product.suggestedMin || product.minStock || 10;
                const isZero = stock <= 0;
                const abc = product.abcCategory;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "group flex items-start justify-between gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer text-left hover:shadow-xs active:scale-[0.99]",
                      isZero 
                        ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/25 hover:border-rose-500/50 dark:bg-rose-950/20 dark:border-rose-900/30" 
                        : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/25 hover:border-amber-500/50 dark:bg-amber-950/20 dark:border-amber-900/30"
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md shrink-0 mt-0.5",
                        isZero 
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" 
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}>
                        {isZero ? <AlertOctagon className="size-4" /> : <AlertTriangle className="size-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors leading-tight" title={product.name}>
                            {product.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 flex-wrap font-mono">
                          <span className="truncate">{product.code}</span>
                          {product.category?.name && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate">{product.category.name}</span>
                            </>
                          )}
                          {abc && (
                            <>
                              <span>&bull;</span>
                              <span className={cn(
                                "font-bold font-mono px-1 rounded text-[9px]",
                                abc === "A" && "text-[#F1416C] bg-[#F1416C]/10",
                                abc === "B" && "text-[#F79417] bg-[#F79417]/10",
                                abc === "C" && "text-[#50CD89] bg-[#50CD89]/10"
                              )}>
                                Pareto {abc}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[11px] font-mono font-bold",
                            isZero ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                          )}>
                            Stok: {formatMultiUnitStock(stock, product.prices)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (Min: {min})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 gap-1.5 self-stretch">
                      <Badge 
                        variant={isZero ? "destructive" : "secondary"}
                        className={cn(
                          "text-[9px] px-1.5 py-0 font-medium",
                          !isZero && "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {isZero ? "Habis (0)" : "Menipis"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-auto group-hover:underline">
                        Restock
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer Aksi Cepat ke Inventori */}
        <div className="flex items-center justify-between p-2 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleNavigateToCatalog}
            className="text-[11px] text-muted-foreground hover:text-foreground gap-1.5 h-7 font-medium"
          >
            <Package className="size-3.5" />
            <span>Katalog Inventori</span>
          </Button>

          <Button
            variant="default"
            size="xs"
            onClick={handleNavigateToReorder}
            className="text-[11px] gap-1.5 h-7 font-medium"
          >
            <span>Rekomendasi Restock</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
