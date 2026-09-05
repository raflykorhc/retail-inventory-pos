import React, { useState, useMemo } from "react";
import { Trash, Plus, Minus, ShoppingBag, CreditCard, RotateCcw, ArrowLeft, Banknote, Calendar, Smartphone, Wallet, MoreHorizontal, Tag, Edit, X, QrCode, Pause, Clock, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PrinterService } from "@/services/printerService";
import { toast } from "@/components/ui/toast";
import { useSettings } from "@/hooks/queries/useMetadata";

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
}

interface PosCartProps {
  cart: CartItem[];
  unitsData?: any[];
  onUpdateQuantity: (id: any, delta: number) => void;
  onSetQuantity?: (id: any, quantity: number) => void;
  onUpdateUnit?: (id: any, priceId: string | number) => void;
  onRemoveItem: (id: any) => void;
  onCheckout: (data: any) => Promise<any> | void;
  onClearCart?: () => void;
  heldCartsCount?: number;
  onHoldCart?: () => void;
  onOpenHeldCarts?: () => void;
  isPaymentPhaseState?: boolean;
  setIsPaymentPhaseState?: (val: boolean) => void;
}

export function PosCart({ 
  cart, 
  unitsData, 
  onUpdateQuantity, 
  onSetQuantity, 
  onUpdateUnit, 
  onRemoveItem, 
  onCheckout, 
  onClearCart,
  heldCartsCount = 0,
  onHoldCart,
  onOpenHeldCarts,
  isPaymentPhaseState,
  setIsPaymentPhaseState
}: PosCartProps) {
  const [internalPaymentPhase, setInternalPaymentPhase] = useState(false);
  
  const isPaymentPhase = isPaymentPhaseState !== undefined ? isPaymentPhaseState : internalPaymentPhase;
  const setIsPaymentPhase = (val: boolean) => {
    if (setIsPaymentPhaseState) {
      setIsPaymentPhaseState(val);
    } else {
      setInternalPaymentPhase(val);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'transfer' | 'debit' | 'qris' | 'split'>('tunai');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitNonCash, setSplitNonCash] = useState<string>('');
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, { type: 'rp' | 'percent'; value: number; showInput: boolean }>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, { value: number; showInput: boolean }>>({});
  const [additionalDiscountType, setAdditionalDiscountType] = useState<'rp' | 'percent'>('rp');
  const [additionalDiscountValue, setAdditionalDiscountValue] = useState<number>(0);
  
  const [completedSaleData, setCompletedSaleData] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: settingsData } = useSettings();
  const shopSettings = settingsData || {
    shopName: "Toko Retail",
    shopAddress: "Jl. Utama No. 1",
    shopPhone: "08123456789",
    defaultSignee: "Kasir Toko"
  };

  const togglePriceInput = (keyId: string, currentPrice: number) => {
    setCustomPrices((prev) => {
      const current = prev[keyId] || { value: currentPrice, showInput: false };
      return {
        ...prev,
        [keyId]: {
          ...current,
          showInput: !current.showInput,
        },
      };
    });
  };

  const updateCustomPriceValue = (keyId: string, value: number) => {
    setCustomPrices((prev) => {
      const current = prev[keyId] || { value: 0, showInput: true };
      return {
        ...prev,
        [keyId]: {
          ...current,
          value: Math.max(0, value),
        },
      };
    });
  };

  const toggleDiscountInput = (keyId: string) => {
    setItemDiscounts((prev) => {
      const current = prev[keyId] || { type: 'rp', value: 0, showInput: false };
      return {
        ...prev,
        [keyId]: {
          ...current,
          showInput: !current.showInput,
        },
      };
    });
  };

  const updateDiscountType = (keyId: string, type: 'rp' | 'percent') => {
    setItemDiscounts((prev) => {
      const current = prev[keyId] || { type: 'rp', value: 0, showInput: true };
      return {
        ...prev,
        [keyId]: {
          ...current,
          type,
        },
      };
    });
  };

  const updateDiscountValue = (keyId: string, value: number) => {
    setItemDiscounts((prev) => {
      const current = prev[keyId] || { type: 'rp', value: 0, showInput: true };
      return {
        ...prev,
        [keyId]: {
          ...current,
          value: Math.max(0, value),
        },
      };
    });
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const itemsSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const keyId = item.cartItemId || (item.batchId ? `${item.id}-${item.batchId}` : String(item.id));
      const customPriceObj = customPrices[keyId];
      const effectivePrice = (customPriceObj?.value !== undefined && customPriceObj?.value >= 0) ? customPriceObj.value : item.price;
      const disc = itemDiscounts[keyId];
      const rawSubtotal = effectivePrice * item.quantity;
      let discountAmount = 0;
      if (disc && disc.value > 0) {
        if (disc.type === 'percent') {
          discountAmount = (rawSubtotal * Math.min(100, disc.value)) / 100;
        } else {
          discountAmount = Math.min(rawSubtotal, disc.value);
        }
      }
      return acc + Math.max(0, rawSubtotal - discountAmount);
    }, 0);
  }, [cart, customPrices, itemDiscounts]);

  const additionalDiscountAmount = useMemo(() => {
    if (!additionalDiscountValue || additionalDiscountValue <= 0) return 0;
    if (additionalDiscountType === 'percent') {
      return (itemsSubtotal * Math.min(100, additionalDiscountValue)) / 100;
    }
    return Math.min(itemsSubtotal, additionalDiscountValue);
  }, [itemsSubtotal, additionalDiscountType, additionalDiscountValue]);

  const total = Math.max(0, itemsSubtotal - additionalDiscountAmount);

  const cashReceivedNum = Number(cashReceived.replace(/\D/g, '')) || 0;
  const change = cashReceivedNum - total;

  const handleCheckoutClick = async () => {
    if (!isPaymentPhase) {
      setIsPaymentPhase(true);
      setCashReceived('');
      setSplitCash('');
      setSplitNonCash('');
    } else {
      const amountPaidNum = Number(cashReceived.replace(/\D/g, '')) || 0;
      const splitCashNum = Number(splitCash.replace(/\D/g, '')) || 0;
      const splitNonCashNum = Number(splitNonCash.replace(/\D/g, '')) || 0;
      
      let amountPaid = undefined;
      let changeAmount = undefined;
      let splitPayments = undefined;

      if (paymentMethod === 'tunai') {
        amountPaid = amountPaidNum;
        changeAmount = Math.max(0, amountPaidNum - total);
      } else if (paymentMethod === 'split') {
        splitPayments = {
          cash: splitCashNum,
          transfer: splitNonCashNum
        };
        amountPaid = splitCashNum + splitNonCashNum;
        changeAmount = Math.max(0, amountPaid - total);
      } else {
        amountPaid = total;
        changeAmount = 0;
      }

      const checkoutDataPayload = {
        paymentMethod: paymentMethod.toUpperCase(),
        totalAmount: total,
        additionalDiscountAmount,
        amountPaid,
        changeAmount,
        splitPayments,
        transactionDate: txDate,
        items: cart.map(item => {
          const keyId = item.cartItemId || (item.batchId ? `${item.id}-${item.batchId}` : String(item.id));
          const customPriceObj = customPrices[keyId];
          const effectivePrice = (customPriceObj?.value !== undefined && customPriceObj?.value >= 0) ? customPriceObj.value : item.price;
          return {
            ...item,
            price: effectivePrice
          };
        })
      };

      await onCheckout(checkoutDataPayload);
      setIsPaymentPhase(false);

      // Trigger receipt modal
      setCompletedSaleData(checkoutDataPayload);
    }
  };

  const triggerBrowserPrint = (saleData: any) => {
    const shopName = shopSettings.shopName || 'TOKO RETAIL';
    const shopAddress = shopSettings.shopAddress || '';
    const shopPhone = shopSettings.shopPhone || '';
    const defaultSignee = shopSettings.defaultSignee || 'Kasir Toko';

    const itemsHtml = (saleData.items || []).map((item: any) => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold; font-size: 11px;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
          <span>${item.quantity} ${item.unit || 'Pcs'} x Rp ${Number(item.price || 0).toLocaleString('id-ID')}</span>
          <span style="font-weight: bold; color: #000;">Rp ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</span>
        </div>
      </div>
    `).join('');

    const subtotal = (saleData.items || []).reduce((acc: number, i: any) => acc + ((i.price || 0) * (i.quantity || 1)), 0);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    const txTimeStr = format(saleData.transactionDate || new Date(), "dd/MM/yyyy HH:mm", { locale: id });

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk ${saleData.invoiceNumber || 'POS'}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { font-family: monospace; font-size: 11px; margin: 0; padding: 10px; width: 54mm; line-height: 1.3; color: #000; background: #fff; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .dash-line { border-bottom: 1px dashed #444; margin: 6px 0; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 14px; text-transform: uppercase;">${shopName}</div>
          ${shopAddress ? `<div class="text-center" style="font-size: 9px; color: #444;">${shopAddress}</div>` : ''}
          ${shopPhone ? `<div class="text-center" style="font-size: 9px; color: #444;">Telp: ${shopPhone}</div>` : ''}
          <div class="dash-line"></div>
          <div class="flex-between" style="font-size: 9px;">
            <span>No: ${saleData.invoiceNumber || `INV-${Date.now()}`}</span>
          </div>
          <div class="flex-between" style="font-size: 9px;">
            <span>Tgl: ${txTimeStr}</span>
            <span>Kasir: ${defaultSignee}</span>
          </div>
          <div class="dash-line"></div>
          ${itemsHtml}
          <div class="dash-line"></div>
          <div class="flex-between" style="font-size: 10px;">
            <span>Subtotal:</span>
            <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div class="flex-between bold" style="font-size: 12px; margin-top: 3px;">
            <span>TOTAL:</span>
            <span>Rp ${Number(saleData.totalAmount || 0).toLocaleString('id-ID')}</span>
          </div>
          <div class="flex-between" style="margin-top: 2px; font-size: 10px;">
            <span>Metode:</span>
            <span>${saleData.paymentMethod}</span>
          </div>
          ${saleData.amountPaid !== undefined ? `
          <div class="flex-between" style="font-size: 10px;">
            <span>Bayar:</span>
            <span>Rp ${Number(saleData.amountPaid).toLocaleString('id-ID')}</span>
          </div>
          ` : ''}
          ${saleData.changeAmount !== undefined && saleData.changeAmount > 0 ? `
          <div class="flex-between" style="font-size: 10px;">
            <span>Kembalian:</span>
            <span>Rp ${Number(saleData.changeAmount).toLocaleString('id-ID')}</span>
          </div>
          ` : ''}
          <div class="dash-line"></div>
          <div class="text-center" style="margin-top: 8px; font-size: 10px;">*** Terima Kasih ***</div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch (e) {}
      }, 1000);
    }, 250);
  };

  const handlePrintReceipt = async () => {
    if (!completedSaleData) return;
    setIsPrinting(true);
    try {
      const settings = localStorage.getItem('printerSettings');
      if (!settings) {
        triggerBrowserPrint(completedSaleData);
        toast.info("Mencetak via Browser", { 
          description: "Printer thermal belum dikonfigurasi di Pengaturan. Struk dialihkan ke cetak browser." 
        });
        return;
      }
      await PrinterService.printReceipt(completedSaleData);
      toast.success("Struk berhasil dicetak!");
    } catch (err: any) {
      console.warn("Thermal hardware print error, falling back to browser print:", err);
      triggerBrowserPrint(completedSaleData);
      toast.info("Mencetak via Browser", { 
        description: "Printer thermal tidak terhubung. Struk dialihkan ke dialog cetak browser." 
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const getCashSuggestions = (amount: number) => {
    const suggestions = [amount];
    if (amount < 50000 && !suggestions.includes(50000)) suggestions.push(50000);
    if (amount < 100000 && !suggestions.includes(100000)) suggestions.push(100000);
    const ceil10k = Math.ceil(amount / 10000) * 10000;
    if (ceil10k > amount && !suggestions.includes(ceil10k)) suggestions.push(ceil10k);
    const ceil50k = Math.ceil(amount / 50000) * 50000;
    if (ceil50k > amount && !suggestions.includes(ceil50k)) suggestions.push(ceil50k);
    const ceil100k = Math.ceil(amount / 100000) * 100000;
    if (ceil100k > amount && !suggestions.includes(ceil100k)) suggestions.push(ceil100k);

    return suggestions.sort((a, b) => a - b);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Cart */}
      <div className="p-3.5 border-b border-border/50 bg-background shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isPaymentPhase && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setIsPaymentPhase(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="font-semibold text-sm text-foreground">
            {isPaymentPhase ? "Pembayaran" : "Keranjang Belanja"}
          </h2>
          {!isPaymentPhase && totalItemsCount > 0 && (
            <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 rounded-full bg-muted text-foreground border border-border/50">
              {totalItemsCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Held Carts Badge Button */}
          {onOpenHeldCarts && heldCartsCount > 0 && !isPaymentPhase && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-2 rounded-lg gap-1 border-border/60 text-foreground"
              onClick={onOpenHeldCarts}
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Tertahan</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 rounded-md font-mono">
                {heldCartsCount}
              </Badge>
            </Button>
          )}

          {/* Hold Cart Button */}
          {onHoldCart && cart.length > 0 && !isPaymentPhase && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2 rounded-lg gap-1"
              onClick={onHoldCart}
              title="Gantung Transaksi (F9)"
            >
              <Pause className="w-3 h-3" /> Gantung
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-border/60 bg-muted/40">F9</Badge>
            </Button>
          )}

          {/* Clear Cart Button */}
          {!isPaymentPhase && cart.length > 0 && onClearCart && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-1.5 rounded-lg"
              onClick={onClearCart}
              title="Bersihkan Keranjang (F8)"
            >
              <RotateCcw className="w-3 h-3" />
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-border/60 bg-muted/40">F8</Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!isPaymentPhase ? (
            /* Fase 1: Keranjang Belanja */
            cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center mb-2">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-foreground">Keranjang Belanja Kosong</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5 max-w-[160px]">
                  Pilih barang dari katalog untuk menambahkan ke transaksi.
                </p>
              </div>
            ) : (
              <div className="p-2.5 space-y-2">
                {cart.map((item) => {
                  const keyId = item.cartItemId || (item.batchId ? `${item.id}-${item.batchId}` : String(item.id));
                  const customPriceObj = customPrices[keyId];
                  const effectivePrice = (customPriceObj?.value !== undefined && customPriceObj?.value >= 0) ? customPriceObj.value : item.price;
                  const disc = itemDiscounts[keyId];
                  const rawSubtotal = effectivePrice * item.quantity;
                  let discountAmount = 0;
                  if (disc && disc.value > 0) {
                    if (disc.type === 'percent') {
                      discountAmount = (rawSubtotal * Math.min(100, disc.value)) / 100;
                    } else {
                      discountAmount = Math.min(rawSubtotal, disc.value);
                    }
                  }
                  const finalSubtotal = Math.max(0, rawSubtotal - discountAmount);
                  const hasExpandedRows = Boolean(customPriceObj?.showInput || disc?.showInput);

                  const unitSelectElement = item.prices && item.prices.length > 0 && onUpdateUnit ? (
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-medium text-muted-foreground shrink-0", hasExpandedRows ? "w-[68px]" : "w-auto")}>Satuan:</span>
                      <Select
                        value={(() => {
                          const selPrice = item.prices.find((p: any) => String(p.id) === String(item.selectedPriceId) || String(p.unitId) === String(item.selectedPriceId));
                          return selPrice ? String(selPrice.id) : String(item.selectedPriceId || '');
                        })()}
                        onValueChange={(val) => onUpdateUnit(keyId, val)}
                      >
                        <SelectTrigger className="h-6 w-[70px] text-[10px] px-1.5 py-0 border-border/40 bg-muted/30 shadow-none rounded-[4px] gap-1">
                          <span className="flex flex-1 text-left truncate">
                            {(() => {
                              const selPrice = item.prices.find((p: any) => String(p.id) === String(item.selectedPriceId) || String(p.unitId) === String(item.selectedPriceId));
                              if (!selPrice) return item.unit || "Satuan";
                              const unitObj = unitsData?.find((u: any) => String(u.id) === String(selPrice.unitId));
                              return unitObj?.name || selPrice.unit?.name || (typeof selPrice.unit === 'string' ? selPrice.unit : item.unit || 'Unit');
                            })()}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {item.prices.map((p: any) => {
                            const unitObj = unitsData?.find((u: any) => String(u.id) === String(p.unitId));
                            const unitName = unitObj?.name || p.unit?.name || (typeof p.unit === 'string' ? p.unit : 'Unit');
                            const valStr = String(p.id || p.unitId);
                            return (
                              <SelectItem key={valStr} value={valStr} className="text-[10px]">
                                {unitName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null;

                  return (
                    <div
                      key={keyId}
                      className="p-2.5 bg-card rounded-xl border border-border/50 hover:border-border transition-all shadow-xs space-y-2"
                    >
                      {/* Baris 1: Gambar/Emoji + Nama Produk + Dropdown Menu Titik 3 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center text-xs shrink-0 border border-border/30 overflow-hidden">
                            {item.image?.includes('/') ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              item.image
                            )}
                          </span>
                          <div className="flex flex-col min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground truncate leading-tight">
                              {item.name}
                            </h4>
                            {item.batchId && (
                              <Badge variant="outline" className="w-fit text-[9px] font-semibold px-1.5 py-0 rounded-md bg-muted text-muted-foreground border-border/50 leading-tight mt-0.5">
                                Batch: {item.batchCode || 'Spesifik'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-[150px]">
                            <DropdownMenuItem onClick={() => togglePriceInput(keyId, item.price)}>
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              {customPriceObj?.showInput ? "Tutup Ubah Harga" : "Ubah Harga"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleDiscountInput(keyId)}>
                              <Tag className="mr-2 h-3.5 w-3.5" />
                              {disc?.showInput ? "Tutup Diskon" : "Tambah Diskon"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onRemoveItem(keyId)}
                            >
                              <Trash className="mr-2 h-3.5 w-3.5" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Row Input Ubah Harga jika diaktifkan */}
                      {customPriceObj?.showInput && (
                        <div className="flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-[68px]">Harga Baru:</span>
                          <div className="relative flex items-center w-[152px]">
                            <span className="absolute left-2 text-[10px] font-bold text-muted-foreground pointer-events-none select-none">
                              Rp
                            </span>
                            <Input
                              type="number"
                              min="0"
                              placeholder={String(item.price)}
                              value={customPriceObj.value ?? item.price}
                              onChange={(e) => updateCustomPriceValue(keyId, parseFloat(e.target.value) || 0)}
                              className="h-6 w-full pl-7 pr-2 text-right text-xs font-bold border-border/40 bg-background rounded-[4px]"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground shrink-0 hover:bg-muted/50 ml-auto"
                            onClick={() => togglePriceInput(keyId, item.price)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Row Input Diskon jika diaktifkan */}
                      {disc?.showInput && (
                        <div className="flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-200">
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-[68px]">Diskon:</span>
                          <Select
                            value={disc.type || 'rp'}
                            onValueChange={(val: 'rp' | 'percent') => updateDiscountType(keyId, val)}
                          >
                            <SelectTrigger className="h-6 w-[70px] text-[10px] font-semibold px-1.5 py-0 border-border/40 bg-muted/30 shadow-none rounded-[4px] gap-1">
                              <span className="flex-1 text-left truncate">{disc?.type === 'percent' ? '%' : 'Rp'}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rp" className="text-xs font-semibold">Rp</SelectItem>
                              <SelectItem value="percent" className="text-xs font-semibold">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={disc.value || ''}
                            onChange={(e) => updateDiscountValue(keyId, parseFloat(e.target.value) || 0)}
                            className="h-6 w-[76px] text-center text-xs font-bold px-1.5 py-0 border-border/40 bg-background rounded-[4px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground shrink-0 hover:bg-muted/50 ml-auto"
                            onClick={() => toggleDiscountInput(keyId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Baris 2: Pengatur Kuantitas & Rincian Harga */}
                      <div className="flex items-end justify-between pt-1">
                        <div className="flex flex-col gap-1.5">
                          {unitSelectElement}

                          <div className="flex items-center space-x-0.5 bg-muted/40 rounded p-0.5 border border-border/40 w-fit">
                            <Button
                              variant="ghost"
                              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-background shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => item.quantity === 1 ? onRemoveItem(keyId) : onUpdateQuantity(keyId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0 && onSetQuantity) {
                                  onSetQuantity(keyId, val);
                                }
                              }}
                              className="h-5 w-7 text-center text-[11px] font-bold tabular-nums p-0 border-none bg-transparent focus-visible:ring-0 shadow-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              variant="ghost"
                              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm hover:bg-background hover:text-foreground shrink-0"
                              onClick={() => onUpdateQuantity(keyId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground block leading-none mb-0.5">
                            @ Rp {effectivePrice.toLocaleString('id-ID')} {item.unit ? `/ ${item.unit}` : ''}
                          </span>
                          {discountAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-muted-foreground line-through tabular-nums leading-none">
                                Rp {rawSubtotal.toLocaleString('id-ID')}
                              </span>
                              <span className="text-xs font-bold text-foreground tabular-nums">
                                Rp {finalSubtotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-foreground tabular-nums">
                              Rp {rawSubtotal.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Fase 2: Pembayaran */
            <div className="p-4 space-y-4">
              {/* Tanggal Transaksi */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Tanggal Transaksi
                </Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 text-xs border-border/60",
                          !txDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-3.5 w-3.5" />
                        {txDate ? format(txDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={txDate}
                      onSelect={(date) => date && setTxDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Total Tagihan Besar */}
              <div className="bg-muted/40 rounded-xl p-3.5 text-center border border-border/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">Total Tagihan</span>
                <span className="text-2xl font-bold text-foreground tracking-tight">
                  Rp {total.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Metode Pembayaran</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={paymentMethod === 'tunai' ? 'default' : 'outline'}
                    className="h-8 text-xs justify-start gap-2 font-medium"
                    onClick={() => setPaymentMethod('tunai')}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Tunai
                  </Button>
                  <Button
                    variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                    className="h-8 text-xs justify-start gap-2 font-medium"
                    onClick={() => setPaymentMethod('transfer')}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Transfer
                  </Button>
                  <Button
                    variant={paymentMethod === 'debit' ? 'default' : 'outline'}
                    className="h-8 text-xs justify-start gap-2 font-medium"
                    onClick={() => setPaymentMethod('debit')}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Debit
                  </Button>
                  <Button
                    variant={paymentMethod === 'qris' ? 'default' : 'outline'}
                    className="h-8 text-xs justify-start gap-2 font-medium"
                    onClick={() => setPaymentMethod('qris')}
                  >
                    <QrCode className="w-3.5 h-3.5" /> QRIS
                  </Button>
                  <Button
                    variant={paymentMethod === 'split' ? 'default' : 'outline'}
                    className="h-8 text-xs justify-center gap-2 col-span-2 font-medium"
                    onClick={() => setPaymentMethod('split')}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Split (Pembayaran Campur)
                  </Button>
                </div>
              </div>

              {/* Rincian Metode */}
              {paymentMethod === 'tunai' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Uang Diterima</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-8 h-9 text-sm font-semibold"
                        placeholder="0"
                        value={cashReceived}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCashReceived(val ? parseInt(val).toLocaleString('id-ID') : '');
                        }}
                      />
                    </div>
                  </div>

                  {/* Saran Uang Tunai */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Saran Uang Tunai</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {getCashSuggestions(total).map((sug, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-medium border-border/60 hover:bg-muted text-foreground"
                          onClick={() => setCashReceived(sug.toLocaleString('id-ID'))}
                        >
                          {sug === total ? 'Uang Pas' : `Rp ${sug.toLocaleString('id-ID')}`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Uang Kembalian */}
                  <div className={`p-2.5 rounded-lg flex items-center justify-between border ${change < 0 ? 'bg-muted/40 border-border/60 text-muted-foreground' : 'bg-muted/40 border-border/60 text-foreground'}`}>
                    <span className="text-xs font-medium">{change < 0 ? 'Kurang Bayar' : 'Kembalian'}</span>
                    <span className="text-sm font-bold tabular-nums">
                      Rp {Math.abs(change).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {['transfer', 'debit', 'qris'].includes(paymentMethod) && (
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-center animate-in fade-in duration-200">
                  <p className="text-xs text-muted-foreground">
                    Proses pembayaran via {paymentMethod.toUpperCase()} sebesar<br />
                    <strong className="text-foreground mt-1 inline-block text-sm">Rp {total.toLocaleString('id-ID')}</strong>
                  </p>
                </div>
              )}

              {paymentMethod === 'split' && (
                <div className="space-y-3 animate-in fade-in duration-200 p-3 rounded-xl border border-border/60 bg-muted/10">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tunai</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-8 h-8 text-xs font-medium"
                        placeholder="0"
                        value={splitCash}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSplitCash(val ? parseInt(val).toLocaleString('id-ID') : '');
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Non-Tunai (Transfer / Debit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-8 h-8 text-xs font-medium"
                        placeholder="0"
                        value={splitNonCash}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSplitNonCash(val ? parseInt(val).toLocaleString('id-ID') : '');
                        }}
                      />
                    </div>
                  </div>

                  {(() => {
                    const c = Number(splitCash.replace(/\D/g, '')) || 0;
                    const nc = Number(splitNonCash.replace(/\D/g, '')) || 0;
                    const diff = (c + nc) - total;
                    return (
                      <div className="mt-2 flex justify-between items-center text-xs p-2 rounded-lg bg-muted/40 border border-border/50 text-foreground font-medium">
                        <span>{diff < 0 ? 'Sisa Tagihan' : 'Kembalian'}</span>
                        <span className="tabular-nums font-bold">Rp {Math.abs(diff).toLocaleString('id-ID')}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Rincian Total & Tombol Pembayaran (Pinned Footer) */}
      <div className="p-3 border-t border-border/50 bg-background space-y-2 shrink-0 z-10">
        {!isPaymentPhase ? (
          <div className="space-y-1.5">
            {additionalDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-semibold">
                  Rp {itemsSubtotal.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Input Diskon Tambahan */}
            <div className="flex justify-between items-center text-xs gap-2">
              <span className="font-medium text-muted-foreground shrink-0">Diskon Tambahan</span>
              <div className="flex items-center gap-1">
                <Select
                  value={additionalDiscountType}
                  onValueChange={(val: 'rp' | 'percent') => setAdditionalDiscountType(val)}
                >
                  <SelectTrigger className="h-6 w-[55px] text-[10px] font-semibold px-1.5 py-0 border-border/40 bg-background shadow-none rounded-[4px] gap-0.5">
                    <span className="flex-1 text-center">{additionalDiscountType === 'percent' ? '%' : 'Rp'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rp" className="text-xs font-semibold">Rp</SelectItem>
                    <SelectItem value="percent" className="text-xs font-semibold">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={additionalDiscountValue || ''}
                  onChange={(e) => setAdditionalDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-6 w-16 text-right text-xs font-bold px-1.5 py-0 border-border/40 bg-background rounded-[4px]"
                />
              </div>
            </div>

            {/* Presets Button */}
            <div className="flex items-center justify-end gap-1">
              {[5, 10, 15, 20].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] rounded-md font-medium text-muted-foreground hover:text-foreground border-border/40"
                  onClick={() => {
                    setAdditionalDiscountType('percent');
                    setAdditionalDiscountValue(pct);
                  }}
                >
                  {pct}%
                </Button>
              ))}
              {additionalDiscountValue > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-[10px] rounded-md text-muted-foreground hover:text-destructive"
                  onClick={() => setAdditionalDiscountValue(0)}
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Total Pembayaran */}
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/30">
              <span className="font-bold text-foreground">Total Pembayaran</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                Rp {total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        ) : null}

        <Button
          className="w-full h-9 text-xs font-semibold rounded-lg shadow-xs transition-all gap-1.5"
          disabled={cart.length === 0 || (isPaymentPhase && paymentMethod === 'tunai' && change < 0) || (isPaymentPhase && paymentMethod === 'split' && ((Number(splitCash.replace(/\D/g, '')) || 0) + (Number(splitNonCash.replace(/\D/g, '')) || 0) - total) < 0)}
          onClick={handleCheckoutClick}
        >
          {isPaymentPhase ? (
            <>
              <Banknote className="w-4 h-4" />
              Selesaikan Transaksi
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Bayar Transaksi
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-border/60 bg-muted/30 ml-auto">F4</Badge>
            </>
          )}
        </Button>
      </div>

      {/* Receipt Modal (Shadcn Dialog) */}
      <Dialog open={!!completedSaleData} onOpenChange={(open) => !open && setCompletedSaleData(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Transaksi Berhasil
            </DialogTitle>
          </DialogHeader>

          {completedSaleData && (
            <div className="flex-1 min-h-0 overflow-y-auto my-2 pr-1 space-y-3">
              {/* Thermal Receipt Paper Card */}
              <div className="p-4 bg-white text-black rounded-lg border border-gray-300 shadow-xs font-mono text-[11px] leading-relaxed mx-auto max-w-[320px]">
                {/* Header Toko */}
                <div className="text-center font-bold text-xs uppercase tracking-wide">
                  {shopSettings.shopName || "TOKO RETAIL"}
                </div>
                {shopSettings.shopAddress && (
                  <div className="text-center text-[10px] text-gray-600 leading-tight mt-0.5">
                    {shopSettings.shopAddress}
                  </div>
                )}
                {shopSettings.shopPhone && (
                  <div className="text-center text-[10px] text-gray-600">
                    Telp: {shopSettings.shopPhone}
                  </div>
                )}

                <div className="border-b border-dashed border-gray-400 my-2" />

                {/* Metadata Transaksi */}
                <div className="space-y-0.5 text-[10px] text-gray-700">
                  <div className="flex justify-between">
                    <span>No:</span>
                    <span className="font-semibold text-black">{completedSaleData.invoiceNumber || `INV-${Date.now()}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl:</span>
                    <span>{format(completedSaleData.transactionDate || new Date(), "dd/MM/yyyy HH:mm", { locale: id })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{shopSettings.defaultSignee || "Kasir Toko"}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-400 my-2" />

                {/* Daftar Barang (Itemized List) */}
                <div className="space-y-1.5 text-[10px]">
                  {completedSaleData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-semibold text-black truncate">
                        {item.name}
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>
                          {item.quantity} {item.unit || "Pcs"} x Rp {Number(item.price || 0).toLocaleString("id-ID")}
                        </span>
                        <span className="font-bold text-black">
                          Rp {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-b border-dashed border-gray-400 my-2" />

                {/* Rincian Total */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span>
                      Rp {(completedSaleData.items || []).reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.quantity || 1)), 0).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-bold pt-1 text-black border-t border-gray-300">
                    <span>TOTAL:</span>
                    <span>Rp {Number(completedSaleData.totalAmount || 0).toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between text-gray-700 pt-0.5">
                    <span>Metode Bayar:</span>
                    <span className="font-semibold">{completedSaleData.paymentMethod}</span>
                  </div>

                  {completedSaleData.amountPaid !== undefined && (
                    <div className="flex justify-between text-gray-700">
                      <span>Bayar:</span>
                      <span>Rp {Number(completedSaleData.amountPaid).toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {completedSaleData.changeAmount !== undefined && completedSaleData.changeAmount > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Kembalian:</span>
                      <span>Rp {Number(completedSaleData.changeAmount).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-gray-400 my-2" />

                <div className="text-center text-[10px] text-gray-600 italic">
                  *** Terima Kasih Atas Kunjungan Anda ***
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t border-border/40 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCompletedSaleData(null)}
              className="text-xs"
            >
              Tutup / Transaksi Baru
            </Button>
            <Button 
              size="sm" 
              onClick={handlePrintReceipt}
              disabled={isPrinting}
              className="text-xs gap-1.5 font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              {isPrinting ? "Mencetak..." : "Cetak Struk Thermal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
