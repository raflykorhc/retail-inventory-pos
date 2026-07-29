import React, { useMemo, useState, useRef, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  Minus, 
  Plus, 
  Layers, 
  Edit2, 
  ShoppingCart, 
  ChevronDown, 
  AlertCircle, 
  ChevronLeft 
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { cn, formatCurrency } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { useCartStore } from "../../store/useCartStore";
import { useProducts } from "../../hooks/queries/useProducts";
import { useAuthStore } from "../../store/useAuthStore";
import axiosClient from "../../lib/axiosClient";

export const CartPanel: React.FC = () => {
  const { theme, posLayout } = useTheme();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  // Zustand Store
  const {
    cart,
    globalDiscount,
    isCartOpen,
    paymentMethod,
    setPaymentMethod,
    removeFromCart,
    updateQuantity,
    setManualQuantity,
    updateDiscount,
    updatePrice,
    setGlobalDiscount,
    setCheckoutStep,
    updateUnit,
    setActiveModal,
    toggleBonus
  } = useCartStore();

  // TanStack Queries
  const { data: productsData } = useProducts();

  const products = useMemo(() => {
    const productList = productsData?.items || (Array.isArray(productsData) ? productsData : []);
    
    return productList.map((p: any) => {
      const sortedPrices = [...(p.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainPriceObj = sortedPrices[0];
      const mainUnitName = mainPriceObj?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';
      const displayPrice = Number(mainPriceObj?.price || 0);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        image: p.image,
        price: displayPrice,
        prices: p.prices, 
        unitId: mainPriceObj?.unitId,
        stock: Number(p.stock) || 0,
        unit: mainUnitName,
        category: p.category?.name || "Uncategorized"
      };
    });
  }, [productsData]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.isBonus ? 0 : item.price) * item.quantity), 0);
  }, [cart]);

  const itemsDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.isBonus ? 0 : (item.discount || 0)) * item.quantity), 0);
  }, [cart]);

  const subtotalAfterItemDiscounts = subtotal - itemsDiscountTotal;

  const discountedSubtotal = subtotalAfterItemDiscounts;
  const total = discountedSubtotal - (globalDiscount || 0);

  return (
    <div className={cn(
      "w-full md:w-[320px] lg:w-[400px] border-l flex flex-col transition-all duration-300",
      isCartOpen ? "flex" : "hidden md:flex",
      "bg-bg-card border-border-default h-full overflow-hidden"
    )}>


      {/* Cart Items List */}
      <div className="flex-1 overflow-hidden p-3 lg:p-4 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Keranjang Belanja</h3>
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-bg-main text-text-muted">
            {cart.length} Item
          </span>
        </div>
        
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-bg-main animate-bounce">
              <ShoppingCart className="w-8 h-8 text-border-strong" />
            </div>
            <p className="text-xs font-bold text-text-muted">Keranjang Kosong</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Virtuoso
              style={{ height: '100%' }}
              className="scrollbar-hide"
              data={cart}
              computeItemKey={(index, item) => `${item.id}-${item.batchId || 'no-batch'}`}
              itemContent={(index, item) => {
                const product = products.find(p => p.id === item.id);
                const productPrices = product?.prices || [];
                const hasMultiUnit = productPrices.length > 1;

                return (
                  <div className="py-1">
                    <div key={`${item.id}-${item.batchId || 'no-batch'}`} className={cn(
                      "flex items-start space-x-3 p-2 rounded-xl transition-colors group hover:bg-bg-main border border-transparent hover:border-border-subtle",
                      posLayout.compactCart && "p-1.5 space-x-2"
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <p className="text-xs font-black truncate text-text-primary leading-tight">{item.name}</p>
                            <div className="flex items-center space-x-1.5 mt-1">
                              <div className="relative group/select">
                                <select 
                                  disabled={!hasMultiUnit}
                                  className={cn(
                                    "text-[9px] font-black pl-2 pr-5 h-6 rounded-full border appearance-none transition-all shadow-sm focus:outline-none",
                                    hasMultiUnit 
                                      ? "text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 border-brand-primary/10 cursor-pointer focus:ring-2 focus:ring-brand-primary/30" 
                                      : "text-text-muted bg-bg-main border-border-default cursor-not-allowed opacity-70"
                                  )}
                                  value={item.unitId}
                                  onChange={async (e) => {
                                    const priceInfo = productPrices.find((pr: any) => pr.unitId === e.target.value);
                                    if (priceInfo) {
                                      let priceToUse = Number(priceInfo.price);
                                      if (item.batchId) {
                                        try {
                                          const res = await axiosClient.get(`/products/${item.id}/batches?activeOnly=true`);
                                          const batches = res.data || [];
                                          const currentBatch = batches.find((b: any) => b.id === item.batchId);
                                          const snapshot = currentBatch?.batchPrices?.find((bp: any) => bp.unitId === priceInfo.unitId);
                                          
                                          if (snapshot) {
                                            priceToUse = Number(snapshot.price);
                                          } else if (currentBatch) {
                                            if (currentBatch.unitId === priceInfo.unitId) {
                                              priceToUse = Number(currentBatch.sellingPrice) * priceInfo.conversionFactor;
                                            }
                                          }
                                        } catch (err) {
                                          console.error("Error updating unit for batch:", err);
                                        }
                                      }
                                      updateUnit(
                                        item.id, 
                                        priceInfo.unitId, 
                                        priceInfo.unit.name, 
                                        priceToUse, 
                                        priceInfo.conversionFactor,
                                        item.batchId
                                      );
                                    }
                                  }}
                                >
                                  {productPrices.map((pr: any) => (
                                    <option key={pr.unitId} value={pr.unitId} className="bg-bg-modal text-text-primary">{pr.unit.name}</option>
                                  ))}
                                </select>
                                {hasMultiUnit && (
                                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-brand-primary pointer-events-none transition-transform group-hover/select:scale-110" />
                                )}
                              </div>
                              {item.batchId && (
                                <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                  <Layers className="w-2.5 h-2.5 text-emerald-600" />
                                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Batch</span>
                                </div>
                              )}
                              {/* Toggle Bonus Button */}
                              <button
                                onClick={() => toggleBonus(item.id, item.batchId)}
                                className={cn(
                                  "text-[8px] font-black px-2 h-6 flex items-center rounded-full border transition-all cursor-pointer shrink-0",
                                  item.isBonus 
                                    ? "bg-status-danger text-white border-status-danger uppercase animate-pulse shadow-sm"
                                    : "bg-bg-main text-text-muted border-border-default hover:border-brand-primary hover:text-brand-primary uppercase"
                                )}
                                title={item.isBonus ? "Batal Bonus" : "Set sebagai Bonus"}
                              >
                                {item.isBonus ? "Bonus" : "Set Bonus"}
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 shrink-0 ml-2">
                            <button 
                              onClick={() => removeFromCart(item.id, item.batchId)}
                              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-all opacity-70 group-hover:opacity-100 flex-shrink-0"
                              title="Hapus Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 flex items-end justify-between">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center border rounded-lg overflow-hidden bg-bg-card border-border-default w-fit shadow-sm">
                              <button 
                                onClick={() => updateQuantity(item.id, -1, item.batchId)}
                                className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-bg-main text-text-muted active:scale-95 shrink-0"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input 
                                type="number"
                                className="w-8 text-[11px] font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent text-text-primary h-8"
                                value={item.quantity === 0 ? "" : item.quantity}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    setManualQuantity(item.id, 0, item.batchId);
                                    return;
                                  }
                                  const parsed = parseInt(val);
                                  if (!isNaN(parsed)) {
                                    setManualQuantity(item.id, parsed, item.batchId);
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === "" || parseInt(e.target.value) === 0) {
                                    setManualQuantity(item.id, 1, item.batchId);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => updateQuantity(item.id, 1, item.batchId)}
                                disabled={item.quantity >= Math.floor(item.baseStock / item.conversionFactor)}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center transition-colors text-text-muted shrink-0",
                                  item.quantity >= Math.floor(item.baseStock / item.conversionFactor) ? "opacity-30 cursor-not-allowed" : "hover:bg-bg-main"
                                )}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            

                            
                            {isAdminOrManager && !item.isBonus && (
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                                {/* Harga Input */}
                                <div className="flex items-center space-x-1.5 border rounded-lg bg-bg-card border-border-default px-2 h-8 w-fit focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary/30 transition-all shadow-sm">
                                  <span className="text-[9px] font-black text-text-muted tracking-wide">HARGA Rp</span>
                                  <input 
                                    type="number"
                                    className="w-20 text-xs font-black text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent text-text-primary placeholder:text-text-muted/50 h-full"
                                    placeholder="0"
                                    value={item.price || ""}
                                    onChange={(e) => updatePrice(item.id, Number(e.target.value) || 0, item.batchId)}
                                  />
                                </div>

                                {/* Discount Input */}
                                <div className="flex items-center space-x-1.5 border rounded-lg bg-bg-card border-border-default px-2 h-8 w-fit focus-within:border-status-success focus-within:ring-1 focus-within:ring-status-success/30 transition-all shadow-sm">
                                  <span className="text-[9px] font-black text-text-muted tracking-wide">DISC Rp</span>
                                  <input 
                                    type="number"
                                    className="w-12 text-xs font-black text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent text-status-success placeholder:text-text-muted/50 h-full"
                                    placeholder="0"
                                    value={item.discount || ""}
                                    onChange={(e) => updateDiscount(item.id, parseInt(e.target.value) || 0, item.batchId)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end justify-center">
                            {item.isBonus ? (
                              <div className="flex flex-col items-end mb-0.5 leading-none">
                                <span className="text-[8px] text-text-muted font-bold line-through">{formatCurrency(item.originalPrice ?? 0)}</span>
                                <span className="text-[9px] font-black text-status-danger animate-pulse">GRATIS</span>
                              </div>
                            ) : item.discount > 0 ? (
                              <div className="flex flex-col items-end mb-0.5 leading-none">
                                <span className="text-[8px] text-text-muted font-bold line-through">{formatCurrency(item.price)}</span>
                                <span className="text-[9px] font-bold text-status-success">{formatCurrency(item.price - item.discount)}</span>
                              </div>
                            ) : (
                              <span className={cn(
                                "text-[9px] font-bold mb-0.5 leading-none",
                                item.price === 0 ? "text-status-danger animate-pulse" : "text-text-secondary"
                              )}>
                                {formatCurrency(item.price)}
                              </span>
                            )}
                            <span className="text-xs font-black text-brand-primary leading-tight">
                              {item.isBonus ? "Rp 0" : formatCurrency((item.price - (item.discount || 0)) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>

      {/* Pricing and Transition Area */}
      <div className="p-4 border-t space-y-3 bg-bg-main border-border-default flex-shrink-0">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary font-bold uppercase tracking-wider">Subtotal</span>
            <span className="font-black text-text-primary">{formatCurrency(subtotal)}</span>
          </div>
          
          {itemsDiscountTotal > 0 && (
            <div className="flex justify-between text-[10px] text-status-success">
              <span className="font-bold uppercase tracking-wider">Potongan Item</span>
              <span className="font-black">-{formatCurrency(itemsDiscountTotal)}</span>
            </div>
          )}
          


          {isAdminOrManager && (
            <div className="flex justify-between items-center text-[10px] py-1 border-t border-dashed border-border-default my-1">
              <span className="text-status-success font-black uppercase tracking-wider">Diskon Tambahan</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-text-muted">Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  className="w-24 pl-6 pr-2 py-1 bg-bg-card border border-border-default rounded-lg text-[10px] font-black text-right text-status-success focus:outline-none focus:ring-1 focus:ring-status-success h-[44px]"
                  value={globalDiscount || ""}
                  onChange={(e) => setGlobalDiscount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          {!isAdminOrManager && globalDiscount > 0 && (
            <div className="flex justify-between text-[10px] text-status-success">
              <span className="font-bold uppercase tracking-wider">Diskon Tambahan</span>
              <span className="font-black">-{formatCurrency(globalDiscount)}</span>
            </div>
          )}



          <div className="pt-2 flex justify-between items-center border-t border-border-subtle">
            <span className="text-[11px] font-black text-text-primary uppercase tracking-widest">Total Bayar</span>
            <span className="text-base font-black text-brand-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={() => setCheckoutStep("payment")}
          className="w-full py-3 bg-brand-primary text-text-inverse rounded-xl font-black text-xs shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center space-x-2 uppercase tracking-wider"
        >
          <span>Lanjut ke Pembayaran</span>
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );
};
