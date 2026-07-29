import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SummaryCard } from '@/components/SummaryCard';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  Download, 
  FileText, 
  Table as TableIcon,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Layers,
  CheckCircle2,
  X,
  Calendar
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Sector
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, cn } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";

interface DashboardData {
  metrics: {
    totalRevenue: number;
    revenueTrend: number;
    totalHPP: number;
    totalExpenses: number;
    expensesTrend: number;
    totalBadDebts: number;
    grossProfit: number;
    netProfit: number;
    netProfitTrend: number;
    profitMargin: number;
  };
  salesTrend: Array<{ date: string; amount: number; hpp: number }>;
  cashFlow: Array<{ date: string; inflow: number; outflow: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  topCustomers: Array<{ name: string; revenue: number; transactionCount: number }>;
  expensesBreakdown: Array<{ category: string; amount: number }>;
  insights: {
    lowStock: Array<{ name: string; stock: number; minStock: number }>;
    lowStockCount: number;
    dueDebts: Array<{ customer: string; amount: number; dueDate: string }>;
    dueDebtsCount: number;
    pendingDeliveries: number;
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("this_month");
  
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    const past = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
    return past.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const { theme, dashboardLayout } = useTheme();

  const fetchDashboardStats = async () => {
    let startDateStr = "";
    let endDateStr = "";
    
    if (dateRange === "custom") {
      startDateStr = customStartDate;
      endDateStr = customEndDate;
    } else {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      if (dateRange === "this_month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === "last_month") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else if (dateRange === "this_year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (dateRange === "all_time") {
        startDate = new Date(2000, 0, 1); // Arbitrary old date
      }
      
      startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    }

    const queryParams = new URLSearchParams({
      startDate: startDateStr,
      endDate: endDateStr
    });

    const response = await fetch(`/api/dashboard/stats?${queryParams}`);
    if (!response.ok) throw new Error("Gagal memuat data dashboard. Pastikan server berjalan.");
    return response.json();
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery<DashboardData, Error>({
    queryKey: ['dashboardStats', dateRange, customStartDate, customEndDate],
    queryFn: fetchDashboardStats,
    placeholderData: keepPreviousData,
    staleTime: 60000,
    refetchInterval: autoRefreshInterval > 0 ? autoRefreshInterval * 1000 : false,
    retry: 1,
  });

  useEffect(() => {
    if (isError && data) {
      toast.error("Gagal menyegarkan data dashboard", {
        description: error?.message || "Pastikan koneksi internet atau server berjalan dengan baik."
      });
    }
  }, [isError, error, data]);

  const exportToExcel = () => {
    if (!data) return;

    const periodLabel = dateRange.replace('_', ' ').toUpperCase();
    const printDate = new Date().toLocaleString('id-ID');

    // Helper to create sheet with header
    const createSheetWithHeader = (title: string, headers: string[], body: any[][]) => {
      const aoa = [
        ["PD SUKSES BANGUNAN"],
        [title],
        [`Periode: ${periodLabel}`],
        [`Dicetak pada: ${printDate}`],
        [], // Gap
        headers,
        ...body
      ];
      return XLSX.utils.aoa_to_sheet(aoa);
    };

    // 1. Summary Sheet
    const summaryBody = [
      ["Total Pendapatan", data.metrics.totalRevenue],
      ["Total HPP", data.metrics.totalHPP],
      ["Total Pengeluaran", data.metrics.totalExpenses],
      ["Piutang Macet", data.metrics.totalBadDebts],
      ["Laba Kotor", data.metrics.grossProfit],
      ["Laba Bersih", data.metrics.netProfit],
      ["Margin Keuntungan (%)", data.metrics.profitMargin.toFixed(2) + "%"]
    ];
    const wsSummary = createSheetWithHeader("RINGKASAN BISNIS", ["Metrik", "Nilai"], summaryBody);

    // 2. Top Products Sheet
    const productsBody = data.topProducts.map(p => [p.name, p.sales, p.revenue]);
    const wsProducts = createSheetWithHeader("PRODUK TERLARIS", ["Nama Produk", "Jumlah Terjual", "Total Omset"], productsBody);

    // 3. Top Customers Sheet
    const customersBody = data.topCustomers.map(c => [c.name, c.transactionCount, c.revenue]);
    const wsCustomers = createSheetWithHeader("PELANGGAN TERATAS", ["Nama Pelanggan", "Jumlah Transaksi", "Total Belanja"], customersBody);

    // 4. Sales Trend Sheet
    const trendBody = data.salesTrend.map(t => [t.date, t.amount, t.hpp, t.amount - t.hpp]);
    const wsTrend = createSheetWithHeader("TREN PENJUALAN", ["Tanggal", "Penjualan", "HPP", "Laba"], trendBody);

    // 5. Expenses Breakdown Sheet
    const expensesBody = data.expensesBreakdown.map(e => [e.category, e.amount]);
    const wsExpenses = createSheetWithHeader("DISTRIBUSI PENGELUARAN", ["Kategori", "Nominal"], expensesBody);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Bisnis");
    XLSX.utils.book_append_sheet(wb, wsProducts, "Produk Terlaris");
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Pelanggan Teratas");
    XLSX.utils.book_append_sheet(wb, wsTrend, "Tren Penjualan");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Pengeluaran");
    
    XLSX.writeFile(wb, `Laporan_Analitik_Bisnis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!data) return;

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
      });
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Define Colors
    const blackColor: [number, number, number] = [0, 0, 0];
    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const secondaryColor: [number, number, number] = [100, 116, 139]; // Slate 500
    const accentColor: [number, number, number] = [59, 130, 246]; // Blue 500
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100

    // Header
    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", 14, 12, 12, 12);
      doc.setFontSize(22);
      doc.setTextColor(...blackColor);
      doc.setFont("helvetica", "bold");
      doc.text("PD SUKSES BANGUNAN", 28, 22);
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...blackColor);
      doc.text("PD SUKSES BANGUNAN", 14, 22);
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang", 14, 30);
    doc.text("Email: pdsuksesbngunan@gmail.com | Telp: +62 899-3124-264", 14, 35);
    
    // Divider Line
    doc.setDrawColor(15, 74, 138);
    doc.setLineWidth(0.5);
    doc.line(14, 39, pageWidth - 14, 39);

    // Document Title & Meta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text("LAPORAN ANALITIK BISNIS", 14, 48);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text(`Periode: ${dateRange.replace('_', ' ').toUpperCase()}`, 14, 54);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 59);

    // 1. Key Metrics Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("RINGKASAN KEUANGAN", 14, 75);
    
    const metricsData = [
      ["Total Pendapatan", formatCurrency(data.metrics.totalRevenue)],
      ["Total HPP", formatCurrency(data.metrics.totalHPP)],
      ["Total Pengeluaran", formatCurrency(data.metrics.totalExpenses)],
      ["Laba Bersih", formatCurrency(data.metrics.netProfit)],
      ["Margin Keuntungan", `${data.metrics.profitMargin.toFixed(2)}%`]
    ];

    autoTable(doc, {
      startY: 80,
      body: metricsData,
      theme: "plain",
      styles: { 
        font: "helvetica", 
        fontSize: 10, 
        cellPadding: { top: 4, right: 4, bottom: 4, left: 0 },
        textColor: primaryColor
      },
      columnStyles: { 
        0: { fontStyle: "bold", cellWidth: 80 }, 
        1: { halign: "right", fontStyle: "normal" } 
      },
      didParseCell: function(data) {
        if (data.row.index === 3) { // Laba Bersih row
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = accentColor;
        }
      }
    });

    // 2. Top Products Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("PRODUK TERLARIS", 14, (doc as any).lastAutoTable.finalY + 20);

    const productTableData = data.topProducts.slice(0, 5).map((p, idx) => [
      idx + 1,
      p.name,
      p.sales.toString(),
      formatCurrency(p.revenue)
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      head: [["NO", "NAMA PRODUK", "TERJUAL", "TOTAL OMSET"]],
      body: productTableData,
      theme: "grid",
      headStyles: { 
        fillColor: lightGray, 
        textColor: primaryColor,
        fontStyle: "bold",
        fontSize: 9,
        halign: "center"
      },
      styles: { 
        font: "helvetica", 
        fontSize: 9,
        textColor: primaryColor,
        lineColor: lightGray,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: "center", cellWidth: 30 },
        3: { halign: "right" }
      }
    });

    // 3. Sales Trend Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("TREN PENJUALAN", 14, (doc as any).lastAutoTable.finalY + 20);
    
    const avgSales = data.salesTrend.reduce((sum, t) => sum + t.amount, 0) / (data.salesTrend.length || 1);
    const maxSales = data.salesTrend.length > 0 ? Math.max(...data.salesTrend.map(t => t.amount)) : 0;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text(`Rata-rata Penjualan Harian: ${formatCurrency(avgSales)}`, 14, (doc as any).lastAutoTable.finalY + 28);
    doc.text(`Penjualan Tertinggi: ${formatCurrency(maxSales)}`, 14, (doc as any).lastAutoTable.finalY + 34);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.text(
        `Dicetak oleh Sistem POS PD Sukses Bangunan - Halaman ${i} dari ${pageCount}`, 
        doc.internal.pageSize.width / 2, 
        doc.internal.pageSize.height - 10, 
        { align: "center" }
      );
    }

    doc.save(`Laporan_Analitik_Bisnis_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isError && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 transition-colors duration-300 bg-bg-main">
        <div className="p-8 rounded-[32px] border text-center max-w-md bg-bg-card border-status-danger/20">
          <div className="w-16 h-16 bg-status-danger/10 text-status-danger rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-text-primary mb-2">Oops! Terjadi Kesalahan</h2>
          <p className="text-text-muted mb-8 font-medium">{error.message}</p>
          <button 
            onClick={() => refetch()}
            className="w-full py-4 bg-brand-primary text-text-inverse rounded-2xl font-bold shadow-lg shadow-brand-primary/10 hover:bg-brand-hover transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  const placeholderData: DashboardData = {
    metrics: {
      totalRevenue: 125000000,
      revenueTrend: 12.5,
      totalHPP: 95000000,
      totalExpenses: 8500000,
      expensesTrend: -2.3,
      totalBadDebts: 0,
      grossProfit: 30000000,
      netProfit: 21500000,
      netProfitTrend: 15.2,
      profitMargin: 17.2,
    },
    salesTrend: [
      { date: "Sen", amount: 5000000, hpp: 3800000 },
      { date: "Sel", amount: 6000000, hpp: 4200000 },
      { date: "Rab", amount: 4500000, hpp: 3200000 },
      { date: "Kam", amount: 7000000, hpp: 5100000 },
      { date: "Jum", amount: 5500000, hpp: 4000000 },
      { date: "Sab", amount: 8000000, hpp: 5800000 },
      { date: "Min", amount: 9000000, hpp: 6500000 }
    ],
    cashFlow: [
      { date: "Sen", inflow: 5000000, outflow: 1000000 },
      { date: "Sel", inflow: 6000000, outflow: 1500000 },
      { date: "Rab", inflow: 4500000, outflow: 800000 },
      { date: "Kam", inflow: 7000000, outflow: 2000000 },
      { date: "Jum", inflow: 5500000, outflow: 1200000 },
      { date: "Sab", inflow: 8000000, outflow: 2500000 },
      { date: "Min", inflow: 9000000, outflow: 3000000 }
    ],
    topProducts: [
      { name: "Semen Portland 50kg Tiga Roda", sales: 150, revenue: 15000000 },
      { name: "Besi Beton 10mm SNI", sales: 120, revenue: 12000000 },
      { name: "Pasir Beton per M3", sales: 85, revenue: 8500000 },
      { name: "Pipa PVC Rucika 3 Inch", sales: 70, revenue: 3500000 },
      { name: "Cat Tembok Dulux 5kg", sales: 50, revenue: 5000000 }
    ],
    topCustomers: [
      { name: "Kontraktor Wijaya Karya", revenue: 45000000, transactionCount: 15 },
      { name: "Toko Material Sukses Mandiri", revenue: 35000000, transactionCount: 12 },
      { name: "Developer Graha Asri", revenue: 28000000, transactionCount: 8 },
      { name: "PD Makmur Jaya", revenue: 20000000, transactionCount: 6 },
      { name: "Heri Setiawan (Proyek Ruko)", revenue: 15000000, transactionCount: 5 }
    ],
    expensesBreakdown: [
      { category: "Gaji Karyawan", amount: 4500000 },
      { category: "Operasional Toko", amount: 2500000 },
      { category: "Bensin & Logistik", amount: 1500000 }
    ],
    insights: {
      lowStock: [
        { name: "Besi Beton 10mm", stock: 5, minStock: 20 },
        { name: "Cat Tembok Dulux 5kg", stock: 2, minStock: 10 },
        { name: "Semen Portland 50kg", stock: 8, minStock: 30 }
      ],
      lowStockCount: 3,
      dueDebts: [
        { customer: "Kontraktor Wijaya Karya", amount: 15000000, dueDate: "2026-06-20" },
        { customer: "Developer Graha Asri", amount: 8000000, dueDate: "2026-06-25" }
      ],
      dueDebtsCount: 2,
      pendingDeliveries: 3
    }
  };

  const activeData = data || placeholderData;
  const metrics = activeData.metrics;
  const salesTrend = activeData.salesTrend || [];
  const cashFlow = activeData.cashFlow || [];
  const topProducts = activeData.topProducts || [];
  const topCustomers = activeData.topCustomers || [];
  const expensesBreakdown = activeData.expensesBreakdown || [];
  const insights = activeData.insights;

  const formatTrend = (val: number | undefined) => {
    if (val === undefined) return "0%";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="p-4 lg:p-8 h-full flex flex-col space-y-8 lg:space-y-8 overflow-y-auto custom-scrollbar transition-colors duration-300 bg-bg-main">
      {/* Header Group */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl lg:text-2xl font-black text-text-primary">Dashboard Analitik</h1>
              {(isLoading || isFetching) && <RefreshCw className="w-4 h-4 text-brand-primary animate-spin" />}
            </div>
            <p className="text-xs lg:text-sm text-text-muted font-medium mt-1">Pantau performa bisnis Anda secara real-time</p>
          </div>
          <div className="flex items-center space-x-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-card border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-card [&>option]:text-text-primary"
            >
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="this_year">Tahun Ini</option>
              <option value="all_time">Semua Waktu</option>
              <option value="custom">Kustom...</option>
            </select>
            <div className="flex items-center space-x-2 border rounded-xl px-4 py-2 bg-bg-card border-border-default h-[40px] focus-within:ring-2 focus-within:ring-brand-primary transition-all">
              <span className="text-sm font-bold text-text-muted select-none">Auto:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="text-sm font-bold bg-bg-card text-text-primary focus:outline-none cursor-pointer [&>option]:bg-bg-card [&>option]:text-text-primary"
              >
                <option value={0}>Mati</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
            <button 
              onClick={() => refetch()}
              className="p-2 border rounded-xl transition-all bg-bg-card border-border-default text-text-muted hover:text-brand-primary hover:bg-brand-light"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-5 h-5", (isLoading || isFetching) && "animate-spin")} />
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-card border-border-default hover:bg-bg-card hover:brightness-95 text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
              title="Ekspor ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-card border-border-default hover:bg-bg-card hover:brightness-95 text-rose-600 hover:border-rose-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
              title="Ekspor ke PDF"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Custom Date Picker Section */}
        {dateRange === "custom" && (
          <div className="flex justify-start lg:justify-end mt-4">
            <div className="flex items-center gap-2 bg-bg-card px-5 rounded-full border border-border-default h-11 w-fit focus-within:ring-2 focus-within:ring-brand-primary transition-all">
              <div className="relative flex items-center h-full">
                <Calendar className="absolute left-2 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                <input 
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    e.target.blur();
                  }}
                  className="pl-8 pr-2 h-full bg-transparent text-sm font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                />
              </div>
              <span className="text-text-muted font-bold">-</span>
              <div className="relative flex items-center h-full">
                <Calendar className="absolute left-2 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                <input 
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    e.target.blur();
                  }}
                  className="pl-8 pr-2 h-full bg-transparent text-sm font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                />
              </div>
              <button 
                onClick={() => setDateRange("this_month")}
                className="ml-1 p-1 text-text-muted hover:text-brand-primary hover:bg-brand-light rounded-full transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actionable Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {(insights.lowStock.length > 0 || insights.dueDebts.length > 0 || insights.pendingDeliveries > 0) && (
            <div className="col-span-full mb-2">
              <h2 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-status-warning" />
                Perlu Perhatian
              </h2>
            </div>
          )}
          
          {insights.lowStock.length > 0 && (
            <div 
              onClick={() => navigate("/inventory", { state: { filter: "LOW_STOCK" } })}
              className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-2xl flex items-start space-x-3 cursor-pointer hover:bg-status-warning/20 transition-all"
            >
              <div className="p-2 bg-status-warning/20 rounded-[24px] text-status-warning mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-status-warning">Stok Menipis</h3>
                <p className="text-xs text-status-warning/80 mt-1">{insights.lowStockCount} produk di bawah batas minimum.</p>
              </div>
            </div>
          )}

          {insights.dueDebtsCount > 0 && (
            <div 
              onClick={() => navigate("/debts", { state: { filter: "OVERDUE" } })}
              className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-2xl flex items-start space-x-3 cursor-pointer hover:bg-status-danger/20 transition-all"
            >
              <div className="p-2 bg-status-danger/20 rounded-[24px] text-status-danger mt-0.5">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-status-danger">Piutang Jatuh Tempo</h3>
                <p className="text-xs text-status-danger/80 mt-1">{insights.dueDebtsCount} pelanggan memiliki tagihan jatuh tempo.</p>
              </div>
            </div>
          )}

          {insights.pendingDeliveries > 0 && (
            <div 
              onClick={() => navigate("/delivery", { state: { openAntrean: true } })}
              className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-start space-x-3 cursor-pointer hover:bg-brand-primary/20 transition-all"
            >
              <div className="p-2 bg-brand-primary/20 rounded-[24px] text-brand-primary mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-primary">Antrean Kirim</h3>
                <p className="text-xs text-brand-primary/80 mt-1">{insights.pendingDeliveries} pesanan dalam antrean kirim.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {dashboardLayout.showMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SummaryCard 
            title="Total Omset" 
            value={formatCurrency(metrics?.totalRevenue || 0)} 
            trend={formatTrend(metrics?.revenueTrend)} 
            isPositive={(metrics?.revenueTrend || 0) >= 0} 
            icon={<TrendingUp className="w-6 h-6" />}
            color="blue"
            sparklineData={salesTrend.map(d => d.amount)}
            isLoading={isLoading}
          />
          <SummaryCard 
            title="Laba Bersih" 
            value={formatCurrency(metrics?.netProfit || 0)} 
            trend={formatTrend(metrics?.netProfitTrend)} 
            isPositive={(metrics?.netProfitTrend || 0) >= 0} 
            icon={<DollarSign className="w-6 h-6" />}
            color="green"
            sparklineData={salesTrend.map(d => d.amount - d.hpp)}
            isLoading={isLoading}
          />
          <SummaryCard 
            title="Total Pengeluaran" 
            value={formatCurrency(metrics?.totalExpenses || 0)} 
            trend={formatTrend(metrics?.expensesTrend)} 
            isPositive={(metrics?.expensesTrend || 0) <= 0} // Less expenses is positive
            icon={<TrendingDown className="w-6 h-6" />}
            color="orange"
            sparklineData={cashFlow.map(d => d.outflow)}
            isLoading={isLoading}
          />
          <SummaryCard 
            title="Piutang Macet" 
            value={formatCurrency(metrics?.totalBadDebts || 0)} 
            trend="N/A" 
            isPositive={true} 
            icon={<AlertCircle className="w-6 h-6" />}
            color="red"
            sparklineData={[]} 
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Revenue Trend */}
        {dashboardLayout.showSalesTrend && (
          <div className="p-8 lg:p-8 rounded-[32px] lg:rounded-[32px] border flex flex-col h-[350px] lg:h-[450px] transition-all duration-300 animate-in fade-in slide-in-from-left-4 bg-bg-card border-border-default">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-8 space-y-2 sm:space-y-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-primary">Tren Penjualan</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Periode Terpilih</p>
              </div>
              <div className="flex items-center space-x-4 text-[10px] lg:text-xs font-bold">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-brand-primary rounded-full"></div>
                  <span className="text-text-secondary">Omset</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-border-strong rounded-full"></div>
                  <span className="text-text-secondary">HPP</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700}}
                    dy={10}
                    tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700}}
                    tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`}
                  />
                  <Tooltip cursor={false} 
                    contentStyle={{
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: "var(--bg-modal)",
                      color: "var(--color-text-primary)"
                    }}
                    itemStyle={{ color: "var(--color-text-primary)" }}
                    formatter={(val: any) => [formatCurrency(val), ""]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="var(--color-brand-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="hpp" stroke="var(--color-border-strong)" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cash Flow Analysis */}
        <div className="p-8 lg:p-8 rounded-[32px] lg:rounded-[32px] border flex flex-col h-[350px] lg:h-[450px] transition-all duration-300 animate-in fade-in slide-in-from-right-4 bg-bg-card border-border-default">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-8 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-base lg:text-lg font-black text-text-primary">Analisis Arus Kas</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Uang Masuk vs Keluar</p>
            </div>
            <div className="flex items-center space-x-4 text-[10px] lg:text-xs font-bold">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-status-success rounded-full"></div>
                <span className="text-text-secondary">Masuk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-status-danger rounded-full"></div>
                <span className="text-text-secondary">Keluar</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700}}
                  dy={10}
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700}}
                  tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`}
                  dx={-10}
                />
                <Tooltip cursor={false} 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    backgroundColor: "var(--bg-modal)",
                    color: "var(--color-text-primary)"
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                />
                <Bar dataKey="inflow" fill="var(--color-status-success)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="outflow" fill="var(--color-status-danger)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-8">
        {/* Top Products */}
        {dashboardLayout.showTopProducts && (
          <div className="p-8 lg:p-8 rounded-[32px] lg:rounded-[32px] border flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-bg-card border-border-default h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black text-text-primary">Produk Terlaris</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Berdasarkan Omset</p>
              </div>
              <div className="p-2 bg-brand-light text-brand-primary rounded-[24px]">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">Belum ada data penjualan</div>
              ) : (
                topProducts.map((product, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between group cursor-pointer p-1.5 rounded-[24px] hover:bg-bg-main transition-all duration-200"
                    onClick={() => navigate("/inventory")}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-[24px] bg-bg-main border border-border-default flex items-center justify-center text-xs font-black text-text-secondary flex-shrink-0 group-hover:bg-brand-primary group-hover:text-text-inverse group-hover:border-brand-primary transition-colors">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{product.name}</p>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5">{product.sales} Terjual</p>
                      </div>
                    </div>
                    <div className="text-right pl-4 flex-shrink-0">
                      <p className="text-sm font-black text-text-primary">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Top Customers */}
        <div className="p-8 lg:p-8 rounded-[32px] lg:rounded-[32px] border flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-100 bg-bg-card border-border-default h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-text-primary">Pelanggan Teratas</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Berdasarkan Belanja</p>
            </div>
            <div className="p-2 bg-status-warning/10 text-status-warning rounded-[24px]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {topCustomers.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">Belum ada data pelanggan</div>
            ) : (
              topCustomers.map((customer, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between group cursor-pointer p-1.5 rounded-[24px] hover:bg-bg-main transition-all duration-200"
                  onClick={() => navigate("/customers")}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-[24px] bg-bg-main border border-border-default flex items-center justify-center text-xs font-black text-text-secondary flex-shrink-0 group-hover:bg-status-warning group-hover:text-text-inverse group-hover:border-status-warning transition-colors">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{customer.name}</p>
                      <p className="text-[10px] text-text-muted font-medium mt-0.5">{customer.transactionCount} Transaksi</p>
                    </div>
                  </div>
                  <div className="text-right pl-4 flex-shrink-0">
                    <p className="text-sm font-black text-text-primary">{formatCurrency(customer.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expenses Breakdown */}
        {dashboardLayout.showExpenses && (
          <div className="p-8 lg:p-8 rounded-[32px] lg:rounded-[32px] border flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-200 bg-bg-card border-border-default h-[400px]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-text-primary">Distribusi Pengeluaran</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Berdasarkan Kategori</p>
              </div>
              <div className="p-2 bg-status-danger/10 text-status-danger rounded-[24px]">
                <PieChartIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1 min-h-[150px] relative">
              {expensesBreakdown.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Belum ada data pengeluaran</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="category"
                      stroke="none"
                    >
                      {expensesBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip cursor={false} 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        backgroundColor: "var(--bg-modal)",
                        color: "var(--color-text-primary)"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {expensesBreakdown.length > 0 && (
              <div className="mt-4 space-y-2 overflow-y-auto custom-scrollbar max-h-[100px]">
                {expensesBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                      <span className="text-text-secondary font-medium">{item.category}</span>
                    </div>
                    <span className="font-bold text-text-primary">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </phantom-ui>
  );
}

const CHART_COLORS = ["var(--color-brand-primary)", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
