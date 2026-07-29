import React from "react";
import { Edit2, Trash2, CheckSquare, Truck } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Can } from "../../../components/auth/Can";

interface SupplierTableProps {
  items: any[];
  selectedItems: string[];
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  items,
  selectedItems,
  isSelectionMode,
  toggleSelectItem,
  onEdit,
  onDelete,
}) => {
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-bg-card">
        <Truck className="w-16 h-16 text-text-muted opacity-20 mb-4" />
        <p className="text-base font-bold text-text-secondary">Belum ada data supplier</p>
        <p className="text-sm text-text-muted mt-2 max-w-sm">
          Klik tombol "Tambah Data" untuk mendaftarkan supplier baru ke dalam sistem.
        </p>
      </div>
    );
  }

  return (
    <>
      <table className="hidden lg:table w-full text-left border-collapse">
        <thead className="bg-bg-main z-10 border-b border-border-default">
          <tr>
            {isSelectionMode && (
              <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 w-14 bg-bg-main z-10">
                <CheckSquare className="w-4 h-4 text-text-muted" />
              </th>
            )}
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap bg-bg-main z-10">
              Nama Supplier
            </th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap bg-bg-main z-10">
              Kontak
            </th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap bg-bg-main z-10">
              Telepon
            </th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap text-right bg-bg-main z-10">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-bg-card">
          {items.map((item) => (
            <tr
              key={item.id}
              className={cn(
                "transition-colors group",
                selectedItems.includes(item.id) ? "bg-brand-primary/5" : "hover:bg-bg-main/50"
              )}
            >
              {isSelectionMode && (
                <td className="px-6 py-4" onClick={() => toggleSelectItem(item.id)}>
                  <div className="cursor-pointer flex items-center justify-center">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        selectedItems.includes(item.id)
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "border-border-strong bg-bg-main"
                      )}
                    >
                      {selectedItems.includes(item.id) && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </td>
              )}
              <td className="px-6 py-4 text-sm font-bold text-text-primary">
                {item.name}
              </td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {item.contact || "-"}
              </td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {item.phone || "-"}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2.5 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>
                  <Can role={["ADMIN", "MANAGER"]}>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-2.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </Can>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card Layout */}
      <div className="lg:hidden flex flex-col divide-y divide-border-subtle bg-bg-card">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "p-4 flex flex-col gap-3 transition-colors active:bg-bg-main/50",
                isSelected && "bg-brand-primary/5"
              )}
              onClick={() => isSelectionMode && toggleSelectItem(item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {isSelectionMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                        isSelected 
                          ? "bg-brand-primary border-brand-primary text-text-inverse" 
                          : "border-border-strong bg-bg-main"
                      )}
                    >
                      {isSelected && <CheckSquare className="w-3 h-3" />}
                    </button>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-text-primary text-sm leading-tight truncate">{item.name}</span>
                    <span className="text-[10px] text-text-muted mt-1 truncate">{item.contact || "-"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs font-bold text-text-primary">{item.phone || "-"}</span>
                </div>
              </div>

              {!isSelectionMode && (
                <div className="flex items-center justify-end gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="p-2 text-text-muted hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <Can role={["ADMIN", "MANAGER"]}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      className="p-2 text-text-muted hover:text-status-danger active:bg-status-danger/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Can>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
