import EscPosEncoder from 'esc-pos-encoder';
import { useSettingsStore } from '../store/useSettingsStore';

export type PrinterConnectionType = 'USB' | 'BLUETOOTH' | 'WIFI';

export interface PrinterSettings {
  type: PrinterConnectionType;
  ipAddress?: string;
  port?: number;
}

export class PrinterService {
  private static getSettings(): PrinterSettings | null {
    if (typeof window === 'undefined') return null;
    const settings = localStorage.getItem('printerSettings');
    return settings ? JSON.parse(settings) : null;
  }

  public static saveSettings(settings: PrinterSettings) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('printerSettings', JSON.stringify(settings));
  }

  public static isUSBSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.usb;
  }

  public static isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  public static async requestUSBDevice(): Promise<USBDevice> {
    if (!this.isUSBSupported()) {
      throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }
    return await navigator.usb.requestDevice({ filters: [] });
  }

  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }
    return await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });
  }

  public static async checkConnectionStatus(): Promise<{ connected: boolean; name?: string }> {
    const settings = this.getSettings();
    if (!settings) return { connected: false };

    try {
      if (settings.type === 'USB' && this.isUSBSupported()) {
        const devices = await navigator.usb.getDevices();
        if (devices.length > 0) {
          const device = devices[0];
          // Heartbeat check: Try to open and close to verify physical connection
          try {
            await device.open();
            await device.close();
            return { connected: true, name: device.productName || 'USB Printer' };
          } catch (e) {
            console.warn('USB Heartbeat failed:', e);
            return { connected: false };
          }
        }
      } else if (settings.type === 'BLUETOOTH' && this.isBluetoothSupported()) {
        if (typeof navigator.bluetooth.getAvailability === 'function') {
          const isAvailable = await navigator.bluetooth.getAvailability();
          if (!isAvailable) {
            return { connected: false };
          }
        }

        if (typeof (navigator.bluetooth as any).getDevices === 'function') {
          const devices = await (navigator.bluetooth as any).getDevices();
          if (devices.length > 0) {
            const device = devices[0];
            // Heartbeat check: Try to connect GATT
            try {
              if (!device.gatt?.connected) {
                // Set a timeout to prevent hanging if device is out of range
                const connectPromise = device.gatt?.connect();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
                await Promise.race([connectPromise, timeoutPromise]);
                device.gatt?.disconnect();
              }
              return { connected: true, name: device.name || 'Bluetooth Printer (Siap)' };
            } catch (e) {
              console.warn('Bluetooth Heartbeat failed:', e);
              return { connected: false };
            }
          }
        } else {
          return { connected: true, name: 'Bluetooth Printer (Tersimpan)' };
        }
      } else if (settings.type === 'WIFI') {
        if (settings.ipAddress) {
          // Note: Real Wi-Fi heartbeat would hit the local server API to ping the printer IP.
          return { connected: true, name: `Wi-Fi (${settings.ipAddress}:${settings.port || 9100})` };
        }
      }
    } catch (error) {
      console.error('Error checking printer status:', error);
    }
    
    return { connected: false };
  }

  public static async checkDotMatrixStatus(): Promise<{ connected: boolean; name?: string }> {
    if (!this.isUSBSupported()) return { connected: false };

    try {
      const devices = await navigator.usb.getDevices();
      // Epson Vendor ID is 0x04b8
      const lx310 = devices.find(d => d.vendorId === 0x04b8);
      
      if (lx310) {
        return { connected: true, name: lx310.productName || 'Epson LX Series' };
      }
      
      // Fallback: search for any "Epson" or "Dot Matrix" in name
      const genericDot = devices.find(d => 
        (d.productName?.toLowerCase().includes('epson') || 
         d.productName?.toLowerCase().includes('printer'))
      );
      
      if (genericDot) {
        return { connected: true, name: genericDot.productName || 'Dot Matrix Printer' };
      }
    } catch (error) {
      console.warn('Error checking Dot Matrix status:', error);
    }

    return { connected: false };
  }

  // --- TEMPLATE ENGINE ---
  private static generateTestReceipt(): Uint8Array {
    const encoder = new EscPosEncoder();
    return encoder
      .initialize()
      .codepage('cp858')
      .align('center')
      .bold(true)
      .text('PRINTER TEST\n')
      .bold(false)
      .text('--------------------------------\n')
      .text('Koneksi printer berhasil!\n')
      .text('Jika Anda bisa membaca ini,\n')
      .text('printer berfungsi normal.\n')
      .text('--------------------------------\n')
      .newline()
      .newline()
      .newline()
      .cut()
      .encode();
  }

  private static generateSalesReceipt(data: any): Uint8Array {
    const encoder = new EscPosEncoder();
    const settings = useSettingsStore.getState().settings;
    
    const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;
    
    let builder = encoder
      .initialize()
      .codepage('cp858')
      .align('center')
      .bold(true)
      .size('normal')
      .text(`${settings.shopName}\n`)
      .bold(false)
      .size('small')
      .text(`${settings.shopAddress.split(',')[0]}\n`)
      .size('normal')
      .text('--------------------------------\n')
      .align('left')
      .text(`Tgl : ${new Date().toLocaleString('id-ID')}\n`);
      

    builder = builder.text('--------------------------------\n');

    // Items
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const itemName = item.name || (item.product ? item.product.name : 'Item');
        const itemPrice = item.price || (item.product ? item.product.price : 0);
        
        const nameObj = itemName.length > 20 ? itemName.substring(0, 20) + '..' : itemName;
        builder = builder.text(`${nameObj}\n`);
        builder = builder.text(`  ${item.quantity} x ${formatCurrency(itemPrice)} = ${formatCurrency(item.quantity * itemPrice)}\n`);
      });
    }

    const dbTotal = data.totalAmount != null ? Number(data.totalAmount) : (data.total != null ? Number(data.total) : 0);
    const calculatedItemsTotal = data.items?.reduce((sum: number, item: any) => {
      return sum + (item.isBonus ? 0 : (Number(item.priceAtSale || item.price || (item.product ? item.product.price : 0)) * item.quantity));
    }, 0) || 0;
    const totalVal = (calculatedItemsTotal > 0 && dbTotal > calculatedItemsTotal) ? calculatedItemsTotal : dbTotal;
    const payMethod = data.paymentMethod || 'CASH';

    builder = builder
      .text('--------------------------------\n')
      .align('right')
      .bold(true)
      .text(`TOTAL : ${formatCurrency(totalVal)}\n`)
      .bold(false)
      .text(`METODE BAYAR : ${payMethod}\n`);
      
    if (payMethod === 'CASH' && data.amountPaid != null && Number(data.amountPaid) > 0) {
      builder = builder
        .text(`BAYAR : ${formatCurrency(Number(data.amountPaid))}\n`)
        .text(`KEMBALIAN : ${formatCurrency(Number(data.changeAmount || 0))}\n`);
    }
      
    builder = builder
      .newline()
      .align('center')
      .text('Terima Kasih\n')
      .text('Simpan struk ini sebagai bukti\n')
      .newline()
      .newline()
      .newline()
      .cut();

    return builder.encode();
  }

  public static async printReceipt(data: any): Promise<void> {
    const settings = this.getSettings();
    if (!settings) {
      throw new Error('Konfigurasi printer tidak ditemukan. Harap atur di Pengaturan Printer.');
    }

    // Heartbeat Check before printing
    const status = await this.checkConnectionStatus();
    if (!status.connected) {
       throw new Error('Koneksi Printer terputus atau tidak merespons (Heartbeat gagal). Periksa perangkat keras Anda.');
    }

    const payload = data.test ? this.generateTestReceipt() : this.generateSalesReceipt(data);

    switch (settings.type) {
      case 'USB':
        await this.printUSB(payload);
        break;
      case 'BLUETOOTH':
        await this.printBluetooth(payload);
        break;
      case 'WIFI':
        await this.printWifi(payload, settings.ipAddress, settings.port);
        break;
      default:
        throw new Error(`Metode koneksi printer '${settings.type}' tidak didukung.`);
    }
  }

  // --- DRIVERS ---
  private static async printUSB(data: Uint8Array) {
    if (!this.isUSBSupported()) {
      throw new Error('WebUSB tidak didukung di browser ini. Mohon gunakan browser Chrome atau Edge berbasis Chromium.');
    }

    let device: USBDevice | undefined;
    
    try {
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        device = devices[0];
      }
    } catch (ignore) {}

    if (!device) {
      throw new Error('Terdapat masalah koneksi. Tidak ada perangkat USB Printer yang berpasangan. Buka kembali pengaturan dan simpan koneksi.');
    }

    try {
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      
      const outEndpoint = device.configuration?.interfaces[0].alternate.endpoints.find(e => e.direction === 'out');
      const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

      await device.transferOut(endpointNumber, data);
      await device.close();
    } catch (error: any) {
      console.error('USB Print Error:', error);
      if (device?.opened) {
         try { await device.close(); } catch(e) {}
      }
      throw new Error(`Gagal mencetak via USB: ${error.message}`);
    }
  }

  private static async printBluetooth(data: Uint8Array) {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Mohon gunakan Chrome atau Edge.');
    }

    let device: BluetoothDevice | undefined;

    try {
      if (typeof (navigator.bluetooth as any).getDevices === 'function') {
        const devices = await (navigator.bluetooth as any).getDevices();
        if (devices.length > 0) {
          device = devices[0];
        }
      }
    } catch (ignore) {}

    if (!device) {
       throw new Error('Terdapat masalah koneksi. Tidak ada perangkat Bluetooth Printer yang berpasangan. Buka kembali pengaturan dan simpan koneksi.');
    }

    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Tidak dapat terhubung ke GATT server perangkat Bluetooth.');

      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Send data in chunks (Bluetooth LE has MTU limits, usually around 20-512 bytes)
      const CHUNK_SIZE = 256;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValue(chunk);
      }

      device.gatt?.disconnect();
    } catch (error: any) {
      console.error('Bluetooth Print Error:', error);
      if (device?.gatt?.connected) {
         try { device.gatt.disconnect(); } catch (e) {}
      }
      throw new Error(`Gagal mencetak via Bluetooth: ${error.message}`);
    }
  }

  private static async printWifi(data: Uint8Array, ip?: string, port: number = 9100) {
    if (!ip) throw new Error('IP Address wajib diisi untuk pencetakan Wi-Fi.');

    try {
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          port,
          data: Array.from(data)
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Terjadi kesalahan sistem saat menghubungi socket.');
      }
    } catch (error: any) {
      console.error('Wi-Fi Print Error:', error);
      throw new Error(`Gagal mencetak via Wi-Fi: ${error.message}`);
    }
  }
}

