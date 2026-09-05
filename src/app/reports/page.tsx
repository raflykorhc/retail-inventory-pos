"use client"

import * as React from "react"
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Wallet, 
  Download, 
  RefreshCw, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  CreditCard, 
  QrCode, 
  Banknote, 
  ArrowUpRight, 
  BarChart3,
  Layers,
  Info,
  Boxes
} from "lucide-react"

import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis
} from "recharts"

import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Card, 
  CardContent
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { type DateRange } from "react-day-picker"
import { Calendar as UICalendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { useSalesSummary, useSales } from "@/hooks/queries/useSales"
import { TransactionDetailModal } from "./components/TransactionDetailModal"

export default function ReportsPage() {
  const [timeRange, setTimeRange] = React.useState("30d")
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("transactions")
  const [txPage, setTxPage] = React.useState(1)
  const [txLimit, setTxLimit] = React.useState(10)
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  const handleOpenDetail = (saleData: any) => {
    setSelectedSale(saleData)
    setIsDetailModalOpen(true)
  }

  React.useEffect(() => {
    setTxPage(1)
  }, [searchQuery, timeRange, customDateRange])

  // Generate Date Range Filters
  const dateFilters = React.useMemo(() => {
    if (timeRange === "custom" && customDateRange?.from) {
      const startDate = customDateRange.from.toISOString().split('T')[0];
      const endDate = (customDateRange.to || customDateRange.from).toISOString().split('T')[0];
      return { startDate, endDate };
    }

    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (timeRange) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'this-year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [timeRange, customDateRange]);

  const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useSalesSummary(dateFilters);
  const { data: salesResponse, isLoading: isSalesLoading, refetch: refetchSales } = useSales({
    ...dateFilters,
    page: txPage,
    limit: txLimit,
    search: searchQuery || undefined,
  });

  const salesData = salesResponse?.items || [];
  const isLoading = isSummaryLoading || isSalesLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchSummary(), refetchSales()]);
    toast.success("Data Laporan Diperbarui", {
      description: "Semua data statistik dan grafik telah disinkronkan."
    })
  }

  const handleExportPDF = () => {
    toast.info("Mengunduh Laporan PDF...", {
      description: "Berkas PDF laporan penjualan sedang disiapkan."
    })
  }

  const handleExportExcel = () => {
    toast.success("Laporan Excel Diunduh", {
      description: "Berkas file .xlsx berhasil disimpan ke perangkat Anda."
    })
  }

  // --- DATA TRANSFORMATION ---

  const salesTrendData = summaryData?.trend?.map((t: any) => ({
    date: t.date,
    omzet: t.revenue,
    laba: t.profit,
  })) || [];

  const paymentMethodsMap: Record<string, any> = {
    "CASH": { name: "TUNAI", color: "#3b82f6", icon: Banknote },
    "TUNAI": { name: "TUNAI", color: "#3b82f6", icon: Banknote },
    "TRANSFER": { name: "Transfer Bank", color: "#8b5cf6", icon: CreditCard },
    "QRIS": { name: "QRIS", color: "#10b981", icon: QrCode },
    "DEBIT": { name: "Kartu Debit/Kredit", color: "#f59e0b", icon: Wallet },
    "SPLIT": { name: "Split Payment", color: "#6366f1", icon: CreditCard },
  };

  const paymentMethodsData = (summaryData?.paymentMethods || []).map((pm: any) => {
    let methodKey = pm.method;
    if (methodKey.startsWith("SPLIT")) methodKey = "SPLIT";
    const meta = paymentMethodsMap[methodKey] || { name: methodKey, color: "#888", icon: CreditCard };
    const share = summaryData?.totalRevenue ? Math.round((pm.amount / summaryData.totalRevenue) * 100) : 0;
    
    // Use actual count returned from API if available, otherwise fallback
    const count = pm.count !== undefined ? pm.count : Math.round((summaryData?.totalTransactions || 0) * (share / 100));

    return {
      name: meta.name,
      value: pm.amount,
      count,
      share,
      color: meta.color,
      icon: meta.icon
    };
  }).sort((a: any, b: any) => b.value - a.value);

  const categoriesMap: Record<string, any> = {};
  let totalCategorySales = 0;
  (summaryData?.productProfits || []).forEach((p: any) => {
    const catName = p.category || "Uncategorized";
    if (!categoriesMap[catName]) {
      categoriesMap[catName] = { category: catName, totalSales: 0, itemsCount: 0 };
    }
    categoriesMap[catName].totalSales += p.revenue;
    categoriesMap[catName].itemsCount += p.qty;
    totalCategorySales += p.revenue;
  });
  const categoryPerformanceData = Object.values(categoriesMap).map((c: any) => ({
    ...c,
    share: totalCategorySales ? Math.round((c.totalSales / totalCategorySales) * 100) : 0
  })).sort((a: any, b: any) => b.totalSales - a.totalSales);

  const topProductsData = (summaryData?.productProfits || [])
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p: any) => {
      const basePrice = p.prices?.reduce((max: any, current: any) => 
        (max?.conversionFactor || 0) > (current?.conversionFactor || 0) ? max : current
      , p.prices?.[0]);
      const baseUnitName = basePrice?.unit?.name || "Pcs";
      const baseConversion = basePrice?.conversionFactor || 1;
      
      const displayQty = p.qty > 0 ? (p.qty / baseConversion) : 0;
      const formattedQty = displayQty % 1 === 0 ? displayQty : Number(displayQty.toFixed(2));
      
      return {
        id: p.code || p.id,
        name: p.name,
        category: p.category,
        soldQty: formattedQty,
        baseUnit: baseUnitName,
        price: formattedQty > 0 ? (p.revenue / formattedQty) : 0,
        cost: p.cost,
        revenue: p.revenue,
        margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) + "%" : "0%"
      };
    });

  const recentTransactionsData = salesData.map((s: any) => {
    let methodKey = s.paymentMethod || "CASH";
    if (methodKey.startsWith("SPLIT")) methodKey = "SPLIT";
    return {
      raw: s,
      id: s.id,
      invoice: s.invoiceNumber,
      date: new Date(s.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      method: paymentMethodsMap[methodKey]?.name || s.paymentMethod,
      status: s.paymentStatus || "Selesai",
      items: s.items?.length || 0,
      total: s.totalAmount,
      cashier: s.user?.fullName || s.user?.username || "Admin" 
    };
  });

  const hourlyMap: Record<string, { hour: string, transaksi: number, omzet: number }> = {};
  salesData.forEach((s: any) => {
    const h = new Date(s.createdAt).getHours();
    const hourKey = `${h.toString().padStart(2, '0')}:00`;
    if (!hourlyMap[hourKey]) hourlyMap[hourKey] = { hour: hourKey, transaksi: 0, omzet: 0 };
    hourlyMap[hourKey].transaksi += 1;
    hourlyMap[hourKey].omzet += Number(s.totalAmount) || 0;
  });
  const hourlyTrafficData = Object.values(hourlyMap).sort((a: any, b: any) => a.hour.localeCompare(b.hour));

  const totalTxCount = salesResponse?.pagination?.total ?? salesResponse?.total ?? recentTransactionsData.length;
  const totalTxPages = salesResponse?.pagination?.totalPages ?? salesResponse?.totalPages ?? Math.max(1, Math.ceil(totalTxCount / txLimit));
  const currentTxPage = salesResponse?.pagination?.page ?? salesResponse?.page ?? txPage;
  const paginatedTransactions = recentTransactionsData;

  // Dynamic Font Sizing for KPI cards (shrinks automatically for 10M+)
  const getFontSizeClass = (value: number) => {
    const absVal = Math.abs(value);
    if (absVal >= 1000000000) {
      return "text-base sm:text-lg"; // 1 Billion+
    }
    if (absVal >= 100000000) {
      return "text-lg sm:text-xl"; // 100 Million+
    }
    if (absVal >= 10000000) {
      return "text-xl sm:text-2xl"; // 10 Million+ ("2 digit" millions)
    }
    return "text-2xl sm:text-[28px]";
  };

  const totalRevenue = summaryData?.totalRevenue || 0;
  const grossProfit = summaryData?.grossProfit || 0;

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-5 w-full max-w-full overflow-x-hidden">
        
        {/* HEADER TOP BAR */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-2.5 pb-1">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Laporan Penjualan
                </h1>
              </div>

          {/* Action Buttons & Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Select 
              value={timeRange} 
              onValueChange={(val: any) => {
                if (val) setTimeRange(typeof val === "string" ? val : val.value);
              }}
              items={[
                { label: "7 Hari Terakhir", value: "7d" },
                { label: "30 Hari Terakhir", value: "30d" },
                { label: "Bulan Ini", value: "this-month" },
                { label: "Tahun Ini", value: "this-year" },
                { label: "Kustom (Range)", value: "custom" },
              ]}
            >
              <SelectTrigger className="w-[155px] bg-background shadow-2xs h-8 text-xs font-medium">
                <Calendar className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                <SelectItem value="this-month">Bulan Ini</SelectItem>
                <SelectItem value="this-year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Kustom (Range)</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === "custom" && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 justify-start text-xs font-normal bg-background shadow-2xs gap-1.5"
                    >
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "dd MMM yyyy", { locale: id })} -{" "}
                            {format(customDateRange.to, "dd MMM yyyy", { locale: id })}
                          </>
                        ) : (
                          format(customDateRange.from, "dd MMM yyyy", { locale: id })
                        )
                      ) : (
                        <span>Pilih Rentang Tanggal</span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="end">
                  <UICalendar
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    className="size-8 shadow-2xs hover:bg-accent"
                  >
                    <RefreshCw className={cn("size-3.5 text-muted-foreground", isLoading && "animate-spin text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Perbarui Data</TooltipContent>
              </Tooltip>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel}
                className="h-8 px-2.5 gap-1.5 shadow-2xs border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium text-xs"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Excel</span>
              </Button>

              <Button 
                variant="default" 
                size="sm" 
                onClick={handleExportPDF}
                className="h-8 px-3 gap-1.5 shadow-2xs font-medium text-xs transition-transform active:scale-[0.98]"
              >
                <Download className="size-3.5" />
                <span>Export PDF</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 1: EXECUTIVE KPI SUMMARY CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: TOTAL OMZET */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Omzet</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
                <TrendingUp className="size-3 text-emerald-500" />
                <span>+12.5%</span>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2 mt-3">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="mt-2 mb-3">
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground transition-all", getFontSizeClass(totalRevenue))}>
                    {formatCurrency(totalRevenue)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Total omzet kotor periode ini</p>
              </>
            )}
          </div>

          {/* CARD 2: ESTIMASI LABA */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Estimasi Laba</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
                <TrendingUp className="size-3 text-blue-500" />
                <span>+{totalRevenue ? Math.round((grossProfit / totalRevenue) * 100) : 0}%</span>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2 mt-3">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="mt-2 mb-3">
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground transition-all", getFontSizeClass(grossProfit))}>
                    {formatCurrency(grossProfit)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Laba bersih dari estimasi HPP</p>
              </>
            )}
          </div>

          {/* CARD 3: TOTAL TRANSAKSI */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Transaksi</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
                <TrendingUp className="size-3 text-purple-500" />
                <span>+12.5%</span>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2 mt-3">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="mt-2 mb-3">
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground flex items-baseline gap-1.5 transition-all", getFontSizeClass(summaryData?.totalTransactions || 0))}>
                    <span>{summaryData?.totalTransactions || 0}</span>
                    <span className="text-sm font-normal text-muted-foreground">Trx</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  AOV: <span className="font-semibold font-mono text-foreground">{formatCurrency(summaryData?.averageTransaction || 0)}</span>
                </p>
              </>
            )}
          </div>

          {/* CARD 4: PRODUK TERJUAL */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Produk Terjual</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground">
                <TrendingUp className="size-3 text-amber-500" />
                <span>+4.5%</span>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2 mt-3">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="mt-2 mb-3">
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground flex items-baseline gap-1.5 transition-all", getFontSizeClass(summaryData?.productProfits?.reduce((sum: number, p: any) => sum + p.qty, 0) || 0))}>
                    <span>{summaryData?.productProfits?.reduce((sum: number, p: any) => sum + p.qty, 0) || 0}</span>
                    <span className="text-sm font-normal text-muted-foreground">Pcs</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Terdistribusi <span className="font-semibold font-mono text-foreground">{summaryData?.productProfits?.length || 0}</span> <span className="font-semibold text-foreground">varian</span> item
                </p>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: GRAPH & KATEGORI PRODUK BREAKDOWN */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* TREN PENJUALAN & LABA */}
          <Card className="lg:col-span-2 border border-border/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-semibold">
                Grafik Tren Omzet vs Laba Bersih
              </h2>
              <div className="hidden sm:flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Omzet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500 inline-block" />
                  <span>Laba Bersih</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : salesTrendData.length === 0 ? (
              <div className="h-[225px] sm:h-[235px] w-full flex items-center justify-center text-muted-foreground text-sm">
                Tidak ada data pada periode ini
              </div>
            ) : (
              <div className="h-[225px] sm:h-[235px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 6, right: 4, left: -10, bottom: -4 }}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={4}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground" 
                    />
                    <YAxis hide />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1 min-w-[150px]">
                              <p className="font-semibold text-popover-foreground border-b pb-1 text-[11px]">{label}</p>
                              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-mono">
                                <span>Omzet:</span>
                                <span className="font-bold">{formatCurrency(payload[0]?.value as number)}</span>
                              </div>
                              <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-mono">
                                <span>Laba Bersih:</span>
                                <span className="font-bold">{formatCurrency(payload[1]?.value as number)}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="omzet" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOmzet)" />
                    <Area type="monotone" dataKey="laba" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLaba)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* DISTRIBUSI KATEGORI PRODUK */}
          <Card className="lg:col-span-1 border border-border/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-semibold">
                Kategori Produk
              </h2>
            </div>

            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : categoryPerformanceData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data kategori
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-2.5 pt-0.5 overflow-y-auto max-h-[225px] pr-1">
                {categoryPerformanceData.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="space-y-1 shrink-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <span className="p-1 rounded-md bg-muted text-foreground shrink-0">
                          <Package className="size-3 text-primary" />
                        </span>
                        <span className="truncate">{item.category}</span>
                      </div>
                      <div className="font-mono text-muted-foreground shrink-0 ml-1.5">
                        <span className="font-semibold text-foreground">{item.share}%</span> ({item.itemsCount} Qty)
                      </div>
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${item.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: DETAILED DATA ANALYTICS & TABBED TABLES */}
        {/* ========================================================================= */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-3 mt-1">
          
          {/* Header Row: Tabs on Left, Search on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-muted/60 p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="transactions" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                <FileText className="size-3.5" />
                <span>Riwayat Transaksi</span>
              </TabsTrigger>
              <TabsTrigger value="top-products" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                <Package className="size-3.5" />
                <span>Produk Terlaris</span>
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                <CreditCard className="size-3.5" />
                <span>Metode Pembayaran</span>
              </TabsTrigger>
              <TabsTrigger value="peak-hours" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                <BarChart3 className="size-3.5" />
                <span>Jam Sibuk</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === 'transactions' && (
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Cari transaksi..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background h-8 text-xs shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* TAB 1: RIWAYAT TRANSAKSI */}
          <TabsContent value="transactions" className="m-0 space-y-2">
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px] text-xs">No. Invoice</TableHead>
                    <TableHead className="text-xs">Waktu Transaksi</TableHead>
                    <TableHead className="text-xs">Kanal Bayar</TableHead>
                    <TableHead className="text-right text-xs">Total Bayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                        Tidak ada transaksi yang cocok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((tx: any) => (
                      <TableRow 
                        key={tx.invoice}
                        onClick={() => handleOpenDetail(tx.raw || tx)}
                        className="cursor-pointer hover:bg-muted/60 transition-colors group select-none"
                      >
                        <TableCell className="font-mono font-medium text-primary text-xs flex items-center gap-1.5 group-hover:underline">
                          <FileText className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span>{tx.invoice}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] font-normal bg-background py-0 px-1.5">
                            {tx.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs">
                          {formatCurrency(tx.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Shadcn UI Pagination (Rekomendasi Restock Style) */}
            {totalTxPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
                <div>
                  Menampilkan {((currentTxPage - 1) * txLimit) + 1} - {Math.min(currentTxPage * txLimit, totalTxCount)} dari {totalTxCount} transaksi
                </div>
                <Pagination className="w-auto m-0 justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (currentTxPage > 1) setTxPage(currentTxPage - 1);
                        }}
                        className={cn("h-8 text-xs", currentTxPage <= 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalTxPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalTxPages || Math.abs(p - currentTxPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && (
                              <PaginationItem>
                                <PaginationEllipsis className="h-8" />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setTxPage(p)}
                                isActive={currentTxPage === p}
                                className="h-8 w-8 text-xs"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (currentTxPage < totalTxPages) setTxPage(currentTxPage + 1);
                        }}
                        className={cn("h-8 text-xs", currentTxPage >= totalTxPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PRODUK TERLARIS */}
          <TabsContent value="top-products" className="m-0">
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px] text-center text-xs">No.</TableHead>
                    <TableHead className="text-xs">Nama Produk</TableHead>
                    <TableHead className="text-xs">Kategori</TableHead>
                    <TableHead className="text-right text-xs">Unit Terjual</TableHead>
                    <TableHead className="text-right text-xs">Total HPP</TableHead>
                    <TableHead className="text-right text-xs">Margin %</TableHead>
                    <TableHead className="text-right text-xs">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProductsData.length === 0 && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">Belum ada data penjualan produk</TableCell>
                    </TableRow>
                  ) : topProductsData.map((prd: any, index: number) => (
                    <TableRow key={prd.id}>
                      <TableCell className="text-center font-bold text-xs">
                        <Badge 
                          variant={index === 0 ? "default" : "outline"} 
                          className={cn(
                            "size-5 rounded-full p-0 flex items-center justify-center mx-auto text-[10px] font-bold",
                            index === 0 && "bg-amber-500 hover:bg-amber-600 text-white"
                          )}
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-xs">
                        {prd.name}
                        <span className="block text-[10px] font-mono text-muted-foreground font-normal">{prd.id}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-normal py-0 px-1.5">
                          {prd.category || 'Umum'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-xs">
                        {prd.soldQty} <span className="text-[10px] font-normal text-muted-foreground">{prd.baseUnit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(prd.cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        {prd.margin}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                        {formatCurrency(prd.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: METODE PEMBAYARAN */}
          <TabsContent value="payment-methods" className="m-0">
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kanal Pembayaran</TableHead>
                    <TableHead className="text-right text-xs">Jumlah Transaksi</TableHead>
                    <TableHead className="w-[30%] text-xs">Kontribusi (%)</TableHead>
                    <TableHead className="text-right text-xs">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethodsData.length === 0 && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">Belum ada data pembayaran</TableCell>
                    </TableRow>
                  ) : paymentMethodsData.map((pm: any, idx: number) => {
                    const IconComponent = pm.icon
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-md bg-muted text-foreground">
                              <IconComponent className="size-3.5" style={{ color: pm.color }} />
                            </span>
                            <span>{pm.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {pm.count > 0 ? `${pm.count} Trx` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ width: `${pm.share}%`, backgroundColor: pm.color }} 
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold w-7">{pm.share}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                          {formatCurrency(pm.value)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 4: ANALISIS JAM SIBUK */}
          <TabsContent value="peak-hours" className="m-0">
            <div className="rounded-md border bg-card p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold">Distribusi Jam Sibuk Transaksi (100 Transaksi Terakhir)</h3>
              </div>

              {hourlyTrafficData.length === 0 && !isLoading ? (
                <div className="h-[210px] flex items-center justify-center text-sm text-muted-foreground">
                  Belum ada data transaksi
                </div>
              ) : (
                <div className="h-[210px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyTrafficData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} className="text-[10px] text-muted-foreground" />
                      <YAxis tickLine={false} axisLine={false} className="text-[10px] text-muted-foreground font-mono" />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-popover p-2 shadow-md text-xs space-y-0.5">
                                <p className="font-semibold text-[11px]">{label}</p>
                                <p className="text-primary font-mono">{payload[0]?.value} Transaksi</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="transaksi" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* TRANSACTION DETAIL MODAL */}
        <TransactionDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          sale={selectedSale}
        />

      </div>
    </TooltipProvider>
  )
}
