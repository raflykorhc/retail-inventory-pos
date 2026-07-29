import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  Menu,
  ArrowLeft
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { cn } from '../../lib/utils';
import { Can } from '../auth/Can';
import { motion } from 'framer-motion';

interface BottomNavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const BottomNavItem = ({ to, icon, label, onClick }: BottomNavItemProps) => {
  const location = useLocation();
  const isActive = to ? location.pathname === to : false;

  const content = (
    <div className="flex flex-col items-center justify-center relative w-full h-full pt-1">
      <div className={cn(
        "p-2 rounded-2xl transition-all duration-300 relative z-10",
        isActive 
          ? "bg-brand-primary text-text-inverse scale-110 shadow-lg shadow-brand-primary/30" 
          : "text-text-muted hover:text-text-secondary"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      </div>
      <span className={cn(
        "text-[9px] font-black mt-1 transition-all duration-300 uppercase tracking-tighter z-10",
        isActive ? "text-brand-primary opacity-100" : "text-text-muted/60"
      )}>
        {label}
      </span>
      {isActive && (
        <motion.div 
          layoutId="activeTabDot"
          className="absolute top-0 w-1 h-1 bg-brand-primary rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="flex-1 h-full focus:outline-none rounded-full">
        {content}
      </button>
    );
  }

  return (
    <NavLink to={to!} className="flex-1 h-full focus:outline-none">
      {content}
    </NavLink>
  );
};

interface BottomNavProps {
  onMenuClick: () => void;
}

export const BottomNav = ({ onMenuClick }: BottomNavProps) => {
  const { isCartOpen, setIsCartOpen, checkoutStep, setCheckoutStep } = useCartStore();
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-header/80 backdrop-blur-xl border-t border-border-subtle/50 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {isCartOpen && location.pathname === '/' ? (
          <BottomNavItem 
            onClick={() => {
              if (checkoutStep === 'payment') {
                setCheckoutStep('cart');
              } else {
                setIsCartOpen(false);
              }
            }}
            icon={<ArrowLeft />} 
            label="Kembali" 
          />
        ) : (
          <BottomNavItem 
            to="/" 
            icon={<ShoppingCart />} 
            label="Kasir" 
          />
        )}
        
        <Can role={["ADMIN", "MANAGER", "CASHIER"]}>
          <BottomNavItem 
            to="/inventory" 
            icon={<Package />} 
            label="Stok" 
          />
        </Can>

        <Can role={["ADMIN", "MANAGER"]}>
          <BottomNavItem 
            to="/reports" 
            icon={<FileText />} 
            label="Laporan" 
          />
        </Can>

        <BottomNavItem 
          onClick={onMenuClick}
          icon={<Menu />} 
          label="Menu" 
        />
      </div>
    </nav>
  );
};
