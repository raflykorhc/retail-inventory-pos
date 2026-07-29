import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Loader2, 
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/useAuthStore";
import { cn } from "../../lib/utils";

const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(4, "Password minimal 4 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from?.pathname || "/";
  const fromSearch = location.state?.from?.search || location.search || "";
  const from = fromPath + fromSearch;

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && useAuthStore.getState().user) {
      const user = useAuthStore.getState().user;
      let target = "/";
      if (user?.role === "CASHIER") target = "/";
      else if (user?.role === "ADMIN" || user?.role === "MANAGER") target = "/dashboard";
      
      navigate(target + fromSearch, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      setAuth(response.token, response.user);
      
      toast.success("Berhasil Masuk", {
        description: `Selamat datang kembali, ${response.user.username}!`,
      });

      let targetPath = from;
      if (from === "/") {
        if (response.user.role === "CASHIER") {
          targetPath = "/inventory";
        } else if (response.user.role === "ADMIN" || response.user.role === "MANAGER") {
          targetPath = "/dashboard";
        }
      }
      
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.error || "Gagal masuk. Periksa kembali username dan password Anda.";
      setError(message);
      toast.error("Login Gagal", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-bg-main text-text-primary selection:bg-brand-primary selection:text-white">
      {/* Left Pane - Brand Visual */}
      <div className="hidden lg:flex w-1/2 bg-[#0a192f] relative overflow-hidden items-center justify-center p-12">
        {/* Modern Abstract Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
          
          {/* Decorative lines */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center max-w-lg"
        >
          {/* Logo Container */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-10 inline-flex items-center justify-center w-32 h-32 rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 group hover:scale-105 transition-transform duration-500"
          >
            <img 
              src="/logo.png" 
              alt="PD Sukses Bangunan" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Building2 className="w-12 h-12 text-brand-primary hidden" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase leading-none">
              SUKSES <span className="text-brand-primary block mt-1">BANGUNAN</span>
            </h1>
            <div className="h-1.5 w-24 bg-brand-primary mx-auto rounded-full mb-8" />
            
            <p className="text-slate-400 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
              Solusi Terintegrasi untuk Manajemen Material & Konstruksi Modern.
            </p>

            <div className="grid grid-cols-2 gap-6 text-left">
              {[
                { text: "Inventory Cerdas", icon: <Layers className="w-5 h-5 text-brand-primary" /> },
                { text: "POS Transaksional", icon: <Zap className="w-5 h-5 text-amber-500" /> },
                { text: "Analitik Bisnis", icon: <BarChart3 className="w-5 h-5 text-emerald-500" /> },
                { text: "Keamanan Data", icon: <ShieldCheck className="w-5 h-5 text-blue-500" /> }
              ].map((feature, i) => (
                <motion.div 
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                  className="flex items-center space-x-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default"
                >
                  <div className="p-2 bg-white/5 rounded-[24px]">
                    {feature.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-200">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Floating Branding Tag */}
        <div className="absolute bottom-10 left-12 flex items-center space-x-4">
          <div className="h-px w-16 bg-slate-700" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500">Enterprise Edition v2.4</span>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Subtle background decoration for mobile */}
        <div className="absolute inset-0 lg:hidden overflow-hidden -z-10">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="mb-12 lg:hidden flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-[32px] p-8 mb-4 border border-border-subtle">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tighter uppercase">
              SUKSES <span className="text-brand-primary">BANGUNAN</span>
            </h1>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black text-text-primary mb-3 tracking-tight">Selamat Datang</h2>
            <p className="text-text-secondary font-medium text-lg">Silakan masuk ke dashboard operasional Anda.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-status-danger/10 border border-status-danger/20 text-status-danger p-4 rounded-2xl flex items-center space-x-3 overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.1em] ml-1">Username / ID Karyawan</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-primary transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  {...register("username")}
                  type="text"
                  autoFocus
                  placeholder="Masukkan username"
                  className={cn(
                    "w-full pl-14 pr-6 py-4 bg-bg-card border-2 rounded-[1.25rem] outline-none transition-all duration-300 font-semibold text-text-primary placeholder:text-text-muted/50",
                    errors.username 
                      ? "border-status-danger/30 focus:border-status-danger focus:ring-4 focus:ring-status-danger/5" 
                      : "border-border-default focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5"
                  )}
                />
              </div>
              {errors.username && (
                <p className="text-[11px] font-bold text-status-danger ml-2">{errors.username.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-text-muted uppercase tracking-[0.1em]">Kata Sandi</label>
                <button 
                  type="button" 
                  onClick={() => toast.info("Hubungi Administrator", {
                    description: "Untuk alasan keamanan, silakan hubungi Manajer atau IT Support untuk melakukan reset kata sandi."
                  })}
                  className="text-xs font-bold text-brand-primary hover:underline underline-offset-4"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={cn(
                    "w-full pl-14 pr-14 py-4 bg-bg-card border-2 rounded-[1.25rem] outline-none transition-all duration-300 font-semibold text-text-primary placeholder:text-text-muted/50",
                    errors.password 
                      ? "border-status-danger/30 focus:border-status-danger focus:ring-4 focus:ring-status-danger/5" 
                      : "border-border-default focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-bold text-status-danger ml-2">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-3 px-1">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-border-default transition-all checked:border-brand-primary checked:bg-brand-primary" 
                />
                <CheckCircle2 className="absolute h-5 w-5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none p-0.5" />
              </div>
              <label htmlFor="remember" className="text-sm font-bold text-text-secondary cursor-pointer select-none">Biarkan saya tetap masuk</label>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-brand-primary hover:bg-brand-hover disabled:bg-slate-300 text-white rounded-[1.25rem] font-black text-base tracking-wider flex items-center justify-center space-x-3 transition-all shadow-xl shadow-brand-primary/20 mt-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>OTENTIKASI...</span>
                </>
              ) : (
                <>
                  <span>MASUK KE SISTEM</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer Info */}
          <div className="mt-16 flex flex-col items-center space-y-8">
            <div className="h-px w-12 bg-border-default" />
            <p className="text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              &copy; 2026 PD SUKSES BANGUNAN &bull; OPERATIONAL SYSTEM v2.4.2
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
