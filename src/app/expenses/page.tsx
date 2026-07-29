import React, { useState, useEffect, useMemo } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useExpenses, useExpenseSummary } from "../../hooks/queries/useExpenses";
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from "../../hooks/queries/useExpenseCategories";
import { SummaryCard } from '@/components/SummaryCard';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from "sonner";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  X,
  Edit2,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  List,
  FileSpreadsheet,
  TrendingDown,
  Layers,
  Settings
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { cn, formatCurrency } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Can } from "../../components/auth/Can";

const getLocalDateString = (date: Date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

export default function ExpensesPage() {
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    date: getLocalDateString(new Date()),
    receiptPath: null as string | null
  });
  const [isCompressing, setIsCompressing] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [categoryId, setCategoryId] = useState("ALL");
  const [dateRange, setDateRange] = useState({
    start: getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getLocalDateString(new Date())
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { theme } = useTheme();

  // Category Hook
  const { data: categoriesData, isLoading: isLoadingCategories } = useExpenseCategories();
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);

  // Data Fetching
  const { 
    data: summaryData, 
    isLoading: isLoadingSummary,
    refetch: refetchSummary
  } = useExpenseSummary({
    startDate: dateRange.start,
    endDate: dateRange.end,
    search: debouncedSearchQuery,
    categoryId: categoryId
  });

  const {
    data: expensesData,
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses
  } = useExpenses({
    startDate: dateRange.start,
    endDate: dateRange.end,
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchQuery,
    categoryId: categoryId
  });

  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [
      { id: "ALL", name: "Semua Kategori" },
      { id: "PEMBELIAN_BARANG", name: "Pembelian Barang (Sistem)" }
    ];
    if (categoriesData) {
      return [...baseOptions, ...categoriesData];
    }
    return baseOptions;
  }, [categoriesData]);

  const isLoading = isLoadingSummary || isLoadingExpenses;

  // Derived Data
  const totalExpense = summaryData?.totalExpense || 0;
  const totalTransactions = summaryData?.totalTransactions || 0;
  const withReceiptCount = summaryData?.withReceiptCount || 0;
  
  const largestCategory = summaryData?.categoryData && summaryData.categoryData.length > 0
    ? summaryData.categoryData[0].name
    : "-";

  const totalItems = expensesData?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedExpenses = expensesData?.items || [];

  // Reset page on search, limit, or category change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, itemsPerPage, categoryId]);

  const fetchExpenses = () => {
    refetchSummary();
    refetchExpenses();
  };

  // Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, receiptPath: reader.result as string }));
        setIsCompressing(false);
        toast.success("Gambar Berhasil Diproses", { duration: 2000 });
      };
    } catch (error) {
      console.error("Compression Error:", error);
      toast.error("Gagal Memproses Gambar");
      setIsCompressing(false);
    }
  };

  const handleOpenModal = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        categoryId: expense.categoryId || "",
        amount: expense.amount.toString(),
        description: expense.description || "",
        date: getLocalDateString(new Date(expense.date)),
        receiptPath: expense.receiptPath
      });
    } else {
      setEditingExpense(null);
      setFormData({
        categoryId: "",
        amount: "",
        description: "",
        date: getLocalDateString(new Date()),
        receiptPath: null
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PUT" : "POST";
    
    const promise = fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    toast.promise(promise, {
      loading: 'Menyimpan data pengeluaran...',
      success: () => {
        fetchExpenses();
        setIsModalOpen(false);
        return editingExpense ? 'Data berhasil diperbarui!' : 'Pengeluaran baru berhasil dicatat!';
      },
      error: async (err) => {
        return 'Gagal menyimpan data.';
      },
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const newCat = await createCategory.mutateAsync({ name: newCategoryName.trim() });
      toast.success("Kategori berhasil ditambahkan");
      setNewCategoryName("");
      // Jangan tutup modal kelola
      // setIsManageCategoriesModalOpen(false);
      setFormData(prev => ({ ...prev, categoryId: newCat.id }));
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan kategori");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id, name: editCategoryName.trim() });
      toast.success("Kategori berhasil diperbarui");
      setEditingCategoryId(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui kategori");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm) return;
    try {
      await deleteCategory.mutateAsync(deleteCategoryConfirm);
      toast.success("Kategori berhasil dihapus");
      setDeleteCategoryConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Gagal menghapus kategori");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const promise = fetch(`/api/expenses/${deleteConfirm}`, { method: "DELETE" });

    toast.promise(promise, {
      loading: 'Menghapus data...',
      success: () => {
        fetchExpenses();
        setDeleteConfirm(null);
        return 'Data berhasil dihapus.';
      },
      error: 'Gagal menghapus data.',
    });
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Karena kita menggunakan pagination, untuk export kita mungkin perlu fetch semua data dalam range tanggal
      const res = await fetch(`/api/expenses?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      const data = await res.json();
      const itemsToExport = Array.isArray(data) ? data : (data.items || []);

      const exportData = itemsToExport.map((e: any) => ({
        'Tanggal': new Date(e.date).toLocaleDateString('id-ID'),
        'Kategori': e.category,
        'Deskripsi': e.description || '-',
        'Nominal': Number(e.amount),
        'Ada Nota': e.receiptPath ? 'Ya' : 'Tidak'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pengeluaran");
      XLSX.writeFile(workbook, `Laporan_Pengeluaran_${dateRange.start}_sd_${dateRange.end}.xlsx`);
      toast.success("Export Berhasil", { description: "Laporan Excel telah diunduh." });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export Gagal", { description: "Gagal mengekspor data ke Excel." });
    }
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="px-4 pb-4 lg:px-8 lg:pb-8 h-full overflow-y-auto custom-scrollbar flex flex-col space-y-8 lg:space-y-8 transition-colors duration-300 bg-bg-main pb-24 lg:pb-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 lg:gap-6 flex-shrink-0 transition-all duration-300 pt-4 lg:pt-8">
        <SummaryCard 
          title="Total Pengeluaran" 
          value={formatCurrency(totalExpense)} 
          icon={<TrendingDown className="w-5 h-5 lg:w-6 lg:h-6" />}
          color="red"
          className="shadow-sm border-border-default"
          isLoading={isLoading}
        />
        <SummaryCard 
          title="Kategori Terbesar" 
          value={largestCategory} 
          icon={<Layers className="w-5 h-5 lg:w-6 lg:h-6" />}
          color="blue"
          className="shadow-sm border-border-default hover:shadow-sm hover:translate-y-0"
          isLoading={isLoading}
        />
        <SummaryCard 
          title="Kelengkapan Nota" 
          value={withReceiptCount === totalTransactions && totalTransactions > 0 ? "Semua Terlampir" : `${withReceiptCount}/${totalTransactions} Terlampir`} 
          icon={withReceiptCount === totalTransactions && totalTransactions > 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          color={withReceiptCount === totalTransactions && totalTransactions > 0 ? "green" : "orange"}
          className="shadow-sm border-border-default hover:shadow-sm hover:translate-y-0"
          isLoading={isLoading}
        />
      </div>

      {/* Expense List Container */}
      <div className="rounded-[32px] lg:rounded-[32px] border flex flex-col bg-bg-card border-border-default transition-all duration-300 transform-gpu overflow-visible">
        <div className="sticky top-0 z-20 p-8 lg:p-8 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-6 flex-shrink-0 border-border-subtle bg-bg-card rounded-t-[32px] lg:rounded-t-[32px]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6 flex-1 w-full lg:w-auto">
            {/* Search Bar & Export (Combined on Mobile) */}
            <div className="flex items-center gap-2 w-full lg:max-w-md">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Cari pengeluaran / kategori / deskripsi..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                />
              </div>

              {/* Mobile Export Button (Icon only) */}
              <button 
                onClick={handleExportExcel}
                className="lg:hidden w-11 h-11 border flex items-center justify-center transition-all bg-bg-main border-border-default text-text-secondary hover:text-brand-primary active:scale-95 rounded-full px-6 py-[12px] text-[14px] font-bold"
                title="Export Excel"
              >
                <FileSpreadsheet className="w-5 h-5 text-brand-primary/70" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="w-full lg:w-[280px] flex-shrink-0 z-30">
              <SearchableSelect
                options={categoryFilterOptions}
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                placeholder="Semua Kategori"
              />
            </div>
            
            {/* Date Range Filter (Compact on Mobile) */}
            <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10 w-full lg:w-auto overflow-x-auto scrollbar-hide">
              <div className="relative flex items-center h-full">
                <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                />
              </div>
              <span className="text-text-muted font-bold">-</span>
              <div className="relative flex items-center h-full">
                <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                />
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-end gap-6 w-auto">
            {/* Excel Button Desktop */}
            <button 
              onClick={handleExportExcel}
              className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
              title="Ekspor ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            {/* Catat Pengeluaran Baru Button Desktop */}
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Catat Pengeluaran</span>
            </button>
          </div>
        </div>

        <div className="custom-scrollbar">
          {/* Desktop Table */}
          <table className="hidden lg:table w-full text-left border-collapse min-w-[800px]">
            <thead data-shimmer-ignore>
              <tr className="sticky top-[125px] lg:top-[109px] z-10 bg-bg-main shadow-sm">
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Deskripsi</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Nominal</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y transition-colors divide-border-subtle relative">
              {isLoading && paginatedExpenses.length > 0 && (
                <tr>
                  <td colSpan={6} className="p-0 border-0 h-0">
                    <div className="absolute inset-0 bg-bg-card/40 backdrop-blur-[1px] z-10 flex items-start justify-center pt-10 transition-all duration-300">
                      <div className="px-4 py-2 bg-brand-primary text-text-inverse rounded-full flex items-center space-x-2 shadow-sm">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Memperbarui...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <EmptyState 
                      isLoading={isLoading}
                      icon={Receipt}
                      title={searchQuery ? "Data Tidak Ditemukan" : "Belum Ada Pengeluaran"}
                      description={searchQuery ? `Tidak ada pengeluaran yang cocok dengan pencarian "${searchQuery}".` : "Semua catatan pengeluaran operasional akan muncul di sini. Mulai catat pengeluaran baru untuk melihat ringkasan keuangan."}
                      action={!searchQuery ? {
                        label: "Catat Pengeluaran",
                        onClick: () => handleOpenModal(),
                        icon: Plus
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-bg-main/50">
                    <td className="px-6 py-4 text-sm font-medium text-text-muted">
                      <span className="block w-fit">
                        {new Date(expense.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase bg-brand-light text-brand-primary">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary font-medium">
                      <span className="block w-fit max-w-[250px] truncate">{expense.description || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-text-primary text-sm">
                      <span className="block w-fit ml-auto">{formatCurrency(Number(expense.amount))}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {expense.receiptPath ? (
                        <button 
                          onClick={() => setReceiptPreview(expense.receiptPath)}
                          className="p-2 rounded-lg transition-all bg-status-success/10 text-status-success hover:bg-status-success/20 mx-auto block"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-text-muted/30 block"><ImageIcon className="w-4 h-4 mx-auto" /></span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!expense.isSystemGenerated ? (
                          <>
                            <button 
                              onClick={() => handleOpenModal(expense)}
                              className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light"
                              title="Edit Pengeluaran"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <Can role={["ADMIN", "MANAGER"]}>
                              <button 
                                onClick={() => setDeleteConfirm(expense.id)}
                                className="p-2 rounded-lg transition-all text-text-muted hover:text-status-danger hover:bg-status-danger/10"
                                title="Hapus Pengeluaran"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Can>
                          </>
                        ) : (
                          <span className="text-xs text-text-muted/60 font-semibold italic select-none px-2.5 py-1 bg-bg-main border border-border-subtle rounded-lg">
                            Sistem (Pembelian)
                          </span>
                        )}
                      </div>
                    </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          {/* Mobile Card List */}
          <div className="lg:hidden flex flex-col divide-y divide-border-subtle relative">
            {paginatedExpenses.length === 0 ? (
              <div className="p-8">
                <EmptyState 
                  isLoading={isLoading}
                  icon={Receipt}
                  title={searchQuery ? "Data Tidak Ditemukan" : "Data Kosong"}
                  description={searchQuery ? `Tidak ada pengeluaran yang cocok dengan pencarian "${searchQuery}".` : "Belum ada data pengeluaran yang tercatat saat ini."}
                  action={!searchQuery ? {
                    label: "Catat Baru",
                    onClick: () => handleOpenModal(),
                    icon: Plus
                  } : undefined}
                />
              </div>
            ) : (
              <>
                {isLoading && paginatedExpenses.length > 0 && (
                  <div className="absolute inset-0 bg-bg-card/40 backdrop-blur-[1px] z-10 flex items-start justify-center pt-10 transition-all duration-300">
                    <div className="px-4 py-2 bg-brand-primary text-text-inverse rounded-full flex items-center space-x-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Memperbarui...</span>
                    </div>
                  </div>
                )}
                {paginatedExpenses.map((expense) => (
                <div key={expense.id} className="p-4 transition-colors hover:bg-bg-main/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-muted">
                      {new Date(expense.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-brand-light text-brand-primary">
                      {expense.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-3">
                    {expense.description || '-'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-text-primary text-base">
                        {formatCurrency(Number(expense.amount))}
                      </span>
                      {expense.receiptPath && (
                        <button 
                          onClick={() => setReceiptPreview(expense.receiptPath)}
                          className="p-1.5 rounded-lg transition-all bg-status-success/10 text-status-success hover:bg-status-success/20"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!expense.isSystemGenerated ? (
                        <>
                          <button 
                            onClick={() => handleOpenModal(expense)}
                            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light border border-border-default"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <Can role={["ADMIN"]}>
                            <button 
                              onClick={() => setDeleteConfirm(expense.id)}
                              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all text-text-muted hover:text-status-danger hover:bg-status-danger/10 border border-border-default"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Can>
                        </>
                      ) : (
                        <span className="text-[10px] text-text-muted/60 font-semibold italic select-none px-2 py-1 bg-bg-main border border-border-subtle rounded-md">
                          Sistem (Pembelian)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </>
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
                  className="px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-card border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-card [&>option]:text-text-primary"
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
                  className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30"
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
                          "w-8 h-8 rounded-xl text-[10px] font-bold transition-all",
                          currentPage === pNum 
                            ? "bg-brand-primary text-text-inverse shadow-sm" 
                            : "bg-bg-card border border-border-default text-text-secondary hover:bg-bg-main"
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
                  className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30"
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
        onClick={() => handleOpenModal()}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-brand-primary text-text-inverse rounded-full shadow-xl shadow-brand-primary/30 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col lg:max-w-lg max-h-[90vh]">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-brand-primary flex items-center justify-between flex-shrink-0 text-text-inverse border-b border-border-subtle">
              <h3 className="text-base lg:text-lg font-black">
                {editingExpense ? "Edit" : "Catat"} Pengeluaran
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tanggal</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full min-h-[44px] p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary cursor-pointer relative"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Kategori</label>
                  <div className="flex items-center gap-2">
                    <SearchableSelect
                      options={categoriesData || []}
                      value={formData.categoryId}
                      onChange={(val) => setFormData({...formData, categoryId: val})}
                      placeholder="Pilih Kategori..."
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setIsManageCategoriesModalOpen(true)}
                      className="flex items-center justify-center min-w-[44px] h-[44px] bg-brand-light text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-colors"
                      title="Kelola Kategori"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nominal (Rp)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    required
                    min="0"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full min-h-[44px] p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Deskripsi / Keterangan</label>
                  <textarea 
                    placeholder="Untuk keperluan apa..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[80px] transition-colors bg-bg-main border-border-default text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bukti Nota (Opsional)</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 border rounded-[24px] flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors bg-bg-main border-border-default">
                      {isCompressing ? (
                        <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      ) : formData.receiptPath ? (
                        <img src={formData.receiptPath} alt="Receipt" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-border-strong" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden rounded-lg" 
                        id="receipt-upload"
                      />
                      <label 
                        htmlFor="receipt-upload"
                        className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border rounded-xl text-sm font-bold cursor-pointer transition-colors bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                      >
                        Pilih Gambar
                      </label>
                      <p className="text-[10px] text-text-muted mt-2">Format JPG/PNG. Maks 5MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="submit"
                    disabled={isCompressing}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{editingExpense ? "Simpan Perubahan" : "Simpan Pengeluaran"}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {receiptPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReceiptPreview(null)}>
          <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              onClick={() => setReceiptPreview(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img src={receiptPreview} alt="Receipt Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Pengeluaran?</h2>
              <button onClick={() => setDeleteConfirm(null)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Tindakan ini akan menghapus data pengeluaran secara permanen. Data yang sudah dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="p-5 lg:p-6 bg-bg-main/50 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-6">
              <button 
                onClick={handleDelete}
                className="w-full lg:flex-1 py-4 bg-status-danger text-text-inverse font-black text-sm shadow-xl shadow-status-danger/20 hover:bg-status-danger/80 transition-all active:scale-95 rounded-full"
              >
                Ya, Hapus
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="w-full lg:flex-1 py-4 bg-bg-card border-2 border-border-default text-text-secondary font-black text-sm hover:bg-bg-main transition-all rounded-full"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Category Modal */}
      {isManageCategoriesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-bg-modal w-full max-w-md rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 ease-out flex flex-col shadow-2xl max-h-[80vh]">
            <div className="p-4 lg:p-6 bg-brand-primary flex items-center justify-between flex-shrink-0 text-text-inverse border-b border-border-subtle">
              <h3 className="text-base lg:text-lg font-black">Kelola Kategori</h3>
              <button onClick={() => setIsManageCategoriesModalOpen(false)} className="p-2 text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-6">
                
                {/* Add New Category */}
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    placeholder="Kategori baru..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 min-h-[44px] p-3 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary"
                  />
                  <button 
                    type="submit"
                    disabled={createCategory.isPending || !newCategoryName.trim()}
                    className="min-w-[44px] h-[44px] bg-brand-primary text-text-inverse rounded-xl font-bold flex items-center justify-center disabled:opacity-50 hover:bg-brand-hover transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </form>

                {/* List Categories */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Kategori Tersedia</label>
                  {isLoadingCategories ? (
                    <div className="text-center text-sm text-text-muted py-4">Memuat...</div>
                  ) : categoriesData?.length === 0 ? (
                    <div className="text-center text-sm text-text-muted py-4">Belum ada kategori</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {categoriesData?.map((cat: any) => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-bg-main border border-border-default rounded-xl">
                          {editingCategoryId === cat.id ? (
                            <div className="flex flex-1 items-center gap-2 mr-2">
                              <input 
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="flex-1 h-8 px-2 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-card border-border-default text-text-primary"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-text-primary">{cat.name}</span>
                          )}
                          
                          <div className="flex items-center gap-1">
                            {editingCategoryId === cat.id ? (
                              <>
                                <button 
                                  onClick={() => handleUpdateCategory(cat.id)}
                                  disabled={updateCategory.isPending}
                                  className="p-1.5 text-status-success hover:bg-status-success/10 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingCategoryId(null);
                                    setEditCategoryName("");
                                  }}
                                  className="p-1.5 text-text-muted hover:bg-bg-card rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditCategoryName(cat.name);
                                  }}
                                  className="p-1.5 text-text-muted hover:text-brand-primary hover:bg-brand-light rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteCategoryConfirm(cat.id)}
                                  disabled={deleteCategory.isPending}
                                  className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsManageCategoriesModalOpen(false)}
                    className="w-full min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Tutup
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col shadow-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Kategori?</h2>
              <button onClick={() => setDeleteCategoryConfirm(null)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card flex-1">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Tindakan ini akan menghapus kategori secara permanen. Jika kategori sudah pernah digunakan pada pencatatan pengeluaran, kategori ini tidak dapat dihapus.
              </p>
            </div>
            <div className="p-5 lg:p-6 bg-bg-main/50 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-6">
              <button 
                onClick={handleDeleteCategory}
                disabled={deleteCategory.isPending}
                className="w-full lg:flex-1 py-4 bg-status-danger text-text-inverse font-black text-sm shadow-xl shadow-status-danger/20 hover:bg-status-danger/80 transition-all active:scale-95 rounded-full disabled:opacity-50"
              >
                {deleteCategory.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button 
                onClick={() => setDeleteCategoryConfirm(null)}
                className="w-full lg:flex-1 py-4 bg-bg-card border-2 border-border-default text-text-secondary font-black text-sm hover:bg-bg-main transition-all rounded-full"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </phantom-ui>
  );
}
