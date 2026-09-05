"use client";

import React, { useState, useRef, useEffect } from "react";
import { PosCatalog } from "@/components/pos/pos-catalog";
import { PosCart } from "@/components/pos/pos-cart";
import { toast } from "@/components/ui/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/axiosClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface CartItem {
  id: string | number;
  cartItemId?: string;
  batchId?: string;
  batchCode?: string;
  batchSellingPrice?: number;
  batchPrices?: any[];
  mainFactor?: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  unit?: string;
  stock?: number;
  prices?: any[];
  selectedPriceId?: string | number;
  unitId?: string;
}

interface HeldCart {
  id: string;
  name: string;
  timestamp: Date;
  cart: CartItem[];
  total: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);
  const [isPaymentPhaseState, setIsPaymentPhaseState] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await axiosClient.get("/units")).data,
  });

  const getCartItemId = (item: any) => item.cartItemId || (item.batchId ? `${item.id}-${item.batchId}` : String(item.id));

  const handleAddToCart = (product: any) => {
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error("Stok Habis", { description: "Stok untuk produk/batch ini sedang kosong." });
      return;
    }

    const targetItemId = product.cartItemId || (product.batchId ? `${product.id}-${product.batchId}` : String(product.id));
    const qtyToAdd = product.customQuantity || 1;

    setCart((prev) => {
      const existingInPrev = prev.find((item) => getCartItemId(item) === targetItemId);

      if (existingInPrev) {
        const activePrices = existingInPrev.prices || product.prices;
        const selectedPrice = activePrices?.find((p: any) => String(p.id) === String(existingInPrev.selectedPriceId));
        const conversionFactor = selectedPrice?.conversionFactor || product.conversionFactor || 1;
        const maxQty = product.stock !== undefined ? Math.floor(product.stock / conversionFactor) : Infinity;

        if (existingInPrev.quantity + qtyToAdd > maxQty) {
          toast.error("Stok Maksimal", { description: `Stok tersisa hanya ${maxQty}.` });
          return prev;
        }

        return prev.map((item) =>
          getCartItemId(item) === targetItemId
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }

      const selectedPriceId = product.selectedPriceId || (product.prices && product.prices.length > 0
        ? product.prices.reduce((prevPrice: any, currPrice: any) => 
            (currPrice.conversionFactor > prevPrice.conversionFactor) ? currPrice : prevPrice, product.prices[0]
          )?.id
        : null);

      const activePrices = product.prices;
      const selectedPrice = activePrices?.find((p: any) => String(p.id) === String(selectedPriceId));
      const conversionFactor = selectedPrice?.conversionFactor || product.conversionFactor || 1;
      const maxQty = product.stock !== undefined ? Math.floor(product.stock / conversionFactor) : Infinity;

      if (qtyToAdd > maxQty) {
        toast.error("Stok Tidak Cukup", { description: `Stok tidak cukup untuk satuan ini.` });
        return prev;
      }

      return [...prev, { 
        ...product, 
        cartItemId: targetItemId,
        quantity: qtyToAdd,
        prices: product.prices || [],
        selectedPriceId
      }];
    });
  };

  const handleUpdateQuantity = (cartItemId: string | number, delta: number) => {
    const item = cart.find(i => getCartItemId(i) === String(cartItemId));
    if (!item) return;

    let maxQty = Infinity;
    if (item.stock !== undefined && item.selectedPriceId && item.prices) {
      const selectedPrice = item.prices.find((p: any) => String(p.id) === String(item.selectedPriceId));
      if (selectedPrice && selectedPrice.conversionFactor) {
        maxQty = Math.floor(item.stock / selectedPrice.conversionFactor);
      }
    } else if (item.stock !== undefined) {
      maxQty = item.stock;
    }

    const newQuantity = item.quantity + delta;
    if (newQuantity > maxQty) {
      toast.error("Stok Maksimal", { description: `Stok tersisa hanya ${maxQty}.` });
    }

    setCart((prev) =>
      prev.map((i) => {
        if (getCartItemId(i) === String(cartItemId)) {
          const cappedQuantity = Math.min(Math.max(1, newQuantity), maxQty > 0 ? maxQty : 1);
          return { ...i, quantity: cappedQuantity };
        }
        return i;
      })
    );
  };

  const handleSetQuantity = (cartItemId: string | number, quantity: number) => {
    const item = cart.find(i => getCartItemId(i) === String(cartItemId));
    if (!item) return;

    let maxQty = Infinity;
    if (item.stock !== undefined && item.selectedPriceId && item.prices) {
      const selectedPrice = item.prices.find((p: any) => String(p.id) === String(item.selectedPriceId));
      if (selectedPrice && selectedPrice.conversionFactor) {
        maxQty = Math.floor(item.stock / selectedPrice.conversionFactor);
      }
    } else if (item.stock !== undefined) {
      maxQty = item.stock;
    }

    if (quantity > maxQty) {
      toast.error("Stok Maksimal", { description: `Stok tersisa hanya ${maxQty}.` });
    }

    setCart((prev) =>
      prev.map((i) => {
        if (getCartItemId(i) === String(cartItemId)) {
          const cappedQuantity = Math.min(Math.max(1, quantity), maxQty > 0 ? maxQty : 1);
          return { ...i, quantity: cappedQuantity };
        }
        return i;
      })
    );
  };

  const handleUpdateUnit = (cartItemId: string | number, priceId: string | number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (getCartItemId(item) === String(cartItemId) && item.prices) {
          const selectedPrice = item.prices.find((p: any) => 
            String(p.id) === String(priceId) || String(p.unitId) === String(priceId)
          );
          if (selectedPrice) {
            let maxQty = Infinity;
            if (item.stock !== undefined && selectedPrice.conversionFactor) {
              maxQty = Math.floor(item.stock / selectedPrice.conversionFactor);
            }
            const newQuantity = Math.min(item.quantity, maxQty > 0 ? maxQty : 1);

            let newPrice = Number(selectedPrice.price || 0);
            if (item.batchId) {
              let matchedBatchPrice = null;
              if (item.batchPrices && Array.isArray(item.batchPrices)) {
                matchedBatchPrice = item.batchPrices.find((bp: any) => String(bp.unitId) === String(selectedPrice.unitId || selectedPrice.id));
              }

              if (matchedBatchPrice && Number(matchedBatchPrice.price) > 0) {
                newPrice = Number(matchedBatchPrice.price);
              } else if (item.batchSellingPrice && Number(item.batchSellingPrice) > 0) {
                newPrice = Math.round(Number(item.batchSellingPrice) * (selectedPrice.conversionFactor || 1));
              }
            }

            const unitName = unitsData?.find((u: any) => String(u.id) === String(selectedPrice.unitId))?.name 
              || selectedPrice.unit?.name 
              || (typeof selectedPrice.unit === 'string' ? selectedPrice.unit : item.unit);

            return {
              ...item,
              price: newPrice,
              unit: unitName,
              unitId: selectedPrice.unitId || selectedPrice.id,
              selectedPriceId: selectedPrice.id,
              conversionFactor: selectedPrice.conversionFactor || 1,
              quantity: newQuantity > 0 ? newQuantity : 1
            };
          }
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string | number) => {
    setCart((prev) => prev.filter((item) => getCartItemId(item) !== String(cartItemId)));
  };

  const handleClearCart = () => {
    setCart([]);
    setIsPaymentPhaseState(false);
    toast.info("Keranjang dikosongkan");
  };

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeldCart: HeldCart = {
      id: `HOLD-${Date.now()}`,
      name: `Transaksi #${heldCarts.length + 1}`,
      timestamp: new Date(),
      cart: [...cart],
      total: cart.reduce((acc, i) => acc + i.price * i.quantity, 0)
    };
    setHeldCarts((prev) => [newHeldCart, ...prev]);
    setCart([]);
    setIsPaymentPhaseState(false);
    toast.success("Transaksi digantung", { description: `${newHeldCart.name} berhasil disimpan.` });
  };

  const handleRestoreCart = (heldCartId: string) => {
    const target = heldCarts.find((h) => h.id === heldCartId);
    if (!target) return;

    if (cart.length > 0) {
      handleHoldCart();
    }

    setCart(target.cart);
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldCartId));
    setIsHeldCartsOpen(false);
    setIsPaymentPhaseState(false);
    toast.success("Transaksi dipulihkan", { description: `${target.name} dimuat ke keranjang.` });
  };

  const handleDeleteHeldCart = (heldCartId: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldCartId));
    toast.info("Transaksi tertahan dihapus.");
  };

  const handleCheckout = async (checkoutData: any) => {
    if (cart.length === 0) return;
    
    try {
      await axiosClient.post("/sales", {
        items: cart.map(item => ({
          productId: item.id,
          batchId: item.batchId || null,
          quantity: item.quantity,
          price: item.price,
          unitId: item.prices?.find((p: any) => String(p.id) === String(item.selectedPriceId))?.unitId || item.unitId || item.prices?.[0]?.unitId || null,
          isBonus: false
        })),
        totalAmount: checkoutData.totalAmount || cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
        paymentMethod: checkoutData.paymentMethod || "TUNAI",
        transactionDate: checkoutData.transactionDate?.toISOString(),
        amountPaid: checkoutData.amountPaid,
        changeAmount: checkoutData.changeAmount,
        splitPayments: checkoutData.splitPayments
      });

      toast.success("Pembayaran Berhasil!", {
        description: "Transaksi telah disimpan dan stok telah diperbarui.",
      });
      
      setCart([]);
      setIsPaymentPhaseState(false);
      
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["infinite-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
    } catch (error: any) {
      toast.error("Gagal melakukan transaksi", {
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing hotkeys inside inputs except F2/F4/F8/F9
      const activeTag = document.activeElement?.tagName.toLowerCase();
      
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentPhaseState(true);
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        if (isPaymentPhaseState) {
          setIsPaymentPhaseState(false);
        } else if (cart.length > 0) {
          handleClearCart();
        }
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) {
          handleHoldCart();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isPaymentPhaseState, heldCarts]);

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-background md:rounded-b-xl">
      {/* Area Katalog Produk */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <PosCatalog 
          onAddToCart={handleAddToCart} 
          searchInputRef={searchInputRef}
        />
      </div>

      {/* Area Keranjang Belanja */}
      <div className="w-full md:w-[300px] lg:w-[320px] h-full border-l shrink-0 overflow-hidden">
        <PosCart 
          cart={cart}
          unitsData={unitsData}
          onUpdateQuantity={handleUpdateQuantity}
          onSetQuantity={handleSetQuantity}
          onUpdateUnit={handleUpdateUnit}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          onClearCart={handleClearCart}
          heldCartsCount={heldCarts.length}
          onHoldCart={handleHoldCart}
          onOpenHeldCarts={() => setIsHeldCartsOpen(true)}
          isPaymentPhaseState={isPaymentPhaseState}
          setIsPaymentPhaseState={setIsPaymentPhaseState}
        />
      </div>

      {/* Sheet Transaksi Tertahan (Hold Carts Drawer) */}
      <Sheet open={isHeldCartsOpen} onOpenChange={setIsHeldCartsOpen}>
        <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full">
          <SheetHeader className="p-4 border-b border-border/50 shrink-0">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Transaksi Tertahan ({heldCarts.length})
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Pilih transaksi yang pernah digantung untuk melanjutkan pembayaran.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {heldCarts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-medium text-foreground">Tidak Ada Transaksi Tertahan</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Tekan F9 atau tombol Gantung saat transaksi berlangsung.</p>
              </div>
            ) : (
              heldCarts.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 bg-card border border-border/60 rounded-xl space-y-2 hover:border-border transition-all shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-xs text-foreground">{item.name}</h4>
                      <span className="text-[10px] text-muted-foreground block">
                        {format(item.timestamp, "HH:mm:ss - d MMM yyyy", { locale: id })}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.cart.length} Item
                    </Badge>
                  </div>

                  <div className="text-xs font-bold text-foreground">
                    Total: Rp {item.total.toLocaleString("id-ID")}
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                      onClick={() => handleDeleteHeldCart(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs px-2.5 font-medium"
                      onClick={() => handleRestoreCart(item.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Pulihkan
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
