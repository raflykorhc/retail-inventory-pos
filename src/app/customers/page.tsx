import React, { useState, useEffect, useMemo } from "react";
import { SummaryCard } from '@/components/SummaryCard';
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  History, 
  TrendingUp, 
  ShoppingBag,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  CreditCard,
  AlertCircle,
  FileText,
  Gift,
  Star
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { Can } from "../../components/auth/Can";
import { EmptyState } from "../../components/ui/EmptyState";
import { Virtuoso } from "react-virtuoso";
import { useCustomerHistory } from "../../hooks/queries/useCustomerHistory";

export default function CustomersPage() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const placeholderCustomers = useMemo(() => [
    { id: "1", name: "Nama Pelanggan 1", phone: "08123456789", email: "pelanggan1@example.com", totalSpent: 5000000, totalUnpaidDebts: 1000000, currentDebt: 500000, address: "Alamat Pelanggan 1", tier: "BRONZE" },
    { id: "2", name: "Nama Pelanggan 2", phone: "08123456789", email: "pelanggan2@example.com", totalSpent: 12000000, totalUnpaidDebts: 0, currentDebt: 0, address: "Alamat Pelanggan 2", tier: "GOLD" },
    { id: "3", name: "Nama Pelanggan 3", phone: "08123456789", email: "pelanggan3@example.com", totalSpent: 3500000, totalUnpaidDebts: 2000000, currentDebt: 1500000, address: "Alamat Pelanggan 3", tier: "BRONZE" },
    { id: "4", name: "Nama Pelanggan 4", phone: "08123456789", email: "pelanggan4@example.com", totalSpent: 8000000, totalUnpaidDebts: 0, currentDebt: 0, address: "Alamat Pelanggan 4", tier: "SILVER" },
    { id: "5", name: "Nama Pelanggan 5", phone: "08123456789", email: "pelanggan5@example.com", totalSpent: 1500000, totalUnpaidDebts: 500000, currentDebt: 0, address: "Alamat Pelanggan 5", tier: "BRONZE" },
    { id: "6", name: "Nama Pelanggan 6", phone: "08123456789", email: "pelanggan6@example.com", totalSpent: 9500000, totalUnpaidDebts: 0, currentDebt: 0, address: "Alamat Pelanggan 6", tier: "SILVER" }
  ], []);
  const activeCustomers = isLoading ? placeholderCustomers : customers;
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"transactions" | "debts" | "notes">("transactions");
  
  const {
    data: historyData,
    isLoading: isLoadingTransactions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useCustomerHistory(isDetailModalOpen && selectedCustomer ? selectedCustomer.id : undefined, 10);
  
  const customerTransactions = useMemo(() => {
    return historyData?.pages.flatMap(page => page.items) || [];
  }, [historyData]);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const [filterContractor, setFilterContractor] = useState<string>("ALL");
  const [filterDebt, setFilterDebt] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    isContractor: false,
    creditLimit: "",
    notes: ""
  });

  const [editCustomer, setEditCustomer] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    isContractor: false,
    creditLimit: "",
    notes: ""
  });

  useEffect(() => {
    fetchCustomers();
    
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);



  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Gagal Memuat Data", {
        description: "Tidak dapat mengambil data pelanggan dari server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(activeCustomers)) return [];
    const query = searchQuery.toLowerCase();
    
    let result = activeCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(query) || 
                            c.phone?.toLowerCase().includes(query) ||
                            (c.email && c.email.toLowerCase().includes(query));
      
      const matchesContractor = filterContractor === "ALL" 
        ? true 
        : filterContractor === "CONTRACTOR" ? c.isContractor : !c.isContractor;
        
      const matchesDebt = filterDebt === "ALL"
        ? true
        : filterDebt === "UNPAID" ? (c.totalDebt > 0) : (c.totalDebt === 0);

      return matchesSearch && matchesContractor && matchesDebt;
    });
    
    if (sortBy === "HIGHEST_SPENDING") {
      result.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === "HIGHEST_DEBT") {
      result.sort((a, b) => b.totalDebt - a.totalDebt);
    }
    
    return result;
  }, [searchQuery, activeCustomers, filterContractor, filterDebt, sortBy]);

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterContractor, filterDebt, sortBy]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const promise = fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer)
    });

    toast.promise(promise, {
      loading: 'Menyimpan data pelanggan...',
      success: () => {
        setIsAddModalOpen(false);
        setNewCustomer({ name: "", phone: "", email: "", address: "", isContractor: false, creditLimit: "", notes: "" });
        fetchCustomers();
        return 'Pelanggan berhasil ditambahkan!';
      },
      error: 'Gagal menambahkan pelanggan.',
    });
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const promise = fetch(`/api/customers/${editCustomer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editCustomer)
    });

    toast.promise(promise, {
      loading: 'Memperbarui data...',
      success: async (res) => {
        setIsEditModalOpen(false);
        fetchCustomers();
        if (selectedCustomer?.id === editCustomer.id) {
          const updated = await res.json();
          setSelectedCustomer({...selectedCustomer, ...updated});
        }
        return 'Profil pelanggan berhasil diperbarui!';
      },
      error: 'Gagal memperbarui profil pelanggan.',
    });
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedDebt) return;

    const promise = fetch(`/api/customers/${selectedCustomer.id}/debts/${selectedDebt.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaid: Number(paymentAmount), method: paymentMethod })
    });

    toast.promise(promise, {
      loading: 'Memproses pembayaran piutang...',
      success: async (res) => {
        setIsPayModalOpen(false);
        setPaymentAmount("");
        fetchCustomers();
        // Refresh selected customer data
        const updatedRes = await fetch("/api/customers");
        const updatedData = await updatedRes.json();
        const updatedCustomer = updatedData.find((c: any) => c.id === selectedCustomer.id);
        if (updatedCustomer) setSelectedCustomer(updatedCustomer);
        return 'Pembayaran piutang berhasil dicatat!';
      },
      error: 'Gagal memproses pembayaran piutang.',
    });
  };



  const handleDeleteCustomer = async (id: string) => {
    setCustomerToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    
    const promise = fetch(`/api/customers/${customerToDelete}`, {
      method: "DELETE"
    });

    toast.promise(promise, {
      loading: 'Menghapus data pelanggan...',
      success: () => {
        setIsDetailModalOpen(false);
        setIsDeleteConfirmOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
        return 'Pelanggan berhasil dihapus.';
      },
      error: 'Gagal menghapus pelanggan.',
    });
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="flex-1 flex flex-col bg-bg-main overflow-y-auto custom-scrollbar relative pb-24 lg:pb-8">
      {/* Header Dashboard */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-8 space-y-8">

        {/* Stats Cards (Carousel on Mobile) */}
        <div className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide snap-x snap-mandatory">
          <div className="min-w-[240px] flex-1 lg:min-w-0 snap-center">
            <SummaryCard 
              title="Total Pelanggan" 
              value={activeCustomers.length} 
              icon={<Users className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="blue"
              isLoading={isLoading}
            />
          </div>
          <div className="min-w-[240px] flex-1 lg:min-w-0 snap-center">
            <SummaryCard 
              title="Total Omset Pelanggan" 
              value={<span className="tabular-nums">{formatCurrency(activeCustomers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0))}</span>} 
              icon={<TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="green"
              isLoading={isLoading}
            />
          </div>
          <div className="min-w-[240px] flex-1 lg:min-w-0 snap-center">
            <SummaryCard 
              title="Total Piutang Pelanggan" 
              value={<span className="tabular-nums">{formatCurrency(activeCustomers.reduce((sum, c) => sum + (Number(c.totalDebt) || 0), 0))}</span>} 
              icon={<CreditCard className="w-5 h-5 lg:w-6 lg:h-6" />}
              color="red"
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 lg:px-6 py-6 flex flex-col">
        <div className="rounded-[32px] lg:rounded-[2.5rem] border flex flex-col bg-bg-card border-border-default transition-all duration-300 transform-gpu overflow-visible">
          
          {/* Sticky Action Bar */}
          <div className="sticky top-0 z-30 bg-bg-card p-8 lg:p-8 border-b border-border-subtle rounded-t-2xl lg:rounded-t-[2.5rem]">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full flex items-center group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                <input 
                  type="text" 
                  placeholder="Cari nama, telepon, atau email..." 
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex w-full lg:w-auto items-center gap-2 overflow-x-auto scrollbar-hide">
                <select 
                  value={filterContractor} 
                  onChange={(e) => setFilterContractor(e.target.value)}
                  className="rounded-xl border h-[44px] text-sm font-bold focus:ring-2 focus:ring-brand-primary bg-bg-main [&>option]:bg-bg-main [&>option]:text-text-primary border-border-default px-4 cursor-pointer min-w-[150px]"
                >
                  <option value="ALL">Semua Tipe</option>
                  <option value="CONTRACTOR">Kontraktor</option>
                  <option value="NON_CONTRACTOR">Non-Kontraktor</option>
                </select>
                
                <select 
                  value={filterDebt} 
                  onChange={(e) => setFilterDebt(e.target.value)}
                  className="rounded-xl border h-[44px] text-sm font-bold focus:ring-2 focus:ring-brand-primary bg-bg-main [&>option]:bg-bg-main [&>option]:text-text-primary border-border-default px-4 cursor-pointer min-w-[170px]"
                >
                  <option value="ALL">Semua Piutang</option>
                  <option value="UNPAID">Belum Lunas</option>
                  <option value="PAID">Lunas</option>
                </select>
                
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border h-[44px] text-sm font-bold focus:ring-2 focus:ring-brand-primary bg-bg-main [&>option]:bg-bg-main [&>option]:text-text-primary border-border-default px-4 cursor-pointer min-w-[170px]"
                >
                  <option value="NEWEST">Terbaru</option>
                  <option value="HIGHEST_SPENDING">Belanja Terbanyak</option>
                  <option value="HIGHEST_DEBT">Piutang Terbanyak</option>
                </select>
              </div>
              
              <div className="hidden lg:flex items-center">
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 bg-brand-primary text-text-inverse rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 h-[44px] whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pelanggan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer List Section */}
          <div className="w-full p-4 lg:p-8 flex flex-col">
            {filteredCustomers.length === 0 && !isLoading ? (
              <div className="py-4">
                <EmptyState 
                  icon={Users}
                  title={searchQuery || filterContractor !== "ALL" || filterDebt !== "ALL" ? "Pencarian Tidak Ditemukan" : "Belum Ada Pelanggan"}
                  description={searchQuery || filterContractor !== "ALL" || filterDebt !== "ALL"
                    ? "Tidak ada pelanggan yang sesuai dengan filter atau kata kunci pencarian Anda." 
                    : "Mulai kelola bisnis Anda dengan menambahkan pelanggan pertama Anda di sini."}
                  action={searchQuery || filterContractor !== "ALL" || filterDebt !== "ALL" ? {
                    label: "Reset Pencarian",
                    onClick: () => { 
                      setSearchQuery(""); 
                      setFilterContractor("ALL");
                      setFilterDebt("ALL");
                      setSortBy("NEWEST");
                    },
                    icon: History
                  } : {
                    label: "Tambah Pelanggan",
                    onClick: () => setIsAddModalOpen(true),
                    icon: UserPlus
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCustomers.map((customer) => (
                  <div 
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsDetailModalOpen(true);
                    }}
                    className="bg-bg-card rounded-3xl border border-border-default shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group cursor-pointer relative flex flex-col border-border-subtle"
                  >
                    <div className="absolute top-3 right-3 z-10 lg:top-4 lg:right-4">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                          }}
                          className={cn(
                            "p-1.5 lg:p-2 rounded-xl transition-all shadow-sm border",
                            openMenuId === customer.id 
                              ? "bg-brand-primary text-text-inverse border-brand-primary" 
                              : "text-text-muted hover:text-text-primary bg-bg-main/80 backdrop-blur-sm border-border-default lg:opacity-70 lg:group-hover:opacity-100"
                          )}
                        >
                          <MoreVertical className="w-4 h-4 lg:w-5 lg:h-5" />
                        </button>
                        {openMenuId === customer.id && (
                          <div 
                            className="absolute right-0 mt-2 w-44 bg-bg-modal border border-border-default rounded-[32px] py-2 z-20 animate-in fade-in zoom-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditCustomer({
                                  id: customer.id,
                                  name: customer.name,
                                  phone: customer.phone || "",
                                  email: customer.email || "",
                                  address: customer.address || "",
                                  isContractor: customer.isContractor || false,
                                  creditLimit: customer.creditLimit?.toString() || "",
                                  notes: customer.notes || ""
                                });
                                setIsEditModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-text-secondary hover:bg-bg-main hover:text-brand-primary flex items-center space-x-3"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit Profil</span>
                            </button>
                            <Can role={["ADMIN", "MANAGER"]}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomer(customer.id);
                                  setOpenMenuId(null);
                                }}
                                disabled={customer.name.toLowerCase() === "umum"}
                                className={cn(
                                  "w-full px-4 py-2.5 text-left text-xs font-bold flex items-center space-x-3 border-t border-border-subtle transition-all",
                                  customer.name.toLowerCase() === "umum" 
                                    ? "opacity-20 cursor-not-allowed text-text-muted" 
                                    : "text-status-danger hover:bg-status-danger/10"
                                )}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Hapus Pelanggan</span>
                              </button>
                            </Can>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 lg:p-6 flex flex-col flex-1">
                      <div className="flex items-center lg:items-start space-x-4 lg:space-x-5">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-[32px] bg-brand-light flex items-center justify-center text-brand-primary font-black text-xl lg:text-2xl shadow-inner flex-shrink-0 group-hover:scale-105 lg:group-hover:scale-110 transition-transform">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5 lg:gap-2 mb-1 lg:mb-2 pr-8">
                            <h3 className="text-sm lg:text-lg font-black text-text-primary truncate leading-tight">{customer.name}</h3>
                          </div>
                          <div className="flex flex-col lg:space-y-1.5">
                            <div className="flex items-center text-[10px] lg:text-xs text-text-muted font-bold">
                              <Phone className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1.5 lg:mr-2 opacity-50" />
                              <span className="truncate">{customer.phone}</span>
                            </div>
                            <div className="hidden lg:flex items-center text-xs text-text-muted font-bold">
                              <Mail className="w-3.5 h-3.5 mr-2 opacity-50" />
                              <span className="truncate">{customer.email || "Tanpa Email"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 lg:px-6 lg:py-5 bg-bg-main border-t border-border-subtle flex items-center justify-between mt-auto">
                      <div className="grid grid-cols-2 gap-6 lg:gap-8 flex-1">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5 lg:mb-1">Belanja</span>
                          <span className="text-xs lg:text-sm font-black text-brand-primary tabular-nums truncate">{formatCurrency(customer.totalSpent || 0)}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5 lg:mb-1">Hutang</span>
                          <span className={cn(
                            "text-xs lg:text-sm font-black tabular-nums truncate",
                            customer.totalDebt > 0 ? "text-status-danger" : "text-text-primary"
                          )}>{formatCurrency(customer.totalDebt || 0)}</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex p-2.5 bg-bg-card border border-border-default rounded-[32px] text-text-muted group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all flex-shrink-0 ml-4">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalItems > itemsPerPage && (
              <div className="mt-10 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-6">
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
                    className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                  >
                    <option value={15}>15 per hal</option>
                    <option value={50}>50 per hal</option>
                    <option value={100}>100 per hal</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex px-1 space-x-1.5">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pNum = i + 1;
                      if (totalPages > 3 && currentPage > 2) pNum = Math.min(currentPage - 1 + i, totalPages - 2 + i);
                      return (
                        <button
                          key={pNum}
                          onClick={() => setCurrentPage(pNum)}
                          className={cn(
                            "w-9 h-9 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center",
                            currentPage === pNum 
                              ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                              : "bg-bg-main text-text-secondary border border-border-default hover:bg-bg-card"
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
                    className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB for Mobile */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-brand-primary text-text-inverse rounded-full shadow-2xl shadow-brand-primary/40 flex items-center justify-center hover:bg-brand-hover hover:scale-110 active:scale-95 transition-all z-40 border-2 border-bg-main"
      >
        <UserPlus className="w-6 h-6" />
      </button>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-lg rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 max-h-[90vh] flex flex-col">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-brand-primary flex items-center justify-between flex-shrink-0 border-b border-border-subtle">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-text-inverse/10 rounded-[24px] flex items-center justify-center text-text-inverse">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Tambah Pelanggan Baru</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-8 space-y-8 lg:space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                    placeholder="Contoh: Budi Santoso"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nomor Telepon</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg"
                      placeholder="0812xxxx"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Email (Opsional)</label>
                    <input 
                      type="email" 
                      className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg"
                      placeholder="budi@example.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Alamat</label>
                  <textarea 
                    className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all min-h-[80px]"
                    placeholder="Alamat lengkap pelanggan..."
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Catatan Khusus (CRM)</label>
                  <textarea 
                    className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all min-h-[80px]"
                    placeholder="Catatan preferensi, kesepakatan, dll..."
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  />
                </div>
                <div className="p-4 lg:p-5 bg-bg-main border border-border-default rounded-[32px] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-light rounded-[24px] flex items-center justify-center text-brand-primary flex-shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">Status Kontraktor</p>
                        <p className="text-[10px] text-text-muted font-medium leading-tight">Kontraktor memiliki akses fitur piutang</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-end">
                      <input 
                        type="checkbox" 
                        className="sr-only peer rounded-lg"
                        checked={newCustomer.isContractor}
                        onChange={(e) => setNewCustomer({...newCustomer, isContractor: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-border-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:right-[22px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary transition-all"></div>
                    </label>
                  </div>
                  {newCustomer.isContractor && (
                    <div className="pt-4 border-t border-border-subtle animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Limit Piutang (Rp)</label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                        <input 
                          type="number" 
                          className="w-full pl-11 p-3.5 bg-bg-card border border-border-default text-sm font-black focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                          placeholder="0"
                          value={newCustomer.creditLimit}
                          onChange={(e) => setNewCustomer({...newCustomer, creditLimit: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="submit"
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
                  >
                    <span>Simpan Pelanggan</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-2xl rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-5 lg:p-8 bg-brand-primary flex items-center justify-between flex-shrink-0 border-b border-border-subtle">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-[32px] bg-text-inverse/10 flex items-center justify-center text-text-inverse font-black text-2xl lg:text-3xl">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg lg:text-2xl font-black text-text-inverse leading-tight">{selectedCustomer.name}</h3>
                  <div className="flex items-center space-x-2.5 mt-1.5">
                    {selectedCustomer.isContractor && (
                      <span className="px-2.5 py-0.5 bg-status-info/40 text-text-inverse text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        KONTRAKTOR
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-6 h-6 lg:w-7 lg:h-7" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-bg-card">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-3 gap-3 lg:gap-4 p-4 lg:p-6 bg-bg-main/30 border-b border-border-subtle">
                <div className="p-4 lg:p-5 bg-bg-card rounded-2xl lg:rounded-[24px] border border-border-subtle flex flex-col justify-center min-w-0">
                  <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 truncate">Transaksi</p>
                  <p className="text-sm lg:text-lg font-black text-text-primary tabular-nums truncate leading-tight">{selectedCustomer.transactionCount || 0}</p>
                </div>
                <div className="p-4 lg:p-5 bg-bg-card rounded-2xl lg:rounded-[24px] border border-border-subtle flex flex-col justify-center min-w-0">
                  <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 truncate">Belanja</p>
                  <p className="text-sm lg:text-lg font-black text-brand-primary tabular-nums truncate leading-tight">{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                </div>
                <div className="p-4 lg:p-5 bg-bg-card rounded-2xl lg:rounded-[24px] border border-border-subtle flex flex-col justify-center min-w-0">
                  <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 truncate">Hutang</p>
                  <p className={cn(
                    "text-sm lg:text-lg font-black tabular-nums truncate leading-tight",
                    selectedCustomer.totalDebt > 0 ? "text-status-danger" : "text-text-primary"
                  )}>{formatCurrency(selectedCustomer.totalDebt || 0)}</p>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-border-subtle px-8 lg:px-8 bg-bg-card sticky top-0 z-10 backdrop-blur-sm bg-bg-card/90">
                {[
                  { id: "transactions", label: "Transaksi" },
                  { id: "debts", label: "Piutang", hasDot: selectedCustomer.totalDebt > 0 },
                  { id: "notes", label: "Catatan & CRM" }
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 px-2 lg:px-6 py-4 text-[10px] lg:text-xs font-black uppercase tracking-wider transition-all relative flex items-center justify-center space-x-2",
                      activeTab === tab.id ? "text-brand-primary" : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.hasDot && <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-status-danger rounded-full animate-pulse" />}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 lg:w-1/3 h-1 bg-brand-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--brand-primary-rgb),0.4)]" />}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 lg:p-8 bg-bg-main/20">
                {activeTab === "transactions" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Riwayat Transaksi</h4>
                      <span className="text-[10px] font-bold text-text-muted px-2 py-0.5 bg-bg-card rounded-lg border border-border-subtle">{selectedCustomer.sales?.length || 0} Total</span>
                    </div>
                    {isLoadingTransactions ? (
                      <div className="py-20 flex flex-col items-center justify-center space-y-8">
                        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Memuat Transaksi...</p>
                      </div>
                    ) : customerTransactions.length > 0 ? (
                      <div className="space-y-4 h-[400px]">
                        <Virtuoso
                          style={{ height: '100%' }}
                          totalCount={customerTransactions.length}
                          itemContent={(index) => {
                            const sale = customerTransactions[index];
                            return (
                              <div className="pb-4">
                                <div key={sale.id} onClick={() => setSelectedTransactionDetail(sale)} className="flex items-center justify-between p-4 lg:p-5 bg-bg-card border border-border-default rounded-2xl lg:rounded-[2rem] group hover:border-brand-primary/30 transition-all cursor-pointer">
                                  <div className="flex items-center space-x-3 lg:space-x-4">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-bg-main rounded-xl lg:rounded-2xl flex items-center justify-center text-text-muted border border-border-subtle group-hover:bg-brand-light group-hover:text-brand-primary transition-colors">
                                      <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6" />
                                    </div>
                                    <div>
                                      <p className="text-xs lg:text-sm font-black text-text-primary">{sale.invoiceNumber}</p>
                                      <p className="text-[9px] lg:text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
                                        {new Date(sale.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-text-primary">{formatCurrency(Number(sale.totalAmount))}</p>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 inline-block border",
                                      sale.paymentStatus === "LUNAS" 
                                        ? "bg-status-success/10 text-status-success border-status-success/20" 
                                        : "bg-status-warning/10 text-status-warning border-status-warning/20"
                                    )}>
                                      {sale.paymentStatus}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                          endReached={() => {
                            if (hasNextPage && !isFetchingNextPage) {
                              fetchNextPage();
                            }
                          }}
                          components={{
                            Footer: () => isFetchingNextPage ? (
                              <div className="py-4 text-center">
                                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                              </div>
                            ) : null
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-dashed border-border-default rounded-[2.5rem] shadow-inner overflow-hidden">
                        <EmptyState 
                          icon={ShoppingBag}
                          title="Belum Ada Transaksi"
                          description="Pelanggan ini belum melakukan transaksi apapun di toko Anda."
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "debts" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Daftar Piutang Aktif</h4>
                      <span className="text-[10px] font-black text-status-danger px-2 py-0.5 bg-status-danger/10 rounded-lg border border-status-danger/20">{formatCurrency(selectedCustomer.totalDebt)} Total</span>
                    </div>
                    
                    {selectedCustomer.debts && selectedCustomer.debts.filter((d: any) => d.status === "UNPAID").length > 0 ? (
                      <div className="space-y-8">
                        {selectedCustomer.debts.filter((d: any) => d.status === "UNPAID").map((debt: any) => {
                          const isOverdue = new Date(debt.dueDate) < new Date();
                          const isNearDue = !isOverdue && new Date(debt.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                          
                          return (
                            <div key={debt.id} className={cn(
                              "p-3.5 lg:p-5 border-2 rounded-2xl lg:rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 lg:gap-6 transition-all shadow-sm",
                              isOverdue ? "bg-status-danger/5 border-status-danger/20" : 
                              isNearDue ? "bg-status-warning/5 border-status-warning/20" : "bg-bg-card border-border-default"
                            )}>
                              <div className="flex items-center space-x-3 lg:space-x-4">
                                <div className={cn(
                                  "w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-inner",
                                  isOverdue ? "bg-status-danger/20 text-status-danger" : 
                                  isNearDue ? "bg-status-warning/20 text-status-warning" : "bg-bg-main text-text-secondary"
                                )}>
                                  <CreditCard className="w-5 h-5 lg:w-6 lg:h-6" />
                                </div>
                                <div>
                                  <p className="text-xs lg:text-sm font-black text-text-primary">{debt.sale?.invoiceNumber || "Tanpa Invoice"}</p>
                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <p className="text-[9px] lg:text-[10px] text-text-muted font-bold">Tempo: {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("id-ID") : "-"}</p>
                                    {isOverdue && <span className="text-[7px] lg:text-[8px] font-black text-status-danger bg-status-danger/10 px-1.5 py-0.5 rounded uppercase animate-pulse">Terlambat</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6 lg:gap-6 border-t sm:border-t-0 pt-3 lg:pt-0 border-border-subtle/50">
                                <div className="text-right">
                                  <p className="text-sm lg:text-base font-black text-status-danger">{formatCurrency(debt.remainingBalance)}</p>
                                  <p className="text-[9px] lg:text-[10px] text-text-muted font-bold opacity-70">Sisa dari {formatCurrency(debt.amountDue)}</p>
                                </div>
                                <button 
                                  onClick={() => window.location.href = `/debts?payDebtId=${debt.id}`}
                                  className="px-4 py-2 lg:px-6 lg:py-2.5 bg-brand-primary text-text-inverse rounded-xl font-black text-[10px] lg:text-xs hover:bg-brand-hover transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
                                >
                                  Bayar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-dashed border-border-default rounded-[2.5rem] shadow-inner overflow-hidden">
                        <EmptyState 
                          icon={CreditCard}
                          title="Tidak Ada Piutang"
                          description="Pelanggan ini tidak memiliki piutang atau hutang aktif saat ini."
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "notes" && (
                  <div className="space-y-8">
                    <div className="p-8 lg:p-8 bg-bg-card border border-border-default rounded-[2.5rem]">
                      <div className="flex items-center space-x-3 mb-5">
                        <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary">
                          <FileText className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Catatan CRM</h4>
                      </div>
                      {selectedCustomer.notes ? (
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-medium">{selectedCustomer.notes}</p>
                      ) : (
                        <EmptyState 
                          icon={FileText}
                          title="Tanpa Catatan"
                          description="Belum ada catatan khusus atau riwayat CRM untuk pelanggan ini."
                          className="py-4"
                        />
                      )}
                    </div>


                  </div>
                )}
              </div>
            </div>

            <div className="p-8 lg:p-8 bg-bg-card border-t border-border-subtle flex flex-col sm:flex-row gap-6 flex-shrink-0">
              <button 
                onClick={() => {
                  setEditCustomer({
                    id: selectedCustomer.id,
                    name: selectedCustomer.name,
                    phone: selectedCustomer.phone || "",
                    email: selectedCustomer.email || "",
                    address: selectedCustomer.address || "",
                    isContractor: selectedCustomer.isContractor || false,
                    creditLimit: selectedCustomer.creditLimit?.toString() || "",
                    notes: selectedCustomer.notes || ""
                  });
                  setIsEditModalOpen(true);
                }}
                className="flex-1 py-4 bg-bg-main border border-border-default rounded-2xl text-text-secondary font-black text-sm flex items-center justify-center space-x-3 hover:bg-bg-card hover:border-brand-primary/30 transition-all active:scale-95"
              >
                <Edit2 className="w-4.5 h-4.5" />
                <span>Edit Profil</span>
              </button>
              <Can role={["ADMIN"]}>
                <button 
                  onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                  disabled={selectedCustomer.name.toLowerCase() === "umum"}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-sm",
                    selectedCustomer.name.toLowerCase() === "umum"
                      ? "bg-bg-main text-text-muted opacity-30 cursor-not-allowed"
                      : "bg-status-danger/10 text-status-danger hover:bg-status-danger hover:text-text-inverse"
                  )}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                  <span>Hapus Pelanggan</span>
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}

      {/* Standardized Edit/Payment/Delete/Redeem Modals with standard logic... */}
      {/* (All other modals follow the same high-end design pattern) */}
      
      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-lg rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out max-h-[90vh] flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-brand-primary flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-text-inverse/10 rounded-[24px] flex items-center justify-center text-text-inverse">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Edit Profil Pelanggan</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditCustomer} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-8 space-y-8 lg:space-y-8">
                {/* Form fields identical to Add Modal but with editCustomer state */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    readOnly={editCustomer.name.toLowerCase() === "umum"}
                    className={cn(
                      "w-full p-3.5 lg:p-4 bg-bg-main border border-border-default rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all",
                      editCustomer.name.toLowerCase() === "umum" && "bg-bg-main/50 cursor-not-allowed text-text-muted opacity-60"
                    )}
                    value={editCustomer.name}
                    onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nomor Telepon</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg"
                      value={editCustomer.phone}
                      onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Email (Opsional)</label>
                    <input 
                      type="email" 
                      className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg"
                      value={editCustomer.email}
                      onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Alamat</label>
                  <textarea 
                    className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all min-h-[80px]"
                    value={editCustomer.address}
                    onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Catatan Khusus (CRM)</label>
                  <textarea 
                    className="w-full p-3.5 lg:p-4 bg-bg-main border border-border-default rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all min-h-[80px]"
                    value={editCustomer.notes}
                    onChange={(e) => setEditCustomer({...editCustomer, notes: e.target.value})}
                  />
                </div>
                <div className="p-4 lg:p-5 bg-bg-main border border-border-default rounded-[32px] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-light rounded-[24px] flex items-center justify-center text-brand-primary flex-shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">Status Kontraktor</p>
                        <p className="text-[10px] text-text-muted font-medium leading-tight">Kontraktor memiliki akses fitur piutang</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-end">
                      <input 
                        type="checkbox" 
                        className="sr-only peer rounded-lg"
                        checked={editCustomer.isContractor}
                        disabled={editCustomer.name.toLowerCase() === "umum"}
                        onChange={(e) => setEditCustomer({...editCustomer, isContractor: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-border-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:right-[22px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary transition-all"></div>
                    </label>
                  </div>
                  {editCustomer.isContractor && (
                    <div className="pt-4 border-t border-border-subtle animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Limit Piutang (Rp)</label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                        <input 
                          type="number" 
                          className="w-full pl-11 p-3.5 bg-bg-card border border-border-default text-sm font-black focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                          value={editCustomer.creditLimit}
                          onChange={(e) => setEditCustomer({...editCustomer, creditLimit: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="submit"
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
                  >
                    <span>Simpan Perubahan</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Payment Modal */}
      {isPayModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-md rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh]">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-brand-primary flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-text-inverse/10 rounded-[24px] flex items-center justify-center text-text-inverse">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Bayar Piutang</h3>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handlePayDebt} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-8 space-y-8">
                <div className="p-5 bg-bg-main rounded-[2rem] border-2 border-border-default shadow-inner">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Nomor Invoice</p>
                  <p className="text-base font-black text-text-primary">{selectedDebt.sale?.invoiceNumber || "Tanpa Invoice"}</p>
                  <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sisa Piutang</p>
                      <p className="text-lg font-black text-status-danger">{formatCurrency(selectedDebt.remainingBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Jatuh Tempo</p>
                      <p className="text-xs font-black text-text-primary">{selectedDebt.dueDate ? new Date(selectedDebt.dueDate).toLocaleDateString("id-ID") : "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Jumlah Pembayaran (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg font-black">Rp</span>
                    <input 
                      type="number" 
                      required
                      max={selectedDebt.remainingBalance}
                      className="w-full pl-12 p-4 bg-bg-main border border-border-default text-xl font-black focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-6">
                    {["CASH", "TRANSFER"].map((m) => (
                      <button 
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={cn(
                          "p-4 rounded-2xl text-xs font-black border-2 transition-all active:scale-95",
                          paymentMethod === m 
                            ? "bg-brand-primary text-text-inverse border-brand-primary shadow-lg shadow-brand-primary/20" 
                            : "bg-bg-main text-text-muted border-border-default hover:border-brand-primary/30"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="submit"
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-status-success text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-status-success/20 hover:bg-status-success/90 flex items-center justify-center space-x-2"
                  >
                    <span>Konfirmasi Pembayaran</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-status-danger flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Pelanggan?</h2>
              <button onClick={() => { setIsDeleteConfirmOpen(false); setCustomerToDelete(null); }} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Tindakan ini akan menghapus profil pelanggan secara permanen. Data transaksi akan tetap disimpan di sistem namun tidak lagi terhubung dengan profil ini.
              </p>
            </div>
            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50">
              <button 
                onClick={confirmDelete}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-status-danger text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-status-danger/20 hover:bg-status-danger/80 flex items-center justify-center space-x-2"
              >
                <span>Ya, Hapus</span>
              </button>
              <button 
                onClick={() => { setIsDeleteConfirmOpen(false); setCustomerToDelete(null); }}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransactionDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full max-w-2xl rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] shadow-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Transaksi</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-0.5">{selectedTransactionDetail.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedTransactionDetail(null)} className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 lg:mr-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Informasi Pelanggan</h4>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-sm font-bold text-text-primary">{selectedCustomer?.name || "Umum"}</p>
                  <p className="text-[10px] font-medium text-text-muted mt-1">{new Date(selectedTransactionDetail.createdAt).toLocaleString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daftar Barang</h4>
                <div className="flex flex-col space-y-3">
                  {selectedTransactionDetail.items?.map((item: any, idx: number) => {
                    const sellingPrice = Number(item.priceAtSale) * item.quantity;
                    const costPrice = item.batchAllocations?.length > 0
                      ? item.batchAllocations.reduce((acc: number, b: any) => acc + (Number(b.costPrice) * b.quantity), 0)
                      : Number(item.product?.averageCost || 0) * item.quantity;
                    const profit = sellingPrice - costPrice;

                    return (
                      <div key={idx} className="bg-bg-main p-3.5 rounded-xl border border-border-subtle flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="pr-2">
                            <p className="font-bold text-text-primary text-sm">{item.product?.name || "Barang"}</p>
                          </div>
                          <p className="font-black text-text-primary text-sm whitespace-nowrap">{formatCurrency(sellingPrice)}</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-medium pt-2 border-t border-border-subtle">
                          <span className="text-text-muted">{item.quantity} {item.unit?.name || ""} x {formatCurrency(Number(item.priceAtSale))}</span>
                          <span className="text-status-success font-bold">+ {formatCurrency(profit)} Laba</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex justify-between items-center">
                <p className="text-xs font-bold text-text-muted">Total Pembayaran</p>
                <p className="text-lg font-black text-brand-primary">{formatCurrency(selectedTransactionDetail.totalAmount)}</p>
              </div>
              <div className="pt-3 flex justify-between items-center">
                <p className="text-xs font-bold text-text-muted">Laba Kotor (Keuntungan)</p>
                <p className="text-sm font-black text-status-success">
                  {formatCurrency(
                    selectedTransactionDetail.items?.reduce((sum: number, item: any) => {
                      const sellingPrice = Number(item.priceAtSale) * item.quantity;
                      const costPrice = item.batchAllocations?.length > 0
                        ? item.batchAllocations.reduce((acc: number, b: any) => acc + (Number(b.costPrice) * b.quantity), 0)
                        : Number(item.product?.averageCost || 0) * item.quantity;
                      return sum + (sellingPrice - costPrice);
                    }, 0) || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
    </phantom-ui>
  );
}
