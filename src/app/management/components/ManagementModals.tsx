import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Tag, Layers, Check, Trash2, Camera, Truck, Users, Plus, AlertTriangle, BarChart3 } from "lucide-react";
import { ProductSchema, GenericSchema, SupplierSchema, UserSchema, CustomerSchema, type ProductFormValues, type GenericFormValues, type SupplierFormValues, type UserFormValues, type CustomerFormValues } from "../schemas";
import { cn } from "../../../lib/utils";
import { useAuthStore } from "../../../store/useAuthStore";
import { AlertCircle } from "lucide-react";
import imageCompression from "browser-image-compression";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  headerClassName?: string;
}

const Modal: React.FC<ModalProps & { children: React.ReactNode }> = ({ isOpen, onClose, title, icon, children, headerClassName }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center lg:p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} 
        />
        <motion.div 
          initial={{ y: "100vh", opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: "100vh", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 250 }}
          className="bg-bg-modal w-full max-w-2xl rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden relative z-[201] flex flex-col max-h-[90vh] will-change-transform"
        >
          {/* Unified Header Container (Eliminates thin line gap) */}
          <div className={cn("flex-shrink-0", headerClassName || "bg-brand-primary")}>
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>

            <div className="p-4 lg:p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 lg:p-2.5 bg-white/20 text-white rounded-[24px]">
                  {icon}
                </div>
                <h3 className="font-black text-base lg:text-lg text-white tracking-tight">{title}</h3>
              </div>
              <button onClick={onClose} className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-full">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 overflow-hidden w-full">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const ProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormValues) => void;
  editingItem: any;
  categories: any[];
  units: any[];
  suppliers?: any[];
}> = ({ isOpen, onClose, onSubmit, editingItem, categories, units, suppliers = [] }) => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema) as any,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prices"
  });

  const previewImage = watch("image");
  const watchedPrices = watch("prices") || [];

  const [stockParts, setStockParts] = React.useState<Record<string, number>>({});

  const handleStockPartChange = (unitId: string, value: number) => {
    setStockParts(prev => ({ ...prev, [unitId || ""]: value }));
  };

  useEffect(() => {
    if (editingItem) {
      const sortedPrices = [...(editingItem.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainPriceObj = sortedPrices[0];
      const mainFactor = mainPriceObj?.conversionFactor || 1;

      reset({
        code: editingItem.code || "",
        name: editingItem.name,
        description: editingItem.description || "",
        categoryId: editingItem.categoryId,
        supplierId: editingItem.supplierId || "",
        prices: (editingItem.prices && editingItem.prices.length > 0)
          ? editingItem.prices.map((p: any) => ({
              unitId: p.unitId,
              price: Number(p.price) || 0,
              conversionFactor: Number(p.conversionFactor) || 1
            }))
          : [{ unitId: "", price: 0, conversionFactor: 1 }],
        averageCost: Math.round(Number(editingItem.averageCost) * mainFactor) || 0,
        minStock: Math.round(editingItem.minStock / mainFactor) || 10,
        leadTime: editingItem.leadTime ?? 3,
        maxStock: editingItem.maxStock ?? undefined,
        image: editingItem.productImage ? `/api/products/${editingItem.id}/image` : "",
      });

      // Break down current stock for edit mode display
      const parts: Record<string, number> = {};
      let remainingStock = Number(editingItem.stock) || 0;
      const sortedPricesForStock = [...(editingItem.prices || [])].sort((a: any, b: any) => Number(b.conversionFactor) - Number(a.conversionFactor));
      for (const price of sortedPricesForStock) {
        const factor = Number(price.conversionFactor) || 1;
        const qty = Math.floor(remainingStock / factor);
        parts[price.unitId] = qty;
        remainingStock %= factor;
      }
      setStockParts(parts);
    } else {
      reset({
        code: "", name: "", description: "", categoryId: "", supplierId: "",
        prices: [{ unitId: "", price: 0, conversionFactor: 1 }],
        initialCost: 0, averageCost: 0, minStock: 10, initialStock: 0,
        leadTime: 3, maxStock: undefined, image: ""
      });
      setStockParts({});
    }
  }, [editingItem, isOpen, reset]);

  /**
   * Wrapper onSubmit: konversi balik averageCost & minStock ke Base Unit
   * sebelum data dikirim ke parent handler (axiosClient.put).
   */
  const handleFormSubmit = (data: ProductFormValues) => {
    const sortedPrices = [...(data.prices || [])].sort((a, b) => b.conversionFactor - a.conversionFactor);
    const mainFactor = sortedPrices[0]?.conversionFactor || 1;

    if (editingItem) {
      const normalized: ProductFormValues = {
        ...data,
        // Kembalikan ke Base Unit (kebalikan dari konversi tampilan)
        averageCost: Math.round(Number(data.averageCost) / mainFactor),
        minStock: Math.round(Number(data.minStock) * mainFactor),
      };
      onSubmit(normalized);
    } else {
      let initialStockInBase = 0;
      for (const price of data.prices || []) {
        const factor = Number(price.conversionFactor) || 1;
        const qty = stockParts[price.unitId || ""] || 0;
        initialStockInBase += qty * factor;
      }

      const normalized: ProductFormValues = {
        ...data,
        initialStock: initialStockInBase,
        averageCost: Math.round(Number(data.averageCost || data.initialCost || 0) / mainFactor),
        minStock: Math.round(Number(data.minStock) * mainFactor),
      };
      onSubmit(normalized);
    }
  };

  const [isCompressing, setIsCompressing] = React.useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const options = {
          maxSizeMB: 0.15, // max 150KB
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setValue("image", reader.result as string);
          setIsCompressing(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setIsCompressing(false);
      }
    }
  };

  const mainPrice = watchedPrices[0]?.price || 0;
  const watchedCost = editingItem ? watch("averageCost") : watch("initialCost");

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingItem ? "Edit Barang" : "Tambah Barang Baru"} 
      icon={<Package className="w-5 h-5" />}
      headerClassName={editingItem ? "bg-status-warning" : "bg-brand-primary"}
    >
      <form 
        onSubmit={handleSubmit(handleFormSubmit)} 
        className="flex flex-col flex-1 overflow-hidden"
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(handleFormSubmit)();
          }
        }}
      >
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8 lg:space-y-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Gambar Barang</label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[24px] flex items-center justify-center overflow-hidden flex-shrink-0 border bg-bg-main border-border-default">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="w-6 h-6 lg:w-8 lg:h-8 text-text-muted/30" />
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden rounded-lg" 
                  id="product-image-edit"
                />
                <label 
                  htmlFor="product-image-edit"
                  className={cn(
                    "inline-block px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-bg-card border-border-default",
                    isCompressing ? "cursor-not-allowed opacity-50" : "cursor-pointer text-text-secondary hover:bg-bg-main"
                  )}
                >
                  {isCompressing ? "Memproses..." : (previewImage ? "Ubah Gambar" : "Unggah Gambar")}
                </label>
                {previewImage && (
                  <button 
                    type="button"
                    onClick={() => setValue("image", "")}
                    className="ml-2 text-xs font-bold text-status-danger hover:text-status-danger/80"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={cn("grid grid-cols-1 gap-6", editingItem ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
            {editingItem && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Kode Barang</label>
                <input 
                  type="text" 
                  {...register("code")}
                  readOnly
                  className="w-full p-3 lg:p-3.5 bg-bg-main/50 border border-border-default text-sm text-text-muted font-mono cursor-not-allowed rounded-lg h-[44px]"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Barang</label>
              <input 
                type="text" 
                {...register("name")}
                required
                placeholder="Contoh: Semen Gresik 50kg"
                className="w-full p-3 lg:p-3.5 bg-bg-main border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Deskripsi</label>
            <textarea 
              {...register("description")}
              placeholder="Keterangan tambahan barang..."
              className="w-full p-3 lg:p-3.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[60px] lg:min-h-[80px] border bg-bg-main border-border-default text-text-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Kategori</label>
              <select 
                {...register("categoryId")}
                required
                className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Pemasok</label>
              <select 
                {...register("supplierId")}
                className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
              >
                <option value="">-- Tanpa Pemasok --</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-8 bg-bg-main/50 p-4 rounded-[2rem] border border-border-subtle">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Daftar Satuan & Harga</label>
              <button 
                type="button"
                onClick={() => append({ unitId: "", price: 0, conversionFactor: 1 })}
                className="flex items-center space-x-1.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white transition-all group rounded-full px-7 py-[14px] text-[14px] font-bold active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tambah Satuan</span>
              </button>
            </div>
            
            <div className="space-y-8">
              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end p-8 bg-bg-card border border-border-default rounded-[32px] animate-in fade-in zoom-in duration-200">
                  <div className="lg:col-span-4 space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest ml-1">Satuan {index === 0 && "(Utama)"}</label>
                    <select 
                      {...register(`prices.${index}.unitId` as const)}
                      required
                      className="w-full px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                    >
                      <option value="">-- Satuan --</option>
                      {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-4 space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest ml-1">Harga Jual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-bold">Rp</span>
                      <input 
                        type="number"
                        {...register(`prices.${index}.price` as const, { valueAsNumber: true })}
                        required
                        placeholder="0"
                        className="w-full py-2.5 pr-3 pl-9 bg-bg-main border border-border-default text-xs font-black focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary rounded-lg h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 ml-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Isi / Konversi</label>
                      <div className="relative group/tooltip flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help transition-colors" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-brand-primary text-[10px] text-text-inverse font-medium rounded-[24px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[90] leading-relaxed normal-case text-left transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                          Jumlah satuan terkecil dalam 1 unit ini.
                          <div className="mt-1.5 border-t border-text-inverse/10 pt-1.5 text-text-inverse/70">
                            <strong>Aturan Konversi:</strong><br/>
                            &bull; Gunakan <strong>1</strong> untuk satuan terkecil (misal: Karung).<br/>
                            &bull; Untuk satuan besar (misal: Kol), isi jumlah karung dalam 1 kol (misal: 10).
                          </div>
                          <div className="absolute top-full right-[2px] border-[5px] border-transparent border-t-brand-primary"></div>
                        </div>
                      </div>
                    </div>
                    <input 
                      type="number"
                      {...register(`prices.${index}.conversionFactor` as const, { valueAsNumber: true })}
                      required
                      min="0.000001"
                      step="any"
                      placeholder="1"
                      className="w-full p-2.5 bg-bg-main border border-border-default text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary rounded-lg h-[44px]"
                    />
                  </div>
                  <div className="lg:col-span-1 flex justify-end pb-0.5">
                    {fields.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-status-danger hover:bg-status-danger/10 rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdminOrManager && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                {editingItem ? "Harga Modal (Avg Cost)" : "Harga Modal Awal *"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                <input 
                  type="number" 
                  {...(editingItem ? register("averageCost") : register("initialCost"))}
                  readOnly={!!editingItem}
                  className={cn(
                    "w-full py-3.5 pr-4 pl-12 bg-bg-main border border-border-default text-sm font-black focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]",
                    editingItem ? "bg-bg-main/50 cursor-not-allowed text-text-muted" : ""
                  )}
                />
              </div>
              {!editingItem && <p className="text-[9px] text-text-muted font-medium ml-1">Digunakan sebagai harga beli batch pertama (FIFO).</p>}
            </div>
          )}

          {isAdminOrManager && mainPrice > 0 && watchedCost > 0 && Number(mainPrice) < Number(watchedCost) && (
            <div className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-[32px] flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-status-danger mt-0.5 flex-shrink-0" />
              <div className="text-xs font-bold text-status-danger uppercase tracking-tight leading-tight">
                Peringatan: Harga jual (satuan ke-1) lebih rendah dari harga modal!<br/>
                Potensi rugi: Rp {Number(watchedCost) - Number(mainPrice)} per unit.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Stok Minimum</label>
              <input 
                type="number" 
                {...register("minStock")}
                required
                step="any"
                className="w-full p-3 lg:p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary border bg-bg-main border-border-default text-text-primary transition-all rounded-lg h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 ml-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Lead Time Supplier
                </label>
                <div className="relative group/tooltip flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help transition-colors" />
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-brand-primary text-[10px] text-text-inverse font-medium rounded-[24px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[90] leading-relaxed normal-case text-left transform scale-95 origin-bottom-right group-hover/tooltip:scale-100">
                    Estimasi hari dari pemesanan hingga barang tiba dari supplier. Digunakan sistem untuk menghitung rekomendasi stok minimum otomatis (Optimasi ABC).
                    <div className="mt-1.5 border-t border-text-inverse/10 pt-1.5 text-text-inverse/70">
                      Contoh: Semen = 2 hari &bull; Keramik = 5 hari &bull; Besi = 7 hari
                    </div>
                    <div className="absolute top-full right-[2px] border-[5px] border-transparent border-t-brand-primary"></div>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center">
                <input 
                  type="number" 
                  {...register("leadTime")}
                  min={0}
                  max={90}
                  className="w-full p-3 pr-12 lg:p-3.5 lg:pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary border bg-bg-main border-border-default text-text-primary transition-all rounded-lg h-[44px]"
                  placeholder="3"
                />
                <span className="absolute right-4 text-xs font-bold text-text-muted">hari</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">
              {editingItem ? "Stok Saat Ini (Detail per Satuan)" : "Stok Awal (Detail per Satuan)"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {watchedPrices.map((p, idx) => {
                const unitObj = units?.find((u: any) => u.id === p.unitId);
                const unitName = unitObj?.name || `Satuan ${idx + 1}`;
                return (
                  <div key={p.unitId || idx} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">{unitName}</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="0"
                      className={cn(
                        "w-full p-3 lg:p-3.5 border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all rounded-lg h-[44px]",
                        editingItem ? "bg-bg-main/50 border-border-default cursor-not-allowed text-text-muted" : "bg-bg-main border-border-default"
                      )}
                      value={stockParts[p.unitId || ""] || ""}
                      onChange={(e) => !editingItem && handleStockPartChange(p.unitId, Number(e.target.value) || 0)}
                      readOnly={!!editingItem}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{editingItem ? "Update Data" : "Simpan Barang"}</span>
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
          >
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const GenericModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GenericFormValues) => void;
  editingItem: any;
  type: "kategori" | "satuan";
}> = ({ isOpen, onClose, onSubmit, editingItem, type }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GenericFormValues>({
    resolver: zodResolver(GenericSchema),
  });

  useEffect(() => {
    if (editingItem) reset({ name: editingItem.name });
    else reset({ name: "" });
  }, [editingItem, isOpen, reset]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? `Edit ${type}` : `Tambah ${type}`} icon={type === "kategori" ? <Tag className="w-5 h-5" /> : <Layers className="w-5 h-5" />}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-6">
          <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nama {type} *</label>
          <input {...register("name")} placeholder={`Contoh: ${type === "kategori" ? "Semen" : "Sak"}`} className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.name ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
          {errors.name && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.name.message}</p>}
        </div>
        </div>
        <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
          <button type="submit" disabled={isSubmitting} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{editingItem ? "Update Data" : "Simpan Data"}</span>
          </button>
          <button type="button" onClick={onClose} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main">
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormValues) => void;
  editingItem: any;
}> = ({ isOpen, onClose, onSubmit, editingItem }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserFormValues>({
    resolver: zodResolver(UserSchema) as any,
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        username: editingItem.username,
        fullName: editingItem.fullName,
        role: editingItem.role,
        isActive: editingItem.isActive,
        password: "",
      });
    } else {
      reset({ username: "", fullName: "", role: "CASHIER", isActive: true, password: "" });
    }
  }, [editingItem, isOpen, reset]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Edit Pengguna" : "Buat Akun Baru"} icon={<Trash2 className="w-5 h-5" />}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-6">
          <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nama Lengkap *</label>
          <input {...register("fullName")} placeholder="Nama Lengkap" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.fullName ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
          {errors.fullName && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Username *</label>
          <input {...register("username")} placeholder="Username" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.username ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
          {errors.username && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.username.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">{editingItem ? "Password Baru (Kosongkan jika tidak ganti)" : "Password *"}</label>
          <input {...register("password")} type="password" placeholder="******" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.password ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
          {errors.password && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.password.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Role *</label>
            <select {...register("role")} className="w-full px-4 py-3 bg-bg-main border border-border-default text-sm focus:ring-2 focus:ring-brand-primary outline-none rounded-lg h-[44px]">
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="CASHIER">CASHIER</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Status Keaktifan</label>
            <div className="flex items-center space-x-2 h-11">
              <input type="checkbox" {...register("isActive")} className="w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-primary rounded-lg" />
              <span className="text-sm font-medium text-text-primary">Akun Aktif</span>
            </div>
          </div>
        </div>
        </div>
        <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
          <button type="submit" disabled={isSubmitting} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{editingItem ? "Update Akun" : "Buat Akun"}</span>
          </button>
          <button type="button" onClick={onClose} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main">
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const SupplierModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormValues) => void;
  editingItem: any;
}> = ({ isOpen, onClose, onSubmit, editingItem }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        contact: editingItem.contact || "",
        phone: editingItem.phone || "",
        address: editingItem.address || "",
        email: editingItem.email || "",
      });
    } else {
      reset({ name: "", contact: "", phone: "", address: "", email: "" });
    }
  }, [editingItem, isOpen, reset]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Edit Pemasok" : "Tambah Pemasok"} icon={<Truck className="w-5 h-5" />}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-6">
          <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nama Pemasok *</label>
          <input {...register("name")} placeholder="Contoh: PT. Sumber Makmur" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.name ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
          {errors.name && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Kontak Person</label>
            <input {...register("contact")} placeholder="Nama perwakilan" className="w-full px-4 py-3 bg-bg-main border border-border-default text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all rounded-lg" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nomor Telepon</label>
            <input {...register("phone")} placeholder="08xxxxxxxx" className="w-full px-4 py-3 bg-bg-main border border-border-default text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Alamat</label>
          <textarea {...register("address")} rows={2} className="w-full px-4 py-3 bg-bg-main border border-border-default rounded-xl text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-none" placeholder="Alamat lengkap..." />
        </div>
        </div>
        <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
          <button type="submit" disabled={isSubmitting} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{editingItem ? "Update Data" : "Simpan Pemasok"}</span>
          </button>
          <button type="button" onClick={onClose} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main">
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const CustomerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormValues) => void;
  editingItem: any;
}> = ({ isOpen, onClose, onSubmit, editingItem }) => {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema) as any,
  });

  const isContractor = watch("isContractor");

  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        phone: editingItem.phone || "",
        email: editingItem.email || "",
        address: editingItem.address || "",
        isContractor: editingItem.isContractor || false,
        creditLimit: editingItem.creditLimit || 0,
        notes: editingItem.notes || "",
      });
    } else {
      reset({ name: "", phone: "", email: "", address: "", isContractor: false, creditLimit: 0, notes: "" });
    }
  }, [editingItem, isOpen, reset]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Edit Pelanggan" : "Tambah Pelanggan"} icon={<Users className="w-5 h-5" />}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-6">
          <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nama Pelanggan *</label>
          <input 
            {...register("name")} 
            placeholder="Nama Lengkap" 
            readOnly={editingItem?.name?.toLowerCase() === "umum"}
            className={cn(
              "w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", 
              errors.name ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary",
              editingItem?.name?.toLowerCase() === "umum" && "bg-bg-main/50 cursor-not-allowed text-text-muted"
            )} 
          />
          {errors.name && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Nomor Telepon *</label>
            <input {...register("phone")} placeholder="08xxxxxxxx" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.phone ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
            {errors.phone && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Email</label>
            <input {...register("email")} placeholder="email@example.com" className={cn("w-full px-4 py-3 bg-bg-main border rounded-xl text-sm outline-none transition-all", errors.email ? "border-status-danger" : "border-border-default focus:ring-2 focus:ring-brand-primary")} />
            {errors.email && <p className="text-[10px] text-status-danger font-bold ml-1">{errors.email.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Alamat</label>
          <textarea {...register("address")} rows={2} className="w-full px-4 py-3 bg-bg-main border border-border-default rounded-xl text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-none" placeholder="Alamat lengkap..." />
        </div>
        
        <div className="p-4 bg-bg-main border border-border-default rounded-[32px] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-text-primary">Status Kontraktor</p>
              <p className="text-[10px] text-text-muted font-medium">Kontraktor memiliki akses fitur piutang</p>
            </div>
            <input 
              type="checkbox" 
              {...register("isContractor")} 
              disabled={watch("name")?.toLowerCase() === "umum" || editingItem?.name?.toLowerCase() === "umum"}
              className="w-5 h-5 rounded border-border-default text-brand-primary focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" 
            />
          </div>
          {isContractor && (
            <div className="pt-4 border-t border-border-subtle animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Limit Piutang (Rp)</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                <input type="number" {...register("creditLimit")} className="w-full pl-10 pr-4 py-3 bg-bg-card border border-border-default text-sm font-black focus:ring-2 focus:ring-brand-primary outline-none transition-all rounded-lg h-[44px]" placeholder="0" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider ml-1">Catatan</label>
          <textarea {...register("notes")} rows={2} className="w-full px-4 py-3 bg-bg-main border border-border-default rounded-xl text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-none" placeholder="Catatan tambahan..." />
        </div>
        </div>
        <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
          <button type="submit" disabled={isSubmitting} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2 disabled:opacity-50">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{editingItem ? "Update Data" : "Simpan Pelanggan"}</span>
          </button>
          <button type="button" onClick={onClose} className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main">
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const DeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isBulk?: boolean;
}> = ({ isOpen, onClose, onConfirm, itemName, isBulk }) => (
  <>
    {isOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-end lg:items-center justify-center lg:p-4">
        <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col">
          <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
            <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
          </div>
          <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
            <h2 className="text-base lg:text-lg font-black text-text-inverse">Konfirmasi Hapus?</h2>
            <button onClick={onClose} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-8 text-center bg-bg-card">
            <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Trash2 className="w-10 h-10" />
            </div>
            <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
            <p className="text-xs font-bold text-text-muted leading-relaxed">
              {isBulk ? `Apakah Anda yakin ingin menghapus ${itemName} item terpilih?` : `Apakah Anda yakin ingin menghapus "${itemName}"?`} Data yang sudah dihapus tidak dapat dikembalikan.
            </p>
          </div>
          <div className="p-5 lg:p-6 bg-bg-main/50 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-6">
            <button 
              onClick={onConfirm}
              className="w-full lg:flex-1 py-4 bg-status-danger text-text-inverse font-black text-sm shadow-xl shadow-status-danger/20 hover:bg-status-danger/80 transition-all active:scale-95 rounded-full"
            >
              Ya, Hapus
            </button>
            <button 
              onClick={onClose}
              className="w-full lg:flex-1 py-4 bg-bg-card border-2 border-border-default text-text-secondary font-black text-sm hover:bg-bg-main transition-all rounded-full"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
