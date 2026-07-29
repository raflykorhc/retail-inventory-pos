import React, { useState, useEffect } from 'react';
import { X, Printer, Wifi, Bluetooth, Usb, Save } from 'lucide-react';
import { PrinterService, PrinterSettings, PrinterConnectionType } from '../services/printerService';
import { cn } from '../lib/utils';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterSettingsModal({ isOpen, onClose }: PrinterSettingsModalProps) {
  const [type, setType] = useState<PrinterConnectionType>('USB');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('9100');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; name?: string }>({ connected: false });

  useEffect(() => {
    let bluetoothDevice: BluetoothDevice | null = null;
    let isActive = true;

    if (isOpen) {
      const settingsStr = localStorage.getItem('printerSettings');
      if (settingsStr) {
        const settings: PrinterSettings = JSON.parse(settingsStr);
        setType(settings.type);
        if (settings.ipAddress) setIpAddress(settings.ipAddress);
        if (settings.port) setPort(settings.port.toString());
      }
      setStatus(null);
      checkStatus();

      // USB Auto-Disconnect Listener
      const handleUsbDisconnect = () => {
        if (!isActive) return;
        console.log("USB Device disconnected instantly");
        setConnectionStatus({ connected: false });
      };

      if (PrinterService.isUSBSupported()) {
        navigator.usb.addEventListener('disconnect', handleUsbDisconnect);
      }

      // Bluetooth Auto-Disconnect Listener
      const setupBluetoothListener = async () => {
        if (!PrinterService.isBluetoothSupported()) return;
        
        try {
          if (typeof (navigator.bluetooth as any).getDevices === 'function') {
            const devices = await (navigator.bluetooth as any).getDevices();
            if (devices.length > 0) {
              bluetoothDevice = devices[0];
              bluetoothDevice?.addEventListener('gattserverdisconnected', () => {
                if (isActive) {
                  console.log("Bluetooth GATT server disconnected instantly");
                  setConnectionStatus({ connected: false });
                }
              });
            }
          }
        } catch (e) {
          console.warn("Could not set up bluetooth disconnect listener", e);
        }
      };

      setupBluetoothListener();

      return () => {
        isActive = false;
        if (PrinterService.isUSBSupported()) {
          navigator.usb.removeEventListener('disconnect', handleUsbDisconnect);
        }
        if (bluetoothDevice) {
           // We can't cleanly remove without the exact bound function reference, 
           // but isActive = false will prevent UI updates on unmounted component.
        }
      }
    }
  }, [isOpen]);

  const checkStatus = async () => {
    const status = await PrinterService.checkConnectionStatus();
    setConnectionStatus(status);
  };

  if (!isOpen) return null;

  const handleConnect = async () => {
    setStatus({ type: 'info', message: 'Mencoba menghubungkan...' });
    try {
      if (type === 'USB') {
        const device = await PrinterService.requestUSBDevice();
        setStatus({ type: 'success', message: `Terhubung ke: ${device.productName || 'Printer USB'}` });
      } else if (type === 'BLUETOOTH') {
        const device = await PrinterService.requestBluetoothDevice();
        setStatus({ type: 'success', message: `Terhubung ke: ${device.name || 'Printer Bluetooth'}` });
      }
      
      // Save settings so checkStatus can read it
      PrinterService.saveSettings({
        type,
        ipAddress: type === 'WIFI' ? ipAddress : undefined,
        port: type === 'WIFI' ? parseInt(port) : undefined
      });
      
      checkStatus();
    } catch (error: any) {
      console.error('Connection Error:', error);
      
      const errorMsg = error.message || '';
      const errorName = error.name || '';

      // Handle cancellation
      if (errorName === 'NotFoundError' || errorMsg.includes('No device selected') || errorMsg.includes('User cancelled')) {
        setStatus({ type: 'info', message: 'Pencarian perangkat dibatalkan.' });
        return;
      }

      // Handle Bluetooth disabled
      if (errorMsg.includes('globally disabled') || errorMsg.includes('Bluetooth adapter not available')) {
        setStatus({ 
          type: 'error', 
          message: 'Bluetooth tidak tersedia atau dinonaktifkan. Pastikan Bluetooth aktif dan browser memiliki izin.' 
        });
        return;
      }

      setStatus({ type: 'error', message: errorMsg || 'Gagal menghubungkan perangkat. Pastikan izin diberikan.' });
    }
  };

  const isSupported = type === 'USB' ? PrinterService.isUSBSupported() : 
                     type === 'BLUETOOTH' ? PrinterService.isBluetoothSupported() : true;

  const handleTestPrint = async () => {
    setStatus({ type: 'info', message: 'Mengirim perintah cetak...' });
    try {
      // Temporarily save current modal state to test
      PrinterService.saveSettings({
        type,
        ipAddress: type === 'WIFI' ? ipAddress : undefined,
        port: type === 'WIFI' ? parseInt(port) : undefined
      });

      if (type === 'WIFI') {
        if (!ipAddress) {
          setStatus({ type: 'error', message: 'Alamat IP harus diisi untuk tes cetak Wi-Fi.' });
          return;
        }
      }

      await PrinterService.printReceipt({ test: true });
      setStatus({ type: 'success', message: 'Cetak tes berhasil!' });
      checkStatus();
    } catch (error: any) {
      console.error('Test Print Error:', error);
      
      let errorMsg = error instanceof Error ? error.message : 'Gagal mencetak tes';
      
      if (errorMsg.includes('IP Address is required')) {
        errorMsg = 'Alamat IP belum diatur. Silakan isi IP Address dan simpan terlebih dahulu.';
      } else if (errorMsg.includes('fetch')) {
        errorMsg = 'Gagal menghubungi server print. Pastikan koneksi internet aktif.';
      }

      setStatus({ type: 'error', message: errorMsg });
    }
  };

  const handleSave = () => {
    PrinterService.saveSettings({
      type,
      ipAddress: type === 'WIFI' ? ipAddress : undefined,
      port: type === 'WIFI' ? parseInt(port) : undefined
    });
    setStatus({ type: 'success', message: 'Pengaturan disimpan!' });
    setTimeout(onClose, 1000);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className={cn(
        "relative bg-bg-card w-full max-w-md shadow-2xl overflow-hidden transition-all duration-500 ease-out",
        "rounded-t-[2rem] sm:rounded-3xl", // Bottom sheet on mobile, rounded on desktop
        isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-full sm:translate-y-4 sm:scale-95 sm:opacity-0"
      )}>
        {/* Mobile Handle indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 bg-bg-main">
          <div className="w-12 h-1.5 bg-border-strong/50 rounded-full" />
        </div>

        <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-main">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-light rounded-[24px]">
              <Printer className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary">Pengaturan Printer</h2>
              <div className="flex items-center space-x-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full", 
                  connectionStatus.connected ? "bg-status-success animate-pulse" : "bg-status-warning"
                )} />
                <span className="text-xs font-medium text-text-secondary">
                  {connectionStatus.connected ? connectionStatus.name : 'Terputus'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-card rounded-full transition-colors text-text-muted hidden sm:block active:scale-95 transition-transform">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-h-[80vh] sm:max-h-[70vh]">
          {status && (
            <div className={cn(
              "p-4 rounded-xl text-xs font-bold animate-in fade-in zoom-in duration-300",
              status.type === 'success' ? "bg-status-success/10 text-status-success border border-status-success/20" :
              status.type === 'error' ? "bg-status-danger/10 text-status-danger border border-status-danger/20" :
              "bg-brand-light text-brand-primary border border-brand-primary/20"
            )}>
              {status.message}
            </div>
          )}

          {!isSupported && (
            <div className="p-4 bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-[24px] text-[10px] font-bold">
              Browser Anda tidak mendukung koneksi {type} secara langsung. 
              Gunakan Google Chrome atau Microsoft Edge versi terbaru.
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-secondary">Tipe Koneksi</label>
            <div className="grid grid-cols-3 gap-3">
              {(['USB', 'BLUETOOTH', 'WIFI'] as const).map((method) => {
                const Icon = method === 'USB' ? Usb : method === 'BLUETOOTH' ? Bluetooth : Wifi;
                return (
                  <button
                    key={method}
                    onClick={() => { setType(method); setStatus(null); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all active:scale-95 ${
                      type === method ? 'border-brand-primary bg-brand-light text-brand-primary' : 'border-border-default text-text-muted hover:bg-bg-main'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-bold">{method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {(type === 'USB' || type === 'BLUETOOTH') && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={handleConnect}
                disabled={!isSupported}
                className={cn(
                  "w-full p-5 border-2 border-dashed rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98]",
                  !isSupported 
                    ? "border-border-default text-text-muted cursor-not-allowed opacity-50" 
                    : "border-border-default text-text-secondary hover:border-brand-primary hover:text-brand-primary hover:bg-brand-light"
                )}
              >
                {type === 'USB' ? <Usb className="w-5 h-5" /> : <Bluetooth className="w-5 h-5" />}
                <span className="font-bold">Hubungkan {type}</span>
              </button>
            </div>
          )}

          {type === 'WIFI' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-widest text-[10px]">IP Address</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full p-4 border border-border-default rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-bg-main text-text-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-widest text-[10px]">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="9100"
                  className="w-full p-4 border border-border-default rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-bg-main text-text-primary outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleTestPrint}
            className="w-full bg-bg-main border border-border-default text-text-secondary font-bold hover:bg-bg-card transition-all flex items-center justify-center space-x-2 active:scale-95 rounded-full px-6 py-[12px] text-[14px] font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk Percobaan</span>
          </button>
        </div>

        <div className="p-6 border-t border-border-subtle bg-bg-main flex justify-end">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto bg-brand-primary text-text-inverse font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-95 transition-all rounded-full px-7 py-[14px] text-[14px] font-bold"
          >
            <Save className="w-6 h-6" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
