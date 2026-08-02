import { create } from 'zustand';

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  shopEmail: string;
  shopPhone: string;
  shopLogo: string;
  defaultSignee: string;
  bankAccountInfo: string;
}

interface SettingsState {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
  updateSettings: (partial: Partial<ShopSettings>) => void;
  fetchSettings: () => Promise<void>;
}

const defaultSettings: ShopSettings = {
  shopName: "PD SUKSES BANGUNAN",
  shopAddress: "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
  shopEmail: "pdsuksesbngunan@gmail.com",
  shopPhone: "081234567890",
  shopLogo: "/logo.png",
  defaultSignee: "Umar Sajjaad",
  bankAccountInfo: "BCA 2310576690 A/N: Umar Sajjaad"
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  setSettings: (settings) => set({ settings }),
  updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
  fetchSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          settings: { ...state.settings, ...data }
        }));
      }
    } catch (err) {
      console.error("Failed to load shop settings:", err);
    }
  }
}));
