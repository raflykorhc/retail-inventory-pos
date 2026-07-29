import fs from "fs";
import path from "path";
import { InventoryOptimizationService } from "./InventoryOptimizationService.ts";

const CONFIG_DIR = path.join(process.cwd(), "server", "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "optimization-status.json");

interface SchedulerStatus {
  lastAutoRun: string | null;
  lastManualRun: string | null;
}

export class SchedulerService {
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Mengambil status update terakhir (auto & manual)
   */
  static getStatus(): SchedulerStatus {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        this.initializeConfigFile();
      }
      const rawData = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(rawData);
    } catch (error) {
      console.error("[Scheduler] Gagal membaca status optimasi:", error);
      return { lastAutoRun: null, lastManualRun: null };
    }
  }

  /**
   * Memperbarui stempel waktu eksekusi
   */
  static updateStatus(type: "auto" | "manual"): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      const currentStatus = this.getStatus();
      const updatedStatus = {
        ...currentStatus,
        [type === "auto" ? "lastAutoRun" : "lastManualRun"]: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedStatus, null, 2), "utf-8");
      console.log(`[Scheduler] Berhasil memperbarui status ${type} ke:`, updatedStatus);
    } catch (error) {
      console.error("[Scheduler] Gagal memperbarui status optimasi:", error);
    }
  }

  /**
   * Inisialisasi berkas konfigurasi default jika belum ada
   */
  private static initializeConfigFile(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      const defaultStatus: SchedulerStatus = { lastAutoRun: null, lastManualRun: null };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultStatus, null, 2), "utf-8");
    } catch (error) {
      console.error("[Scheduler] Gagal membuat file konfigurasi default:", error);
    }
  }

  /**
   * Inisialisasi scheduler saat booting server
   */
  static initScheduler(): void {
    console.log("[Scheduler] Menginisialisasi Penjadwal Hybrid Optimasi Stok...");
    this.scheduleNextRun();
  }

  /**
   * Menghitung dan menjadwalkan eksekusi mingguan pada hari Minggu jam 23:00
   */
  private static scheduleNextRun(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    const now = new Date();
    const nextRun = new Date();
    
    // Set ke hari Minggu berikutnya (Sunday = 0)
    const currentDay = now.getDay();
    const daysUntilSunday = (7 - currentDay) % 7;
    
    nextRun.setDate(now.getDate() + daysUntilSunday);
    nextRun.setHours(23, 0, 0, 0);

    // Jika target waktu ternyata sudah terlewat untuk hari Minggu ini, majukan 1 minggu berikutnya
    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setDate(nextRun.getDate() + 7);
    }

    const delayMs = nextRun.getTime() - now.getTime();
    console.log(`[Scheduler] Optimasi otomatis berikutnya dijadwalkan pada: ${nextRun.toLocaleString("id-ID")}`);
    
    this.timerId = setTimeout(async () => {
      console.log("[Scheduler] Memulai eksekusi optimasi stok mingguan otomatis...");
      try {
        // Hitung optimasi dengan parameter default (3 bulan, 80% A, 95% B, 14 hari)
        const optimizations = await InventoryOptimizationService.calculateOptimization(3, 80, 95, 14);
        
        // Filter hanya yang memiliki perubahan rekomendasi (hasChanged = true)
        const changedOptimizations = optimizations
          .filter(opt => opt.hasChanged)
          .map(opt => ({
            productId: opt.productId,
            newAbcCategory: opt.newAbcCategory,
            suggestedMin: opt.suggestedMin,
            suggestedMax: opt.suggestedMax
          }));

        if (changedOptimizations.length > 0) {
          console.log(`[Scheduler] Menemukan ${changedOptimizations.length} produk dengan perubahan rekomendasi. Menerapkan ke DB...`);
          const result = await InventoryOptimizationService.applyOptimization(changedOptimizations, true);
          console.log(`[Scheduler] Sukses menerapkan optimasi pada ${result.updatedCount} produk.`);
        } else {
          console.log("[Scheduler] Tidak ada perubahan rekomendasi produk yang perlu diterapkan.");
        }

        // Simpan waktu pembaruan
        this.updateStatus("auto");
      } catch (error) {
        console.error("[Scheduler] Terjadi kesalahan dalam eksekusi otomatis:", error);
      } finally {
        // Jadwalkan ulang untuk minggu berikutnya
        this.scheduleNextRun();
      }
    }, delayMs);
  }
}
