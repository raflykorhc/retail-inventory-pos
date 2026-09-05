import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2, Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import { SafetyScaleShiftModal, type PreflightData } from "./SafetyScaleShiftModal";
import { ReorderableContainer, DragHandle } from "@/components/ui/reorderable";

function FormCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string | number, name: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}) {
  const items = options ? options.map(opt => ({ ...opt, label: opt.name })) : [];
  const selectedItem = items.find((opt) => String(opt.id) === String(value)) || null;

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
            variant="outline"
            className={cn("w-full justify-between font-normal px-3", !value && "text-muted-foreground", className)}
          >
            {selectedItem ? <ComboboxValue /> : placeholder}
          </Button>
        }
      />
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder={searchPlaceholder} />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: any) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

const priceSchema = z.object({
  unitId: z.string().min(1, "Satuan wajib"),
  price: z.coerce.number().min(0, "Harga tidak valid"),
  conversionFactor: z.coerce.number().min(1, "Konversi minimal 1"),
  initialStockDetail: z.coerce.number().min(0, "Stok tidak valid"),
});

const formSchema = z.object({
  name: z.string().min(2, "Nama wajib diisi minimal 2 karakter"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  supplierId: z.string().optional(),
  image: z.string().optional(),
  averageCost: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  leadTime: z.coerce.number().min(0).optional(),
  warehouseCapacity: z.coerce.number().min(0).optional(),
  prices: z.array(priceSchema).min(1, "Minimal 1 satuan wajib ditambahkan"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function ProductFormModal({ open, onOpenChange, editData }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMultiUnit, setShowMultiUnit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch Options
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await axiosClient.get("/categories")).data,
    enabled: open,
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await axiosClient.get("/units")).data,
    enabled: open,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await axiosClient.get("/suppliers")).data,
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      categoryId: "",
      supplierId: "",
      image: "",
      averageCost: 0,
      minStock: 10,
      leadTime: 3,
      warehouseCapacity: 0,
      prices: [
        { unitId: "", price: 0, conversionFactor: 1, initialStockDetail: 0 }
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "prices",
  });

  const imagePreview = form.watch("image");
  const watchPrices = form.watch("prices") || [];

  const { totalBaseStock, baseUnitName } = (() => {
    if (!watchPrices || watchPrices.length === 0) {
      return { totalBaseStock: "0", baseUnitName: "" };
    }

    let baseRow = watchPrices.find((p) => Number(p.conversionFactor) === 1);
    if (!baseRow) {
      baseRow = watchPrices.reduce((minRow, currRow) => {
        const minFactor = Number(minRow?.conversionFactor) || Infinity;
        const currFactor = Number(currRow?.conversionFactor) || Infinity;
        return currFactor < minFactor ? currRow : minRow;
      }, watchPrices[0]);
    }

    let total = 0;
    watchPrices.forEach((p) => {
      const qty = Number(p.initialStockDetail) || 0;
      const factor = Number(p.conversionFactor) || 1;
      total += qty * factor;
    });

    let name = "";
    if (baseRow?.unitId) {
      const foundUnit = units?.find((u: any) => String(u.id) === String(baseRow.unitId));
      if (foundUnit) {
        name = foundUnit.name;
      } else if (editData?.prices) {
        const editPrice = editData.prices.find((ep: any) => String(ep.unitId) === String(baseRow.unitId));
        if (editPrice?.unit?.name) {
          name = editPrice.unit.name;
        }
      }
    }

    const formattedTotal = Number.isInteger(total)
      ? total.toLocaleString("id-ID")
      : Number(total.toFixed(4)).toLocaleString("id-ID");

    return {
      totalBaseStock: formattedTotal,
      baseUnitName: name,
    };
  })();

  const isImageDeleted = imagePreview === "";
  const hasExistingImage = imagePreview === "__EXISTING__";
  const displayImageUrl = hasExistingImage ? `${axiosClient.defaults.baseURL || '/api'}/products/${editData?.id}/image?t=${Date.now()}` : (imagePreview !== "" ? imagePreview : null);

  useEffect(() => {
    if (open) {
      setIsEditMode(!!editData);
      if (editData) {
        let stockAllocations: Record<string, number> = {};
        let mainFactor = 1;
        if (editData.prices && editData.prices.length > 0) {
          let remainingStock = editData.stock || 0;
          // Urutkan dari rasio terbesar ke terkecil
          const sortedPrices = [...editData.prices].sort((a: any, b: any) => (b.conversionFactor || 1) - (a.conversionFactor || 1));
          mainFactor = sortedPrices[0]?.conversionFactor || 1;

          sortedPrices.forEach((p: any, i: number) => {
            const factor = p.conversionFactor || 1;
            if (i === sortedPrices.length - 1) {
              // Satuan terkecil mengambil semua sisa (bisa jadi desimal jika ada pecahan aneh)
              stockAllocations[p.unitId] = remainingStock / factor;
            } else {
              // Satuan yang lebih besar mengambil nilai bulat (integer)
              const qty = Math.floor(remainingStock / factor);
              stockAllocations[p.unitId] = qty;
              remainingStock -= qty * factor;
            }
          });
        }

        form.reset({
          name: editData.name || "",
          categoryId: editData.categoryId || "",
          supplierId: editData.supplierId || "",
          image: editData.productImage?.id ? "__EXISTING__" : "",
          averageCost: Math.round((editData.averageCost || 0) * mainFactor),
          minStock: (editData.minStock || 10) / mainFactor,
          leadTime: editData.leadTime || 3,
          warehouseCapacity: editData.warehouseCapacity || 0,
          prices: editData.prices?.length > 0 ? editData.prices.map((p: any) => {
            const qty = stockAllocations[p.unitId] || 0;
            return {
              unitId: p.unitId || "",
              price: p.price || 0,
              conversionFactor: p.conversionFactor || 1,
              initialStockDetail: Number.isInteger(qty) ? qty : Number(qty.toFixed(2)),
            };
          }) : [{ unitId: "", price: 0, conversionFactor: 1, initialStockDetail: editData.stock || 0 }],
        });
        setShowMultiUnit(editData.prices?.length > 1);
      } else {
        form.reset({
          name: "",
          categoryId: "",
          supplierId: "",
          image: "",
          averageCost: 0,
          minStock: 10,
          leadTime: 3,
          warehouseCapacity: 0,
          prices: [{ unitId: "", price: 0, conversionFactor: 1, initialStockDetail: 0 }],
        });
        setShowMultiUnit(false);
      }
    }
  }, [open, editData, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Hitung total initial stock dari detail per satuan
      let totalInitialStock = 0;
      values.prices.forEach((p) => {
        totalInitialStock += (p.initialStockDetail || 0) * (p.conversionFactor || 1);
      });

      // Siapkan payload sesuai ProductService.create
      // Backend butuh top-level unitId and price. We use the largest unit as the reference for Average Cost.
      const baseUnit = values.prices.reduce((max, current) => 
        (max?.conversionFactor || 0) > (current?.conversionFactor || 0) ? max : current
      , values.prices[0]);

      const payload: any = {
        name: values.name,
        categoryId: values.categoryId,
        supplierId: values.supplierId,
        image: values.image === "__EXISTING__" ? undefined : values.image,
        averageCost: values.averageCost,
        minStock: values.minStock,
        leadTime: values.leadTime,
        warehouseCapacity: values.warehouseCapacity || null,
        // HANYA kirim stock & initialStock untuk Produk BARU (!editData)
        // Untuk Edit Produk, stok dikelola oleh batch & scale shift engine (bukan ditimpa dari form edit)
        ...(editData ? {} : { initialStock: totalInitialStock, stock: totalInitialStock }),
        unitId: baseUnit?.unitId || values.prices[0].unitId,
        price: baseUnit?.price || values.prices[0].price,
        prices: values.prices.map(p => ({
          unitId: p.unitId,
          price: p.price,
          conversionFactor: p.conversionFactor
        })),
      };

      if (editData) {
        const res = await axiosClient.put(`/products/${editData.id}`, payload);
        return res.data;
      } else {
        const res = await axiosClient.post("/products", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editData ? "Produk berhasil diperbarui!" : "Produk berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Gagal menyimpan produk");
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran gambar maksimal 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [safetyPreflight, setSafetyPreflight] = useState<PreflightData | null>(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const onSubmit = async (values: FormValues) => {
    if (editData) {
      try {
        const res = await axiosClient.post(`/products/${editData.id}/preflight-scale-shift`, {
          prices: values.prices.map(p => ({ unitId: p.unitId, price: p.price, conversionFactor: p.conversionFactor }))
        });
        const preflight = res.data as PreflightData;
        if (preflight.scaleShiftRatio !== 1 || (preflight.errors && preflight.errors.length > 0)) {
          setSafetyPreflight(preflight);
          setPendingValues(values);
          setIsSafetyModalOpen(true);
          return;
        }
      } catch (err: any) {
        console.error("Preflight error:", err);
      }
    }
    mutation.mutate(values);
  };

  const handleConfirmSafetyShift = () => {
    if (pendingValues) {
      mutation.mutate(pendingValues);
      setIsSafetyModalOpen(false);
      setPendingValues(null);
      setSafetyPreflight(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh] w-full">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>{editData ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

                {/* BAGIAN 1: INFO DASAR & GAMBAR (2x2 GRID) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 1. Nama Produk */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase">Nama Produk <span className="text-destructive">*</span></Label>
                    <Input id="name" placeholder="Contoh: Semen Gresik 40kg" className="w-full" {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                  </div>

                  {/* 2. Gambar (Dropzone Minimalis) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Gambar Produk</Label>
                      {(imagePreview || hasExistingImage) && (
                        <button type="button" onClick={() => form.setValue("image", "")} className="text-[10px] font-bold text-destructive hover:underline">HAPUS</button>
                      )}
                    </div>
                    <div
                      className="h-9 w-full border-2 border-dashed rounded-md flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {displayImageUrl ? (
                        <>
                          <img src={displayImageUrl} alt="Preview" className="h-6 w-6 object-cover rounded" />
                          <span className="text-xs text-muted-foreground truncate">Gambar sudah dipilih</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-muted-foreground opacity-50" />
                          <span className="text-xs text-muted-foreground">Klik untuk upload gambar...</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <input type="hidden" {...form.register("image")} />
                  </div>

                  {/* 3. Kategori */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Kategori <span className="text-destructive">*</span></Label>
                    <Controller
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={categories || []}
                          placeholder="Pilih Kategori"
                          searchPlaceholder="Cari kategori..."
                          emptyText="Kategori tidak ditemukan."
                          className="h-9"
                        />
                      )}
                    />
                    {form.formState.errors.categoryId && <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>}
                  </div>

                  {/* 4. Pemasok */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Pemasok</Label>
                    <Controller
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormCombobox
                          value={field.value || ""}
                          onChange={field.onChange}
                          options={suppliers || []}
                          placeholder="Pilih Pemasok"
                          searchPlaceholder="Cari pemasok..."
                          emptyText="Pemasok tidak ditemukan."
                          className="h-9"
                        />
                      )}
                    />
                  </div>

                </div>

                {/* BAGIAN 3: PENGATURAN LAINNYA */}
                <div className="grid grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase" title="Rata-rata modal per satuan dasar">Harga Modal (Avg Cost)</Label>
                    <Input type="number" step="any" placeholder="0" {...form.register("averageCost")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase" title="Batas minimum peringatan stok">Stok Minimum</Label>
                    <Input type="number" step="any" placeholder="10" {...form.register("minStock")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase" title="Waktu tunggu restock (hari)">Lead Time (Hari)</Label>
                    <Input type="number" step="any" placeholder="3" {...form.register("leadTime")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase" title="Kapasitas maksimal gudang">Kapasitas Gudang</Label>
                    <Input type="number" step="any" placeholder="0 (Tanpa Batas)" {...form.register("warehouseCapacity")} />
                  </div>
                </div>

                {/* BAGIAN 2: PENGATURAN MULTI-SATUAN & STOK (TOGGLED) */}
                {showMultiUnit && (
                  <div className="space-y-4 pt-4 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h4 className="text-sm font-bold text-primary">Satuan & {isEditMode ? "Stok" : "Stok Awal"}</h4>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ unitId: "", price: 0, conversionFactor: 1, initialStockDetail: 0 })}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah Satuan
                      </Button>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-muted/20">
                      <div className="grid grid-cols-[28px_minmax(120px,1fr)_1fr_1fr_1fr_auto] gap-2 p-3 bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider items-center">
                        <div></div>
                        <div>Satuan <span className="text-destructive">*</span></div>
                        <div>Rasio (Isi) <span className="text-destructive">*</span></div>
                        <div>Harga Jual <span className="text-destructive">*</span></div>
                        <div>{isEditMode ? "Stok" : "Stok Awal"} <span className="text-destructive">*</span></div>
                        <div className="flex justify-end">
                          <Badge variant="secondary" className="normal-case font-semibold text-[10px] px-2 py-0.5 whitespace-nowrap">
                            Stok: {totalBaseStock}{baseUnitName ? ` ${baseUnitName.charAt(0).toUpperCase() + baseUnitName.slice(1).toLowerCase()}` : ""}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-2 space-y-2">
                        <ReorderableContainer
                          items={fields}
                          onReorder={(_, fromIndex, toIndex) => move(fromIndex, toIndex)}
                          renderItem={(field, index, dragHandleProps) => (
                            <div className="grid grid-cols-[28px_minmax(120px,1fr)_1fr_1fr_1fr_40px] gap-2 items-start">
                              <div className="flex justify-center pt-2">
                                <DragHandle {...dragHandleProps} />
                              </div>

                              <div>
                                <Controller
                                  control={form.control}
                                  name={`prices.${index}.unitId`}
                                  render={({ field: selectField }) => (
                                    <FormCombobox
                                      value={selectField.value}
                                      onChange={selectField.onChange}
                                      options={units || []}
                                      placeholder="Pilih..."
                                      searchPlaceholder="Cari satuan..."
                                      emptyText="Satuan tidak ditemukan."
                                      className="h-9 text-xs"
                                    />
                                  )}
                                />
                                {form.formState.errors.prices?.[index]?.unitId && <p className="text-[10px] text-destructive mt-1">{form.formState.errors.prices[index]?.unitId?.message}</p>}
                              </div>

                              <div>
                                <Input
                                  type="number"
                                  step="any"
                                  className="h-9 text-xs"
                                  placeholder="Contoh: 1, 10, 24"
                                  title="1 Satuan ini sama dengan berapa satuan dasar (Pcs)?"
                                  {...form.register(`prices.${index}.conversionFactor`)}
                                />
                                {form.formState.errors.prices?.[index]?.conversionFactor && <p className="text-[10px] text-destructive mt-1">{form.formState.errors.prices[index]?.conversionFactor?.message}</p>}
                              </div>

                              <div>
                                <Input
                                  type="number"
                                  step="any"
                                  className="h-9 text-xs"
                                  placeholder="Harga"
                                  {...form.register(`prices.${index}.price`)}
                                />
                              </div>

                              <div>
                                <Input
                                  type="number"
                                  step="any"
                                  className="h-9 text-xs"
                                  placeholder="Qty"
                                  {...form.register(`prices.${index}.initialStockDetail`)}
                                />
                              </div>

                              <div className="flex justify-center pt-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                    {form.formState.errors.prices?.root && (
                      <p className="text-xs text-destructive">{form.formState.errors.prices.root.message}</p>
                    )}
                  </div>
                )}

                <DialogFooter className="mt-6 -mx-6 -mb-6 px-6 py-4 sm:justify-between items-center">
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant={showMultiUnit ? "secondary" : "outline"}
                      onClick={() => setShowMultiUnit(!showMultiUnit)}
                    >
                      <Plus className={`w-4 h-4 mr-2 transition-transform ${showMultiUnit ? 'rotate-45' : ''}`} />
                      Satuan & Stok
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Menyimpan..." : (editData ? "Simpan Perubahan" : "Simpan Produk")}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SafetyScaleShiftModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onConfirm={handleConfirmSafetyShift}
        preflightData={safetyPreflight}
        isLoading={mutation.isPending}
      />
    </>
  );
}
