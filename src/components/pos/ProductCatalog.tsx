import React, { useMemo, useState, useCallback, memo } from "react";
import { Search, Scan, LayoutGrid, List, Package, Layers, Plus, History, Keyboard, X } from "lucide-react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { cn, formatCurrency, formatMultiUnitStock } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { useCartStore } from "../../store/useCartStore";
import { useInfiniteProducts } from "../../hooks/queries/useProducts";
import { useDebounce } from "../../hooks/useDebounce";
import { Skeleton, CardSkeleton } from "../ui/Skeleton";

// Defined outside component to prevent recreation on every render (critical for virtuoso stability)
const VirtuosoFooter = memo(() => <div className="h-20 lg:h-0" />);
const virtuosoComponents = { Footer: VirtuosoFooter };

// Memoized product card for grid view
const GridProductCard = memo(({ product, onAdd, onSelectBatch, showImages }: {
  product: any;
  onAdd: (p: any) => void;
  onSelectBatch: (p: any) => void;
  showImages: boolean;
}) => (
  <div
    onClick={() => onAdd(product)}
    className="w-full h-full flex flex-col p-3 lg:p-4 rounded-[24px] lg:rounded-[32px] transition-all cursor-pointer group relative overflow-hidden bg-transparent border border-gray-200 hover:border-transparent hover:bg-bg-card hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
    style={{ willChange: 'transform', contain: 'layout style' }}
  >
    <div className="absolute top-2.5 lg:top-3 right-2.5 lg:right-3 z-10">
      <span className={cn(
        "px-2 py-1 text-[9px] lg:text-[10px] font-black rounded-full uppercase shadow-md border",
        product.stock > 20
          ? "bg-bg-main text-status-success border-status-success/20"
          : "bg-bg-main text-status-danger border-status-danger/20"
      )}>
        {formatMultiUnitStock(product.stock, product.prices)}
      </span>
    </div>
    {showImages && (
      <div className="w-full aspect-square rounded-lg lg:rounded-[24px] mb-2 lg:mb-4 flex items-center justify-center transition-colors overflow-hidden bg-bg-main group-hover:bg-brand-light flex-shrink-0">
        {product.productImage ? (
          <img src={`/api/products/${product.id}/image`} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <Package className="w-8 lg:w-12 h-8 lg:h-12 transition-colors text-border-strong group-hover:text-brand-primary" />
        )}
      </div>
    )}
    <div className="flex-1 flex flex-col">
      <p className="text-[8px] lg:text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-0.5 lg:mb-1 truncate">{product.category}</p>
      <h3 className="text-xs lg:text-sm font-bold mb-0.5 lg:mb-1 line-clamp-2 text-text-primary min-h-[32px] lg:min-h-[40px]">{product.name}</h3>
      <div className="mt-auto flex items-end gap-1">
        <p className="text-sm lg:text-lg font-black text-text-primary">{formatCurrency(product.price)}</p>
        <p className="text-[10px] lg:text-xs font-bold text-text-muted uppercase mb-0.5 lg:mb-1">/ {product.unit}</p>
      </div>
    </div>
    <div className="mt-2 lg:mt-4 flex items-center justify-end gap-1.5">
      <button
        className="w-11 h-11 lg:w-9 lg:h-9 flex-shrink-0 flex items-center justify-center transition-all bg-bg-main text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary rounded-full flex items-center justify-center active:scale-95 transition-transform"
        onClick={(e) => { e.stopPropagation(); onSelectBatch(product); }}
        title="Pilih Batch"
      >
        <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
      </button>
      <button
        className="w-11 h-11 lg:w-9 lg:h-9 flex-shrink-0 flex items-center justify-center transition-all bg-bg-main text-text-secondary group-hover:bg-brand-primary group-hover:text-text-inverse focus:outline-none focus:ring-2 focus:ring-brand-primary/50 rounded-full flex items-center justify-center active:scale-95 transition-transform"
        onClick={(e) => { e.stopPropagation(); onAdd(product); }}
      >
        <Plus className="w-4 h-4 lg:w-5 h-5" />
      </button>
    </div>
  </div>
));

