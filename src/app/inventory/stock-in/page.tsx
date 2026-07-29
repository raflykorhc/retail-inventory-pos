import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Search, Trash2, ArrowLeft, Save, FileText, CheckCircle, Package, Printer, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { QRPrintManager } from "../../../components/QRPrintManager";
import { SearchableSelect } from "../../../components/ui/SearchableSelect";
import { cn, formatMultiUnitStock } from "../../../lib/utils";
import axiosClient from "../../../lib/axiosClient";

export default function StockInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const quickStockInState = (location.state as any)?.quickStockIn ?? null;
  
  // Data States
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const placeholderProducts = useMemo(() => [
    { id: "1", code: "BRG-001", name: "Semen Portland 50kg Tiga Roda", prices: [{ unitId: "1", conversionFactor: 1 }] },
    { id: "2", code: "BRG-002", name: "Besi Beton 10mm SNI", prices: [{ unitId: "2", conversionFactor: 1 }] }
  ], []);

  const placeholderSuppliers = useMemo(() => [
    { id: "1", name: "PT Tiga Roda Indonesia" },
    { id: "2", name: "PT Krakatau Steel" }
  ], []);

  const placeholderUnits = useMemo(() => [
    { id: "1", name: "Zak" },
    { id: "2", name: "Batang" }
  ], []);

  const activeProducts = isLoading ? placeholderProducts : products;
  const activeSuppliers = isLoading ? placeholderSuppliers : suppliers;
  const activeUnits = isLoading ? placeholderUnits : units;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [items, setItems] = useState<any[]>([]);
  const [successData, setSuccessData] = useState<any>(null);
  const [isQRManagerOpen, setIsQRManagerOpen] = useState(false);
  const [qrManagerItems, setQRManagerItems] = useState<any[]>([]);
  const [transactionDate, setTransactionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchInitialData();
    // Generate Invoice Number
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    setInvoiceNumber(`INV-IN-${timestamp}`);
  }, []);

  // Ref untuk mencegah quick stock-in dijalankan lebih dari satu kali
  const quickStockInApplied = useRef(false);
  const [isQuickStockInBannerVisible, setIsQuickStockInBannerVisible] = useState(true);

  const targetUnitName = useMemo(() => {
    if (!quickStockInState) return "";
    const prodArray = Array.isArray(activeProducts) ? activeProducts : [];
    const freshProduct = prodArray.find((p: any) => p.id === quickStockInState.product?.id) || quickStockInState.product;
    const prices = freshProduct?.prices || [];
    const foundUnit = prices.find((p: any) => p.unitId === quickStockInState.unitId);
    return foundUnit?.unit?.name || "unit";
  }, [activeProducts, quickStockInState]);

  // Setelah produk dimuat, tambahkan item dari Quick Stock-in jika ada
  useEffect(() => {
    // Guard: hanya jalankan sekali, hanya jika ada state, dan data sudah siap
    if (quickStockInApplied.current) return;
    if (!quickStockInState) return;
    if (isLoading) return;
    const prodArray = Array.isArray(activeProducts) ? activeProducts : [];
    if (prodArray.length === 0) return;

    quickStockInApplied.current = true;

    const { product, quantity, unitId } = quickStockInState;

    // Cari produk dari data server (lebih lengkap)
    const freshProduct = prodArray.find((p: any) => p.id === product.id) || product;
    const prices = freshProduct.prices || [];
    const sortedPrices = [...prices].sort((a: any, b: any) => b.conversionFactor - a.conversionFactor);
    const targetUnit = sortedPrices.find((p: any) => p.unitId === unitId) || sortedPrices[0];
    const defaultUnitId = targetUnit?.unitId || unitId;

    // Hitung harga modal/beli berdasarkan averageCost dan conversionFactor unit terpilih
    const targetUnitCF = targetUnit?.conversionFactor || 1;
    const computedCostPrice = Math.round(Number(freshProduct.averageCost) * targetUnitCF) || 0;
    
    // Hitung harga jual dari unit terpilih
    const computedSellingPrice = targetUnit 
      ? Math.round(Number(targetUnit.price)) 
      : (Math.round(Number(freshProduct.prices?.[0]?.price)) || 0);

    setItems([{
      productId: freshProduct.id,
      name: freshProduct.name,
      unitId: defaultUnitId,
      quantity,
      costPrice: computedCostPrice,
      sellingPrice: computedSellingPrice,
      product: freshProduct
    }]);

    // Otomatis pilih supplier jika tersedia
    if (product.supplierId) {
      setSupplierId(product.supplierId);
    }

    const currentUnitName = targetUnit?.unit?.name || "unit";
    toast.success("Quick Stock-in", {
      id: "quick-stock-in",
      description: `${freshProduct.name} (${quantity} ${currentUnitName}) siap dicatat.`,
      duration: 3000,
    });
  }, [isLoading, activeProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [suppRes, prodRes, unitRes] = await Promise.all([
        axiosClient.get("/suppliers"),
        axiosClient.get("/products"),
        axiosClient.get("/units")
      ]);
      setSuppliers(suppRes.data || []);
      // API /products mungkin mengembalikan { items: [...] } atau array langsung
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.items || []);
      setProducts(prodList);
      setUnits(unitRes.data || []);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast.error("Gagal Memuat Data", {
        description: "Tidak dapat mengambil data master dari server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchedProducts = useMemo(() => {
    if (!searchQuery) return [];
    return activeProducts.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [activeProducts, searchQuery]);

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  const handleAddItem = (product: any) => {
    setItems(prevItems => {
      const existing = prevItems.find(i => i.productId === product.id);
      if (existing) {
        return prevItems.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        // Find largest unit by conversion factor
        const prices = product.prices || [];
        const largestUnit = prices.length > 0 
          ? [...prices].sort((a, b) => b.conversionFactor - a.conversionFactor)[0]
          : null;
        
        const defaultUnitId = largestUnit?.unitId || activeUnits[0]?.id;
        const defaultCF = largestUnit?.conversionFactor || 1;
        
        return [...prevItems, {
          productId: product.id,
          name: product.name,
          unitId: defaultUnitId,
          quantity: 1,
          costPrice: Math.round(Number(product.averageCost) * defaultCF) || 0,
          sellingPrice: largestUnit ? Math.round(Number(largestUnit.price)) : (Math.round(Number(product.prices?.[0]?.price)) || 0),
          product: product // Keep product reference for unit selection
        }];
      }
    });
    setSearchQuery("");
    setIsSearching(false);
    toast.success("Barang Ditambahkan", {
      description: `${product.name} telah masuk ke daftar beli.`,
      duration: 2000,
    });
  };

  const handleUpdateItem = (index: number, fieldOrUpdates: string | Record<string, any>, value?: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      if (typeof fieldOrUpdates === 'string') {
        newItems[index] = { ...newItems[index], [fieldOrUpdates]: value };
      } else {
        newItems[index] = { ...newItems[index], ...fieldOrUpdates };
      }
      return newItems;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prevItems => {
      const item = prevItems[index];
      toast.info("Barang Dihapus", {
        description: `${item.name} dihapus dari daftar.`,
      });
      return prevItems.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Validasi Gagal", { description: "Pilih pemasok terlebih dahulu" });
    if (items.length === 0) return toast.error("Validasi Gagal", { description: "Tambahkan minimal 1 barang" });
    
    for (const item of items) {
      if (!item.unitId) return toast.error("Validasi Gagal", { description: `Pilih satuan untuk barang ${item.name}` });
      if (item.quantity <= 0) return toast.error("Validasi Gagal", { description: `Kuantitas barang ${item.name} harus lebih dari 0` });
      if (item.costPrice < 0) return toast.error("Validasi Gagal", { description: `Harga beli barang ${item.name} tidak valid` });
    }

    let finalPaymentStatus = paymentStatus;
    if (paymentMethod === "DEBT") {
      if (amountPaid > 0 && amountPaid < totalAmount) {
        finalPaymentStatus = "PARTIAL";
      } else if (amountPaid >= totalAmount) {
        finalPaymentStatus = "PAID";
      } else {
        finalPaymentStatus = "UNPAID";
      }
    } else {
      finalPaymentStatus = "PAID";
    }

     setIsSubmitting(true);
    const promise = axiosClient.post("/purchases", {
      supplierId,
      invoiceNumber,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      amountPaid: paymentMethod === "DEBT" ? amountPaid : totalAmount,
      totalAmount,
      items,
      transactionDate,
      dueDate: paymentMethod === "DEBT" ? dueDate : undefined
    });

    toast.promise(promise, {
      loading: 'Menyimpan transaksi...',
      success: (res: any) => {
        setSuccessData(res.data);
        return 'Pembelian berhasil disimpan!';
      },
      error: (err) => `Gagal: ${err.response?.data?.error || err.message}`,
    });

    try {
      await promise;
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="pt-8 lg:pt-8 p-4 lg:p-8 h-full flex flex-col space-y-8 overflow-y-auto lg:overflow-hidden bg-bg-main mobile-bottom-space custom-scrollbar">
        <div className="flex items-center space-x-4 flex-shrink-0">
          <button onClick={() => navigate(-1)} className="p-2 bg-bg-card rounded-xl hover:bg-border-subtle transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">Stok Masuk</h1>
            <p className="text-sm text-text-muted">Pencatatan pembelian barang dari pemasok</p>
          </div>
        </div>

      {/* Banner Quick Stock-in */}
      {quickStockInState && isQuickStockInBannerVisible && (
        <div className="flex-shrink-0 p-3 bg-status-success/10 border border-status-success/30 rounded-[32px] flex items-center gap-6">
          <div className="w-8 h-8 bg-status-success rounded-[24px] flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-status-success">Quick Stock-in Aktif</p>
            <p className="text-sm font-bold text-text-primary truncate">
              {quickStockInState.product?.name} — {quickStockInState.quantity} {targetUnitName} sudah ditambahkan
            </p>
          </div>
          <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-status-success/20 text-status-success rounded-lg">Periksa & Simpan</span>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 lg:overflow-hidden">
        {/* Left Form */}
        <div className="lg:w-1/3 flex flex-col space-y-8 lg:space-y-8 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
          <div className="bg-bg-card border border-border-default rounded-[32px] p-8 lg:p-8 space-y-8 lg:space-y-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-text-primary border-b border-border-subtle pb-3">Informasi Pembelian</h2>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted tracking-widest ml-1">No Faktur / Invoice *</label>
              <input 
                type="text" value={invoiceNumber} readOnly
                className="w-full px-4 py-3 bg-bg-subtle border border-border-default text-sm outline-none transition-all cursor-not-allowed opacity-70 text-text-muted rounded-lg h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted tracking-widest ml-1">Tanggal Transaksi *</label>
              <input 
                type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-3 bg-bg-main border border-border-default rounded-xl text-sm outline-none transition-all text-text-primary focus:ring-2 focus:ring-brand-primary relative"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted tracking-widest ml-1">Pemasok (Supplier) *</label>
              <SearchableSelect 
                options={activeSuppliers}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Pilih Pemasok"
                className={cn(!supplierId && "[&>button]:border-status-danger [&>button]:text-status-danger")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted tracking-widest ml-1">Metode Pembayaran</label>
              <select 
                value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 h-[44px] bg-bg-main border border-border-default rounded-xl text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-brand-primary [&>option]:bg-bg-main [&>option]:text-text-primary"
              >
                <option value="TRANSFER">Transfer Bank</option>
                <option value="CASH">Tunai (Cash)</option>
                <option value="DEBT">Tempo (Hutang)</option>
              </select>
            </div>

            {paymentMethod === "DEBT" && (
              <div className="space-y-8 p-4 bg-brand-primary/5 rounded-[32px] border border-brand-primary/20">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest ml-1">Bayar Dimuka (DP)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary font-bold text-xs">Rp</span>
                    <input 
                      type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="w-full pl-11 pr-4 py-3 bg-bg-main border border-brand-primary/30 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest ml-1">Tanggal Jatuh Tempo *</label>
                  <input 
                    type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-main border border-brand-primary/30 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand-primary outline-none transition-all relative"
                  />
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { label: "1 Bulan", days: 30 },
                      { label: "3 Bulan", days: 90 },
                      { label: "1 Tahun", days: 365 }
                    ].map(opt => {
                      const optDate = new Date();
                      optDate.setDate(optDate.getDate() + opt.days);
                      const dateStr = optDate.toISOString().split('T')[0];
                      const isActive = dueDate === dateStr;
                      return (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => setDueDate(dateStr)}
                          className={cn(
                            "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                            isActive 
                              ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm" 
                              : "bg-bg-main text-text-secondary border-border-default hover:bg-border-subtle"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-2">Sisa tagihan akan masuk ke Hutang Supplier.</p>
              </div>
            )}
          </div>
          
          <div className="hidden lg:block bg-bg-card border border-border-default rounded-[32px] p-8 sticky bottom-0">
             <div className="flex justify-between items-end mb-4">
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Tagihan</p>
                 <h3 className="text-3xl font-black text-brand-primary">
                    Rp {totalAmount.toLocaleString('id-ID')}
                 </h3>
               </div>
             </div>
             <button 
                onClick={handleSubmit} disabled={isSubmitting || items.length === 0 || !supplierId}
                className="w-full bg-brand-primary text-text-inverse font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 rounded-full px-7 py-[14px] text-[14px] font-bold"
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Transaksi</span>
              </button>
          </div>
        </div>

        {/* Right Section: Items */}
        <div className="lg:w-2/3 flex flex-col bg-bg-card border border-border-default rounded-[32px] lg:overflow-hidden min-h-0">
          <div className="p-4 lg:p-6 pb-2 lg:pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs lg:text-sm font-black uppercase tracking-widest text-text-primary">Daftar Barang</h2>
                </div>
                <span className="text-[10px] font-bold text-text-muted px-3 py-1 bg-bg-main border border-border-default rounded-full">{items.length} Item</span>
              </div>
             {/* Search Bar (Local to list) */}
             <div className="relative z-30">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
               <input 
                 type="text" placeholder="Ketik nama atau kode barang..." 
                 value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
                 onFocus={() => setIsSearching(true)}
                 className="w-full pl-12 pr-4 py-3.5 bg-bg-card border border-border-default rounded-2xl text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
               />
               
               {isSearching && searchQuery && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-default rounded-[32px] max-h-60 overflow-y-auto z-50">
                   {searchedProducts.length > 0 ? searchedProducts.map(p => (
                     <div key={p.id} onClick={() => handleAddItem(p)} className="p-3 border-b border-border-subtle hover:bg-bg-main cursor-pointer flex justify-between items-center group">
                       <div className="flex items-center gap-6">
                         <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                           <Package className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="font-bold text-sm text-text-primary group-hover:text-brand-primary transition-colors">{p.name}</p>
                           <p className="text-[10px] text-text-muted uppercase tracking-wider">Stok: {formatMultiUnitStock(p.stock, p.prices)}</p>
                         </div>
                       </div>
                       <Plus className="w-4 h-4 text-text-muted group-hover:text-brand-primary" />
                     </div>
                   )) : (
                     <div className="p-4 text-center text-sm text-text-muted">Barang tidak ditemukan</div>
                   )}
                 </div>
               )}
             </div>
          </div>
          <div className="flex-1 p-4 pt-0 lg:p-6 lg:pt-0 pb-20 lg:pb-6 lg:overflow-y-auto lg:custom-scrollbar relative">
             {items.length === 0 ? (
               <div className="min-h-[200px] lg:absolute lg:inset-0 flex flex-col items-center justify-center text-text-muted opacity-50">
                 <FileText className="w-12 h-12 mb-3" />
                 <p className="font-bold text-sm">Belum ada barang dipilih</p>
               </div>
             ) : (
               <>
                 {/* Mobile Card List */}
                 <div className="lg:hidden p-3 space-y-8">
                   {items.map((item, index) => (
                     <div key={index} className="bg-bg-card border border-border-default rounded-[32px] p-8 space-y-8">
                       <div className="flex justify-between items-start">
                         <div className="flex-1 mr-4">
                           <p className="font-black text-sm text-text-primary leading-tight">{item.name}</p>
                           <p className="text-[10px] text-text-muted font-bold uppercase mt-1 tracking-wider">Subtotal: Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}</p>
                         </div>
                         <button onClick={() => handleRemoveItem(index)} className="p-2 bg-status-danger/10 text-status-danger rounded-xl active:scale-90 transition-all">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1.5">
                           <label className="text-[9px] font-black uppercase text-text-muted tracking-widest ml-1">Kuantitas</label>
                           <input 
                             type="number" min="1" value={item.quantity} 
                             onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))} 
                             className="w-full px-3 py-2 bg-bg-main border border-border-default rounded-xl text-sm font-bold text-text-primary outline-none focus:ring-2 focus:ring-brand-primary" 
                           />
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-[9px] font-black uppercase text-text-muted tracking-widest ml-1">Satuan</label>
                           <select 
                             value={item.unitId} 
                             onChange={(e) => {
                               const unitId = e.target.value;
                               const pPrice = item.product?.prices?.find((p: any) => p.unitId === unitId);
                               const cf = pPrice?.conversionFactor || 1;
                               handleUpdateItem(index, {
                                 unitId,
                                 costPrice: Math.round(Number(item.product?.averageCost) * cf),
                                 sellingPrice: Math.round(Number(pPrice?.price || 0))
                               });
                             }}
                             className="w-full px-3 py-2 bg-bg-main border border-border-default rounded-xl text-sm font-bold text-text-primary outline-none focus:ring-2 focus:ring-brand-primary"
                           >
                             {item.product?.prices?.map((p: any) => (
                               <option key={p.unitId} value={p.unitId}>{p.unit?.name}</option>
                             ))}
                           </select>
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-[9px] font-black uppercase text-text-muted tracking-widest ml-1">Harga Beli</label>
                           <div className="relative">
                             <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-bold">Rp</span>
                             <input 
                               type="number" min="0" value={item.costPrice} 
                               onChange={(e) => handleUpdateItem(index, 'costPrice', Number(e.target.value))} 
                               className="w-full pl-10 pr-2 py-2 bg-bg-main border border-border-default rounded-xl text-sm font-bold text-text-primary outline-none focus:ring-2 focus:ring-brand-primary" 
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* Desktop Table */}
                 <table className="hidden lg:table w-full text-left border-collapse">
                    <thead className="bg-bg-main sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest">Barang</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest w-32 text-center">Qty</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest w-32">Satuan</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest w-44">Harga Beli</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest w-44">Harga Jual</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-widest w-40 text-right">Subtotal</th>
                        <th className="px-4 py-3 w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-bg-card/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-sm text-text-primary">{item.name}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" min="1" value={item.quantity} 
                              onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))} 
                              className="w-full px-3 py-2 bg-bg-main border border-border-default rounded-lg text-sm text-center text-text-primary outline-none focus:ring-2 focus:ring-brand-primary" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={item.unitId} 
                              onChange={(e) => {
                                const unitId = e.target.value;
                                const pPrice = item.product?.prices?.find((p: any) => p.unitId === unitId);
                                const cf = pPrice?.conversionFactor || 1;
                                handleUpdateItem(index, {
                                  unitId,
                                  costPrice: Math.round(Number(item.product?.averageCost) * cf),
                                  sellingPrice: Math.round(Number(pPrice?.price || 0))
                                });
                              }}
                              className="w-full px-3 py-2 bg-bg-main border border-border-default rounded-lg text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                              {item.product?.prices?.map((p: any) => (
                                <option key={p.unitId} value={p.unitId}>{p.unit?.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">Rp</span>
                              <input 
                                type="number" min="0" value={item.costPrice} 
                                onChange={(e) => handleUpdateItem(index, 'costPrice', Number(e.target.value))} 
                                className="w-full pl-10 pr-2 py-2 bg-bg-main border border-border-default rounded-lg text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand-primary" 
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">Rp</span>
                              <input 
                                type="number" min="0" value={item.sellingPrice} 
                                onChange={(e) => handleUpdateItem(index, 'sellingPrice', Number(e.target.value))} 
                                className="w-full pl-10 pr-2 py-2 bg-bg-main border border-border-default rounded-lg text-sm text-brand-primary outline-none focus:ring-2 focus:ring-brand-primary" 
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sm text-brand-primary">
                            {(item.quantity * item.costPrice).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleRemoveItem(index)} className="p-2 text-status-danger/70 hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </>
             )}
          </div>
        </div>
    </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-lg border-t border-border-default p-8 z-40 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Total Tagihan</p>
            <p className="text-lg font-black text-brand-primary">Rp {totalAmount.toLocaleString('id-ID')}</p>
          </div>
          <button 
            onClick={handleSubmit} disabled={isSubmitting || items.length === 0 || !supplierId}
            className="flex-1 bg-brand-primary text-text-inverse font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 rounded-full px-7 py-[14px] text-[14px] font-bold"
          >
            {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Click outside to close search */}
      {isSearching && (
        <div className="fixed inset-0 z-[19] bg-transparent" onClick={() => setIsSearching(false)}></div>
      )}
      
      {/* Bottom Spacer to prevent occlusion by double bottom bars on mobile (BottomNav + Sticky Simpan Bar) */}
      <div className="h-48 lg:hidden flex-shrink-0" />

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-modal w-full max-w-lg rounded-[2.5rem] overflow-hidden border border-border-default animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-text-primary mb-2">Stock In Berhasil!</h2>
              <p className="text-text-muted mb-8 uppercase text-[10px] font-bold tracking-widest">No. Faktur: {successData.invoiceNumber}</p>
              
              <div className="space-y-8">
                <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle text-left">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Item yang Baru Masuk:</p>
                    <button 
                      onClick={() => {
                        const items = successData.items?.map((item: any) => ({
                          productId: item.productId,
                          productName: item.product?.name,
                          productCode: item.product?.code,
                          batchId: item.stockBatch?.id,
                          price: Number(item.stockBatch?.sellingPrice || item.product?.prices?.[0]?.price),
                          category: item.product?.category?.name,
                          unit: item.unit?.name,
                          quantity: item.quantity
                        })) || [];
                        setQRManagerItems(items);
                        setIsQRManagerOpen(true);
                      }}
                      className="text-[9px] font-black text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      CETAK SEMUA
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-8">
                    {successData.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{item.product?.name || 'Produk'}</p>
                          <p className="text-[10px] text-brand-primary font-bold">{item.quantity} Unit • Batch: {item.stockBatch?.id?.slice(-8)?.toUpperCase() || '-'}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setQRManagerItems([{
                              productId: item.productId,
                              productName: item.product?.name,
                              productCode: item.product?.code,
                              batchId: item.stockBatch?.id,
                              price: Number(item.stockBatch?.sellingPrice || item.product?.prices?.[0]?.price),
                              category: item.product?.category?.name,
                              unit: item.unit?.name,
                              quantity: item.quantity
                            }]);
                            setIsQRManagerOpen(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg text-[10px] font-black transition-all"
                        >
                          <Printer className="w-3 h-3" />
                          CETAK
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => navigate("/inventory")}
                    className="py-4 bg-bg-main border border-border-default text-text-secondary rounded-2xl font-bold text-sm hover:bg-bg-card transition-all"
                  >
                    Kembali ke Stok
                  </button>
                  <button 
                    onClick={() => {
                      setItems([]);
                      setSuccessData(null);
                      setIsQuickStockInBannerVisible(false);
                      const date = new Date();
                      const timestamp = date.getTime().toString().slice(-6);
                      setInvoiceNumber(`INV-IN-${timestamp}`);
                      setTransactionDate(date.toISOString().split('T')[0]);
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setDueDate(d.toISOString().split('T')[0]);
                    }}
                    className="py-4 bg-brand-primary text-text-inverse rounded-2xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all"
                  >
                    Tambah Lagi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* QR Manager Modal */}
      <QRPrintManager 
        isOpen={isQRManagerOpen}
        onClose={() => {
          setIsQRManagerOpen(false);
          setQRManagerItems([]);
        }}
        initialItems={qrManagerItems}
      />
    </div>
    </phantom-ui>
  );
}
