import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Camera, CheckCircle2, Check } from 'lucide-react';
import { useScanner } from '../hooks/useScanner';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  lastScannedItem?: string | null;
}

export function ScannerModal({ isOpen, onClose, onScan, lastScannedItem }: ScannerModalProps) {
  const [feedback, setFeedback] = useState<{ show: boolean, name: string }>({ show: false, name: '' });
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio beep failed", e);
    }
  }, []);

  const { cameras, isScanning, activeCameraId, startCameraScan, stopCameraScan, pause, resume } = useScanner({
    onScan: (text) => {
      // 1. Trigger the actual scan logic in parent
      onScan(text);
      
      // 2. Continuous scan logic
      pause();
      playBeep();
      
      // Note: we'll use a local state or the prop to show feedback
      // Since lastScannedItem comes from parent after onScan, it's better to manage local feedback name
      setFeedback({ show: true, name: 'Barang' }); 
      
      // 3. Auto resume after 1.5s delay
      setTimeout(() => {
        resume();
        setFeedback(prev => ({ ...prev, show: false }));
      }, 1500);
    }
  });

  // Sync feedback name with lastScannedItem if available
  useEffect(() => {
    if (lastScannedItem) {
      setFeedback(prev => ({ ...prev, name: lastScannedItem }));
    }
  }, [lastScannedItem]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      // Delay camera initialization until AFTER the entrance animation completes
      // to prevent severe lag spikes during the slide-up transition
      timeoutId = setTimeout(() => {
        startCameraScan('reader');
      }, 400);
    } else {
      stopCameraScan();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Let the parent handle unmount closures properly if isOpen was true initially
    };
  }, [isOpen]);

  // Make sure we stop when entirely unmounted
  useEffect(() => {
     return () => { stopCameraScan() };
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4 transition-opacity duration-300 ease-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className={`bg-bg-card w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu border border-border-subtle relative flex flex-col max-h-[92vh] md:max-h-none ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-full scale-100 md:translate-y-12 md:scale-90'
        }`}
      >
        {/* Mobile Drag Indicator */}
        <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border-strong rounded-full opacity-40"></div>

        {/* Header */}
        <div className="p-8 pt-8 md:pt-6 border-b border-border-subtle flex justify-between items-center bg-bg-card flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-light rounded-[32px]">
              <div className="w-5 h-5 border-2 border-brand-primary rounded-sm relative overflow-hidden">
                <div className="absolute inset-x-0 h-0.5 bg-brand-primary top-1/2 -translate-y-1/2 animate-bounce" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary tracking-tight">Scan Barcode</h2>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted mt-0.5">Hardware / Camera Mode</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-bg-main transition-all active:scale-90 text-text-muted border border-transparent hover:border-border-default rounded-full px-6 py-[12px] text-[14px] font-bold"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-6 bg-bg-card space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Camera Selection Dropdown */}
          {cameras.length > 1 && (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <select 
                value={activeCameraId || ''} 
                onChange={(e) => {
                  /* Clear current scanner before starting a new one with specific camera */
                  startCameraScan('reader', e.target.value);
                }}
                className="w-full bg-bg-main text-text-secondary px-4 py-3.5 rounded-2xl border border-border-subtle text-xs font-bold outline-none appearance-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 transition-all cursor-pointer pl-10"
              >
                {!activeCameraId && <option value="" disabled>Pilih Kamera...</option>}
                {cameras.map(cam => (
                   <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.substring(0, 5)}`}</option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <Camera className="w-4 h-4" />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          )}

          <div className="relative aspect-square w-full bg-black rounded-[2rem] overflow-hidden border-4 border-black shadow-inner group">
            <div id="reader" className="w-full h-full"></div>
            
            {/* Overlay UI */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none z-10 transition-opacity">
                {/* Visual Feedback Badge (Floating Alert) */}
                {feedback.show && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-in zoom-in fade-in duration-300 pointer-events-auto">
                    <div className="bg-brand-light border border-brand-primary/20 px-6 py-4 rounded-[32px] flex flex-col items-center space-y-2 backdrop-blur-md">
                      <div className="w-10 h-10 bg-brand-primary text-text-inverse rounded-full flex items-center justify-center">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-0.5">Success</p>
                        <p className="text-sm font-bold text-text-primary whitespace-nowrap">{feedback.name} - Berhasil Ditambahkan!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Scan Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent blur-sm animate-[scan_3s_ease-in-out_infinite] opacity-60" />
                
                {/* Scanner Corners */}
                <div className="absolute top-8 left-8 w-12 h-12 border-l-4 border-t-4 border-brand-primary rounded-tl-2xl opacity-80" />
                <div className="absolute top-8 right-8 w-12 h-12 border-r-4 border-t-4 border-brand-primary rounded-tr-2xl opacity-80" />
                <div className="absolute bottom-8 left-8 w-12 h-12 border-l-4 border-b-4 border-brand-primary rounded-bl-2xl opacity-80" />
                <div className="absolute bottom-8 right-8 w-12 h-12 border-r-4 border-b-4 border-brand-primary rounded-br-2xl opacity-80" />
              </div>
            )}
            
            {isScanning && (
              <div className="absolute bottom-6 inset-x-0 text-center z-20">
                <span className="px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10">
                  Align code within corners
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex flex-col items-center text-center space-y-6">
            <p className="text-xs font-medium text-text-secondary max-w-[80%]">
              Arahkan kamera ke barcode produk. Pastikan cahaya cukup dan kode tidak terpotong.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className={`flex items-center justify-center space-x-2 text-[10px] font-black px-3 py-3 rounded-2xl uppercase transition-all bg-bg-main border border-border-default ${isScanning ? 'text-brand-primary' : 'text-text-muted'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-brand-primary animate-pulse' : 'bg-status-warning'}`} />
                <span>{isScanning ? 'Camera Active' : 'Initializing...'}</span>
              </div>
              
              <button 
                onClick={onClose}
                className="h-full bg-brand-primary text-text-inverse font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 flex items-center justify-center space-x-2 rounded-full px-7 py-[14px] text-[14px] font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  );
}
