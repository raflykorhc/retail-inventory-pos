import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { IconDotsVertical, IconLogout, IconSun, IconMoon } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import { useAuthStore, getRoleDisplayName } from "../store/useAuthStore"

export function NavUser() {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()

  if (!user) return null;

  const initials = user.fullName ? user.fullName.substring(0, 2).toUpperCase() : "U";
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || 'User')}`;

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src={avatarUrl} alt={user.fullName} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">{getRoleDisplayName(user.role)}</span>
            </div>
            <IconDotsVertical className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={avatarUrl} alt={user.fullName} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">{getRoleDisplayName(user.role)}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <div className="flex items-center justify-between px-2 py-1.5 text-sm [&_svg]:size-4">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <IconMoon /> : <IconSun />}
                <span>Tema Gelap</span>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </div>
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout
              />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
