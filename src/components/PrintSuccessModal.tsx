import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Printer, FileText, Monitor, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PrinterService } from '../services/printerService';
import { PrintableStruk } from './printing/PrintableStruk';
import { PrintableNota } from './printing/PrintableNota';
import { cn } from '../lib/utils';

interface PrintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: any;
}

export function PrintSuccessModal({ isOpen, onClose, saleData }: PrintSuccessModalProps) {
  const [printMode, setPrintMode] = useState<'STRUK' | 'NOTA'>('STRUK');
  const [thermalStatus, setThermalStatus] = useState<{ connected: boolean; name?: string }>({ connected: false });
  const [dotMatrixStatus, setDotMatrixStatus] = useState<{ connected: boolean; name?: string }>({ connected: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const notaRef = useRef<HTMLDivElement>(null);
  const handlePrintNota = useReactToPrint({
    contentRef: notaRef,
    documentTitle: `Nota_${saleData?.invoiceNumber || 'INV'}`,
  });

  const checkStatuses = async () => {
    setIsRefreshing(true);
    const [thermal, dot] = await Promise.all([
      PrinterService.checkConnectionStatus(),
      PrinterService.checkDotMatrixStatus()
    ]);
    setThermalStatus(thermal);
    setDotMatrixStatus(dot);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatuses();
      // Auto-refresh status every 5 seconds while modal is open
      const interval = setInterval(checkStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handlePrintThermal = async () => {
    try {
      await PrinterService.printReceipt(saleData);
    } catch (error: any) {
      console.error('Thermal Print Error:', error);
      alert(error.message || 'Gagal mencetak struk thermal');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-bg-modal w-full max-w-5xl h-[92vh] lg:h-[85vh] rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden overflow-y-auto flex flex-col lg:flex-row animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in duration-500 ease-out custom-scrollbar relative">
        
        {/* Mobile Header (Consistent with other Bottom Sheets) */}
        <div className="lg:hidden w-full flex flex-col sticky top-0 z-50">
          <div className="w-full flex justify-center pt-3 pb-1 bg-status-success rounded-t-3xl">
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
          </div>
          <div className="p-4 border-b border-border-subtle bg-status-success flex items-center justify-between">
            <h2 className="text-base font-black text-text-inverse">Transaksi Berhasil!</h2>
            <button 
              onClick={onClose} 
              className="text-text-inverse/60 hover:text-text-inverse transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Left: Actions & Status (40%) */}
        <div className="w-full lg:w-[400px] bg-bg-card border-b lg:border-b-0 lg:border-r border-border-default flex flex-col flex-shrink-0 lg:h-full relative z-20">
          {/* Desktop Header */}
          <div className="hidden lg:flex p-6 border-b border-border-subtle bg-status-success/5 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-status-success/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-status-success" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary leading-tight">Berhasil!</h2>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{saleData?.invoiceNumber}</p>
              </div>
            </div>
            <button 
              onClick={checkStatuses}
              className={cn("p-2 hover:bg-bg-main rounded-xl transition-all", isRefreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4 text-brand-primary" />
            </button>
          </div>
          
          {/* Mobile Status Header (Simplified) */}
          <div className="lg:hidden p-4 bg-status-success/5 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-status-success" />
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">{saleData?.invoiceNumber}</span>
            </div>
            <button 
              onClick={checkStatuses}
              className={cn("p-2 hover:bg-bg-main rounded-xl transition-all", isRefreshing && "animate-spin")}
            >
              <RefreshCw className="w-3 h-3 text-brand-primary" />
            </button>
          </div>

          <div className="flex-1 p-4 lg:p-6 space-y-5 lg:space-y-6 lg:overflow-y-auto custom-scrollbar">
            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Status Perangkat</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between transition-all",
                  thermalStatus.connected ? "bg-status-success/5 border-status-success/20" : "bg-bg-main border-border-default opacity-60"
                )}>
                  <div className="flex items-center space-x-3">
                    <Printer className={cn("w-5 h-5", thermalStatus.connected ? "text-status-success" : "text-text-muted")} />
                    <div>
                      <p className="text-xs font-black text-text-primary">Printer Struk</p>
                      <p className="text-[9px] font-bold text-text-muted truncate max-w-[150px]">
                        {thermalStatus.connected ? `${thermalStatus.name} (Thermal)` : 'Tidak ada perangkat terhubung'}
                      </p>
                    </div>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", thermalStatus.connected ? "bg-status-success animate-pulse" : "bg-status-danger")} />
                </div>

                <div className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between transition-all",
                  dotMatrixStatus.connected ? "bg-status-success/5 border-status-success/20" : "bg-bg-main border-border-default opacity-60"
                )}>
                  <div className="flex items-center space-x-3">
                    <Monitor className={cn("w-5 h-5", dotMatrixStatus.connected ? "text-status-success" : "text-text-muted")} />
                    <div>
                      <p className="text-xs font-black text-text-primary">Printer Nota</p>
                      <p className="text-[9px] font-bold text-text-muted">
                        {dotMatrixStatus.connected ? dotMatrixStatus.name : 'Ready (System Print)'}
                      </p>
                    </div>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", dotMatrixStatus.connected ? "bg-status-success animate-pulse" : "bg-status-warning")} />
                </div>
              </div>
            </div>

            {/* Print Options */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Opsi Pencetakan</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setPrintMode('STRUK');
                    handlePrintThermal();
                  }}
                  className="w-full group py-3 px-4 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm flex items-center justify-between shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Printer className="w-5 h-5" />
                    <span>Cetak Struk (80mm)</span>
                  </div>
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setPrintMode('NOTA');
                    // Small delay to ensure the DOM has updated and notaRef is visible if it was hidden
                    setTimeout(() => {
                      try {
                        if (notaRef.current) {
                          handlePrintNota();
                        } else {
                          console.error("Nota reference not found");
                          alert("Gagal mencetak: Konten pratinjau nota tidak ditemukan.");
                        }
                      } catch (err) {
                        console.error("Print Error:", err);
                        alert("Terjadi kesalahan sistem saat mencoba mencetak nota.");
                      }
                    }, 300);
                  }}
                  className="w-full group py-3 px-4 bg-white border border-brand-primary text-brand-primary rounded-xl font-bold text-sm flex items-center justify-between hover:bg-brand-light active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5" />
                    <span>Cetak Nota (A4/A5)</span>
                  </div>
                  <div className="w-6 h-6 bg-brand-primary/10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/95 backdrop-blur sticky bottom-0 z-30 lg:relative lg:bg-bg-main/50">
            <button 
              onClick={onClose}
              className="w-full .5 lg: bg-bg-main border border-border-default text-text-primary font-bold uppercase tracking-widest hover:bg-bg-card hover:border-border-strong active:scale-[0.98] shadow-sm transition-all rounded-full px-6 py-[12px] text-[14px] font-bold"
            >
              Selesai & Reset POS
            </button>
          </div>
        </div>

        {/* Right: Preview Area (60%) */}
        <div className="flex-1 bg-bg-main p-4 lg:p-8 flex flex-col min-h-[500px] lg:min-h-0 lg:h-full lg:overflow-hidden relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center">
              <Monitor className="w-5 h-5 mr-3 text-brand-primary" />
              Preview {printMode === 'STRUK' ? 'Struk Thermal' : 'Nota Penjualan'}
            </h3>
            <div className="flex bg-bg-card p-1 rounded-[24px] border border-border-default">
              <button 
                onClick={() => setPrintMode('STRUK')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                  printMode === 'STRUK' ? "bg-brand-primary text-text-inverse" : "text-text-muted hover:text-text-primary"
                )}
              >
                STRUK
              </button>
              <button 
                onClick={() => setPrintMode('NOTA')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                  printMode === 'NOTA' ? "bg-brand-primary text-text-inverse" : "text-text-muted hover:text-text-primary"
                )}
              >
                NOTA
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[32px] lg:rounded-[32px] shadow-inner border border-border-subtle overflow-x-auto lg:overflow-auto p-8 lg:p-8 flex justify-center items-start custom-scrollbar">
            <div className={cn(
              "transform-gpu transition-all duration-500 origin-top shadow-md lg:shadow-2xl bg-white",
              printMode === 'STRUK' ? "w-[80mm] scale-100" : "w-[210mm] scale-[0.6] sm:scale-[0.8] lg:scale-[0.8] origin-top-left sm:origin-top mx-auto"
            )}>
              <div className={cn(printMode === 'STRUK' ? "block" : "hidden")}>
                <PrintableStruk data={saleData} />
              </div>
              <div className={cn(printMode === 'NOTA' ? "block" : "hidden")}>
                <PrintableNota data={saleData} ref={notaRef} />
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-[10px] font-bold text-text-muted italic">
              *Tampilan preview mungkin sedikit berbeda dengan hasil cetak fisik tergantung pengaturan printer sistem.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