// Memoized product row for list view
const ListProductRow = memo(({ product, onAdd, onSelectBatch, showImages }: {
  product: any;
  onAdd: (p: any) => void;
  onSelectBatch: (p: any) => void;
  showImages: boolean;
}) => (
  <div className="py-1.5 px-1 border-b border-gray-200">
    <div
      onClick={() => onAdd(product)}
      className="flex items-center p-3 rounded-[24px] transition-all cursor-pointer group bg-transparent border border-transparent hover:bg-bg-card hover:shadow-md"
      style={{ willChange: 'transform', contain: 'layout style' }}
    >
      {showImages && (
        <div className="w-12 h-12 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-bg-main">
          {product.productImage ? (
            <img src={`/api/products/${product.id}/image`} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
          ) : (
            <Package className="w-6 h-6 text-border-strong" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-bold truncate text-text-primary">{product.name}</h3>
        </div>
        <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
          Stok: <span className={product.stock > 20 ? "text-status-success" : "text-status-danger"}>{formatMultiUnitStock(product.stock, product.prices)}</span>
        </p>
      </div>
      <div className="text-right ml-4 flex flex-col items-end">
        <p className="text-sm font-black text-text-primary">{formatCurrency(product.price)}</p>
        <p className="text-[10px] font-bold text-text-muted uppercase mt-0.5">/ {product.unit}</p>
      </div>
      <div className="flex items-center gap-1.5 ml-4">
        <button
          className="w-11 h-11 flex items-center justify-center transition-all bg-bg-main text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary rounded-full flex items-center justify-center active:scale-95 transition-transform"
          onClick={(e) => { e.stopPropagation(); onSelectBatch(product); }}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-11 h-11 flex items-center justify-center transition-all bg-bg-main text-text-secondary group-hover:bg-brand-primary group-hover:text-text-inverse focus:outline-none rounded-full flex items-center justify-center active:scale-95 transition-transform"
          onClick={(e) => { e.stopPropagation(); onAdd(product); }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
));

interface ProductCatalogProps {
  onSelectBatchProduct: (product: any) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onSelectBatchProduct }) => {
  const { posLayout, updatePOSLayout } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sortBy, setSortBy] = useState("popular");
  
  // Zustand Store
  const {
    searchQuery,
    setSearchQuery,
    addToCart,
    isCartOpen,
    setActiveModal,
  } = useCartStore();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Queries
  const { 
    data: productsData, 
    isLoading: isLoadingProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteProducts({ search: debouncedSearch, limit: 24, sort: sortBy });

  const products = useMemo(() => {
    if (!productsData) return [];
    
    // Flatten all pages into a single array
    const productList = productsData.pages.flatMap(page => page.items || []);
    
    // Stable deduplication to prevent VirtuosoGrid index shift glitch
    const uniqueProductList = [];
    const seenIds = new Set();
    for (const p of productList) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        uniqueProductList.push(p);
      }
    }
    
    return uniqueProductList.map((p: any) => {
      // Sort prices descending to get the largest unit price
      const sortedPrices = [...(p.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainPriceObj = sortedPrices[0];
      const mainUnitName = mainPriceObj?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';
      const displayPrice = Number(mainPriceObj?.price || 0);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        image: p.image,
        productImage: p.productImage,
        price: displayPrice,
        prices: p.prices, 
        unitId: mainPriceObj?.unitId,
        stock: Number(p.stock) || 0,
        unit: mainUnitName,
        category: p.category?.name || "Uncategorized"
      };
    });
  }, [productsData]);

  const filteredProducts = products; // Data is already filtered by the backend

  // Stable itemContent callbacks — must be declared before any early returns
  const gridItemContent = useCallback((index: number, product: any) => {
    return (
      <GridProductCard
        product={product}
        onAdd={addToCart}
        onSelectBatch={onSelectBatchProduct}
        showImages={posLayout.showImages}
      />
    );
  }, [addToCart, onSelectBatchProduct, posLayout.showImages]);

  const listItemContent = useCallback((index: number, product: any) => {
    return (
      <ListProductRow
        product={product}
        onAdd={addToCart}
        onSelectBatch={onSelectBatchProduct}
        showImages={posLayout.showImages}
      />
    );
  }, [addToCart, onSelectBatchProduct, posLayout.showImages]);

  if (isLoadingProducts) {
    return (
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden bg-bg-main">
        <div className="mb-4 lg:mb-6 flex items-center space-x-4">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-24 rounded-xl hidden sm:block" />
          <Skeleton className="h-12 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 p-2">
          {[...Array(12)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col p-4 lg:p-6 overflow-hidden transition-all duration-300",
      isCartOpen ? "hidden md:flex" : "flex",
      "bg-bg-main"
    )}>
      {/* Search & Filter */}
      <div className="mb-4 lg:mb-6 flex items-center space-x-4">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            id="pos-search-input"
            type="text"
            placeholder="Cari barang atau scan barcode ( / )..."
            className="w-full pl-12 pr-14 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-card border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setActiveModal("scanner")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-text-muted hover:text-brand-primary hover:bg-bg-main rounded-full transition-all"
            title="Scan Barcode"
          >
            <Scan className="w-5 h-5" />
          </button>
        </div>
        
        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-[44px] rounded-xl border border-border-default bg-bg-card text-sm font-bold text-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none px-3 cursor-pointer shadow-sm [&>option]:bg-bg-card [&>option]:text-text-primary"
        >
          <option value="name_asc">A ke Z</option>
          <option value="name_desc">Z ke A</option>
          <option value="popular">Paling Laris</option>
          <option value="stock_desc">Stok Terbanyak</option>
          <option value="stock_asc">Stok Tersedikit</option>
        </select>
        
        {/* View Toggle */}
        <div className="hidden sm:flex p-1.5 rounded-full border bg-bg-card border-border-default shadow-sm">
          <button 
            onClick={() => updatePOSLayout({ viewMode: "grid" })}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full transition-all",
              posLayout.viewMode === "grid" 
                ? "bg-brand-primary text-text-inverse shadow-md" 
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updatePOSLayout({ viewMode: "list" })}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full transition-all",
              posLayout.viewMode === "list" 
                ? "bg-brand-primary text-text-inverse shadow-md" 
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={() => setActiveModal("history")}
          className="px-5 py-2 lg:py-2.5 border rounded-full shadow-sm transition-all flex items-center space-x-2 bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
          title="Riwayat Transaksi"
        >
          <History className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-bold">Riwayat</span>
        </button>
      </div>

      {/* Catalog Grid/List */}
      <div className="flex-1 overflow-hidden pr-1 lg:pr-2">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <Package className="w-12 lg:w-16 h-12 lg:h-16 mb-4 text-slate-200 dark:text-slate-700" />
            <p className="font-medium text-sm lg:text-base text-slate-400 dark:text-slate-500">Barang tidak ditemukan</p>
          </div>
        ) : posLayout.viewMode === "grid" ? (
          <VirtuosoGrid
            style={{ height: '100%' }}
            data={filteredProducts}
            computeItemKey={(index, item) => item.id}
            overscan={400}
            components={virtuosoComponents}
            listClassName="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 p-2"
            itemClassName="flex"
            itemContent={gridItemContent}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
          />
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            className="custom-scrollbar overflow-x-hidden pr-2"
            data={filteredProducts}
            computeItemKey={(index, item) => item.id}
            overscan={400}
            components={virtuosoComponents}
            itemContent={listItemContent}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
          />
        )}
      </div>
      {/* Shortcut Legend Bar */}
      <div className="hidden lg:flex items-center justify-between border-t border-border-subtle pt-3 mt-2 text-[9px] text-text-muted">
        <div className="flex items-center space-x-3 overflow-x-auto py-1 flex-1">
          <span className="flex items-center space-x-1 flex-shrink-0">
            <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded font-mono text-[8px] font-black shadow-sm">/</kbd>
            <span>Cari</span>
          </span>
          <span className="text-border-default">·</span>
          <span className="flex items-center space-x-1 flex-shrink-0">
            <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded font-mono text-[8px] font-black shadow-sm">Alt+P</kbd>
            <span>Bayar</span>
          </span>
          <span className="text-border-default">·</span>
          <span className="flex items-center space-x-1 flex-shrink-0">
            <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded font-mono text-[8px] font-black shadow-sm">Ctrl+Enter</kbd>
            <span>Proses Bayar</span>
          </span>
          <span className="text-border-default">·</span>
          <span className="flex items-center space-x-1 flex-shrink-0">
            <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded font-mono text-[8px] font-black shadow-sm">Alt+H</kbd>
            <span>Riwayat</span>
          </span>
        </div>
        <button
          onClick={() => setShowShortcuts(true)}
          className="flex items-center space-x-1.5 ml-3 px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-card hover:bg-brand-primary/5 hover:border-brand-primary hover:text-brand-primary transition-all flex-shrink-0"
          title="Lihat semua shortcut keyboard"
        >
          <Keyboard className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-wider">Semua Shortcut</span>
        </button>
      </div>

      {/* Shortcut Help Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-bg-modal rounded-[2rem] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-brand-primary/5">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-[24px] bg-brand-primary/10 flex items-center justify-center">
                  <Keyboard className="w-4.5 h-4.5 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary">Pintasan Keyboard</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">POS Kasir – Semua Perintah</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-xl bg-bg-main flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcut List */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Navigation */}
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2.5">Navigasi & Pencarian</p>
                <div className="space-y-1.5">
                  {[
                    { keys: ['/'], desc: 'Fokus ke kolom pencarian barang' },
                    { keys: ['Alt', 'P'], desc: 'Beralih antara keranjang dan pembayaran' },
                    { keys: ['Alt', 'H'], desc: 'Buka / tutup riwayat transaksi' },
                    { keys: ['Alt', 'C'], desc: 'Buka / tutup scanner kamera' },
                    { keys: ['Alt', 'O'], desc: 'Buka pengaturan printer' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-2 px-3 rounded-[24px] bg-bg-main hover:bg-bg-card transition-colors">
                      <span className="text-xs text-text-secondary">{desc}</span>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                        {keys.map((k, i) => (
                          <React.Fragment key={k}>
                            <kbd className="px-2 py-1 bg-bg-card border border-border-default rounded-lg font-mono text-[10px] font-black shadow-sm text-text-primary">{k}</kbd>
                            {i < keys.length - 1 && <span className="text-text-muted text-[10px] font-bold">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2.5">Aksi Transaksi</p>
                <div className="space-y-1.5">
                  {[
                    { keys: ['Ctrl', 'Enter'], desc: 'Proses pembayaran (saat di fase bayar)' },
                    { keys: ['Alt', 'R'], desc: 'Reset / kosongkan keranjang belanja' },
                    { keys: ['Esc'], desc: 'Keluar dari field input aktif' },
                  ].map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-2 px-3 rounded-[24px] bg-bg-main hover:bg-bg-card transition-colors">
                      <span className="text-xs text-text-secondary">{desc}</span>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                        {keys.map((k, i) => (
                          <React.Fragment key={k}>
                            <kbd className="px-2 py-1 bg-bg-card border border-border-default rounded-lg font-mono text-[10px] font-black shadow-sm text-text-primary">{k}</kbd>
                            {i < keys.length - 1 && <span className="text-text-muted text-[10px] font-bold">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <p className="text-[9px] text-text-muted font-bold italic text-center leading-relaxed">
                  💡 Semua pintasan menggunakan tombol <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded text-[9px] font-black">Alt</kbd> atau <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-default rounded text-[9px] font-black">Ctrl</kbd> — kompatibel di semua perangkat dan merek.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
