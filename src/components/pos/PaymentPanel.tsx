import React, { useMemo } from "react";
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  AlertCircle, 
  Settings, 
  ChevronLeft,
  Info
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { useCheckout } from "../../hooks/queries/useSales";
import { toast } from "sonner";

export const PaymentPanel: React.FC = () => {
  const {
    cart,
    globalDiscount,
    paymentMethod,
    setPaymentMethod,
    transactionDate,
    setTransactionDate,
    cashReceived,
    setCashReceived,
    setCheckoutStep,
    setActiveModal,
    setLastCreatedSale,
    clearCart,
  } = useCartStore();

  const checkoutMutation = useCheckout();

  // Pricing calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.isBonus ? 0 : item.price) * item.quantity), 0);
  }, [cart]);

  const itemsDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.isBonus ? 0 : (item.discount || 0)) * item.quantity), 0);
  }, [cart]);

  const subtotalAfterItemDiscounts = subtotal - itemsDiscountTotal;
  const discountedSubtotal = subtotalAfterItemDiscounts;
  const total = discountedSubtotal - (globalDiscount || 0);

  // Methods
  const handlePaymentMethodChange = (method: typeof paymentMethod) => {
    setPaymentMethod(method);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (total <= 0) {
      toast.error("Transaksi Gagal", {
        description: "Total harga tidak boleh Rp 0."
      });
      return;
    }

    const payload: any = {
      items: cart.map(item => ({
        productId: item.id,
        unitId: item.unitId,
        quantity: item.quantity,
        price: item.price - (item.discount || 0),
        name: item.name,
        batchId: item.batchId,
        isBonus: item.isBonus || false
      })),
      totalAmount: total,
      paymentMethod,
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
      amountPaid: paymentMethod === 'CASH' ? cashReceived : total,
      changeAmount: paymentMethod === 'CASH' ? Math.max(0, cashReceived - total) : 0
    };

    const toastId = toast.loading("Memproses transaksi...");

    checkoutMutation.mutate(payload, {
      onSuccess: (result: any) => {
        toast.dismiss(toastId);
        const enrichedSale = {
          ...result,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            priceAtSale: item.price,
            isBonus: item.isBonus || false,
            unit: { name: item.unit || "Unit" }
          }))
        };
        
        setLastCreatedSale(enrichedSale);
        setActiveModal("success");

        setTimeout(() => {
          clearCart();
          setCashReceived(0);
          setPaymentMethod("CASH");
        }, 300);
      },
      onError: (error: any) => {
        toast.dismiss(toastId);
      }
    });
  };

  const isCheckoutDisabled = useMemo(() => {
    if (cart.length === 0) return true;
    if (checkoutMutation.isPending) return true;

    if (paymentMethod === "CASH") {
      return cashReceived < total;
    }

    return false;
  }, [cart, paymentMethod, cashReceived, total, checkoutMutation.isPending]);

  return (
    <div className="w-full md:w-[320px] lg:w-[400px] border-l flex flex-col bg-bg-card border-border-default h-full overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Screen 2: Payment Mode Header */}
      <div className="p-4 border-b border-border-subtle bg-bg-main flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setCheckoutStep("cart")}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-border-default hover:bg-bg-card transition-colors text-xs font-black text-brand-primary uppercase tracking-wider"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Fase Pembayaran</h3>
      </div>

      {/* Order Info & Quick Summary */}
      <div className="p-4 border-b border-border-subtle bg-brand-primary/5 space-y-3 flex-shrink-0">
        <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Pembayaran</span>
          <span className="text-xl font-black text-brand-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment Settings & Options */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Tanggal Transaksi</label>
          <input 
            type="date" 
            value={transactionDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-card border-border-default text-text-primary relative mb-4"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Pilih Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handlePaymentMethodChange("CASH")}
              className={cn(
                "flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border-2 transition-all",
                paymentMethod === "CASH" 
                  ? "bg-brand-light border-brand-primary text-brand-primary"
                  : "bg-bg-card border-border-default text-text-muted hover:border-border-strong"
              )}
            >
              <Banknote className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Tunai</span>
            </button>
            <button 
              onClick={() => handlePaymentMethodChange("DEBIT")}
              className={cn(
                "flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border-2 transition-all",
                paymentMethod === "DEBIT" 
                  ? "bg-brand-light border-brand-primary text-brand-primary"
                  : "bg-bg-card border-border-default text-text-muted hover:border-border-strong"
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Debit</span>
            </button>
            <button 
              onClick={() => handlePaymentMethodChange("TRANSFER")}
              className={cn(
                "flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border-2 transition-all",
                paymentMethod === "TRANSFER" 
                  ? "bg-brand-light border-brand-primary text-brand-primary"
                  : "bg-bg-card border-border-default text-text-muted hover:border-border-strong"
              )}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Transfer</span>
            </button>
          </div>
        </div>

        {/* CASH Payment Input */}
        {paymentMethod === "CASH" && (
          <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Uang Diterima (Nominal Tunai)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">Rp</span>
                <input 
                  type="number"
                  className="w-full pl-9 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-black transition-all bg-bg-card border-border-default text-text-primary rounded-lg h-[44px]"
                  placeholder="Masukkan jumlah uang..."
                  value={cashReceived === 0 ? "" : cashReceived}
                  onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Quick Cash Recommendations */}
            <div className="space-y-1">
              <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Saran Uang Tunai</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCashReceived(total)}
                  className={cn(
                    "px-2.5 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm",
                    cashReceived === total 
                      ? "bg-brand-primary text-text-inverse border-brand-primary"
                      : "bg-bg-card border-border-default text-brand-primary hover:border-brand-primary/45"
                  )}
                >
                  Uang Pas
                </button>

                {(() => {
                  const recommendations = [];
                  const next5k = Math.ceil(total / 5000) * 5000;
                  if (next5k > total && next5k !== total) recommendations.push(next5k);
                  
                  const next10k = Math.ceil(total / 10000) * 10000;
                  if (next10k > total && next10k !== next5k) recommendations.push(next10k);
                  
                  const next50k = Math.ceil(total / 50000) * 50000;
                  if (next50k > total && next50k !== next10k && next50k !== next5k) recommendations.push(next50k);
                  
                  const next100k = Math.ceil(total / 100000) * 100000;
                  if (next100k > total && next100k !== next50k && next100k !== next10k) recommendations.push(next100k);

                  if (total < 50000 && !recommendations.includes(50000)) recommendations.push(50000);
                  if (total < 100000 && !recommendations.includes(100000)) recommendations.push(100000);
                  
                  const uniqueBills = Array.from(new Set(recommendations))
                    .filter(val => val > total)
                    .sort((a, b) => a - b)
                    .slice(0, 3);

                  return uniqueBills.map((bill) => (
                    <button
                      key={bill}
                      onClick={() => setCashReceived(bill)}
                      className={cn(
                        "px-2.5 py-1.5 border rounded-lg text-[10px] font-black transition-all shadow-sm",
                        cashReceived === bill 
                          ? "bg-brand-primary text-text-inverse border-brand-primary"
                          : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary/45"
                      )}
                    >
                      {formatCurrency(bill)}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Change Display */}
            {cashReceived > 0 && (
              <div className="pt-2 duration-300">
                {cashReceived >= total ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] flex items-center justify-between shadow-inner animate-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Uang Kembalian:</span>
                    <span className="text-base font-black text-emerald-600">{formatCurrency(cashReceived - total)}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-status-danger/10 border border-status-danger/20 rounded-[24px] flex items-center space-x-2 text-status-danger shadow-inner animate-pulse">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Kurang: {formatCurrency(total - cashReceived)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TRANSFER / DEBIT Specific Instructions */}
        {(paymentMethod === "TRANSFER" || paymentMethod === "DEBIT") && (
          <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-[24px] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2 text-brand-primary">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Petunjuk Non-Tunai</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed font-bold">
              {paymentMethod === "TRANSFER" 
                ? "Pastikan dana sudah masuk ke rekening toko sebelum mencetak struk transaksi."
                : "Pastikan kartu debit digesek dengan benar di mesin EDC dan transaksi dinyatakan berhasil (Approved) di struk EDC."}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="p-4 border-t border-border-default bg-bg-main flex-shrink-0 space-y-3">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveModal("printerSettings")}
            className="p-3 bg-bg-card border border-border-default text-text-secondary rounded-xl hover:bg-bg-main transition-colors flex items-center justify-center shadow-sm"
            title="Pengaturan Printer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            id="pos-submit-payment"
            onClick={handleCheckout}
            disabled={isCheckoutDisabled}
            className="flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-black text-xs shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center space-x-2"
          >
            <span>Bayar {formatCurrency(total)} & Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
