import React from "react";
import { Edit2, Trash2, CheckSquare, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Can } from "../../../components/auth/Can";

interface CustomerTableProps {
  items: any[];
  selectedItems: string[];
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
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
        <Users className="w-16 h-16 text-text-muted opacity-20 mb-4" />
        <p className="text-base font-bold text-text-secondary">Belum ada data pelanggan</p>
        <p className="text-sm text-text-muted mt-2 max-w-sm">
          Klik tombol "Tambah Data" untuk mendaftarkan pelanggan baru ke dalam sistem.
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
              Nama Pelanggan
            </th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap bg-bg-main z-10">
              Telepon
            </th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap bg-bg-main z-10">
              Tipe
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
                {item.phone || "-"}
              </td>
              <td className="px-6 py-4 text-sm text-text-secondary">
                {item.isContractor ? (
                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-lg uppercase border border-brand-primary/20">Kontraktor</span>
                ) : (
                  <span className="px-2 py-0.5 bg-bg-main text-text-muted text-[10px] font-bold rounded-lg uppercase border border-border-default">Reguler</span>
                )}
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
                      disabled={item.name.toLowerCase() === "umum"}
                      className={cn(
                        "p-2.5 text-text-muted rounded-xl transition-all",
                        item.name.toLowerCase() === "umum" 
                          ? "opacity-20 cursor-not-allowed" 
                          : "hover:text-status-danger hover:bg-status-danger/10"
                      )}
                      title={item.name.toLowerCase() === "umum" ? "Pelanggan Umum tidak dapat dihapus" : "Hapus Pelanggan"}
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
                    <span className="text-[10px] text-text-muted mt-1 truncate">{item.phone || "-"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  {item.isContractor ? (
                    <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] font-bold rounded-md uppercase border border-brand-primary/20">Kontraktor</span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-bg-main text-text-muted text-[8px] font-bold rounded-md uppercase border border-border-default">Reguler</span>
                  )}
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
                      disabled={item.name.toLowerCase() === "umum"}
                      className={cn(
                        "p-2 text-text-muted rounded-lg transition-all",
                        item.name.toLowerCase() === "umum" 
                          ? "opacity-20 cursor-not-allowed" 
                          : "hover:text-status-danger active:bg-status-danger/10"
                      )}
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
