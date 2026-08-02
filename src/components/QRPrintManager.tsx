import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Printer, 
  Package, 
  Layers, 
  Trash2, 
  Plus, 
  Settings2, 
  AlertCircle,
  Copy,
  LayoutGrid,
  Tags,
  Loader2
} from "lucide-react";
import { cn, formatCurrency, formatMultiUnitStock } from "../lib/utils";
import { useProductBatches } from "../hooks/queries/useProducts";

interface PrintItem {
  id: string; // unique ID for the queue
  productId: string;
  productName: string;
  productCode: string;
  batchId?: string;
  price: number;
  category?: string;
  unit?: string;
  copies: number;
  printType: "PRODUCT" | "BATCH";
  availablePrices?: Array<{ unitId: string; unitName: string; price: number; conversionFactor: number }>;
}

interface QRPrintManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: any[]; // Passed from selection
}

// Komponen Template Cetak menggunakan React dan Tailwind
const PrintTemplate = React.forwardRef<HTMLDivElement, { queue: PrintItem[], layout: "STICKER" | "SHELF" | "A4" }>(({ queue, layout }, ref) => {
  const settings = useSettingsStore.getState().settings;
  return (
    <div ref={ref} className="bg-white print:p-0">
       <style type="text/css" media="print">
        {`
          @page { size: ${layout === 'A4' ? 'A4' : 'auto'}; margin: 0; }
          html, body { background: #fff; margin: 0; padding: 0; }
        `}
      </style>
      
      <div className={cn(
        layout === 'A4' ? 'grid grid-cols-3 gap-[5mm] p-[10mm]' : 
        layout === 'STICKER' ? 'flex flex-col items-center bg-gray-100 print:bg-white' : 
        'flex flex-col items-center p-[5mm] bg-gray-100 print:bg-white print:p-0'
      )}>
        {queue.flatMap(item => 
          Array(item.copies).fill(0).map((_, i) => {
            const qrValue = item.printType === "BATCH" ? `BATCH:${item.batchId}` : item.productCode;
            const footerText = item.printType === "BATCH" ? `B:${item.batchId?.slice(-8).toUpperCase()}` : item.productCode;
            
            if (layout === "STICKER") {
              return (
                <div key={`${item.id}-${i}`} className="w-[50mm] h-[30mm] p-[2mm_3mm] box-border flex flex-row items-stretch justify-between bg-white overflow-hidden border border-dashed border-gray-300 print:border-none" style={{ pageBreakAfter: 'always' }}>
                  <div className="flex flex-col justify-between flex-1 pr-[2mm] overflow-hidden">
                    <div className="text-[7.5pt] font-[800] leading-[1.2] max-h-[2.4em] overflow-hidden text-black uppercase tracking-[-0.2px] line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.productName}</div>
                    <div className="bg-black text-white px-[1.5mm] py-[1.5mm] rounded-[1mm] flex items-center justify-center mt-auto mb-[1.5mm]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <div className="text-[11pt] font-[900] leading-none tracking-[-0.5px]">Rp {item.price.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="text-[5pt] font-[900] text-black font-mono tracking-[0.5px] uppercase border-t-[1.5px] border-black pt-[0.8mm] whitespace-nowrap overflow-hidden text-ellipsis">{footerText}</div>
                  </div>
                  <div className="flex flex-col items-end justify-center w-[15mm] shrink-0">
                    <QRCodeSVG value={qrValue} size={56} className="w-[15mm] h-[15mm]" level="M" />
                    <div className="text-[5.5pt] font-[900] text-center mt-[1.5mm] border-[1.5px] border-black rounded-[1mm] px-[1.5mm] py-[0.5mm] uppercase w-full box-border text-black">{item.unit || 'UNIT'}</div>
                  </div>
                </div>
              );
            } else if (layout === "SHELF") {
               return (
                <div key={`${item.id}-${i}`} className="w-[100mm] h-[60mm] border-[2px] border-black rounded-[2mm] flex flex-col box-border bg-white overflow-hidden relative mb-[5mm] print:mb-0" style={{ pageBreakAfter: 'always' }}>
                  <div className="bg-black text-white px-[4mm] py-[1.5mm] text-[7.5pt] font-[900] uppercase tracking-[0.5px] flex justify-between items-center shrink-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span>{item.category || 'UMUM'}</span>
                    <span>{settings.shopName}</span>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-1 flex-col justify-between p-[4mm] pr-[3mm] overflow-hidden">
                      <div className="text-[17pt] font-[900] leading-[1.1] text-[#111] uppercase tracking-[-0.5px]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.productName}</div>
                      <div className="mt-auto">
                        <div className="flex items-center mb-[1mm] space-x-2">
                          <div className="text-[7pt] text-[#666] font-[900] uppercase tracking-[1px]">Harga Spesial</div>
                          <div className="text-[7.5pt] font-[900] text-black bg-[#e0e0e0] px-[2mm] py-[0.5mm] rounded-[1mm] uppercase tracking-[0.5px] whitespace-nowrap" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>/{item.unit || 'Unit'}</div>
                        </div>
                        <div className="flex items-start">
                          <span className="text-[12pt] font-[900] text-black mt-[1.5mm] mr-[1mm] leading-none">Rp</span>
                          <span className="text-[32pt] font-[900] text-black leading-none tracking-[-1px] whitespace-nowrap">{item.price.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-[30mm] shrink-0 flex flex-col items-center justify-between border-l-[1.5px] border-dashed border-[#aaa] p-[3mm] bg-[#fafafa]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <div className="bg-white border-[1.5px] border-black p-[1mm] rounded-[1mm] w-full aspect-square flex items-center justify-center">
                        <QRCodeSVG value={qrValue} className="w-full h-full" level="M" marginSize={0} />
                      </div>
                      <div className="text-[6.5pt] text-black font-mono font-[900] text-center mt-auto bg-[#e0e0e0] px-[1mm] py-[1.5mm] rounded-[1mm] w-full box-border uppercase tracking-[0.5px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{footerText}</div>
                    </div>
                  </div>
                </div>
              );
            } else {
               return (
                <div key={`${item.id}-${i}`} className="border-[0.5pt] border-[#ddd] p-[5mm] text-center rounded-[2mm] flex flex-col items-center justify-center break-inside-avoid text-black bg-white">
                  <div className="text-[9pt] font-bold h-[2.6em] overflow-hidden mb-[2mm]">{item.productName}</div>
                  <div className="text-[14pt] font-[900] mb-[2mm]">Rp {item.price.toLocaleString('id-ID')}</div>
                  <QRCodeSVG value={qrValue} size={113} className="w-[30mm] h-[30mm]" level="M" />
                  <div className="text-[7pt] text-[#888] mt-[2mm] font-mono">{footerText}</div>
                </div>
               );
            }
          })
        )}
      </div>
    </div>
  );
});

// Sub-component for each queue item to handle full batch fetching
function PrintQueueItem({ 
  item, 
  onRemove, 
  onUpdate,
  onDuplicate,
  usedBatchIds = []
}: { 
  item: PrintItem; 
  onRemove: (id: string) => void; 
  onUpdate: (id: string, updates: Partial<PrintItem>) => void;
  onDuplicate: (item: PrintItem) => void;
  usedBatchIds?: string[];
}) {
  // Fetch full batches for this product to ensure consistency with Batch FIFO modal
  const { data: batches, isLoading: isLoadingBatches } = useProductBatches(item.productId, true);
  const unitOptions = useMemo(() => {
    if (!item.availablePrices) return [];
    
    // Temukan batch saat ini untuk mengecek ketersediaan stok satuan
    const currentBatch = item.printType === "BATCH" && item.batchId 
      ? batches?.find((b: any) => b.id === item.batchId)
      : null;

    return item.availablePrices.map(p => {
      let displayPrice = p.price; // Default ke Harga Master Produk
      let isOriginal = false;
      let isUnavailable = false;
      let hasSnapshot = false;
      
      if (currentBatch) {
        // 1. Cek Snapshot Harga Historis:
        // Prioritaskan harga yang disimpan khusus untuk batch ini (Snapshot saat Stock In)
        const snapshot = currentBatch.batchPrices?.find((bp: any) => bp.unitId === p.unitId);
        
        if (snapshot) {
          displayPrice = Number(snapshot.price);
          hasSnapshot = true;
          if (currentBatch.unitId === p.unitId) isOriginal = true;
        } else {
          // Fallback untuk batch lama sebelum ada fitur snapshot:
          if (currentBatch.unitId === p.unitId) {
            displayPrice = Number(currentBatch.sellingPrice) * p.conversionFactor;
            isOriginal = true;
          } else {
            displayPrice = p.price;
          }
        }

        // 2. Cek Kelayakan Stok
        if (p.conversionFactor > currentBatch.currentQuantity) {
          isUnavailable = true;
        }
      }
      
      return {
        ...p,
        displayPrice,
        isOriginal,
        isUnavailable,
        hasSnapshot
      };
    });
  }, [item.availablePrices, item.printType, item.batchId, batches]);

  return (
    <div className="group bg-bg-card border border-border-default rounded-[32px] p-8 hover:border-brand-primary/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-[24px] bg-bg-main border border-border-subtle flex items-center justify-center shrink-0">
            {item.printType === "BATCH" ? <Layers className="w-5 h-5 text-status-success" /> : <Package className="w-5 h-5 text-brand-primary" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-text-primary leading-tight truncate">{item.productName}</h4>
            <div className="flex flex-col mt-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">{item.productCode}</span>
                {item.batchId && (
                  <span className="text-[10px] font-mono font-bold text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">
                    B:{item.batchId.slice(-8).toUpperCase()}
                  </span>
                )}
              </div>
              
              {item.printType === "BATCH" && (
                <div className="mt-2">
                  {isLoadingBatches ? (
                    <div className="flex items-center space-x-2 text-[9px] text-text-muted">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Memuat Batch...</span>
                    </div>
                  ) : (
                    <select 
                      value={item.batchId || ""}
                      onChange={(e) => {
                        const selectedBatch = batches?.find((b: any) => b.id === e.target.value);
                        if (selectedBatch) {
                          const currentUnit = item.availablePrices?.find(p => p.unitName === item.unit);
                          const factor = currentUnit?.conversionFactor || 1;
                          
                          // Cari harga dari snapshot batch
                          const snapshot = selectedBatch.batchPrices?.find((bp: any) => bp.unitId === currentUnit?.unitId);
                          let finalPrice;

                          if (snapshot) {
                            finalPrice = Number(snapshot.price);
                          } else {
                            // Fallback untuk batch lama
                            const isOriginal = selectedBatch.unitId === currentUnit?.unitId;
                            finalPrice = isOriginal 
                              ? Number(selectedBatch.sellingPrice) * factor 
                              : (currentUnit ? currentUnit.price : item.price);
                          }

                          onUpdate(item.id, { 
                            batchId: selectedBatch.id,
                            price: finalPrice
                          });
                        }
                      }}
                      className={cn(
                        "w-full text-[9px] font-bold bg-bg-main border rounded px-1 py-0.5 outline-none transition-colors cursor-pointer",
                        item.batchId ? "border-border-subtle text-text-secondary focus:border-brand-primary" : "border-status-danger text-status-danger animate-pulse"
                      )}
                    >
                      <option value="" disabled>-- Pilih Batch --</option>
                      {batches?.map((b: any) => {
                        const isUsed = usedBatchIds.includes(b.id);
                        return (
                          <option key={b.id} value={b.id} disabled={isUsed}>
                            Masuk: {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} — (Sisa {formatMultiUnitStock(b.currentQuantity ?? 0, (item.availablePrices || []).map(p => ({ conversionFactor: p.conversionFactor, unit: { name: p.unitName } })))}) {isUsed ? '(Sudah Ada)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {unitOptions && unitOptions.length > 1 && (
                <div className="mt-2">
                  <select
                    value={item.unit || ""}
                    onChange={(e) => {
                      const selectedOption = unitOptions.find(p => p.unitName === e.target.value);
                      if (selectedOption) {
                        onUpdate(item.id, {
                          unit: selectedOption.unitName,
                          price: selectedOption.displayPrice
                        });
                      }
                    }}
                    className="w-full text-[9px] font-bold bg-bg-main border border-border-subtle rounded px-1 py-0.5 outline-none focus:border-brand-primary text-text-secondary cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Satuan --</option>
                    {unitOptions.map(p => (
                      <option key={p.unitName} value={p.unitName} disabled={p.isUnavailable}>
                        {p.unitName} — Rp {p.displayPrice.toLocaleString('id-ID')} 
                        {(p.hasSnapshot || p.isOriginal) ? ' (Harga Batch)' : ''}
                        {p.isUnavailable ? ' (Stok Kurang)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => onDuplicate(item)}
            className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
            title="Tambah Batch Lain"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onRemove(item.id)}
            className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border-subtle/50">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Strategi</span>
            <div className="flex bg-bg-main p-0.5 rounded-lg border border-border-subtle">
              <button 
                onClick={() => {
                  const defaultPrice = item.availablePrices?.find(p => p.unitName === item.unit)?.price || item.price;
                  onUpdate(item.id, { printType: "PRODUCT", price: defaultPrice });
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                  item.printType === "PRODUCT" ? "bg-brand-primary text-white shadow-sm" : "text-text-muted"
                )}
              >
                FIFO
              </button>
              <button 
                onClick={() => {
                  const currentBatch = batches?.find((b: any) => b.id === item.batchId);
                  const factor = item.availablePrices?.find(p => p.unitName === item.unit)?.conversionFactor || 1;
                  const batchPrice = currentBatch ? Number(currentBatch.sellingPrice || 0) * factor : item.price;
                  onUpdate(item.id, { printType: "BATCH", price: batchPrice > 0 ? batchPrice : item.price });
                }}
                disabled={!item.batchId}
                className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                  item.printType === "BATCH" ? "bg-status-success text-white shadow-sm" : "text-text-muted",
                  !item.batchId && "opacity-30 cursor-not-allowed"
                )}
              >
                Batch
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Jumlah</span>
            <div className="flex items-center space-x-2">
               <input 
                type="number" 
                min="1" 
                value={item.copies}
                onChange={(e) => onUpdate(item.id, { copies: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 px-2 py-1 bg-bg-main border border-border-subtle rounded-lg text-xs font-black focus:ring-2 focus:ring-brand-primary outline-none"
               />
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-text-muted uppercase tracking-widest block mb-0.5">Harga Label</span>
          <span className="text-sm font-black text-brand-primary">{formatCurrency(item.price)}</span>
        </div>
      </div>
    </div>
  );
}

export function QRPrintManager({ isOpen, onClose, initialItems = [] }: QRPrintManagerProps) {
  const settings = useSettingsStore.getState().settings;
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [layout, setLayout] = useState<"STICKER" | "SHELF" | "A4">("STICKER");
  const [globalCopies, setGlobalCopies] = useState<number>(1);
  
  // Transform initial items to PrintItem format
  useEffect(() => {
    if (isOpen && initialItems.length > 0) {
      const items: PrintItem[] = initialItems.map(item => {
        // Handle both raw product objects and pre-mapped objects (like from Stock-In)
        const productId = item.productId || item.id;
        const productName = item.productName || item.name;
        const productCode = item.productCode || item.code;
        const batchId = item.batchId || item.stockBatches?.[0]?.id;
        const availablePrices = item.prices?.map((p: any) => ({
          unitId: p.unitId || p.unit?.id,
          unitName: p.unit?.name || 'Unit',
          price: Number(p.price),
          conversionFactor: Number(p.conversionFactor || 1)
        })) || [];

        const unit = item.unit?.name || item.unit || availablePrices[0]?.unitName || 'Unit';
        const copies = item.quantity || item.copies || 1;
        const category = item.category?.name || item.category;
        
        const matchingPriceObj = availablePrices.find((p: any) => p.unitName === unit);
        
        // Selalu default ke strategi FIFO (Master Price)
        const price = matchingPriceObj ? matchingPriceObj.price : Number(item.price || 0);

        return {
          id: `${productId}-${Date.now()}-${Math.random()}`,
          productId,
          productName,
          productCode,
          batchId,
          price,
          category,
          unit,
          copies,
          printType: "PRODUCT",
          availablePrices
        };
      });
      setPrintQueue(items);
    }
  }, [isOpen, initialItems]);

  const removeItem = (id: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<PrintItem>) => {
    setPrintQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const duplicateItem = (item: PrintItem) => {
    const newItem = {
      ...item,
      id: `${item.productId}-${Date.now()}-${Math.random()}`,
      batchId: undefined, // Let user pick a new one
    };

    setPrintQueue(prev => {
      const index = prev.findIndex(i => i.id === item.id);
      const newQueue = [...prev];
      newQueue.splice(index + 1, 0, newItem);
      return newQueue;
    });
  };

  const applyGlobalCopies = () => {
    setPrintQueue(prev => prev.map(item => ({ ...item, copies: globalCopies })));
  };

  const totalLabels = useMemo(() => printQueue.reduce((acc, item) => acc + item.copies, 0), [printQueue]);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Cetak Label - ${settings.shopName}`,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-0 lg:p-4">
      <div className="bg-bg-modal w-full h-full lg:h-[90vh] lg:max-w-5xl rounded-none lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col text-text-primary border-none lg:border lg:border-white/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-brand-primary flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-[24px] flex items-center justify-center">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">Manajemen Cetak QR</h2>
              <p className="text-xs text-white/70 font-bold uppercase tracking-wider">Antrian Cetak Label Inventori</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-all text-white/70 hover:text-white rounded-full active:scale-95 transition-transform">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left: Queue List */}
          <div className="flex-1 flex flex-col border-r border-border-subtle overflow-y-auto lg:overflow-hidden custom-scrollbar">
            <div className="p-4 bg-bg-main border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tags className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-black uppercase tracking-wider">Daftar Antrian ({printQueue.length})</span>
              </div>
              <button 
                onClick={() => setPrintQueue([])}
                className="text-[10px] font-bold text-status-danger hover:underline uppercase tracking-tighter"
              >
                Bersihkan Semua
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {printQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full bg-bg-card border-2 border-dashed border-text-muted flex items-center justify-center">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black">Antrian Kosong</p>
                    <p className="text-[10px] uppercase font-bold mt-1">Pilih barang dari daftar inventori untuk mencetak label</p>
                  </div>
                </div>
              ) : (
                printQueue.map((item) => {
                  const usedBatchIds = printQueue
                    .filter(i => i.productId === item.productId && i.id !== item.id)
                    .map(i => i.batchId)
                    .filter(Boolean) as string[];

                  return (
                    <PrintQueueItem 
                      key={item.id} 
                      item={item} 
                      onRemove={removeItem} 
                      onUpdate={updateItem} 
                      onDuplicate={duplicateItem}
                      usedBatchIds={usedBatchIds}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Global Settings & Actions */}
          <div className="w-full lg:w-80 bg-bg-main/80 lg:bg-bg-main/50 backdrop-blur-md lg:backdrop-blur-none p-4 lg:p-6 flex flex-col space-y-6 lg:space-y-8 shrink-0 border-t lg:border-t-0 border-border-subtle z-20">
            {/* Mobile Toggle for Settings (only visible on mobile) */}
            <div className="lg:hidden flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-4 h-4 text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Pengaturan Global</span>
              </div>
              <span className="text-[10px] font-bold text-text-muted">{totalLabels} Label</span>
            </div>
            
            <div className="hidden lg:block">
              <div className="flex items-center space-x-2 mb-4">
                <Settings2 className="w-5 h-5 text-brand-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">Pengaturan Global</h3>
              </div>
            </div>

            <div className="flex flex-col space-y-4 lg:space-y-6 overflow-y-auto lg:overflow-visible px-1 lg:px-0 pb-4 lg:pb-0 pr-1 max-h-[40vh] lg:max-h-none custom-scrollbar">
                {/* Layout Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Tipe Layout</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'STICKER', label: 'Thermal Sticker', desc: '50x30mm / 58mm Roll', icon: Tags },
                      { id: 'SHELF', label: 'Label Rak', desc: 'Besar (100x60mm)', icon: LayoutGrid },
                      { id: 'A4', label: 'A4 Grid', desc: '3 Kolom (HVS/Sticker A4)', icon: Printer },
                    ].map((l) => (
                      <button 
                        key={l.id}
                        onClick={() => setLayout(l.id as any)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all flex items-center space-x-3",
                          layout === l.id ? "bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20" : "bg-bg-card border-border-default text-text-muted"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", layout === l.id ? "bg-white/20 text-white" : "bg-bg-main")}>
                          <l.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={cn("text-[10px] font-black uppercase", layout === l.id ? "text-white" : "text-text-primary")}>{l.label}</p>
                          <p className={cn("text-[8px] font-bold opacity-60", layout === l.id ? "text-white/80" : "text-text-muted")}>{l.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Copies */}
                <div className="space-y-2 lg:space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Set Semua Jumlah</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        min="1"
                        value={globalCopies}
                        onChange={(e) => setGlobalCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 bg-bg-card border border-border-default rounded-xl text-sm font-black focus:ring-2 focus:ring-brand-primary outline-none transition-all pr-10 h-[40px] lg:h-[46px] text-text-primary"
                      />
                      <Copy className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-4 h-4 text-text-muted/40" />
                    </div>
                    <button 
                      onClick={applyGlobalCopies}
                      className="whitespace-nowrap h-[40px] lg:h-[46px] bg-bg-card border border-border-default text-[9px] lg:text-[10px] font-black uppercase hover:bg-bg-main hover:border-brand-primary/30 transition-all active:scale-95 shrink-0 shadow-sm rounded-full px-6 py-[12px] text-[14px] font-bold"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t lg:border-t-0 border-border-subtle space-y-3 lg:space-y-4">
              <div className="hidden lg:block bg-bg-card p-8 rounded-[32px] border border-border-default space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                  <span>Total Produk</span>
                  <span className="text-text-primary">{printQueue.length}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black text-text-primary uppercase">
                  <span>Total Label</span>
                  <span className="text-brand-primary">{totalLabels} Lembar</span>
                </div>
              </div>

              <button 
                onClick={handlePrint}
                disabled={printQueue.length === 0}
                className="w-full lg: bg-brand-primary text-text-inverse font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 rounded-full px-7 py-[14px] text-[14px] font-bold"
              >
                <Printer className="w-5 h-5" />
                <span>Cetak {totalLabels > 0 && `(${totalLabels})`}</span>
              </button>
              
              <div className="flex items-center justify-center space-x-2 text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-60">
                <AlertCircle className="w-3 h-3" />
                <span>Format: PDF / Direct Print</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hidden Print Component */}
        <div className="hidden">
          <PrintTemplate ref={printRef} queue={printQueue} layout={layout} />
        </div>
      </div>
    </div>
  );
}
