import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

interface DashboardLayout {
  showMetrics: boolean;
  showSalesTrend: boolean;
  showTopProducts: boolean;
  showExpenses: boolean;
  showBadDebts: boolean;
}

interface POSLayout {
  viewMode: "grid" | "list";
  showImages: boolean;
  compactCart: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  dashboardLayout: DashboardLayout;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => void;
  posLayout: POSLayout;
  updatePOSLayout: (layout: Partial<POSLayout>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("light");
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>({
    showMetrics: true,
    showSalesTrend: true,
    showTopProducts: true,
    showExpenses: true,
    showBadDebts: true,
  });
  const [posLayout, setPOSLayout] = useState<POSLayout>({
    viewMode: "grid",
    showImages: true,
    compactCart: false,
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    }

    const savedLayout = localStorage.getItem("dashboardLayout");
    if (savedLayout) {
      setDashboardLayout(JSON.parse(savedLayout));
    }

    const savedPOSLayout = localStorage.getItem("posLayout");
    if (savedPOSLayout) {
      setPOSLayout(JSON.parse(savedPOSLayout));
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    // 1. Tambahkan class pemblokir transisi agar tidak ada elemen yang "melompat"
    //    sebelum semua variabel CSS berganti sekaligus.
    document.documentElement.classList.add("no-theme-transition");

    // 2. Dalam frame yang sama, terapkan class .dark (atau hapus)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 3. Setelah browser me-recalculate style (1 frame), aktifkan kembali transisi.
    //    Semua elemen kini mulai transisi dari titik yang sama secara bersamaan.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-theme-transition");
      });
    });

    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const updateDashboardLayout = (newLayout: Partial<DashboardLayout>) => {
    const updated = { ...dashboardLayout, ...newLayout };
    setDashboardLayout(updated);
    localStorage.setItem("dashboardLayout", JSON.stringify(updated));
  };

  const updatePOSLayout = (newLayout: Partial<POSLayout>) => {
    const updated = { ...posLayout, ...newLayout };
    setPOSLayout(updated);
    localStorage.setItem("posLayout", JSON.stringify(updated));
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      toggleTheme, 
      dashboardLayout, 
      updateDashboardLayout,
      posLayout,
      updatePOSLayout
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
