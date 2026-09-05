import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxTrigger,
} from "@/components/ui/combobox";

export interface FilterComboboxOption {
  id: string;
  name: string;
}

export interface FilterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  className?: string;
}

export function FilterCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText = "Tidak ditemukan",
  className,
}: FilterComboboxProps) {
  const items = useMemo(() => {
    return options.map((opt) => ({ ...opt, label: opt.name }));
  }, [options]);

  const selectedItem = useMemo(() => {
    return items.find((opt) => String(opt.id) === String(value)) || items[0] || null;
  }, [items, value]);

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(val: any) => {
        if (val) onChange(String(val.id));
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-2.5 text-xs font-normal bg-background shadow-2xs justify-between shrink-0 gap-1.5",
              className
            )}
          >
            <span className="truncate">{selectedItem ? selectedItem.name : placeholder}</span>
            <ChevronDown className="size-3.5 opacity-50 shrink-0" />
          </Button>
        }
      />
      <ComboboxContent align="start" className="min-w-[180px] max-w-[260px] p-1 z-50">
        <ComboboxInput showTrigger={false} placeholder={searchPlaceholder} className="h-8 text-xs" />
        <ComboboxEmpty className="p-2 text-xs text-muted-foreground">{emptyText}</ComboboxEmpty>
        <ComboboxList className="max-h-[220px] overflow-y-auto">
          {(item: any) => (
            <ComboboxItem key={item.id} value={item} className="text-xs py-1.5 px-2 cursor-pointer">
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
