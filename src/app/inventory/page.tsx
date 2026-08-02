import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { SummaryCard } from '@/components/SummaryCard';
import { 
  Package, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  History,
  AlertTriangle,
  TrendingUp,
  Box,
  X,
  Printer,
  MoreVertical,
  Edit2,
  Eye,
  EyeOff,
  Layers,
  Database,
  QrCode,
  CheckSquare,
  Square,
  BarChart3,
  ShoppingCart,
  HelpCircle
} from "lucide-react";
import { cn, formatCurrency, formatCompactCurrency, formatMultiUnitStock } from "../../lib/utils";
import { toast } from "sonner";

import { QRPrintManager } from "../../components/QRPrintManager";
import { useAuthStore } from "../../store/useAuthStore";
import { useTheme } from "../../context/ThemeContext";
import { Can } from "../../components/auth/Can";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { BatchDetailReportModal } from "../../components/BatchDetailReportModal";

import { useProducts, useAddStock, useCreateProduct, useUpdateProduct, useProductLogs, useProductBatches } from "../../hooks/queries/useProducts.ts";


// Helper for Precise Price Scaling (Uses Batch Snapshots)
const calculateScaledValue = (actualValue: number, batch: any, mainFactor: number, referenceValue: number) => {
  const val = Number(actualValue) || 0;
  
  // 1. Precise Logic: Gunakan snapshot factor yang tersimpan di batch
  if (batch.conversionFactor && batch.conversionFactor > 0) {
    // Karena val (di DB) sekarang sudah dinormalisasi terhadap unit utama saat pembuatan batch,
    // kita cukup kalikan dengan faktor unit yang ingin ditampilkan saat ini (mainFactor).
    return val * mainFactor;
  }
  
  // 2. Simple Fallback: Jika data lama, gunakan referenceValue (harga saat ini)
  return referenceValue || val * mainFactor;
};
import { useCategories, useUnits, useSuppliers } from "../../hooks/queries/useMetadata.ts";
import axiosClient from "../../lib/axiosClient";

const VirtuosoHeader = ({ isAdminOrManager, isSelectionMode, onSelectAll, allSelected }: { isAdminOrManager: boolean, isSelectionMode: boolean, onSelectAll: () => void, allSelected: boolean }) => (
  <div className={cn(
    "hidden lg:grid bg-bg-main border-y border-border-default sticky top-[176px] lg:top-[108px] z-20 items-center shadow-sm",
    isSelectionMode 
      ? (isAdminOrManager ? "grid-cols-[60px_2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[60px_2fr_1fr_1fr_1fr]")
      : (isAdminOrManager ? "grid-cols-[2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1fr_1fr]")
  )}>
    {isSelectionMode && (
      <div className="px-4 py-4 flex items-center justify-center">
        <button 
          onClick={onSelectAll}
          className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
            allSelected 
              ? "bg-brand-primary border-brand-primary text-white shadow-sm" 
              : "bg-bg-main border-border-default hover:border-brand-primary/50"
          )}
        >
          {allSelected ? <CheckSquare className="w-4 h-4 fill-white/20" /> : <div className="w-2 h-2 rounded-sm bg-border-default/30" />}
        </button>
      </div>
    )}
    <div className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Informasi Barang</div>
    <div className="px-4 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Stok</div>
    {isAdminOrManager && <div className="px-4 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Harga Modal</div>}
    <div className="px-4 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Harga Jual</div>
    <div className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Aksi</div>
  </div>
);

