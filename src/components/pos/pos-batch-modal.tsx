"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/axiosClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Loader2, Package, CalendarDays, Plus, Layers } from "lucide-react";
import { useProductBatches } from "@/hooks/queries/useProducts";
import { formatMultiUnitStock } from "@/lib/utils";

interface PosBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onAddToCart: (productWithBatch: any) => void;
}

export function PosBatchModal({ isOpen, onClose, product, onAddToCart }: PosBatchModalProps) {
  const { data: batchesData, isLoading } = useProductBatches(product?.id || "", true);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await axiosClient.get("/units")).data,
    enabled: isOpen,
  });

  const batches = useMemo(() => {
    if (!batchesData) return [];
    return Array.isArray(batchesData?.data) ? batchesData.data : Array.isArray(batchesData) ? batchesData : [];
  }, [batchesData]);

  // Handle available units for the product
  const units = useMemo(() => {
    if (!product?.prices || product.prices.length === 0) return [];
    return [...product.prices].sort((a: any, b: any) => b.conversionFactor - a.conversionFactor);
  }, [product]);

  // Set default selected unit when product changes
  React.useEffect(() => {
    if (units.length > 0) {
      const defaultId = String(units[0].unitId || units[0].id);
      setSelectedUnitId(defaultId);
    }
  }, [product, units]);

  const activeUnitObj = useMemo(() => {
    if (!units.length) return null;
    return units.find((u: any) => String(u.unitId || u.id) === String(selectedUnitId)) || units[0];
  }, [units, selectedUnitId]);

  const getUnitName = (priceObj: any) => {
    if (!priceObj) return product?.unit || "Pcs";
    const targetUnitId = String(priceObj.unitId || priceObj.id || "");
    const foundInUnitsData = unitsData?.find((u: any) => String(u.id) === targetUnitId || String(u.id) === String(priceObj.unitId));
    if (foundInUnitsData?.name) return foundInUnitsData.name;
    if (priceObj.unit?.name) return priceObj.unit.name;
    if (typeof priceObj.unit === 'string' && priceObj.unit.trim() !== '') return priceObj.unit;
    return product?.unit || "Pcs";
  };

  const mainPriceObj = units[0];
  const mainFactor = mainPriceObj?.conversionFactor || 1;

  const safeFormatDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "-" : format(d, "dd MMM yyyy, HH:mm", { locale: id });
  };

  const calculateBatchPrice = (batch: any, unitObj: any) => {
    if (!unitObj) return product?.price || 0;
    
    // 1. Check batchPrices for exact unitId match
    if (batch.batchPrices && Array.isArray(batch.batchPrices)) {
      const matchedBatchPrice = batch.batchPrices.find((bp: any) => String(bp.unitId) === String(unitObj.unitId || unitObj.id));
      if (matchedBatchPrice && Number(matchedBatchPrice.price) > 0) {
        return Number(matchedBatchPrice.price);
      }
    }

    // 2. Check batch.sellingPrice (stored as price per base unit)
    if (batch.sellingPrice && Number(batch.sellingPrice) > 0) {
      return Math.round(Number(batch.sellingPrice) * (unitObj.conversionFactor || 1));
    }

    // 3. Fallback to product unit price
    return Number(unitObj.price || product?.price || 0);
  };

  const handleQtyChange = (batchId: string, value: number) => {
    setQtyMap((prev) => ({
      ...prev,
      [batchId]: Math.max(1, value),
    }));
  };

  const handleAddBatchToCart = (batch: any) => {
    const qty = qtyMap[batch.id] || 1;
    const factor = activeUnitObj?.conversionFactor || 1;
    const unitName = getUnitName(activeUnitObj);
    const batchPrice = calculateBatchPrice(batch, activeUnitObj);

    // Date tag for batch identification display
    const batchDateStr = safeFormatDate(batch.createdAt).split(',')[0];

    const productWithBatch = {
      ...product,
      id: product.id,
      batchId: batch.id,
      batchCode: batchDateStr,
      batchSellingPrice: batch.sellingPrice,
      batchPrices: batch.batchPrices,
      mainFactor: mainFactor,
      price: batchPrice,
      unit: unitName,
      unitId: activeUnitObj?.unitId || activeUnitObj?.id,
      conversionFactor: factor,
      stock: batch.currentQuantity, // Batch specific stock
      prices: product.prices,
      selectedPriceId: activeUnitObj?.id || activeUnitObj?.unitId,
      customQuantity: qty
    };

    onAddToCart(productWithBatch);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border-border/60">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>
                Pilih Batch Stok
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {product.name} {product.code && `(${product.code})`}
              </DialogDescription>
            </div>
            
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-background shrink-0">
              Total Stok: {formatMultiUnitStock(product.stock, product.prices || [])}
            </Badge>
          </div>

          {/* Unit selector if multiple units exist */}
          {units.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Pilih Satuan Jual:</span>
              <Select value={String(selectedUnitId)} onValueChange={(val) => setSelectedUnitId(val)}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-background border-input">
                  <span className="flex flex-1 text-left truncate font-medium">
                    {getUnitName(activeUnitObj)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => {
                    const uValue = String(u.unitId || u.id);
                    const uName = getUnitName(u);
                    return (
                      <SelectItem key={uValue} value={uValue} className="text-xs">
                        {uName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        {/* Content list of batches */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 shrink min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary" />
              <p className="text-xs">Memuat daftar batch aktif...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
              <Package className="w-9 h-9 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-foreground">Tidak Ada Batch Aktif</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Stok produk ini sedang kosong atau belum terdaftar dalam batch mana pun.
              </p>
            </div>
          ) : (
            batches.map((batch: any) => {
              const unitFactor = activeUnitObj?.conversionFactor || 1;
              const unitName = getUnitName(activeUnitObj);
              
              // Max available quantity in selected unit
              const availableQtyInUnit = Math.floor(batch.currentQuantity / unitFactor);
              const batchPrice = calculateBatchPrice(batch, activeUnitObj);
              const qtyToBuy = qtyMap[batch.id] || 1;

              const supplierName = batch.purchaseItem?.purchase?.supplier?.name || product.supplier?.name || "Stok Awal";

              return (
                <div
                  key={batch.id}
                  className="p-3 rounded-lg border border-border/70 bg-card text-card-foreground hover:border-primary/40 transition-all shadow-xs space-y-2"
                >
                  {/* Row 1: Supplier (Left), Tanggal (Center) & Harga (Right) */}
                  <div className="grid grid-cols-3 items-center gap-2">
                    <div className="flex justify-start min-w-0">
                      <span 
                        className="inline-flex items-center text-[11px] font-semibold text-foreground bg-secondary/80 text-secondary-foreground border border-border/60 px-2 py-0.5 rounded-md truncate max-w-full"
                        title={supplierName}
                      >
                        {supplierName}
                      </span>
                    </div>

                    <div className="flex justify-center items-center gap-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap min-w-0">
                      <CalendarDays className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                      <span>{safeFormatDate(batch.createdAt)}</span>
                    </div>

                    <div className="flex justify-end items-center text-right shrink-0">
                      <span className="text-sm font-bold text-primary">
                        Rp {batchPrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground ml-1">/ {unitName}</span>
                    </div>
                  </div>

                  {/* Row 2: Stok & Aksi */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                    <div className="text-xs text-muted-foreground font-medium">
                      Stok: <strong className="text-foreground font-bold">{availableQtyInUnit}</strong> {unitName}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min="1"
                        max={availableQtyInUnit}
                        value={qtyToBuy}
                        onChange={(e) => handleQtyChange(batch.id, parseInt(e.target.value) || 1)}
                        className="h-7 w-14 text-center text-xs font-bold rounded-md border-input bg-background px-1"
                      />
                      <Button
                        size="sm"
                        disabled={availableQtyInUnit <= 0}
                        onClick={() => handleAddBatchToCart(batch)}
                        className="h-7 text-xs font-semibold rounded-md gap-1 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

