import React, { useState, useMemo } from "react";
import { 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  PlusCircle,
  X,
  RotateCcw,
  ArrowUpDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { formatCurrency, formatMultiUnitStock, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useCategories, useSuppliers } from "@/hooks/queries/useMetadata";
import { useProducts } from "@/hooks/queries/useProducts";
import { useStockSummary } from "@/hooks/queries/useStockReports";
import { FilterCombobox } from "@/components/ui/filter-combobox";

interface ReorderSuggestionsTabProps {
  onAddStock: (product: any) => void;
}

export function ReorderSuggestionsTab({ onAddStock }: ReorderSuggestionsTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const [selectedAbc, setSelectedAbc] = useState("ALL");
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { data: stockSummary } = useStockSummary();

  // Pure Server-Side Pagination Query
  const { data: responseData, isLoading } = useProducts({
    page,
    limit: itemsPerPage,
    search: search || undefined,
    categoryId: selectedCategory !== "ALL" ? selectedCategory : undefined,
    supplierId: selectedSupplier !== "ALL" ? selectedSupplier : undefined,
    abcCategory: selectedAbc !== "ALL" ? selectedAbc : undefined,
    stockStatus: "reorder",
    sort: sortBy,
  });

  const rawItems = responseData?.items || (Array.isArray(responseData) ? responseData : []);
  const totalItems = responseData?.total || rawItems.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedList = useMemo(() => {
    return rawItems.map((item: any) => {
      let priority = "LOW";
      if (item.stock <= 0) priority = "CRITICAL";
      else if (item.abcCategory === "A") priority = "HIGH";
      else if (item.abcCategory === "B") priority = "MEDIUM";
      
      const minStock = item.suggestedMin || item.minStock || 10;
      const targetMax = item.suggestedMax || item.maxStock || (minStock * 3);
      const suggestedQty = Math.max(1, Math.ceil(targetMax - item.stock));
      
      const unitCost = item.averageCost 
        ? Number(item.averageCost) 
        : (item.prices?.[0]?.price ? Number(item.prices[0].price) : 0);
        
      const cost = suggestedQty * unitCost;

      return {
        ...item,
        priority,
        minStock,
        targetMax,
        suggestedOrderQty: suggestedQty,
        estCostTotal: cost
      };
    });
  }, [rawItems]);

  // Reset page on filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Summary Metrics (Global Database Totals)
  const totalSuggestedItems = stockSummary 
    ? ((stockSummary.outOfStockCount || 0) + (stockSummary.lowStockCount || 0)) 
    : totalItems;

  const totalOrderUnits = stockSummary?.reorderTotalUnits !== undefined 
    ? stockSummary.reorderTotalUnits 
    : paginatedList.reduce((acc: number, item: any) => acc + item.suggestedOrderQty, 0);

  const totalEstimatedCost = stockSummary?.reorderTotalCost !== undefined 
    ? stockSummary.reorderTotalCost 
    : paginatedList.reduce((acc: number, item: any) => acc + item.estCostTotal, 0);

  const handleExportExcel = () => {
    if (paginatedList.length === 0) {
      toast.error("Tidak ada data rekomendasi untuk diekspor");
      return;
    }

    const exportRows = paginatedList.map((r: any, idx: number) => ({
      "No": idx + 1,
      "Kode Produk": r.code,
      "Nama Produk": r.name,
      "Kategori": r.category?.name || "-",
      "Pemasok": r.supplier?.name || "Tanpa Pemasok",
      "Kategori ABC": r.abcCategory || "-",
      "Prioritas": r.priority,
      "Stok Saat Ini": r.stock,
      "Batas Min": r.minStock,
      "Target Max": r.targetMax,
      "Saran Order": r.suggestedOrderQty,
      "Estimasi Biaya": r.estCostTotal
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekomendasi Restock");
    const dateTag = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `Rekomendasi_Restock_Inventory_${dateTag}.xlsx`);
    toast.success("Daftar Rekomendasi Restock Berhasil Diunduh");
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c: any) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s: any) => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const hasActiveFilters = useMemo(() => {
    return (
      search !== "" ||
      selectedCategory !== "ALL" ||
      selectedSupplier !== "ALL" ||
      selectedAbc !== "ALL"
    );
  }, [search, selectedCategory, selectedSupplier, selectedAbc]);

  const resetAllFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedSupplier("ALL");
    setSelectedAbc("ALL");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Rekomendasi Restock
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={paginatedList.length === 0}
            className="h-8 px-2.5 gap-1.5 shadow-2xs text-xs font-medium text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Excel</span>
          </Button>
        </div>
      </div>

      {/* Top Banner & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">SKU Butuh Restock</span>
            <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-[11px] font-semibold font-mono text-rose-600 dark:text-rose-400">
              <span>{totalSuggestedItems} SKU</span>
            </div>
          </div>
          <div className="mt-2 mb-3">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {totalSuggestedItems} SKU
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Produk berada di bawah batas stok minimum
          </p>
        </div>

        <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Unit Restock</span>
            <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
              <span>Target Max</span>
            </div>
          </div>
          <div className="mt-2 mb-3">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {totalOrderUnits.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted-foreground">Unit</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Total estimasi unit menuju batas kapasitas
          </p>
        </div>

        <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Estimasi Biaya</span>
            <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              <span>Modal</span>
            </div>
          </div>
          <div className="mt-2 mb-3">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {formatCurrency(totalEstimatedCost)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Estimasi anggaran pembelian ke pemasok
          </p>
        </div>
      </div>

      {/* Toolbar & Filters (1 Row, Unboxed) */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari SKU atau nama..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8 h-8 text-xs bg-background shadow-2xs w-full"
          />
        </div>

        {/* Kategori (Searchable Combobox) */}
        <FilterCombobox
          value={selectedCategory}
          onChange={(val) => { setSelectedCategory(val); setPage(1); }}
          options={[
            { id: "ALL", name: "Semua Kategori" },
            ...categories.map((c: any) => ({ id: c.id, name: c.name }))
          ]}
          placeholder="Semua Kategori"
          searchPlaceholder="Cari kategori..."
          className="min-w-[145px] max-w-[220px]"
        />

        {/* Pemasok (Searchable Combobox) */}
        <FilterCombobox
          value={selectedSupplier}
          onChange={(val) => { setSelectedSupplier(val); setPage(1); }}
          options={[
            { id: "ALL", name: "Semua Pemasok" },
            ...suppliers.map((s: any) => ({ id: s.id, name: s.name }))
          ]}
          placeholder="Semua Pemasok"
          searchPlaceholder="Cari pemasok..."
          className="min-w-[145px] max-w-[220px]"
        />

        {/* Kelas ABC */}
        <Select 
          value={selectedAbc} 
          onValueChange={(val: any) => {
            setSelectedAbc(typeof val === "string" ? val : val.value);
            setPage(1);
          }}
        >
          <SelectTrigger className="min-w-[105px] shrink-0 h-8 text-xs bg-background shadow-2xs">
            <SelectValue>
              {selectedAbc === "ALL" && "Semua ABC"}
              {selectedAbc === "A" && "Kelas A"}
              {selectedAbc === "B" && "Kelas B"}
              {selectedAbc === "C" && "Kelas C"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua ABC</SelectItem>
            <SelectItem value="A">Kelas A (Vital)</SelectItem>
            <SelectItem value="B">Kelas B (Moderat)</SelectItem>
            <SelectItem value="C">Kelas C (Rendah)</SelectItem>
          </SelectContent>
        </Select>

        {/* Urutan (Sort) */}
        <Select 
          value={sortBy} 
          onValueChange={(val: any) => {
            setSortBy(typeof val === "string" ? val : val.value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px] shrink-0 h-8 text-xs bg-background shadow-2xs">
            <ArrowUpDown className="size-3 mr-1 text-muted-foreground shrink-0" />
            <SelectValue>
              {sortBy === "popular" && "Paling Terjual"}
              {sortBy === "name_asc" && "Nama (A - Z)"}
              {sortBy === "name_desc" && "Nama (Z - A)"}
              {sortBy === "stock_desc" && "Stok Terbanyak"}
              {sortBy === "stock_asc" && "Stok Tersedikit"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Paling Terjual</SelectItem>
            <SelectItem value="name_asc">Nama (A - Z)</SelectItem>
            <SelectItem value="name_desc">Nama (Z - A)</SelectItem>
            <SelectItem value="stock_desc">Stok Terbanyak</SelectItem>
            <SelectItem value="stock_asc">Stok Tersedikit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter Chips Bar (Visual Indicators when Filters are Active) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          <span className="text-xs text-muted-foreground font-medium mr-1">Filter Aktif:</span>

          {search && (
            <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
              <span>Kata Kunci: "{search}"</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearch("");
                  setPage(1);
                }}
                className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {selectedCategory !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
              <span>Kategori: {categoryMap.get(selectedCategory) || selectedCategory}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedCategory("ALL");
                  setPage(1);
                }}
                className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {selectedSupplier !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
              <span>Pemasok: {supplierMap.get(selectedSupplier) || selectedSupplier}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedSupplier("ALL");
                  setPage(1);
                }}
                className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {selectedAbc !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
              <span>ABC: Kelas {selectedAbc}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedAbc("ALL");
                  setPage(1);
                }}
                className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAllFilters}
            className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium ml-1 gap-1"
          >
            <RotateCcw className="size-3" />
            <span>Reset Filter</span>
          </Button>
        </div>
      )}

      {/* Table Content (Fits 100% Screen, Zero Horizontal Scroll, Server-Side Paginated) */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden w-full">
        <Table containerClassName="overflow-hidden" className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs">
              <TableHead className="w-[94px] text-left">Prioritas</TableHead>
              <TableHead className="w-[25%] text-left">Nama Produk</TableHead>
              <TableHead className="w-[20%] text-left">Pemasok</TableHead>
              <TableHead className="w-[50px] text-center">ABC</TableHead>
              <TableHead className="w-[10%] text-right">Stok Fisik</TableHead>
              <TableHead className="w-[8%] text-right">Target Max</TableHead>
              <TableHead className="w-[9%] text-right">Saran Order</TableHead>
              <TableHead className="w-[12%] text-right">Est. Modal</TableHead>
              <TableHead className="w-[75px] text-center p-1"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  Memuat rekomendasi pengadaan stok...
                </TableCell>
              </TableRow>
            ) : paginatedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                  Semua stok produk berada pada tingkat aman. Tidak ada rekomendasi restock saat ini.
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  {/* Prioritas */}
                  <TableCell className="py-2 overflow-hidden">
                    {item.priority === "CRITICAL" ? (
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 inline-block truncate max-w-full">
                        Habis (0)
                      </span>
                    ) : item.priority === "HIGH" ? (
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 inline-block truncate max-w-full">
                        Kritis (A)
                      </span>
                    ) : item.priority === "MEDIUM" ? (
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 inline-block truncate max-w-full">
                        Menipis (B)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md font-medium text-[10px] font-mono bg-muted/60 text-muted-foreground border border-border/60 inline-block truncate max-w-full">
                        Menipis (C)
                      </span>
                    )}
                  </TableCell>

                  {/* Nama Produk + SKU & Kategori */}
                  <TableCell className="py-2 overflow-hidden">
                    <div className="font-medium text-foreground text-xs leading-tight truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1 truncate">
                      <span className="shrink-0">{item.code}</span>
                      <span className="shrink-0">&bull;</span>
                      <span className="truncate">{item.category?.name || "Tanpa Kategori"}</span>
                    </div>
                  </TableCell>

                  {/* Pemasok */}
                  <TableCell className="py-2 overflow-hidden text-muted-foreground truncate" title={item.supplier?.name || "-"}>
                    {item.supplier?.name || <span className="text-muted-foreground/60 italic">-</span>}
                  </TableCell>

                  {/* ABC */}
                  <TableCell className="text-center py-2 overflow-hidden">
                    {item.abcCategory ? (
                      <span className={cn(
                        "px-1.5 py-0.2 rounded font-bold text-[10px] font-mono border inline-block",
                        item.abcCategory === "A" && "text-[#F1416C] bg-[#F1416C]/10 border-[#F1416C]/30",
                        item.abcCategory === "B" && "text-[#F79417] bg-[#F79417]/10 border-[#F79417]/30",
                        item.abcCategory === "C" && "text-[#50CD89] bg-[#50CD89]/10 border-[#50CD89]/30",
                      )}>
                        {item.abcCategory}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px] font-mono">-</span>
                    )}
                  </TableCell>

                  {/* Stok Fisik */}
                  <TableCell className="text-right font-mono font-semibold py-2 overflow-hidden truncate">
                    <span className={item.stock <= 0 ? "text-rose-600 font-bold" : "text-amber-600"}>
                      {formatMultiUnitStock(item.stock, item.prices)}
                    </span>
                  </TableCell>

                  {/* Target Max */}
                  <TableCell className="text-right font-mono text-muted-foreground text-[11px] py-2 overflow-hidden truncate">
                    {item.targetMax}
                  </TableCell>

                  {/* Saran Order */}
                  <TableCell className="text-right font-mono font-bold text-primary py-2 overflow-hidden truncate">
                    +{item.suggestedOrderQty}
                  </TableCell>

                  {/* Est. Modal */}
                  <TableCell className="text-right font-mono text-foreground font-semibold py-2 overflow-hidden truncate">
                    {formatCurrency(item.estCostTotal)}
                  </TableCell>

                  {/* Aksi */}
                  <TableCell className="text-center py-2 p-1 overflow-hidden">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() => onAddStock(item)}
                      className="h-7 px-2 text-[11px] gap-1 shadow-2xs font-medium w-full"
                    >
                      <PlusCircle className="size-3" />
                      <span>Restock</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pure Server-Side Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
          <div>
            Menampilkan {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, totalItems)} dari {totalItems} rekomendasi produk
          </div>
          <Pagination className="w-auto m-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (page > 1) setPage(page - 1);
                  }}
                  className={cn("h-8 text-xs", page <= 1 && "pointer-events-none opacity-50")}
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
                          <PaginationEllipsis className="h-8" />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setPage(p)}
                          isActive={page === p}
                          className="h-8 w-8 text-xs"
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
                  className={cn("h-8 text-xs", page >= totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
