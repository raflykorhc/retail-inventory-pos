import React, { useMemo } from "react";
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Receipt, 
  Layers, 
  Info, 
  AlertCircle, 
  Printer, 
  Settings, 
  ChevronLeft 
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";
import { useCheckout } from "../../hooks/queries/useSales";
import { toast } from "sonner";

export const PaymentPanel: React.FC = () => {
  const {
    cart,
    globalDiscount,
    selectedCustomer,
    selectedProject,
    paymentMethod,
    setPaymentMethod,
    dueDate,
    setDueDate,
    transactionDate,
    setTransactionDate,
    cashReceived,
    setCashReceived,
    splitAmounts,
    setSplitAmount,
    setSplitAmounts,
    setCheckoutStep,
    setActiveModal,
    setLastCreatedSale,
    clearCart,
    isSplitPayment,
    setIsSplitPayment,
    isDeliveryRequired,
    setIsDeliveryRequired
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

  const projectDiscount = useMemo(() => {
    return selectedProject?.specialDiscount 
      ? (subtotalAfterItemDiscounts * (selectedProject.specialDiscount / 100)) 
      : 0;
  }, [selectedProject, subtotalAfterItemDiscounts]);

  const discountedSubtotal = subtotalAfterItemDiscounts - projectDiscount;
  const total = discountedSubtotal - (globalDiscount || 0);

  // Split Calculations
  const totalAllocated = useMemo(() => {
    if (paymentMethod !== "SPLIT") return 0;
    return (
      Number(splitAmounts.CASH || 0) +
      Number(splitAmounts.DEBIT || 0) +
      Number(splitAmounts.TRANSFER || 0) +
      Number(splitAmounts.DEBT || 0)
    );
  }, [paymentMethod, splitAmounts]);

  const splitRemaining = useMemo(() => {
    return Math.max(0, total - totalAllocated);
  }, [total, totalAllocated]);

  const splitOverpaid = useMemo(() => {
    return Math.max(0, totalAllocated - total);
  }, [total, totalAllocated]);

  const hasPendingItems = useMemo(() => {
    return cart.some(item => {
      const taken = item.takenQuantity !== undefined ? item.takenQuantity : item.quantity;
      return taken < item.quantity;
    });
  }, [cart]);

  // Methods
  const handlePaymentMethodChange = (method: typeof paymentMethod) => {
    setPaymentMethod(method);
    setIsSplitPayment(method === "SPLIT");
    if (method !== "DEBT" && method !== "SPLIT") {
      setDueDate("");
    }
    
    // Auto-prefill if single payment methods
    if (method === "DEBT" && selectedCustomer?.billingDate) {
      const now = new Date();
      let nextBillingDate = new Date(now.getFullYear(), now.getMonth(), selectedCustomer.billingDate);
      if (nextBillingDate <= now) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }
      setDueDate(nextBillingDate.toISOString().split('T')[0]);
    }
  };

  const handleUseRemaining = (field: "CASH" | "DEBIT" | "TRANSFER" | "DEBT") => {
    const currentVal = Number(splitAmounts[field] || 0);
    setSplitAmount(field, currentVal + splitRemaining);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedCustomer) return;

    if (total <= 0) {
      toast.error("Transaksi Gagal", {
        description: "Total harga tidak boleh Rp 0."
      });
      return;
    }

    // Validation for debt component
    const hasDebtComponent = paymentMethod === "DEBT" || (paymentMethod === "SPLIT" && Number(splitAmounts.DEBT || 0) > 0);
    if (hasDebtComponent && !selectedCustomer?.isContractor) {
      toast.error("Transaksi Gagal", {
        description: "Pelanggan bukan Kontraktor. Tidak bisa berhutang."
      });
      return;
    }

    if (hasDebtComponent && !dueDate) {
      toast.error("Transaksi Gagal", {
        description: "Pilih tanggal jatuh tempo untuk pembayaran piutang."
      });
      return;
    }

    const payload: any = {
      customerId: selectedCustomer.id,
      projectId: selectedProject?.id,
      items: cart.map(item => ({
        productId: item.id,
        unitId: item.unitId,
        quantity: item.quantity,
        takenQuantity: item.takenQuantity,
        price: item.price - (item.discount || 0),
        name: item.name,
        batchId: item.batchId,
        isBonus: item.isBonus || false
      })),
      totalAmount: total,
      paymentMethod,
      dueDate: hasDebtComponent && dueDate ? dueDate : undefined,
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
      isDeliveryRequired
    };

    if (paymentMethod === "SPLIT") {
      payload.splitPayments = {
        cash: Number(splitAmounts.CASH || 0),
        debit: Number(splitAmounts.DEBIT || 0),
        transfer: Number(splitAmounts.TRANSFER || 0),
        debt: Number(splitAmounts.DEBT || 0)
      };
    }

    const toastId = toast.loading("Memproses transaksi...");

    checkoutMutation.mutate(payload, {
      onSuccess: (result: any) => {
        toast.dismiss(toastId);
        const enrichedSale = {
          ...result,
          customer: selectedCustomer,
          project: selectedProject,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            priceAtSale: item.price,
            isBonus: item.isBonus || false,
            unit: { name: item.unit || "Unit" }
          }))
        };
        // Show the success/print modal first, then reset state after a short delay
        // so the modal data is preserved when it opens
        setLastCreatedSale(enrichedSale);
        setActiveModal("success");

        setTimeout(() => {
          clearCart();
          setCashReceived(0);
          setPaymentMethod("CASH");
          setSplitAmounts({ CASH: 0, DEBIT: 0, TRANSFER: 0, DEBT: 0 });
          setDueDate("");
        }, 300);
      },
      onError: (error: any) => {
        toast.dismiss(toastId);
      }
    });
  };

  // Check if checkout button is disabled
  const isCheckoutDisabled = useMemo(() => {
    if (cart.length === 0 || !selectedCustomer) return true;
    if (checkoutMutation.isPending) return true;

    if (paymentMethod === "CASH") {
      return cashReceived < total;
    }

    if (paymentMethod === "DEBT") {
      return !dueDate;
    }

    if (paymentMethod === "SPLIT") {
      // Must allocate the full amount
      if (totalAllocated < total) return true;
      // If there's debt, termin must be filled
      if (Number(splitAmounts.DEBT || 0) > 0 && !dueDate) return true;
    }

    return false;
  }, [cart, selectedCustomer, paymentMethod, cashReceived, total, dueDate, totalAllocated, splitAmounts.DEBT, checkoutMutation.isPending]);

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
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Pelanggan</span>
            <h4 className="text-xs font-black text-text-primary mt-0.5">{selectedCustomer?.name}</h4>
            {selectedCustomer?.isContractor && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-brand-primary text-text-inverse text-[8px] font-black rounded uppercase tracking-tighter">Kontraktor</span>
            )}
          </div>
          {selectedProject && (
            <div className="text-right">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Proyek</span>
              <h4 className="text-xs font-black text-text-primary mt-0.5">{selectedProject.projectName}</h4>
            </div>
          )}
        </div>

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
            <button 
              onClick={() => handlePaymentMethodChange("DEBT")}
              disabled={!selectedCustomer?.isContractor}
              className={cn(
                "flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border-2 transition-all",
                !selectedCustomer?.isContractor && "opacity-40 cursor-not-allowed",
                paymentMethod === "DEBT" 
                  ? "bg-brand-light border-brand-primary text-brand-primary"
                  : "bg-bg-card border-border-default text-text-muted hover:border-border-strong"
              )}
            >
              <Receipt className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Piutang</span>
            </button>
            <button 
              onClick={() => handlePaymentMethodChange("SPLIT")}
              className={cn(
                "col-span-2 flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border-2 transition-all",
                paymentMethod === "SPLIT" 
                  ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20"
                  : "bg-bg-card border-border-default text-text-muted hover:border-border-strong"
              )}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Pembayaran Gabungan (Split)</span>
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

        {/* DEBT Payment Input */}
        {paymentMethod === "DEBT" && (
          <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Jatuh Tempo (Termin)</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => {
                    const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                    baseDate.setDate(baseDate.getDate() + 30);
                    setDueDate(baseDate.toISOString().split('T')[0]);
                  }}
                  className={cn(
                    "py-2 border rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
                    dueDate === (() => {
                      const d = transactionDate ? new Date(transactionDate) : new Date();
                      d.setDate(d.getDate() + 30);
                      return d.toISOString().split('T')[0];
                    })()
                      ? "bg-brand-primary text-text-inverse border-brand-primary"
                      : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                  )}
                >
                  30 Hari
                </button>
                <button 
                  onClick={() => {
                    const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                    baseDate.setDate(baseDate.getDate() + 45);
                    setDueDate(baseDate.toISOString().split('T')[0]);
                  }}
                  className={cn(
                    "py-2 border rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
                    dueDate === (() => {
                      const d = transactionDate ? new Date(transactionDate) : new Date();
                      d.setDate(d.getDate() + 45);
                      return d.toISOString().split('T')[0];
                    })()
                      ? "bg-brand-primary text-text-inverse border-brand-primary"
                      : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                  )}
                >
                  45 Hari
                </button>
                <button 
                  onClick={() => {
                    const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                    baseDate.setDate(baseDate.getDate() + 60);
                    setDueDate(baseDate.toISOString().split('T')[0]);
                  }}
                  className={cn(
                    "py-2 border rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
                    dueDate === (() => {
                      const d = transactionDate ? new Date(transactionDate) : new Date();
                      d.setDate(d.getDate() + 60);
                      return d.toISOString().split('T')[0];
                    })()
                      ? "bg-brand-primary text-text-inverse border-brand-primary"
                      : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                  )}
                >
                  60 Hari
                </button>
              </div>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-card border-border-default text-text-primary relative"
              />
            </div>
          </div>
        )}

        {/* SPLIT Payment Option */}
        {paymentMethod === "SPLIT" && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header info */}
            <div className="p-3 bg-brand-primary/5 border border-brand-primary/10 rounded-[24px] space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-text-secondary">Sudah Dialokasikan:</span>
                <span className="font-black text-brand-primary">{formatCurrency(totalAllocated)}</span>
              </div>
              
              {splitRemaining > 0 ? (
                <div className="flex justify-between items-center text-xs text-amber-600">
                  <span className="font-bold">Sisa Belum Dibayar:</span>
                  <span className="font-black animate-pulse">{formatCurrency(splitRemaining)}</span>
                </div>
              ) : splitOverpaid > 0 ? (
                <div className="flex justify-between items-center text-xs text-emerald-600">
                  <span className="font-bold">Uang Kembalian:</span>
                  <span className="font-black">{formatCurrency(splitOverpaid)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs text-emerald-600">
                  <span className="font-bold">Pembayaran Pas!</span>
                  <span className="font-black">✓ Lunas</span>
                </div>
              )}
            </div>

            {/* Allocation rows */}
            <div className="space-y-3">
              {/* Cash Allocation */}
              <div className="space-y-1 bg-bg-main p-3 rounded-[24px] border border-border-subtle">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">1. Tunai (CASH)</span>
                  {splitRemaining > 0 && (
                    <button 
                      onClick={() => handleUseRemaining("CASH")}
                      className="text-[9px] font-black text-brand-primary uppercase hover:underline"
                    >
                      Gunakan Sisa
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">Rp</span>
                  <input 
                    type="number"
                    value={splitAmounts.CASH || ""}
                    onChange={(e) => setSplitAmount("CASH", Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs font-black bg-bg-card border-border-default text-text-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Debit Allocation */}
              <div className="space-y-1 bg-bg-main p-3 rounded-[24px] border border-border-subtle">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">2. Debit EDC</span>
                  {splitRemaining > 0 && (
                    <button 
                      onClick={() => handleUseRemaining("DEBIT")}
                      className="text-[9px] font-black text-brand-primary uppercase hover:underline"
                    >
                      Gunakan Sisa
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">Rp</span>
                  <input 
                    type="number"
                    value={splitAmounts.DEBIT || ""}
                    onChange={(e) => setSplitAmount("DEBIT", Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs font-black bg-bg-card border-border-default text-text-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Transfer Bank Allocation */}
              <div className="space-y-1 bg-bg-main p-3 rounded-[24px] border border-border-subtle">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">3. Transfer Bank</span>
                  {splitRemaining > 0 && (
                    <button 
                      onClick={() => handleUseRemaining("TRANSFER")}
                      className="text-[9px] font-black text-brand-primary uppercase hover:underline"
                    >
                      Gunakan Sisa
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">Rp</span>
                  <input 
                    type="number"
                    value={splitAmounts.TRANSFER || ""}
                    onChange={(e) => setSplitAmount("TRANSFER", Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs font-black bg-bg-card border-border-default text-text-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Debt (Piutang) Allocation */}
              <div className="space-y-1 bg-bg-main p-3 rounded-[24px] border border-border-subtle">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">4. Piutang (DEBT)</span>
                    {!selectedCustomer?.isContractor && (
                      <span className="px-1 py-0.5 bg-status-danger/10 text-status-danger text-[8px] font-bold rounded">Hanya Kontraktor</span>
                    )}
                  </div>
                  {splitRemaining > 0 && selectedCustomer?.isContractor && (
                    <button 
                      onClick={() => handleUseRemaining("DEBT")}
                      className="text-[9px] font-black text-brand-primary uppercase hover:underline"
                    >
                      Gunakan Sisa
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">Rp</span>
                  <input 
                    type="number"
                    disabled={!selectedCustomer?.isContractor}
                    value={splitAmounts.DEBT || ""}
                    onChange={(e) => setSplitAmount("DEBT", Number(e.target.value) || 0)}
                    placeholder="0"
                    className={cn(
                      "w-full pl-8 pr-3 py-2 border rounded-lg text-xs font-black focus:ring-1 focus:ring-brand-primary focus:outline-none",
                      selectedCustomer?.isContractor 
                        ? "bg-bg-card border-border-default text-text-primary"
                        : "bg-bg-main border-border-subtle text-text-muted cursor-not-allowed opacity-50"
                    )}
                  />
                </div>

                {/* Split Due Date Termin Selector inline */}
                {Number(splitAmounts.DEBT || 0) > 0 && (
                  <div className="mt-3 pt-2 border-t border-dashed border-border-subtle space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Jatuh Tempo Piutang (Termin)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button 
                          onClick={() => {
                            const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                            baseDate.setDate(baseDate.getDate() + 30);
                            setDueDate(baseDate.toISOString().split('T')[0]);
                          }}
                          className={cn(
                            "py-1.5 border rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm",
                            dueDate === (() => {
                              const d = transactionDate ? new Date(transactionDate) : new Date();
                              d.setDate(d.getDate() + 30);
                              return d.toISOString().split('T')[0];
                            })()
                              ? "bg-brand-primary text-text-inverse border-brand-primary"
                              : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                          )}
                        >
                          30 Hari
                        </button>
                        <button 
                          onClick={() => {
                            const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                            baseDate.setDate(baseDate.getDate() + 45);
                            setDueDate(baseDate.toISOString().split('T')[0]);
                          }}
                          className={cn(
                            "py-1.5 border rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm",
                            dueDate === (() => {
                              const d = transactionDate ? new Date(transactionDate) : new Date();
                              d.setDate(d.getDate() + 45);
                              return d.toISOString().split('T')[0];
                            })()
                              ? "bg-brand-primary text-text-inverse border-brand-primary"
                              : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                          )}
                        >
                          45 Hari
                        </button>
                        <button 
                          onClick={() => {
                            const baseDate = transactionDate ? new Date(transactionDate) : new Date();
                            baseDate.setDate(baseDate.getDate() + 60);
                            setDueDate(baseDate.toISOString().split('T')[0]);
                          }}
                          className={cn(
                            "py-1.5 border rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm",
                            dueDate === (() => {
                              const d = transactionDate ? new Date(transactionDate) : new Date();
                              d.setDate(d.getDate() + 60);
                              return d.toISOString().split('T')[0];
                            })()
                              ? "bg-brand-primary text-text-inverse border-brand-primary"
                              : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                          )}
                        >
                          60 Hari
                        </button>
                      </div>
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-2 border rounded-lg text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors bg-bg-card border-border-default text-text-primary relative"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                ? "Pastikan dana sudah masuk ke rekening Bank Mandiri PD Sukses Bangunan sebelum mencetak struk transaksi."
                : "Pastikan kartu debit digesek dengan benar di mesin EDC dan transaksi dinyatakan berhasil (Approved) di struk EDC."}
            </p>
          </div>
        )}

        {/* Delivery / Titipan Toggle for Pending Items */}
        {hasPendingItems && (
          <div className="p-4 bg-brand-light border border-brand-primary/20 rounded-[24px] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
            <div className="flex items-center space-x-2 text-brand-primary mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Opsi Sisa Barang</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed font-bold">
              Sebagian barang tidak diambil penuh. Apakah sisa barang ini mau dikirim via supir atau diambil sendiri (titip)?
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsDeliveryRequired(false)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm",
                  !isDeliveryRequired
                    ? "bg-brand-primary text-text-inverse border-brand-primary"
                    : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                )}
              >
                Ambil Sendiri Nanti (Titip)
              </button>
              <button 
                onClick={() => setIsDeliveryRequired(true)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center space-x-1",
                  isDeliveryRequired
                    ? "bg-brand-primary text-text-inverse border-brand-primary"
                    : "bg-bg-card border-border-default text-text-secondary hover:border-brand-primary"
                )}
              >
                Kirim via Supir (DO)
              </button>
            </div>
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
            className="flex-1 bg-brand-primary text-text-inverse font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center space-x-2 uppercase tracking-wider rounded-full px-7 py-[14px] text-[14px] font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak & Bayar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
