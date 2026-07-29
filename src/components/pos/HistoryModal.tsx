import React, { useState, useEffect } from "react";
import { X, History, ChevronDown, Package } from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useCartStore } from "../../store/useCartStore";

export const HistoryModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    setSelectedSaleForDO,
    setDoItems
  } = useCartStore();

  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"today" | "pending">("today");
  const historyLimit = 10;

  const isOpen = activeModal === "history";

  const fetchHistory = async (page = 1, mode = viewMode) => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const query = mode === "today" 
        ? `startDate=${today}&endDate=${today}&page=${page}&limit=${historyLimit}`
        : `hasPending=true&isDeliveryRequired=false&page=${page}&limit=${historyLimit}`;
      const response = await fetch(`/api/reports/sales?${query}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      setHistory(items);
      setHistoryTotal(data.total || 0);
      setHistoryPage(data.page || 1);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory(1, viewMode);
    }
  }, [isOpen, viewMode]);

  if (!isOpen) return null;

  const initiateCreateDO = (sale: any) => {
    setSelectedSaleForDO(sale);
    // Initialize doItems with pending quantities
    const initialItems = sale.items.map((item: any) => ({
      saleItemId: item.id,
      productId: item.productId,
      name: item.product?.name || "Produk",
      totalQty: item.quantity,
      deliveredQty: item.deliveredQuantity || 0,
      pickedUpQty: item.pickedUpQuantity || 0,
      inDeliveryQty: item.inDeliveryQuantity || 0,
      pendingQty: item.remainingQuantity || 0,
      takenQuantity: item.remainingQuantity || 0, // default to take all remaining
      unitName: item.unit?.name || "Unit"
    }));
    setDoItems(initialItems);
    setActiveModal("doModal");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
      <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
        {/* Drag Handle for Mobile */}
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
          <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
        </div>
        <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
          <h3 className="text-base lg:text-lg font-black text-text-inverse">
            {viewMode === "today" ? "Riwayat Transaksi Hari Ini" : "Daftar Barang Titipan"}
          </h3>
          <button onClick={() => setActiveModal(null)} className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 lg:mr-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 lg:w-6 h-6" />
          </button>
        </div>
        <div className="flex border-b border-border-subtle bg-bg-main shrink-0">
          <button
            onClick={() => setViewMode("today")}
            className={cn(
              "flex-1 py-3 text-xs lg:text-sm font-bold transition-colors border-b-2",
              viewMode === "today" 
                ? "border-brand-primary text-brand-primary" 
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-black/5"
            )}
          >
            Transaksi Hari Ini
          </button>
          <button
            onClick={() => setViewMode("pending")}
            className={cn(
              "flex-1 py-3 text-xs lg:text-sm font-bold transition-colors border-b-2",
              viewMode === "pending" 
                ? "border-brand-primary text-brand-primary" 
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-black/5"
            )}
          >
            Menunggu Pengambilan
          </button>
        </div>
        <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Memuat Riwayat...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-main">
                  <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Waktu</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {Array.isArray(history) && history.length > 0 ? (
                  history.map((h) => (
                    <tr 
                      key={h.id} 
                      className="transition-colors hover:bg-bg-main/50 cursor-pointer"
                      onClick={() => setSelectedTransaction(h)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{h.invoiceNumber}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-bold text-text-primary">{h.customer?.name || "Umum"}</td>
                      <td className="px-4 py-3 text-xs font-black text-right text-text-primary">
                        <div>{formatCurrency(Number(h.totalAmount))}</div>
                        {h.paymentMethod && h.paymentMethod.startsWith("SPLIT:") && (
                          <div className="text-[8px] font-bold text-brand-primary uppercase tracking-tighter mt-0.5">Split</div>
                        )}
                        {h.returns && h.returns.length > 0 && (
                          <div className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center justify-end w-max ml-auto mt-1 uppercase tracking-tighter">
                            <History className="w-2.5 h-2.5 mr-1" /> Retur
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          {(() => {
                            const hasPending = h.items?.some((i: any) => (i.pendingQuantity || 0) > 0);
                            return (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiateCreateDO(h);
                                }}
                                disabled={!hasPending}
                                className={cn(
                                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center mx-auto",
                                  !hasPending 
                                    ? "bg-status-success/10 text-status-success cursor-not-allowed"
                                    : "bg-brand-light text-brand-primary hover:bg-brand-primary hover:text-text-inverse"
                                )}
                              >
                                <Package className="w-3.5 h-3.5 mr-1.5" />
                                {!hasPending ? "Tuntas" : "Ambil Titipan"}
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-bold">Belum ada transaksi hari ini</p>
                      <p className="text-[10px]">Transaksi yang Anda buat hari ini akan muncul di sini.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && historyTotal > historyLimit && (
          <div className="p-4 border-t border-border-subtle bg-bg-main/30 flex items-center justify-between flex-shrink-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Menampilkan {(historyPage - 1) * historyLimit + 1} - {Math.min(historyPage * historyLimit, historyTotal)} dari {historyTotal} transaksi
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => fetchHistory(historyPage - 1)}
                disabled={historyPage === 1}
                className="p-2 border rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-border-default text-text-secondary"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <div className="text-xs font-black text-text-primary px-2">
                {historyPage}
              </div>
              <button 
                onClick={() => fetchHistory(historyPage + 1)}
                disabled={historyPage * historyLimit >= historyTotal}
                className="p-2 border rounded-lg hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-border-default text-text-secondary"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Transaction Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl shadow-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Transaksi</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-0.5">{selectedTransaction.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 lg:mr-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Informasi Pelanggan</h4>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle">
                  <p className="text-sm font-bold text-text-primary">{selectedTransaction.customer?.name || "Umum"}</p>
                  <p className="text-[10px] font-medium text-text-muted mt-1">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daftar Barang</h4>
                <div className="flex flex-col space-y-3">
                  {selectedTransaction.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-bg-main p-3.5 rounded-xl border border-border-subtle flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <p className="font-bold text-text-primary text-sm">{item.product?.name || "Barang"}</p>
                        </div>
                        <p className="font-black text-text-primary text-sm whitespace-nowrap">{formatCurrency(item.quantity * Number(item.priceAtSale))}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-text-muted font-medium pt-2 border-t border-border-subtle">
                        <span>{item.quantity} {item.unit?.name || ""}</span>
                        <span>x {formatCurrency(Number(item.priceAtSale))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-text-muted">Total Pembayaran</p>
                  <p className="text-lg font-black text-brand-primary">{formatCurrency(Number(selectedTransaction.totalAmount))}</p>
                </div>
                {(() => {
                  const totalReturn = selectedTransaction.returns?.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0) || 0;
                  if (totalReturn > 0) {
                    return (
                      <div className="mt-2 p-2.5 bg-status-danger/10 border border-status-danger/20 rounded-lg">
                        <p className="text-[10px] font-bold text-status-danger mb-0.5">Informasi Retur</p>
                        <p className="text-[10px] text-status-danger/80 leading-tight">Transaksi ini memiliki retur senilai <span className="font-bold">{formatCurrency(totalReturn)}</span> yang memotong laporan kas pada hari saat retur diproses.</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
