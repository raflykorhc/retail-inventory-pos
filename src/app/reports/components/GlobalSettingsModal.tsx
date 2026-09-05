import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Settings, RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const res = await axiosClient.get("/settings");
      return res.data;
    },
    enabled: open,
  });

  const [formData, setFormData] = React.useState({
    abcLimitA: 80,
    abcLimitB: 95,
    defaultHoldingInterval: 14,
    defaultLeadTime: 3,
    defaultSafetyStockDays: 1,
  });

  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [resetMinMax, setResetMinMax] = React.useState(true);
  const [isResetting, setIsResetting] = React.useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        abcLimitA: settings.abcLimitA ?? 80,
        abcLimitB: settings.abcLimitB ?? 95,
        defaultHoldingInterval: settings.defaultHoldingInterval ?? 14,
        defaultLeadTime: settings.defaultLeadTime ?? 3,
        defaultSafetyStockDays: settings.defaultSafetyStockDays ?? 1,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await axiosClient.post("/settings", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
      // Invalidate preview optimization to re-calculate with new defaults
      queryClient.invalidateQueries({ queryKey: ["inventory-optimization"] });
      queryClient.invalidateQueries({ queryKey: ["abcOptimization"] });
      onOpenChange(false);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.abcLimitA >= formData.abcLimitB) {
      toast.error("Input Tidak Valid", {
        description: "Limit A harus lebih kecil dari Limit B.",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleResetApplied = async () => {
    setIsResetting(true);
    try {
      const res = await axiosClient.post("/inventory-optimization/reset", {
        resetMinMax,
      });
      if (res.data.success) {
        toast.success("Hasil Penerapan Di-reset", {
          description: `${res.data.resetCount} produk berhasil di-reset ke kondisi semula.`,
        });
        queryClient.invalidateQueries({ queryKey: ["inventory-optimization"] });
        queryClient.invalidateQueries({ queryKey: ["abcOptimization"] });
        setIsResetConfirmOpen(false);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error("Gagal Mereset Hasil Penerapan", {
        description: err.response?.data?.message || "Terjadi kesalahan pada server.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Pengaturan Default Parameter
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Memuat pengaturan...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="defaultLeadTime">Lead Time (Hari)</Label>
                  <Input
                    id="defaultLeadTime"
                    name="defaultLeadTime"
                    type="number"
                    min="0"
                    value={formData.defaultLeadTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSafetyStockDays">Safety Stock (Hari)</Label>
                  <Input
                    id="defaultSafetyStockDays"
                    name="defaultSafetyStockDays"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.defaultSafetyStockDays}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultHoldingInterval">Tahan Stok / Holding Interval (Hari)</Label>
                <Input
                  id="defaultHoldingInterval"
                  name="defaultHoldingInterval"
                  type="number"
                  min="1"
                  value={formData.defaultHoldingInterval}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="pt-4 border-t border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Ambang Batas (Limit) Kategori ABC</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="abcLimitA">Limit A (%)</Label>
                    <Input
                      id="abcLimitA"
                      name="abcLimitA"
                      type="number"
                      min="1"
                      max={formData.abcLimitB > 1 ? formData.abcLimitB - 1 : 100}
                      value={formData.abcLimitA}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="abcLimitB">Limit B (%)</Label>
                    <Input
                      id="abcLimitB"
                      name="abcLimitB"
                      type="number"
                      min={formData.abcLimitA < 100 ? formData.abcLimitA + 1 : 1}
                      max="100"
                      value={formData.abcLimitB}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                {/* Preview & Validation ABC */}
                {(() => {
                  const a = formData.abcLimitA;
                  const b = formData.abcLimitB - formData.abcLimitA;
                  const c = 100 - formData.abcLimitB;
                  const isValid = a > b && b > c && a > 0 && b > 0 && c >= 0;
                  
                  return (
                    <div className="mt-4 p-3 rounded-md bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">Hasil Pembagian Proporsi:</span>
                        {!isValid && (
                          <span className="text-destructive font-semibold">Porsi tidak logis (Harus A &gt; B &gt; C)</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className={cn("p-2 rounded border", a > b ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive")}>
                          <div className="font-semibold mb-0.5">Kelas A</div>
                          <div>{a}%</div>
                        </div>
                        <div className={cn("p-2 rounded border", b > c && b < a ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-destructive/10 border-destructive/20 text-destructive")}>
                          <div className="font-semibold mb-0.5">Kelas B</div>
                          <div>{b}%</div>
                        </div>
                        <div className={cn("p-2 rounded border", c < b && c >= 0 ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-destructive/10 border-destructive/20 text-destructive")}>
                          <div className="font-semibold mb-0.5">Kelas C</div>
                          <div>{c}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Seksi Reset Hasil Penerapan */}
              <div className="pt-4 border-t border-border/40">
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <RotateCcw className="size-3.5 shrink-0" />
                        Reset Hasil Penerapan Optimasi
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Kembalikan status klasifikasi ABC, hasil hitung ulang, dan rekomendasi stok produk ke kondisi awal (belum diterapkan).
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs font-medium px-2.5 shrink-0 gap-1.5"
                      onClick={() => setIsResetConfirmOpen(true)}
                    >
                      <RotateCcw className="size-3" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 mt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    updateMutation.isPending || 
                    formData.abcLimitA <= (formData.abcLimitB - formData.abcLimitA) || 
                    (formData.abcLimitB - formData.abcLimitA) <= (100 - formData.abcLimitB)
                  }
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Default"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Reset */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Konfirmasi Reset Penerapan & Hitung Ulang
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs leading-relaxed">
              Apakah Anda yakin ingin mereset seluruh hasil penerapan & hasil hitung ulang optimasi ABC & Stok Min-Max?
              <br /><br />
              Tindakan ini akan mengosongkan cache kalkulasi hitung ulang, kategori ABC, dan rekomendasi stok yang sebelumnya telah diterapkan ke database.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resetMinMax}
                onChange={(e) => setResetMinMax(e.target.checked)}
                className="rounded border-border text-destructive focus:ring-destructive size-4"
              />
              <span>Kembalikan Stok Min ke default (10) & Hapus Stok Max</span>
            </label>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetConfirmOpen(false)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetApplied}
              disabled={isResetting}
              className="gap-1.5"
            >
              <RotateCcw className={cn("size-3.5", isResetting && "animate-spin")} />
              {isResetting ? "Mereset..." : "Ya, Reset Hasil Penerapan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
