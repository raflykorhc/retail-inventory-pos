import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  id: string;
  name: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  className,
  disabled = false,
  onSearchChange,
  isLoading = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value);

  // Jika onSearchChange disediakan, maka pencarian dilakukan di server.
  // Jika tidak, lakukan filter lokal.
  const filteredOptions = onSearchChange 
    ? options 
    : options.filter(opt =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          "w-full h-[44px] flex items-center justify-between px-3 border rounded-xl text-sm font-bold transition-colors bg-bg-main border-border-default",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-brand-primary cursor-pointer",
          isOpen ? "ring-2 ring-brand-primary border-transparent" : "",
          !selectedOption ? "text-text-muted" : "text-text-primary"
        )}
      >
        <span className="truncate flex-1 text-left">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-text-muted shrink-0 ml-2" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-bg-modal border border-border-subtle rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-border-subtle flex-shrink-0 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              placeholder="Cari..."
              className="w-full h-[36px] pl-9 pr-8 text-sm font-bold bg-bg-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-text-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
            {isLoading ? (
              <div className="p-3 text-center text-xs font-bold text-text-muted">
                Memuat data...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs font-bold text-text-muted">
                Tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-between group",
                    value === opt.id 
                      ? "bg-brand-primary/10 text-brand-primary" 
                      : "text-text-primary hover:bg-bg-main"
                  )}
                >
                  <span className="truncate">{opt.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
