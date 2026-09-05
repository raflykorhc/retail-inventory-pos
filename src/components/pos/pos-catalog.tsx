"use client";

import React, { useState, useMemo, useCallback, useRef, memo } from "react";
import { Search, Package, Loader2, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axiosClient from "@/lib/axiosClient";
import { formatMultiUnitStock } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteProducts } from "@/hooks/queries/useProducts";
import { useQuery } from "@tanstack/react-query";
import { VirtuosoGrid } from "react-virtuoso";
import { useSidebar } from "@/components/ui/sidebar";
import { PosBatchModal } from "@/components/pos/pos-batch-modal";

const VirtuosoHeader = memo(() => <div className="h-4 sm:h-5 w-full" />);
const VirtuosoFooter = memo(() => <div className="h-24 w-full" />);
const virtuosoComponents = { Header: VirtuosoHeader, Footer: VirtuosoFooter };

interface PosCatalogProps {
  onAddToCart: (product: any) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function PosCatalog({ onAddToCart, searchInputRef }: PosCatalogProps) {
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<any | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleCategoryMouseDown = (e: React.MouseEvent) => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
    scrollLeftRef.current = categoryScrollRef.current.scrollLeft;
  };

  const handleCategoryMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 3) {
      hasDraggedRef.current = true;
    }
    categoryScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleCategoryMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleCategoryWheel = (e: React.WheelEvent) => {
    if (!categoryScrollRef.current) return;
    if (e.deltaY !== 0) {
      categoryScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollCategory = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -180 : 180,
        behavior: "smooth",
      });
    }
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await axiosClient.get("/categories")).data,
  });

  const { 
    data: productsData, 
    isLoading: isLoadingProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteProducts({ 
    search: debouncedSearch, 
    categoryId: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
    limit: 24 
  });

  const filteredProducts = useMemo(() => {
    if (!productsData?.pages) return [];
    
    const uniqueProductList: any[] = [];
    const seenIds = new Set();
    const fetchTime = Date.now();
    
    const allProducts = productsData.pages.flatMap((page: any) => page.items || []);
    
    for (const p of allProducts) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        
        const categoryName = p.category?.name || "Lainnya";
        const categoryId = p.categoryId;

        let highestConvPriceObj = null;
        if (p.prices && p.prices.length > 0) {
          highestConvPriceObj = p.prices.reduce((prev: any, curr: any) => {
            return (curr.conversionFactor > prev.conversionFactor) ? curr : prev;
          }, p.prices[0]);
        }

        const basePrice = highestConvPriceObj ? highestConvPriceObj.price : (p.price || 0);
        const rawUnit = highestConvPriceObj ? highestConvPriceObj.unit : null;
        const unitName = rawUnit ? (rawUnit.name || (typeof rawUnit === 'string' ? rawUnit : "")) : "";

        uniqueProductList.push({
          ...p,
          category: categoryName,
          price: basePrice,
          unit: unitName,
          name: p.name,
          image: p.productImage?.id ? `${axiosClient.defaults.baseURL || '/api'}/products/${p.id}/image?t=${fetchTime}` : "📦",
          hasImage: !!p.productImage?.id,
          displayStock: p.prices ? formatMultiUnitStock(p.stock, p.prices) : p.stock,
        });
      }
    }
    return uniqueProductList;
  }, [productsData]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const trimmed = searchQuery.trim().toLowerCase();
      const exactMatch = filteredProducts.find(
        (p) => String(p.code).toLowerCase() === trimmed || p.name.toLowerCase() === trimmed
      );
      if (exactMatch) {
        onAddToCart(exactMatch);
        setSearchQuery("");
        e.preventDefault();
      }
    }
  };

  const gridItemContent = useCallback((index: number, product: any) => {
    return (
      <Card 
        className="group @container relative overflow-hidden bg-card border-border/40 shadow-sm hover:shadow-md hover:border-border transition flex flex-col h-[320px] rounded-xl cursor-pointer p-0"
        onClick={() => onAddToCart(product)}
      >
        <CardContent className="flex flex-col h-full p-0 relative">
          {/* Stock Badge - Absolute Top Right of Card */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <Badge 
              variant="secondary"
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs transition-colors border",
                product.stock < 15 
                  ? "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60" 
                  : "bg-muted/80 text-foreground border-border/60"
              )}
            >
              {product.displayStock}
            </Badge>
          </div>

          {/* Thumbnail Container */}
          <div className="h-[180px] w-full bg-muted/20 flex items-center justify-center text-5xl relative overflow-hidden shrink-0 border-b border-border/30">
            {product.hasImage ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="h-full w-full object-cover transform transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="transform transition-transform duration-300 group-hover:scale-105 text-muted-foreground/30">
                {product.image}
              </span>
            )}
          </div>
          
          {/* Product Details */}
          <div className="flex-1 flex flex-col p-3 pt-2.5 pb-3">
            <div className="space-y-0.5 mb-1.5 pr-6">
              <span className="text-[10px] font-medium text-muted-foreground block truncate">
                {product.category}
              </span>
              <h3 className="font-semibold text-xs text-foreground leading-snug line-clamp-2">
                {product.name}
              </h3>
            </div>

            {/* Price */}
            <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0.5 mt-auto pr-8">
              <span className="font-bold text-sm text-foreground tracking-tight">
                Rp {Number(product.price).toLocaleString('id-ID')}
              </span>
              {product.unit && (
                <span className="text-[10px] text-muted-foreground">
                  / {product.unit}
                </span>
              )}
            </div>

            {/* Action button - Positioned absolutely at bottom-right */}
            <Button 
              variant="ghost" 
              size="icon" 
              title="Pilih Batch Stok Spesifik"
              className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProductForBatch(product);
              }}
            >
              <Layers className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [onAddToCart]);

  return (
    <div className="flex flex-col h-full bg-background border-r border-border/40 overflow-hidden">
      {/* Header, Search & Filter Categories */}
      <div className="p-3.5 sm:p-4 border-b border-border/50 space-y-3 bg-background shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Katalog Produk</h1>
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5 bg-muted/30 border-border/50">
            {isLoadingProducts ? <Loader2 className="w-3 h-3 animate-spin" /> : `${filteredProducts.length} Produk`}
          </Badge>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            ref={searchInputRef}
            placeholder="Cari nama barang atau barcode (Enter untuk auto-add)..." 
            className="pl-9 pr-12 h-9 text-xs rounded-lg bg-card border-input/60 focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 text-muted-foreground border-border/60 bg-muted/40">F2</Badge>
          </div>
        </div>

        {/* Category Pills */}
        {categoriesData && categoriesData.length > 0 && (
          <div className="relative flex items-center group/cats">
            {/* Left Arrow Overlay */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-2 bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover/cats:opacity-100 transition-opacity duration-200 pointer-events-none">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full bg-background/90 border-border/60 shadow-xs text-muted-foreground hover:text-foreground pointer-events-auto"
                onClick={() => scrollCategory("left")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable & Draggable Bar */}
            <div 
              ref={categoryScrollRef}
              onMouseDown={handleCategoryMouseDown}
              onMouseMove={handleCategoryMouseMove}
              onMouseUp={handleCategoryMouseUpOrLeave}
              onMouseLeave={handleCategoryMouseUpOrLeave}
              onWheel={handleCategoryWheel}
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar select-none cursor-grab active:cursor-grabbing flex-1 scroll-smooth"
            >
              <Button
                variant={!selectedCategory || selectedCategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-[11px] px-2.5 rounded-full shrink-0 font-medium transition-colors"
                onClick={() => {
                  if (hasDraggedRef.current) return;
                  setSelectedCategory("all");
                }}
              >
                Semua
              </Button>
              {categoriesData.map((cat: any) => {
                const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
                return (
                  <Button
                    key={cat.id}
                    variant={isSelected ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5 rounded-full shrink-0 font-medium transition-colors"
                    onClick={() => {
                      if (hasDraggedRef.current) return;
                      setSelectedCategory(isSelected ? "all" : cat.id);
                    }}
                  >
                    {cat.name}
                  </Button>
                );
              })}
            </div>

            {/* Right Arrow Overlay */}
            <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-2 bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover/cats:opacity-100 transition-opacity duration-200 pointer-events-none">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full bg-background/90 border-border/60 shadow-xs text-muted-foreground hover:text-foreground pointer-events-auto"
                onClick={() => scrollCategory("right")}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Grid List Products */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {filteredProducts.length === 0 && !isLoadingProducts ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4">
            <Package className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium">Tidak ada produk ditemukan.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Coba kata kunci pencarian atau kategori lain.</p>
          </div>
        ) : (
          <VirtuosoGrid
            style={{ height: '100%' }}
            data={filteredProducts}
            itemContent={gridItemContent}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            components={virtuosoComponents}
            listClassName={cn(
              "grid gap-3 px-4 sm:px-5",
              isSidebarCollapsed
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            )}
          />
        )}
      </div>

      {/* Batch Selection Modal */}
      {selectedProductForBatch && (
        <PosBatchModal
          isOpen={!!selectedProductForBatch}
          onClose={() => setSelectedProductForBatch(null)}
          product={selectedProductForBatch}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
}



