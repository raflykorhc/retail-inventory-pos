import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom"
import { NotificationBell } from "@/components/notification-bell"

export function SiteHeader() {
  const location = useLocation()
  const path = location.pathname

  let title = "POS"
  if (path.startsWith("/dashboard")) title = "Dashboard"
  else if (path.startsWith("/inventory")) title = "Inventory"
  else if (path.startsWith("/management")) title = "Manajemen"
  else if (path.startsWith("/reports")) title = "Laporan"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 self-center" />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