export default function InventoryPage() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search on mount for barcode scanners
    searchInputRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Prevent triggering if user is already typing in an input, except body
      if (e.key === '/' && e.target === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.ctrlKey && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">(() => {
    return (location.state?.filter as any) || "ALL";
  });
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modals State
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isQRManagerOpen, setIsQRManagerOpen] = useState(false);
  const [qrQueueItems, setQrQueueItems] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // TanStack Query Hooks
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ supplierId: selectedSupplierId || undefined });
  
  const placeholderProductsData = useMemo(() => [
    { id: "1", code: "BRG-001", name: "Semen Portland 50kg Tiga Roda", stock: 150, averageCost: 65000, prices: [{ unit: { name: "Zak" }, price: 72000 }], minStock: 30, supplier: { name: "PT Tiga Roda Indonesia" }, category: { name: "Bahan Pokok" } },
    { id: "2", code: "BRG-002", name: "Besi Beton 10mm SNI", stock: 12, averageCost: 85000, prices: [{ unit: { name: "Batang" }, price: 95000 }], minStock: 25, supplier: { name: "PT Krakatau Steel" }, category: { name: "Besi" } },
    { id: "3", code: "BRG-003", name: "Pasir Beton per M3", stock: 0, averageCost: 280000, prices: [{ unit: { name: "M3" }, price: 320000 }], minStock: 10, supplier: { name: "CV Pasir Mandiri" }, category: { name: "Agregat" } },
    { id: "4", code: "BRG-004", name: "Cat Dulux Pentalite 5kg", stock: 4, averageCost: 185000, prices: [{ unit: { name: "Galon" }, price: 210000 }], minStock: 10, supplier: { name: "Distributor Dulux Utama" }, category: { name: "Cat" } }
  ], []);

  const activeProductsData = isLoadingProducts ? placeholderProductsData : productsData;
  const { data: categoriesData } = useCategories();
  const { data: unitsData } = useUnits();
  const { data: suppliersData } = useSuppliers();
  const addStockMutation = useAddStock();
  const updateProductMutation = useUpdateProduct();
  const createProductMutation = useCreateProduct();

  const products = productsData || [];
  const categories = categoriesData || [];
  const units = unitsData || [];
  const suppliers = suppliersData || [];

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Form States
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const { data: logsData, isLoading: isLogsLoading } = useProductLogs(selectedProductId || "", logsPage, 10);
  const stockLogs = logsData?.items || [];
  const logsTotal = logsData?.total || 0;
  const [newProduct, setNewProduct] = useState({ 
    code: "", 
    name: "", 
    description: "",
    categoryId: "", 
    supplierId: "",
    prices: [{ unitId: "", price: "", conversionFactor: 1 }], // Multi-unit support
    averageCost: "",
    initialStock: "",
    image: "",
    minStock: "10",
    leadTime: "3"
  });

  const [stockParts, setStockParts] = useState<Record<string, number>>({});

  const recalculateStock = (parts: Record<string, number>, prices: any[]) => {
    let totalBase = 0;
    for (const price of prices) {
      const factor = Number(price.conversionFactor) || 1;
      const qty = parts[price.unitId || ""] || 0;
      totalBase += qty * factor;
    }
    const sortedPrices = [...prices].sort((a, b) => b.conversionFactor - a.conversionFactor);
    const mainFactor = Number(sortedPrices[0]?.conversionFactor) || 1;
    setNewProduct(prev => ({
      ...prev,
      initialStock: (totalBase / mainFactor).toString()
    }));
  };

  const handleStockPartChange = (unitId: string, value: number) => {
    const newParts = { ...stockParts, [unitId || ""]: value };
    setStockParts(newParts);
    recalculateStock(newParts, newProduct.prices);
  };

  const addPriceRow = () => {
    setNewProduct(prev => ({
      ...prev,
      prices: [...prev.prices, { unitId: "", price: "", conversionFactor: 1 }]
    }));
  };

  const removePriceRow = (index: number) => {
    if (newProduct.prices.length <= 1) return;
    const removedUnitId = newProduct.prices[index].unitId;
    const updatedPrices = newProduct.prices.filter((_, i) => i !== index);
    setNewProduct(prev => ({
      ...prev,
      prices: updatedPrices
    }));
    setStockParts(prev => {
      const next = { ...prev };
      delete next[removedUnitId || ""];
      recalculateStock(next, updatedPrices);
      return next;
    });
  };

  const updatePriceRow = (index: number, field: string, value: any) => {
    const updatedPrices = [...newProduct.prices];
    const oldUnitId = updatedPrices[index].unitId;
    updatedPrices[index] = { ...updatedPrices[index], [field]: value };
    setNewProduct(prev => ({ ...prev, prices: updatedPrices }));

    if (field === "unitId" && oldUnitId !== value) {
      setStockParts(prev => {
        const next = { ...prev };
        next[value || ""] = next[oldUnitId || ""] || 0;
        delete next[oldUnitId || ""];
        recalculateStock(next, updatedPrices);
        return next;
      });
    } else if (field === "conversionFactor") {
      recalculateStock(stockParts, updatedPrices);
    }
  };

  const baseFilteredProducts = useMemo(() => {
    // Handle paginated response structure
    const productList = activeProductsData?.items || (Array.isArray(activeProductsData) ? activeProductsData : []);
    
    if (!Array.isArray(productList)) return [];
    const query = searchQuery.toLowerCase();
    return productList.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(query) || 
                          p.code.toLowerCase().includes(query) ||
                          (p.description && p.description.toLowerCase().includes(query));
      const matchSupplier = selectedSupplierId ? p.supplierId === selectedSupplierId : true;
      return matchSearch && matchSupplier;
    });
  }, [activeProductsData, searchQuery, selectedSupplierId]);

  const filteredProducts = useMemo(() => {
    let filtered = baseFilteredProducts;

    if (stockFilter === "LOW_STOCK") {
      filtered = filtered.filter(p => {
        const effectiveMin = (p.suggestedMin !== null && p.suggestedMin !== undefined)
          ? Number(p.suggestedMin)
          : (Number(p.minStock) || 10);
        return (p.stock || 0) <= effectiveMin && (p.stock || 0) > 0;
      });
    } else if (stockFilter === "OUT_OF_STOCK") {
      filtered = filtered.filter(p => (p.stock || 0) <= 0);
    }

    return [...filtered].sort((a, b) => {
      let valA: any, valB: any;
      if (sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === "stock") {
        valA = a.stock || 0;
        valB = b.stock || 0;
      } else if (sortBy === "price") {
        const pABatch = a.stockBatches?.[0];
        const pBBatch = b.stockBatches?.[0];
        valA = (pABatch && Number(pABatch.sellingPrice) > 0) ? Number(pABatch.sellingPrice) : (Number(a.prices?.[0]?.price) || 0);
        valB = (pBBatch && Number(pBBatch.sellingPrice) > 0) ? Number(pBBatch.sellingPrice) : (Number(b.prices?.[0]?.price) || 0);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [baseFilteredProducts, stockFilter, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSupplierId, stockFilter, sortBy, sortOrder]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const selectedItems = useMemo(() => {
    const productList = productsData?.items || (Array.isArray(productsData) ? productsData : []);
    if (!Array.isArray(productList)) return [];
    return productList.filter((p: any) => selectedIds.has(p.id));
  }, [productsData, selectedIds]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };


  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newProduct.name) return;

    try {
      const sortedPrices = [...(newProduct.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainFactor = Number(sortedPrices[0]?.conversionFactor) || 1;

      const formattedProduct = {
        ...newProduct,
        stock: (Number(newProduct.initialStock) * mainFactor).toString(),
        minStock: (Number(newProduct.minStock) * mainFactor).toString(),
        averageCost: (Number(newProduct.averageCost) / mainFactor).toString(),
        prices: newProduct.prices.map(p => ({
          ...p,
          price: p.price.toString()
        })),
      };

      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        data: formattedProduct
      });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      setNewProduct({ 
        code: "", 
        name: "", 
        description: "",
        categoryId: "", 
        supplierId: "",
        prices: [{ unitId: "", price: "", conversionFactor: 1 }],
        averageCost: "",
        initialStock: "",
        image: "",
        minStock: "10",
        leadTime: "3"
      });
    } catch (error: any) {
      console.error("Failed to update product:", error);
      toast.error(error.message || "Gagal memperbarui barang.");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;

    try {
      const sortedPrices = [...(newProduct.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainFactor = sortedPrices[0]?.conversionFactor || 1;
      const formattedProduct = {
        ...newProduct,
        initialStock: (Number(newProduct.initialStock) * mainFactor).toString(),
        averageCost: (Number(newProduct.averageCost) / mainFactor).toString(),
        prices: newProduct.prices.map(p => ({
          ...p,
          price: p.price.toString()
        })),
        minStock: (Number(newProduct.minStock) * mainFactor).toString()
      };

      await createProductMutation.mutateAsync(formattedProduct);
      setIsAddProductOpen(false);
      setNewProduct({ 
        code: "", 
        name: "", 
        description: "",
        categoryId: "", 
        supplierId: "",
        prices: [{ unitId: "", price: "", conversionFactor: 1 }],
        averageCost: "",
        initialStock: "",
        image: "",
        minStock: "10",
        leadTime: "3"
      });
    } catch (error: any) {
      console.error("Failed to create product:", error);
      toast.error(error.message || "Gagal menambahkan barang.");
    }
  };

  const initiateEditProduct = (product: any) => {
    setSelectedProduct(product);
    const sortedPrices = [...(product.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
    const mainFactor = sortedPrices[0]?.conversionFactor || 1;

    // Decompose current stock
    let remaining = product.stock || 0;
    const initialParts: Record<string, number> = {};
    for (const price of sortedPrices) {
      const factor = price.conversionFactor || 1;
      if (factor > 1) {
        initialParts[price.unitId] = Math.floor(remaining / factor);
        remaining = remaining % factor;
      } else {
        initialParts[price.unitId] = remaining;
        remaining = 0;
      }
    }
    setStockParts(initialParts);

    setNewProduct({
      code: product.code,
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId || "",
      supplierId: product.supplierId || "",
      prices: product.prices && product.prices.length > 0 
        ? product.prices.map((p: any) => ({
            unitId: p.unitId,
            price: p.price.toString(),
            conversionFactor: p.conversionFactor
          }))
        : [{ unitId: "", price: "", conversionFactor: 1 }],
      averageCost: product.averageCost ? (Number(product.averageCost) * mainFactor).toString() : "",
      initialStock: product.stock ? (Number(product.stock) / mainFactor).toString() : "0",
      image: product.image || "",
      minStock: product.minStock ? (Number(product.minStock) / mainFactor).toString() : "10",
      leadTime: product.leadTime !== null && product.leadTime !== undefined ? String(product.leadTime) : "3"
    });
    setIsEditProductOpen(true);
  };

  const stats = useMemo(() => {
    const totalItems = baseFilteredProducts.length;
    const totalValue = baseFilteredProducts.reduce((acc, p) => acc + (Number(p.averageCost || 0) * (p.stock || 0)), 0);
    // Gunakan suggestedMin dinamis jika tersedia, fallback ke minStock statis
    const lowStockItems = baseFilteredProducts.filter(p => {
      const effectiveMin = (p.suggestedMin !== null && p.suggestedMin !== undefined)
        ? Number(p.suggestedMin)
        : (Number(p.minStock) || 10);
      return (p.stock || 0) <= effectiveMin && (p.stock || 0) > 0;
    }).length;
    const outOfStockItems = baseFilteredProducts.filter(p => (p.stock || 0) <= 0).length;

    return [
      { 
        title: "Total Barang", 
        value: totalItems, 
        icon: <Box />, 
        color: "blue" as const,
        onClick: () => setStockFilter("ALL")
      },
      { 
        title: "Nilai Aset", 
        value: formatCurrency(totalValue), 
        icon: <TrendingUp />, 
        color: "green" as const 
      },
      { 
        title: "Stok Menipis", 
        value: lowStockItems, 
        icon: <AlertTriangle />, 
        color: "orange" as const,
        onClick: () => setStockFilter(stockFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK"),
        isActive: stockFilter === "LOW_STOCK"
      },
      { 
        title: "Stok Habis", 
        value: outOfStockItems, 
        icon: <Package />, 
        color: "red" as const,
        onClick: () => setStockFilter(stockFilter === "OUT_OF_STOCK" ? "ALL" : "OUT_OF_STOCK"),
        isActive: stockFilter === "OUT_OF_STOCK"
      },
    ];
  }, [baseFilteredProducts, stockFilter]);

  const renderItemContent = useCallback((index: number, product: any) => {
    const stock = product.stock || 0;
    const newestBatch = product.stockBatches?.[0];
    
    // Urutkan satuan dari TERBESAR ke TERKECIL untuk tampilan Utama
    const sortedPrices = [...(product.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
    const mainPriceObj = sortedPrices[0];
    const mainUnitName = mainPriceObj?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';
    const mainFactor = mainPriceObj?.conversionFactor || 1;

    // Gunakan harga jual dari ProductPrice langsung untuk tampilan Utama agar konsisten dengan input user
    const mainSellingPrice = Number(mainPriceObj?.price) || 0;
    const mainAverageCost = (Number(product.averageCost) || 0) * mainFactor;

    // === DYNAMIC MIN-STOCK LOGIC ===
    // Jika sistem sudah menghitung suggestedMin (dari Peak Demand), gunakan itu sebagai ambang.
    // Jika belum, fallback ke minStock statis yang diinput manual.
    const hasDynamicMin = product.suggestedMin !== null && product.suggestedMin !== undefined;
    const effectiveMinStock = hasDynamicMin ? Number(product.suggestedMin) : (Number(product.minStock) || 10);
    const isLowStock = stock <= effectiveMinStock;
    const isDynamicAlert = hasDynamicMin && stock <= Number(product.suggestedMin) && stock > (Number(product.minStock) || 10);

    // Konversi suggestedMin/Max ke satuan terbesar untuk tampilan
    const suggestedMinMainUnit = hasDynamicMin ? Math.ceil(Number(product.suggestedMin) / mainFactor) : null;
    const suggestedMaxMainUnit = (product.suggestedMax !== null && product.suggestedMax !== undefined)
      ? Math.ceil(Number(product.suggestedMax) / mainFactor)
      : null;
    const recommendedOrderQty = suggestedMaxMainUnit !== null
      ? Math.max(0, suggestedMaxMainUnit - Math.ceil(stock / mainFactor))
      : null;
    
    return (
      <div key={product.id} className="">
        <div 
          onClick={() => isSelectionMode && toggleSelection(product.id)}
          className={cn(
          "hidden lg:grid items-center hover:bg-bg-main/50 transition-colors group min-h-[80px] cursor-pointer",
          isSelectionMode 
            ? (isAdminOrManager ? "grid-cols-[60px_2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[60px_2fr_1fr_1fr_1fr]")
            : (isAdminOrManager ? "grid-cols-[2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1fr_1fr]"),
          isSelectionMode && selectedIds.has(product.id) && "bg-brand-primary/5"
        )}>
          {isSelectionMode && (
            <div className="px-4 py-4 flex items-center justify-center shrink-0">
              <div 
                className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer",
                  selectedIds.has(product.id) 
                    ? "bg-brand-primary border-brand-primary text-white shadow-sm scale-110" 
                    : "bg-white border-border-default hover:border-brand-primary/50"
                )}
              >
                {selectedIds.has(product.id) && <CheckSquare className="w-4 h-4 fill-white/20" />}
              </div>
            </div>
          )}
          <div className="px-6 py-4 flex items-center space-x-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-[32px] bg-bg-main border border-border-default p-1.5 flex-shrink-0 relative overflow-hidden">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                  <Package className="w-6 h-6" />
                </div>
              )}
              {isLowStock && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-status-danger rounded-full border-2 border-bg-main animate-pulse"></div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-brand-primary font-mono tracking-wider truncate mb-0.5">{product.code}</p>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-text-primary truncate">{product.name}</h4>
                {product.abcCategory && (
                  <span className={cn(
                    "flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    product.abcCategory === "A" && "bg-status-danger/10 text-status-danger border-status-danger/30",
                    product.abcCategory === "B" && "bg-status-warning/10 text-status-warning border-status-warning/30",
                    product.abcCategory === "C" && "bg-status-success/10 text-status-success border-status-success/30"
                  )}>
                    {product.abcCategory}
                  </span>
                )}
              </div>
              <span className="inline-block px-2 py-0.5 rounded-lg bg-bg-main text-[9px] font-bold text-text-muted uppercase tracking-wide mt-1">
                {product.category?.name || "Umum"}
              </span>
            </div>
          </div>

          <div className="px-6 py-4 flex flex-col items-center lg:items-end">
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all duration-300",
              stock <= 0 ? "bg-status-danger/5 border-status-danger/20 text-status-danger" : 
              isLowStock ? "bg-status-warning/5 border-status-warning/20 text-status-warning" : 
              "bg-bg-card border-border-default text-text-primary hover:shadow-md hover:border-brand-primary/30"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                stock <= 0 ? "bg-status-danger" : isLowStock ? "bg-status-warning animate-pulse" : "bg-status-success"
              )} />
              <span className="text-sm lg:text-base font-black whitespace-nowrap">
                {formatMultiUnitStock(stock, product.prices)}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                {stock} {product.prices?.find((p: any) => p.conversionFactor === 1)?.unit?.name || 'Unit'} (Total)
              </p>
              {isLowStock && (
                <span className={cn(
                  "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md",
                  stock <= 0 ? "bg-status-danger text-text-inverse" : isDynamicAlert ? "bg-brand-primary/20 text-brand-primary" : "bg-status-warning/20 text-status-warning"
                )}>
                  {stock <= 0 ? "Habis" : isDynamicAlert ? "Pesan Ulang" : "Menipis"}
                </span>
              )}
            </div>
          </div>

          {isAdminOrManager && (
            <div className="px-6 py-4 text-right">
              <p className="text-sm font-bold text-text-secondary">{formatCurrency(mainAverageCost)}</p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">Modal / {mainUnitName}</p>
            </div>
          )}

          <div className="px-6 py-4 text-right">
            <p className="text-base lg:text-lg font-black text-brand-primary">{formatCurrency(mainSellingPrice)}</p>
            {isAdminOrManager && mainSellingPrice > 0 && mainAverageCost > 0 && (
              <p className={cn(
                "text-[9px] font-bold uppercase tracking-tighter mt-0.5",
                mainSellingPrice > mainAverageCost ? "text-status-success" : "text-status-danger"
              )}>
                Laba: {formatCurrency(mainSellingPrice - mainAverageCost)}
              </p>
            )}
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">Harga / {mainUnitName}</p>
          </div>

          <div className="px-6 py-4 flex items-center justify-end space-x-1.5 lg:space-x-2">
            <button 
              onClick={() => {
                setSelectedProduct(product);
                setSelectedProductId(product.id);
                setLogsPage(1);
                setIsHistoryModalOpen(true);
              }}
              className="p-2.5 bg-bg-card border border-border-default hover:bg-status-success hover:border-status-success/20 text-text-secondary hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
              title="Riwayat"
            >
              <History className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button 
              onClick={() => {
                setSelectedProduct(product);
                setSelectedProductId(product.id);
                setIsBatchModalOpen(true);
              }}
              className="p-2.5 bg-bg-card border border-border-default hover:bg-brand-primary hover:border-brand-primary/20 text-text-secondary hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
              title="Daftar Batch"
            >
              <Layers className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button 
              onClick={() => initiateEditProduct(product)}
              className="p-2.5 bg-bg-card border border-border-default hover:bg-status-warning hover:border-status-warning/20 text-text-secondary hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>

        {/* === REKOMENDASI OPTIMASI STOK — Desktop Row Bottom === */}
        {isAdminOrManager && hasDynamicMin && isLowStock && stock > 0 && (
          <div className="hidden lg:block mx-6 mb-4">
            <div className={cn(
              "p-3 rounded-2xl border flex items-start gap-6",
              product.abcCategory === "A"
                ? "bg-status-danger/5 border-status-danger/20"
                : product.abcCategory === "B"
                ? "bg-status-warning/5 border-status-warning/20"
                : "bg-brand-primary/5 border-brand-primary/20"
            )}>
              <BarChart3 className={cn(
                "w-4 h-4 mt-0.5 flex-shrink-0",
                product.abcCategory === "A" ? "text-status-danger" : product.abcCategory === "B" ? "text-status-warning" : "text-brand-primary"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                  💡 Rekomendasi Optimasi Stok
                  {product.abcCategory && (
                    <span className={cn(
                      "ml-2 px-1.5 py-0.5 rounded-md border font-black",
                      product.abcCategory === "A" && "bg-status-danger/10 text-status-danger border-status-danger/30",
                      product.abcCategory === "B" && "bg-status-warning/10 text-status-warning border-status-warning/30",
                      product.abcCategory === "C" && "bg-status-success/10 text-status-success border-status-success/30"
                    )}>
                      Kategori {product.abcCategory}
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-primary leading-relaxed">
                  {isDynamicAlert ? (
                    <>
                      ⚠️ Stok saat ini ({Math.ceil(stock / mainFactor)} {mainUnitName}) <strong>mendekati ambang minimum dinamis</strong> ({suggestedMinMainUnit} {mainUnitName}).
                      {recommendedOrderQty !== null && recommendedOrderQty > 0 && (
                        <> Pesan ke supplier sebanyak <strong className="text-brand-primary">{recommendedOrderQty} {mainUnitName}</strong> untuk mencapai kapasitas aman{suggestedMaxMainUnit !== null ? ` (${suggestedMaxMainUnit} ${mainUnitName})` : ""}.</>
                      )}
                    </>
                  ) : (
                    <>
                      🔴 Stok ({Math.ceil(stock / mainFactor)} {mainUnitName}) <strong>di bawah ambang minimum dinamis</strong> ({suggestedMinMainUnit} {mainUnitName}).
                      {recommendedOrderQty !== null && recommendedOrderQty > 0 && (
                        <> Segera pesan ke supplier minimal <strong className="text-status-danger">{recommendedOrderQty} {mainUnitName}</strong>{suggestedMaxMainUnit !== null ? ` untuk mencapai stok aman (${suggestedMaxMainUnit} ${mainUnitName})` : ""}.</>
                      )}
                    </>
                  )}
                </p>
              </div>

              {/* Tombol Quick Stock-in — Compact */}
              {recommendedOrderQty !== null && recommendedOrderQty > 0 && (
                <button
                  onClick={() => navigate("/inventory/stock-in", {
                    state: {
                      quickStockIn: {
                        product,
                        quantity: recommendedOrderQty,
                        unitId: mainPriceObj?.unitId,
                        conversionFactor: mainFactor
                      }
                    }
                  })}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 text-white",
                    product.abcCategory === "A"
                      ? "bg-status-danger hover:bg-status-danger/90"
                      : product.abcCategory === "B"
                      ? "bg-status-warning hover:bg-status-warning/90"
                      : "bg-brand-primary hover:bg-brand-hover"
                  )}
                  title={`Beli ${recommendedOrderQty} ${mainUnitName} sekarang`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Beli {recommendedOrderQty} {mainUnitName}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div 
          onClick={() => isSelectionMode && toggleSelection(product.id)}
          className={cn(
            "lg:hidden bg-bg-card border rounded-[1.8rem] p-4 space-y-8 w-full active:scale-[0.98] transition-all duration-300 relative overflow-hidden",
            isSelectionMode && selectedIds.has(product.id) 
              ? "border-brand-primary bg-brand-primary/[0.03] ring-1 ring-brand-primary/20" 
              : "border-border-default shadow-sm"
          )}
        >
          <div className="flex items-center gap-6">
            {isSelectionMode && (
              <div className="shrink-0 animate-in slide-in-from-left-2 duration-200">
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                  selectedIds.has(product.id) 
                    ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-110" 
                    : "bg-white border-border-default"
                )}>
                  {selectedIds.has(product.id) && <CheckSquare className="w-4 h-4 fill-white/20" />}
                </div>
              </div>
            )}
            <div className="flex-1 flex items-center justify-between gap-6 min-w-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-12 h-12 rounded-[24px] bg-bg-main border border-border-default p-1 flex-shrink-0 relative">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  {isLowStock && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-status-danger rounded-full border-2 border-bg-card animate-pulse"></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-text-primary leading-tight line-clamp-2">{product.name}</h4>
                    {product.abcCategory && (
                      <span className={cn(
                        "flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                        product.abcCategory === "A" && "bg-status-danger/10 text-status-danger border-status-danger/30",
                        product.abcCategory === "B" && "bg-status-warning/10 text-status-warning border-status-warning/30",
                        product.abcCategory === "C" && "bg-status-success/10 text-status-success border-status-success/30"
                      )}>
                        {product.abcCategory}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-brand-primary font-mono tracking-wider truncate shrink-0 max-w-[50%]">{product.code}</span>
                    <span className="w-1 h-1 rounded-full bg-text-muted/30 shrink-0"></span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase truncate min-w-0">{product.category?.name || "Umum"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <p className="text-base font-black text-brand-primary">{formatCurrency(mainSellingPrice)}</p>
                {isAdminOrManager && mainAverageCost > 0 && (
                  <p className="text-[9px] font-bold text-text-muted uppercase mt-0.5">Modal: {formatCurrency(mainAverageCost)}</p>
                )}
                <p className="text-[9px] font-bold text-text-muted uppercase mt-0.5">/ {mainUnitName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
            {/* Stok Badge + Label */}
            <div className="flex flex-col">
              <div className={cn(
                "flex items-center space-x-2 px-2.5 py-1 rounded-lg border",
                stock <= 0 ? "bg-status-danger/5 border-status-danger/20 text-status-danger" :
                isLowStock ? "bg-status-warning/5 border-status-warning/20 text-status-warning" :
                "bg-bg-main border-border-default text-text-primary"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  stock <= 0 ? "bg-status-danger" : isLowStock ? "bg-status-warning animate-pulse" : "bg-status-success"
                )} />
                <span className="text-xs font-black">{formatMultiUnitStock(stock, product.prices)}</span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <p className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">
                  Total: {stock} {product.prices?.find((p: any) => p.conversionFactor === 1)?.unit?.name || 'Unit'}
                </p>
                {isLowStock && (
                  <span className={cn(
                    "text-[7px] font-black uppercase px-1 rounded-sm",
                    stock <= 0 ? "bg-status-danger text-text-inverse" : isDynamicAlert ? "bg-brand-primary/20 text-brand-primary" : "bg-status-warning/20 text-status-warning"
                  )}>
                    {stock <= 0 ? "Habis" : isDynamicAlert ? "Pesan Ulang" : "Low"}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons + Quick Stock-in */}
            <div className="flex items-center gap-1">
              {/* Quick Stock-in compact button */}
              {isAdminOrManager && hasDynamicMin && isLowStock && stock > 0 && recommendedOrderQty !== null && recommendedOrderQty > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/inventory/stock-in", {
                      state: {
                        quickStockIn: {
                          product,
                          quantity: recommendedOrderQty,
                          unitId: mainPriceObj?.unitId,
                          conversionFactor: mainFactor
                        }
                      }
                    });
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wide transition-all active:scale-95 text-white",
                    product.abcCategory === "A" ? "bg-status-danger" :
                    product.abcCategory === "B" ? "bg-status-warning" :
                    "bg-brand-primary"
                  )}
                  title={`Beli ${recommendedOrderQty} ${mainUnitName} sekarang`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>{recommendedOrderQty} {mainUnitName}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedProduct(product);
                  setSelectedProductId(product.id);
                  setIsHistoryModalOpen(true);
                }}
                className="p-2 bg-bg-main border border-border-default text-text-secondary hover:bg-status-success hover:border-status-success/20 hover:text-white transition-all active:scale-95 rounded-lg shadow-sm"
                title="Riwayat"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedProduct(product);
                  setSelectedProductId(product.id);
                  setIsBatchModalOpen(true);
                }}
                className="p-2 bg-bg-main border border-border-default text-text-secondary hover:bg-brand-primary hover:border-brand-primary/20 hover:text-white transition-all active:scale-95 rounded-lg shadow-sm"
                title="Daftar Batch"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => initiateEditProduct(product)}
                className="p-2 bg-bg-main border border-border-default text-text-secondary hover:bg-status-warning hover:border-status-warning/20 hover:text-white transition-all active:scale-95 rounded-lg shadow-sm"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rekomendasi Optimasi — Mobile info strip (bawah card) */}
          {isAdminOrManager && hasDynamicMin && isLowStock && stock > 0 && (
            <p className={cn(
              "text-[9px] font-medium leading-relaxed px-1",
              isDynamicAlert ? "text-brand-primary" : "text-status-danger"
            )}>
              {isDynamicAlert ? "⚠️" : "🔴"} Min dinamis: <strong>{suggestedMinMainUnit} {mainUnitName}</strong>
              {recommendedOrderQty !== null && recommendedOrderQty > 0 && (
                <> · Pesan <strong>{recommendedOrderQty} {mainUnitName}</strong></>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }, [isSelectionMode, selectedIds, isAdminOrManager]);

  return (
    <phantom-ui loading={isLoadingProducts} reveal={0.3}>
      <div className="flex-1 flex flex-col bg-bg-main overflow-y-auto custom-scrollbar relative pb-24 lg:pb-8">
      {/* Header Dashboard */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-text-primary">Inventori Barang</h1>
            <p className="text-xs lg:text-sm text-text-muted font-medium mt-1">Kelola stok dan harga jual barang Anda</p>
          </div>
        </div>

        {/* Stats Cards (Carousel on Mobile) */}
        <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide snap-x snap-mandatory">
          {stats.map((stat, idx) => (
            <div key={idx} className="min-w-[200px] flex-1 lg:min-w-0 snap-center">
              <SummaryCard {...stat} isLoading={isLoadingProducts} />
            </div>
          ))}
        </div>
      </div>

      {/* Combined Container for Action Bar & Table */}
      <div className="px-4 lg:px-6 py-6 flex flex-col">
        <div className="rounded-[32px] lg:rounded-[2.5rem] border flex flex-col bg-bg-card border-border-default transition-all duration-300 transform-gpu overflow-visible">
          
          {/* Sticky Action Bar - Now inside the card */}
          <div className="sticky top-0 z-30 bg-bg-card p-8 lg:p-8 border-b border-border-subtle rounded-t-2xl lg:rounded-t-[2.5rem]">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="relative flex-1 flex items-center group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  autoFocus
                  placeholder="Cari barang (Tekan '/' atau Scan Barcode)"
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-6 pb-0.5 lg:pb-0">
                <div className="w-[220px] lg:w-[280px] shrink-0">
                  <SearchableSelect
                    options={[
                      { id: "", name: "Semua Pemasok" },
                      ...suppliers.map((s: any) => ({ id: s.id, name: s.name }))
                    ]}
                    value={selectedSupplierId}
                    onChange={(val) => setSelectedSupplierId(val)}
                    placeholder="Semua Pemasok"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="w-11 h-[44px] flex items-center justify-center border rounded-xl bg-bg-main border-border-default text-text-secondary hover:bg-bg-card transition-all shrink-0"
                    title="Ganti Urutan"
                  >
                    <Filter className={cn("w-4 h-4", sortOrder === "desc" && "rotate-180")} />
                  </button>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[44px] [&>option]:bg-bg-main [&>option]:text-text-primary w-full lg:w-auto shrink-0"
                  >
                    <option value="name">Nama</option>
                    <option value="stock">Stok</option>
                    <option value="price">Harga</option>
                  </select>
                </div>
                
                {/* Mobile Select All Button */}
                {isSelectionMode && (
                  <button 
                    onClick={handleSelectAll}
                    className={cn(
                      "lg:hidden flex items-center space-x-2 px-4 h-11 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shrink-0 border",
                      selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                        ? "bg-brand-primary border-brand-primary text-white" 
                        : "bg-bg-main border-border-default text-text-secondary"
                    )}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedIds.size === filteredProducts.length ? "Batal Semua" : "Pilih Semua"}</span>
                  </button>
                )}

                <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-border-default">
                  <button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedIds(new Set());
                    }}
                    className={cn(
                      "flex items-center space-x-2 px-5 h-11 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0",
                      isSelectionMode 
                        ? "bg-bg-main border-2 border-brand-primary text-brand-primary" 
                        : "bg-bg-main border border-border-default text-text-secondary hover:bg-bg-card"
                    )}
                    title="Mode Cetak QR"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>Mode QR</span>
                  </button>

                  {isSelectionMode && selectedIds.size > 0 && (
                    <button 
                      onClick={() => {
                        setQrQueueItems(selectedItems);
                        setIsQRManagerOpen(true);
                      }}
                      className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all animate-in zoom-in duration-200"
                    >
                      <Printer className="w-5 h-5" />
                      <span>Cetak ({selectedIds.size})</span>
                    </button>
                  )}

                  <Link 
                    to="/inventory/stock-in"
                    className="flex items-center space-x-2 px-5 h-11 bg-status-success text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-status-success/20 hover:bg-status-success/80 transition-all active:scale-95 shrink-0"
                  >
                    <ArrowDownLeft className="w-5 h-5" />
                    <span>Stok Masuk</span>
                  </Link>
                  <button 
                    onClick={() => {
                      setNewProduct({ 
                        code: "", 
                        name: "", 
                        description: "",
                        categoryId: "", 
                        supplierId: "",
                        prices: [{ unitId: "", price: "", conversionFactor: 1 }],
                        averageCost: "",
                        initialStock: "",
                        image: "",
                        minStock: "10",
                        leadTime: "3"
                      });
                      setStockParts({});
                      setIsAddProductOpen(true);
                    }}
                    className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Tambah Barang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product List/Table Section */}
          <div className="w-full p-0 flex flex-col">
            {paginatedProducts.length === 0 ? (
              <div className="py-4">
                {searchQuery || selectedSupplierId ? (
                  <EmptyState 
                    icon={Search}
                    title="Barang Tidak Ditemukan"
                    description="Coba gunakan kata kunci lain atau bersihkan filter pencarian untuk menemukan apa yang Anda cari."
                    action={{
                      label: "Bersihkan Pencarian",
                      onClick: () => { 
                        setSearchQuery(""); 
                        setSelectedSupplierId(""); 
                      },
                      icon: X
                    }}
                  />
                ) : (
                  <EmptyState 
                    icon={Package}
                    title="Inventori Masih Kosong"
                    description="Anda belum menambahkan produk apapun ke dalam sistem. Mulai tambahkan barang pertama Anda sekarang."
                    action={{
                      label: "Tambah Barang Baru",
                      onClick: () => {
                        setNewProduct({ 
                          code: "", 
                          name: "", 
                          description: "",
                          categoryId: "", 
                          supplierId: "",
                          prices: [{ unitId: "", price: "", conversionFactor: 1 }],
                          averageCost: "",
                          initialStock: "",
                          image: "",
                          minStock: "10",
                          leadTime: "3"
                        });
                        setStockParts({});
                        setIsAddProductOpen(true);
                      },
                      icon: Plus
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <VirtuosoHeader 
                  isAdminOrManager={isAdminOrManager} 
                  isSelectionMode={isSelectionMode}
                  onSelectAll={handleSelectAll}
                  allSelected={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                />
              <div className="flex flex-col gap-6 p-4 lg:p-0 lg:gap-0 lg:divide-y lg:divide-border-subtle">
                {paginatedProducts.map((product, index) => renderItemContent(index, product))}
              </div>
              </div>
            )}

            {/* Pagination Controls - Now part of the same card */}
            {totalItems > 0 && (
              <div className="px-8 py-8 lg:px-8 lg:py-8 border-t border-border-subtle bg-bg-card flex-shrink-0 rounded-b-2xl lg:rounded-b-[2.5rem]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] lg:text-xs font-bold text-text-muted whitespace-nowrap uppercase tracking-wider">
                      Hal {currentPage} dari {totalPages} • {totalItems} Data
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                    >
                      <option value={15}>15 per hal</option>
                      <option value={50}>50 per hal</option>
                      <option value={100}>100 per hal</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                    >
                      Sebelumnya
                    </button>
                    <div className="flex px-2 space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pNum = i + 1;
                        if (totalPages > 3 && currentPage > 2) pNum = Math.min(currentPage - 1 + i, totalPages - 2 + i);
                        return (
                          <button
                            key={pNum}
                            onClick={() => setCurrentPage(pNum)}
                            className={cn(
                              "w-9 h-9 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center",
                              currentPage === pNum 
                                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                                : "bg-bg-main text-text-secondary border border-border-default hover:bg-bg-card"
                            )}
                          >
                            {pNum}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Selection Action Bar */}
      {isSelectionMode && (
        <div className="lg:hidden fixed bottom-24 left-6 right-6 z-[60] animate-in slide-in-from-bottom-10 duration-300">
          <div className={cn(
            "rounded-2xl shadow-2xl p-4 flex items-center justify-between transition-all duration-300",
            selectedIds.size > 0 ? "bg-brand-primary text-white scale-100" : "bg-bg-card border border-border-default text-text-primary scale-95 opacity-80"
          )}>
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                selectedIds.size > 0 ? "bg-white/20" : "bg-bg-main border border-border-default"
              )}>
                <QrCode className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider">{selectedIds.size} Terpilih</span>
                {selectedIds.size === 0 && <span className="text-[8px] font-bold opacity-60">Pilih barang untuk mencetak</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                  selectedIds.size > 0 ? "bg-white/10 hover:bg-white/20" : "text-status-danger bg-status-danger/10"
                )}
              >
                {selectedIds.size > 0 ? "Batal" : "Keluar"}
              </button>
              {selectedIds.size > 0 && (
                <button 
                  onClick={() => {
                    setQrQueueItems(selectedItems);
                    setIsQRManagerOpen(true);
                  }}
                  className="px-4 py-2 bg-white text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-all active:scale-95"
                >
                  Cetak
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB: QR Mode Toggle */}
      <button 
        onClick={() => {
          setIsSelectionMode(!isSelectionMode);
          if (isSelectionMode) setSelectedIds(new Set());
        }}
        className={cn(
          "lg:hidden fixed bottom-24 right-24 z-40 w-14 h-14 border-2 border-bg-main rounded-full shadow-2xl flex items-center justify-center transition-all",
          isSelectionMode 
            ? "bg-brand-primary text-white scale-110" 
            : "bg-bg-card text-text-secondary hover:scale-110 active:scale-95"
        )}
      >
        <QrCode className="w-6 h-6" />
      </button>

      {/* Mobile FAB: Stok Masuk */}
      <Link 
        to="/inventory/stock-in"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-status-success text-text-inverse border-2 border-bg-main rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-status-success/20"
      >
        <ArrowDownLeft className="w-6 h-6" />
      </Link>

      {/* Modals are simplified below for brevity in step, but should be fully implemented as before */}

      {/* Add/Edit Product Modal */}
      {(isEditProductOpen || isAddProductOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className={cn("lg:hidden w-full flex justify-center pt-3 pb-1", isEditProductOpen ? "bg-status-warning" : "bg-brand-primary")}>
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className={cn("p-4 lg:p-6 border-b flex items-center justify-between border-border-subtle flex-shrink-0", isEditProductOpen ? "bg-status-warning" : "bg-brand-primary")}>
              <h3 className="text-base lg:text-lg font-black text-text-inverse">{isEditProductOpen ? "Edit Barang" : "Tambah Barang Baru"}</h3>
              <button onClick={() => { setIsEditProductOpen(false); setIsAddProductOpen(false); }} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            <form 
              onSubmit={isEditProductOpen ? handleEditProduct : handleAddProduct} 
              className="flex flex-col flex-1 overflow-hidden"
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  if (isEditProductOpen) handleEditProduct(e as any);
                  else handleAddProduct(e as any);
                }
              }}
            >
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8 lg:space-y-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Gambar Barang</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[24px] flex items-center justify-center overflow-hidden flex-shrink-0 border bg-bg-main border-border-default">
                      {newProduct.image ? (
                        <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package className="w-6 h-6 lg:w-8 lg:h-8 text-text-muted/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden rounded-lg" 
                        id="product-image-edit"
                      />
                      <label 
                        htmlFor="product-image-edit"
                        className="inline-block px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                      >
                        {newProduct.image ? "Ubah Gambar" : "Unggah Gambar"}
                      </label>
                      {newProduct.image && (
                        <button 
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, image: "" })}
                          className="ml-2 text-xs font-bold text-status-danger hover:text-status-danger/80"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={cn("grid grid-cols-1 gap-6", isEditProductOpen ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
                  {isEditProductOpen && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Kode Barang</label>
                      <input 
                        type="text" 
                        readOnly
                        className="w-full p-3 lg:p-3.5 bg-bg-main/50 border border-border-default text-sm text-text-muted font-mono cursor-not-allowed rounded-lg h-[44px]"
                        value={newProduct.code}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Barang</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Semen Gresik 50kg"
                      className="w-full p-3 lg:p-3.5 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Deskripsi</label>
                  <textarea 
                    placeholder="Keterangan tambahan barang..."
                    className="w-full p-3 lg:p-3.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[60px] lg:min-h-[80px] border bg-bg-main border-border-default text-text-primary transition-all"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Kategori</label>
                    <select 
                      required
                      className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {categoriesData?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Pemasok</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                      value={newProduct.supplierId}
                      onChange={(e) => setNewProduct({...newProduct, supplierId: e.target.value})}
                    >
                      <option value="">-- Tanpa Pemasok --</option>
                      {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-8 bg-bg-main/50 p-4 rounded-[2rem] border border-border-subtle">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Daftar Satuan & Harga</label>
                    <button 
                      type="button"
                      onClick={addPriceRow}
                      className="flex items-center space-x-1.5 .5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white transition-all group rounded-full px-7 py-[14px] text-[14px] font-bold active:scale-95 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Tambah Satuan</span>
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    {newProduct.prices.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end p-8 bg-bg-card border border-border-default rounded-[32px] animate-in fade-in zoom-in duration-200">
                        <div className="lg:col-span-4 space-y-1.5">
                          <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest ml-1">Satuan {index === 0 && "(Utama)"}</label>
                          <select 
                            required
                            className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                            value={item.unitId}
                            onChange={(e) => updatePriceRow(index, "unitId", e.target.value)}
                          >
                            <option value="">-- Satuan --</option>
                            {unitsData?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                        <div className="lg:col-span-4 space-y-1.5">
                          <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest ml-1">Harga Jual</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-bold">Rp</span>
                            <input 
                              type="number" 
                              required
                              placeholder="0"
                              className="w-full pl-8 p-2.5 bg-bg-main border border-border-default text-xs font-black focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary rounded-lg h-[44px]"
                              value={item.price}
                              onChange={(e) => updatePriceRow(index, "price", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="lg:col-span-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 ml-1">
                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Isi / Konversi</label>
                            <div className="relative group/tooltip flex items-center">
                              <HelpCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help transition-colors" />
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-brand-primary text-[10px] text-text-inverse font-medium rounded-[24px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[90] leading-relaxed normal-case text-left transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                                Jumlah satuan terkecil dalam 1 unit ini.
                                <div className="mt-1.5 border-t border-text-inverse/10 pt-1.5 text-text-inverse/70">
                                  <strong>Aturan Konversi:</strong><br/>
                                  &bull; Gunakan <strong>1</strong> untuk satuan terkecil (misal: Karung).<br/>
                                  &bull; Untuk satuan besar (misal: Kol), isi jumlah karung dalam 1 kol (misal: 10).
                                </div>
                                <div className="absolute top-full right-[2px] border-[5px] border-transparent border-t-brand-primary"></div>
                              </div>
                            </div>
                          </div>
                          <input 
                            type="number" 
                            required
                            min="0.000001"
                            step="any"
                            placeholder="1"
                            className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary rounded-lg h-[44px]"
                            value={item.conversionFactor}
                            onChange={(e) => updatePriceRow(index, "conversionFactor", e.target.value)}
                          />
                        </div>
                        <div className="lg:col-span-1 flex justify-end pb-0.5">
                          {newProduct.prices.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removePriceRow(index)}
                              className="p-2 text-status-danger hover:bg-status-danger/10 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isAdminOrManager && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Harga Modal (Avg Cost)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                      <input 
                        type="number" 
                        className="w-full pl-11 p-3.5 bg-bg-main border border-border-default text-sm font-black focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                        value={newProduct.averageCost}
                        onChange={(e) => setNewProduct({...newProduct, averageCost: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {isAdminOrManager && Number(newProduct.prices[0]?.price) > 0 && Number(newProduct.averageCost) > 0 && Number(newProduct.prices[0]?.price) < Number(newProduct.averageCost) && (
                  <div className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-[32px] flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 text-status-danger mt-0.5 flex-shrink-0" />
                    <div className="text-xs font-bold text-status-danger uppercase tracking-tight leading-tight">
                      Peringatan: Harga jual (satuan ke-1) lebih rendah dari harga modal!<br/>
                      Potensi rugi: Rp {Number(newProduct.averageCost) - Number(newProduct.prices[0]?.price)} per unit.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Stok Minimum</label>
                    <input 
                      type="number" 
                      required
                      step="any"
                      className="w-full p-3 lg:p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary border bg-bg-main border-border-default text-text-primary transition-all rounded-lg h-[44px]"
                      value={newProduct.minStock}
                      onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 ml-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Lead Time Supplier
                      </label>
                      <div className="relative group/tooltip flex items-center">
                        <HelpCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help transition-colors" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-brand-primary text-[10px] text-text-inverse font-medium rounded-[24px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[90] leading-relaxed normal-case text-left transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                          Estimasi hari dari pemesanan hingga barang tiba dari supplier. Digunakan sistem untuk menghitung rekomendasi stok minimum otomatis (Optimasi ABC).
                          <div className="mt-1.5 border-t border-text-inverse/10 pt-1.5 text-text-inverse/70">
                            Contoh: Semen = 2 hari &bull; Keramik = 5 hari &bull; Besi = 7 hari
                          </div>
                          <div className="absolute top-full right-[2px] border-[5px] border-transparent border-t-brand-primary"></div>
                        </div>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        min={0}
                        max={90}
                        className="w-full p-3 pr-12 lg:p-3.5 lg:pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary border bg-bg-main border-border-default text-text-primary transition-all rounded-lg h-[44px]"
                        value={newProduct.leadTime}
                        onChange={(e) => setNewProduct({...newProduct, leadTime: e.target.value})}
                        placeholder="3"
                      />
                      <span className="absolute right-4 text-xs font-bold text-text-muted">hari</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">
                    {isEditProductOpen ? "Stok Saat Ini (Detail per Satuan)" : "Stok Awal (Detail per Satuan)"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {newProduct.prices.map((p, idx) => {
                      const unitObj = unitsData?.find((u: any) => u.id === p.unitId);
                      const unitName = unitObj?.name || `Satuan ${idx + 1}`;
                      return (
                        <div key={p.unitId || idx} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">{unitName}</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0"
                            className="w-full p-3 lg:p-3.5 bg-bg-main border border-border-default text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                            value={stockParts[p.unitId || ""] || ""}
                            onChange={(e) => handleStockPartChange(p.unitId, Number(e.target.value) || 0)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="submit"
                    disabled={updateProductMutation.isPending || createProductMutation.isPending}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
                  >
                    {(updateProductMutation.isPending || createProductMutation.isPending) && (
                      <div className="w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin"></div>
                    )}
                    <span>{isEditProductOpen ? "Simpan Perubahan" : "Tambah Barang"}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsEditProductOpen(false); setIsAddProductOpen(false); }}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-text-inverse/10 rounded-[24px] flex items-center justify-center text-text-inverse">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-inverse">Riwayat Stok</h3>
                  <p className="text-xs text-text-inverse/60 font-bold uppercase tracking-wider">{selectedProduct.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                }} 
                className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLogsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-8">
                  <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-text-muted">Memuat riwayat...</p>
                </div>
              ) : stockLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-text-muted bg-bg-main">
                    <History className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-text-muted text-center">Belum ada riwayat transaksi stok untuk barang ini.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {stockLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 p-4 rounded-[32px] border bg-bg-main border-border-subtle">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        log.type === "IN" ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"
                      )}>
                        {log.type === "IN" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm font-black",
                            log.type === "IN" ? "text-status-success" : "text-status-danger"
                          )}>
                            {log.type === "IN" ? "+" : "-"}{formatMultiUnitStock(log.quantity, selectedProduct.prices)}
                          </p>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {new Date(log.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <p className="text-sm font-bold mt-1 text-text-secondary">{log.reason || "Tanpa keterangan"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 lg:p-6 border-t flex-shrink-0 bg-bg-main border-border-subtle space-y-8">
              {logsTotal > 10 && (
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Halaman {logsPage} dari {Math.ceil(logsTotal / 10)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <button 
                      disabled={logsPage <= 1}
                      onClick={() => setLogsPage(prev => prev - 1)}
                      className="px-3 py-1.5 bg-bg-card border border-border-default rounded-lg text-[10px] font-bold text-text-secondary hover:bg-bg-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      disabled={logsPage >= Math.ceil(logsTotal / 10)}
                      onClick={() => setLogsPage(prev => prev + 1)}
                      className="px-3 py-1.5 bg-brand-primary text-text-inverse rounded-lg text-[10px] font-bold hover:bg-brand-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-primary/10"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-colors bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch List Modal */}
      {isBatchModalOpen && (
        <BatchModal 
          isOpen={isBatchModalOpen} 
          onClose={() => { setIsBatchModalOpen(false); setSelectedProduct(null); setSelectedProductId(null); }} 
          productId={selectedProductId || ""} 
          productName={selectedProduct?.name || ""}
          onPrint={(item) => {
            setQrQueueItems([item]);
            setIsQRManagerOpen(true);
          }}
        />
      )}
      <QRPrintManager 
        isOpen={isQRManagerOpen}
        initialItems={qrQueueItems}
        onClose={() => {
          setIsQRManagerOpen(false);
          setQrQueueItems([]);
        }}
      />
    </div>
    </phantom-ui>
  );
}

// Sub-component for Batch Modal to keep main component clean
function BatchModal({ isOpen, onClose, productId, productName, onPrint }: { 
  isOpen: boolean, 
  onClose: () => void, 
  productId: string, 
  productName: string,
  onPrint: (item: any) => void
}) {
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const { data: batches, isLoading } = useProductBatches(productId, activeOnly);
  const { data: product } = useProducts();
 
  // removed printData as it's handled by QRPrintManager via parent onPrint

  const productInfo = Array.isArray(product) ? product.find(p => p.id === productId) : product?.items?.find((p: any) => p.id === productId);

  // Ambil satuan utama untuk skala tampilan
  const sortedPrices = [...(productInfo?.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
  const mainPriceObj = sortedPrices[0];
  const mainFactor = mainPriceObj?.conversionFactor || 1;
  const mainUnitName = mainPriceObj?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';

  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    const query = searchQuery.toLowerCase();
    return batches.filter((b: any) => {
      const matchesSearch = b.id.toLowerCase().includes(query) || 
        (b.purchaseItem?.purchase?.invoiceNumber?.toLowerCase().includes(query)) ||
        (b.purchaseItem?.purchase?.supplier?.name?.toLowerCase().includes(query));
      
      const matchesActiveFilter = activeOnly ? b.currentQuantity > 0 : true;
      
      return matchesSearch && matchesActiveFilter;
    });
  }, [batches, searchQuery, activeOnly]);

  const consolidatedBatches = useMemo(() => {
    if (!filteredBatches) return [];
    return filteredBatches;
  }, [filteredBatches]);

  const stats = useMemo(() => {
    if (!batches) return { totalStock: 0, activeCount: 0, avgPrice: 0 };
    const active = batches.filter((b: any) => b.currentQuantity > 0);
    const totalBaseStock = active.reduce((acc: number, b: any) => acc + b.currentQuantity, 0);
    const avgBasePrice = active.length > 0 
      ? active.reduce((acc: number, b: any) => acc + Number(b.sellingPrice), 0) / active.length 
      : 0;
    
    return { 
      totalStock: (totalBaseStock / mainFactor).toFixed(2), 
      activeCount: consolidatedBatches.length, 
      avgPrice: avgBasePrice * mainFactor 
    };
  }, [batches, mainFactor, consolidatedBatches.length]);

  return (
    <>
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
      <div className="bg-bg-modal w-full rounded-t-[2rem] lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col h-[92vh] lg:h-auto lg:max-h-[90vh] lg:max-w-3xl text-text-primary">
        {/* Mobile Drag Handle */}
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary shrink-0">
          <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
        </div>

        {/* Header Section */}
        <div className="p-4 lg:p-6 border-b border-white/10 bg-brand-primary relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between relative z-10 gap-6">
            <div className="flex items-center space-x-3 lg:space-x-4">
               <div className="p-2 lg:p-2.5 bg-white/20 backdrop-blur-md rounded-xl lg:rounded-[32px] shadow-inner shrink-0">
                  <Layers className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
               </div>
               <div className="min-w-0">
                  <h3 className="text-base lg:text-lg font-black text-white leading-tight">Batch FIFO</h3>
                  <div className="flex items-center space-x-2 mt-0.5 min-w-0">
                    <span className="shrink-0 px-1.5 py-0.5 bg-white/20 rounded text-[8px] lg:text-[9px] font-bold text-white uppercase tracking-wider">
                      {productInfo?.code || 'NO-CODE'}
                    </span>
                    <p className="text-[10px] lg:text-xs font-bold text-white/80 uppercase tracking-widest truncate">{productName}</p>
                  </div>
               </div>
            </div>

            {/* Stats Bar - Horizontal Scroll on Mobile, Compact Inline on Web */}
            <div className="flex items-center gap-2 lg:gap-6 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-hide shrink-0">
              <div className="min-w-[90px] lg:min-w-0 bg-white/10 backdrop-blur-sm rounded-lg lg:rounded-[24px] px-2.5 py-1.5 lg:px-3 lg:py-2 border border-white/5 flex flex-col lg:flex-row lg:items-center lg:gap-2">
                <p className="text-[7px] lg:text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Stok</p>
                <p className="text-[11px] lg:text-xs font-black text-white mt-0.5 lg:mt-0 whitespace-nowrap">{stats.totalStock} <span className="text-[8px] font-bold text-white/40">{mainUnitName}</span></p>
              </div>
              <div className="min-w-[90px] lg:min-w-0 bg-white/10 backdrop-blur-sm rounded-lg lg:rounded-[24px] px-2.5 py-1.5 lg:px-3 lg:py-2 border border-white/5 flex flex-col lg:flex-row lg:items-center lg:gap-2">
                <p className="text-[7px] lg:text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Aktif</p>
                <p className="text-[11px] lg:text-xs font-black text-white mt-0.5 lg:mt-0 whitespace-nowrap">{stats.activeCount}</p>
              </div>
              <div className="min-w-[90px] lg:min-w-0 bg-white/10 backdrop-blur-sm rounded-lg lg:rounded-[24px] px-2.5 py-1.5 lg:px-3 lg:py-2 border border-white/5 flex flex-col lg:flex-row lg:items-center lg:gap-2">
                <p className="text-[7px] lg:text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Avg.</p>
                <p className="text-[11px] lg:text-xs font-black text-white mt-0.5 lg:mt-0 whitespace-nowrap">{formatCompactCurrency(stats.avgPrice)}</p>
              </div>
              
              {/* Close Button Desktop Only */}
              <button onClick={onClose} className="hidden lg:flex bg-white/10 hover:bg-white/20 text-white transition-all p-2 ml-1 rounded-full active:scale-95 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Close Button Mobile Only (Absolute to Top Right) */}
            <button onClick={onClose} className="lg:hidden absolute top-0 right-0 bg-white/10 text-white p-2 rounded-full active:scale-95 transition-transform">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search - Sticky */}
        <div className="sticky top-0 z-20 bg-bg-card p-8 lg:px-7 border-b border-border-subtle/50 flex flex-col sm:flex-row gap-6 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Cari invoice atau ID..."
              className="w-full pl-10 pr-4 py-2 lg:py-2.5 bg-bg-main border border-border-default text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all font-medium rounded-lg h-[44px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center bg-bg-main p-1 rounded-[24px] border border-border-default w-full sm:w-auto">
            <button 
              onClick={() => setActiveOnly(true)}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black uppercase tracking-wider transition-all",
                activeOnly ? "bg-brand-primary text-white shadow-sm" : "text-text-muted hover:text-text-secondary"
              )}
            >
              Hanya Aktif
            </button>
            <button 
              onClick={() => setActiveOnly(false)}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black uppercase tracking-wider transition-all",
                !activeOnly ? "bg-brand-primary text-white shadow-sm" : "text-text-muted hover:text-text-secondary"
              )}
            >
              Semua Batch
            </button>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-7 bg-bg-main/30 pb-20 lg:pb-7">
          {isLoading ? (
            <div className="space-y-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-bg-card border border-border-subtle animate-pulse rounded-[32px]" />
              ))}
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-text-muted text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-full bg-bg-card flex items-center justify-center mb-4 border border-border-subtle">
                <Database className="w-8 lg:w-10 h-8 lg:h-10 opacity-20" />
              </div>
              <h4 className="font-black text-text-secondary text-sm lg:text-base">Tidak Ada Data</h4>
              <p className="text-[10px] lg:text-xs font-medium max-w-[200px] mt-1">Belum ada data batch yang sesuai dengan filter pencarian Anda.</p>
              {!activeOnly && (
                <button 
                  onClick={() => setActiveOnly(true)}
                  className="mt-4 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-brand-primary/20 transition-all"
                >
                  Kembali ke Batch Aktif
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:gap-6 pb-6">
               {consolidatedBatches.map((batch: any) => {
                 const isOutOfStock = batch.currentQuantity <= 0;
                 const stockPercentage = (batch.currentQuantity / batch.initialQuantity) * 100;
                 
                 return (
                   <div key={batch.id} className={cn(
                     "group p-4 lg:p-5 rounded-[1.5rem] lg:rounded-3xl border transition-all duration-300",
                     !isOutOfStock 
                        ? "bg-bg-card border-border-default hover:border-brand-primary/30" 
                        : "bg-bg-card/50 border-border-subtle opacity-70 grayscale-[0.3]"
                   )}>
                      <div className="flex justify-between items-start mb-3 lg:mb-4">
                         <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg text-[7px] lg:text-[8px] font-black uppercase tracking-widest shrink-0",
                                !isOutOfStock ? "bg-status-success/10 text-status-success" : "bg-text-muted/10 text-text-muted"
                              )}>
                                 {!isOutOfStock ? 'Batch Aktif' : 'Batch Terpakai'}
                              </span>
                              <span className="text-[8px] lg:text-[9px] font-mono text-text-muted bg-bg-main px-1.5 py-0.5 rounded border border-border-subtle truncate">
                                #{batch.id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <History className="w-3 h-3 text-text-muted shrink-0" />
                              <p className="text-[10px] lg:text-[11px] font-bold text-text-secondary truncate">
                                Masuk: {new Date(batch.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                            <button
                               onClick={() => setSelectedBatchId(batch.id)}
                               className="p-2.5 lg:p-2.5 bg-bg-main hover:bg-brand-primary text-text-muted hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                               title="Lihat Detail Realisasi & Profit"
                            >
                               <TrendingUp className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => onPrint({
                                 productId,
                                 productName,
                                 productCode: productInfo?.code || '-',
                                 batchId: batch.id,
                                 price: Number(batch.sellingPrice),
                                 category: productInfo?.category?.name,
                                 unit: batch.unit?.name || productInfo?.prices?.[0]?.unit?.name,
                                 quantity: 1, // Default to 1 copy for single batch print
                                 prices: productInfo?.prices
                               })}
                               className="p-2.5 lg:p-2.5 bg-bg-main hover:bg-brand-primary text-text-muted hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                               title="Cetak Label"
                            >
                               <Printer className="w-4 h-4" />
                            </button>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 lg:gap-6 p-3 lg:p-4 bg-bg-main/50 rounded-xl lg:rounded-[32px] border border-border-subtle/50 mb-3 lg:mb-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <p className="text-[8px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest">Harga Jual</p>
                          <p className="text-sm lg:text-base font-black text-brand-primary">
                            {formatCurrency(calculateScaledValue(
                              batch.sellingPrice, 
                              batch, 
                              mainFactor,
                              Number(mainPriceObj?.price) || 0
                            ))}
                          </p>
                        </div>
                        <div className="space-y-0.5 lg:space-y-1 text-right">
                          <p className="text-[8px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest">Modal</p>
                          <p className="text-xs lg:text-sm font-bold text-text-secondary">
                            {formatCurrency(calculateScaledValue(
                              batch.costPrice, 
                              batch, 
                              mainFactor,
                              (Number(productInfo?.averageCost) || 0) * mainFactor
                            ))}
                          </p>
                        </div>
                      </div>

                      {batch.realizedProfit !== undefined && (batch.initialQuantity - batch.currentQuantity) > 0 && (
                        <div className={cn(
                          "p-3 lg:p-4 rounded-xl lg:rounded-2xl border mb-3 lg:mb-4 flex justify-between items-center shadow-sm font-sans",
                          batch.realizedProfit >= 0 
                            ? "bg-status-success/5 border-status-success/20 text-status-success" 
                            : "bg-status-danger/5 border-status-danger/20 text-status-danger"
                        )}>
                          <div>
                            <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider">
                              {batch.realizedProfit >= 0 ? "Laba Terrealisasi" : "Rugi / Beban Terrealisasi"}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5 font-medium">
                              Dari {formatMultiUnitStock(batch.initialQuantity - batch.currentQuantity, productInfo?.prices || [])} terjual
                            </p>
                          </div>
                          <p className="text-sm lg:text-base font-black">
                            {batch.realizedProfit >= 0 ? "+" : ""}{formatCurrency(batch.realizedProfit)}
                          </p>
                        </div>
                      )}

                      <div className="p-3 lg:p-4 bg-bg-main/50 rounded-xl lg:rounded-[32px] border border-border-subtle/50 mb-3 lg:mb-4">
                        <div className="flex justify-between items-end mb-2">
                           <div className="space-y-0.5 lg:space-y-1">
                              <p className="text-[10px] lg:text-[11px] font-black text-text-primary">
                                {formatMultiUnitStock(
                                  consolidatedBatches.length === 1 ? (Number(productInfo?.stock) || 0) : batch.currentQuantity,
                                  productInfo?.prices || []
                                )}
                              </p>
                              <p className="text-[8px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest">Tersisa dari { (batch.initialQuantity / mainFactor).toFixed(2) } Awal</p>
                           </div>
                        </div>
                        <div className="w-full h-1.5 lg:h-2 bg-bg-main rounded-full overflow-hidden border border-border-subtle p-[1px]">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out",
                              !isOutOfStock ? "bg-gradient-to-r from-brand-primary to-brand-hover" : "bg-text-muted/30"
                            )}
                            style={{ width: `${Math.max(2, stockPercentage)}%` }}
                          />
                        </div>
                      </div>
                      
                      {batch.purchaseItem?.purchase && 
                         <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-border-subtle flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                               <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-[24px] bg-bg-main flex items-center justify-center border border-border-subtle shrink-0">
                                  <Package className="w-3.5 h-3.5 text-text-muted" />
                               </div>
                               <div className="min-w-0">
                                  <p className="text-[8px] font-black text-text-muted uppercase tracking-tighter leading-none">Pemasok</p>
                                  <span className="text-[10px] lg:text-[11px] font-bold text-text-secondary truncate block mt-0.5">
                                    {batch.purchaseItem.purchase.supplier?.name || 'Tanpa Supplier'}
                                  </span>
                               </div>
                            </div>
                            <div className="text-right shrink-0">
                               <p className="text-[8px] font-black text-text-muted uppercase tracking-tighter leading-none">Invoice</p>
                               <span className="text-[10px] lg:text-[11px] font-mono font-bold text-brand-primary block mt-0.5">
                                 {batch.purchaseItem.purchase.invoiceNumber}
                               </span>
                            </div>
                         </div>
                      }
                   </div>
                 );
               })}
            </div>
          )}
        </div>
        
        {/* Footer Section - Fixed at bottom on Mobile */}
        <div className="sticky bottom-0 z-30 p-8 lg:p-7 border-t border-border-subtle/50 bg-bg-card flex-shrink-0 mt-auto">
           <button 
             onClick={onClose}
             className="w-full .5 lg: bg-bg-main border border-border-default text-text-primary lg: font-black hover:bg-bg-card border-2 hover:border-brand-primary/30 transition-all shadow-lg active:scale-95 rounded-full px-6 py-[12px] text-[14px] font-bold"
           >
             Tutup
           </button>
        </div>
      </div>
    </div>

    {selectedBatchId && (
      <BatchDetailReportModal
        isOpen={!!selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
        batchId={selectedBatchId}
        productId={productId}
        productName={productName}
      />
    )}
    </>
  );
}



