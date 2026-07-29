import net from "net";
import { ApiError } from "../utils/ApiError.ts";

export class PrintService {
  /**
   * Logic to send data to ESC/POS thermal printer via network (TCP/IP)
   */
  static async sendToPrinter(ip: string, port: number = 9100, data: string | Buffer) {
    if (!ip) throw new ApiError(400, "IP Address printer wajib diisi");

    return new Promise((resolve, reject) => {
      console.log(`[PRINT] Menghubungkan ke ${ip}:${port}`);
      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(port, ip, () => {
        const payload = typeof data === 'string' ? Buffer.from(data) : data;
        client.write(payload, () => {
          client.destroy();
          resolve({ success: true, message: "Data berhasil dikirim ke printer" });
        });
      });

      client.on('error', (err) => {
        console.error("Printer Error:", err);
        client.destroy();
        reject(new ApiError(500, `Gagal terhubung ke printer: ${err.message}`));
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new ApiError(500, "Koneksi ke printer timeout (IP tidak ditemukan atau port tertutup)"));
      });
    });
  }

  /**
   * Helper to format Thermal Receipt (Optional logic can be added here)
   */
  static formatReceipt(content: any) {
    // Basic ESC/POS formatting could reside here
    return content;
  }
}
