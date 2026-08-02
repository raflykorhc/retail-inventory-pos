import React from "react";
import { Package, Tag, Layers, Truck, Users, BarChart3 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Can } from "../../../components/auth/Can";
import { Role } from "../../../store/useAuthStore";

export type Tab = "barang" | "kategori" | "satuan" | "supplier" | "user" | "optimasi";

interface ManagementTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const ManagementTabs: React.FC<ManagementTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "barang", label: "Barang", icon: Package },
    { id: "kategori", label: "Kategori", icon: Tag },
    { id: "satuan", label: "Satuan", icon: Layers },
    { id: "supplier", label: "Pemasok", icon: Truck },

    { id: "optimasi", label: "Optimasi Stok", icon: BarChart3, roles: ["ADMIN", "MANAGER"] as Role[] },
    { id: "user", label: "Pengguna", icon: Users, roles: ["ADMIN", "MANAGER"] as Role[] },
  ];

  return (
    <div className="flex space-x-2 p-1.5 rounded-[32px] border w-full lg:w-fit flex-shrink-0 hide-scrollbar overflow-x-auto transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-bg-card border-border-default whitespace-nowrap scrollbar-hide touch-pan-x">
      {tabs.map(({ id, label, icon: Icon, roles }) => {
        const button = (
          <button
            key={id}
            onClick={() => setActiveTab(id as Tab)}
            className={cn(
              "px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center space-x-2 flex-shrink-0 transform-gpu",
              "transition-[background-color,transform,color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform",
              activeTab === id
                ? "bg-brand-primary text-text-inverse shadow-md scale-105"
                : "text-text-muted hover:bg-bg-main hover:text-text-primary"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        );

        if (roles) {
          return (
            <Can key={id} role={roles}>
              {button}
            </Can>
          );
        }

        return button;
      })}
    </div>
  );
};
