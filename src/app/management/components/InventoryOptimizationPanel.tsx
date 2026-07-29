"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, RefreshCw, CheckCircle2, AlertTriangle,
  TrendingUp, Package, ChevronDown, ChevronUp, Zap, Info
} from "lucide-react";
import { cn, formatCurrency } from "../../../lib/utils";
import { useAuthStore } from "../../../store/useAuthStore";

interface OptimizationResult {
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  currentMinStock: number;
  currentMaxStock: number | null;
  currentAbcCategory: "A" | "B" | "C" | null;
  leadTime: number;
  totalBaseUnitsSold: number;
  peakMonthKey: string | null;
  peakMonthSales: number;
  peakDailyDemand: number;
  totalUsageValue: number;
  cumulativePercentage: number;
  newAbcCategory: "A" | "B" | "C";
  suggestedMin: number;          // Base Unit — disimpan ke DB
  suggestedMax: number;          // Base Unit — disimpan ke DB
  mainConversionFactor: number;  // Faktor satuan terbesar (mis: 1 Karung = 50 Pcs → factor=50)
  mainUnitName: string;          // Nama satuan terbesar (mis: "Karung", "Dus", "Sak")
  hasChanged: boolean;
}

// Helper: konversi dari base unit ke satuan terbesar untuk tampilan
const toMainUnit = (baseValue: number, factor: number): number =>
  Math.ceil(baseValue / factor);

const ABC_CONFIG = {
  A: { label: "A", color: "text-status-danger", bg: "bg-status-danger/10", border: "border-status-danger/30", desc: "Prioritas Tinggi (80% nilai investasi)" },
  B: { label: "B", color: "text-status-warning", bg: "bg-status-warning/10", border: "border-status-warning/30", desc: "Prioritas Sedang (15% nilai investasi)" },
  C: { label: "C", color: "text-status-success", bg: "bg-status-success/10", border: "border-status-success/30", desc: "Prioritas Rendah (5% nilai investasi)" },
};

const AbcBadge = ({ category }: { category: "A" | "B" | "C" | null }) => {
  if (!category) return <span className="text-[10px] text-text-muted font-bold">—</span>;
  const cfg = ABC_CONFIG[category];
  return (
    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border", cfg.color, cfg.bg, cfg.border)}>
      {cfg.label}
    </span>
  );
};

const formatDate = (isoString: string | null) => {
  if (!isoString) return "Belum pernah";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Format salah";
  }
};

