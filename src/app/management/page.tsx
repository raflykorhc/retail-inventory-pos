import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Package, 
  Tag, 
  Layers,
  MoreVertical,
  CheckSquare,
  Download,
  FileUp,
  Truck,
  Users,
  Printer
} from "lucide-react";
import { cn } from "../../lib/utils";
import axiosClient from "../../lib/axiosClient";
import { SummaryCard } from '@/components/SummaryCard';
import { EmptyState } from "../../components/ui/EmptyState";

// Refactored Components
import { ManagementTabs } from "./components/ManagementTabs";
import { ProductTable } from "./components/ProductTable";
import { CategoryTable } from "./components/CategoryTable";
import { UnitTable } from "./components/UnitTable";
import { SupplierTable } from "./components/SupplierTable";
import { UserTable } from "./components/UserTable";
import { QRPrintManager } from "../../components/QRPrintManager";
import { ProductModal, GenericModal, SupplierModal, UserModal, DeleteModal } from "./components/ManagementModals";
import { ProductFormValues, GenericFormValues, SupplierFormValues, UserFormValues } from "./schemas";
import { Can } from "../../components/auth/Can";
import InventoryOptimizationPanel from "./components/InventoryOptimizationPanel";

import { useAuthStore } from "../../store/useAuthStore";

type Tab = "barang" | "kategori" | "satuan" | "supplier" | "user" | "optimasi";

