import React from "react";
import { TableVirtuoso } from "react-virtuoso";
import { Edit2, Trash2, Check, ChevronDown, ChevronUp, History } from "lucide-react";
import { cn, formatCurrency, formatDate, formatMultiUnitStock } from "../../../lib/utils";
import { Can } from "../../../components/auth/Can";

interface ProductTableProps {
  items: any[];
  selectedItems: string[];
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: { id: string; name: string }) => void;
}

const ProductRow: React.FC<{
  item: any;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: { id: string; name: string }) => void;
}> = ({ item, isSelected, isSelectionMode, toggleSelectItem, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const currentStock = item.stock || 0;
  const minStock = item.minStock || 10;
  const isLowStock = currentStock <= minStock && currentStock > 0;
  const isOutOfStock = currentStock === 0;
  
  const sortedPrices = React.useMemo(() => 
    [...(item.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor)
  , [item.prices]);
  
  const mainPriceObj = sortedPrices[0];
  const mainUnitName = mainPriceObj?.unit?.name?.replace(/^1\s+/, '') || 'Unit';
  const mainFactor = mainPriceObj?.conversionFactor || 1;
  
  const consolidatedBatches = React.useMemo(() => {
    if (!item.stockBatches) return [];
    
    const result: any[] = [];
    const batches = item.stockBatches;
    return batches || []; // No longer consolidate
  }, [item.stockBatches]);

  return (
    <>
      <tr className={cn("hover:bg-bg-main/30 transition-colors", isExpanded && "bg-bg-main/20")}>
        {(isSelectionMode || isSelected) && (
          <td className="px-6 py-4 w-16 text-center">
            <button 
              onClick={() => toggleSelectItem(item.id)}
              className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                isSelected 
                  ? "bg-brand-primary border-brand-primary text-text-inverse" 
                  : "border-border-default hover:border-brand-primary/50"
              )}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </button>
          </td>
        )}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                isExpanded ? "bg-brand-primary/10 text-brand-primary" : "text-text-muted hover:bg-bg-main"
              )}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-sm truncate">{item.name}</span>
                {item.abcCategory && (
                  <span className={cn(
                    "flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    item.abcCategory === "A" && "bg-status-danger/10 text-status-danger border-status-danger/30",
                    item.abcCategory === "B" && "bg-status-warning/10 text-status-warning border-status-warning/30",
                    item.abcCategory === "C" && "bg-status-success/10 text-status-success border-status-success/30",
                  )}>
                    {item.abcCategory}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-muted mt-1 truncate">{item.code || '-'}</span>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 w-[180px]">
          <span className="px-2.5 py-1 bg-bg-main text-text-secondary rounded-xl text-[10px] font-bold border border-border-default inline-block max-w-full truncate">
            {item.category?.name || '-'}
          </span>
        </td>
        <td className="px-6 py-4 w-[150px]">
          <div className="flex flex-col">
            <span className={cn(
              "font-black text-sm",
              isOutOfStock ? "text-status-danger" : isLowStock ? "text-status-warning" : "text-text-primary"
            )}>
              {formatMultiUnitStock(currentStock, item.prices)}
            </span>
            {isOutOfStock && <span className="text-[9px] font-black text-status-danger uppercase tracking-tighter mt-1">Habis!</span>}
            {isLowStock && <span className="text-[9px] font-black text-status-warning uppercase tracking-tighter mt-1">Menipis!</span>}
          </div>
        </td>
        <td className="px-6 py-4 text-right w-[200px]">
          <div className="flex flex-col items-end">
            <span className="font-black text-sm text-text-primary">
              {formatCurrency(mainPriceObj?.price || 0)}
            </span>
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-1">/ {mainUnitName}</span>
          </div>
        </td>
        <td className="px-6 py-4 w-[120px]">
          <div className="flex items-center justify-end space-x-2">
            <button 
              onClick={() => onEdit(item)}
              className="p-2.5 hover:bg-brand-primary/10 text-text-muted hover:text-brand-primary rounded-xl transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <Can role={["ADMIN", "MANAGER"]}>
              <button 
                onClick={() => onDelete({ id: item.id, name: item.name })}
                className="p-2.5 hover:bg-status-danger/10 text-text-muted hover:text-status-danger rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Can>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-bg-main/10 px-6 py-0">
            <div className="py-4 pl-12 pr-6 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-text-primary">Rincian Batch FIFO</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {consolidatedBatches && consolidatedBatches.length > 0 ? (
                  consolidatedBatches.map((batch: any, idx: number) => (
                    <div key={batch.id} className="bg-bg-card border border-border-subtle rounded-[24px] p-8 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter">Batch #{idx + 1}</span>
                        <span className="text-[9px] text-text-muted">{formatDate(batch.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Tersisa</span>
                          <span className="text-sm font-black text-text-primary">{formatMultiUnitStock(batch.currentQuantity, item.prices)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Harga Beli</span>
                          <span className="text-sm font-black text-brand-secondary">
                            {(() => {
                              const val = Number(batch.costPrice) || 0;
                              const referencePrice = (Number(item.averageCost) || 0) * mainFactor;

                              // 1. Precise Logic: Gunakan snapshot factor
                              if (batch.conversionFactor && batch.conversionFactor > 0) {
                                return formatCurrency(val * mainFactor);
                              }
                              
                              // 2. Fallback: Gunakan referencePrice atau nilai asli
                              return formatCurrency(referencePrice || val * mainFactor);
                            })()}
                          </span>
                          <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Per {mainUnitName}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-4 text-center text-xs text-text-muted font-bold italic">
                    Tidak ada batch aktif. Silahkan lakukan pembelian barang.
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const MobileProductCard: React.FC<{
  item: any;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: { id: string; name: string }) => void;
}> = ({ item, isSelected, isSelectionMode, toggleSelectItem, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const currentStock = item.stock || 0;
  const minStock = item.minStock || 10;
  const isLowStock = currentStock <= minStock && currentStock > 0;
  const isOutOfStock = currentStock === 0;

  const sortedPrices = React.useMemo(() => 
    [...(item.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor)
  , [item.prices]);
  
  const mainPriceObj = sortedPrices[0];
  const mainUnitName = mainPriceObj?.unit?.name?.replace(/^1\s+/, '') || 'Unit';
  const mainFactor = mainPriceObj?.conversionFactor || 1;

  return (
    <div 
      className={cn(
        "flex flex-col transition-colors border-b border-border-subtle",
        isSelected && "bg-brand-primary/5",
        isExpanded && "bg-bg-main/20"
      )}
      onClick={() => isSelectionMode && toggleSelectItem(item.id)}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {isSelectionMode && (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                  isSelected 
                    ? "bg-brand-primary border-brand-primary text-text-inverse" 
                    : "border-border-default bg-bg-main"
                )}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-sm leading-tight line-clamp-2">{item.name}</span>
                {item.abcCategory && (
                  <span className={cn(
                    "flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    item.abcCategory === "A" && "bg-status-danger/10 text-status-danger border-status-danger/30",
                    item.abcCategory === "B" && "bg-status-warning/10 text-status-warning border-status-warning/30",
                    item.abcCategory === "C" && "bg-status-success/10 text-status-success border-status-success/30",
                  )}>
                    {item.abcCategory}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-muted mt-1">{item.code || '-'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="font-black text-sm text-text-primary">
              {formatCurrency(mainPriceObj?.price || 0)}
            </span>
            <div className={cn(
              "text-[10px] font-bold mt-1 px-2 py-0.5 rounded-lg border",
              isOutOfStock ? "bg-status-danger/10 text-status-danger border-status-danger/20" : 
              isLowStock ? "bg-status-warning/10 text-status-warning border-status-warning/20" : 
              "bg-bg-main text-text-secondary border-border-default"
            )}>
              {formatMultiUnitStock(currentStock, item.prices)}
            </div>
            <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter mt-1">/ {mainUnitName}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-bg-main text-text-secondary rounded-lg text-[10px] font-bold border border-border-default">
              {item.category?.name || '-'}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors",
                isExpanded ? "bg-brand-primary text-text-inverse" : "bg-brand-primary/10 text-brand-primary"
              )}
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Batch</span>
            </button>
          </div>
          
          {!isSelectionMode && (
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="p-2 text-text-muted hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <Can role={["ADMIN", "MANAGER"]}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete({ id: item.id, name: item.name }); }}
                  className="p-2 text-text-muted hover:text-status-danger active:bg-status-danger/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Can>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 bg-bg-main/10 border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-3 h-3 text-brand-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Rincian Batch FIFO</span>
          </div>
          <div className="flex flex-col gap-2">
            {item.stockBatches && item.stockBatches.length > 0 ? (
              item.stockBatches.map((batch: any, idx: number) => (
                <div key={batch.id} className="bg-bg-card border border-border-subtle rounded-[24px] p-8 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-brand-primary uppercase">Batch #{idx + 1}</span>
                    <span className="text-[8px] text-text-muted">{formatDate(batch.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black text-text-primary">{formatMultiUnitStock(batch.currentQuantity, item.prices)}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-brand-secondary">{formatCurrency((batch.costPrice || 0) * mainFactor)}</span>
                      <span className="text-[8px] font-bold text-text-muted uppercase">/ {mainUnitName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-[10px] text-text-muted font-bold italic">Tidak ada batch aktif.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductTable: React.FC<ProductTableProps> = ({
  items,
  selectedItems,
  isSelectionMode,
  toggleSelectItem,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <table className="hidden lg:table w-full text-left border-collapse min-w-[900px]">
        <thead className="z-10 bg-bg-main border-b border-border-default">
          <tr>
            {(isSelectionMode || selectedItems.length > 0) && (
              <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 w-16 text-center bg-bg-main z-10">
                <div className="w-4 h-4" />
              </th>
            )}
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-left bg-bg-main z-10">Info Barang</th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-left w-[180px] bg-bg-main z-10">Kategori</th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-left w-[150px] bg-bg-main z-10">Stok</th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right w-[200px] bg-bg-main z-10">Harga Jual</th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right w-[120px] bg-bg-main z-10">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-bg-card">
          {items.map((item) => (
            <ProductRow 
              key={item.id} 
              item={item} 
              isSelected={selectedItems.includes(item.id)} 
              isSelectionMode={isSelectionMode} 
              toggleSelectItem={toggleSelectItem} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="lg:hidden flex flex-col bg-bg-card">
        {items.map((item) => (
          <MobileProductCard
            key={item.id}
            item={item}
            isSelected={selectedItems.includes(item.id)}
            isSelectionMode={isSelectionMode}
            toggleSelectItem={toggleSelectItem}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
