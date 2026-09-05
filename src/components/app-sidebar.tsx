import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { SettingsModal } from "@/components/settings-modal"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSettings } from "@/hooks/queries/useMetadata"
import { 
  ShoppingCart, 
  LayoutDashboard, 
  Package, 
  FileText,
  Store,
  Settings
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Point of Sale (POS)",
      url: "/",
      icon: <ShoppingCart />,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard />,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <Package />,
    },
    {
      title: "Laporan",
      url: "/reports",
      icon: <FileText />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const { data: settings } = useSettings()

  const navSecondary = [
    {
      title: "Pengaturan",
      onClick: () => setIsSettingsOpen(true),
      icon: <Settings />,
    },
  ]

  return (
    <>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="data-[slot=sidebar-menu-button]:p-1.5!"
                render={<a href="#" />}
              >
                {settings?.shopLogo ? (
                  <img src={settings.shopLogo} alt="Logo" className="size-5 object-contain" />
                ) : (
                  <Store className="size-5!" />
                )}
                <span className="text-base font-semibold truncate">
                  {settings?.shopName || "PD SUKSES BANGUNAN"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
          <NavSecondary items={navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}
