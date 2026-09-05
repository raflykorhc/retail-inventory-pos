"use client";

import * as React from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { cn } from "@/lib/utils";

export const getAbcProcessSteps = (limitA: number = 80, limitB: number = 95) => [
  {
    title: "Menganalisis Data Penjualan Produk",
    subtasks: ["Mengambil riwayat transaksi penjualan", "Menghitung total nilai omzet per produk", "Merekapitulasi pergerakan barang"]
  },
  {
    title: "Mengurutkan Peringkat & Kontribusi",
    subtasks: ["Menyusun produk dari penjualan tertinggi", "Menghitung persentase kontribusi per produk", "Mengakumulasi total kontribusi penjualan"]
  },
  {
    title: "Menetapkan Kelas Produk (A, B, C)",
    subtasks: [
      `Kelas A: Penyumbang ${limitA}% omzet (Sangat Penting)`, 
      `Kelas B: Penyumbang ${limitB - limitA}% omzet (Penting)`, 
      `Kelas C: Penyumbang ${100 - limitB}% omzet (Kurang Penting)`
    ]
  },
  {
    title: "Menghitung Rekomendasi Stok Ideal",
    subtasks: ["Menganalisis rata-rata penjualan harian", "Menghitung batas stok aman (Safety Stock)", "Menentukan batas Minimum & Maksimum stok"]
  }
];

interface CalculationProcessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: number; // 0: belum, 1-4: running step, 5: all done
  activeSubtask: number; // 0-2 (controlled by backend)
  isLiveCalculating?: boolean;
  onViewResults?: () => void;
  totalProductsCount?: number;
  limitA?: number;
  limitB?: number;
}

export function CalculationProcessModal({
  isOpen,
  onOpenChange,
  currentStep,
  activeSubtask,
  isLiveCalculating = false,
  onViewResults,
  totalProductsCount,
  limitA = 80,
  limitB = 95
}: CalculationProcessModalProps) {
  const processSteps = React.useMemo(() => getAbcProcessSteps(limitA, limitB), [limitA, limitB]);
  const progressPercent = currentStep === 5 ? 100 : Math.max(0, (currentStep - 1) * 25 + (isLiveCalculating ? 15 : 0));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2 text-left shrink-0">
          <DialogTitle className="flex items-center justify-between text-base font-bold text-foreground">
            <span>{isLiveCalculating ? "Menjalankan Kalkulasi..." : "Alur Proses Optimasi"}</span>
            {totalProductsCount !== undefined && totalProductsCount > 0 && (
              <span className="text-[11px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {totalProductsCount} Produk
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Alur tahapan kalkulasi algoritma
          </DialogDescription>

          {isLiveCalculating && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Kemajuan Proses</span>
                <span className="font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 text-xs">
          {processSteps.map((step, idx) => {
            const stepId = idx + 1;
            const isCompleted = currentStep > stepId || currentStep === 5;
            const isRunning = currentStep === stepId && isLiveCalculating;
            const isPending = !isCompleted && !isRunning;

            return (
              <div key={stepId} className="flex flex-col gap-2">
                <div className={cn(
                  "text-xs font-bold transition-colors duration-300",
                  isRunning ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {step.title}
                </div>
                
                <div className={cn(
                  "flex flex-col gap-2 pl-1 transition-all duration-500",
                  isPending ? "opacity-40" : "opacity-100"
                )}>
                  {step.subtasks.map((subtask, subIdx) => {
                    const isSubCompleted = isCompleted || (isRunning && subIdx < activeSubtask);
                    const isSubRunning = isRunning && subIdx === activeSubtask;
                    
                    return (
                      <Marker key={subIdx}>
                        <MarkerIcon>
                          {isSubCompleted ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 transition-all duration-500" />
                          ) : isSubRunning ? (
                            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin opacity-40" />
                              <Circle className="size-3.5 text-primary fill-primary/30 transition-all duration-300 scale-110 shadow-[0_0_6px_rgba(var(--primary),0.3)] rounded-full shrink-0" />
                            </div>
                          ) : (
                            <Circle className="size-3.5 text-muted-foreground/25 shrink-0 transition-all duration-300" />
                          )}
                        </MarkerIcon>
                        <MarkerContent className={cn(
                          "text-[11px] transition-colors duration-300 leading-snug",
                          isSubRunning ? "text-foreground font-semibold" : isSubCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
                        )}>
                          {subtask}
                        </MarkerContent>
                      </Marker>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer (Identik dengan Modal Tambah Barang: px-6 pb-6 pt-2 tanpa border/bg-muted) */}
        <DialogFooter className="px-6 pb-6 pt-2 shrink-0 sm:justify-end">
          <Button
            size="sm"
            onClick={() => {
              if (onViewResults) onViewResults();
              onOpenChange(false);
            }}
            disabled={isLiveCalculating && currentStep < 5}
            className="h-9 px-4 text-xs font-semibold gap-1.5"
          >
            <span>{currentStep === 5 || !isLiveCalculating ? "Tutup" : "Memproses..."}</span>
            {currentStep === 5 && <ArrowRight className="size-3.5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
