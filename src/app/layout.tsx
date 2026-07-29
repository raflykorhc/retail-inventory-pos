import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Receipt, 
  Truck, 
  Settings as SettingsIcon, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  UserCircle,
  Database,
  FileText,
  Menu,
  X,
  Moon,
  Sun,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Image as ImageIcon,
  RotateCcw,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  Scan,
  Copy,
  Smartphone
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";
import { useAuthStore, Role } from "../store/useAuthStore";
import { Can } from "../components/auth/Can";
import { useCartStore } from "../store/useCartStore";
import { BottomNav } from "../components/layout/BottomNav";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  collapsed?: boolean;
}

const SidebarItem = ({ icon, label, to, collapsed }: SidebarItemProps) => (
  <NavLink
    to={to}
    title={collapsed ? label : undefined}
    className={({ isActive }) => cn(
      "flex items-center py-3 text-sm font-medium transition-all duration-200 rounded-lg group relative",
      collapsed ? "justify-center px-0 w-12 mx-auto" : "w-full px-4",
      isActive 
        ? "bg-brand-primary text-text-inverse shadow-md" 
        : "text-text-secondary hover:bg-bg-main hover:text-brand-primary"
    )}
  >
    {({ isActive }) => (
      <>
        <span className={cn(isActive ? "text-text-inverse" : "text-text-muted group-hover:text-brand-primary", !collapsed && "mr-3")}>
          {icon}
        </span>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0, width: 0 }} 
            animate={{ opacity: 1, width: "auto" }} 
            exit={{ opacity: 0, width: 0 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
        {!collapsed && isActive && <ChevronRight className="ml-auto w-4 h-4" />}
      </>
    )}
  </NavLink>
);

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { theme, setTheme, toggleTheme, dashboardLayout, updateDashboardLayout, posLayout, updatePOSLayout } = useTheme();
  const { user, logout } = useAuthStore();
  const { sessionId, setSessionId } = useCartStore();
  const navigate = useNavigate();

  // Shop configurations & profile states
  const [shopSettings, setShopSettings] = useState({
    shopName: "PD SUKSES BANGUNAN",
    shopAddress: "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
    shopEmail: "pdsuksesbngunan@gmail.com",
    shopPhone: "081234567890",
    shopLogo: "/logo.png",
    defaultSignee: "Umar Sajjaad"
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"visual" | "shop">("visual");

  // Fetch shop configurations on mount & when settings open
  const fetchSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setShopSettings({
          shopName: data.shopName || "PD SUKSES BANGUNAN",
          shopAddress: data.shopAddress || "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
          shopEmail: data.shopEmail || "pdsuksesbngunan@gmail.com",
          shopPhone: data.shopPhone || "081234567890",
          shopLogo: data.shopLogo || "/logo.png",
          defaultSignee: data.defaultSignee || "Umar Sajjaad"
        });
      })
      .catch((err) => {
        console.error("Failed to load shop settings:", err);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      fetchSettings();
    }
  }, [isSettingsOpen]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File terlalu besar", { description: "Ukuran logo maksimal 2MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopSettings(prev => ({ ...prev, shopLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setShopSettings({
          shopName: data.shopName || "",
          shopAddress: data.shopAddress || "",
          shopEmail: data.shopEmail || "",
          shopPhone: data.shopPhone || "",
          shopLogo: data.shopLogo || "",
          defaultSignee: data.defaultSignee || ""
        });
        toast.success("Pengaturan Tersimpan", { description: "Profil & branding toko berhasil diperbarui." });
        setIsSettingsOpen(false);
      } else {
        toast.error("Gagal menyimpan profil toko");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Terjadi kesalahan sistem saat menyimpan");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getActiveTitle = () => {
    const path = location.pathname;
    switch(path) {
      case "/": return "Kasir (POS)";
      case "/inventory": return "Manajemen Stok";
      case "/inventory/stock-in": return "Stok Masuk";
      case "/customers": return "Pelanggan";
      case "/expenses": return "Pengeluaran Operasional";
      case "/debts": return "Piutang & Hutang";
      case "/delivery": return "Pengiriman";
      case "/dashboard": return "Dashboard Analitik";
      case "/management": return "Manajemen Database";
      case "/reports": return "Laporan";
      case "/returns": return "Pengembalian Barang";
      case "/projects": return "Manajemen Proyek";
      default: return "";
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Session Persistence logic
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionInUrl = params.get("session");
    
    // 1. If we have it in URL but not in store, sync to store
    if (sessionInUrl && sessionInUrl !== sessionId) {
      setSessionId(sessionInUrl);
      localStorage.setItem("pos_session_id", sessionInUrl);
    } 
    // 2. If we have it in store (or localStorage) but NOT in URL, sync to URL
    else if (!sessionInUrl) {
      const storedSessionId = sessionId || localStorage.getItem("pos_session_id");
      if (storedSessionId) {
        if (!sessionId) setSessionId(storedSessionId);
        
        // Append to URL without adding to history (replace: true)
        params.set("session", storedSessionId);
        navigate({
          pathname: location.pathname,
          search: params.toString()
        }, { replace: true, state: location.state });
      }
    }
  }, [location.pathname, sessionId, navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + " WIB";
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden transition-colors duration-300 bg-bg-main text-text-primary">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -300,
          width: 280
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 border-r border-border-default flex flex-col z-[70] overflow-hidden shadow-2xl bg-bg-sidebar translate-x-0 rounded-r-[32px] my-2 h-[calc(100vh-16px)]"
        )}
      >
        <div className={cn("p-4 lg:p-6 flex items-center", isSidebarCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-10 h-10 rounded-[24px] flex items-center justify-center flex-shrink-0 overflow-hidden bg-bg-main border border-border-default">
              <img 
                src={shopSettings.shopLogo} 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                  }
                }} 
              />
              <Package className="text-brand-primary w-6 h-6 hidden" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">
                <h1 className="text-xs font-semibold text-text-primary leading-none truncate tracking-tight uppercase">
                  {shopSettings.shopName.split(" ").slice(0, 2).join(" ")}
                </h1>
                <p className="text-[9px] font-medium text-brand-primary tracking-widest uppercase mt-1 truncate">
                  {shopSettings.shopName.split(" ").slice(2).join(" ") || "POS"}
                </p>
              </motion.div>
            )}
          </div>
          <div className="flex items-center">
            <button 
              className="p-2 text-text-muted hover:bg-bg-main hover:text-brand-primary rounded-full transition-colors active:scale-95 transition-transform"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-4 whitespace-nowrap">Menu Utama</div>
            ) : <div className="h-4 mt-4"></div>}
            <SidebarItem 
              icon={<ShoppingCart className="w-5 h-5" />} 
              label="Kasir (POS)" 
              to="/" 
              collapsed={isSidebarCollapsed}
            />
            <Can role={["ADMIN", "MANAGER"]}>
              <SidebarItem 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Dashboard" 
                to="/dashboard"
                collapsed={isSidebarCollapsed}
              />
            </Can>
          </Can>
          
          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-6 whitespace-nowrap">Operasional</div>
            ) : <div className="h-4 mt-6"></div>}
            <SidebarItem 
              icon={<Package className="w-5 h-5" />} 
              label="Stok Barang" 
              to="/inventory"
              collapsed={isSidebarCollapsed}
            />
            <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
              <SidebarItem 
                icon={<Truck className="w-5 h-5" />} 
                label="Pengiriman" 
                to="/delivery" 
                collapsed={isSidebarCollapsed}
              />
            </Can>
            <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
              <SidebarItem 
                icon={<RotateCcw className="w-5 h-5" />} 
                label="Retur Barang" 
                to="/returns" 
                collapsed={isSidebarCollapsed}
              />
            </Can>
          </Can>

          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-6 whitespace-nowrap">Relasi & Proyek</div>
            ) : <div className="h-4 mt-6"></div>}
            <SidebarItem 
              icon={<Users className="w-5 h-5" />} 
              label="Pelanggan" 
              to="/customers"
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem 
              icon={<Briefcase className="w-5 h-5" />} 
              label="Manajemen Proyek" 
              to="/projects"
              collapsed={isSidebarCollapsed}
            />
          </Can>

          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-6 whitespace-nowrap">Keuangan</div>
            ) : <div className="h-4 mt-6"></div>}
            <SidebarItem 
              icon={<Receipt className="w-5 h-5" />} 
              label="Piutang & Hutang" 
              to="/debts"
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem 
              icon={<Receipt className="w-5 h-5" />} 
              label="Pengeluaran" 
              to="/expenses"
              collapsed={isSidebarCollapsed}
            />
          </Can>
          
          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-6 whitespace-nowrap">
                {user?.role === "CASHIER" ? "Riwayat Data" : "Analisa Bisnis"}
              </div>
            ) : <div className="h-4 mt-6"></div>}
            <SidebarItem 
              icon={<FileText className="w-5 h-5" />} 
              label={user?.role === "CASHIER" ? "Riwayat" : "Laporan"} 
              to="/reports"
              collapsed={isSidebarCollapsed}
            />
          </Can>
          
          <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 mb-2 mt-6 whitespace-nowrap">Sistem</div>
            ) : <div className="h-4 mt-6"></div>}
            <SidebarItem 
              icon={<Database className="w-5 h-5" />} 
              label="Database" 
              to="/management" 
              collapsed={isSidebarCollapsed}
            />
          </Can>

        </nav>

        <div className="p-4 border-t border-border-default flex flex-col space-y-2">
          {!isSidebarCollapsed ? (
            <div className="flex items-center p-8 bg-bg-card rounded-[24px] border border-border-subtle">
              <div className="w-10 h-10 rounded-full bg-bg-main flex items-center justify-center mr-3 flex-shrink-0">
                <UserCircle className="text-text-muted w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{user?.fullName || "Admin Toko"}</p>
                <p className="text-xs text-text-secondary truncate">{user?.role || "User"}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-text-muted hover:text-status-danger transition-colors p-2 rounded-full"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 pt-2">
              <div className="w-10 h-10 rounded-full bg-bg-main flex items-center justify-center border border-border-subtle flex-shrink-0">
                <UserCircle className="text-text-muted w-6 h-6" />
              </div>
              <button 
                onClick={handleLogout}
                className="text-text-muted hover:text-status-danger transition-colors p-2 rounded-full" 
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50 transition-colors duration-300 bg-bg-header border-border-default">
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Hamburger Button for Drawer (All Screens) */}
            <button 
              className="p-2 text-text-muted hover:bg-bg-main hover:text-brand-primary rounded-full transition-colors flex-shrink-0 active:scale-95 transition-transform"
              onClick={() => setIsSidebarOpen(true)}
              title="Buka Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile: Store Name on left */}
            <div className="lg:hidden flex items-center space-x-2">
              <div className="max-w-[160px]">
                <h1 className="text-[9px] font-black text-text-primary leading-none truncate tracking-tight uppercase">
                  {shopSettings.shopName}
                </h1>
              </div>
            </div>

            {/* Desktop: Brand Logo & Pill-Tab Nav */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center space-x-2 mr-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-bg-main border border-border-default">
                  <img 
                    src={shopSettings.shopLogo} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove('hidden');
                      }
                    }} 
                  />
                  <Package className="text-brand-primary w-4 h-4 hidden" />
                </div>
                <h2 className="text-sm font-black text-text-primary uppercase tracking-tight truncate">
                  {shopSettings.shopName}
                </h2>
              </div>
              
              {/* Meta Pill-Tab Navigation */}
              <nav className="flex items-center space-x-1 bg-bg-main p-1.5 rounded-full border border-border-default shadow-inner">
                <NavLink to="/" className={({isActive}) => cn("px-5 py-2 rounded-full text-[13px] font-bold transition-all tracking-wide", isActive ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-text-muted hover:text-text-primary hover:bg-bg-card")}>Kasir (POS)</NavLink>
                <Can role={["ADMIN", "MANAGER"]}>
                  <NavLink to="/dashboard" className={({isActive}) => cn("px-5 py-2 rounded-full text-[13px] font-bold transition-all tracking-wide", isActive ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-text-muted hover:text-text-primary hover:bg-bg-card")}>Dashboard</NavLink>
                </Can>
                <NavLink to="/inventory" className={({isActive}) => cn("px-5 py-2 rounded-full text-[13px] font-bold transition-all tracking-wide", isActive ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-text-muted hover:text-text-primary hover:bg-bg-card")}>Stok Barang</NavLink>
                <NavLink to="/reports" className={({isActive}) => cn("px-5 py-2 rounded-full text-[13px] font-bold transition-all tracking-wide", isActive ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-text-muted hover:text-text-primary hover:bg-bg-card")}>Laporan</NavLink>
              </nav>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border bg-brand-primary/5 hover:bg-brand-primary/10 border-brand-primary/25 text-brand-primary transition-all text-xs font-black shadow-sm outline-none focus:outline-none"
              title="Hubungkan HP sebagai Barcode Scanner"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden md:inline uppercase tracking-wider text-[9px]">Sync Scanner</span>
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="hidden lg:block p-2 text-text-muted hover:bg-bg-main rounded-lg transition-colors outline-none border-none focus:outline-none focus:ring-0"
              title="Pengaturan"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleTheme}
              className="text-text-muted hover:bg-bg-main transition-colors outline-none border-none focus:outline-none focus:ring-0 rounded-full w-11 h-11 flex items-center justify-center p-0 active:scale-95 transition-transform"
              title="Ganti Tema"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            </button>
            <div className="text-right hidden sm:block ml-2">
              <p className="text-[10px] text-text-muted font-medium">{formatDate(currentTime)}</p>
              <p className="text-xs lg:text-sm font-bold text-text-primary">{formatTime(currentTime)}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-h-0 relative mobile-bottom-space">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>


      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-lg text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <h3 className="text-base lg:text-lg font-black text-text-inverse">Pengaturan POS</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>

            {/* Premium Tab Selector */}
            <div className="flex border-b border-border-subtle bg-bg-main flex-shrink-0">
              <button 
                onClick={() => setSettingsTab("visual")}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all outline-none",
                  settingsTab === "visual" 
                    ? "border-brand-primary text-brand-primary" 
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                Tampilan & Layout
              </button>
              <button 
                onClick={() => setSettingsTab("shop")}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all outline-none",
                  settingsTab === "shop" 
                    ? "border-brand-primary text-brand-primary" 
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                Profil & Logo Toko
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {settingsTab === "visual" ? (
                <>
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider">Tema Warna</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setTheme("light")}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                          theme === "light" 
                            ? "bg-brand-light border-brand-primary text-brand-primary" 
                            : "bg-bg-card border-border-default text-text-muted hover:border-text-secondary"
                        )}
                      >
                        <Sun className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold">Terang</span>
                      </button>
                      <button 
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                          theme === "dark" 
                            ? "bg-brand-light border-brand-primary text-brand-primary" 
                            : "bg-bg-card border-border-default text-text-muted hover:border-text-secondary"
                        )}
                      >
                        <Moon className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold">Gelap</span>
                      </button>
                    </div>
                  </div>

                  {/* POS Layout */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider">Kustomisasi POS</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => updatePOSLayout({ viewMode: "grid" })}
                        className={cn(
                          "flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all",
                          posLayout.viewMode === "grid"
                            ? "bg-brand-light border-brand-primary text-brand-primary"
                            : "bg-bg-card border-border-default text-text-muted"
                        )}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="text-xs font-bold">Grid View</span>
                      </button>
                      <button 
                        onClick={() => updatePOSLayout({ viewMode: "list" })}
                        className={cn(
                          "flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all",
                          posLayout.viewMode === "list"
                            ? "bg-brand-light border-brand-primary text-brand-primary"
                            : "bg-bg-card border-border-default text-text-muted"
                        )}
                      >
                        <List className="w-4 h-4" />
                        <span className="text-xs font-bold">List View</span>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <LayoutToggle 
                        label="Tampilkan Gambar Produk" 
                        active={posLayout.showImages} 
                        onChange={(val) => updatePOSLayout({ showImages: val })}
                        theme={theme}
                        icon={<ImageIcon className="w-4 h-4" />}
                      />
                      <LayoutToggle 
                        label="Mode Keranjang Ringkas" 
                        active={posLayout.compactCart} 
                        onChange={(val) => updatePOSLayout({ compactCart: val })}
                        theme={theme}
                        icon={<ShoppingCart className="w-4 h-4" />}
                      />
                    </div>
                  </div>

                  {/* Dashboard Layout */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider">Kustomisasi Dashboard</h4>
                    <div className="space-y-3">
                      <LayoutToggle 
                        label="Ringkasan Metrik (Omset, Laba, dll)" 
                        active={dashboardLayout.showMetrics} 
                        onChange={(val) => updateDashboardLayout({ showMetrics: val })}
                        theme={theme}
                      />
                      <LayoutToggle 
                        label="Grafik Tren Penjualan" 
                        active={dashboardLayout.showSalesTrend} 
                        onChange={(val) => updateDashboardLayout({ showSalesTrend: val })}
                        theme={theme}
                      />
                      <LayoutToggle 
                        label="Daftar Produk Terlaris" 
                        active={dashboardLayout.showTopProducts} 
                        onChange={(val) => updateDashboardLayout({ showTopProducts: val })}
                        theme={theme}
                      />
                      <LayoutToggle 
                        label="Struktur Biaya (Pie Chart)" 
                        active={dashboardLayout.showExpenses} 
                        onChange={(val) => updateDashboardLayout({ showExpenses: val })}
                        theme={theme}
                      />
                      <LayoutToggle 
                        label="Monitoring Piutang Macet" 
                        active={dashboardLayout.showBadDebts} 
                        onChange={(val) => updateDashboardLayout({ showBadDebts: val })}
                        theme={theme}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider">Identitas & Branding Toko</h4>
                  
                  <div className="space-y-4">
                    {/* Logo Preview & Upload */}
                    <div className="flex items-center space-x-4 bg-bg-main p-3 rounded-[32px] border border-border-subtle">
                      <div className="w-16 h-16 rounded-[24px] overflow-hidden border border-border-default flex-shrink-0 bg-bg-card flex items-center justify-center relative shadow-inner">
                        {shopSettings.shopLogo ? (
                          <img 
                            src={shopSettings.shopLogo} 
                            alt="Logo Toko" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Logo Toko (Format PNG/JPG)</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          id="settings-logo-upload"
                          className="hidden rounded-lg" 
                        />
                        <label 
                          htmlFor="settings-logo-upload"
                          className="px-3.5 py-2 bg-brand-primary text-text-inverse rounded-xl text-xs font-black uppercase tracking-wider inline-block cursor-pointer transition-all hover:bg-brand-hover shadow-sm"
                        >
                          Unggah Logo Baru
                        </label>
                      </div>
                    </div>

                    {/* Nama Toko */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Nama Toko</label>
                      <input 
                        type="text" 
                        value={shopSettings.shopName}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, shopName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border rounded-xl bg-bg-card border-border-default text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="Contoh: PD SUKSES BANGUNAN"
                      />
                    </div>

                    {/* Nomor Telepon */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">No. Telepon / WhatsApp</label>
                      <input 
                        type="text" 
                        value={shopSettings.shopPhone}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, shopPhone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border rounded-xl bg-bg-card border-border-default text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="Contoh: 081234567890"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Email Toko</label>
                      <input 
                        type="email" 
                        value={shopSettings.shopEmail}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, shopEmail: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border rounded-xl bg-bg-card border-border-default text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="Contoh: pdsuksesbngunan@gmail.com"
                      />
                    </div>

                    {/* Alamat */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Alamat Toko</label>
                      <textarea 
                        value={shopSettings.shopAddress}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, shopAddress: e.target.value }))}
                        rows={3}
                        className="w-full px-3.5 py-2.5 border rounded-xl bg-bg-card border-border-default text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                        placeholder="Alamat lengkap toko..."
                      />
                    </div>

                    {/* Default Signee */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Penanggung Jawab Cetak (Hormat Kami)</label>
                      <input 
                        type="text" 
                        value={shopSettings.defaultSignee}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, defaultSignee: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border rounded-xl bg-bg-card border-border-default text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="Contoh: Umar Sajjaad"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle flex-shrink-0 bg-bg-main/30">
              <button 
                onClick={settingsTab === "shop" ? handleSaveSettings : () => setIsSettingsOpen(false)}
                disabled={isSavingSettings}
                className="w-full py-3.5 bg-brand-primary text-text-inverse rounded-2xl font-bold shadow-lg shadow-brand-primary/10 hover:bg-brand-hover transition-all flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-wider"
              >
                {isSavingSettings ? (
                  <div className="w-4 h-4 border-2 border-text-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : null}
                {settingsTab === "shop" ? "Simpan Profil Toko" : "Simpan Pengaturan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Scanner Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-md text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-text-inverse animate-bounce" />
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Sync Barcode Scanner</h3>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)} 
                className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0"
              >
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-center">
              <p className="text-xs text-text-secondary leading-relaxed font-bold">
                Pindai QR di bawah ini menggunakan kamera HP Anda untuk membuka halaman pemindai barcode. Semua barang yang dipindai di HP akan masuk ke kasir ini secara real-time!
              </p>

              <div className="bg-white p-8 rounded-[32px] border border-border-subtle flex justify-center items-center shadow-inner mx-auto w-fit">
                <QRCodeSVG 
                  value={`${window.location.origin}${window.location.pathname}?session=${sessionId}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="rounded-xl shadow-sm border border-slate-100"
                />
              </div>

              <div className="space-y-3">
                <div className="text-xs font-black text-brand-primary uppercase tracking-widest">
                  Sync Room ID: <span className="underline decoration-wavy decoration-brand-primary font-mono">{sessionId}</span>
                </div>

                <div className="flex items-center space-x-2 bg-bg-main p-2.5 rounded-[24px] border border-border-default max-w-sm mx-auto">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 bg-transparent text-[10px] font-bold text-text-secondary outline-none truncate rounded-lg h-[44px]"
                    value={`${window.location.origin}${window.location.pathname}?session=${sessionId}`}
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link Tersalin!", { description: "Buka link ini di browser HP Anda." });
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-brand-primary text-text-inverse rounded-lg hover:bg-brand-hover transition-colors text-[9px] font-black uppercase tracking-wider shadow-sm shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </button>
                </div>
              </div>

              <div className="bg-brand-primary/5 rounded-[24px] p-3 border border-brand-primary/10 text-left max-w-sm mx-auto">
                <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-wider mb-1.5">Cara Penggunaan:</h4>
                <ol className="text-[10px] text-text-secondary list-decimal pl-4 space-y-1 font-bold leading-relaxed">
                  <li>Scan QR code di atas menggunakan HP Anda.</li>
                  <li>Buka link di browser Chrome / Safari HP Anda.</li>
                  <li>Izinkan akses kamera HP jika diminta.</li>
                  <li>Arahkan kamera HP ke barcode barang untuk memindai.</li>
                </ol>
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle flex-shrink-0 bg-bg-main/50">
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="w-full py-3 bg-brand-primary text-text-inverse rounded-xl font-bold hover:bg-brand-hover transition-all text-xs uppercase tracking-wider"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LayoutToggleProps {
  label: string;
  active: boolean;
  onChange: (val: boolean) => void;
  theme: string;
  icon?: React.ReactNode;
}

const LayoutToggle = ({ label, active, onChange, theme, icon }: LayoutToggleProps) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-xl border transition-all",
    "bg-bg-main border-border-subtle"
  )}>
    <div className="flex items-center space-x-3">
      {icon && <div className="text-text-muted">{icon}</div>}
      <span className="text-xs font-bold">{label}</span>
    </div>
    <button 
      onClick={() => onChange(!active)}
      className={cn(
        "p-1.5 rounded-lg transition-all",
        active 
          ? "bg-status-success/20 text-status-success" 
          : "bg-bg-card text-text-muted border border-border-default"
      )}
    >
      {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
    </button>
  </div>
);
