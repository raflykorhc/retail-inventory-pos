"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  ShoppingCart, 
  Package, 
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Users,
  FileText,
  Clock
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
import { Empty } from "@/components/ui/empty"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

import { useDashboardStats } from "@/hooks/queries/useDashboard"
import { TransactionDetailModal } from "@/app/reports/components/TransactionDetailModal"

export default function DashboardPage() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = React.useState("today")
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = React.useState("low-stock")
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // Date Range Filters Calculation (Default: "today" untuk operasional real-time)
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
      case 'today':
        break; // startDate & endDate is today
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [timeRange, customDateRange]);

  const { data, isLoading, refetch, isFetching } = useDashboardStats(dateFilters)

  const handleRefresh = async () => {
    await refetch()
    toast.success("Dashboard Diperbarui", {
      description: "Data operasional toko berhasil disinkronkan."
    })
  }

  // Dynamic Font Sizing for KPI cards (identik dengan Reports page)
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

  const metrics = data?.metrics || {
    totalRevenue: 0,
    revenueTrend: 0,
    totalHPP: 0,
    grossProfit: 0,
    netProfit: 0,
    netProfitTrend: 0,
    profitMargin: 0,
    totalTransactions: 0,
    transactionTrend: 0,
    averageTransaction: 0,
  }

  const salesTrend = data?.salesTrend || []
  const cashFlow = data?.cashFlow || []
  const topProducts = data?.topProducts || []
  const topCashiers = data?.topCashiers || []
  const recentSales = data?.recentSales || []
  const lowStockItems = data?.insights?.lowStock || []
  const lowStockCount = data?.insights?.lowStockCount || 0

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-5 w-full max-w-full overflow-x-hidden">
        
        {/* HEADER TOP BAR - Identik dengan Reports page */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-2.5 pb-1">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Dashboard</span>
              {timeRange === "today" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-Time
                </span>
              )}
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
                { label: "Hari Ini", value: "today" },
                { label: "7 Hari Terakhir", value: "7d" },
                { label: "30 Hari Terakhir", value: "30d" },
                { label: "Bulan Ini", value: "this-month" },
                { label: "Kustom (Range)", value: "custom" },
              ]}
            >
              <SelectTrigger className="w-[155px] bg-background shadow-2xs h-8 text-xs font-medium">
                <Calendar className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                <SelectItem value="this-month">Bulan Ini</SelectItem>
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
                    disabled={isLoading || isFetching}
                    className="size-8 shadow-2xs hover:bg-accent"
                  >
                    <RefreshCw className={cn("size-3.5 text-muted-foreground", (isLoading || isFetching) && "animate-spin text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Perbarui Data</TooltipContent>
              </Tooltip>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/inventory")}
                className="h-8 px-2.5 gap-1.5 shadow-2xs border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium text-xs"
              >
                <Package className="size-3.5" />
                <span>Stok Inventori</span>
              </Button>

              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate("/")}
                className="h-8 px-3 gap-1.5 shadow-2xs font-medium text-xs transition-transform active:scale-[0.98]"
              >
                <ShoppingCart className="size-3.5" />
                <span>Buka POS</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 1: EXECUTIVE KPI SUMMARY CARDS - Identik dengan Reports page */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: TOTAL OMZET */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground truncate">Total Omzet</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground shrink-0 whitespace-nowrap">
                {metrics.revenueTrend >= 0 ? (
                  <TrendingUp className="size-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-3 text-rose-500" />
                )}
                <span>{metrics.revenueTrend >= 0 ? `+${metrics.revenueTrend.toFixed(1)}%` : `${metrics.revenueTrend.toFixed(1)}%`}</span>
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
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground transition-all", getFontSizeClass(metrics.totalRevenue))}>
                    {formatCurrency(metrics.totalRevenue)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">Total omzet kotor periode ini</p>
              </>
            )}
          </div>

          {/* CARD 2: ESTIMASI LABA */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground truncate">Estimasi Laba</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground shrink-0 whitespace-nowrap">
                <TrendingUp className="size-3 text-blue-500" />
                <span>+{metrics.profitMargin.toFixed(1)}%</span>
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
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground transition-all", getFontSizeClass(metrics.netProfit))}>
                    {formatCurrency(metrics.netProfit)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  HPP: <span className="font-semibold font-mono text-foreground">{formatCurrency(metrics.totalHPP)}</span>
                </p>
              </>
            )}
          </div>

          {/* CARD 3: TOTAL TRANSAKSI */}
          <div className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground truncate">Total Transaksi</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground shrink-0 whitespace-nowrap">
                {metrics.transactionTrend >= 0 ? (
                  <TrendingUp className="size-3 text-purple-500" />
                ) : (
                  <TrendingDown className="size-3 text-rose-500" />
                )}
                <span>{metrics.transactionTrend >= 0 ? `+${metrics.transactionTrend.toFixed(1)}%` : `${metrics.transactionTrend.toFixed(1)}%`}</span>
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
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground flex items-baseline gap-1.5 transition-all", getFontSizeClass(metrics.totalTransactions))}>
                    <span>{metrics.totalTransactions}</span>
                    <span className="text-sm font-normal text-muted-foreground">Trx</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  AOV: <span className="font-semibold font-mono text-foreground">{formatCurrency(metrics.averageTransaction)}</span>
                </p>
              </>
            )}
          </div>

          {/* CARD 4: STOK KRITIS / REORDER */}
          <div 
            onClick={() => navigate("/inventory?tab=reorder")}
            className="border border-border/60 bg-gradient-to-b from-card via-card to-blue-50/80 dark:bg-card dark:bg-none rounded-xl p-5 hover:border-border transition-all shadow-2xs cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">Stok Menipis</span>
              <div className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold font-mono text-foreground shrink-0 whitespace-nowrap",
                lowStockCount > 0 && "text-rose-500 border-rose-500/30"
              )}>
                {lowStockCount > 0 ? (
                  <AlertTriangle className="size-3 text-rose-500" />
                ) : (
                  <CheckCircle2 className="size-3 text-emerald-500" />
                )}
                <span>{lowStockCount > 0 ? "Reorder" : "Aman"}</span>
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
                  <div className={cn("font-extrabold font-mono tracking-tight text-foreground flex items-baseline gap-1.5 transition-all", getFontSizeClass(lowStockCount))}>
                    <span>{lowStockCount}</span>
                    <span className="text-sm font-normal text-muted-foreground">Item</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Produk di bawah batas minimum stok
                </p>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: GRAPH & ARUS KAS - Identik dengan Reports page */}
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
            ) : salesTrend.length === 0 ? (
              <Empty 
                icon={TrendingUp}
                title="Belum Ada Data Grafik"
                description="Tidak ada data omzet & laba pada periode ini."
                className="min-h-[225px]"
              />
            ) : (
              <div className="h-[225px] sm:h-[235px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 6, right: 4, left: -10, bottom: -4 }}>
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
                          const omzet = Number(payload[0]?.value || 0)
                          const laba = Number(payload[1]?.value ?? payload[0]?.payload?.profit ?? 0)
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1 min-w-[150px]">
                              <p className="font-semibold text-popover-foreground border-b pb-1 text-[11px]">{label}</p>
                              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-mono">
                                <span>Omzet:</span>
                                <span className="font-bold">{formatCurrency(omzet)}</span>
                              </div>
                              <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-mono">
                                <span>Laba Bersih:</span>
                                <span className="font-bold">{formatCurrency(laba)}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOmzet)" />
                    <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLaba)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* ARUS KAS & PENGELUARAN */}
          <Card className="lg:col-span-1 border border-border/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-semibold">
                Arus Kas Toko
              </h2>
            </div>

            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : cashFlow.length === 0 ? (
              <Empty 
                icon={TrendingUp}
                title="Arus Kas Kosong"
                description="Belum ada data pemasukan & pengeluaran."
                className="min-h-[225px]"
              />
            ) : (
              <div className="h-[225px] sm:h-[235px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlow} margin={{ top: 6, right: 4, left: -20, bottom: -4 }}>
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
                                <span>Masuk (Sales):</span>
                                <span className="font-bold">{formatCurrency(Number(payload[0]?.value || 0))}</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-mono">
                                <span>Keluar (Kulakan):</span>
                                <span className="font-bold">{formatCurrency(Number(payload[1]?.value || 0))}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: TATA LETAK 2-KOLOM OPERASIONAL (LIVE FEED TRANSAKSI & WATCHLIST) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* KARTU KIRI: TRANSAKSI TERKINI (LIVE STREAM OPERASIONAL) */}
          <Card className="border border-border/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" />
                    <span>Transaksi Terkini</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    5 transaksi penjualan terbaru yang diproses
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/reports")} 
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                >
                  <span>Laporan Struk</span>
                  <ArrowUpRight className="size-3" />
                </Button>
              </div>

              <div className="rounded-md border border-border/40 bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="text-xs">No. Invoice</TableHead>
                      <TableHead className="text-xs">Waktu</TableHead>
                      <TableHead className="text-xs">Kanal Bayar</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx} className="border-border/40">
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-44 p-0">
                          <Empty 
                            icon={FileText}
                            title="Belum Ada Transaksi"
                            description="Belum ada transaksi penjualan yang diproses pada periode ini."
                            action={
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate("/")}
                                className="h-7 text-xs font-medium gap-1 px-2.5 shadow-2xs"
                              >
                                <ShoppingCart className="size-3" />
                                <span>Buka POS Sekarang</span>
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentSales.map((tx: any) => (
                        <TableRow 
                          key={tx.id} 
                          onClick={() => {
                            setSelectedSale(tx);
                            setIsDetailOpen(true);
                          }}
                          className="border-border/40 hover:bg-muted/60 cursor-pointer transition-colors group select-none"
                        >
                          <TableCell className="font-mono font-medium text-primary text-xs flex items-center gap-1.5 group-hover:underline">
                            <FileText className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span>{tx.invoiceNumber}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 bg-background">
                              {tx.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                            {formatCurrency(tx.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          {/* KARTU KANAN: TABBED OPERATIONAL WATCHLIST (STOK KRITIS, TOP PRODUK, KASIR) */}
          <Card className="border border-border/60 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-3">
                <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-muted/60 p-1 text-muted-foreground">
                  <TabsTrigger value="low-stock" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                    <AlertTriangle className="size-3.5" />
                    <span>Stok Menipis ({lowStockCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="top-products" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                    <Package className="size-3.5" />
                    <span>Top Produk</span>
                  </TabsTrigger>
                  <TabsTrigger value="cashiers" className="px-3 py-1.5 text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md">
                    <Users className="size-3.5" />
                    <span>Kasir</span>
                  </TabsTrigger>
                </TabsList>

                {activeTab === "low-stock" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/inventory?tab=reorder")} 
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                  >
                    <span>Restock</span>
                    <ArrowUpRight className="size-3" />
                  </Button>
                )}
              </div>

              {/* TAB 1: STOK MENIPIS */}
              <TabsContent value="low-stock" className="m-0">
                <div className="rounded-md border border-border/40 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-xs">Nama Produk</TableHead>
                        <TableHead className="text-center text-xs">Stok / Min</TableHead>
                        <TableHead className="text-right text-xs">Status Reorder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <TableRow key={idx} className="border-border/40">
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : lowStockItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-44 p-0">
                            <Empty 
                              icon={CheckCircle2}
                              title="Stok Aman"
                              description="Semua stok produk dalam inventori di atas batas minimum."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        lowStockItems.map((item: any, idx: number) => (
                          <TableRow key={idx} className="border-border/40 hover:bg-muted/40">
                            <TableCell className="font-medium text-xs text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              <span className="font-bold text-rose-600 dark:text-rose-400">{item.stock}</span> / <span className="text-muted-foreground">{item.minStock}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="destructive" className="text-[10px] font-normal py-0 px-1.5">
                                Reorder Required
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 2: TOP PRODUK TERLARIS */}
              <TabsContent value="top-products" className="m-0">
                <div className="rounded-md border border-border/40 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="w-[45px] text-center text-xs">No.</TableHead>
                        <TableHead className="text-xs">Nama Produk</TableHead>
                        <TableHead className="text-right text-xs">Unit</TableHead>
                        <TableHead className="text-right text-xs font-semibold">Total Omzet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <TableRow key={idx} className="border-border/40">
                            <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : topProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-44 p-0">
                            <Empty 
                              icon={Package}
                              title="Belum Ada Data Produk"
                              description="Belum ada produk yang terjual pada periode ini."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        topProducts.map((prd: any, index: number) => (
                          <TableRow key={index} className="border-border/40 hover:bg-muted/40">
                            <TableCell className="text-center font-bold text-xs">
                              <Badge 
                                variant={index === 0 ? "default" : "outline"} 
                                className={cn(
                                  "size-5 rounded-full p-0 flex items-center justify-center mx-auto text-[10px] font-bold",
                                  index === 0 && "bg-amber-500 hover:bg-amber-600 text-white border-none"
                                )}
                              >
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-xs text-foreground">
                              {prd.name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-xs">
                              {prd.sales}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                              {formatCurrency(prd.revenue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 3: PERFORMA KASIR */}
              <TabsContent value="cashiers" className="m-0">
                <div className="rounded-md border border-border/40 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-xs">Nama Kasir / User</TableHead>
                        <TableHead className="text-center text-xs">Jumlah Trx</TableHead>
                        <TableHead className="text-right text-xs font-semibold">Total Omzet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, idx) => (
                          <TableRow key={idx} className="border-border/40">
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : topCashiers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-44 p-0">
                            <Empty 
                              icon={Users}
                              title="Belum Ada Data Kasir"
                              description="Belum ada aktivitas transaksi kasir pada periode ini."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        topCashiers.map((cashier: any, idx: number) => (
                          <TableRow key={idx} className="border-border/40 hover:bg-muted/40">
                            <TableCell className="font-medium text-xs text-foreground flex items-center gap-1.5">
                              <Users className="size-3.5 text-muted-foreground" />
                              <span>{cashier.name}</span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {cashier.transactionCount} Trx
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                              {formatCurrency(cashier.revenue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

        </div>

        {/* TRANSACTION DETAIL MODAL */}
        <TransactionDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          sale={selectedSale}
        />

      </div>
    </TooltipProvider>
  )
}
