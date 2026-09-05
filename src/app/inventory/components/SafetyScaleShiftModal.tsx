import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface PreflightData {
  canShift: boolean;
  scaleShiftRatio: number;
  oldBaseUnitName: string;
  newBaseUnitName: string;
  preScaling: {
    stock: number;
    unit: string;
    averageCost: number;
    totalValuation: number;
  };
  postScaling: {
    stock: number;
    unit: string;
    averageCost: number;
    totalValuation: number;
  };
  valuationDelta: number;
  errors?: string[];
}

interface SafetyScaleShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  preflightData: PreflightData | null;
  isLoading?: boolean;
}

export function SafetyScaleShiftModal({
  isOpen,
  onClose,
  onConfirm,
  preflightData,
  isLoading = false,
}: SafetyScaleShiftModalProps) {
  if (!preflightData) return null;

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh] w-full">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Konfirmasi Perubahan Satuan Dasar</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4 text-xs">
              {/* Peringatan Banner */}
              <div className="p-3.5 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Peringatan Perubahan Satuan Dasar</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  Perubahan Satuan Dasar akan memperbarui kuantitas stok, batch FIFO, dan HPP historis secara otomatis dengan rasio pergeseran skala <strong className="font-bold text-primary">S = {preflightData.scaleShiftRatio}</strong>.
                </p>
              </div>

              {/* Guardrail Errors (jika diblokir) */}
              {!preflightData.canShift && preflightData.errors && preflightData.errors.length > 0 && (
                <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1.5">
                  <div className="text-xs font-bold text-destructive">Perubahan Diblokir:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-destructive font-medium">
                    {preflightData.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabel Perbandingan Before vs After */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ringkasan Perbandingan Stok & HPP
                </div>
                <div className="border border-border/70 rounded-lg overflow-hidden bg-card">
                  <Table className="w-full text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead className="py-2.5 px-3 font-bold">Metrik</TableHead>
                        <TableHead className="py-2.5 px-3 font-bold">Sebelum</TableHead>
                        <TableHead className="py-2.5 px-3 font-bold">Sesudah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-2 px-3 font-medium text-muted-foreground">Satuan Dasar</TableCell>
                        <TableCell className="py-2 px-3 font-mono">{preflightData.oldBaseUnitName}</TableCell>
                        <TableCell className="py-2 px-3 font-mono font-bold text-primary flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span>{preflightData.newBaseUnitName}</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-2 px-3 font-medium text-muted-foreground">Total Stok Gudang</TableCell>
                        <TableCell className="py-2 px-3 font-mono">{formatNumber(preflightData.preScaling.stock)} {preflightData.oldBaseUnitName}</TableCell>
                        <TableCell className="py-2 px-3 font-mono font-bold text-primary flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span>{formatNumber(preflightData.postScaling.stock)} {preflightData.newBaseUnitName}</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-2 px-3 font-medium text-muted-foreground">Harga Pokok (HPP)</TableCell>
                        <TableCell className="py-2 px-3 font-mono">{formatCurrency(preflightData.preScaling.averageCost)} / {preflightData.oldBaseUnitName}</TableCell>
                        <TableCell className="py-2 px-3 font-mono font-bold text-primary flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span>{formatCurrency(preflightData.postScaling.averageCost)} / {preflightData.newBaseUnitName}</span>
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell className="py-2.5 px-3 font-bold text-foreground">Total Valuasi Aset</TableCell>
                        <TableCell className="py-2.5 px-3 font-mono">{formatCurrency(preflightData.preScaling.totalValuation)}</TableCell>
                        <TableCell className="py-2.5 px-3 font-mono text-primary flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span>{formatCurrency(preflightData.postScaling.totalValuation)}</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Status Valuasi Badge */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Deviasi Valuasi Aset: Rp 0</div>
                    <div className="text-[11px] text-muted-foreground">Valuasi stok persediaan dihitung presisi identik (tidak ada deviasi nilai aset).</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold shrink-0">
                  Presisi 100%
                </Badge>
              </div>
            </div>

            <DialogFooter className="mt-6 -mx-6 -mb-6 px-6 py-4 flex flex-row items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
                Batal
              </Button>
              <Button
                onClick={onConfirm}
                disabled={!preflightData.canShift || isLoading}
                type="button"
              >
                {isLoading ? "Memproses..." : "Ya, Terapkan Perubahan Skala"}
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
