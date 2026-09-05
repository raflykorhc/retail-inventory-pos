import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Loader2, Trash2, Plus, CalendarIcon } from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
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
            <span className="truncate text-left">
              {selectedItem ? <ComboboxValue /> : placeholder}
            </span>
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

const addStockSchema = z.object({
  transactionDate: z.string().min(1, "Tanggal transaksi wajib diisi"),
  supplierId: z.string().optional(),
  paymentMethod: z.string().min(1, "Metode pembayaran wajib dipilih"),
  items: z.array(z.object({
    productId: z.string().min(1, "Produk wajib dipilih"),
    quantity: z.coerce.number().min(0.01, "Jumlah harus lebih dari 0"),
    unitId: z.string().min(1, "Satuan harus dipilih"),
    cost: z.coerce.number().min(0, "Harga beli tidak boleh negatif"),
    price: z.coerce.number().min(0, "Harga jual tidak boleh negatif"),
    units: z.any().optional(), // to store units array for dropdown
  })).min(1, "Minimal 1 barang harus ditambahkan"),
});

type AddStockFormValues = z.infer<typeof addStockSchema>;

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null; // Initial product
}

export function AddStockModal({ isOpen, onClose, product }: AddStockModalProps) {
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await axiosClient.get("/suppliers")).data,
    enabled: isOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await axiosClient.get("/products?limit=1000")).data,
    enabled: isOpen,
  });
  const allProducts = productsData?.items || productsData || [];

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await axiosClient.get("/units")).data,
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddStockFormValues>({
    resolver: zodResolver(addStockSchema) as any,
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
      supplierId: "",
      paymentMethod: "Cash",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const itemsWatch = watch("items") || [];

  const totalTagihan = itemsWatch.reduce((sum, item) => {
    return sum + (Number(item?.quantity || 0) * Number(item?.cost || 0));
  }, 0);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        const initialUnitObj = product.prices?.[0] || null;
        const initialUnitId = initialUnitObj?.unitId || "";
        const conversionFactor = initialUnitObj?.conversionFactor || 1;

        // Suggested Qty (converted to selected unit)
        let initialQty = 1;
        if (product.suggestedOrderQty !== undefined && product.suggestedOrderQty > 0) {
          const qtyInUnit = product.suggestedOrderQty / conversionFactor;
          initialQty = Number.isInteger(qtyInUnit) ? qtyInUnit : Number(qtyInUnit.toFixed(2));
        } else if (product.minStock) {
          initialQty = product.minStock;
        }

        // Cost / Harga Beli for the selected unit
        let initialCost = 0;
        if (product.averageCost) {
          initialCost = Number(product.averageCost) * conversionFactor;
        } else if (product.costPrice) {
          initialCost = Number(product.costPrice);
        } else if (initialUnitObj?.price) {
          initialCost = Number(initialUnitObj.price);
        }

        // Supplier
        const initialSupplierId = product.supplierId || product.supplier?.id || "";

        reset({
          transactionDate: new Date().toISOString().slice(0, 10),
          supplierId: String(initialSupplierId),
          paymentMethod: "Cash",
          items: [{
            productId: String(product.id),
            quantity: initialQty,
            unitId: String(initialUnitId),
            cost: initialCost,
            price: initialUnitObj?.price || 0,
            units: product.prices || [],
          }],
        });
      } else {
        reset({
          transactionDate: new Date().toISOString().slice(0, 10),
          supplierId: "",
          paymentMethod: "Cash",
          items: [],
        });
      }
    }
  }, [isOpen, product, reset]);

  const mutation = useMutation({
    mutationFn: async (values: AddStockFormValues) => {
      if (values.supplierId) {
        // Create a real purchase transaction if supplier is selected
        const totalAmount = values.items.reduce((sum, item) => {
          return sum + (Number(item.quantity) * Number(item.cost));
        }, 0);

        const payload = {
          invoiceNumber: "AUTO",
          supplierId: values.supplierId,
          paymentMethod: values.paymentMethod,
          paymentStatus: "LUNAS",
          transactionDate: values.transactionDate,
          totalAmount: totalAmount,
          items: values.items.map(item => ({
            productId: item.productId,
            unitId: item.unitId,
            quantity: item.quantity,
            costPrice: item.cost,
            sellingPrice: item.price
          }))
        };
        await axiosClient.post("/purchases", payload);
        return true;
      } else {
        // Fallback to manual stock additions if no supplier
        const promises = values.items.map(item => {
          const selectedProd = allProducts.find((p: any) => String(p.id) === item.productId) || (product && String(product.id) === item.productId ? product : null);
          const selectedPrice = selectedProd?.prices?.find((p: any) => p.unitId === item.unitId);
          
          const payload = {
            quantity: item.quantity,
            cost: item.cost,
            unitId: item.unitId,
            conversionFactor: selectedPrice?.conversionFactor || 1,
            price: item.price, // New field for selling price
            transactionDate: values.transactionDate,
          };
          return axiosClient.post(`/products/${item.productId}/stock`, payload);
        });
        
        await Promise.all(promises);
        return true;
      }
    },
    onSuccess: () => {
      toast.success("Transaksi berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Terjadi kesalahan sistem");
    },
  });

  const onSubmit = (data: AddStockFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      if (!val) onClose();
    }}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh] w-full">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Transaksi Tambah Stok / Pembelian</DialogTitle>
            </DialogHeader>

            {/* Hidden button to trap initial focus so the date input doesn't get highlighted */}
            <button type="button" autoFocus className="sr-only">Focus trap</button>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Tanggal Transaksi <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="transactionDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger 
                      render={
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const offset = date.getTimezoneOffset();
                            const dateWithOffset = new Date(date.getTime() - (offset * 60 * 1000));
                            field.onChange(dateWithOffset.toISOString().split('T')[0]);
                          } else {
                            field.onChange("");
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.transactionDate && <span className="text-xs text-destructive">{errors.transactionDate.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Pemasok</Label>
              <Controller
                control={control}
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

            <div className="grid gap-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Metode Pembayaran <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Pilih Metode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethod && <span className="text-xs text-destructive">{errors.paymentMethod.message}</span>}
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden bg-muted/20">
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
              <h4 className="text-sm font-bold text-primary">Daftar Barang</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 0, unitId: "", cost: 0, price: 0, units: [] })}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Baris
              </Button>
            </div>
            
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px] gap-2 p-3 bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div>Barang <span className="text-destructive">*</span></div>
              <div>Qty <span className="text-destructive">*</span></div>
              <div>Satuan <span className="text-destructive">*</span></div>
              <div>Harga Beli</div>
              <div>Harga Jual</div>
              <div>Sub Total</div>
              <div></div>
            </div>
            
            <div className="p-2 space-y-2">
              {fields.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">Belum ada barang ditambahkan.</div>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px] gap-2 items-start">
                  {/* Barang */}
                  <div>
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: selectField }) => (
                        <FormCombobox
                          value={selectField.value}
                          onChange={(val) => {
                            selectField.onChange(val);
                            const selectedProd = allProducts.find((p: any) => String(p.id) === val) || (product && String(product.id) === val ? product : null);
                            if (selectedProd) {
                              const unitObj = selectedProd.prices?.[0] || null;
                              const factor = unitObj?.conversionFactor || 1;
                              const calcCost = selectedProd.averageCost ? (Number(selectedProd.averageCost) * factor) : (selectedProd.costPrice || unitObj?.price || 0);
                              
                              let calcQty = 1;
                              if (selectedProd.suggestedOrderQty) {
                                const q = selectedProd.suggestedOrderQty / factor;
                                calcQty = Number.isInteger(q) ? q : Number(q.toFixed(2));
                              } else if (selectedProd.minStock) {
                                calcQty = selectedProd.minStock;
                              }

                              setValue(`items.${index}.unitId`, String(unitObj?.unitId || ""));
                              setValue(`items.${index}.cost`, calcCost);
                              setValue(`items.${index}.price`, unitObj?.price || 0);
                              setValue(`items.${index}.quantity`, calcQty);
                              setValue(`items.${index}.units`, selectedProd.prices || []);

                              if (selectedProd.supplierId || selectedProd.supplier?.id) {
                                setValue("supplierId", String(selectedProd.supplierId || selectedProd.supplier?.id));
                              }
                            }
                          }}
                          options={allProducts}
                          placeholder="Pilih Produk..."
                          searchPlaceholder="Cari produk..."
                          emptyText="Tidak ditemukan."
                          className="h-9 text-xs"
                        />
                      )}
                    />
                    {errors.items?.[index]?.productId && <p className="text-[10px] text-destructive mt-1">{errors.items[index]?.productId?.message}</p>}
                  </div>

                  {/* Qty */}
                  <div>
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-xs"
                      placeholder="Qty"
                      {...register(`items.${index}.quantity`)}
                    />
                    {errors.items?.[index]?.quantity && <p className="text-[10px] text-destructive mt-1">{errors.items[index]?.quantity?.message}</p>}
                  </div>

                  {/* Satuan */}
                  <div>
                    <Controller
                      control={control}
                      name={`items.${index}.unitId`}
                      render={({ field: selectField }) => {
                        const rowProductId = itemsWatch[index]?.productId;
                        const rowProduct = allProducts.find((p: any) => String(p.id) === String(rowProductId)) || (product && String(product.id) === String(rowProductId) ? product : null);
                        const rowUnits = rowProduct?.prices || [];

                        return (
                          <Select 
                            value={String(selectField.value || "")} 
                            onValueChange={(val) => {
                              selectField.onChange(val);
                              const selectedPriceData = rowUnits.find((r: any) => String(r.unitId) === val);
                              if (selectedPriceData) {
                                const factor = selectedPriceData.conversionFactor || 1;
                                const calcCost = rowProduct?.averageCost ? (Number(rowProduct.averageCost) * factor) : (rowProduct?.costPrice || selectedPriceData.price || 0);
                                setValue(`items.${index}.price`, selectedPriceData.price || 0);
                                setValue(`items.${index}.cost`, calcCost);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 w-full text-xs">
                              <span className={cn("flex flex-1 text-left truncate", !selectField.value && "text-muted-foreground")}>
                                {selectField.value ? 
                                  (unitsData?.find((u: any) => String(u.id) === String(selectField.value))?.name 
                                    || rowUnits.find((r: any) => String(r.unitId) === String(selectField.value))?.unit?.name 
                                    || "Satuan") 
                                  : "Satuan"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {rowUnits.map((price: any) => {
                                const unitObj = unitsData?.find((u: any) => String(u.id) === String(price.unitId));
                                return (
                                  <SelectItem key={price.unitId} value={String(price.unitId)}>
                                    {unitObj?.name || price.unit?.name || "Satuan"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                    {errors.items?.[index]?.unitId && <p className="text-[10px] text-destructive mt-1">{errors.items[index]?.unitId?.message}</p>}
                  </div>

                  {/* Harga Beli */}
                  <div>
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-xs"
                      placeholder="Harga Beli"
                      {...register(`items.${index}.cost`)}
                    />
                  </div>

                  {/* Harga Jual */}
                  <div>
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-xs"
                      placeholder="Harga Jual"
                      {...register(`items.${index}.price`)}
                    />
                  </div>

                  {/* Sub Total */}
                  <div>
                    <div className="h-9 flex items-center px-3 border rounded-md bg-muted/50 text-xs text-muted-foreground font-medium truncate">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0
                      }).format((itemsWatch[index]?.quantity || 0) * (itemsWatch[index]?.cost || 0))}
                    </div>
                  </div>

                  {/* Hapus */}
                  <div className="flex justify-center pt-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {errors.items?.root && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs border-t border-destructive/20">
                {errors.items.root.message}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 -mx-6 -mb-6 px-6 py-4 flex flex-row items-center justify-between sm:justify-between">
            <div className="text-lg font-bold">
              Total Tagihan: 
              <span className="text-primary ml-2">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0
                }).format(totalTagihan)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending || fields.length === 0}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Transaksi"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </div>
    </ScrollArea>
  </DialogContent>
    </Dialog>
  );
}
