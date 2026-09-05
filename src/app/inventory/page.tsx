import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { 
  Plus, 
  Loader2, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  PlusCircle, 
  History, 
  Image as ImageIcon,
  Search,
  FileSpreadsheet,
  Package,
  Boxes,
  ShoppingCart,
  ArrowUpDown,
  X,
  RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

import axiosClient from "@/lib/axiosClient";
import { formatCurrency, formatMultiUnitStock, formatMultiUnitMinMax, getMainUnitCost, cn } from "@/lib/utils";
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
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FilterCombobox } from "@/components/ui/filter-combobox";

import { ProductFormModal } from "./components/ProductFormModal";
import { AddStockModal } from "./components/AddStockModal";
import { BatchLogModal } from "./components/BatchLogModal";
import { InventoryKpiSummary } from "./components/InventoryKpiSummary";
import { ReorderSuggestionsTab } from "./components/ReorderSuggestionsTab";
import { StockMovementLogsTab } from "./components/StockMovementLogsTab";
import { AbcOptimizationReport } from "../reports/components/AbcOptimizationReport";
import { useCategories, useSuppliers } from "@/hooks/queries/useMetadata";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "catalog");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Catalog filters & pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("ALL");
  const [supplierId, setSupplierId] = useState("ALL");
  const [stockStatus, setStockStatus] = useState("ALL");
  const [abcCategory, setAbcCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("popular");
  const limit = 20;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteProduct, setDeleteProduct] = useState<any>(null);
  const [addStockProduct, setAddStockProduct] = useState<any>(null);
  const [batchLogProduct, setBatchLogProduct] = useState<any>(null);

  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["products", search, page, categoryId, supplierId, stockStatus, abcCategory, sortBy],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        search: search || undefined,
        categoryId: categoryId !== "ALL" ? categoryId : undefined,
        supplierId: supplierId !== "ALL" ? supplierId : undefined,
        stockStatus: (stockStatus === "out_of_stock" || stockStatus === "in_stock") ? stockStatus : undefined,
        abcCategory: abcCategory !== "ALL" ? abcCategory : undefined,
        sort: sortBy || undefined,
      };
      const res = await axiosClient.get(`/products`, { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success("Produk berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
      setDeleteProduct(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Gagal menghapus produk");
    }
  });

  const rawProducts = data?.items || data || [];
  const totalItems = data?.total || rawProducts.length || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // Filter client-side if specialized status (e.g. low_stock or overstock)
  const products = useMemo(() => {
    if (!Array.isArray(rawProducts)) return [];
    if (stockStatus === "low_stock") {
      return rawProducts.filter((p: any) => p.stock > 0 && p.stock <= p.minStock);
    }
    if (stockStatus === "overstock") {
      return rawProducts.filter((p: any) => p.maxStock && p.stock > p.maxStock);
    }
    if (stockStatus === "normal") {
      return rawProducts.filter((p: any) => p.stock > p.minStock && (!p.maxStock || p.stock <= p.maxStock));
    }
    return rawProducts;
  }, [rawProducts, stockStatus]);

  const handleStockFilterSelect = (status: string) => {
    setActiveTab("catalog");
    setStockStatus(status);
    setPage(1);
  };

  const handleExportCatalog = () => {
    if (products.length === 0) {
      toast.error("Tidak ada produk untuk diekspor");
      return;
    }

    const exportRows = products.map((p: any, idx: number) => ({
      "No": idx + 1,
      "Kode Produk": p.code,
      "Nama Produk": p.name,
      "Kategori": p.category?.name || "-",
      "Pemasok": p.supplier?.name || "-",
      "Kategori ABC": p.abcCategory || "-",
      "Stok": p.stock,
      "Batas Min": p.minStock,
      "Batas Max": p.maxStock || "-",
      "Harga Pokok": p.averageCost || 0,
      "Harga Jual": p.prices?.[0]?.price || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Katalog Produk");
    const dateTag = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `Katalog_Inventaris_${dateTag}.xlsx`);
    toast.success("Katalog Produk Berhasil Diunduh");
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
      categoryId !== "ALL" ||
      supplierId !== "ALL" ||
      stockStatus !== "ALL" ||
      abcCategory !== "ALL"
    );
  }, [search, categoryId, supplierId, stockStatus, abcCategory]);

  const resetAllFilters = () => {
    setSearch("");
    setCategoryId("ALL");
    setSupplierId("ALL");
    setStockStatus("ALL");
    setAbcCategory("ALL");
    setPage(1);
  };

  const stockStatusLabelMap: Record<string, string> = useMemo(() => ({
    out_of_stock: "Stok Habis (0)",
    low_stock: "Stok Menipis",
    normal: "Stok Normal",
    overstock: "Overstock",
  }), []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:p-5 w-full max-w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* TOP LEVEL MODULE SWITCHER (Exact Reports Page Pattern) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 pb-2 overflow-x-auto">
        <Button
          variant={activeTab === "catalog" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "h-8 px-3.5 gap-2 text-xs font-semibold rounded-lg transition-all",
            activeTab === "catalog" ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="size-3.5" />
          <span>Katalog & Stok</span>
        </Button>

        <Button
          variant={activeTab === "abc-optimization" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("abc-optimization")}
          className={cn(
            "h-8 px-3.5 gap-2 text-xs font-semibold rounded-lg transition-all",
            activeTab === "abc-optimization" ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Boxes className="size-3.5" />
          <span>Klasifikasi ABC & Stok Min-Max</span>
        </Button>

        <Button
          variant={activeTab === "reorder" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("reorder")}
          className={cn(
            "h-8 px-3.5 gap-2 text-xs font-semibold rounded-lg transition-all",
            activeTab === "reorder" ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="size-3.5" />
          <span>Rekomendasi Restock</span>
        </Button>

        <Button
          variant={activeTab === "movement-logs" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("movement-logs")}
          className={cn(
            "h-8 px-3.5 gap-2 text-xs font-semibold rounded-lg transition-all",
            activeTab === "movement-logs" ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="size-3.5" />
          <span>Riwayat Mutasi</span>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: KATALOG & STOK (Overview Dashboard) */}
      {/* ========================================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Katalog & Stok
            </h1>

            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="default"
                size="sm" 
                onClick={() => setIsAddModalOpen(true)}
                className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-2xs"
              >
                <Plus className="size-3.5" />
                <span>Tambah Produk</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCatalog}
                className="h-8 px-2.5 text-xs font-medium gap-1.5 shadow-2xs border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Excel</span>
              </Button>
            </div>
          </div>

          {/* 4 Executive KPI Summary Cards (Dynamic Based on Active Filters) */}
          <InventoryKpiSummary 
            onSelectStockFilter={handleStockFilterSelect}
            onSelectAbcTab={() => setActiveTab("abc-optimization")}
            activeProducts={products}
            isFiltered={hasActiveFilters}
            totalFilteredCount={totalItems}
          />

          {/* Filters Bar: Search + Dropdowns (1 Single Row) */}
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama atau kode..."
                className="pl-8 h-8 text-xs bg-background shadow-2xs w-full"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Kategori (Searchable Combobox) */}
            <FilterCombobox
              value={categoryId}
              onChange={(val) => { setCategoryId(val); setPage(1); }}
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
              value={supplierId}
              onChange={(val) => { setSupplierId(val); setPage(1); }}
              options={[
                { id: "ALL", name: "Semua Pemasok" },
                ...suppliers.map((s: any) => ({ id: s.id, name: s.name }))
              ]}
              placeholder="Semua Pemasok"
              searchPlaceholder="Cari pemasok..."
              className="min-w-[145px] max-w-[220px]"
            />

            {/* Status Stok */}
            <Select value={stockStatus} onValueChange={(val: any) => { setStockStatus(typeof val === "string" ? val : val.value); setPage(1); }}>
              <SelectTrigger className="w-[120px] shrink-0 h-8 text-xs bg-background shadow-2xs">
                <SelectValue>
                  {stockStatus === "ALL" && "Semua Status"}
                  {stockStatus === "out_of_stock" && "Stok Habis (0)"}
                  {stockStatus === "low_stock" && "Stok Menipis"}
                  {stockStatus === "normal" && "Stok Normal"}
                  {stockStatus === "overstock" && "Overstock"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="out_of_stock">Stok Habis (0)</SelectItem>
                <SelectItem value="low_stock">Stok Menipis</SelectItem>
                <SelectItem value="normal">Stok Normal</SelectItem>
                <SelectItem value="overstock">Overstock</SelectItem>
              </SelectContent>
            </Select>

            {/* Kelas ABC */}
            <Select value={abcCategory} onValueChange={(val: any) => { setAbcCategory(typeof val === "string" ? val : val.value); setPage(1); }}>
              <SelectTrigger className="w-[105px] shrink-0 h-8 text-xs bg-background shadow-2xs">
                <SelectValue>
                  {abcCategory === "ALL" && "Semua ABC"}
                  {abcCategory === "A" && "Kelas A"}
                  {abcCategory === "B" && "Kelas B"}
                  {abcCategory === "C" && "Kelas C"}
                  {abcCategory === "NONE" && "Belum Ada"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua ABC</SelectItem>
                <SelectItem value="A">Kelas A</SelectItem>
                <SelectItem value="B">Kelas B</SelectItem>
                <SelectItem value="C">Kelas C</SelectItem>
                <SelectItem value="NONE">Belum Ada</SelectItem>
              </SelectContent>
            </Select>

            {/* Urutan */}
            <Select value={sortBy} onValueChange={(val: any) => { setSortBy(typeof val === "string" ? val : val.value); setPage(1); }}>
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

              {categoryId !== "ALL" && (
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
                  <span>Kategori: {categoryMap.get(categoryId) || categoryId}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCategoryId("ALL");
                      setPage(1);
                    }}
                    className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}

              {supplierId !== "ALL" && (
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
                  <span>Pemasok: {supplierMap.get(supplierId) || supplierId}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSupplierId("ALL");
                      setPage(1);
                    }}
                    className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}

              {stockStatus !== "ALL" && (
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
                  <span>Status: {stockStatusLabelMap[stockStatus] || stockStatus}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStockStatus("ALL");
                      setPage(1);
                    }}
                    className="rounded-full p-0.5 hover:bg-rose-500/20 hover:text-rose-600 focus:outline-none transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}

              {abcCategory !== "ALL" && (
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/60 text-foreground items-center">
                  <span>ABC: Kelas {abcCategory}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAbcCategory("ALL");
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

          {/* Table (Fits 100% Screen, No Horizontal Scroll) */}
          <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden w-full">
            <Table containerClassName="overflow-hidden" className="w-full table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-[50px] text-center p-2">Foto</TableHead>
                  <TableHead className="w-[27%] text-left">Nama Produk</TableHead>
                  <TableHead className="w-[14%] text-left">Kategori</TableHead>
                  <TableHead className="w-[5%] text-center">ABC</TableHead>
                  <TableHead className="w-[11%] text-right">Stok</TableHead>
                  <TableHead className="w-[12%] text-right">Min/Max</TableHead>
                  <TableHead className="w-[12%] text-right">Harga Pokok</TableHead>
                  <TableHead className="w-[12%] text-right">Harga Jual</TableHead>
                  <TableHead className="w-[36px] text-center p-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block text-primary" />
                      Memuat katalog produk...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      Tidak ada produk ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product: any) => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                    const isOverStock = product.maxStock && product.stock > product.maxStock;

                    return (
                      <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                        {/* Foto */}
                        <TableCell className="text-center p-2">
                          {product.productImage?.id ? (
                            <img 
                              src={`${axiosClient.defaults.baseURL || '/api'}/products/${product.id}/image?t=${dataUpdatedAt}`} 
                              alt={product.name} 
                              className="h-7 w-7 object-cover rounded-md border shadow-2xs mx-auto" 
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                              <ImageIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </TableCell>

                        {/* Nama Produk + SKU & Pemasok */}
                        <TableCell className="py-2 overflow-hidden">
                          <div className="font-medium text-foreground text-xs leading-tight truncate" title={product.name}>
                            {product.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1 truncate">
                            <span className="shrink-0">{product.code}</span>
                            {product.supplier?.name && (
                              <>
                                <span className="shrink-0">&bull;</span>
                                <span className="truncate">{product.supplier.name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Kategori */}
                        <TableCell className="py-2 overflow-hidden">
                          {product.category ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border/60 inline-block truncate max-w-full">
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">-</span>
                          )}
                        </TableCell>

                        {/* ABC */}
                        <TableCell className="text-center py-2">
                          {product.abcCategory ? (
                            <span className={cn(
                              "px-1.5 py-0.2 rounded font-bold text-[10px] font-mono border inline-block",
                              product.abcCategory === "A" && "text-[#F1416C] bg-[#F1416C]/10 border-[#F1416C]/30",
                              product.abcCategory === "B" && "text-[#F79417] bg-[#F79417]/10 border-[#F79417]/30",
                              product.abcCategory === "C" && "text-[#50CD89] bg-[#50CD89]/10 border-[#50CD89]/30",
                            )}>
                              {product.abcCategory}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px] font-mono">-</span>
                          )}
                        </TableCell>

                        {/* Stok */}
                        <TableCell className="text-right py-2 overflow-hidden">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 inline-block truncate max-w-full">
                              {formatMultiUnitStock(product.stock, product.prices)}
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 inline-block truncate max-w-full">
                              {formatMultiUnitStock(product.stock, product.prices)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-medium text-[11px] font-mono bg-muted/60 text-foreground border border-border/60 inline-block truncate max-w-full">
                              {formatMultiUnitStock(product.stock, product.prices)}
                            </span>
                          )}
                        </TableCell>

                        {/* Min / Max (Dinamis Sesuai Multi Satuan) */}
                        <TableCell 
                          className="text-right font-mono text-[11px] text-muted-foreground py-2 whitespace-nowrap"
                          title={`Satuan Dasar: ${product.minStock} / ${product.maxStock || '-'}`}
                        >
                          {formatMultiUnitMinMax(product.minStock, product.maxStock, product.prices)}
                        </TableCell>

                        {/* Harga Pokok (Disesuaikan dengan Satuan Terbesar) */}
                        <TableCell 
                          className="text-right font-mono text-xs text-muted-foreground py-2 truncate"
                          title={`Modal Satuan Dasar: ${formatCurrency(Number(product.averageCost) || 0)}`}
                        >
                          {formatCurrency(getMainUnitCost(Number(product.averageCost) || 0, product.prices))}
                        </TableCell>

                        {/* Harga Jual */}
                        <TableCell className="text-right font-mono font-semibold text-xs text-foreground py-2 truncate">
                          {formatCurrency(product.prices?.[0]?.price || 0)}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-center py-2 p-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3.5 w-3.5" /></Button>} />
                            <DropdownMenuContent align="end" className="min-w-[175px] w-auto whitespace-nowrap">
                              <DropdownMenuItem onClick={() => {
                                setEditProduct(product);
                                setIsAddModalOpen(true);
                              }}>
                                <Edit className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAddStockProduct(product)}>
                                <PlusCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                Tambah Stok
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setBatchLogProduct(product)}>
                                <History className="mr-2 h-3.5 w-3.5" />
                                Batch & Log FIFO
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteProduct(product)}>
                                <Trash className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Shadcn UI Pagination (Rekomendasi Restock Style) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
              <div>
                Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, totalItems)} dari {totalItems} produk
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
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: OPTIMALISASI ABC & MIN-MAX */}
      {/* ========================================================================= */}
      {activeTab === "abc-optimization" && (
        <AbcOptimizationReport />
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: REKOMENDASI RESTOCK */}
      {/* ========================================================================= */}
      {activeTab === "reorder" && (
        <ReorderSuggestionsTab onAddStock={(p) => setAddStockProduct(p)} />
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: RIWAYAT MUTASI */}
      {/* ========================================================================= */}
      {activeTab === "movement-logs" && (
        <StockMovementLogsTab />
      )}

      {/* Global Product Modals */}
      <ProductFormModal 
        open={isAddModalOpen} 
        onOpenChange={(val) => {
          setIsAddModalOpen(val);
          if (!val) setEditProduct(null);
        }} 
        editData={editProduct}
      />

      <AlertDialog 
        open={!!deleteProduct} 
        onOpenChange={(val) => {
          if (!val) {
            setDeleteProduct(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteProduct?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" onClick={() => {
              setDeleteProduct(null);
            }} disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate(deleteProduct.id);
            }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddStockModal 
        isOpen={!!addStockProduct}
        onClose={() => setAddStockProduct(null)}
        product={addStockProduct}
      />

      <BatchLogModal
        isOpen={!!batchLogProduct}
        onClose={() => setBatchLogProduct(null)}
        product={batchLogProduct}
      />
    </div>
  );
}
