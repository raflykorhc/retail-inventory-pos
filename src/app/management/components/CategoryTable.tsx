import React from "react";
import { Edit2, Trash2, Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Can } from "../../../components/auth/Can";

interface CategoryTableProps {
  items: any[];
  selectedItems: string[];
  isSelectionMode: boolean;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: { id: string; name: string }) => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
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
      <table className="hidden lg:table w-full text-left border-collapse">
        <thead className="z-10 bg-bg-main border-b border-border-default">
          <tr>
            {(isSelectionMode || selectedItems.length > 0) && (
              <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 w-12 text-center bg-bg-main z-10">
                <div className="w-4 h-4" />
              </th>
            )}
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted bg-bg-main z-10">Nama Kategori</th>
            <th className="sticky top-[137px] lg:top-[93px] px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right bg-bg-main z-10">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-bg-card">
          {items.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            return (
              <tr key={item.id} className="hover:bg-bg-main/50 transition-colors">
                {(isSelectionMode || selectedItems.length > 0) && (
                  <td className="px-6 py-4">
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
                <td className="px-6 py-4 font-bold text-text-primary text-sm">{item.name}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => onEdit(item)} className="p-2.5 hover:bg-brand-primary/10 text-text-muted hover:text-brand-primary rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <Can role={["ADMIN", "MANAGER"]}>
                      <button onClick={() => onDelete({ id: item.id, name: item.name })} className="p-2.5 hover:bg-status-danger/10 text-text-muted hover:text-status-danger rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="lg:hidden flex flex-col divide-y divide-border-subtle bg-bg-card">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          return (
            <div 
              key={item.id} 
              className={cn(
                "p-4 flex items-center justify-between transition-colors active:bg-bg-main/50",
                isSelected && "bg-brand-primary/5"
              )}
              onClick={() => isSelectionMode && toggleSelectItem(item.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isSelectionMode && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                      isSelected 
                        ? "bg-brand-primary border-brand-primary text-text-inverse" 
                        : "border-border-default bg-bg-main"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                )}
                <span className="font-bold text-text-primary text-sm truncate">{item.name}</span>
              </div>

              {!isSelectionMode && (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="p-2 text-text-muted hover:text-brand-primary active:bg-brand-primary/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <Can role={["ADMIN"]}>
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
          );
        })}
      </div>
    </div>
  );
};
