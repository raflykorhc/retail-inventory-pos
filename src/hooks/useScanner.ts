import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseScannerProps {
  onScan: (decodedText: string) => void;
}

export interface CameraDevice {
  id: string;
  label: string;
}

export function useScanner({ onScan }: UseScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const isCleaningUp = useRef(false);
  
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  // Hardware Scanner (HID Keyboard Mode)
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentTime = new Date().getTime();
      
      // If time between keystrokes is more than 200ms, it's probably human typing
      // Wireless/mobile scanners can have higher latency between keystrokes
      if (currentTime - lastKeyTime.current > 200) {
        barcodeBuffer.current = '';
      }
      
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent accidental form submissions
        if (barcodeBuffer.current.length > 0) {
          onScan(barcodeBuffer.current);
          barcodeBuffer.current = '';
          if (timeout) clearTimeout(timeout);
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;

        // Debounce: Fallback in case scanner doesn't send an 'Enter' key at the end
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
           // Assume it's a barcode if it has at least 4 characters and buffer stopped filling
          if (barcodeBuffer.current.length > 3) {
            onScan(barcodeBuffer.current);
            barcodeBuffer.current = '';
          }
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, [onScan]);

  // Fetch available cameras
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
      }
    }).catch(err => {
      console.warn("Error getting cameras", err);
    });
  }, []);

  // Mobile Camera Scanner
  const startCameraScan = useCallback(async (elementId: string, cameraId?: string) => {
    if (isCleaningUp.current) return;
    
    // Stop existing scanner if running
    if (scannerRef.current && scannerRef.current.isScanning) {
      await stopCameraScan();
    }

    if (!document.getElementById(elementId)) {
      console.error(`HTML Element with id=${elementId} not found`);
      return;
    }

    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    try {
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      const cameraRequest = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" };
      
      await scanner.start(
        cameraRequest,
        config,
        (decodedText) => {
          onScan(decodedText);
        },
        (errorMessage) => {
          // ignore scan errors (they happen every frame that doesn't have a barcode)
        }
      );
      
      setIsScanning(true);
      if (cameraId) setActiveCameraId(cameraId);
    } catch (e) {
      console.error("Failed to start scanner", e);
      setIsScanning(false);
    }

  }, [onScan]);

  const stopCameraScan = useCallback(async () => {
    if (scannerRef.current && !isCleaningUp.current && scannerRef.current.isScanning) {
      isCleaningUp.current = true;
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.error('Scanner stop error:', e);
      } finally {
        setIsScanning(false);
        isCleaningUp.current = false;
        scannerRef.current = null;
      }
    }
  }, []);

  return {
    cameras,
    isScanning,
    activeCameraId,
    startCameraScan,
    stopCameraScan,
    pause: useCallback(() => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.pause();
      }
    }, []),
    resume: useCallback(() => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.resume();
      }
    }, [])
  };
}
