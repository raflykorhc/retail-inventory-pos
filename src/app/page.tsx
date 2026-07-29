"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X,
  Plus, 
  Smartphone,
  Database,
  Package,
  Layers,
  ShoppingCart
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { cn, formatCurrency, formatMultiUnitStock } from "../lib/utils";
import { useScanner } from "../hooks/useScanner";
import { PrinterSettingsModal } from "../components/PrinterSettingsModal";
import { PrintSuccessModal } from "../components/PrintSuccessModal";
import { ScannerModal } from "../components/ScannerModal";
import axiosClient from "../lib/axiosClient";

import { useCartStore } from "../store/useCartStore";
import { useProductBatches } from "../hooks/queries/useProducts";
import { ProductCatalog } from "../components/pos/ProductCatalog";
import { CartPanel } from "../components/pos/CartPanel";
import { PaymentPanel } from "../components/pos/PaymentPanel";
import { HistoryModal } from "../components/pos/HistoryModal";

export default function POSPage() {
  // Zustand Store
  const { 
    cart,
    setSessionId, 
    setCart, 
    addToCart,
    clearCart,
    checkoutStep,
    setCheckoutStep,
    setPaymentMethod,
    setCashReceived,
    isCartOpen,
    setIsCartOpen,
    activeModal,
    setActiveModal,
    lastCreatedSale
  } = useCartStore();

  const socketRef = useRef<Socket | null>(null);
  const isSyncingRef = useRef(false);
  const isReceivingSocketRef = useRef(false);
  const [lastScannedItemName, setLastScannedItemName] = useState<string | null>(null);

  // Batch Picker State
  const [batchPickerProduct, setBatchPickerProduct] = useState<any>(null);
  const { data: productBatches, isLoading: isLoadingBatches } = useProductBatches(batchPickerProduct?.id || "", true);

  // Scan Barcode Handlers
  const handleScan = async (decodedText: string) => {
    // 1. Check if it's a Batch QR Code
    if (decodedText.startsWith("BATCH:")) {
      const batchId = decodedText.split(":")[1];
      try {
        const res = await axiosClient.get(`/products/batches/${batchId}`);
        const batch = res.data;
        
        if (batch && batch.product) {
          const snapshot = batch.batchPrices?.find((bp: any) => bp.unitId === batch.unitId);
          const priceToUse = snapshot ? Number(snapshot.price) : (Number(batch.sellingPrice) * (batch.conversionFactor || 1));
          
          const product = {
            id: batch.product.id,
            name: batch.product.name,
            price: priceToUse,
            stock: Number(batch.currentQuantity),
            unit: batch.unit?.name || batch.product.prices?.[0]?.unit?.name || "Unit",
            unitId: batch.unitId || batch.product.prices?.[0]?.unitId,
            conversionFactor: batch.conversionFactor || batch.product.prices?.[0]?.conversionFactor || 1
          };

          addToCart(product, batch.id);
          setLastScannedItemName(`${product.name} (Batch)`);
          toast.success(`Batch Ditemukan`, {
            description: `${product.name} - ${formatCurrency(product.price)}`,
            icon: <Database className="w-4 h-4" />
          });
        }
      } catch (error) {
        toast.error("Batch Tidak Ditemukan", { description: "QR Code batch tidak valid atau sudah dihapus." });
      }
      return;
    }

    // 2. Normal Product Code (via query lookup since product catalog is separate)
    try {
      const res = await axiosClient.get("/products");
      const productsList = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const productRaw = productsList.find((p: any) => p.code === decodedText || p.name.toLowerCase() === decodedText.toLowerCase());
      
      if (productRaw) {
        // Map raw product pricing
        const sortedPrices = [...(productRaw.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
        const mainPriceObj = sortedPrices[0];
        const mainUnitName = mainPriceObj?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';
        const displayPrice = Number(mainPriceObj?.price || 0);

        const mappedProduct = {
          id: productRaw.id,
          code: productRaw.code,
          name: productRaw.name,
          image: productRaw.image,
          price: displayPrice,
          prices: productRaw.prices, 
          unitId: mainPriceObj?.unitId,
          stock: Number(productRaw.stock) || 0,
          unit: mainUnitName,
          category: productRaw.category?.name || "Uncategorized"
        };

        addToCart(mappedProduct);
        setLastScannedItemName(mappedProduct.name);
        toast.success(`Produk Ditemukan`, {
          description: `${mappedProduct.name} ditambahkan ke keranjang`,
          icon: <Package className="w-4 h-4" />
        });
      } else {
        setLastScannedItemName("Produk Tidak Ditemukan");
        toast.error("Produk Tidak Ditemukan", {
          description: `Kode: ${decodedText}`
        });
      }
    } catch (err) {
      console.error("Error looking up scanned product:", err);
    }
  };

  useScanner({ onScan: handleScan });

  // Initialize Socket and Cart Sync
  useEffect(() => {
    let sid = localStorage.getItem("pos_session_id");
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem("pos_session_id", sid);
    }
    setSessionId(sid);

    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-cart", sid);
    });

    const mapServerCartToClient = (data: any) => {
      if (!data || !data.items) return [];
      return data.items.map((item: any) => {
        const allPrices: any[] = item.product.prices || [];
        const smallestUnitPrice = allPrices.reduce(
          (min: any, p: any) => (!min || p.conversionFactor < min.conversionFactor ? p : min),
          null
        );
        const selectedPrice = allPrices.find((p: any) => p.unitId === item.unitId) 
          || smallestUnitPrice 
          || allPrices[0];
        
        const storedPriceIsForSelectedUnit = item.unitId && selectedPrice && item.unitId === selectedPrice.unitId;
        const basePrice = (storedPriceIsForSelectedUnit && item.price && Number(item.price) > 0)
          ? Number(item.price)
          : (Number(selectedPrice?.price) || 0);

        const baseStock = item.batchId 
          ? (item.product.stockBatches?.find((b: any) => b.id === item.batchId)?.currentQuantity || item.product.stock || 0)
          : (Number(item.product.stock) || 0);

        return {
          id: item.product.id,
          name: item.product.name,
          price: item.isBonus ? 0 : basePrice,
          originalPrice: item.isBonus ? basePrice : basePrice,
          discount: Number(item.discount) || 0,
          quantity: item.quantity,
          unit: selectedPrice?.unit?.name || "Unit",
          unitId: item.unitId || selectedPrice?.unitId,
          batchId: item.batchId,
          conversionFactor: selectedPrice?.conversionFactor || 1,
          baseStock: Number(baseStock),
          isBonus: item.isBonus || false
        };
      });
    };

    socket.on("cart-updated", (data: any) => {
      if (isSyncingRef.current) return;
      
      const currentCart = useCartStore.getState().cart;
      isReceivingSocketRef.current = true;
      
      const mappedCart = mapServerCartToClient(data);

      const addedItem = mappedCart.find((newItem: any) => {
        const oldItem = currentCart.find(i => 
          i.id === newItem.id && 
          (i.batchId ?? null) === (newItem.batchId ?? null)
        );
        return newItem.quantity > (oldItem?.quantity || 0);
      });

      if (addedItem) {
        toast.success(`Scan Berhasil (HP)`, {
          description: `${addedItem.name} ditambahkan ke keranjang`,
          icon: <Smartphone className="w-4 h-4" />
        });
      }

      setCart(mappedCart);
      
      setTimeout(() => {
        isReceivingSocketRef.current = false;
      }, 100);
    });

    fetch(`/api/cart/${sid}`)
      .then(res => res.json())
      .then(data => {
        const mappedCart = mapServerCartToClient(data);
        if (mappedCart.length > 0) {
          setCart(mappedCart);
        }
      });

    return () => {
      socket.disconnect();
    };
  }, [setSessionId, setCart]);

  const syncCartToServer = async (newCart: any[]) => {
    const sid = localStorage.getItem("pos_session_id");
    if (!sid) return;
    isSyncingRef.current = true;
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          items: newCart.map(item => ({
            productId: item.id,
            unitId: item.unitId,
            batchId: item.batchId,
            price: item.price,
            discount: item.discount || 0,
            quantity: item.quantity,
            isBonus: item.isBonus || false
          }))
        })
      });
    } catch (err) {
      console.error("Failed to sync cart:", err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isReceivingSocketRef.current) return;
    
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncCartToServer(cart);
    }, 500);
  }, [cart]);

  // Keyboard Shortcuts (Alt-based and browser-safe combinations)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Focus element check
      const isInput = e.target instanceof HTMLInputElement || 
                      e.target instanceof HTMLTextAreaElement || 
                      e.target instanceof HTMLSelectElement;

      // 1. Ctrl + Enter or Alt + B: Submit/Cetak payment if on payment step
      if ((e.ctrlKey && e.key === 'Enter') || (e.altKey && e.key?.toLowerCase() === 'b')) {
        if (checkoutStep === 'payment') {
          e.preventDefault();
          const submitBtn = document.getElementById("pos-submit-payment") as HTMLButtonElement | null;
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
          }
        }
        return;
      }

      // If user is actively typing in a form input, ignore other shortcuts (except Escape)
      if (isInput) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // 1.5 Single key shortcuts
      if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.getElementById("pos-search-input");
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
        return;
      }

      // 2. Alt combos
      if (e.altKey) {
        const key = e.key?.toLowerCase();
        if (key === 'c') {
          e.preventDefault();
          setActiveModal(activeModal === 'scanner' ? null : 'scanner');
        } else if (key === 'h') {
          e.preventDefault();
          setActiveModal(activeModal === 'history' ? null : 'history');
        } else if (key === 'o') {
          e.preventDefault();
          setActiveModal(activeModal === 'printerSettings' ? null : 'printerSettings');
        } else if (key === 'p') {
          e.preventDefault();
          setCheckoutStep(checkoutStep === 'cart' ? 'payment' : 'cart');
        } else if (key === 'r') {
          e.preventDefault();
          if (cart.length > 0) {
            if (confirm("Apakah Anda yakin ingin mengosongkan keranjang belanja?")) {
              clearCart();
              toast.success("Keranjang dikosongkan");
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [checkoutStep, activeModal, cart, clearCart, setActiveModal, setCheckoutStep]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-bg-main text-text-primary transition-colors duration-300 h-[100dvh]">
      
      {/* Product Catalog list */}
      <ProductCatalog onSelectBatchProduct={(product) => setBatchPickerProduct(product)} />

      {/* Cart Drawer or Payment Screen */}
      {checkoutStep === "cart" ? <CartPanel /> : <PaymentPanel />}

      {/* Modal Riwayat Transaksi */}
      <HistoryModal />

      {/* Batch Picker Modal */}
      {batchPickerProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[85vh] lg:max-w-md">
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary text-text-inverse">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 animate-bounce" />
                <div>
                  <h3 className="text-sm lg:text-base font-black uppercase">Pilih Batch</h3>
                  <p className="text-[10px] opacity-80 font-bold">{batchPickerProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setBatchPickerProduct(null)} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {isLoadingBatches ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-8">
                  <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Memuat Batch...</p>
                </div>
              ) : !productBatches || productBatches.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-20" />
                  <p className="text-xs font-bold text-text-muted">Tidak ada batch aktif untuk barang ini</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                      Urutan: Terlama ke Terbaru (FIFO)
                    </p>
                    <span className="text-[9px] font-bold bg-bg-main px-2 py-1 rounded-full text-brand-primary">
                      {productBatches.filter((b: any) => Number(b.currentQuantity) > 0).length} Batch Aktif
                    </span>
                  </div>

                  <div className="grid gap-6">
                    {[...productBatches]
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((batch: any) => {
                        const isEmpty = Number(batch.currentQuantity) <= 0;
                        const sortedPrices = [...(batchPickerProduct.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
                        const mainUnit = sortedPrices[0];
                        const mainFactor = mainUnit?.conversionFactor || 1;
                        const mainUnitName = mainUnit?.unit?.name?.trim()?.replace(/^[0-9./]+\s*/, '') || 'Unit';
                        
                        const snapshot = batch.batchPrices?.find((bp: any) => bp.unitId === mainUnit?.unitId);
                        const scaledPrice = snapshot ? Number(snapshot.price) : (Number(batch.sellingPrice) * mainFactor);

                        return (
                          <button
                            key={batch.id}
                            disabled={isEmpty}
                            onClick={() => {
                              addToCart({
                                ...batchPickerProduct,
                                price: scaledPrice,
                                stock: Number(batch.currentQuantity),
                                unit: mainUnitName,
                                unitId: sortedPrices[0]?.unitId,
                                conversionFactor: mainFactor
                              }, batch.id);
                              setBatchPickerProduct(null);
                              toast.success("Batch Dipilih", {
                                description: `${batchPickerProduct.name} - ${formatCurrency(scaledPrice)}`
                              });
                            }}
                            className={cn(
                              "w-full text-left p-4 rounded-2xl border transition-all group flex items-center justify-between",
                              isEmpty 
                                ? "bg-bg-main/50 border-border-subtle opacity-50 cursor-not-allowed" 
                                : "border-border-default hover:border-brand-primary hover:bg-brand-primary/5 cursor-pointer animate-in zoom-in-95"
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-md uppercase",
                                  isEmpty ? "bg-text-muted/10 text-text-muted" : "bg-brand-primary/10 text-brand-primary"
                                )}>
                                  #{batch.id.slice(-6)}
                                </span>
                                <span className="text-[10px] font-bold text-text-muted">
                                  Masuk: {new Date(batch.createdAt).toLocaleDateString('id-ID')}
                                </span>
                                {isEmpty && (
                                  <span className="text-[8px] font-black text-status-danger uppercase px-1.5 py-0.5 bg-status-danger/10 rounded">Habis</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Sisa Stok</p>
                                  <p className={cn("text-sm font-black", isEmpty ? "text-text-muted" : "text-text-primary")}>
                                    {formatMultiUnitStock(batch.currentQuantity, batchPickerProduct.prices)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Harga Jual</p>
                                  <p className={cn("text-sm font-black", isEmpty ? "text-text-muted" : "text-brand-primary")}>
                                    {formatCurrency(scaledPrice)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {!isEmpty && (
                              <Plus className="w-5 h-5 text-text-muted group-hover:text-brand-primary transition-colors" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-bg-main border-t border-border-subtle">
              <p className="text-[10px] text-center text-text-muted font-medium italic">
                * Urutan batch disesuaikan dengan metode FIFO (First-In First-Out).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB — Open Cart */}
      {checkoutStep === "cart" && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-brand-primary text-text-inverse shadow-2xl shadow-brand-primary/40 flex items-center justify-center hover:bg-brand-hover active:scale-95 transition-all animate-in zoom-in-75 duration-300"
          aria-label="Buka Keranjang"
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-black flex items-center justify-center shadow-md">
              {cart.length > 9 ? '9+' : cart.length}
            </span>
          )}
        </button>
      )}

      {/* Invoice Success Printing Modal */}
      <PrintSuccessModal 
        isOpen={activeModal === "success"}
        onClose={() => setActiveModal(null)}
        saleData={lastCreatedSale}
      />

      {/* Printer Configuration Modal */}
      <PrinterSettingsModal 
        isOpen={activeModal === "printerSettings"} 
        onClose={() => setActiveModal(null)} 
      />

      {/* Scanner View Modal */}
      <ScannerModal 
        isOpen={activeModal === "scanner"} 
        onClose={() => setActiveModal(null)} 
        onScan={handleScan}
        lastScannedItem={lastScannedItemName}
      />
    </div>
  );
}
