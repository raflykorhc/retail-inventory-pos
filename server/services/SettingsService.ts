import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "server", "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "shop-settings.json");

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  shopEmail: string;
  shopPhone: string;
  shopLogo: string;
  defaultSignee: string;
  bankAccountInfo: string;
  abcLimitA: number;
  abcLimitB: number;
  defaultHoldingInterval: number;
  defaultLeadTime: number;
  defaultSafetyStockDays: number;
}

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "PD SUKSES BANGUNAN",
  shopAddress: "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
  shopEmail: "pdsuksesbngunan@gmail.com",
  shopPhone: "081234567890",
  shopLogo: "/logo.png",
  defaultSignee: "Umar Sajjaad",
  bankAccountInfo: "BCA 2310576690 A/N: Umar Sajjaad",
  abcLimitA: 80,
  abcLimitB: 95,
  defaultHoldingInterval: 14,
  defaultLeadTime: 3,
  defaultSafetyStockDays: 1
};

export class SettingsService {
  static getSettings(): ShopSettings {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
        return DEFAULT_SETTINGS;
      }

      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (error) {
      console.error("[SettingsService] Failed to read settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(data: Partial<ShopSettings>, userId?: string): Promise<ShopSettings> {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      const current = await this.getSettings();
      const updated = { ...current, ...data };

      // Handle Logo base64 upload
      if (data.shopLogo && data.shopLogo.startsWith("data:image/")) {
        const matches = data.shopLogo.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          const uploadsDir = path.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const filename = `shop-logo-${Date.now()}.${extension}`;
          const filepath = path.join(uploadsDir, filename);

          fs.writeFileSync(filepath, buffer);
          updated.shopLogo = `/uploads/${filename}`;
        }
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
      
      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_SETTINGS",
          entity: "Settings",
          entityId: "shop-settings",
          details: { keys: Object.keys(data) }
        });
      }

      return updated;
    } catch (error) {
      console.error("[SettingsService] Failed to save settings:", error);
      throw new Error("Gagal menyimpan pengaturan.");
    }
  }
}
