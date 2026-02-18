import { Link, useLocation, useRouter } from "@tanstack/react-router"
import {
  ChevronUp,
  Contact,
  FileText,
  Home,
  Settings,
  User,
  Wallet2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

export function AppSidebar() {
  const router = useRouter()
  const location = useLocation()

  const { data: session } = authClient.useSession()

  const user = session?.user

  const navigationItems: Array<{
    to: string
    label: string
    matchPath: string
    icon: LucideIcon
  }> = [
    { to: "/app/dashboard", label: "Dashboard", matchPath: "/app/dashboard", icon: Home },
    { to: "/app/family/view", label: "Family", matchPath: "/app/family", icon: Contact },
    { to: "/app/assets/view", label: "Assets", matchPath: "/app/assets", icon: Wallet2 },
    { to: "/app/agreement", label: "Agreement", matchPath: "/app/agreement", icon: FileText },
    { to: "/app/profile", label: "Profile", matchPath: "/app/profile", icon: User },
    { to: "/app/settings", label: "Settings", matchPath: "/app/settings", icon: Settings },
  ]

  const isActivePath = (matchPath: string) =>
    location.pathname === matchPath || location.pathname.startsWith(`${matchPath}/`)

  const handleLogout = async () => {
    await authClient.signOut()
    router.navigate({ to: "/" })
  }

  return (
    <Sidebar className="border-r border-sidebar-border/60">
      <SidebarHeader className="p-4 pb-2">
        <div className="rounded-2xl border border-sidebar-border/60 bg-gradient-to-br from-sidebar-accent/60 via-sidebar to-sidebar p-3 shadow-sm">
          <Link to="/app/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-white/90 p-2 shadow-sm ring-1 ring-black/5">
              <img src="/assets/logo2.png" alt="WEMSP" className="h-8 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">WEMSP</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Estate Management</p>
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-3">
        <SidebarGroup className="pt-1">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActivePath(item.matchPath)}
                    className="h-11 rounded-xl px-3 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm"
                  >
                    <Link
                      to={item.to}
                      {...(item.to === "/app/profile"
                        ? { search: { onboarding: false, redirect: location.pathname } }
                        : {})}
                    >
                      <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-accent/70">
                        <item.icon className="size-4" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 p-3 pt-3">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="h-12 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/35 px-3 hover:bg-sidebar-accent/60">
                  <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                    <User className="size-4" />
                  </div>
                  <span className="truncate">
                    {user?.name || user?.email || "Account"}
                  </span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={() => router.navigate({ to: "/app/profile", search: { onboarding: false, redirect: undefined } })}>
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