export default function ManagementPage() {
  const { user } = useAuthStore();
  // Data States
  const [activeTab, setActiveTab] = useState<Tab>("barang");
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const placeholderItems = useMemo(() => [
    { id: "1", code: "BRG-001", name: "Semen Portland 50kg Tiga Roda", stock: 150, category: { name: "Bahan Pokok" }, prices: [{ price: 72000, unit: { name: "Zak" } }] },
    { id: "2", code: "BRG-002", name: "Besi Beton 10mm SNI", stock: 12, category: { name: "Besi" }, prices: [{ price: 95000, unit: { name: "Batang" } }] }
  ], []);

  const placeholderCategories = useMemo(() => [
    { id: "1", name: "Bahan Pokok", description: "Bahan semen, pasir, bata" },
    { id: "2", name: "Besi", description: "Besi beton, kawat, ulir" }
  ], []);

  const placeholderUnits = useMemo(() => [
    { id: "1", name: "Zak", abbreviation: "Zak" },
    { id: "2", name: "Batang", abbreviation: "Btg" }
  ], []);

  const placeholderSuppliers = useMemo(() => [
    { id: "1", name: "PT Tiga Roda Indonesia", phone: "0812345", address: "Jakarta" },
    { id: "2", name: "PT Krakatau Steel", phone: "0898765", address: "Cilegon" }
  ], []);

  const placeholderUsers = useMemo(() => [
    { id: "1", fullName: "Muhamad Rafly Wiguna", username: "rafly", role: "ADMIN", email: "rafly@example.com" },
    { id: "2", fullName: "Staff Toko A", username: "staffa", role: "CASHIER", email: "staffa@example.com" }
  ], []);

  const activeItems = isLoading ? placeholderItems : items;
  const activeCategories = isLoading ? placeholderCategories : categories;
  const activeUnits = isLoading ? placeholderUnits : units;
  const activeSuppliers = isLoading ? placeholderSuppliers : suppliers;
  const activeUsers = isLoading ? placeholderUsers : users;
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal States
  const [modalType, setModalType] = useState<"product" | "generic" | "supplier" | "user" | "customer" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isQRManagerOpen, setIsQRManagerOpen] = useState(false);
  const [qrQueueItems, setQrQueueItems] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    setSelectedItems([]);
    setCategoryFilter("all");
    setStockFilter("all");
    setIsSelectionMode(false);
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, unitRes, suppRes, userRes] = await Promise.all([
        axiosClient.get("/products"),
        axiosClient.get("/categories"),
        axiosClient.get("/units"),
        axiosClient.get("/suppliers"),
        // Only fetch users if the user has the right role to avoid 403 error
        (user?.role === "ADMIN" || user?.role === "MANAGER") 
          ? axiosClient.get("/auth/users") 
          : Promise.resolve({ data: [] })
      ]);
      setItems(prodRes.data || []);
      setCategories(catRes.data || []);
      setUnits(unitRes.data || []);
      setSuppliers(suppRes.data || []);
      setUsers(userRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Gagal Memuat Data", { description: "Terjadi kesalahan saat mengambil data master." });
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized Filtering Logic
  const filteredData = useMemo(() => {
    const source = activeTab === "barang" ? activeItems : activeTab === "kategori" ? activeCategories : activeTab === "supplier" ? activeSuppliers : activeTab === "user" ? activeUsers : activeUnits;
    if (!Array.isArray(source)) return [];
    
    const query = searchQuery.toLowerCase();
    
    return source.filter(i => {
      let matchesSearch = false;
      
      if (activeTab === "user") {
        const fullNameMatch = (i.fullName || "")?.toLowerCase().includes(query);
        const usernameMatch = (i.username || "")?.toLowerCase().includes(query);
        matchesSearch = fullNameMatch || usernameMatch;
      } else {
        const nameMatch = (i.name || "")?.toLowerCase().includes(query);
        matchesSearch = nameMatch;
      }
      
      if (activeTab === "barang") {
        const codeMatch = (i.code || "")?.toLowerCase().includes(query);
        const descMatch = (i.description || "")?.toLowerCase().includes(query);
        matchesSearch = matchesSearch || codeMatch || descMatch;
      }
      
      if (activeTab === "supplier") {
        const phoneMatch = (i.phone || "")?.toLowerCase().includes(query);
        const contactMatch = (i.contact || "")?.toLowerCase().includes(query);
        matchesSearch = matchesSearch || phoneMatch || contactMatch;
      }

      let matchesCategory = true;
      if (activeTab === "barang" && categoryFilter !== "all") {
        matchesCategory = i.categoryId === categoryFilter;
      }

      let matchesStock = true;
      if (activeTab === "barang" && stockFilter !== "all") {
        const currentStock = i.stock || 0;
        const minStock = i.minStock || 10;
        if (stockFilter === "low") matchesStock = currentStock <= minStock && currentStock > 0;
        if (stockFilter === "out") matchesStock = currentStock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [activeItems, activeCategories, activeUnits, activeSuppliers, activeUsers, activeTab, searchQuery, categoryFilter, stockFilter]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredData, currentPage, itemsPerPage]);

  // Handlers
  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    setModalType(activeTab === "barang" ? "product" : activeTab === "supplier" ? "supplier" : activeTab === "user" ? "user" : "generic");
  };

  const handleSubmit = async (data: ProductFormValues | GenericFormValues | SupplierFormValues | UserFormValues) => {
    const endpoint = activeTab === "barang" ? "/products" : activeTab === "kategori" ? "/categories" : activeTab === "supplier" ? "/suppliers" : activeTab === "user" ? (editingItem ? "/auth/users" : "/auth/register") : "/units";
    const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;

    const promise = editingItem ? axiosClient.put(url, data) : axiosClient.post(url, data);

    toast.promise(promise, {
      loading: 'Menyimpan data...',
      success: () => {
        setModalType(null);
        fetchAllData();
        return `Data ${editingItem ? 'diperbarui' : 'ditambahkan'}!`;
      },
      error: (err) => `Gagal: ${err.response?.data?.error || err.message}`,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const endpoint = activeTab === "barang" ? "/products" : activeTab === "kategori" ? "/categories" : activeTab === "supplier" ? "/suppliers" : activeTab === "user" ? "/auth/users" : "/units";
    const promise = axiosClient.delete(`${endpoint}/${deleteConfirm.id}`);

    toast.promise(promise, {
      loading: 'Menghapus data...',
      success: () => {
        setDeleteConfirm(null);
        fetchAllData();
        return 'Data berhasil dihapus.';
      },
      error: (err) => `Gagal: ${err.response?.data?.error || err.message}`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    const endpoint = activeTab === "kategori" ? "/categories" : activeTab === "supplier" ? "/suppliers" : "/units";
    const promise = (activeTab === "barang" 
      ? axiosClient.post("/products/bulk-delete", { ids: selectedItems })
      : Promise.all(selectedItems.map(id => axiosClient.delete(`${endpoint}/${id}`)))) as Promise<any>;

    toast.promise(promise, {
      loading: 'Menghapus data massal...',
      success: () => {
        setBulkDeleteConfirm(false);
        setSelectedItems([]);
        fetchAllData();
        return `${selectedItems.length} data berhasil dihapus.`;
      },
      error: 'Terjadi kesalahan saat penghapusan massal.',
    });
  };

  const toggleSelectAll = () => {
    const currentItems = filteredData;
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map(item => item.id));
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      let templateData = [];
      if (activeTab === "barang") {
        templateData = [{
          'Nama Barang': 'Contoh Barang',
          'Kategori': categories[0]?.name || 'Semen',
          'Satuan': units[0]?.name || 'Sak',
          'Harga Jual': 15000,
          'Harga Beli Awal': 12000,
          'Stok Awal': 100,
          'Stok Minimum': 10,
          'Deskripsi': 'Deskripsi contoh'
        }];
      } else if (activeTab === "kategori") {
        templateData = [{ 'Nama Kategori': 'Contoh Kategori' }];
      } else if (activeTab === "supplier") {
        templateData = [{
          'Nama Supplier': 'PT. Contoh Supplier',
          'Kontak Person': 'Budi Santoso',
          'Nomor Telepon': '08123456789',
          'Alamat': 'Jl. Contoh No. 123',
          'Email': 'supplier@example.com'
        }];
      } else {
        templateData = [{ 'Nama Satuan': 'Contoh Satuan' }];
      }

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      XLSX.writeFile(workbook, `Template_Import_${activeTab}.xlsx`);
      setIsMenuOpen(false);
      toast.success("Template Berhasil Diunduh");
    } catch (error) {
      console.error("Download template failed:", error);
      toast.error("Gagal mengunduh template.");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const promise = new Promise<{ successCount: number, failCount: number, skippedCount: number, total: number }>(async (resolve, reject) => {
      try {
        setIsLoading(true);
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            const getRowValue = (row: any, key: string) => {
              const lowercaseKey = key.toLowerCase().trim();
              const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === lowercaseKey);
              return foundKey !== undefined ? row[foundKey] : undefined;
            };

            const endpoint = 
              activeTab === "barang" ? "/products" : 
              activeTab === "kategori" ? "/categories" : 
              activeTab === "supplier" ? "/suppliers" : 
              activeTab === "user" ? "/auth/register" :
              "/units";
            
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0;

            let localCategories = [...categories];
            let localUnits = [...units];

            for (const row of data as any[]) {
              try {
                let payload: any = {};
                
                if (activeTab === "barang") {
                  const rawName = getRowValue(row, 'Nama Barang');
                  if (!rawName) {
                    skippedCount++;
                    continue;
                  }

                  const catValue = getRowValue(row, 'Kategori');
                  const catName = catValue ? String(catValue).trim() : '';
                  let categoryId = '';
                  
                  if (catName) {
                    let foundCat = localCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                    if (foundCat) {
                      categoryId = foundCat.id;
                    } else {
                      try {
                        const catRes = await axiosClient.post("/categories", { name: catName });
                        if (catRes.data && catRes.data.id) {
                          categoryId = catRes.data.id;
                          localCategories.push(catRes.data);
                        }
                      } catch (catErr) {
                        console.error(`Gagal membuat kategori "${catName}" otomatis:`, catErr);
                      }
                    }
                  }

                  const unitValue = getRowValue(row, 'Satuan');
                  const unitName = unitValue ? String(unitValue).trim() : '';
                  let unitId = '';

                  if (unitName) {
                    let foundUnit = localUnits.find(u => u.name.toLowerCase() === unitName.toLowerCase());
                    if (foundUnit) {
                      unitId = foundUnit.id;
                    } else {
                      try {
                        const unitRes = await axiosClient.post("/units", { name: unitName });
                        if (unitRes.data && unitRes.data.id) {
                          unitId = unitRes.data.id;
                          localUnits.push(unitRes.data);
                        }
                      } catch (unitErr) {
                        console.error(`Gagal membuat satuan "${unitName}" otomatis:`, unitErr);
                      }
                    }
                  }

                  if (!categoryId || !unitId) {
                    console.warn(`Baris dilewati karena kategori/satuan tidak terisi atau gagal dibuat untuk: "${rawName}"`);
                    failCount++;
                    continue;
                  }

                  payload = {
                    name: String(rawName).trim(),
                    categoryId,
                    unitId,
                    price: Number(getRowValue(row, 'Harga Jual')) || 0,
                    initialCost: Number(getRowValue(row, 'Harga Beli Awal')) || 0,
                    initialStock: Number(getRowValue(row, 'Stok Awal')) || 0,
                    minStock: Number(getRowValue(row, 'Stok Minimum')) || 10,
                    description: getRowValue(row, 'Deskripsi') ? String(getRowValue(row, 'Deskripsi')).trim() : ""
                  };
                } else if (activeTab === "supplier") {
                  const rawName = getRowValue(row, 'Nama Supplier');
                  if (!rawName) {
                    skippedCount++;
                    continue;
                  }

                  payload = {
                    name: String(rawName).trim(),
                    contact: getRowValue(row, 'Kontak Person') ? String(getRowValue(row, 'Kontak Person')).trim() : "",
                    phone: getRowValue(row, 'Nomor Telepon') ? String(getRowValue(row, 'Nomor Telepon')).trim() : "",
                    address: getRowValue(row, 'Alamat') ? String(getRowValue(row, 'Alamat')).trim() : "",
                    email: getRowValue(row, 'Email') ? String(getRowValue(row, 'Email')).trim() : ""
                  };
                } else {
                  const nameKey = activeTab === "kategori" ? "Nama Kategori" : "Nama Satuan";
                  const rawName = getRowValue(row, nameKey) || getRowValue(row, 'Nama');
                  if (!rawName) {
                    skippedCount++;
                    continue;
                  }

                  payload = { name: String(rawName).trim() };
                }

                if (payload.name) {
                  await axiosClient.post(endpoint, payload);
                  successCount++;
                } else {
                  skippedCount++;
                }
              } catch (err) {
                console.error("Gagal mengimpor baris data:", err);
                failCount++;
              }
            }
            
            await fetchAllData();
            setIsMenuOpen(false);
            resolve({ successCount, failCount, skippedCount, total: data.length });
          } catch (err) {
            reject(err);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsBinaryString(file);
      } catch (error) {
        reject(error);
        setIsLoading(false);
      }
    });

    toast.promise(promise, {
      loading: 'Mengimpor data dari Excel...',
      success: (res) => {
        let msg = `Impor selesai! ${res.successCount} berhasil`;
        if (res.failCount > 0) msg += `, ${res.failCount} gagal`;
        if (res.skippedCount > 0) msg += `, ${res.skippedCount} kosong/dilewati`;
        msg += ` (dari ${res.total} baris).`;
        return msg;
      },
      error: 'Terjadi kesalahan saat mengimpor data.',
    });
    
    e.target.value = '';
  };

  const handlePrintBarcode = () => {
    if (selectedItems.length === 0 || activeTab !== "barang") return;
    const selectedProducts = items.filter(i => selectedItems.includes(i.id));
    setQrQueueItems(selectedProducts);
    setIsQRManagerOpen(true);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="p-4 lg:p-8 pt-0 lg:pt-0 min-h-full flex flex-col space-y-8 lg:space-y-8 bg-bg-main overflow-y-auto custom-scrollbar">
      {/* Summary Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-6 lg:gap-6 flex-shrink-0 pt-6 lg:pt-8">
        <SummaryCard title="Barang" value={activeItems.length} icon={<Package className="w-4 h-4 lg:w-6 lg:h-6" />} color="blue" className="shadow-sm border-border-default min-h-[70px] lg:min-h-[140px]" isLoading={isLoading} />
        <SummaryCard title="Kategori" value={activeCategories.length} icon={<Tag className="w-4 h-4 lg:w-6 lg:h-6" />} color="green" className="shadow-sm border-border-default min-h-[70px] lg:min-h-[140px]" isLoading={isLoading} />
        <SummaryCard title="Satuan" value={activeUnits.length} icon={<Layers className="w-4 h-4 lg:w-6 lg:h-6" />} color="orange" className="shadow-sm border-border-default min-h-[70px] lg:min-h-[140px]" isLoading={isLoading} />
        <SummaryCard title="Pemasok" value={activeSuppliers.length} icon={<Truck className="w-4 h-4 lg:w-6 lg:h-6" />} color="blue" className="shadow-sm border-border-default min-h-[70px] lg:min-h-[140px]" isLoading={isLoading} />
        <Can role={["ADMIN", "MANAGER"]}>
          <SummaryCard title="Pengguna" value={activeUsers.length} icon={<Users className="w-4 h-4 lg:w-6 lg:h-6" />} color="orange" className="shadow-sm border-border-default min-h-[70px] lg:min-h-[140px]" isLoading={isLoading} />
        </Can>
      </div>

      <ManagementTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <div className="rounded-[2rem] border border-border-default flex flex-col bg-bg-card overflow-visible">
        {/* Action Bar */}
        {activeTab !== "optimasi" && (
          <div className="sticky top-0 z-30 p-8 lg:p-8 border-b border-border-subtle bg-bg-card rounded-t-[2rem]">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Search Input - Full width on mobile, flexible on desktop */}
              <div className="relative w-full lg:flex-1 flex items-center">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                <input 
                  type="text" placeholder="Cari data..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                />
              </div>

              {/* Filters and Actions - Wrapped on mobile */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-hide">
                {activeTab === "barang" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select 
                      value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                    >
                      <option value="all">Kategori: Semua</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select 
                      value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                    >
                      <option value="all">Stok: Semua</option>
                      <option value="low">Menipis</option>
                      <option value="out">Habis</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleOpenModal()}
                    className="hidden lg:flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Tambah Data</span>
                  </button>

                  <div className="relative">
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="w-11 h-11 border border-border-default rounded-xl flex items-center justify-center bg-bg-main text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {isMenuOpen && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] bg-black/5 backdrop-blur-[1px]" 
                            onClick={() => setIsMenuOpen(false)}
                          ></motion.div>
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-56 bg-bg-card border border-border-default rounded-2xl shadow-2xl z-[100] py-1.5 overflow-hidden ring-1 ring-black/5"
                          >
                            <div className="px-4 py-2 border-b border-border-subtle mb-1 bg-bg-main/50">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Menu Kelola</p>
                            </div>
                            
                            <button 
                              onClick={() => {
                                if (isSelectionMode) {
                                  setSelectedItems([]);
                                }
                                setIsSelectionMode(!isSelectionMode);
                                setIsMenuOpen(false);
                              }}
                              className={cn(
                                "w-full px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-6 hover:bg-bg-main",
                                isSelectionMode ? "text-brand-primary" : "text-text-primary"
                              )}
                            >
                              <CheckSquare className={cn("w-4 h-4", isSelectionMode ? "text-brand-primary" : "text-text-muted")} />
                              <span>{isSelectionMode ? "Selesai Memilih" : "Pilih Data"}</span>
                            </button>

                            <button 
                              onClick={handleDownloadTemplate}
                              className="w-full px-4 py-3 text-left text-xs font-bold text-text-primary hover:bg-bg-main transition-colors flex items-center gap-6 rounded-full active:scale-95 transition-transform"
                            >
                              <Download className="w-4 h-4 text-text-muted" />
                              <span>Download Template</span>
                            </button>

                            <div className="relative w-full">
                              <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                              />
                              <button className="w-full px-4 py-3 text-left text-xs font-bold text-text-primary hover:bg-bg-main transition-colors flex items-center gap-6 rounded-full active:scale-95 transition-transform">
                                <FileUp className="w-4 h-4 text-text-muted" />
                                <span>Import Excel</span>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAB for Mobile */}
        {activeTab !== "optimasi" && (
          <div className="lg:hidden fixed bottom-24 right-6 z-50">
            <button 
              onClick={() => handleOpenModal()}
              className="w-14 h-14 bg-brand-primary text-text-inverse rounded-full flex items-center justify-center shadow-2xl shadow-brand-primary/40 active:scale-90 transition-transform"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Selected Items Bar */}
        <AnimatePresence>
          {selectedItems.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden bg-brand-primary text-text-inverse px-4 lg:px-6 py-3 flex items-center justify-between border-b border-white/10"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{selectedItems.length} item terpilih</span>
              <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                <button 
                  onClick={toggleSelectAll}
                  className=".5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-colors border border-white/20 whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                >
                  {selectedItems.length === filteredData.length ? "Batal Semua" : "Pilih Semua"}
                </button>
                {activeTab === "barang" && (
                  <button 
                    onClick={handlePrintBarcode}
                    className=".5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-colors border border-white/20 whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                  >
                    <Printer className="w-3 h-3 inline-block mr-1" />
                    Cetak Barcode
                  </button>
                )}
                <Can role={["ADMIN", "MANAGER"]}>
                  <button 
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="px-3 py-1.5 bg-status-danger text-text-inverse rounded-lg text-[10px] font-bold hover:bg-status-danger/90 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Hapus Massal
                  </button>
                </Can>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Content */}
        <div className="flex flex-col min-h-[400px]">
          {paginatedData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState 
                icon={activeTab === "barang" ? Package : activeTab === "kategori" ? Tag : activeTab === "supplier" ? Truck : activeTab === "user" ? Users : Layers}
                title={searchQuery ? "Data Tidak Ditemukan" : `Belum Ada Data ${activeTab === "barang" ? "Barang" : activeTab === "kategori" ? "Kategori" : activeTab === "supplier" ? "Supplier" : activeTab === "user" ? "Pengguna" : "Satuan"}`}
                description={searchQuery 
                  ? `Tidak ada hasil untuk "${searchQuery}". Coba kata kunci lain.` 
                  : `Kelola daftar ${activeTab === "user" ? "pengguna sistem" : activeTab} toko Anda di sini. Mulai tambahkan data baru untuk melengkapi master data.`
                }
                action={!searchQuery ? {
                  label: "Tambah Data",
                  onClick: () => handleOpenModal(),
                  icon: Plus
                } : undefined}
              />
            </div>
          ) : (
            <>
              {activeTab === "barang" ? (
                <ProductTable items={paginatedData} selectedItems={selectedItems} isSelectionMode={isSelectionMode} toggleSelectItem={toggleSelectItem} onEdit={handleOpenModal} onDelete={setDeleteConfirm} />
              ) : activeTab === "kategori" ? (
                <div className="scrollbar-default">
                  <CategoryTable items={paginatedData} selectedItems={selectedItems} isSelectionMode={isSelectionMode} toggleSelectItem={toggleSelectItem} onEdit={handleOpenModal} onDelete={setDeleteConfirm} />
                </div>
              ) : activeTab === "supplier" ? (
                <div className="scrollbar-default">
                  <SupplierTable items={paginatedData} selectedItems={selectedItems} isSelectionMode={isSelectionMode} toggleSelectItem={toggleSelectItem} onEdit={handleOpenModal} onDelete={setDeleteConfirm} />
                </div>
              ) : activeTab === "user" ? (
                <div className="scrollbar-default">
                  <UserTable items={paginatedData} selectedItems={selectedItems} isSelectionMode={isSelectionMode} toggleSelectItem={toggleSelectItem} onEdit={handleOpenModal} onDelete={setDeleteConfirm} />
                </div>
              ) : activeTab === "optimasi" ? (
                <InventoryOptimizationPanel />
              ) : (
                <div className="scrollbar-default">
                  <UnitTable items={paginatedData} selectedItems={selectedItems} isSelectionMode={isSelectionMode} toggleSelectItem={toggleSelectItem} onEdit={handleOpenModal} onDelete={setDeleteConfirm} />
                </div>
              )}
            </>
          )}
        </div>

          {/* Pagination Controls */}
          {activeTab !== "optimasi" && totalItems > 0 && (
            <div className="px-8 py-8 lg:px-8 lg:py-8 border-t border-border-subtle bg-bg-card flex-shrink-0 rounded-b-[2rem]">
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
                    className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
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

      {/* Modals */}
      <ProductModal 
        isOpen={modalType === "product"} onClose={() => setModalType(null)} 
        onSubmit={handleSubmit} editingItem={editingItem} categories={categories} units={units} suppliers={suppliers}
      />
      <GenericModal 
        isOpen={modalType === "generic"} onClose={() => setModalType(null)} 
        onSubmit={handleSubmit} editingItem={editingItem} type={activeTab as "kategori" | "satuan"} 
      />
      <SupplierModal 
        isOpen={modalType === "supplier"} onClose={() => setModalType(null)} 
        onSubmit={handleSubmit} editingItem={editingItem} 
      />
      <UserModal 
        isOpen={modalType === "user"} onClose={() => setModalType(null)} 
        onSubmit={handleSubmit} editingItem={editingItem} 
      />

      <DeleteModal 
        isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} 
        onConfirm={handleDelete} itemName={deleteConfirm?.name || ""} 
      />
      <DeleteModal 
        isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} 
        onConfirm={handleBulkDelete} itemName={selectedItems.length.toString()} isBulk 
      />
      <QRPrintManager 
        isOpen={isQRManagerOpen}
        onClose={() => {
          setIsQRManagerOpen(false);
          setQrQueueItems([]);
        }}
        initialItems={qrQueueItems}
      />
    </div>
    </phantom-ui>
  );
}
