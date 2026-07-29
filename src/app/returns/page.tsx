import React, { useState, useEffect, useMemo, useRef } from "react";
import { SummaryCard } from '@/components/SummaryCard';
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle,
  ChevronRight,
  Package,
  Trash2,
  Save,
  CheckCircle2,
  X,
  RefreshCcw,
  Banknote,
  CreditCard
} from "lucide-react";
import { cn } from "../../lib/utils";
import axiosClient from "../../lib/axiosClient";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "../../hooks/useDebounce";

interface ReturnItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  condition: string;
  product: {
    name: string;
    code: string;
  };
}

interface Return {
  id: string;
  returnNumber: string;
  saleId: string | null;
  customerId: string | null;
  reason: string | null;
  resolution: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
  } | null;
  sale: {
    invoiceNumber: string;
  } | null;
  items: ReturnItem[];
}

interface SaleItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
  product: {
    name: string;
    code: string;
  };
}

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  customer: {
    name: string;
  } | null;
  items: SaleItem[];
  debts: any[];
  returns?: any[];
}

export default function ReturnsPage() {
  const [rawReturns, setReturns] = useState<Return[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const placeholderReturns = useMemo<Return[]>(() => [
    {
      id: "r1",
      returnNumber: "RET-20260616-001",
      saleId: "s1",
      customerId: "c1",
      reason: "Barang rusak saat pengiriman",
      resolution: "REFUND",
      totalAmount: 144000,
      createdAt: "2026-06-16T09:30:00.000Z",
      customer: { name: "Budi Santoso" },
      sale: { invoiceNumber: "INV-001" },
      items: [
        { id: "ri1", productId: "p1", quantity: 2, price: 72000, condition: "BROKEN", product: { name: "Semen Portland 50kg Tiga Roda", code: "BRG-001" } }
      ]
    },
    {
      id: "r2",
      returnNumber: "RET-20260616-002",
      saleId: "s2",
      customerId: "c2",
      reason: "Ukuran besi beton tidak sesuai request",
      resolution: "DEDUCT_DEBT",
      totalAmount: 380000,
      createdAt: "2026-06-16T10:15:00.000Z",
      customer: { name: "Siti Rahma" },
      sale: { invoiceNumber: "INV-002" },
      items: [
        { id: "ri2", productId: "p2", quantity: 4, price: 95000, condition: "GOOD", product: { name: "Besi Beton 10mm SNI", code: "BRG-002" } }
      ]
    }
  ], []);

  const returns = isLoading ? placeholderReturns : rawReturns;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  
  // Create Return Form State
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const pointerDownTimeRef = useRef<number>(0);
  
  // Data for selection
  const [saleSearchQuery, setSaleSearchQuery] = useState("");
  const debouncedSaleSearch = useDebounce(saleSearchQuery, 500);
  const getDefaultStartDate = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  };
  const getDefaultEndDate = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA');
  };

  const [saleStartDate, setSaleStartDate] = useState(getDefaultStartDate());
  const [saleEndDate, setSaleEndDate] = useState(getDefaultEndDate());

  const { data: salesData, isLoading: isSalesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['sales', 'search', debouncedSaleSearch, saleStartDate, saleEndDate],
    queryFn: async () => {
      const response = await axiosClient.get("/sales", {
        params: { search: debouncedSaleSearch, startDate: saleStartDate, endDate: saleEndDate }
      });
      return Array.isArray(response.data) ? response.data : (response.data.items || []);
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const sales: Sale[] = salesData || [];

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get("/returns");
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.items || []);
      setReturns(items);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
      toast.error("Gagal memuat data retur");
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);



  const selectedSale = useMemo(() => sales.find(s => s.id === selectedSaleId), [sales, selectedSaleId]);

  const hasUnpaidDebt = useMemo(() => {
    if (!selectedSale) return false;
    return selectedSale.debts?.some(d => d.status !== "PAID");
  }, [selectedSale]);

  const resolution = hasUnpaidDebt ? "DEDUCT_DEBT" : "REFUND";

  // When sale changes, reset items
  useEffect(() => {
    if (selectedSale) {
      // Calculate already returned quantities
      const returnedQuantities: Record<string, number> = {};
      selectedSale.returns?.forEach((ret: any) => {
        ret.items.forEach((retItem: any) => {
          returnedQuantities[retItem.productId] = (returnedQuantities[retItem.productId] || 0) + retItem.quantity;
        });
      });

      const itemsWithRemaining = selectedSale.items.map(item => {
        const returnedQty = returnedQuantities[item.productId] || 0;
        const maxQuantity = Math.max(0, item.quantity - returnedQty);
        return {
          productId: item.productId,
          name: item.product.name,
          code: item.product.code,
          maxQuantity,
          qtyGood: 0,
          qtyDamaged: 0,
          price: Number(item.priceAtSale),
          selected: false
        };
      }).filter(item => item.maxQuantity > 0);

      setReturnItems(itemsWithRemaining);
    } else {
      setReturnItems([]);
    }
  }, [selectedSale]);

  const handleToggleItem = (productId: string) => {
    setReturnItems(items => items.map(item => {
      if (item.productId === productId) {
        const newSelected = !item.selected;
        return { 
          ...item, 
          selected: newSelected,
          qtyGood: newSelected ? 1 : 0,
          qtyDamaged: 0
        };
      }
      return item;
    }));
  };

  const handleUpdateQuantity = (productId: string, type: 'qtyGood' | 'qtyDamaged', quantity: number) => {
    setReturnItems(items => items.map(item => {
      if (item.productId === productId) {
        const otherQty = type === 'qtyGood' ? item.qtyDamaged : item.qtyGood;
        // Ensure total doesn't exceed maxQuantity
        const validQty = Math.min(Math.max(0, quantity), item.maxQuantity - otherQty);
        
        return { ...item, [type]: validQty };
      }
      return item;
    }));
  };

  const selectedReturnItems = returnItems.filter(item => item.selected && (item.qtyGood > 0 || item.qtyDamaged > 0));
  const totalReturnAmount = selectedReturnItems.reduce((sum, item) => sum + ((item.qtyGood + item.qtyDamaged) * item.price), 0);

  const handleCreateReturn = async () => {
    if (!selectedSaleId || selectedReturnItems.length === 0) {
      toast.warning("Pilih nota penjualan dan minimal satu barang untuk diretur.");
      return;
    }

    // Flatten items into individual records for GOOD and DAMAGED
    const itemsToSubmit: any[] = [];
    selectedReturnItems.forEach(item => {
      if (item.qtyGood > 0) {
        itemsToSubmit.push({
          productId: item.productId,
          quantity: item.qtyGood,
          price: item.price,
          condition: "GOOD"
        });
      }
      if (item.qtyDamaged > 0) {
        itemsToSubmit.push({
          productId: item.productId,
          quantity: item.qtyDamaged,
          price: item.price,
          condition: "DAMAGED"
        });
      }
    });

    const promise = axiosClient.post("/returns", {
      saleId: selectedSaleId,
      customerId: selectedSale?.customerId || null,
      reason,
      resolution,
      items: itemsToSubmit
    });

    toast.promise(promise, {
      loading: 'Mencatat retur...',
      success: () => {
        setIsCreateModalOpen(false);
        resetForm();
        fetchReturns();
        refetchSales();
        return "Retur berhasil dicatat dan stok telah diperbarui.";
      },
      error: (err) => {
        return "Gagal membuat retur: " + (err.response?.data?.error || err.message);
      },
    });
  };

  const resetForm = () => {
    setSelectedSaleId("");
    setReason("");
    setReturnItems([]);
    setSaleSearchQuery("");
    setSaleStartDate(getDefaultStartDate());
    setSaleEndDate(getDefaultEndDate());
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(ret => 
      ret.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [returns, searchQuery]);

  const totalItems = filteredReturns.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedReturns = useMemo(() => {
    return filteredReturns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredReturns, currentPage, itemsPerPage]);

  // Filter sales to only show those that have items left to return
  const availableSales = useMemo(() => {
    return sales.filter(sale => {
      const returnedQuantities: Record<string, number> = {};
      sale.returns?.forEach((ret: any) => {
        ret.items.forEach((retItem: any) => {
          returnedQuantities[retItem.productId] = (returnedQuantities[retItem.productId] || 0) + retItem.quantity;
        });
      });

      const hasItemsLeft = sale.items.some(item => {
        const returnedQty = returnedQuantities[item.productId] || 0;
        return (item.quantity - returnedQty) > 0;
      });

      return hasItemsLeft;
    });
  }, [sales]);

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="px-4 lg:px-8 pb-4 lg:pb-8 h-full overflow-y-auto flex flex-col transition-colors duration-300 bg-bg-main mobile-bottom-space custom-scrollbar relative">
      {/* Metric Cards (Blok Atas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:gap-6 flex-shrink-0 transition-all duration-300 pt-4 lg:pt-8 mb-4 lg:mb-8">
        <SummaryCard 
          title="Nilai Retur" 
          value={`Rp ${returns.reduce((sum, ret) => sum + Number(ret.totalAmount), 0).toLocaleString("id-ID")}`} 
          icon={<FileText className="w-6 h-6" />}
          color="orange"
          className="col-span-2 sm:col-span-1"
          isLoading={isLoading}
        />
        <SummaryCard 
          title="Total Retur" 
          value={`${returns.length} Transaksi`} 
          icon={<RotateCcw className="w-6 h-6" />}
          color="blue"
          className="col-span-1"
          isLoading={isLoading}
        />
        <SummaryCard 
          title="Barang Kembali" 
          value={`${returns.reduce((sum, ret) => sum + ret.items.reduce((iSum, item) => iSum + item.quantity, 0), 0).toLocaleString()} Unit`} 
          icon={<Package className="w-6 h-6" />}
          color="green"
          className="col-span-1"
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Card (Action Bar & Table) */}
      <div className="rounded-[32px] lg:rounded-[32px] border flex flex-col bg-bg-card border-border-default">
        {/* Action Bar */}
        <div className="p-8 lg:p-8 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0 flex-shrink-0 border-border-subtle sticky top-0 z-20 bg-bg-card rounded-t-[32px] lg:rounded-t-[32px]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6 flex-1 w-full lg:w-auto">
            <div className="relative flex-1 lg:max-w-md w-full flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
              <input 
                type="text"
                placeholder="Cari nomor retur, pelanggan, atau alasan..."
                className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-end space-x-3 w-auto">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Catat Retur Baru</span>
            </button>
          </div>
        </div>

        {/* Returns Table (Desktop) & Card List (Mobile) */}
        <div className="">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full text-left border-collapse">
              <thead data-shimmer-ignore>
                <tr className="bg-bg-main border-b border-border-subtle sticky top-[72px] lg:top-[88px] z-10">
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Nomor Retur</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Nota Asal</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Penyelesaian</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(!isLoading && paginatedReturns.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center">
                      <EmptyState 
                        icon={RotateCcw}
                        title="Belum Ada Data Retur"
                        description="Semua transaksi pengembalian barang dari pelanggan akan muncul di sini. Mulai catat retur baru untuk mengelola stok kembali."
                        action={{
                          label: "Catat Retur Baru",
                          onClick: () => setIsCreateModalOpen(true),
                          icon: Plus
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedReturns.map((ret) => (
                    <tr key={ret.id} onClick={() => setSelectedReturn(ret)} className="hover:bg-bg-main/30 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center mr-3">
                            <FileText className="w-4 h-4 text-brand-primary" />
                          </div>
                          <span className="text-sm font-bold text-text-primary">{ret.returnNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs text-text-secondary">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                          {new Date(ret.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-text-secondary font-mono">{ret.sale?.invoiceNumber || "-"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-text-primary font-medium">
                          <User className="w-3.5 h-3.5 mr-1.5 text-text-muted" />
                          {ret.customer?.name || "Umum"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ret.resolution === "DEDUCT_DEBT" ? (
                          <span className="px-2.5 py-1 bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-full text-[10px] font-black uppercase">
                            Potong Piutang
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-status-success/10 text-status-success border border-status-success/20 rounded-full text-[10px] font-black uppercase">
                            Kembali Tunai
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-text-primary">
                          Rp {Number(ret.totalAmount).toLocaleString("id-ID")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block lg:hidden">
            {(!isLoading && paginatedReturns.length === 0) ? (
              <div className="p-8">
                <EmptyState 
                  icon={RotateCcw}
                  title="Data Retur Kosong"
                  description="Belum ada transaksi retur yang tercatat dalam sistem saat ini."
                  action={{
                    label: "Catat Retur",
                    onClick: () => setIsCreateModalOpen(true),
                    icon: Plus
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 p-4">
                {paginatedReturns.map((ret) => (
                  <div 
                    key={ret.id} 
                    onClick={() => setSelectedReturn(ret)} 
                    className="bg-bg-card rounded-2xl p-3.5 border border-border-default shadow-sm hover:border-brand-primary/50 active:scale-[0.98] transition-all cursor-pointer space-y-8"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-[24px] bg-brand-light/50 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-text-primary truncate">{ret.customer?.name || "Umum"}</h4>
                          <p className="text-[10px] font-bold text-text-muted font-mono mt-0.5">{ret.sale?.invoiceNumber || "-"}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {ret.resolution === "DEDUCT_DEBT" ? (
                          <span className="px-2 py-1 bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-lg text-[8px] font-black uppercase tracking-wider">
                            Potong Piutang
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg text-[8px] font-black uppercase tracking-wider">
                            Kembali Tunai
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-text-primary uppercase tracking-tight">{ret.returnNumber}</span>
                        <div className="flex items-center text-[9px] text-text-muted font-bold mt-0.5">
                          <Calendar className="w-3 h-3 mr-1 opacity-50" />
                          {new Date(ret.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Nilai Retur</p>
                        <p className="text-sm font-black text-brand-primary">
                          Rp {Number(ret.totalAmount).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="p-8 lg:p-8 border-t border-border-subtle bg-bg-card flex-shrink-0 rounded-b-[32px] lg:rounded-b-[32px]">
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
                  className="px-3 py-1.5 border rounded-xl text-[10px] font-bold bg-bg-card border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
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
                  className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-main"
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
                          "w-8 h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center",
                          currentPage === pNum 
                            ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                            : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main"
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
                  className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-main"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB for Mobile */}
      <button 
        onClick={() => setIsCreateModalOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-primary/30 z-40 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

        {/* Create Return Modal - Bottom Sheet (Mobile) / 2-Column Desktop View */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
            <div className="bg-bg-card w-full md:max-w-6xl rounded-t-3xl md:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in md:fade-in duration-300 flex flex-col max-h-[90vh] md:max-h-[92vh]">
              
              {/* Unified Brand Header (Desktop & Mobile) */}
              <div className="bg-brand-primary flex-shrink-0">
                {/* Mobile Drag Handle */}
                <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>
                <div className="p-4 md:p-6 flex items-center justify-between text-text-inverse">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-[24px]">
                      <RotateCcw className="w-5 h-5 md:w-6 h-6" />
                    </div>
                    <h3 className="text-lg md:text-xl font-black">Cetak Retur Baru</h3>
                  </div>
                  <button 
                    onClick={() => setIsCreateModalOpen(false)} 
                    className="p-2 text-text-inverse/60 hover:text-text-inverse transition-all min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body - 2 Column Layout on Desktop */}
              <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row custom-scrollbar">
                
                {/* LEFT COLUMN: Input & Selection (3/5 Width) */}
                <div className="md:w-3/5 p-4 md:p-8 md:border-r border-border-default space-y-8 md:overflow-y-auto md:custom-scrollbar">
                  {/* Section 1: Pencarian Nota */}
                    <div className="space-y-8">
                      <div className="flex items-center space-x-2">
                         <Search className="w-4 h-4 text-brand-primary" />
                         <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">Pencarian Nota</h4>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Periode Transaksi</label>
                        <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10 w-fit">
                          <div className="relative flex items-center h-full">
                            <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                            <input 
                              type="date"
                              value={saleStartDate}
                              onChange={(e) => setSaleStartDate(e.target.value)}
                              className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                            />
                          </div>
                          <span className="text-text-muted font-bold">-</span>
                          <div className="relative flex items-center h-full">
                            <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                            <input 
                              type="date"
                              value={saleEndDate}
                              onChange={(e) => setSaleEndDate(e.target.value)}
                              className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Pilih Nota Penjualan <span className="text-status-danger">*</span></label>
                            <span className="px-2 py-0.5 bg-brand-light/30 text-brand-primary border border-brand-primary/20 rounded-lg text-[10px] font-black">
                              {availableSales.length} Nota Ditemukan
                            </span>
                          </div>
                          <SearchableSelect
                            options={availableSales.map(s => ({
                              id: s.id,
                              name: `${s.invoiceNumber} • ${s.customer?.name || "Umum"} • Rp ${Number(s.totalAmount).toLocaleString("id-ID")}`
                            }))}
                            value={selectedSaleId}
                            onChange={(val) => setSelectedSaleId(val)}
                            onSearchChange={setSaleSearchQuery}
                            isLoading={isSalesLoading}
                            placeholder={`Pilih Nota...`}
                          />
                        </div>
                      </div>
                    </div>

                  {/* Section 2: Pilih Barang */}
                  <div className="space-y-8">
                    <div className="flex items-center space-x-2">
                       <Package className="w-4 h-4 text-brand-primary" />
                       <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">Pilih Barang Diretur</h4>
                    </div>
                    
                    {!selectedSale ? (
                      <div className="py-12 flex flex-col items-center justify-center text-text-muted opacity-50 bg-bg-main/50 rounded-[32px] border-2 border-border-default border-dashed">
                        <FileText className="w-12 h-12 mb-4" />
                        <p className="font-bold text-sm">Pilih nota penjualan terlebih dahulu</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {returnItems.map((item) => (
                          <div 
                            key={item.productId} 
                            className={cn(
                              "p-4 rounded-2xl border transition-all cursor-pointer group",
                              item.selected ? "bg-brand-light/30 border-brand-primary/30" : "bg-bg-card border-border-default hover:border-brand-primary/50 shadow-sm"
                            )}
                            onPointerDown={() => {
                              pointerDownTimeRef.current = Date.now();
                            }}
                            onClick={() => {
                              if (Date.now() - pointerDownTimeRef.current < 400) {
                                handleToggleItem(item.productId);
                              }
                            }}
                          >
                            <div className="flex items-start gap-6">
                              <div className="pt-1 flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 -mt-2">
                                <input 
                                  type="checkbox" 
                                  checked={item.selected}
                                  readOnly
                                  className="w-5 h-5 rounded border-border-default text-brand-primary focus:ring-brand-primary pointer-events-none"
                                />
                              </div>
                              <div className="flex-1 space-y-4">
                                  <div>
                                    <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">{item.name}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Maksimal: {item.maxQuantity} | Harga: Rp {item.price.toLocaleString("id-ID")}</p>
                                  </div>
                                
                                {item.selected && (
                                  <div 
                                    className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onPointerUp={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-status-success uppercase tracking-wider">Kondisi Bagus</label>
                                      <input 
                                        type="number"
                                        min="0"
                                        max={item.maxQuantity - item.qtyDamaged}
                                        className="w-full h-11 px-3 bg-bg-main border border-border-default text-sm font-bold rounded-lg h-[44px]"
                                        value={item.qtyGood}
                                        onChange={(e) => handleUpdateQuantity(item.productId, 'qtyGood', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-status-danger uppercase tracking-wider">Kondisi Rusak</label>
                                      <input 
                                        type="number"
                                        min="0"
                                        max={item.maxQuantity - item.qtyGood}
                                        className="w-full h-11 px-3 bg-bg-main border border-border-default text-sm font-bold rounded-lg h-[44px]"
                                        value={item.qtyDamaged}
                                        onChange={(e) => handleUpdateQuantity(item.productId, 'qtyDamaged', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Summary (2/5 Width) */}
                <div className="md:w-2/5 p-4 md:p-8 bg-bg-main flex flex-col md:overflow-y-auto md:custom-scrollbar">
                  <div className="flex-1 space-y-8">
                    {/* Ringkasan & Alasan */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">Ringkasan Retur</h4>
                        <div className="p-6 bg-bg-card rounded-3xl border border-border-default space-y-4">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-text-secondary">Barang Terpilih</span>
                              <span className="font-black text-text-primary">{selectedReturnItems.length} Item</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-text-secondary">Total Quantity</span>
                              <span className="font-black text-text-primary">
                                {selectedReturnItems.reduce((sum, i) => sum + i.qtyGood + i.qtyDamaged, 0)} Pcs
                              </span>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">Alasan Retur</label>
                        <textarea 
                          placeholder="Berikan alasan pengembalian barang..."
                          rows={3}
                          className="w-full px-4 py-3 bg-bg-card border border-border-default rounded-2xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none shadow-sm"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Resolusi Keuangan */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">Resolusi Keuangan</h4>
                      {hasUnpaidDebt ? (
                        <div className="p-5 bg-status-warning/5 border border-status-warning/20 rounded-2xl flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-status-warning/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-status-warning" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-status-warning">Potong Piutang</p>
                            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                              Nota memiliki piutang aktif. Nilai retur akan otomatis memotong sisa hutang pelanggan.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 bg-status-success/5 border border-status-success/20 rounded-2xl flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-status-success/10 flex items-center justify-center flex-shrink-0">
                            <Banknote className="w-5 h-5 text-status-success" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-status-success">Kembalikan Tunai</p>
                            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                              Nota sudah lunas. Nilai retur harus dikembalikan tunai/transfer ke pelanggan.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="mt-8 pt-8 border-t border-border-default">
                    <div className="flex flex-col mb-6">
                       <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Total Nilai Retur</span>
                       <span className="text-3xl font-black text-brand-primary">Rp {totalReturnAmount.toLocaleString()}</span>
                    </div>

                    <button 
                      onClick={handleCreateReturn}
                      disabled={!selectedSaleId || selectedReturnItems.length === 0}
                      className="w-full h-12 flex items-center justify-center bg-brand-primary text-text-inverse font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider rounded-full px-7 py-[14px] text-[14px] font-bold"
                    >
                      <Save className="mr-2 w-5 h-5" />
                      PROSES RETUR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Detail Modal - Bottom Sheet (Mobile) / Center Modal (Desktop) */}
        {selectedReturn && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
            <div className="bg-bg-modal w-full lg:max-w-3xl rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh]">
              {/* Drag Handle for Mobile */}
              <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
                <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
              </div>
              {/* Unified Header */}
              <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary text-text-inverse flex-shrink-0">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-1.5 lg:p-2 bg-white/20 rounded-[24px]">
                    <RotateCcw className="w-5 h-5 lg:w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-black">{selectedReturn.returnNumber}</h3>
                    <p className="text-[10px] lg:text-sm opacity-80 font-medium">Detail Retur Barang</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReturn(null)} className="p-2 text-text-inverse/60 hover:text-text-inverse transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                  <X className="w-6 h-6" />
                </button>
              </div>


              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 lg:space-y-8 custom-scrollbar bg-bg-main">
                {/* Info Layout: Stacked vertically on mobile, grid on desktop */}
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-6">
                  <div className="p-8 lg:p-8 bg-bg-card rounded-xl lg:rounded-[32px] border border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tanggal Retur</p>
                    <p className="text-sm font-bold text-text-primary">
                      {new Date(selectedReturn.createdAt).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-8 lg:p-8 bg-bg-card rounded-xl lg:rounded-[32px] border border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nota Asal</p>
                    <p className="text-sm font-bold text-text-primary">{selectedReturn.sale?.invoiceNumber || "-"}</p>
                  </div>
                  <div className="p-8 lg:p-8 bg-bg-card rounded-xl lg:rounded-[32px] border border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Pelanggan</p>
                    <p className="text-sm font-bold text-text-primary">{selectedReturn.customer?.name || "Umum"}</p>
                  </div>
                  <div className="p-8 lg:p-8 bg-bg-card rounded-xl lg:rounded-[32px] border border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Penyelesaian</p>
                    <p className="text-sm font-bold text-text-primary">
                      {selectedReturn.resolution === "DEDUCT_DEBT" ? "Potong Piutang" : "Kembali Tunai"}
                    </p>
                  </div>
                </div>

                {selectedReturn.reason && (
                  <div className="p-8 lg:p-8 bg-bg-card rounded-xl lg:rounded-[32px] border border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Alasan Retur</p>
                    <p className="text-sm text-text-secondary">{selectedReturn.reason}</p>
                  </div>
                )}

                <div className="space-y-8">
                  <h4 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">Daftar Barang</h4>
                  
                  {/* Desktop Table */}
                  <div className="hidden lg:block bg-bg-card rounded-[32px] border border-border-subtle overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-main border-b border-border-subtle">
                          <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Barang</th>
                          <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Kondisi</th>
                          <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Qty</th>
                          <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Harga</th>
                          <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {selectedReturn.items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.product?.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                item.condition === "GOOD" ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger"
                              )}>
                                {item.condition === "GOOD" ? "Bagus" : "Rusak"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-text-secondary">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right text-text-secondary">Rp {Number(item.price).toLocaleString("id-ID")}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-text-primary">Rp {(item.quantity * Number(item.price)).toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="block lg:hidden space-y-8">
                    {selectedReturn.items?.map((item: any) => (
                      <div key={item.id} className="p-8 bg-bg-card rounded-[24px] border border-border-subtle space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-text-primary">{item.product?.name}</p>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                            item.condition === "GOOD" ? "bg-status-success/10 text-status-success border border-status-success/20" : "bg-status-danger/10 text-status-danger border border-status-danger/20"
                          )}>
                            {item.condition === "GOOD" ? "Bagus" : "Rusak"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-text-secondary">
                          <span>{item.quantity} x Rp {Number(item.price).toLocaleString("id-ID")}</span>
                          <span className="font-bold text-text-primary">Rp {(item.quantity * Number(item.price)).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prominent Total */}
                  <div className="mt-4 p-4 bg-brand-light/30 border border-brand-primary/20 rounded-[24px] flex justify-between items-center">
                    <span className="text-xs font-black text-brand-primary uppercase tracking-wider">Total Retur</span>
                    <span className="text-xl font-black text-brand-primary">Rp {Number(selectedReturn.totalAmount).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 lg:p-6 bg-bg-main border-t border-border-subtle flex-shrink-0">
                <button 
                  onClick={() => setSelectedReturn(null)}
                  className="w-full min-h-[44px] py-3 bg-bg-card border border-border-default text-text-primary rounded-xl font-bold text-sm hover:bg-bg-main transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </phantom-ui>
  );
}
