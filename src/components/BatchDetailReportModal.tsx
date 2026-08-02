import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Layers,
  TrendingUp,
  Package,
  History,
  Printer,
  Plus,
  DollarSign,
  FileSpreadsheet,
  AlertTriangle,
  Archive,
  Edit,
  Save,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import axiosClient from "../lib/axiosClient";
import { formatCurrency, formatMultiUnitStock } from "../lib/utils";
import * as XLSX from "xlsx";

interface BatchDetailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  productId: string;
  productName: string;
}

export const BatchDetailReportModal: React.FC<BatchDetailReportModalProps> = ({
  isOpen,
  onClose,
  batchId,
  productId,
  productName
}) => {
  const queryClient = useQueryClient();
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states for stock/price adjustments
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [initialQty, setInitialQty] = useState<number>(0);
  const [currentQty, setCurrentQty] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // Fetch detailed batch information
  const fetchBatchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get(`/products/batches/${batchId}`);
      const data = res.data;
      setBatch(data);
      if (data) {
        setInitialQty(data.initialQuantity);
        setCurrentQty(data.currentQuantity);
        setCostPrice(Number(data.costPrice));
        setSellingPrice(Number(data.sellingPrice));
      }
    } catch (err) {
      console.error("Failed to fetch batch details:", err);
      toast.error("Gagal Memuat Detail Batch");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && batchId) {
      fetchBatchDetails();
    }
  }, [isOpen, batchId]);

  // Helper to extract conversion factor of a sale item unit
  const getConversionFactor = (saleItem: any) => {
    const prices = saleItem.product?.prices || [];
    const priceObj = prices.find((p: any) => p.unitId === saleItem.unitId);
    return priceObj?.conversionFactor || 1;
  };

  // Process and aggregate sales allocations
  const processedAllocations = useMemo(() => {
    if (!batch || !batch.saleAllocations) return [];

    return batch.saleAllocations.map((alloc: any, idx: number) => {
      const saleItem = alloc.saleItem;
      if (!saleItem) return null;

      const factor = getConversionFactor(saleItem);
      const qtyInSaleUnit = alloc.quantity / factor;
      const unitName = saleItem.unit?.name || "Unit";

      const priceInBaseUnit = saleItem.isBonus ? 0 : (Number(saleItem.priceAtSale) / factor);
      const subtotal = alloc.quantity * priceInBaseUnit;

      return {
        id: alloc.id,
        no: idx + 1,
        createdAt: saleItem.sale?.createdAt || batch.createdAt,
        invoiceNumber: saleItem.sale?.invoiceNumber || "N/A",
        qtyText: `${qtyInSaleUnit.toLocaleString("id-ID")} ${unitName}`,
        unitPrice: saleItem.isBonus ? 0 : Number(saleItem.priceAtSale),
        isBonus: saleItem.isBonus,
        subtotal
      };
    }).filter(Boolean);
  }, [batch]);

  // Summarize financial stats
  const stats = useMemo(() => {
    if (!batch) return { totalRevenue: 0, totalCostSold: 0, profitSold: 0, totalBatchCost: 0, netProjectedProfit: 0 };

    // 1. Total revenue & cost from allocations
    let totalRevenue = 0;
    let totalCostSold = 0;

    batch.saleAllocations?.forEach((alloc: any) => {
      const saleItem = alloc.saleItem;
      if (!saleItem) return;

      const factor = getConversionFactor(saleItem);
      const priceInBaseUnit = saleItem.isBonus ? 0 : (Number(saleItem.priceAtSale) / factor);

      totalRevenue += alloc.quantity * priceInBaseUnit;
      totalCostSold += alloc.quantity * Number(alloc.costPrice);
    });

    // 2. Batch initial total cost
    const totalBatchCost = batch.initialQuantity * Number(batch.costPrice);

    return {
      totalRevenue,
      totalCostSold,
      profitSold: totalRevenue - totalCostSold,
      totalBatchCost,
      netProjectedProfit: totalRevenue - totalBatchCost
    };
  }, [batch]);

  // Submit batch adjustment form
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axiosClient.put(`/products/batches/${batchId}`, {
        initialQuantity: initialQty,
        currentQuantity: currentQty,
        costPrice,
        sellingPrice
      });

      toast.success("Penyesuaian Batch Berhasil");
      setShowAdjustForm(false);

      // Invalidate query cache so POS and Inventory updates instantly
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Refetch locally
      await fetchBatchDetails();
    } catch (err: any) {
      console.error("Failed to adjust batch:", err);
      toast.error(err.response?.data?.error || "Gagal Menyesuaikan Batch");
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle archive status
  const handleToggleArchive = async () => {
    const nextArchived = !batch?.isArchived;
    const actionText = nextArchived ? "Mengarsipkan" : "Mengaktifkan Kembali";

    if (nextArchived && batch?.currentQuantity > 0) {
      if (!confirm("Peringatan: Batch ini masih memiliki sisa stok. Mengarsipkan batch ini akan menyetel sisa stok batch menjadi 0 secara permanen di database dan memotong stok produk. Lanjutkan?")) {
        return;
      }
    } else {
      if (!confirm(`Apakah Anda yakin ingin ${actionText.toLowerCase()} batch ini?`)) {
        return;
      }
    }

    setIsUpdating(true);
    try {
      await axiosClient.put(`/products/batches/${batchId}`, {
        isArchived: nextArchived,
        // If archiving, automatically set current quantity to 0 to balance inventory
        currentQuantity: nextArchived ? 0 : undefined
      });

      toast.success(`Batch berhasil ${nextArchived ? "diarsipkan" : "diaktifkan kembali"}`);
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      await fetchBatchDetails();
    } catch (err: any) {
      console.error("Failed to toggle archive status:", err);
      toast.error(err.response?.data?.error || "Gagal mengubah status arsip");
    } finally {
      setIsUpdating(false);
    }
  };

  // Export to Excel (Excel spreadsheet style matching the user's request)
  const handleExportExcel = () => {
    if (!batch) return;

    const dataToExport = processedAllocations.map((alloc: any) => ({
      "Tanggal": new Date(alloc.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      "No Invoice": alloc.invoiceNumber,
      "Kuantitas Terjual": alloc.qtyText,
      "Harga Satuan": alloc.unitPrice,
      "Tipe": alloc.isBonus ? "BONUS" : "PENJUALAN",
      "Subtotal (Omset)": alloc.subtotal
    }));

    // Header metadata
    const metaData = [
      ["LAPORAN REALISASI BATCH / TRUK"],
      ["Nama Produk", productName],
      ["ID Batch", `#${batchId.toUpperCase()}`],
      ["Tanggal Beli", new Date(batch.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
      ["Supplier Pemasok", batch.purchaseItem?.purchase?.supplier?.name || "Tanpa Supplier"],
      ["Nomor Invoice Pembelian", batch.purchaseItem?.purchase?.invoiceNumber || "N/A"],
      ["Total Biaya Modal Batch", stats.totalBatchCost],
      ["Total Omset Real", stats.totalRevenue],
      ["Keuntungan Real", stats.profitSold],
      ["Sisa Stok di Sistem", formatMultiUnitStock(batch.currentQuantity, batch.product?.prices || [])],
      [], // Empty separator
      ["Tanggal", "No Invoice", "Kuantitas Terjual", "Harga Satuan", "Tipe", "Subtotal (Omset)"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(metaData);

    // Add list data
    XLSX.utils.sheet_add_json(ws, dataToExport, {
      skipHeader: true,
      origin: "A13"
    });

    // Formatting widths
    ws["!cols"] = [
      { wch: 15 }, // Tanggal
      { wch: 20 }, // No Invoice
      { wch: 18 }, // Kuantitas
      { wch: 15 }, // Harga Satuan
      { wch: 12 }, // Tipe
      { wch: 18 }  // Subtotal
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Realisasi Batch");

    XLSX.writeFile(wb, `Laporan_Realisasi_Batch_${batchId.slice(-6).toUpperCase()}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
      <div className="bg-bg-modal w-full rounded-t-[2rem] lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col h-[94vh] lg:h-[88vh] lg:max-w-4xl text-text-primary">
        {/* Mobile Drag Handle */}
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary shrink-0">
          <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
        </div>

        {/* Header Section */}
        <div className="p-4 lg:p-6 border-b border-white/10 bg-brand-primary relative overflow-hidden shrink-0 flex items-center justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-[32px] shadow-inner shrink-0">
              <Layers className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-black text-white leading-none">Laporan Realisasi & Profit Curah</h3>
              <p className="text-[10px] lg:text-xs font-bold text-white/80 mt-1 uppercase tracking-widest">
                {productName} &bull; Batch #{batchId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white transition-all p-2 ml-1 relative z-10 active:scale-90 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 bg-bg-main/30 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Memuat Laporan Batch...</p>
            </div>
          ) : !batch ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-25" />
              <p className="text-sm font-bold text-text-muted">Data batch tidak ditemukan.</p>
            </div>
          ) : (
            <>
              {/* Batch Purchase Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-8 bg-bg-card border border-border-default rounded-[32px] flex flex-col justify-between">
                  <div>
                    <p className="text-[8px] lg:text-[9px] font-black text-text-muted uppercase tracking-widest">Informasi Truk</p>
                    <h4 className="text-sm font-black text-text-primary mt-1">Pembelian Asal</h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Tanggal: <span className="font-bold">{new Date(batch.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </p>
                    {batch.purchaseItem?.purchase ? (
                      <>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Invoice: <span className="font-mono font-bold text-brand-primary">#{batch.purchaseItem.purchase.invoiceNumber.slice(-8).toUpperCase()}</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Supplier: <span className="font-bold">{batch.purchaseItem.purchase.supplier?.name || "Umum"}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-text-muted italic mt-1">Diinput manual tanpa invoice pembelian</p>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-bg-card border border-border-default rounded-[32px] flex flex-col justify-between">
                  <div>
                    <p className="text-[8px] lg:text-[9px] font-black text-text-muted uppercase tracking-widest">Kuantitas Batch</p>
                    <h4 className="text-sm font-black text-text-primary mt-1">Detail Muatan</h4>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase">Stok Awal</p>
                        <p className="text-xs font-bold text-text-primary">
                          {formatMultiUnitStock(batch.initialQuantity, batch.product?.prices || [])}
                        </p>
                        <span className="text-[9px] text-text-muted font-medium">({batch.initialQuantity} unit base)</span>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase">Sisa Stok</p>
                        <p className={batch.currentQuantity > 0 ? "text-xs font-black text-status-success" : "text-xs font-bold text-text-muted"}>
                          {formatMultiUnitStock(batch.currentQuantity, batch.product?.prices || [])}
                        </p>
                        <span className="text-[9px] text-text-muted font-medium">({batch.currentQuantity} unit base)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-bg-card border border-border-default rounded-[32px] flex flex-col justify-between">
                  <div>
                    <p className="text-[8px] lg:text-[9px] font-black text-text-muted uppercase tracking-widest">Informasi Harga</p>
                    <h4 className="text-sm font-black text-text-primary mt-1">Harga Acuan Batch</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase">Harga Modal</p>
                        <p className="text-xs font-bold text-text-secondary">{formatCurrency(Number(batch.costPrice))}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase">Harga Jual</p>
                        <p className="text-xs font-black text-brand-primary">{formatCurrency(Number(batch.sellingPrice))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adjust Stock Form (Toggleable Panel) */}
              {showAdjustForm && (
                <form onSubmit={handleAdjustSubmit} className="p-5 bg-status-warning/5 border border-status-warning/20 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-status-warning" />
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wide">Penyesuaian Manual Batch</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdjustForm(false)}
                      className="text-text-muted hover:text-text-primary text-xs font-bold"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Stok Awal (Base Unit)</label>
                      <input
                        type="number"
                        required
                        step="any"
                        className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none text-text-primary font-bold rounded-lg h-[44px]"
                        value={initialQty}
                        onChange={(e) => setInitialQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Stok Sisa (Base Unit)</label>
                      <input
                        type="number"
                        required
                        step="any"
                        className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none text-text-primary font-bold rounded-lg h-[44px]"
                        value={currentQty}
                        onChange={(e) => setCurrentQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Harga Modal (Base Unit)</label>
                      <input
                        type="number"
                        required
                        className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none text-text-primary font-bold rounded-lg h-[44px]"
                        value={costPrice}
                        onChange={(e) => setCostPrice(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Harga Jual (Base Unit)</label>
                      <input
                        type="number"
                        required
                        className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none text-text-primary font-bold rounded-lg h-[44px]"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-bg-main/50 rounded-[24px] border border-border-subtle flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
                    <p className="text-[10px] text-text-secondary leading-relaxed">
                      Catatan: Mengubah sisa stok batch akan menyinkronkan stok keseluruhan produk secara otomatis.
                      Gunakan ini jika muatan truk aslinya berbeda dan menghasilkan jumlah unit yang berbeda di lapangan.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-brand-primary text-text-inverse font-bold flex items-center space-x-1.5 shadow-md shadow-brand-primary/10 hover:bg-brand-hover active:scale-95 transition-all rounded-full px-7 py-[14px] text-[14px] font-bold"
                    >
                      {isUpdating ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Financial Summaries Table (Excel Spreadsheet Style) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Profit & Losses */}
                <div className="p-5 bg-gradient-to-br from-brand-primary/5 to-brand-hover/10 border border-brand-primary/20 rounded-[32px] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Analisis Profitabilitas Batch
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-modal/60 p-3.5 rounded-[32px] border border-border-default">
                      <p className="text-[9px] font-bold text-text-muted uppercase leading-none">Realisasi Penjualan</p>
                      <p className="text-base font-black text-text-primary mt-1.5">{formatCurrency(stats.totalRevenue)}</p>
                      <p className="text-[8px] text-text-muted font-medium mt-0.5">Omset bruto riil saat ini</p>
                    </div>

                    <div className="bg-bg-modal/60 p-3.5 rounded-[32px] border border-border-default">
                      <p className="text-[9px] font-bold text-text-muted uppercase leading-none">Laba Kotor Terjual</p>
                      <p className="text-base font-black text-status-success mt-1.5">+{formatCurrency(stats.profitSold)}</p>
                      <p className="text-[8px] text-text-muted font-medium mt-0.5">Berdasarkan HPP barang terjual</p>
                    </div>

                    <div className="bg-bg-modal/60 p-3.5 rounded-[32px] border border-border-default">
                      <p className="text-[9px] font-bold text-text-muted uppercase leading-none">Total Beban Beli Awal</p>
                      <p className="text-base font-black text-status-danger mt-1.5">-{formatCurrency(stats.totalBatchCost)}</p>
                      <p className="text-[8px] text-text-muted font-medium mt-0.5">Biaya modal 1 truk penuh</p>
                    </div>

                    <div className="bg-bg-modal/60 p-3.5 rounded-[32px] border border-border-default">
                      <p className="text-[9px] font-bold text-text-muted uppercase leading-none">Net Laba Batch (Proyeksi)</p>
                      <p className={stats.netProjectedProfit >= 0 ? "text-base font-black text-status-success mt-1.5" : "text-base font-black text-status-danger mt-1.5"}>
                        {stats.netProjectedProfit >= 0 ? "+" : ""}{formatCurrency(stats.netProjectedProfit)}
                      </p>
                      <p className="text-[8px] text-text-muted font-medium mt-0.5">Selisih Omset - Beban Beli Awal</p>
                    </div>
                  </div>
                </div>

                {/* Batch Actions and Quick Controls */}
                <div className="p-8 bg-bg-card border border-border-default rounded-[32px] flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Aksi & Kontrol</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Kelola status dan operasional batch material ini. Selesaikan jika barang di lapangan telah habis terjual.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => setShowAdjustForm(!showAdjustForm)}
                      className="px-4 py-3 bg-bg-main border border-border-default rounded-xl text-xs font-bold text-text-secondary hover:border-brand-primary/30 hover:text-brand-primary flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Sesuaikan Stok Batch</span>
                    </button>

                    <button
                      onClick={handleToggleArchive}
                      disabled={isUpdating}
                      className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${batch.isArchived
                          ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20"
                          : "bg-status-danger/10 text-status-danger border border-status-danger/20 hover:bg-status-danger/20"
                        }`}
                    >
                      <Archive className="w-4 h-4" />
                      <span>{batch.isArchived ? "Aktifkan Batch" : "Arsipkan Batch"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Excel spreadsheet list of Sales (allocated to this batch) */}
              <div className="rounded-[32px] border border-border-default bg-bg-card overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-main/50">
                  <div className="flex items-center space-x-2">
                    <History className="w-4.5 h-4.5 text-text-muted" />
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Detail Realisasi Penjualan Riil</h4>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="px-3.5 py-1.5 bg-status-success text-text-inverse text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all shadow-sm shadow-status-success/10 rounded-full"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ekspor Excel</span>
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-main border-b border-border-subtle">
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center w-12">No</th>
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">No Invoice</th>
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Kuantitas</th>
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Harga Jual</th>
                        <th className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Subtotal Omset</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {processedAllocations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-text-muted font-bold text-xs italic">
                            Belum ada realisasi penjualan yang teralokasi dari batch ini.
                          </td>
                        </tr>
                      ) : (
                        processedAllocations.map((alloc: any, idx: number) => (
                          <tr key={alloc.id} className="transition-colors hover:bg-bg-main/20">
                            <td className="px-5 py-3 text-xs text-text-muted text-center font-mono">{idx + 1}</td>
                            <td className="px-5 py-3 text-xs font-bold text-text-secondary">
                              {new Date(alloc.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-5 py-3 text-xs font-mono font-bold text-brand-primary">
                              #{alloc.invoiceNumber.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-5 py-3 text-xs font-black text-center text-text-secondary">
                              {alloc.qtyText}
                              {alloc.isBonus && (
                                <span className="ml-1.5 px-1 py-0.5 rounded bg-status-warning/10 text-status-warning text-[8px] font-black uppercase">BONUS</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs font-black text-right text-text-secondary">
                              {formatCurrency(alloc.unitPrice)}
                            </td>
                            <td className="px-5 py-3 text-sm font-black text-right text-text-primary">
                              {formatCurrency(alloc.subtotal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-30 p-8 lg:p-8 border-t border-border-subtle/50 bg-bg-card flex-shrink-0 flex items-center justify-between">
          <p className="text-[10px] font-bold text-text-muted italic">
            * Laporan di atas merepresentasikan yield riil dari pemecahan batch material.
          </p>
          <button
            onClick={onClose}
            className=".5 bg-bg-main border border-border-default text-text-secondary font-bold hover:bg-bg-card hover:text-text-primary active:scale-95 transition-all rounded-full px-6 py-[12px] text-[14px] font-bold"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};
