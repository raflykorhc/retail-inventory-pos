import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { PrintableNota } from "../../components/printing/PrintableNota";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users, 
  DollarSign,
  Filter,
  FileSpreadsheet,
  File as FileIcon,
  X,
  Eye,
  Printer,
  Package,
  CreditCard,
  ArrowUpRight,
  Receipt,
  Box,
  AlertTriangle,
  EyeOff,
  ArrowRightLeft,
  Archive,
  AlertCircle,
  Gift,
  History,
  Search,
  Trash2
} from "lucide-react";
import { cn, formatCurrency, formatMultiUnitStock, formatPaymentMethod } from "../../lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useTheme } from "../../context/ThemeContext";
import { SummaryCard } from '@/components/SummaryCard';
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { motion, AnimatePresence } from "motion/react";
import { Can } from "../../components/auth/Can";
import { useAuthStore } from "../../store/useAuthStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const toLocalDateString = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};


const COLORS = ['#0F4A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ReportsPage() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"SALES" | "EXPENSES" | "PURCHASES" | "STOCK" | "PROFIT_LOSS">("SALES");
  const [period, setPeriod] = useState<Period>("monthly");
  
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [dateRange, setDateRange] = useState({
    start: toLocalDateString(firstDayOfMonth),
    end: toLocalDateString(today)
  });

  // We'll fetch full data for exports only when needed
  const [fullExportData, setFullExportData] = useState<any[] | null>(null);

  const placeholderSales = useMemo(() => [
    { id: "s1", invoiceNumber: "INV-20260616-001", createdAt: "2026-06-16T09:00:00.000Z", customer: { name: "Budi Santoso" }, paymentMethod: "CASH", totalAmount: 1500000, paymentStatus: "LUNAS" },
    { id: "s2", invoiceNumber: "INV-20260616-002", createdAt: "2026-06-16T09:15:00.000Z", customer: { name: "Siti Rahma" }, paymentMethod: "TRANSFER", totalAmount: 3450000, paymentStatus: "LUNAS" },
    { id: "s3", invoiceNumber: "INV-20260616-003", createdAt: "2026-06-16T10:00:00.000Z", customer: null, paymentMethod: "CASH", totalAmount: 120000, paymentStatus: "LUNAS" },
    { id: "s4", invoiceNumber: "INV-20260616-004", createdAt: "2026-06-16T10:30:00.000Z", customer: { name: "Ahmad Fauzi" }, paymentMethod: "DEBT", totalAmount: 4800000, paymentStatus: "PIUTANG" }
  ], []);

  const placeholderExpenses = useMemo(() => [
    { id: "e1", createdAt: "2026-06-16T10:00:00.000Z", category: "Operasional Toko", description: "Pembelian ATK & Token Listrik", amount: 250000 },
    { id: "e2", createdAt: "2026-06-16T12:00:00.000Z", category: "Gaji Karyawan", description: "Gaji Staff Toko Periode Juni", amount: 5000000 }
  ], []);

  const placeholderStockMovements = useMemo(() => [
    { id: "st1", createdAt: "2026-06-16T11:00:00.000Z", product: { name: "Semen Portland 50kg Tiga Roda", code: "BRG-001", prices: [{ price: 72000, unit: { name: "Zak" } }] }, type: "IN", quantity: 50, reason: "Restock dari Supplier PT Tiga Roda" },
    { id: "st2", createdAt: "2026-06-16T13:00:00.000Z", product: { name: "Besi Beton 10mm SNI", code: "BRG-002", prices: [{ price: 95000, unit: { name: "Batang" } }] }, type: "OUT", quantity: 12, reason: "Penjualan untuk Proyek Ruko" }
  ], []);

  const placeholderPurchases = useMemo(() => [
    { id: "p1", invoiceNumber: "PRC-20260616-001", createdAt: "2026-06-16T08:00:00.000Z", supplier: { name: "PT Tiga Roda Indonesia" }, paymentMethod: "TRANSFER", totalAmount: 12000000, paymentStatus: "LUNAS" },
    { id: "p2", invoiceNumber: "PRC-20260616-002", createdAt: "2026-06-16T11:30:00.000Z", supplier: { name: "PT Krakatau Steel" }, paymentMethod: "TRANSFER", totalAmount: 24000000, paymentStatus: "LUNAS" }
  ], []);

  const placeholderAnalyticsSales = useMemo(() => ({
    totalRevenue: 45000000,
    grossProfit: 15000000,
    totalTransactions: 120,
    averageTransaction: 375000,
    topProducts: [
      { name: "Semen Portland 50kg Tiga Roda", value: 12000000 },
      { name: "Besi Beton 10mm SNI", value: 8500000 },
      { name: "Pasir Beton (M3)", value: 6200000 }
    ],
    trendData: [
      { date: "01 Jun", total: 1200000, revenue: 1200000, profit: 400000 },
      { date: "05 Jun", total: 1500000, revenue: 1500000, profit: 500000 },
      { date: "10 Jun", total: 1800000, revenue: 1800000, profit: 600000 },
      { date: "15 Jun", total: 2200000, revenue: 2200000, profit: 700000 }
    ],
    paymentData: [
      { name: "CASH", value: 25000000 },
      { name: "TRANSFER", value: 15000000 },
      { name: "DEBT", value: 5000000 }
    ],
    totalBonusQty: 10,
    totalBonusCost: 100000,
    totalBonusValue: 150000
  }), []);

  const placeholderAnalyticsExpenses = useMemo(() => ({
    totalExpense: 8500000,
    totalTransactions: 15,
    categoryData: [
      { name: "Gaji Karyawan", value: 5000000 },
      { name: "Operasional Toko", value: 2000000 },
      { name: "Bensin & Transport", value: 1000000 }
    ]
  }), []);

  const placeholderAnalyticsPurchases = useMemo(() => ({
    totalPurchase: 36000000,
    totalTransactions: 8,
    supplierData: [
      { name: "PT Tiga Roda Indonesia", value: 15000000 },
      { name: "PT Krakatau Steel", value: 12000000 },
      { name: "Distributor Cat Utama", value: 9000000 }
    ]
  }), []);

  const placeholderStockSummary = useMemo(() => ({
    totalAssetValue: 120000000,
    totalItems: 850,
    lowStockCount: 12,
    totalProducts: 45,
    valuationBySupplier: [
      { name: "PT Tiga Roda Indonesia", value: 50000000 },
      { name: "PT Krakatau Steel", value: 45000000 },
      { name: "Distributor Cat Utama", value: 25000000 }
    ]
  }), []);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedStockType, setSelectedStockType] = useState(""); // IN, OUT, ADJUSTMENT
  
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const cid = urlParams.get('customerId');
      if (cid) {
        setCustomerIdFilter(cid);
      }
    }
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, selectedCategory, selectedPaymentMethod, selectedPaymentStatus, selectedStockType, activeTab, customerIdFilter]);

  // Modal
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [selectedStockMovement, setSelectedStockMovement] = useState<any | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isProductProfitModalOpen, setIsProductProfitModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const notaRef = useRef<HTMLDivElement>(null);
  const handlePrintNota = useReactToPrint({
    contentRef: notaRef,
    documentTitle: `Nota_${selectedSale?.invoiceNumber || 'INV'}`,
  });

  // REACT QUERY FOR REPORTS
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
    staleTime: 60000,
  });
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];

  // Table Data Query
  const tableQuery = useQuery({
    queryKey: ['reports', 'table', activeTab, dateRange, selectedCategory, selectedPaymentMethod, selectedPaymentStatus, selectedStockType, customerIdFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const paginationParams = `&page=${currentPage}&limit=${itemsPerPage}`;
      if (activeTab === "SALES") {
        let baseUrl = `/api/reports/sales?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        if (selectedCategory) baseUrl += `&categoryId=${selectedCategory}`;
        if (selectedPaymentMethod) baseUrl += `&paymentMethod=${selectedPaymentMethod}`;
        if (selectedPaymentStatus) baseUrl += `&paymentStatus=${selectedPaymentStatus}`;
        if (customerIdFilter) baseUrl += `&customerId=${customerIdFilter}`;
        return (await fetch(baseUrl + paginationParams)).json();
      } else if (activeTab === "EXPENSES") {
        let baseUrl = `/api/expenses?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        return (await fetch(baseUrl + paginationParams)).json();
      } else if (activeTab === "PURCHASES") {
        let baseUrl = `/api/purchases?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        return (await fetch(baseUrl + paginationParams)).json();
      } else if (activeTab === "STOCK") {
        let baseUrl = `/api/reports/stock/movements?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        if (selectedCategory) baseUrl += `&categoryId=${selectedCategory}`;
        if (selectedStockType) baseUrl += `&type=${selectedStockType}`;
        return (await fetch(baseUrl + paginationParams)).json();
      } 
      return { items: [], total: 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
    enabled: activeTab !== "PROFIT_LOSS",
  });

  // Analytics / Summary Query
  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary', activeTab, dateRange, selectedCategory, selectedPaymentMethod, selectedPaymentStatus, selectedStockType, customerIdFilter],
    queryFn: async () => {
      if (activeTab === "SALES") {
        let url = `/api/reports/sales/summary?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        if (selectedCategory) url += `&categoryId=${selectedCategory}`;
        if (selectedPaymentMethod) url += `&paymentMethod=${selectedPaymentMethod}`;
        if (selectedPaymentStatus) url += `&paymentStatus=${selectedPaymentStatus}`;
        if (customerIdFilter) url += `&customerId=${customerIdFilter}`;
        return (await fetch(url)).json();
      } else if (activeTab === "EXPENSES") {
        return (await fetch(`/api/reports/expenses/summary?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`)).json();
      } else if (activeTab === "PURCHASES") {
        return (await fetch(`/api/reports/purchases/summary?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`)).json();
      } else if (activeTab === "STOCK") {
        let url = `/api/reports/stock/movements?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
        if (selectedCategory) url += `&categoryId=${selectedCategory}`;
        if (selectedStockType) url += `&type=${selectedStockType}`;
        const [movementsRes, summaryRes] = await Promise.all([
          fetch(url),
          fetch("/api/reports/stock/summary")
        ]);
        return {
          movements: await movementsRes.json(),
          summary: await summaryRes.json()
        };
      } else if (activeTab === "PROFIT_LOSS") {
        const params = new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end
        });
        return (await fetch(`/api/dashboard/stats?${params}`)).json();
      }
      return null;
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const isLoading = tableQuery.isFetching || summaryQuery.isFetching;

  // Resolve derived data
  const rawSales = activeTab === "SALES" ? (Array.isArray(tableQuery.data) ? tableQuery.data : (tableQuery.data?.items || [])) : [];
  const rawExpenses = activeTab === "EXPENSES" ? (Array.isArray(tableQuery.data) ? tableQuery.data : (tableQuery.data?.items || [])) : [];
  const rawPurchases = activeTab === "PURCHASES" ? (Array.isArray(tableQuery.data) ? tableQuery.data : (tableQuery.data?.items || [])) : [];
  const rawStockMovements = activeTab === "STOCK" ? (Array.isArray(tableQuery.data) ? tableQuery.data : (tableQuery.data?.items || [])) : [];
  
  const totalItems = activeTab !== "PROFIT_LOSS" ? (Array.isArray(tableQuery.data) ? tableQuery.data.length : (tableQuery.data?.total || 0)) : 0;

  const rawAnalyticsSales = (activeTab === "SALES" && summaryQuery.data?.totalRevenue !== undefined) ? summaryQuery.data : null;
  const rawAnalyticsExpenses = (activeTab === "EXPENSES" && summaryQuery.data?.categoryData !== undefined) ? summaryQuery.data : null;
  const rawAnalyticsPurchases = (activeTab === "PURCHASES" && summaryQuery.data?.supplierData !== undefined) ? summaryQuery.data : null;
  const rawAnalyticsStockMovements = activeTab === "STOCK" ? (Array.isArray(summaryQuery.data?.movements) ? summaryQuery.data.movements : (summaryQuery.data?.movements?.items || [])) : [];
  const rawStockSummary = activeTab === "STOCK" ? summaryQuery.data?.summary : { totalAssetValue: 0, totalItems: 0, lowStockCount: 0, totalProducts: 0 };
  const profitLossData = (activeTab === "PROFIT_LOSS" && summaryQuery.data?.metrics) ? summaryQuery.data : { metrics: { totalRevenue: 0, totalHPP: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 }, expensesBreakdown: [] };

  const sales = (isLoading && rawSales.length === 0) ? placeholderSales : rawSales;
  const analyticsSales = (isLoading && !rawAnalyticsSales) ? placeholderAnalyticsSales : rawAnalyticsSales;
  const expenses = (isLoading && rawExpenses.length === 0) ? placeholderExpenses : rawExpenses;
  const analyticsExpenses = (isLoading && !rawAnalyticsExpenses) ? placeholderAnalyticsExpenses : rawAnalyticsExpenses;
  const purchases = (isLoading && rawPurchases.length === 0) ? placeholderPurchases : rawPurchases;
  const analyticsPurchases = (isLoading && !rawAnalyticsPurchases) ? placeholderAnalyticsPurchases : rawAnalyticsPurchases;
  const stockMovements = (isLoading && rawStockMovements.length === 0) ? placeholderStockMovements : rawStockMovements;
  const analyticsStockMovements = (isLoading && rawAnalyticsStockMovements.length === 0) ? placeholderStockMovements : rawAnalyticsStockMovements;
  const stockSummary = (isLoading && (!rawStockSummary || rawStockSummary.totalProducts === 0)) ? placeholderStockSummary : rawStockSummary;
  const profitLoss = profitLossData;

  useEffect(() => {
    const t = new Date();
    if (period === "daily") {
      setDateRange({
        start: toLocalDateString(t),
        end: toLocalDateString(t)
      });
    } else if (period === "weekly") {
      const lastWeek = new Date(t.getTime() - 7 * 24 * 60 * 60 * 1000);
      setDateRange({
        start: toLocalDateString(lastWeek),
        end: toLocalDateString(t)
      });
    } else if (period === "monthly") {
      const firstDay = new Date(t.getFullYear(), t.getMonth(), 1);
      setDateRange({
        start: toLocalDateString(firstDay),
        end: toLocalDateString(t)
      });
    } else if (period === "yearly") {
      const firstDay = new Date(t.getFullYear(), 0, 1);
      setDateRange({
        start: toLocalDateString(firstDay),
        end: toLocalDateString(t)
      });
    }
  }, [period]);

  const handleDeleteSale = async (id: string) => {
    const toast = (await import("sonner")).toast;
    setIsDeleting(true);
    
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`/api/sales/${id}`, { 
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        toast.success("Transaksi berhasil dihapus");
        setDeleteConfirmId(null);
        tableQuery.refetch();
        summaryQuery.refetch();
      } else {
        const error = await res.json();
        toast.error(error.message || "Gagal menghapus transaksi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- DERIVED DATA & ANALYTICS ---
  const salesAnalytics = useMemo(() => {
    if (analyticsSales && !Array.isArray(analyticsSales)) {
      return {
        totalRevenue: analyticsSales.totalRevenue || 0,
        grossProfit: analyticsSales.grossProfit || 0,
        totalTransactions: analyticsSales.totalTransactions || 0,
        averageTransaction: analyticsSales.averageTransaction || 0,
        topProducts: analyticsSales.topProducts || [],
        allProductsProfit: analyticsSales.allProductsProfit || [],
        trendData: (analyticsSales.trendData || []).map((t: any) => ({
          ...t,
          revenue: Number(t.revenue || 0),
          profit: Number(t.profit || 0)
        })),
        paymentData: analyticsSales.paymentData || [],
        totalBonusQty: analyticsSales.totalBonusQty || 0,
        totalBonusCost: analyticsSales.totalBonusCost || 0,
        totalBonusValue: analyticsSales.totalBonusValue || 0,
        totalDiscount: analyticsSales.totalDiscount || 0,
        totalReturnTotal: analyticsSales.totalReturnTotal || 0,
      };
    }

    // Default empty state
    return {
      totalRevenue: 0,
      grossProfit: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      topProducts: [],
      allProductsProfit: [],
      trendData: [],
      paymentData: [],
      totalBonusQty: 0,
      totalBonusCost: 0,
      totalBonusValue: 0,
      totalDiscount: 0,
      totalReturnTotal: 0,
    };
  }, [analyticsSales]);

  const expenseAnalytics = useMemo(() => {
    if (analyticsExpenses && !Array.isArray(analyticsExpenses)) {
      return {
        totalExpense: analyticsExpenses.totalExpense || 0,
        categoryData: analyticsExpenses.categoryData || [],
        totalTransactions: analyticsExpenses.totalTransactions || 0
      };
    }
    return { totalExpense: 0, categoryData: [], totalTransactions: 0 };
  }, [analyticsExpenses]);

  const purchaseAnalytics = useMemo(() => {
    if (analyticsPurchases && !Array.isArray(analyticsPurchases)) {
      return {
        totalPurchase: analyticsPurchases.totalPurchase || 0,
        supplierData: analyticsPurchases.supplierData || [],
        totalTransactions: analyticsPurchases.totalTransactions || 0
      };
    }
    return { totalPurchase: 0, supplierData: [], totalTransactions: 0 };
  }, [analyticsPurchases]);

  const supplierPerformanceData = useMemo(() => {
    const map: Record<string, { purchase: number, stockValue: number }> = {};
    purchaseAnalytics.supplierData.forEach(s => {
      map[s.name] = { purchase: s.value, stockValue: 0 };
    });
    if (stockSummary?.valuationBySupplier) {
      stockSummary.valuationBySupplier.forEach((s: any) => {
        if (!map[s.name]) map[s.name] = { purchase: 0, stockValue: 0 };
        map[s.name].stockValue = s.value;
      });
    }
    return Object.keys(map).map(k => ({
      name: k,
      purchase: map[k].purchase,
      stockValue: map[k].stockValue
    })).sort((a, b) => b.stockValue - a.stockValue);
  }, [purchaseAnalytics.supplierData, stockSummary]);

  // --- PAGINATION ---
  const currentItems = useMemo(() => {
    if (activeTab === "SALES") return sales;
    if (activeTab === "EXPENSES") return expenses;
    if (activeTab === "STOCK") return stockMovements;
    return purchases;
  }, [sales, expenses, purchases, stockMovements, activeTab]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // --- EXPORTS ---
  const fetchFullDataForExport = async () => {
    const toast = (await import("sonner")).toast;
    toast.info("Menyiapkan data laporan lengkap...");
    
    let url = "";
    if (activeTab === "SALES") {
      url = `/api/reports/sales?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
      if (selectedCategory) url += `&categoryId=${selectedCategory}`;
      if (selectedPaymentMethod) url += `&paymentMethod=${selectedPaymentMethod}`;
      if (selectedPaymentStatus) url += `&paymentStatus=${selectedPaymentStatus}`;
      if (customerIdFilter) url += `&customerId=${customerIdFilter}`;
    } else if (activeTab === "EXPENSES") {
      url = `/api/expenses?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
    } else if (activeTab === "PURCHASES") {
      url = `/api/purchases?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
    } else if (activeTab === "STOCK") {
      url = `/api/reports/stock/movements?startDate=${dateRange.start}&endDate=${dateRange.end}T23:59:59`;
      if (selectedCategory) url += `&categoryId=${selectedCategory}`;
      if (selectedStockType) url += `&type=${selectedStockType}`;
    } else if (activeTab === "PROFIT_LOSS") {
      return [profitLossData];
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items || []);
    } catch (error) {
      console.error("Failed to fetch full export data:", error);
      toast.error("Gagal mengambil data lengkap");
      return [];
    }
  };

  const exportToPDF = async () => {
    const fullData = await fetchFullDataForExport();
    if (!fullData || fullData.length === 0) return;

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
      });
    };

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header
      try {
        const logo = await loadImage("/logo.png");
        doc.addImage(logo, "PNG", 14, 12, 12, 12);
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0); // Black for Business Name
        doc.setFont("helvetica", "bold");
        doc.text("PD SUKSES BANGUNAN", 28, 22);
      } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("PD SUKSES BANGUNAN", 14, 22);
      }
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang", 14, 30);
      doc.text("Email: pdsuksesbngunan@gmail.com | Telp: +62 899-3124-264", 14, 35);
      
      doc.setDrawColor(15, 74, 138);
      doc.setLineWidth(0.5);
      doc.line(14, 39, pageWidth - 14, 39);

      // Helper: Summary Section
      const drawSummary = () => {
        const summaryY = 48;
        const boxWidth = (pageWidth - 28 - 10) / 3;
        const boxHeight = 25;
        
        const reportTitle = activeTab === "SALES" ? "LAPORAN KEUANGAN (PENJUALAN)" : activeTab === "EXPENSES" ? "LAPORAN PENGELUARAN OPERASIONAL" : activeTab === "PURCHASES" ? "LAPORAN PEMBELIAN & MODAL" : activeTab === "STOCK" ? "LAPORAN MUTASI STOK" : "LAPORAN LABA RUGI";
        const periodLabel = period === "daily" ? "Harian" : period === "weekly" ? "Mingguan" : period === "monthly" ? "Bulanan" : period === "yearly" ? "Tahunan" : "Kustom";
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(reportTitle, 14, 46);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Periode ${periodLabel}: ${dateRange.start} s/d ${dateRange.end}`, 14, 51);

        const drawBox = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
          doc.setFillColor(245, 247, 250); 
          doc.rect(x, y + 8, boxWidth, boxHeight, "F");
          
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.setFont("helvetica", "normal");
          doc.text(label, x + 5, y + 16);
          
          doc.setFontSize(11);
          doc.setTextColor(color[0], color[1], color[2]);
          doc.setFont("helvetica", "bold");
          doc.text(value, x + 5, y + 26);
        };

        if (activeTab === "SALES") {
          drawBox(14, 51, "TOTAL PENDAPATAN", formatCurrency(salesAnalytics?.totalRevenue || 0), [15, 74, 138]);
          drawBox(14 + boxWidth + 5, 51, "ESTIMASI LABA KOTOR", formatCurrency(salesAnalytics?.grossProfit || 0), [16, 185, 129]);
          drawBox(14 + (boxWidth + 5) * 2, 51, "TOTAL TRANSAKSI", `${salesAnalytics?.totalTransactions || 0} Nota`, [59, 130, 246]);
          
          // Second row for bonus metrics
          drawBox(14, 51 + boxHeight + 10, "TOTAL BARANG BONUS", `${salesAnalytics?.totalBonusQty || 0} Item`, [245, 158, 11]);
          drawBox(14 + boxWidth + 5, 51 + boxHeight + 10, "NILAI JUAL BONUS", formatCurrency(salesAnalytics?.totalBonusValue || 0), [245, 158, 11]);
          drawBox(14 + (boxWidth + 5) * 2, 51 + boxHeight + 10, "NILAI COST (HPP) BONUS", formatCurrency(salesAnalytics?.totalBonusCost || 0), [239, 68, 68]);
          
          return summaryY + (boxHeight * 2) + 27;
        } else if (activeTab === "EXPENSES") {
          drawBox(14, 51, "TOTAL PENGELUARAN", formatCurrency(expenseAnalytics?.totalExpense || 0), [239, 68, 68]);
          drawBox(14 + boxWidth + 5, 51, "JUMLAH DATA", `${expenseAnalytics?.totalTransactions || 0} Baris`, [15, 74, 138]);
          drawBox(14 + (boxWidth + 5) * 2, 51, "RATA-RATA", formatCurrency(expenseAnalytics?.totalTransactions ? expenseAnalytics.totalExpense / expenseAnalytics.totalTransactions : 0), [100, 100, 100]);
        } else if (activeTab === "PURCHASES") {
          drawBox(14, 51, "TOTAL PEMBELIAN", formatCurrency(purchaseAnalytics?.totalPurchase || 0), [15, 74, 138]);
          drawBox(14 + boxWidth + 5, 51, "TOTAL TRANSAKSI", `${purchaseAnalytics?.totalTransactions || 0} Nota`, [15, 74, 138]);
          drawBox(14 + (boxWidth + 5) * 2, 51, "SUPPLIER AKTIF", `${purchaseAnalytics?.supplierData?.length || 0} Pemasok`, [15, 74, 138]);
        } else if (activeTab === "STOCK") {
          drawBox(14, 51, "TOTAL MUTASI", `${stockMovements.length || 0} Aktivitas`, [15, 74, 138]);
          drawBox(14 + boxWidth + 5, 51, "TOTAL ASET STOK", formatCurrency(stockSummary?.totalAssetValue || 0), [16, 185, 129]);
          drawBox(14 + (boxWidth + 5) * 2, 51, "TOTAL ITEM (FISIK)", `${stockSummary?.totalItems || 0} Barang`, [15, 74, 138]);
        } else if (activeTab === "PROFIT_LOSS") {
          const pLoss = profitLossData || { metrics: { totalRevenue: 0, totalHPP: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 }, expensesBreakdown: [] };
          drawBox(14, 51, "TOTAL PENDAPATAN", formatCurrency(pLoss.metrics.totalRevenue), [15, 74, 138]);
          drawBox(14 + boxWidth + 5, 51, "TOTAL PENGELUARAN", formatCurrency(pLoss.metrics.totalExpenses), [239, 68, 68]);
          drawBox(14 + (boxWidth + 5) * 2, 51, "LABA BERSIH", formatCurrency(pLoss.metrics.netProfit), [16, 185, 129]);
        }
        
        return summaryY + boxHeight + 17;
      };

      const startY = drawSummary();

      // Table Logic
      let tableHead: string[][] = [];
      let tableData: any[][] = [];

      if (period === "yearly" && activeTab !== "STOCK") {
        tableHead = [["Bulan", "Total Transaksi", "Nominal / Omset", "Laba Bersih (Estimasi)"]];
        const monthlyMap: Record<string, { count: number, total: number, profit: number }> = {};
        const sourceData = activeTab === "SALES" ? analyticsSales : activeTab === "EXPENSES" ? analyticsExpenses : analyticsPurchases;
        
        sourceData.forEach(item => {
          const dateVal = item.createdAt || item.date;
          if (!dateVal) return;
          const d = new Date(dateVal);
          const key = d.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' });
          if (!monthlyMap[key]) monthlyMap[key] = { count: 0, total: 0, profit: 0 };
          
          monthlyMap[key].count++;
          const val = Number(item.totalAmount || item.amount || 0);
          monthlyMap[key].total += val;
          
          if (activeTab === "SALES") {
            let cost = 0;
            item.items?.forEach((i: any) => cost += (Number(i.product?.averageCost || 0) * i.quantity));
            monthlyMap[key].profit += (val - cost);
          }
        });

        tableData = Object.entries(monthlyMap).map(([month, data]) => [
          month,
          `${data.count} Transaksi`,
          formatCurrency(data.total),
          activeTab === "SALES" ? formatCurrency(data.profit) : "-"
        ]);
      } else {
        if (activeTab === "SALES") {
          tableHead = [["No", "Invoice", "Waktu", "Pelanggan", "Metode", "Status", "Total"]];
          tableData = fullData.map((s: any, idx: number) => [
            idx + 1,
            s.invoiceNumber,
            period === "daily" 
              ? new Date(s.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })
              : new Date(s.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' }),
            s.customer?.name || "Umum",
            s.paymentMethod || "CASH",
            s.paymentStatus,
            formatCurrency(Number(s.totalAmount))
          ]);
        } else if (activeTab === "EXPENSES") {
          tableHead = [["No", "Tanggal", "Kategori", "Keterangan", "Nominal"]];
          tableData = fullData.map((e: any, idx: number) => [
            idx + 1,
            new Date(e.date).toLocaleDateString("id-ID"),
            e.category,
            e.description,
            formatCurrency(Number(e.amount))
          ]);
        } else if (activeTab === "PURCHASES") {
          tableHead = [["No", "Invoice", "Pemasok", "Tanggal", "Metode", "Total"]];
          tableData = fullData.map((p: any, idx: number) => [
            idx + 1,
            p.invoiceNumber,
            p.supplier?.name || "-",
            new Date(p.createdAt).toLocaleDateString("id-ID"),
            p.paymentMethod || "CASH",
            formatCurrency(Number(p.totalAmount))
          ]);
        } else if (activeTab === "STOCK") {
          tableHead = [["No", "Waktu", "Produk", "Kategori", "Pemasok", "Jenis", "Jumlah", "Keterangan"]];
          tableData = fullData.map((s: any, idx: number) => [
            idx + 1,
            new Date(s.createdAt).toLocaleString("id-ID"),
            s.product?.name || "-",
            s.product?.category?.name || "-",
            s.product?.supplier?.name || "-",
            s.type === "IN" ? "MASUK" : s.type === "OUT" ? "KELUAR" : "PENYESUAIAN",
            s.type === "IN" ? (s.product?.prices?.length > 1 ? `+${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `+${formatMultiUnitStock(s.quantity, s.product?.prices || [])}`) : 
            s.type === "OUT" ? (s.product?.prices?.length > 1 ? `-${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `-${formatMultiUnitStock(s.quantity, s.product?.prices || [])}`) : 
            (s.product?.prices?.length > 1 ? `${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `${formatMultiUnitStock(s.quantity, s.product?.prices || [] )}`),
            s.reason || "-"
          ]);
        } else if (activeTab === "PROFIT_LOSS") {
          tableHead = [["No", "Deskripsi", "Nominal"]];
          const pLoss = profitLossData || { metrics: { totalRevenue: 0, totalHPP: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 }, expensesBreakdown: [] };
          tableData = [
            [1, "Total Pendapatan", formatCurrency(pLoss.metrics.totalRevenue)],
            [2, "Dikurangi: Total HPP", `- ${formatCurrency(pLoss.metrics.totalHPP)}`],
            [3, "Laba Kotor", formatCurrency(pLoss.metrics.grossProfit)],
            ...pLoss.expensesBreakdown.map((e: any, idx: number) => [
              idx + 4,
              `Pengeluaran: ${e.category}`,
              `- ${formatCurrency(e.amount)}`
            ]),
            [pLoss.expensesBreakdown.length + 4, "Total Pengeluaran", `- ${formatCurrency(pLoss.metrics.totalExpenses)}`],
            [pLoss.expensesBreakdown.length + 5, "Laba Bersih", formatCurrency(pLoss.metrics.netProfit)]
          ];
        }
      }

      autoTable(doc, {
        head: tableHead,
        body: tableData,
        startY: startY,
        theme: "grid",
        headStyles: { fillColor: [15, 74, 138], textColor: 255, fontSize: 9, halign: "center" },
        bodyStyles: { fontSize: 8, textColor: 50 },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          [tableHead[0].length - 1]: { halign: "right", fontStyle: "bold" }
        },
        margin: { horizontal: 14 }
      });

      const now = new Date().toLocaleString("id-ID");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Dicetak pada: ${now} | Halaman ${doc.getNumberOfPages()}`, 14, pageHeight - 10);

      doc.save(`Laporan_${activeTab}_${period}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Gagal membuat PDF. Silakan periksa konsol.");
    }
  };

  const exportToExcel = async () => {
    const fullData = await fetchFullDataForExport();
    if (!fullData || fullData.length === 0) return;

    let data: any[] = [];
    let sheetName = "";
    const periodLabel = period === "daily" ? "Harian" : period === "weekly" ? "Mingguan" : period === "monthly" ? "Bulanan" : period === "yearly" ? "Tahunan" : "Kustom";

    if (period === "yearly" && activeTab !== "STOCK") {
      // Yearly Summary Aggregation
      const monthlyMap: Record<string, { count: number, total: number, profit: number, cost: number, bonusQty: number, bonusCost: number, bonusValue: number }> = {};
      const sourceData = fullData;
      
      sourceData.forEach((item: any) => {
        const dateVal = item.createdAt || item.date;
        if (!dateVal) return;
        const d = new Date(dateVal);
        const key = d.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' });
        if (!monthlyMap[key]) monthlyMap[key] = { count: 0, total: 0, profit: 0, cost: 0, bonusQty: 0, bonusCost: 0, bonusValue: 0 };
        
        monthlyMap[key].count++;
        const val = Number(item.totalAmount || item.amount || 0);
        monthlyMap[key].total += val;
        
        if (activeTab === "SALES") {
          let cost = 0;
          let bonusQty = 0;
          let bonusCost = 0;
          let bonusValue = 0;

          item.items?.forEach((i: any) => {
            let itemCost = 0;
            if (i.batchAllocations && i.batchAllocations.length > 0) {
              itemCost = i.batchAllocations.reduce((sum: number, b: any) => sum + (Number(b.costPrice) * b.quantity), 0);
            } else {
              itemCost = Number(i.product?.averageCost || 0) * i.quantity;
            }
            cost += itemCost;

            if (i.isBonus) {
              bonusQty += i.quantity;
              bonusCost += itemCost;
              const standardPrice = Number(i.product?.prices?.find((p: any) => p.unitId === i.unitId)?.price || 0);
              bonusValue += (standardPrice * i.quantity);
            }
          });

          monthlyMap[key].cost += cost;
          monthlyMap[key].profit += (val - cost);
          monthlyMap[key].bonusQty += bonusQty;
          monthlyMap[key].bonusCost += bonusCost;
          monthlyMap[key].bonusValue += bonusValue;
        }
      });

      data = Object.entries(monthlyMap).map(([month, stats]) => {
        const row: any = {
          "Bulan": month,
          "Jumlah Transaksi": stats.count,
          "Total Nominal": stats.total
        };
        if (activeTab === "SALES") {
          row["Total Modal"] = stats.cost;
          row["Total Laba Bersih"] = stats.profit;
          row["Total Barang Bonus"] = stats.bonusQty;
          row["Total Nilai Jual Bonus"] = stats.bonusValue;
          row["Total Nilai Cost (HPP) Bonus"] = stats.bonusCost;
        }
        return row;
      });
      sheetName = `Rekap Tahunan ${activeTab}`;
    } else {
      // Detailed List based on Tab
      if (activeTab === "SALES") {
        data = fullData.map((s: any) => {
          let totalCost = 0;
          let totalBonusQty = 0;
          let totalBonusCost = 0;
          let totalBonusValue = 0;

          s.items?.forEach((item: any) => {
            let itemCost = 0;
            if (item.batchAllocations && item.batchAllocations.length > 0) {
              itemCost = item.batchAllocations.reduce((sum: number, b: any) => sum + (Number(b.costPrice) * b.quantity), 0);
            } else {
              itemCost = Number(item.product?.averageCost || 0) * item.quantity;
            }
            totalCost += itemCost;

            if (item.isBonus) {
              totalBonusQty += item.quantity;
              totalBonusCost += itemCost;
              const standardPrice = Number(item.product?.prices?.find((p: any) => p.unitId === item.unitId)?.price || 0);
              totalBonusValue += (standardPrice * item.quantity);
            }
          });
          
          return {
            "Nomor Invoice": s.invoiceNumber,
            "Tanggal": new Date(s.createdAt).toLocaleDateString("id-ID"),
            "Waktu": new Date(s.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
            "Pelanggan": s.customer?.name || "Umum",
            "Metode Bayar": s.paymentMethod || "CASH",
            "Status": s.paymentStatus,
            "Total Penjualan": Number(s.totalAmount),
            "Total Modal": totalCost,
            "Laba Bersih": Number(s.totalAmount) - totalCost,
            "Jumlah Barang Bonus": totalBonusQty,
            "Nilai Jual Bonus": totalBonusValue,
            "Nilai Cost (HPP) Bonus": totalBonusCost
          };
        });
        sheetName = "Laporan Penjualan";
      } else if (activeTab === "EXPENSES") {
        data = fullData.map((e: any) => ({
          "Tanggal": new Date(e.date).toLocaleDateString("id-ID"),
          "Kategori": e.category,
          "Keterangan": e.description,
          "Nominal": Number(e.amount)
        }));
        sheetName = "Laporan Pengeluaran";
      } else if (activeTab === "PURCHASES") {
        data = fullData.map((p: any) => ({
          "Nomor Invoice": p.invoiceNumber,
          "Tanggal": new Date(p.createdAt).toLocaleDateString("id-ID"),
          "Pemasok": p.supplier?.name || "Tanpa Pemasok",
          "Metode": p.paymentMethod || "CASH",
          "Total Pembelian": Number(p.totalAmount)
        }));
        sheetName = "Laporan Pembelian";
      } else if (activeTab === "PROFIT_LOSS") {
        const pLoss = profitLossData || { metrics: { totalRevenue: 0, totalHPP: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 }, expensesBreakdown: [] };
        data = [
          { "Deskripsi": "Total Pendapatan", "Nominal": pLoss.metrics.totalRevenue },
          { "Deskripsi": "Total HPP", "Nominal": -pLoss.metrics.totalHPP },
          { "Deskripsi": "Laba Kotor", "Nominal": pLoss.metrics.grossProfit },
          ...pLoss.expensesBreakdown.map((e: any) => ({
            "Deskripsi": `Pengeluaran: ${e.category}`, "Nominal": -e.amount
          })),
          { "Deskripsi": "Total Pengeluaran", "Nominal": -pLoss.metrics.totalExpenses },
          { "Deskripsi": "Laba Bersih", "Nominal": pLoss.metrics.netProfit },
        ];
        sheetName = "Laba Rugi";
      } else if (activeTab === "STOCK") {
        data = fullData.map((s: any) => ({
          "Waktu": new Date(s.createdAt).toLocaleString("id-ID"),
          "Nama Produk": s.product?.name || "-",
          "Kategori": s.product?.category?.name || "-",
          "Pemasok": s.product?.supplier?.name || "-",
          "Jenis Mutasi": s.type === "IN" ? "MASUK" : s.type === "OUT" ? "KELUAR" : "PENYESUAIAN",
          "Jumlah": s.type === "IN" ? (s.product?.prices?.length > 1 ? `+${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `+${formatMultiUnitStock(s.quantity, s.product?.prices || [])}`) : 
                    s.type === "OUT" ? (s.product?.prices?.length > 1 ? `-${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `-${formatMultiUnitStock(s.quantity, s.product?.prices || [])}`) : 
                    (s.product?.prices?.length > 1 ? `${s.quantity} (${formatMultiUnitStock(s.quantity, s.product?.prices || [])})` : `${formatMultiUnitStock(s.quantity, s.product?.prices || [])}`),
          "Sisa Stok (Kini)": s.product?.stock || 0,
          "Keterangan": s.reason || "-"
        }));
        sheetName = "Laporan Mutasi Stok";
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Laporan_${activeTab}_${periodLabel}_${dateRange.start}.xlsx`);
  };

  const handleReportStartDateChange = (val: string) => {
    setDateRange(prev => {
      const nextEnd = prev.end && val > prev.end ? val : prev.end;
      return { start: val, end: nextEnd };
    });
  };

  const handleReportEndDateChange = (val: string) => {
    setDateRange(prev => {
      const nextStart = prev.start && val < prev.start ? val : prev.start;
      return { start: nextStart, end: val };
    });
  };

  return (
    <div className="p-4 lg:p-8 h-full flex flex-col space-y-4 lg:space-y-8 overflow-y-auto transition-colors duration-300 bg-bg-main mobile-bottom-space custom-scrollbar">
      {/* Tabs */}
      <div className="flex items-center space-x-2 lg:space-x-4 overflow-x-auto scrollbar-hide mt-2 lg:mt-0 flex-shrink-0">
        {(["SALES", "EXPENSES", "PURCHASES", "STOCK", "PROFIT_LOSS"] as const)
          .map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (activeTab === tab) return;
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={cn(
              "px-6 py-2.5 rounded-full font-bold text-xs lg:text-sm transition-all whitespace-nowrap border",
              activeTab === tab 
                ? "bg-brand-primary text-text-inverse border-brand-primary shadow-lg shadow-brand-primary/20" 
                : "bg-bg-card text-text-secondary hover:bg-bg-main border-border-default hover:text-text-primary"
            )}
          >
            {tab === "SALES" ? "Penjualan" : tab === "EXPENSES" ? "Pengeluaran" : tab === "PURCHASES" ? "Pembelian / Modal" : tab === "STOCK" ? "Stok" : "Laba Rugi"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col space-y-4 lg:space-y-8"
        >
          <phantom-ui loading={isLoading} reveal={0.3} className="flex flex-col space-y-4 lg:space-y-8 w-full">
          {/* Blok 1 (Cards): Kartu Ringkasan Data */}
          {user?.role !== "CASHIER" && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 lg:gap-6 flex-shrink-0 transition-all duration-300">
              {activeTab === "PROFIT_LOSS" ? (
                <>
                  <SummaryCard title="Total Pendapatan" value={formatCurrency(profitLoss.metrics.totalRevenue)} icon={<DollarSign className="w-6 h-6" />} color="blue" />
                  <SummaryCard title="Total HPP" value={formatCurrency(profitLoss.metrics.totalHPP)} icon={<Package className="w-6 h-6" />} color="orange" />
                  <SummaryCard title="Total Pengeluaran" value={formatCurrency(profitLoss.metrics.totalExpenses)} icon={<TrendingDown className="w-6 h-6" />} color="red" />
                  <SummaryCard title="Laba Kotor" value={formatCurrency(profitLoss.metrics.grossProfit)} icon={<TrendingUp className="w-6 h-6" />} color="green" />
                  <SummaryCard title="Laba Bersih" value={formatCurrency(profitLoss.metrics.netProfit)} icon={<TrendingUp className="w-6 h-6" />} color="green" />
                </>
              ) : activeTab === "SALES" ? (
                <>
                  <SummaryCard 
                    title="Total Pendapatan" 
                    value={formatCurrency(salesAnalytics.totalRevenue)} 
                    icon={<DollarSign className="w-6 h-6" />}
                    iconRightContent={
                      <>
                        <span className="text-[11px] text-text-muted font-bold">
                          Pot. Diskon: {formatCurrency(salesAnalytics.totalDiscount || 0)}
                        </span>
                        <span className="text-[11px] text-text-muted font-bold">
                          Pot. Retur: {formatCurrency(salesAnalytics.totalReturnTotal || 0)}
                        </span>
                      </>
                    }
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Laba Kotor" 
                    value={formatCurrency(salesAnalytics.grossProfit)} 
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="green"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Transaksi" 
                    value={`${salesAnalytics.totalTransactions} Nota`} 
                    icon={<Receipt className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Rata-rata Transaksi" 
                    value={formatCurrency(salesAnalytics.averageTransaction)} 
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Barang Bonus" 
                    value={`${salesAnalytics.totalBonusQty} Item`} 
                    icon={<Gift className="w-6 h-6" />}
                    iconRightContent={
                      <>
                        <span className="text-[11px] text-text-muted font-bold">
                          Nilai Jual: {formatCurrency(salesAnalytics.totalBonusValue)}
                        </span>
                        <span className="text-[11px] text-text-muted font-bold">
                          Cost (HPP): {formatCurrency(salesAnalytics.totalBonusCost)}
                        </span>
                      </>
                    }
                    color="orange"
                    isLoading={isLoading}
                  />
                </>
              ) : activeTab === "EXPENSES" ? (
                <>
                  <SummaryCard 
                    title="Total Pengeluaran" 
                    value={formatCurrency(expenseAnalytics.totalExpense)} 
                    icon={<ArrowUpRight className="w-6 h-6" />}
                    color="red"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Pencatatan" 
                    value={`${expenseAnalytics.totalTransactions} Data`} 
                    icon={<FileText className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Rata-rata Pengeluaran" 
                    value={formatCurrency(expenseAnalytics.totalTransactions ? expenseAnalytics.totalExpense / expenseAnalytics.totalTransactions : 0)} 
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="red"
                    isLoading={isLoading}
                  />
                </>
              ) : activeTab === "PURCHASES" ? (
                <>
                  <SummaryCard 
                    title="Total Pembelian (Modal)" 
                    value={formatCurrency(purchaseAnalytics.totalPurchase)} 
                    icon={<Package className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Transaksi" 
                    value={`${purchaseAnalytics.totalTransactions} Nota`} 
                    icon={<Receipt className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Rata-rata Pembelian" 
                    value={formatCurrency(purchaseAnalytics.totalTransactions ? purchaseAnalytics.totalPurchase / purchaseAnalytics.totalTransactions : 0)} 
                    icon={<Box className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                </>
              ) : (
                <>
                  <SummaryCard 
                    title="Total Aset Persediaan" 
                    value={formatCurrency(stockSummary.totalAssetValue || 0)} 
                    icon={<Archive className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Item Fisik" 
                    value={`${stockSummary.totalItems || 0} Barang`} 
                    icon={<Package className="w-6 h-6" />}
                    color="green"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Peringatan Stok Rendah" 
                    value={`${stockSummary.lowStockCount || 0} Produk`} 
                    icon={<AlertCircle className="w-6 h-6" />}
                    color="red"
                    isLoading={isLoading}
                  />
                  <SummaryCard 
                    title="Total Mutasi Periode Ini" 
                    value={`${stockMovements.length || 0} Aktivitas`} 
                    icon={<ArrowRightLeft className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoading}
                  />
                </>
              )}
            </div>
          )}

          {/* Blok 2 (Controls): Filters & Export Cards */}
          <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex-shrink-0 space-y-6">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-text-muted" />
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  <span className="block w-fit">Filter Laporan</span>
                </p>
                <div className="flex-1" />
                
                {/* Mobile Export & Filter Actions (Compact) */}
                <div className="lg:hidden flex items-center gap-2">
                  <button 
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="w-10 h-10 bg-bg-main border border-border-default rounded-xl flex items-center justify-center text-text-secondary active:scale-95 transition-all"
                    title="Filter"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  {user?.role !== "CASHIER" && (
                    <>
                      <button 
                        onClick={exportToExcel}
                        className="w-10 h-10 bg-bg-main border border-border-default rounded-xl flex items-center justify-center text-status-success shadow-sm active:scale-90 transition-all"
                        title="Excel"
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={exportToPDF}
                        className="w-10 h-10 bg-bg-main border border-border-default rounded-xl flex items-center justify-center text-status-danger shadow-sm active:scale-90 transition-all"
                        title="PDF"
                      >
                        <FileIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

            {/* Row 1: Time Range & Export */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto overflow-hidden">
                <div className="flex p-1.5 rounded-2xl border border-border-subtle bg-bg-main w-full lg:w-fit overflow-x-auto scrollbar-hide touch-pan-x whitespace-nowrap">
                  {(["daily", "weekly", "monthly", "yearly", "custom"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "px-5 py-2 text-[10px] font-black rounded-xl transition-all duration-300 uppercase tracking-widest flex-shrink-0",
                        period === p 
                          ? "bg-brand-primary text-text-inverse shadow-md scale-105" 
                          : "text-text-muted hover:bg-bg-card hover:text-text-primary"
                      )}
                    >
                      {p === "daily" ? "Harian" : p === "weekly" ? "Mingguan" : p === "monthly" ? "Bulanan" : p === "yearly" ? "Tahunan" : "Kustom"}
                    </button>
                  ))}
                </div>

                {period === "custom" && (
                  <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10">
                    <div className="relative flex items-center h-full">
                      <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={dateRange.start}
                        max={dateRange.end || undefined}
                        onChange={(e) => {
                          handleReportStartDateChange(e.target.value);
                          e.target.blur();
                        }}
                        className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                      />
                    </div>
                    <span className="text-text-muted font-bold">-</span>
                    <div className="relative flex items-center h-full">
                      <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={dateRange.end}
                        min={dateRange.start || undefined}
                        onChange={(e) => {
                          handleReportEndDateChange(e.target.value);
                          e.target.blur();
                        }}
                        className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {user?.role !== "CASHIER" && (
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                    title="Ekspor ke Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-rose-600 hover:border-rose-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                    title="Ekspor ke PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Dropdowns (Desktop Only) */}
            {activeTab === "SALES" && (
              <div className="hidden lg:flex flex-row items-end gap-3 lg:gap-4 pt-4 border-t border-border-subtle">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Kategori</label>
                  <SearchableSelect
                    options={[
                      { id: "", name: "Semua Kategori" },
                      ...categories.map((c: any) => ({ id: c.id, name: c.name }))
                    ]}
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(val)}
                    placeholder="Semua Kategori"
                  />
                </div>

                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Metode Bayar</label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[44px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                  >
                    <option value="">Semua Metode</option>
                    {["CASH", "TRANSFER", "DEBT"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Status</label>
                  <select
                    value={selectedPaymentStatus}
                    onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[44px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                  >
                    <option value="">Semua Status</option>
                    <option value="LUNAS">Lunas</option>
                    <option value="PIUTANG">Belum Lunas</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "STOCK" && (
              <div className="hidden lg:flex flex-row items-end gap-3 lg:gap-4 pt-4 border-t border-border-subtle">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Kategori</label>
                  <SearchableSelect
                    options={[
                      { id: "", name: "Semua Kategori" },
                      ...categories.map((c: any) => ({ id: c.id, name: c.name }))
                    ]}
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(val)}
                    placeholder="Semua Kategori"
                  />
                </div>

                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Jenis Mutasi</label>
                  <select
                    value={selectedStockType}
                    onChange={(e) => setSelectedStockType(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[44px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                  >
                    <option value="">Semua Mutasi</option>
                    <option value="IN">Masuk</option>
                    <option value="OUT">Keluar</option>
                    <option value="ADJUSTMENT">Penyesuaian</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {user?.role !== "CASHIER" && (
            <>
              {/* Blok 3 (Visuals): Chart & Top Products samping-sampingan */}
              {activeTab === "SALES" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-shrink-0 h-auto lg:min-h-[400px]">
                  <div className="lg:col-span-2 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex flex-col">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                      <span className="block w-fit">Tren Penjualan & Laba</span>
                    </h3>
                    <div className="flex-1 min-h-[250px] lg:min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesAnalytics.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#eee'} vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <YAxis 
                            tickFormatter={(val) => `Rp${Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} 
                            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip cursor={false} 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                              backgroundColor: "var(--bg-modal)", 
                              color: "var(--text-primary)" 
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Line connectNulls type="monotone" name="Omset" dataKey="revenue" stroke="#0F4A8A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line connectNulls type="monotone" name="Laba" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex flex-col h-[350px] lg:h-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center">
                        <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="block w-fit">Barang Terlaris</span>
                      </h3>
                      {salesAnalytics.allProductsProfit && salesAnalytics.allProductsProfit.length > 0 && (
                        <button
                          onClick={() => setIsProductProfitModalOpen(true)}
                          className="px-3 py-1 bg-brand-primary/15 hover:bg-brand-primary/25 text-brand-primary rounded-xl transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-sm"
                        >
                          Lihat Semua
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {salesAnalytics.topProducts.length > 0 ? salesAnalytics.topProducts.map((prod, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-bg-main border border-border-subtle group hover:border-brand-primary transition-colors">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-bg-card border border-border-default flex items-center justify-center text-[10px] font-black group-hover:bg-brand-primary group-hover:text-text-inverse transition-colors">
                              {idx + 1}
                            </div>
                            <p className="text-sm font-bold text-text-primary truncate">{prod.name}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-black text-brand-primary">{prod.qty}</p>
                            <p className="text-[9px] text-text-muted font-bold uppercase">Terjual</p>
                          </div>
                        </div>
                      )) : (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted">
                          <Package className="w-10 h-10 mb-2 opacity-20" />
                          <span className="text-xs font-bold">Belum ada data</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTab === "EXPENSES" ? (
                <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex flex-col h-[400px]">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                    <span className="block w-fit">Distribusi Pengeluaran</span>
                  </h3>
                  <div className="flex-1 min-h-[250px] flex items-center justify-center">
                    {expenseAnalytics.categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expenseAnalytics.categoryData} cx="50%" cy="50%" outerRadius="80%" dataKey="value" nameKey="name" label={(entry) => entry.name}>
                            {expenseAnalytics.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip cursor={false} formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <FileText className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-xs font-bold">Belum ada data pengeluaran</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "PURCHASES" ? (
                <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex flex-col h-[400px]">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                    <span className="block w-fit">Distribusi Pembelian Supplier</span>
                  </h3>
                  <div className="flex-1 min-h-[250px] flex items-center justify-center">
                    {purchaseAnalytics.supplierData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={purchaseAnalytics.supplierData} cx="50%" cy="50%" outerRadius="80%" dataKey="value" nameKey="name" label={(entry) => entry.name}>
                            {purchaseAnalytics.supplierData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip cursor={false} formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <Package className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-xs font-bold">Belum ada data pembelian</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "STOCK" ? (
                <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm bg-bg-card border-border-default flex flex-col h-[400px]">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                    <span className="block w-fit">Komposisi Aset per Pemasok</span>
                  </h3>
                  <div className="flex-1 min-h-[250px] flex items-center justify-center">
                    {stockSummary?.valuationBySupplier?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stockSummary.valuationBySupplier} cx="50%" cy="50%" outerRadius="80%" dataKey="value" nameKey="name" label={(entry) => entry.name}>
                            {stockSummary.valuationBySupplier.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip cursor={false} formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <Package className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-xs font-bold">Belum ada data stok per pemasok</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "PURCHASES" && supplierPerformanceData.length > 0 && (
                <div className="mt-4 lg:mt-6 rounded-2xl lg:rounded-3xl border shadow-sm flex flex-col bg-bg-card border-border-default flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xs lg:text-sm font-black text-text-primary uppercase tracking-widest">
                      <span className="block w-fit">Performa Pemasok (Modal & Aset)</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-bg-main">
                          <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Nama Pemasok</th>
                          <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total Modal Masuk (Pembelian)</th>
                          <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Nilai Stok Saat Ini (Aset Tertanam)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {supplierPerformanceData.map((s, idx) => (
                          <tr key={idx} className="transition-colors hover:bg-bg-main/50">
                            <td className="px-6 py-4">
                              <p className="text-sm font-black text-text-primary">{s.name}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-bold text-text-secondary">{formatCurrency(s.purchase)}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-black text-brand-primary">{formatCurrency(s.stockValue)}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Blok 4 (Table): Detail Transaksi / Rincian Laba Rugi */}
          {activeTab === "PROFIT_LOSS" ? (
            <div className="bg-bg-card rounded-2xl lg:rounded-3xl border border-border-default overflow-hidden flex flex-col shadow-sm flex-1 mb-8">
              <div className="p-4 lg:p-6 border-b border-border-default flex justify-between items-center bg-bg-muted/30">
                <h2 className="text-sm lg:text-base font-bold text-text-primary flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-brand-primary" />
                  Rincian Laba Rugi
                </h2>
              </div>
              <div className="p-4 lg:p-6 overflow-x-auto">
                <table className="w-full text-left text-sm text-text-secondary">
                  <thead className="bg-bg-muted text-text-secondary font-semibold uppercase text-xs" data-shimmer-ignore>
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap border-b border-border-default">Deskripsi</th>
                      <th className="px-6 py-4 whitespace-nowrap border-b border-border-default text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-text-primary border-b border-border-default"><span className="block w-fit">Total Pendapatan</span></td>
                      <td className="px-6 py-4 text-right font-medium text-text-primary border-b border-border-default"><span className="block w-fit ml-auto">{formatCurrency(profitLoss.metrics.totalRevenue)}</span></td>
                    </tr>
                    <tr className="hover:bg-bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-status-danger border-b border-border-default"><span className="block w-fit">Dikurangi: Total HPP</span></td>
                      <td className="px-6 py-4 text-right font-medium text-status-danger border-b border-border-default"><span className="block w-fit ml-auto">- {formatCurrency(profitLoss.metrics.totalHPP)}</span></td>
                    </tr>
                    <tr className="hover:bg-bg-muted/30 transition-colors bg-brand-primary/5">
                      <td className="px-6 py-4 font-bold text-text-primary border-b border-border-default"><span className="block w-fit">Laba Kotor</span></td>
                      <td className="px-6 py-4 text-right font-bold text-text-primary border-b border-border-default"><span className="block w-fit ml-auto">{formatCurrency(profitLoss.metrics.grossProfit)}</span></td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="px-6 py-2 text-xs font-bold text-text-muted uppercase bg-bg-muted/50 border-b border-border-default" data-shimmer-ignore>Rincian Pengeluaran</td>
                    </tr>
                    {profitLoss.expensesBreakdown?.map((exp: any, i: number) => (
                      <tr key={i} className="hover:bg-bg-muted/30 transition-colors">
                        <td className="px-6 py-3 pl-10 border-b border-border-default"><span className="block w-fit">{exp.category}</span></td>
                        <td className="px-6 py-3 text-right text-status-danger border-b border-border-default"><span className="block w-fit ml-auto">- {formatCurrency(exp.amount)}</span></td>
                      </tr>
                    ))}
                    <tr className="hover:bg-bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-status-danger border-b border-border-default"><span className="block w-fit">Total Pengeluaran</span></td>
                      <td className="px-6 py-4 text-right font-medium text-status-danger border-b border-border-default"><span className="block w-fit ml-auto">- {formatCurrency(profitLoss.metrics.totalExpenses)}</span></td>
                    </tr>
                    <tr className="hover:bg-bg-muted/30 transition-colors bg-status-success/10">
                      <td className="px-6 py-5 font-bold text-lg text-text-primary border-b border-border-default"><span className="block w-fit">Laba Bersih</span></td>
                      <td className="px-6 py-5 text-right font-bold text-lg text-status-success border-b border-border-default"><span className="block w-fit ml-auto">{formatCurrency(profitLoss.metrics.netProfit)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
          <div className="rounded-2xl lg:rounded-3xl border shadow-sm flex flex-col bg-bg-card border-border-default flex-shrink-0">
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs lg:text-sm font-black text-text-primary uppercase tracking-widest">
                <span className="block w-fit">Detail Riwayat {activeTab === "SALES" ? "Transaksi" : activeTab === "EXPENSES" ? "Pengeluaran" : "Pembelian"}</span>
              </h3>
              <p className="text-[10px] font-bold text-text-muted">{totalItems} Total Data</p>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {/* Desktop Table */}
              <table className="hidden lg:table w-full text-left border-collapse min-w-[1000px]">
                <thead data-shimmer-ignore>
                  {activeTab === "SALES" ? (
                    <tr className="bg-bg-main">
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Invoice & Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pembayaran</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  ) : activeTab === "EXPENSES" ? (
                    <tr className="bg-bg-main">
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Kategori</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Keterangan</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Nominal</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  ) : activeTab === "STOCK" ? (
                    <tr className="bg-bg-main">
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Produk</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Jenis</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Jumlah</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Keterangan</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  ) : (
                    <tr className="bg-bg-main">
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Invoice & Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pemasok</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Metode</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border-subtle transition-colors">
                  {(!isLoading && currentItems.length === 0) ? (
                    <tr>
                      <td colSpan={activeTab === "EXPENSES" ? 5 : activeTab === "STOCK" ? 6 : 6} className="px-6 py-12 text-center">
                        <EmptyState 
                          icon={activeTab === "SALES" ? Receipt : activeTab === "EXPENSES" ? ArrowUpRight : activeTab === "PURCHASES" ? Package : Box}
                          title="Data Kosong"
                          description={`Belum ada data ${activeTab.toLowerCase()} untuk periode ini. Silakan sesuaikan filter atau pilih rentang waktu lain.`}
                        />
                      </td>
                    </tr>
                  ) : activeTab === "SALES" ? (
                    currentItems.map((sale) => (
                      <tr 
                        key={sale.id} 
                        onClick={() => setSelectedSale(sale)}
                        className="transition-colors hover:bg-bg-main/50 group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-text-primary">{sale.invoiceNumber}</p>
                            {sale.returns && sale.returns.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-status-danger/10 text-status-danger text-[9px] font-bold uppercase tracking-wider border border-status-danger/20">Retur</span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted font-bold mt-0.5">
                            {new Date(sale.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-secondary">{sale.customer?.name || "Pelanggan Umum"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {sale.paymentMethod === 'CASH' ? <DollarSign className="w-3.5 h-3.5 text-status-success" /> : <CreditCard className="w-3.5 h-3.5 text-brand-primary" />}
                            <span className="text-[10px] font-black text-text-secondary uppercase">{formatPaymentMethod(sale.paymentMethod)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-base font-black text-text-primary">{formatCurrency(Number(sale.totalAmount))}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-full uppercase",
                            sale.paymentStatus === "LUNAS" 
                              ? "bg-status-success/10 text-status-success" 
                              : "bg-status-warning/10 text-status-warning"
                          )}>
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedSale(sale); }}
                              className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light opacity-70 group-hover:opacity-100"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {user?.role !== "CASHIER" && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(sale.id); }}
                                  className="p-2 rounded-lg transition-all text-text-muted hover:text-status-danger hover:bg-status-danger/10 opacity-70 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-5 h-5" />
                               </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : activeTab === "EXPENSES" ? (
                    currentItems.map((expense) => (
                      <tr 
                        key={expense.id} 
                        onClick={() => setSelectedExpense(expense)}
                        className="transition-colors hover:bg-bg-main/50 group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-primary">
                            {new Date(expense.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-secondary">{expense.category}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-muted">{expense.description || "-"}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-base font-black text-status-danger">{formatCurrency(Number(expense.amount))}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); }}
                            className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light opacity-70 group-hover:opacity-100"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : activeTab === "STOCK" ? (
                    currentItems.map((movement) => (
                      <tr 
                        key={movement.id} 
                        onClick={() => setSelectedStockMovement(movement)}
                        className="transition-colors hover:bg-bg-main/50 group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-text-muted font-bold mt-0.5">
                            {new Date(movement.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-primary">{movement.product?.name || "-"}</p>
                          <p className="text-[10px] text-text-muted">{movement.product?.category?.name || "-"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 text-[10px] font-black rounded-md uppercase",
                            movement.type === "IN" ? "bg-status-success/10 text-status-success" : 
                            movement.type === "OUT" ? "bg-status-danger/10 text-status-danger" : "bg-brand-primary/10 text-brand-primary"
                          )}>
                            {movement.type === "IN" ? "MASUK" : movement.type === "OUT" ? "KELUAR" : "ADJ"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className={cn(
                            "text-sm font-black",
                            movement.type === "IN" ? "text-status-success" : movement.type === "OUT" ? "text-status-danger" : "text-brand-primary"
                          )}>
                            {movement.product?.prices?.length > 1 ? (
                              <>
                                {movement.type === "IN" ? "+" : movement.type === "OUT" ? "-" : ""}{movement.quantity} 
                                <span className="text-[10px] ml-1 opacity-70">
                                  ({formatMultiUnitStock(movement.quantity, movement.product?.prices || [])})
                                </span>
                              </>
                            ) : (
                              <>
                                {movement.type === "IN" ? "+" : movement.type === "OUT" ? "-" : ""}{formatMultiUnitStock(movement.quantity, movement.product?.prices || [])}
                              </>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-text-muted truncate max-w-[200px]">{movement.reason || "-"}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStockMovement(movement); }}
                            className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light opacity-70 group-hover:opacity-100"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    currentItems.map((purchase) => (
                      <tr 
                        key={purchase.id} 
                        onClick={() => setSelectedPurchase(purchase)}
                        className="transition-colors hover:bg-bg-main/50 group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-text-primary">{purchase.invoiceNumber}</p>
                          <p className="text-[10px] text-text-muted font-bold mt-0.5">
                            {new Date(purchase.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-secondary">{purchase.supplier?.name || "Tanpa Pemasok"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-text-secondary uppercase">{purchase.paymentMethod || "CASH"}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-base font-black text-text-primary">{formatCurrency(Number(purchase.totalAmount))}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-full uppercase",
                            purchase.paymentStatus === "PAID" 
                              ? "bg-status-success/10 text-status-success" 
                              : purchase.paymentStatus === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                          )}>
                            {purchase.paymentStatus === "PAID" ? "LUNAS" : purchase.paymentStatus === "PARTIAL" ? "CICILAN" : "HUTANG"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedPurchase(purchase); }}
                            className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light opacity-70 group-hover:opacity-100"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile List View */}
              <div className="lg:hidden p-4 space-y-4">
                {(!isLoading && currentItems.length === 0) ? (
                  <div className="py-12">
                    <EmptyState 
                      icon={activeTab === "SALES" ? Receipt : activeTab === "EXPENSES" ? ArrowUpRight : activeTab === "PURCHASES" ? Package : Box}
                      title="Data Kosong"
                      description={`Belum ada data ${activeTab.toLowerCase()} yang ditemukan.`}
                    />
                  </div>
                ) : activeTab === "SALES" ? (
                  currentItems.map((sale) => (
                    <div 
                      key={sale.id} 
                      onClick={() => setSelectedSale(sale)}
                      className="p-4 rounded-2xl border border-border-default bg-bg-card active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-text-primary">{sale.invoiceNumber}</p>
                            {sale.returns && sale.returns.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-status-danger/10 text-status-danger text-[9px] font-bold uppercase tracking-wider border border-status-danger/20">Retur</span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted font-bold mt-0.5">
                            {new Date(sale.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 text-[8px] font-black rounded-full uppercase",
                          sale.paymentStatus === "LUNAS" 
                            ? "bg-status-success/10 text-status-success" 
                            : "bg-status-warning/10 text-status-warning"
                        )}>
                          {sale.paymentStatus}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-text-secondary mb-3">{sale.customer?.name || "Umum"}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-tighter">{formatPaymentMethod(sale.paymentMethod || "CASH")}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <p className="text-base font-black text-brand-primary">{formatCurrency(Number(sale.totalAmount))}</p>
                          {user?.role !== "CASHIER" && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(sale.id); }}
                              className="p-1.5 rounded-lg transition-all text-status-danger hover:bg-status-danger/10 opacity-70 hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : activeTab === "EXPENSES" ? (
                  currentItems.map((expense) => (
                    <div 
                      key={expense.id} 
                      onClick={() => setSelectedExpense(expense)}
                      className="p-4 rounded-2xl border border-border-default bg-bg-card active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-text-primary uppercase tracking-widest">{expense.category}</span>
                        <p className="text-[10px] text-text-muted font-bold">{new Date(expense.date).toLocaleDateString('id-ID')}</p>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">{expense.description || "-"}</p>
                      <div className="flex justify-end pt-3 border-t border-border-subtle">
                        <p className="text-base font-black text-status-danger">{formatCurrency(Number(expense.amount))}</p>
                      </div>
                    </div>
                  ))
                ) : activeTab === "STOCK" ? (
                  currentItems.map((movement) => (
                    <div 
                      key={movement.id} 
                      onClick={() => setSelectedStockMovement(movement)}
                      className="p-4 rounded-2xl border border-border-default bg-bg-card active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                          <p className="text-sm font-bold text-text-primary truncate">{movement.product?.name || "-"}</p>
                          <p className="text-[10px] text-text-muted font-bold mt-1">
                            {new Date(movement.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(movement.createdAt).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-base font-black",
                            movement.type === "IN" ? "text-status-success" : movement.type === "OUT" ? "text-status-danger" : "text-brand-primary"
                          )}>
                            {movement.product?.prices?.length > 1 ? (
                              <>
                                {movement.type === "IN" ? "+" : movement.type === "OUT" ? "-" : ""}{movement.quantity}
                                <span className="text-[10px] ml-1 block opacity-70 font-bold">
                                  ({formatMultiUnitStock(movement.quantity, movement.product?.prices || [])})
                                </span>
                              </>
                            ) : (
                              <>
                                {movement.type === "IN" ? "+" : movement.type === "OUT" ? "-" : ""}{formatMultiUnitStock(movement.quantity, movement.product?.prices || [])}
                              </>
                            )}
                          </p>
                          <span className={cn(
                            "px-2 py-0.5 text-[8px] font-black rounded-full uppercase mt-1 inline-block",
                            movement.type === "IN" ? "bg-status-success/10 text-status-success" : 
                            movement.type === "OUT" ? "bg-status-danger/10 text-status-danger" : "bg-brand-primary/10 text-brand-primary"
                          )}>
                            {movement.type === "IN" ? "MASUK" : movement.type === "OUT" ? "KELUAR" : "ADJ"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-2 pt-2 border-t border-border-subtle">{movement.reason || "-"}</p>
                    </div>
                  ))
                ) : (
                  currentItems.map((purchase) => (
                    <div 
                      key={purchase.id} 
                      onClick={() => setSelectedPurchase(purchase)}
                      className="p-4 rounded-2xl border border-border-default bg-bg-card active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-black text-text-primary">{purchase.invoiceNumber}</p>
                          <p className="text-[10px] text-text-muted font-bold">
                            {new Date(purchase.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 text-[8px] font-black rounded-full uppercase",
                          purchase.paymentStatus === "PAID" ? "bg-status-success/10 text-status-success" : 
                          purchase.paymentStatus === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                        )}>
                          {purchase.paymentStatus === "PAID" ? "LUNAS" : purchase.paymentStatus === "PARTIAL" ? "CICILAN" : "HUTANG"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-text-secondary mb-3">{purchase.supplier?.name || "Tanpa Pemasok"}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                        <span className="text-[9px] font-black text-text-muted uppercase">{formatPaymentMethod(purchase.paymentMethod || "CASH")}</span>
                        <p className="text-base font-black text-text-primary">{formatCurrency(Number(purchase.totalAmount))}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Global Pagination Wrapper from Inventory */}
            {totalItems > 0 && (
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-main/30">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] lg:text-xs font-bold text-text-muted whitespace-nowrap uppercase tracking-wider">
                    Hal {currentPage} dari {totalPages} • {totalItems} Item
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 border rounded-xl text-[10px] font-bold bg-bg-card border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
            )}
          </div>
          )}
          </phantom-ui>
        </motion.div>
      </AnimatePresence>

      {/* Mobile Filter Drawer (Bottom Sheet) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end justify-center lg:hidden" onClick={() => setIsFilterDrawerOpen(false)}>
          <div 
            className="bg-bg-modal w-full rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 ease-out flex flex-col max-h-[70vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex justify-center pt-3 pb-1 bg-brand-primary flex-shrink-0">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            
            <div className="p-4 bg-brand-primary flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-black text-text-inverse uppercase tracking-widest">Filter Laporan</h3>
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Kategori Barang</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSelectedCategory("")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                      selectedCategory === "" ? "bg-brand-primary text-text-inverse border-brand-primary" : "bg-bg-card border-border-default text-text-primary"
                    )}
                  >
                    Semua
                  </button>
                  {categories.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                        selectedCategory === c.id ? "bg-brand-primary text-text-inverse border-brand-primary" : "bg-bg-card border-border-default text-text-primary"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Metode Pembayaran</label>
                <div className="flex gap-2">
                  {["", "CASH", "TRANSFER", "DEBT"].map(method => (
                    <button 
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                        selectedPaymentMethod === method ? "bg-brand-primary text-text-inverse border-brand-primary" : "bg-bg-card border-border-default text-text-primary"
                      )}
                    >
                      {method === "" ? "Semua" : method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Pembayaran</label>
                <div className="flex gap-2">
                  {["", "LUNAS", "BELUM_LUNAS"].map(st => (
                    <button 
                      key={st}
                      onClick={() => setSelectedPaymentStatus(st)}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                        selectedPaymentStatus === st ? "bg-brand-primary text-text-inverse border-brand-primary" : "bg-bg-card border-border-default text-text-primary"
                      )}
                    >
                      {st === "" ? "Semua" : st === "LUNAS" ? "Lunas" : "Blm Lunas"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-bg-main border-t border-border-subtle flex-shrink-0">
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals wrapped in portal to break out of motion.div containing block constraints */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Transaction Detail Modal (Bottom Sheet on Mobile) */}
          {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Transaksi</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-1">{selectedSale.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Pelanggan</p>
                  <p className="text-sm font-bold text-text-primary">{selectedSale.customer?.name || "Umum"}</p>
                  {selectedSale.customer?.phone && <p className="text-xs text-text-muted">{selectedSale.customer.phone}</p>}
                </div>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle lg:text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Waktu Transaksi</p>
                  <p className="text-sm font-bold text-text-primary">
                    {new Date(selectedSale.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(selectedSale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daftar Barang</h4>
                
                {/* Mobile Item List */}
                <div className="lg:hidden flex flex-col space-y-3">
                  {selectedSale.items?.map((item: any) => {
                    const isReturned = selectedSale.returns?.some((r: any) => r.items?.some((ri: any) => ri.productId === item.productId));
                    return (
                    <div key={item.id} className="bg-bg-main p-4 rounded-xl border border-border-subtle flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-text-primary text-sm">{item.product?.name}</p>
                            {isReturned && (
                              <span className="px-1.5 py-0.5 rounded-md bg-status-danger/10 text-status-danger text-[9px] font-bold uppercase tracking-wider border border-status-danger/20">Retur</span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted">{item.product?.code}</p>
                        </div>
                        <p className="font-black text-text-primary text-sm whitespace-nowrap">{formatCurrency(Number(item.priceAtSale) * item.quantity)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs text-text-muted pt-2 border-t border-border-subtle">
                        <span>{item.quantity} {item.unit?.name}</span>
                        {(() => {
                            const originalPrice = item.product?.prices?.find((p: any) => p.unitId === item.unitId)?.price;
                            const isDifferent = originalPrice && Number(originalPrice) !== Number(item.priceAtSale);
                            const showLabel = item.isManualPrice && (!originalPrice || isDifferent);
                            
                            return (
                              <div className="flex items-center space-x-2">
                                {showLabel && (
                                  <span className="text-[8px] font-black text-status-warning uppercase">Ubah Harga / Diskon Item</span>
                                )}
                                <div className="flex flex-col items-end">
                                  {item.isManualPrice && isDifferent && (
                                    <span className="text-[9px] text-text-muted line-through mb-0.5">{formatCurrency(Number(originalPrice))}</span>
                                  )}
                                  <span>x {formatCurrency(Number(item.priceAtSale))}</span>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  );})}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block border rounded-xl overflow-hidden border-border-default">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-bg-main border-b border-border-default">
                      <tr>
                        <th className="px-4 py-3 font-bold text-text-muted">Barang</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-center">Qty</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-right">Harga</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {selectedSale.items?.map((item: any) => {
                        const isReturned = selectedSale.returns?.some((r: any) => r.items?.some((ri: any) => ri.productId === item.productId));
                        return (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-text-primary">{item.product?.name}</p>
                              {isReturned && (
                                <span className="px-1.5 py-0.5 rounded-md bg-status-danger/10 text-status-danger text-[9px] font-bold uppercase tracking-wider border border-status-danger/20">Retur</span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-muted">{item.product?.code}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{item.quantity} <span className="text-xs text-text-muted">{item.unit?.name}</span></td>
                          <td className="px-4 py-3 text-right">
                              {(() => {
                                const originalPrice = item.product?.prices?.find((p: any) => p.unitId === item.unitId)?.price;
                                const isDifferent = originalPrice && Number(originalPrice) !== Number(item.priceAtSale);
                                const showLabel = item.isManualPrice && (!originalPrice || isDifferent);
                                
                                return (
                                  <div className="flex flex-col items-end">
                                    {showLabel && (
                                      <span className="text-[8px] font-black text-status-warning uppercase mb-0.5">Ubah Harga / Diskon Item</span>
                                    )}
                                    {item.isManualPrice && isDifferent && (
                                      <span className="text-[10px] text-text-muted line-through mb-0.5">{formatCurrency(Number(originalPrice))}</span>
                                    )}
                                    <span>{formatCurrency(Number(item.priceAtSale))}</span>
                                  </div>
                                );
                              })()}
                            </td>
                          <td className="px-4 py-3 text-right font-bold text-text-primary">{formatCurrency(Number(item.priceAtSale) * item.quantity)}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-bg-main border border-border-default mb-6">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Metode Pembayaran</p>
                  <div className="flex items-center space-x-1.5">
                    {selectedSale.paymentMethod === 'CASH' ? <DollarSign className="w-4 h-4 text-status-success" /> : <CreditCard className="w-4 h-4 text-brand-primary" />}
                    <p className="text-sm font-bold text-text-primary">{formatPaymentMethod(selectedSale.paymentMethod)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Status</p>
                  <span className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-full uppercase inline-block",
                    selectedSale.paymentStatus === "LUNAS" 
                      ? "bg-status-success/10 text-status-success" 
                      : "bg-status-warning/10 text-status-warning"
                  )}>
                    {selectedSale.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="text-center lg:text-right bg-brand-light/30 p-4 lg:p-6 rounded-2xl border border-brand-primary/20">
                {(() => {
                  const calculatedTotal = selectedSale.items?.reduce((sum: number, item: any) => {
                    return sum + (item.isBonus ? 0 : (Number(item.priceAtSale || item.price) * item.quantity));
                  }, 0) || 0;
                  const actualTotal = Number(selectedSale.totalAmount);
                  const globalDiscount = calculatedTotal - actualTotal;
                  
                  const totalCost = selectedSale.items?.reduce((sum: number, item: any) => {
                    let itemCost = 0;
                    if (item.batchAllocations && item.batchAllocations.length > 0) {
                      itemCost = item.batchAllocations.reduce((batchSum: number, b: any) => batchSum + (Number(b.costPrice) * b.quantity), 0);
                    } else {
                      itemCost = Number(item.product?.averageCost || 0) * item.quantity;
                    }
                    return sum + itemCost;
                  }, 0) || 0;
                  const grossProfit = actualTotal - totalCost;
                  
                  return (
                    <div className="flex flex-col items-center lg:items-end">
                      {globalDiscount > 0 && (
                        <div className="w-full flex flex-col items-center lg:items-end space-y-1 mb-3">
                          <div className="flex justify-between w-full lg:w-auto lg:space-x-8 text-sm">
                            <span className="text-text-muted font-bold uppercase tracking-wider">Subtotal</span>
                            <span className="font-bold text-text-primary">{formatCurrency(calculatedTotal)}</span>
                          </div>
                          <div className="flex justify-between w-full lg:w-auto lg:space-x-8 text-sm">
                            <span className="text-status-danger font-bold uppercase tracking-wider">Diskon Tambahan</span>
                            <span className="font-bold text-status-danger">-{formatCurrency(globalDiscount)}</span>
                          </div>
                          <div className="w-full border-t border-dashed border-brand-primary/20 mt-2"></div>
                        </div>
                      )}

                      {user?.role !== "CASHIER" && (
                        <div className="w-full flex flex-col items-center lg:items-end space-y-1 mb-3">
                          <div className="flex justify-between w-full lg:w-auto lg:space-x-8 text-sm">
                            <span className="text-text-muted font-bold uppercase tracking-wider">Total Modal (HPP)</span>
                            <span className="font-bold text-text-primary">{formatCurrency(totalCost)}</span>
                          </div>
                          <div className="flex justify-between w-full lg:w-auto lg:space-x-8 text-sm">
                            <span className="text-status-success font-bold uppercase tracking-wider">Laba Kotor</span>
                            <span className="font-bold text-status-success">{formatCurrency(grossProfit)}</span>
                          </div>
                          <div className="w-full border-t border-dashed border-brand-primary/20 mt-2"></div>
                        </div>
                      )}

                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total Transaksi</p>
                      <p className="text-4xl font-black text-brand-primary">{formatCurrency(actualTotal)}</p>

                      {(() => {
                        const totalReturn = selectedSale.returns?.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0) || 0;
                        if (totalReturn > 0) {
                          return (
                            <div className="mt-4 p-3 bg-status-danger/10 border border-status-danger/20 rounded-xl text-center lg:text-right w-full">
                              <p className="text-xs font-bold text-status-danger mb-1">Informasi Retur</p>
                              <p className="text-xs text-status-danger/80">Terdapat retur senilai <span className="font-bold">{formatCurrency(totalReturn)}</span> pada transaksi ini. Nominal ini memotong laporan kas pada hari saat retur diproses.</p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50">
              <button 
                onClick={() => handlePrintNota()}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Cetak Struk</span>
              </button>
              <button 
                onClick={() => setSelectedSale(null)}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-status-danger flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Pengeluaran</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-1">
                  {new Date(selectedExpense.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedExpense(null)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -mr-2">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Kategori</p>
                  <p className="text-sm font-bold text-text-primary uppercase">{selectedExpense.category}</p>
                </div>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nominal</p>
                  <p className="text-lg font-black text-status-danger">{formatCurrency(Number(selectedExpense.amount))}</p>
                </div>
              </div>

              <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Keterangan</p>
                <p className="text-sm text-text-secondary leading-relaxed">{selectedExpense.description || "Tidak ada keterangan"}</p>
              </div>

              {selectedExpense.receiptPath && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Bukti Pengeluaran</p>
                  <div className="rounded-2xl border border-border-default overflow-hidden bg-bg-card">
                    <img 
                      src={selectedExpense.receiptPath} 
                      alt="Bukti Pengeluaran" 
                      className="w-full h-auto object-contain max-h-[300px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50">
              <button 
                onClick={() => setSelectedExpense(null)}
                className="w-full py-3 bg-bg-card border border-border-default text-text-primary rounded-xl font-bold text-sm hover:bg-bg-main transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Pembelian</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-1">{selectedPurchase.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -mr-2">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Pemasok (Supplier)</p>
                  <p className="text-sm font-bold text-text-primary">{selectedPurchase.supplier?.name || "Tanpa Pemasok"}</p>
                  {selectedPurchase.supplier?.phone && <p className="text-xs text-text-muted">{selectedPurchase.supplier.phone}</p>}
                </div>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle lg:text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Waktu Pembelian</p>
                  <p className="text-sm font-bold text-text-primary">
                    {new Date(selectedPurchase.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(selectedPurchase.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daftar Barang Masuk</h4>
                
                {/* Mobile Item List */}
                <div className="lg:hidden flex flex-col space-y-3">
                  {selectedPurchase.items?.map((item: any) => (
                    <div key={item.id} className="bg-bg-main p-4 rounded-xl border border-border-subtle flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <p className="font-bold text-text-primary text-sm">{item.product?.name}</p>
                          <p className="text-[10px] text-text-muted">{item.product?.code}</p>
                        </div>
                        <p className="font-black text-text-primary text-sm whitespace-nowrap">{formatCurrency(Number(item.costPrice) * item.quantity)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs text-text-muted pt-2 border-t border-border-subtle">
                        <span>{item.quantity} {item.unit?.name}</span>
                        <span>x {formatCurrency(Number(item.costPrice))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block border rounded-xl overflow-hidden border-border-default">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-bg-main border-b border-border-default">
                      <tr>
                        <th className="px-4 py-3 font-bold text-text-muted">Barang</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-center">Qty</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-right">Harga Beli</th>
                        <th className="px-4 py-3 font-bold text-text-muted text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {selectedPurchase.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-bold text-text-primary">{item.product?.name}</p>
                            <p className="text-[10px] text-text-muted">{item.product?.code}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{item.quantity} <span className="text-xs text-text-muted">{item.unit?.name}</span></td>
                          <td className="px-4 py-3 text-right">{formatCurrency(Number(item.costPrice))}</td>
                          <td className="px-4 py-3 text-right font-bold text-text-primary">{formatCurrency(Number(item.costPrice) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-bg-main border border-border-default mb-6">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Metode Pembayaran</p>
                  <div className="flex items-center space-x-1.5">
                    {selectedPurchase.paymentMethod === 'CASH' ? <DollarSign className="w-4 h-4 text-status-success" /> : <CreditCard className="w-4 h-4 text-brand-primary" />}
                    <p className="text-sm font-bold text-text-primary">{formatPaymentMethod(selectedPurchase.paymentMethod || "CASH")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Status</p>
                  <span className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-full uppercase inline-block",
                    selectedPurchase.paymentStatus === "PAID" 
                      ? "bg-status-success/10 text-status-success" 
                      : selectedPurchase.paymentStatus === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                  )}>
                    {selectedPurchase.paymentStatus === "PAID" ? "LUNAS" : selectedPurchase.paymentStatus === "PARTIAL" ? "CICILAN" : "HUTANG"}
                  </span>
                </div>
              </div>

              <div className="text-center lg:text-right bg-brand-light/30 p-6 rounded-2xl border border-brand-primary/20">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total Pembelian</p>
                <p className="text-4xl font-black text-brand-primary">{formatCurrency(Number(selectedPurchase.totalAmount))}</p>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50">
              <button 
                onClick={() => setSelectedPurchase(null)}
                className="w-full py-3 bg-bg-card border border-border-default text-text-primary rounded-xl font-bold text-sm hover:bg-bg-main transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Detail Modal */}
      {selectedStockMovement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-xl">
            <div className={cn(
              "lg:hidden w-full flex justify-center pt-3 pb-1",
              selectedStockMovement.type === "IN" ? "bg-status-success" : selectedStockMovement.type === "OUT" ? "bg-status-danger" : "bg-brand-primary"
            )}>
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className={cn(
              "p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between flex-shrink-0",
              selectedStockMovement.type === "IN" ? "bg-status-success" : selectedStockMovement.type === "OUT" ? "bg-status-danger" : "bg-brand-primary"
            )}>
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Mutasi Stok</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-1">
                  {new Date(selectedStockMovement.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setSelectedStockMovement(null)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -mr-2">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Produk</p>
                  <p className="text-sm font-bold text-text-primary">{selectedStockMovement.product?.name || "-"}</p>
                  <p className="text-[10px] text-text-muted">{selectedStockMovement.product?.code || "-"}</p>
                </div>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Jumlah</p>
                  <p className={cn(
                    "text-lg font-black",
                    selectedStockMovement.type === "IN" ? "text-status-success" : selectedStockMovement.type === "OUT" ? "text-status-danger" : "text-brand-primary"
                  )}>
                    {selectedStockMovement.product?.prices?.length > 1 ? (
                      <>
                        {selectedStockMovement.type === "IN" ? "+" : selectedStockMovement.type === "OUT" ? "-" : ""}{selectedStockMovement.quantity}
                        <span className="text-sm ml-2 opacity-70">
                          ({formatMultiUnitStock(selectedStockMovement.quantity, selectedStockMovement.product?.prices || [])})
                        </span>
                      </>
                    ) : (
                      <>
                        {selectedStockMovement.type === "IN" ? "+" : selectedStockMovement.type === "OUT" ? "-" : ""}{formatMultiUnitStock(selectedStockMovement.quantity, selectedStockMovement.product?.prices || [])}
                      </>
                    )}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase mt-0.5">
                    {selectedStockMovement.type === "IN" ? "MASUK" : selectedStockMovement.type === "OUT" ? "KELUAR" : "PENYESUAIAN"}
                  </p>
                </div>
              </div>

              <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Keterangan / Alasan</p>
                <p className="text-sm text-text-secondary leading-relaxed">{selectedStockMovement.reason || "Tidak ada keterangan"}</p>
              </div>

              <div className="flex justify-between items-center p-4 rounded-xl bg-bg-main border border-border-default">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Aset (Produk Ini)</p>
                  <p className="text-sm font-black text-text-primary">
                    {formatCurrency(Number(selectedStockMovement.product?.stock) * Number(selectedStockMovement.product?.averageCost))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Stok Saat Ini</p>
                  <p className="text-sm font-black text-text-primary">
                    {selectedStockMovement.product?.prices?.length > 1 ? (
                      <>
                        {selectedStockMovement.product?.stock || 0}
                        <span className="text-[10px] ml-1 opacity-70">
                          ({formatMultiUnitStock(selectedStockMovement.product?.stock || 0, selectedStockMovement.product?.prices || [])})
                        </span>
                      </>
                    ) : (
                      <>
                        {formatMultiUnitStock(selectedStockMovement.product?.stock || 0, selectedStockMovement.product?.prices || [])}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50">
              <button 
                onClick={() => setSelectedStockMovement(null)}
                className="w-full py-3 bg-bg-card border border-border-default text-text-primary rounded-xl font-bold text-sm hover:bg-bg-main transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
        </>,
        document.body
      )}

      {/* Delete Confirmation Modal Portal */}
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Transaksi?</h2>
              <button onClick={() => setDeleteConfirmId(null)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Transaksi ini akan dihapus dan tidak akan muncul di laporan penjualan maupun laba rugi.
              </p>
            </div>
            <div className="p-5 lg:p-6 bg-bg-main/50 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-6">
              <button
                onClick={() => handleDeleteSale(deleteConfirmId)}
                disabled={isDeleting}
                className="w-full lg:flex-1 py-4 bg-status-danger text-text-inverse font-black text-sm shadow-xl shadow-status-danger/20 hover:bg-status-danger/80 transition-all active:scale-95 rounded-full disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="w-full lg:flex-1 py-4 bg-bg-card border-2 border-border-default text-text-secondary font-black text-sm hover:bg-bg-main transition-all rounded-full disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Profit Modal Portal */}
      {typeof document !== 'undefined' && isProductProfitModalOpen && createPortal(
        <ProductProfitModal 
          isOpen={isProductProfitModalOpen}
          onClose={() => setIsProductProfitModalOpen(false)}
          allProductsProfit={salesAnalytics.allProductsProfit || []}
        />,
        document.body
      )}

      {/* Hidden Printable Nota for Printing */}
      <div className="hidden">
        {selectedSale && <PrintableNota data={selectedSale} ref={notaRef} />}
      </div>
    </div>
  );
}

// Sub-component for All Products Profit Report Modal
function ProductProfitModal({ isOpen, onClose, allProductsProfit }: {
  isOpen: boolean;
  onClose: () => void;
  allProductsProfit: any[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "qty" | "revenue" | "cost" | "profit" | "margin">("profit");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page on filter/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder]);

  // Filtering
  const filtered = useMemo(() => {
    return allProductsProfit.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allProductsProfit, searchQuery]);

  // Sorting
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "margin") {
        valA = a.revenue > 0 ? (a.profit / a.revenue) * 100 : 0;
        valB = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
      }

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Pagination Calculation
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginated = useMemo(() => {
    return sorted.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sorted, currentPage, itemsPerPage]);

  // Export to Excel for All Products Profit List
  const handleExportExcel = () => {
    const dataToExport = sorted.map((p, idx) => {
      const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + "%" : "0%";
      return {
        "No": idx + 1,
        "Kode Produk": p.code,
        "Nama Produk": p.name,
        "Kategori": p.category,
        "Jumlah Terjual (Kuantitas)": p.qty,
        "Total Omset (Revenue)": p.revenue,
        "Total Modal (Cost)": p.cost,
        "Laba Bersih (Profit)": p.profit,
        "Margin Keuntungan": margin
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuntungan Per Produk");

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },  // No
      { wch: 15 }, // Kode
      { wch: 30 }, // Nama
      { wch: 15 }, // Kategori
      { wch: 15 }, // Terjual
      { wch: 18 }, // Omset
      { wch: 18 }, // Modal
      { wch: 18 }, // Laba Bersih
      { wch: 12 }  // Margin
    ];

    XLSX.writeFile(wb, `Laporan_Keuntungan_Produk_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
      <div className="bg-bg-modal w-full rounded-t-[2rem] lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col h-[90vh] lg:h-[80vh] lg:max-w-5xl text-text-primary">
        {/* Mobile Drag Handle */}
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary shrink-0 rounded-t-[2rem]">
          <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
        </div>

        {/* Header Section */}
        <div className="p-4 lg:p-6 border-b border-white/10 bg-brand-primary relative overflow-hidden shrink-0 flex items-center justify-between lg:rounded-t-[2.5rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner shrink-0">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-black text-white leading-none">Laporan Keuntungan per Produk</h3>
              <p className="text-[10px] lg:text-xs font-bold text-white/80 mt-1 uppercase tracking-widest">Semua Produk Terjual</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all p-2 ml-1 relative z-10 active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="p-4 lg:p-6 bg-bg-card border-b border-border-subtle flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full md:w-96 lg:w-[400px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted transition-colors group-focus-within:text-brand-primary" />
            <input 
              type="text" 
              placeholder="Cari produk berdasarkan nama, kode..."
              className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] active:scale-95 transition-transform"
            title="Ekspor ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 bg-bg-main/30">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-text-muted text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-full bg-bg-card flex items-center justify-center mb-4 border border-border-subtle shadow-sm">
                <Package className="w-8 lg:w-10 h-8 lg:h-10 opacity-20" />
              </div>
              <h4 className="font-black text-text-secondary text-sm lg:text-base">Tidak Ada Data Penjualan</h4>
              <p className="text-[10px] lg:text-xs font-medium max-w-[240px] mt-1">Belum ada barang yang terjual atau cocok dengan pencarian Anda pada periode ini.</p>
            </div>
          ) : (
            <div className="border border-border-default bg-bg-card rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-bg-main border-b border-border-subtle select-none">
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center w-12">No</th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider w-36">Kode</th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("name")}>
                        Nama Produk {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Kategori</th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("qty")}>
                        Terjual {sortField === "qty" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("revenue")}>
                        Total Omset {sortField === "revenue" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("cost")}>
                        Total Modal {sortField === "cost" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("profit")}>
                        Laba Bersih {sortField === "profit" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="px-3.5 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right cursor-pointer hover:text-brand-primary transition-colors" onClick={() => handleSort("margin")}>
                        Margin % {sortField === "margin" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {paginated.map((prod, idx) => {
                      const profitMargin = prod.revenue > 0 ? (prod.profit / prod.revenue) * 100 : 0;
                      const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr key={prod.id} className="transition-colors hover:bg-bg-main/30 group">
                          <td className="px-3.5 py-2.5 text-sm text-text-muted text-center">{globalIdx}</td>
                          <td className="px-3.5 py-2.5 text-xs font-mono font-bold text-brand-primary tracking-wider">{prod.code}</td>
                          <td className="px-3.5 py-2.5">
                            <p className="text-sm font-black text-text-primary group-hover:text-brand-primary transition-colors">{prod.name}</p>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-text-secondary font-semibold">{prod.category}</td>
                          <td className="px-3.5 py-2.5 text-sm font-bold text-center text-text-secondary">
                            {formatMultiUnitStock(prod.qty, prod.prices)}
                          </td>
                          <td className="px-3.5 py-2.5 text-sm font-bold text-right text-text-secondary">{formatCurrency(prod.revenue)}</td>
                          <td className="px-3.5 py-2.5 text-sm font-medium text-right text-text-muted">{formatCurrency(prod.cost)}</td>
                          <td className="px-3.5 py-2.5 text-sm font-black text-right">
                            <span className={prod.profit >= 0 ? "text-status-success" : "text-status-danger"}>
                              {prod.profit >= 0 ? "+" : ""}{formatCurrency(prod.profit)}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-black">
                            <div className="flex justify-end">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md border",
                                profitMargin >= 25 ? "bg-status-success/10 text-status-success border-status-success/20" :
                                profitMargin >= 10 ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                                profitMargin > 0 ? "bg-status-warning/10 text-status-warning border-status-warning/20" :
                                "bg-status-danger/10 text-status-danger border-status-danger/20"
                              )}>
                                {profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Section */}
        {totalItems > 0 && (
          <div className="px-4 py-3 lg:px-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-card shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] lg:text-xs font-bold text-text-muted whitespace-nowrap uppercase tracking-wider">
                Hal {currentPage} dari {totalPages} • {totalItems} Item
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
              >
                <option value={10}>10 per hal</option>
                <option value={25}>25 per hal</option>
                <option value={50}>50 per hal</option>
                <option value={100}>100 per hal</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30"
              >
                Sebelumnya
              </button>
              <div className="flex px-1 space-x-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 3 && currentPage > 2) pNum = Math.min(currentPage - 1 + i, totalPages - 2 + i);
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={cn(
                        "w-7 h-7 rounded-xl text-[10px] font-bold transition-all",
                        currentPage === pNum 
                          ? "bg-brand-primary text-text-inverse shadow-sm" 
                          : "bg-bg-main border border-border-default text-text-secondary hover:bg-bg-card"
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
                className="px-2.5 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