export default function InventoryOptimizationPage() {
  const { token } = useAuthStore();
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyMinStock, setApplyMinStock] = useState(true);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterChanged, setFilterChanged] = useState(false);

  // State untuk melacak status pembaruan otomatis & manual dari penjadwal
  const [lastAutoRun, setLastAutoRun] = useState<string | null>(null);
  const [lastManualRun, setLastManualRun] = useState<string | null>(null);

  // Ambil status penjadwal dari backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory-optimization/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLastAutoRun(data.lastAutoRun);
        setLastManualRun(data.lastManualRun);
      }
    } catch (err) {
      console.error("Gagal mengambil status penjadwal:", err);
    }
  }, [token]);

  // Ambil status saat halaman pertama kali dimuat
  useEffect(() => {
    if (token) {
      fetchStatus();
    }
  }, [token, fetchStatus]);

  // Parameter Konfigurasi Dinamis (Solusi 3 & 5)
  const [monthsRange, setMonthsRange] = useState(3);
  const [limitA, setLimitA] = useState(80);
  const [limitB, setLimitB] = useState(95);
  const [holdingInterval, setHoldingInterval] = useState(14);

  const fetchPreview = useCallback(async () => {
    setIsLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch(
        `/api/inventory-optimization/preview?monthsRange=${monthsRange}&limitA=${limitA}&limitB=${limitB}&holdingInterval=${holdingInterval}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        // Auto-select items yang berubah
        const changedIds = new Set<string>(
          data.data.filter((r: OptimizationResult) => r.hasChanged).map((r: OptimizationResult) => r.productId)
        );
        setSelectedIds(changedIds);
      }
    } catch (err) {
      console.error("Gagal mengambil data preview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, monthsRange, limitA, limitB, holdingInterval]);

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setIsApplying(true);
    setApplyResult(null);
    try {
      // Solusi 6: Kirim data komparatif/optimasi lengkap dari baris yang dicentang
      const selectedOptimizations = results
        .filter(r => selectedIds.has(r.productId))
        .map(r => ({
          productId: r.productId,
          newAbcCategory: r.newAbcCategory,
          suggestedMin: r.suggestedMin,
          suggestedMax: r.suggestedMax,
        }));

      const res = await fetch("/api/inventory-optimization/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optimizations: selectedOptimizations,
          applyMinStock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApplyResult(`✅ ${data.message}`);
        // Refresh data dan status pembaruan terakhir
        await Promise.all([fetchPreview(), fetchStatus()]);
      }
    } catch (err) {
      setApplyResult("❌ Gagal menerapkan rekomendasi.");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const displayedResults = filterChanged ? results.filter(r => r.hasChanged) : results;
    if (selectedIds.size === displayedResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedResults.map(r => r.productId)));
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayedResults = filterChanged ? results.filter(r => r.hasChanged) : results;

  const abcSummary = results.reduce((acc, r) => {
    acc[r.newAbcCategory] = (acc[r.newAbcCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <span className="p-2 bg-brand-primary/10 rounded-xl">
              <BarChart3 className="w-6 h-6 text-brand-primary" />
            </span>
            Optimasi Stok ABC & Min-Max
          </h1>
          <p className="text-sm text-text-muted mt-1 ml-[52px]">
            Klasifikasi barang berdasarkan nilai investasi & rekomendasi stok minimum dinamis berbasis data penjualan.
          </p>
        </div>
        <button
          onClick={fetchPreview}
          disabled={isLoading}
          className="flex items-center gap-2 bg-brand-primary text-white font-bold hover:bg-brand-hover transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-primary/20 self-start lg:self-auto rounded-full px-7 py-[14px] text-[14px] font-bold"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          {isLoading ? "Menghitung..." : "Hitung Kalkulasi"}
        </button>
      </div>

      {/* Parameter Configuration Panel (Solusi 3 & 5) */}
      <div className="bg-bg-card border border-border-default rounded-[32px] p-8 lg:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-primary" />
            <h2 className="text-sm font-black text-text-primary uppercase tracking-wider">Konfigurasi Parameter Optimasi</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-main border border-border-subtle rounded-[24px] text-text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <span>Auto-Run: <strong className="text-text-primary">{formatDate(lastAutoRun)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-main border border-border-subtle rounded-[24px] text-text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              <span>Manual-Run: <strong className="text-text-primary">{formatDate(lastManualRun)}</strong></span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Months Range */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-secondary uppercase tracking-wide">Rentang Analisis Penjualan</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="12"
                value={monthsRange}
                onChange={e => setMonthsRange(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                className="w-full px-3.5 py-2 bg-bg-main border border-border-default rounded-xl font-bold text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
              />
              <span className="text-xs text-text-muted font-bold whitespace-nowrap">Bulan</span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Mengevaluasi transaksi historis dalam jangka waktu ini.</p>
          </div>

          {/* Limit A */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-secondary uppercase tracking-wide">Batas Kumulatif Kategori A</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                max="90"
                value={limitA}
                onChange={e => {
                  const val = Math.max(50, Math.min(90, parseInt(e.target.value) || 50));
                  setLimitA(val);
                  if (limitB <= val) setLimitB(val + 5);
                }}
                className="w-full px-3.5 py-2 bg-bg-main border border-border-default rounded-xl font-bold text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
              />
              <span className="text-xs text-text-muted font-bold">%</span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Ambang persentase kumulatif untuk barang prioritas utama.</p>
          </div>

          {/* Limit B */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-secondary uppercase tracking-wide">Batas Kumulatif Kategori B</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="70"
                max="99"
                value={limitB}
                onChange={e => setLimitB(Math.max(limitA + 1, Math.min(99, parseInt(e.target.value) || limitA + 1)))}
                className="w-full px-3.5 py-2 bg-bg-main border border-border-default rounded-xl font-bold text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
              />
              <span className="text-xs text-text-muted font-bold">%</span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Ambang persentase kumulatif untuk prioritas menengah.</p>
          </div>

          {/* Holding Interval */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-secondary uppercase tracking-wide">Hari Penahanan Stok (Max)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="7"
                max="60"
                value={holdingInterval}
                onChange={e => setHoldingInterval(Math.max(7, Math.min(60, parseInt(e.target.value) || 7)))}
                className="w-full px-3.5 py-2 bg-bg-main border border-border-default rounded-xl font-bold text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
              />
              <span className="text-xs text-text-muted font-bold">Hari</span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Interval hari penahanan stok untuk menentukan rekomendasi batas atas.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - hanya tampil kalau sudah ada data */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {(["A", "B", "C"] as const).map(cat => (
              <div key={cat} className={cn("p-4 rounded-2xl border", ABC_CONFIG[cat].bg, ABC_CONFIG[cat].border)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-3xl font-black", ABC_CONFIG[cat].color)}>{abcSummary[cat] || 0}</span>
                  <AbcBadge category={cat} />
                </div>
                <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-wider", ABC_CONFIG[cat].color)}>
                  {ABC_CONFIG[cat].desc}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!isLoading && results.length === 0 && (
        <div className="bg-bg-card border border-border-default rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-5 bg-brand-primary/10 rounded-[32px]">
            <TrendingUp className="w-12 h-12 text-brand-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-text-primary">Siap Menghitung</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm">
              Tekan tombol <strong>"Hitung Kalkulasi"</strong> untuk menganalisis penjualan 3 bulan terakhir
              dan mendapatkan rekomendasi Klasifikasi ABC serta Min-Max Stok Dinamis.
            </p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-bg-card border border-border-default rounded-[32px] overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 lg:p-5 border-b border-border-subtle flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterChanged}
                  onChange={e => setFilterChanged(e.target.checked)}
                  className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
                />
                Tampilkan hanya yang berubah
              </label>
              <span className="text-[11px] text-text-muted bg-bg-main px-2 py-0.5 rounded-lg font-bold border border-border-subtle">
                {displayedResults.length} barang
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyMinStock}
                  onChange={e => setApplyMinStock(e.target.checked)}
                  className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
                />
                Update Min Stock Aktif
              </label>

              {applyResult && (
                <span className="text-xs font-bold text-status-success animate-in fade-in">{applyResult}</span>
              )}

              <button
                onClick={handleApply}
                disabled={isApplying || selectedIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-status-success/90 text-white font-bold text-xs hover:bg-status-success transition-all active:scale-95 disabled:opacity-40 shadow-md rounded-full"
              >
                <Zap className={cn("w-3.5 h-3.5", isApplying && "animate-pulse")} />
                {isApplying ? "Menerapkan..." : `Terapkan (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-bg-main border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <button
                      onClick={toggleAll}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedIds.size === displayedResults.length && displayedResults.length > 0
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "border-border-default"
                      )}
                    >
                      {selectedIds.size === displayedResults.length && displayedResults.length > 0 && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted">Barang</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted text-center w-20">Kategori</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">Stok Saat Ini</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span>Min Lama</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-brand-primary">Rec. Min</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-status-danger">🔴 Perlu naik</span>
                        <span className="text-[8px] font-bold text-status-success">🟢 Sudah oke</span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-text-muted text-right text-brand-primary">Rec. Max</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {displayedResults.map(r => (
                  <React.Fragment key={r.productId}>
                    <tr className={cn(
                      "hover:bg-bg-main/40 transition-colors",
                      selectedIds.has(r.productId) && "bg-brand-primary/5",
                      r.hasChanged && "border-l-2 border-l-brand-primary"
                    )}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(r.productId)}
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            selectedIds.has(r.productId)
                              ? "bg-brand-primary border-brand-primary text-white"
                              : "border-border-default hover:border-brand-primary/50"
                          )}
                        >
                          {selectedIds.has(r.productId) && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-text-primary text-sm">{r.productName}</span>
                          <span className="text-[10px] font-mono text-text-muted">{r.productCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AbcBadge category={r.currentAbcCategory} />
                          {r.currentAbcCategory !== r.newAbcCategory && (
                            <>
                              <span className="text-[10px] text-text-muted">→</span>
                              <AbcBadge category={r.newAbcCategory} />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm text-text-primary">
                            {toMainUnit(r.currentStock, r.mainConversionFactor)}
                          </span>
                          <span className="text-[9px] text-text-muted">{r.mainUnitName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm text-text-secondary">
                            {toMainUnit(r.currentMinStock, r.mainConversionFactor)}
                          </span>
                          <span className="text-[9px] text-text-muted">{r.mainUnitName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "font-black text-sm",
                            toMainUnit(r.suggestedMin, r.mainConversionFactor) > toMainUnit(r.currentMinStock, r.mainConversionFactor)
                              ? "text-status-danger"
                              : "text-status-success"
                          )}>
                            {toMainUnit(r.suggestedMin, r.mainConversionFactor)}
                          </span>
                          <span className="text-[9px] text-text-muted">{r.mainUnitName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-black text-sm text-brand-primary">
                            {toMainUnit(r.suggestedMax, r.mainConversionFactor)}
                          </span>
                          <span className="text-[9px] text-text-muted">{r.mainUnitName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRowExpand(r.productId)}
                          className="p-1.5 rounded-lg hover:bg-bg-main text-text-muted hover:text-text-primary transition-colors"
                        >
                          {expandedRows.has(r.productId) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedRows.has(r.productId) && (
                      <tr>
                        <td colSpan={8} className="bg-bg-main/30 px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Bulan Tersibuk</p>
                              <p className="text-sm font-bold text-text-primary">{r.peakMonthKey || "—"}</p>
                              <p className="text-[10px] text-text-muted">{toMainUnit(r.peakMonthSales, r.mainConversionFactor)} {r.mainUnitName}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Rata-rata Harian Peak</p>
                              <p className="text-sm font-bold text-text-primary">
                                {(r.peakDailyDemand / r.mainConversionFactor).toFixed(2)} {r.mainUnitName}/hari
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Lead Time Supplier</p>
                              <p className="text-sm font-bold text-text-primary">{r.leadTime} hari</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Nilai Investasi (ABC)</p>
                              <p className="text-sm font-bold text-text-primary">{formatCurrency(r.totalUsageValue)}</p>
                              <p className="text-[10px] text-text-muted">Kumulatif: {r.cumulativePercentage}%</p>
                            </div>
                            <div className="col-span-2 md:col-span-4 mt-1 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-[24px]">
                              <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1">💡 Saran Tindakan</p>
                              {r.totalBaseUnitsSold === 0 ? (
                                <p className="text-xs text-status-warning font-bold">Tidak ada data penjualan. Pastikan transaksi tercatat agar rekomendasi akurat.</p>
                              ) : toMainUnit(r.suggestedMin, r.mainConversionFactor) > toMainUnit(r.currentMinStock, r.mainConversionFactor) ? (
                                <p className="text-xs text-text-primary">
                                  🔴 <strong>Naikkan ambang pesan ulang</strong> dari{" "}
                                  <strong>{toMainUnit(r.currentMinStock, r.mainConversionFactor)} {r.mainUnitName}</strong> menjadi{" "}
                                  <strong className="text-status-danger">{toMainUnit(r.suggestedMin, r.mainConversionFactor)} {r.mainUnitName}</strong>.
                                  Pada musim ramai, stok bisa habis sebelum supplier tiba.
                                  Saat stok menyentuh angka itu, segera pesan ke supplier sebanyak{" "}
                                  <strong className="text-brand-primary">{Math.max(0, toMainUnit(r.suggestedMax, r.mainConversionFactor) - toMainUnit(r.currentStock, r.mainConversionFactor))} {r.mainUnitName}</strong>.
                                </p>
                              ) : (
                                <p className="text-xs text-text-primary">
                                  🟢 <strong>Ambang pesan ulang saat ini cukup aman</strong> ({toMainUnit(r.currentMinStock, r.mainConversionFactor)} {r.mainUnitName}).
                                  Jika stok di bawah{" "}
                                  <strong className="text-status-success">{toMainUnit(r.suggestedMin, r.mainConversionFactor)} {r.mainUnitName}</strong>,
                                  pesan ke supplier sebanyak{" "}
                                  <strong className="text-brand-primary">{Math.max(0, toMainUnit(r.suggestedMax, r.mainConversionFactor) - toMainUnit(r.currentStock, r.mainConversionFactor))} {r.mainUnitName}</strong>.
                                </p>
                              )}
                            </div>
                          </div>
                          {r.totalBaseUnitsSold === 0 && (
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-status-warning font-bold">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              Tidak ada data penjualan dalam 3 bulan terakhir. Rekomendasi menggunakan nilai stok minimum lama sebagai fallback.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden flex flex-col divide-y divide-border-subtle">
            {displayedResults.map(r => (
              <div key={r.productId} className={cn("p-4 space-y-3", selectedIds.has(r.productId) && "bg-brand-primary/5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => toggleSelect(r.productId)}
                      className={cn(
                        "mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedIds.has(r.productId) ? "bg-brand-primary border-brand-primary text-white" : "border-border-default"
                      )}
                    >
                      {selectedIds.has(r.productId) && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary text-sm leading-tight">{r.productName}</p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">{r.productCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <AbcBadge category={r.currentAbcCategory} />
                    {r.currentAbcCategory !== r.newAbcCategory && (
                      <>
                        <span className="text-[10px] text-text-muted">→</span>
                        <AbcBadge category={r.newAbcCategory} />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-bg-main rounded-[24px] p-2">
                    <p className="text-[9px] font-bold uppercase text-text-muted tracking-widest">Min Lama</p>
                    <p className="text-sm font-black text-text-secondary mt-0.5">
                      {toMainUnit(r.currentMinStock, r.mainConversionFactor)}
                    </p>
                    <p className="text-[9px] text-text-muted">{r.mainUnitName}</p>
                  </div>
                  <div className="bg-brand-primary/10 rounded-[24px] p-2 border border-brand-primary/20">
                    <p className="text-[9px] font-bold uppercase text-brand-primary tracking-widest">Rec. Min</p>
                    <p className="text-sm font-black text-brand-primary mt-0.5">
                      {toMainUnit(r.suggestedMin, r.mainConversionFactor)}
                    </p>
                    <p className="text-[9px] text-brand-primary/60">{r.mainUnitName}</p>
                  </div>
                  <div className="bg-brand-primary/5 rounded-[24px] p-2">
                    <p className="text-[9px] font-bold uppercase text-text-muted tracking-widest">Rec. Max</p>
                    <p className="text-sm font-black text-text-primary mt-0.5">
                      {toMainUnit(r.suggestedMax, r.mainConversionFactor)}
                    </p>
                    <p className="text-[9px] text-text-muted">{r.mainUnitName}</p>
                  </div>
                </div>

                {r.totalBaseUnitsSold === 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-status-warning font-bold">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Tidak ada data penjualan (fallback ke min stock lama)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Keterangan Operasional Footer */}
          <div className="p-4 border-t border-border-subtle bg-bg-main/30 flex items-start gap-3">
            <Info className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-text-muted leading-relaxed space-y-1.5">
              <p>
                <strong>Klasifikasi ABC</strong> — berdasarkan kumulatif <em>Nilai Investasi</em> (Qty Terjual × Harga Beli)
                3 bulan terakhir: <strong>A</strong> = 80% teratas (prioritas utama), <strong>B</strong> = 15%, <strong>C</strong> = 5% terbawah.
              </p>
              <p>
                <strong>Rec. Min</strong> — titik ambang <em>kapan harus pesan</em> ke supplier.
                🔴 Merah = ambang terlalu rendah, perlu dinaikkan. 🟢 Hijau = ambang sudah aman.
                Rumus: <em>⌈ Rata-rata Harian Bulan Tersibuk × Lead Time ⌉</em>.
              </p>
              <p>
                <strong>Rec. Max</strong> — batas <em>berapa banyak stok</em> setelah pengisian ulang.
                Saat memesan, targetkan stok mencapai angka ini. Jangan melebihi agar modal tidak tertahan di gudang.
                Klik ▾ pada baris barang untuk melihat saran tindakan spesifik.
              </p>
              <p className="text-text-muted/70">
                Semua angka ditampilkan dalam <strong>satuan terbesar</strong> sesuai operasional toko.
                Nilai yang tersimpan ke database tetap dalam satuan dasar untuk akurasi kalkulasi multi-satuan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
