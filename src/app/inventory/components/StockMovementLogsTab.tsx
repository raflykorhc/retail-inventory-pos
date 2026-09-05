import React, { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Calendar,
  FileSpreadsheet,
  Filter,
  SlidersHorizontal,
  History,
  Package
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { type DateRange } from "react-day-picker";
import { cn, formatMultiUnitStock } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useStockMovements } from "@/hooks/queries/useStockReports";
import { useCategories } from "@/hooks/queries/useMetadata";
import { FilterCombobox } from "@/components/ui/filter-combobox";

export function StockMovementLogsTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [timeRange, setTimeRange] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: categories = [] } = useCategories();

  // Date range logic
  const dateParams = useMemo(() => {
    if (timeRange === "custom" && customDateRange?.from) {
      const startDate = customDateRange.from.toISOString().split("T")[0];
      const endDate = (customDateRange.to || customDateRange.from).toISOString().split("T")[0];
      return { startDate, endDate };
    }

    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDateObj = new Date(today);

    if (timeRange === "today") {
      // same date
    } else if (timeRange === "7d") {
      startDateObj.setDate(startDateObj.getDate() - 7);
    } else if (timeRange === "30d") {
      startDateObj.setDate(startDateObj.getDate() - 30);
    } else if (timeRange === "90d") {
      startDateObj.setDate(startDateObj.getDate() - 90);
    }

    const startDate = startDateObj.toISOString().split("T")[0];
    return { startDate, endDate };
  }, [timeRange, customDateRange]);

  const { data: logsResponse, isLoading, refetch } = useStockMovements({
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
    page,
    limit,
  });

  const logs = logsResponse?.items || [];
  const totalLogs = logsResponse?.total || 0;
  const totalPages = Math.ceil(totalLogs / limit);

  // Client-side search filtering
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((log: any) =>
      log.product?.name?.toLowerCase().includes(q) ||
      log.product?.code?.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const formatLogDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatMovementQtyWithUnit = (log: any, isPositive: boolean) => {
    const rawQty = Number(log.quantity) || 0;
    const absQty = Math.abs(rawQty);
    const sign = isPositive ? "+" : "-";

    if (absQty === 0) return `${sign}0`;

    // Helper: resolve unit name if it is a raw ID (e.g. 'unit_galon' -> 'GALON') or find from prices
    const getResolvedUnitName = (nameOrId?: string | null) => {
      if (!nameOrId) return "";
      if (log.product?.prices && Array.isArray(log.product.prices)) {
        const found = log.product.prices.find(
          (p: any) =>
            p.unitId === nameOrId ||
            p.unit?.id === nameOrId ||
            p.unit?.name?.toLowerCase() === nameOrId.toLowerCase()
        );
        if (found?.unit?.name) return found.unit.name;
      }
      if (nameOrId.startsWith("unit_")) {
        return nameOrId.replace(/^unit_/, "").replace(/_/g, " ").toUpperCase();
      }
      return nameOrId;
    };

    const isInternalUnitId =
      typeof log.unitName === "string" &&
      (log.unitName.startsWith("unit_") || log.unitName.startsWith("cuid_") || log.unitName.includes("-"));

    // 1. Prioritize explicit clean log.unitName & log.unitQuantity recorded during transaction
    if (
      log.unitName &&
      !isInternalUnitId &&
      log.unitQuantity !== null &&
      log.unitQuantity !== undefined &&
      Number(log.unitQuantity) !== 0
    ) {
      const absUnitQty = Math.abs(Number(log.unitQuantity));
      const formattedUnitQty = Number.isInteger(absUnitQty) ? absUnitQty : Number(absUnitQty.toFixed(2));
      const resolvedUnitName = getResolvedUnitName(log.unitName);
      return `${sign}${formattedUnitQty} ${resolvedUnitName}`.trim();
    }

    // 2. Smart Multi-Unit Matching based on product prices hierarchy
    if (log.product?.prices && Array.isArray(log.product.prices) && log.product.prices.length > 0) {
      const sortedPrices = [...log.product.prices].sort(
        (a: any, b: any) => (b.conversionFactor || 1) - (a.conversionFactor || 1)
      );

      // Check if absQty is an exact multiple of a larger unit (e.g. 30 Karung = 1 KOL, 100 Pcs = 1 ROLL)
      const exactFit = sortedPrices.find(
        (p: any) => (p.conversionFactor || 1) <= absQty && (absQty % (p.conversionFactor || 1) === 0)
      );

      if (exactFit) {
        const factor = exactFit.conversionFactor || 1;
        const converted = absQty / factor;
        const unitLabel = exactFit.unit?.name || getResolvedUnitName(exactFit.unitId) || "";
        return `${sign}${converted} ${unitLabel}`.trim();
      }

      // Find largest unit where conversionFactor <= absQty (so we never round down to 0)
      const fitUnit = sortedPrices.find((p: any) => (p.conversionFactor || 1) <= absQty);

      if (fitUnit) {
        const factor = fitUnit.conversionFactor || 1;
        const converted = absQty / factor;
        const formattedNum = Number.isInteger(converted) ? converted : Number(converted.toFixed(2));
        const unitLabel = fitUnit.unit?.name || getResolvedUnitName(fitUnit.unitId) || "";
        return `${sign}${formattedNum} ${unitLabel}`.trim();
      }

      // Fallback to smallest base unit (e.g. METER / PCS / KARUNG)
      const smallestUnit = sortedPrices[sortedPrices.length - 1];
      const factor = smallestUnit?.conversionFactor || 1;
      const converted = absQty / factor;
      const formattedNum = Number.isInteger(converted) ? converted : Number(converted.toFixed(2));
      const unitLabel = smallestUnit?.unit?.name || getResolvedUnitName(smallestUnit?.unitId) || "";
      return `${sign}${formattedNum} ${unitLabel}`.trim();
    }

    // 3. Fallback when no prices array is attached
    const fallbackUnit = getResolvedUnitName(log.unitName) || log.product?.unitName || log.product?.unit?.name || "";
    const formattedNum = Number.isInteger(absQty) ? absQty : Number(absQty.toFixed(2));
    return `${sign}${formattedNum} ${fallbackUnit}`.trim();
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
      case "PURCHASE":
      case "INITIAL":
      case "ADJUSTMENT_IN":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
            <ArrowDownLeft className="size-3" />
            <span>(IN)</span>
          </Badge>
        );
      case "OUT":
      case "SALE":
      case "DAMAGE":
      case "ADJUSTMENT_OUT":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] gap-1">
            <ArrowUpRight className="size-3" />
            <span>(OUT)</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] gap-1">
            <SlidersHorizontal className="size-3" />
            <span>{type}</span>
          </Badge>
        );
    }
  };

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error("Tidak ada data riwayat mutasi untuk diekspor");
      return;
    }

    const exportRows = filteredLogs.map((log: any, idx: number) => {
      const isOutType = log.type === "OUT" || log.type === "SALE" || log.type === "DAMAGE" || log.type === "ADJUSTMENT_OUT";
      const isInType = log.type === "IN" || log.type === "PURCHASE" || log.type === "INITIAL" || log.type === "ADJUSTMENT_IN";
      const rawQty = Number(log.quantity) || 0;
      const isPositive = isInType ? true : isOutType ? false : rawQty > 0;
      const qtyWithUnitStr = formatMovementQtyWithUnit(log, isPositive);

      return {
        "No": idx + 1,
        "Waktu Transaksi": formatLogDate(log.createdAt),
        "Tipe Mutasi": log.type,
        "Kode Produk": log.product?.code || "-",
        "Nama Produk": log.product?.name || "-",
        "Kategori": log.product?.category?.name || "-",
        "Perubahan Qty": qtyWithUnitStr,
        "Keterangan / Alasan": log.reason || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mutasi Stok");
    const dateTag = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `Riwayat_Mutasi_Stok_${dateTag}.xlsx`);
    toast.success("Log Mutasi Stok Berhasil Diunduh");
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar (1 Line, Unboxed) */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari SKU, Nama, atau Keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background shadow-2xs w-full"
          />
        </div>

        <Select value={typeFilter} onValueChange={(val: any) => { setTypeFilter(typeof val === "string" ? val : val.value); setPage(1); }}>
          <SelectTrigger className="min-w-[135px] shrink-0 h-8 text-xs bg-background shadow-2xs">
            <SelectValue>
              {typeFilter === "ALL" && "Semua Mutasi"}
              {typeFilter === "IN" && "Stok Masuk (IN)"}
              {typeFilter === "OUT" && "Stok Keluar (OUT)"}
              {typeFilter === "SALE" && "Penjualan (SALE)"}
              {typeFilter === "PURCHASE" && "Pembelian (PO)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Mutasi</SelectItem>
            <SelectItem value="IN">Stok Masuk (IN)</SelectItem>
            <SelectItem value="OUT">Stok Keluar (OUT)</SelectItem>
            <SelectItem value="SALE">Penjualan (SALE)</SelectItem>
            <SelectItem value="PURCHASE">Pembelian (PO)</SelectItem>
          </SelectContent>
        </Select>

        {/* Kategori (Searchable Combobox) */}
        <FilterCombobox
          value={categoryFilter}
          onChange={(val) => { setCategoryFilter(val); setPage(1); }}
          options={[
            { id: "ALL", name: "Semua Kategori" },
            ...categories.map((c: any) => ({ id: c.id, name: c.name }))
          ]}
          placeholder="Semua Kategori"
          searchPlaceholder="Cari kategori..."
          className="min-w-[145px] max-w-[220px]"
        />

        <Select value={timeRange} onValueChange={(val: any) => { setTimeRange(typeof val === "string" ? val : val.value); setPage(1); }}>
          <SelectTrigger className="min-w-[155px] shrink-0 h-8 text-xs bg-background shadow-2xs">
            <Calendar className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue>
              {timeRange === "today" && "Hari Ini"}
              {timeRange === "7d" && "7 Hari Terakhir"}
              {timeRange === "30d" && "30 Hari Terakhir"}
              {timeRange === "90d" && "3 Bulan Terakhir"}
              {timeRange === "custom" && "Rentang Kustom"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hari Ini</SelectItem>
            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
            <SelectItem value="90d">3 Bulan Terakhir</SelectItem>
            <SelectItem value="custom">Rentang Kustom</SelectItem>
          </SelectContent>
        </Select>

        {timeRange === "custom" && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-normal bg-background shadow-2xs gap-1.5 shrink-0"
                >
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "dd MMM yyyy", { locale: idLocale })} -{" "}
                        {format(customDateRange.to, "dd MMM yyyy", { locale: idLocale })}
                      </>
                    ) : (
                      format(customDateRange.from, "dd MMM yyyy", { locale: idLocale })
                    )
                  ) : (
                    <span>Pilih Tanggal</span>
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={filteredLogs.length === 0}
          className="h-8 px-2.5 gap-1.5 shadow-2xs text-xs font-medium text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0"
        >
          <FileSpreadsheet className="size-3.5" />
          <span>Excel</span>
        </Button>
      </div>

      {/* Table Content */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-[11px]">
              <TableHead className="w-[160px]">Waktu Transaksi</TableHead>
              <TableHead className="w-[100px]">Tipe Mutasi</TableHead>
              <TableHead className="min-w-[200px]">Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right w-[120px]">Perubahan Qty</TableHead>
              <TableHead className="min-w-[200px]">Keterangan / Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Memuat riwayat mutasi stok...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <History className="size-6 text-muted-foreground/60 mx-auto mb-2" />
                  Tidak ada catatan mutasi stok dalam rentang waktu yang dipilih.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log: any) => {
                const isOutType = log.type === "OUT" || log.type === "SALE" || log.type === "DAMAGE" || log.type === "ADJUSTMENT_OUT";
                const isInType = log.type === "IN" || log.type === "PURCHASE" || log.type === "INITIAL" || log.type === "ADJUSTMENT_IN";
                const rawQty = Number(log.quantity) || 0;
                const isPositive = isInType ? true : isOutType ? false : rawQty > 0;
                const qtyWithUnitStr = formatMovementQtyWithUnit(log, isPositive);

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatLogDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {getLogTypeBadge(log.type)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-medium text-foreground text-xs leading-tight">
                        {log.product?.name || "Produk telah dihapus"}
                      </div>
                      {log.product?.code && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {log.product.code}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 overflow-hidden">
                      {log.product?.category ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border/60 inline-block truncate max-w-full">
                          {log.product.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono font-bold whitespace-nowrap", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {qtyWithUnitStr}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.reason || <span className="text-muted-foreground/40 italic">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Shadcn UI Pagination (Rekomendasi Restock Style) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
          <div>
            Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, totalLogs)} dari {totalLogs} log
          </div>
          <Pagination className="w-auto m-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (page > 1) setPage(page - 1);
                  }}
                  className={cn("h-8 text-xs", page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
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
                          onClick={() => setPage(p)}
                          isActive={page === p}
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
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={cn("h-8 text-xs", page >= totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
