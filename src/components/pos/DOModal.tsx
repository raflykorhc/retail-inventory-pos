import React from "react";
import { X, Minus, Plus, Package } from "lucide-react";
import { useCartStore } from "../../store/useCartStore";
import { toast } from "sonner";
import axiosClient from "../../lib/axiosClient";

export const DOModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedSaleForDO,
    doItems,
    setDoItems,
    isCreatingDO,
    setIsCreatingDO
  } = useCartStore();

  const [driverName, setDriverName] = React.useState("");
  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [address, setAddress] = React.useState("");

  // Suggestion states
  const [showDriverSuggestions, setShowDriverSuggestions] = React.useState(false);
  const [showPlateSuggestions, setShowPlateSuggestions] = React.useState(false);

  const [hiddenHistory, setHiddenHistory] = React.useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('deliveryHiddenHistory') || '[]');
    }
    return [];
  });

  const hideHistoryItem = (item: string) => {
    const newHidden = [...hiddenHistory, item];
    setHiddenHistory(newHidden);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deliveryHiddenHistory', JSON.stringify(newHidden));
    }
  };
  const [deliveries, setDeliveries] = React.useState<any[]>([]);

  const isOpen = activeModal === "doModal";

  React.useEffect(() => {
    if (isOpen) {
      setDriverName("");
      setVehiclePlate("");
      setAddress(selectedSaleForDO?.customer?.address || "");
      
      // Fetch deliveries to populate driver history
      fetch("/api/deliveries")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setDeliveries(data);
          }
        })
        .catch(err => console.error("Error fetching deliveries for suggestions:", err));
    }
  }, [isOpen, selectedSaleForDO]);

  // Extract unique history from deliveries
  const uniqueDrivers = React.useMemo(() => {
    const sorted = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const drivers = sorted
      .map(d => d.driverName?.trim())
      .filter((name): name is string => typeof name === "string" && name !== "" && name !== "-" && !hiddenHistory.includes(name));
    return Array.from(new Set(drivers));
  }, [deliveries, hiddenHistory]);

  const uniquePlates = React.useMemo(() => {
    const sorted = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const plates = sorted
      .map(d => d.vehiclePlate?.trim())
      .filter((plate): plate is string => typeof plate === "string" && plate !== "" && plate !== "-" && !hiddenHistory.includes(plate));
    return Array.from(new Set(plates));
  }, [deliveries, hiddenHistory]);

  // Filter suggestions based on input
  const filteredDriverSuggestions = React.useMemo(() => {
    const query = driverName.toLowerCase().trim();
    if (!query) return uniqueDrivers.slice(0, 3);
    return uniqueDrivers.filter(d => d.toLowerCase().includes(query)).slice(0, 3);
  }, [uniqueDrivers, driverName]);

  const filteredPlateSuggestions = React.useMemo(() => {
    const query = vehiclePlate.toLowerCase().trim();
    if (!query) return uniquePlates.slice(0, 3);
    return uniquePlates.filter(p => p.toLowerCase().includes(query)).slice(0, 3);
  }, [uniquePlates, vehiclePlate]);

  if (!isOpen || !selectedSaleForDO) return null;

  const handleUpdateDOQty = (productId: string, qty: number) => {
    setDoItems(
      doItems.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(0, Math.min(item.pendingQty, qty));
          return { ...item, deliveryQty: newQty };
        }
        return item;
      })
    );
  };

  const submitCreateDO = async () => {
    const itemsToDeliver = doItems.filter(item => item.deliveryQty > 0).map(item => ({
      saleItemId: item.saleItemId,
      takenQuantity: item.deliveryQty,
      productId: item.productId,
      quantity: item.deliveryQty,
      unitName: item.unitName
    }));

    if (itemsToDeliver.length === 0) {
      toast.error("Gagal memproses", { description: "Pilih minimal satu barang untuk diambil" });
      return;
    }

    setIsCreatingDO(true);
    try {
      const isDelivery = driverName.trim() !== "" || vehiclePlate.trim() !== "";

      if (isDelivery) {
        // Create DO (Surat Jalan), stock will be deducted when status becomes DELIVERED
        await axiosClient.post("/deliveries", {
          saleId: selectedSaleForDO.id,
          driverName: driverName.trim(),
          vehiclePlate: vehiclePlate.trim(),
          address: address.trim(),
          items: itemsToDeliver
        });
        toast.success("Berhasil", { description: "Surat Jalan (DO) berhasil dibuat!" });
      } else {
        // Self pickup (Ambil Titipan), deduct stock immediately
        await axiosClient.post(`/sales/${selectedSaleForDO.id}/fulfill`, {
          itemsToTake: itemsToDeliver
        });
        toast.success("Berhasil", { description: "Pengambilan barang berhasil dicatat!" });
      }
      
      setActiveModal(null);
    } catch (error: any) {
      console.error("Error processing items:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Terjadi kesalahan sistem";
      toast.error("Gagal", { description: errorMessage });
    } finally {
      setIsCreatingDO(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
      <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-xl">
        {/* Drag Handle for Mobile */}
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
          <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
        </div>
        <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
          <div>
            <h3 className="text-base lg:text-lg font-black text-text-inverse">Buat Pengiriman</h3>
            <p className="text-[10px] font-bold text-text-inverse/80 uppercase tracking-wider">{selectedSaleForDO.invoiceNumber}</p>
          </div>
          <button onClick={() => setActiveModal("history")} className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 lg:mr-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 lg:w-6 h-6" />
          </button>
        </div>
        <div className="p-4 lg:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Pelanggan</span>
              <span className="text-xs font-black text-brand-primary bg-brand-light px-2 py-0.5 rounded">{selectedSaleForDO.customer?.name || "Umum"}</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Alamat Pengiriman
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-bg-card border-border-default focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted/50 resize-none leading-relaxed"
                placeholder="Masukkan alamat pengiriman..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Informasi Pengiriman</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Nama Pihak Pengambil (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi (Supir)"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  onFocus={() => setShowDriverSuggestions(true)}
                  onBlur={() => setShowDriverSuggestions(false)}
                  className="w-full px-3 py-2 border rounded-xl bg-bg-card border-border-default text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted/50"
                />
                {showDriverSuggestions && filteredDriverSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                    {filteredDriverSuggestions.map((driver) => (
                      <div key={driver} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDriverName(driver);
                            setShowDriverSuggestions(false);
                          }}
                          className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                        >
                          <span>{driver}</span>
                        </button>
                        <button 
                          type="button" 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            hideHistoryItem(driver);
                          }}
                          className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus dari riwayat"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  No. Polisi / Plat Kendaraan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: B 1234 CD"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  onFocus={() => setShowPlateSuggestions(true)}
                  onBlur={() => setShowPlateSuggestions(false)}
                  className="w-full px-3 py-2 border rounded-xl bg-bg-card border-border-default text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary uppercase placeholder:text-text-muted/50"
                />
                {showPlateSuggestions && filteredPlateSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                    {filteredPlateSuggestions.map((plate) => (
                      <div key={plate} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setVehiclePlate(plate);
                            setShowPlateSuggestions(false);
                          }}
                          className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                        >
                          <span>{plate}</span>
                        </button>
                        <button 
                          type="button" 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            hideHistoryItem(plate);
                          }}
                          className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus dari riwayat"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Daftar Barang & Jumlah Ambil</h4>
            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {doItems.map((item) => (
                <div key={item.productId} className="p-3 bg-bg-main rounded-[24px] border border-border-subtle flex items-center justify-between animate-in slide-in-from-bottom-1">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-xs font-black text-text-primary truncate">{item.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-bold text-text-muted">Total: {item.totalQty}</span>
                      {item.pickedUpQty > 0 && <span className="text-[10px] font-bold text-emerald-600">Ambil: {item.pickedUpQty}</span>}
                      {item.inDeliveryQty > 0 && <span className="text-[10px] font-bold text-amber-600">Terkirim: {item.inDeliveryQty}</span>}
                      <span className="text-[10px] font-bold text-brand-primary">Sisa: {item.pendingQty}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center border rounded-lg overflow-hidden bg-bg-card border-border-default">
                      <button 
                        onClick={() => handleUpdateDOQty(item.productId, item.deliveryQty - 1)}
                        className="p-1.5 transition-colors hover:bg-bg-main text-text-muted"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input 
                        type="number"
                        className="w-14 text-xs font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent text-text-primary rounded-lg h-[44px]"
                        value={item.deliveryQty === 0 ? "" : item.deliveryQty}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            handleUpdateDOQty(item.productId, 0);
                          } else {
                            handleUpdateDOQty(item.productId, parseInt(val) || 0);
                          }
                        }}
                      />
                      <button 
                        onClick={() => handleUpdateDOQty(item.productId, item.deliveryQty + 1)}
                        className="p-1.5 transition-colors hover:bg-bg-main text-text-muted"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50 flex flex-col lg:flex-row-reverse gap-3 flex-shrink-0">
          <button 
            onClick={submitCreateDO}
            disabled={isCreatingDO}
            className="w-full lg:w-auto lg:flex-1 min-h-[44px] bg-brand-primary text-text-inverse font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all flex items-center justify-center rounded-full px-7 py-[14px] text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {isCreatingDO ? (
              <div className="w-5 h-5 border-2 border-text-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Package className="w-4 h-4 mr-2" />
            )}
            {driverName.trim() !== "" || vehiclePlate.trim() !== "" ? "Buat Surat Jalan (DO)" : "Konfirmasi Ambil Titipan"}
          </button>
          <button 
            onClick={() => setActiveModal("history")}
            className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border border-border-default text-text-secondary rounded-xl font-bold text-sm hover:bg-bg-main transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
