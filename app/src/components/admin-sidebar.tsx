import { Link, useLocation } from "@tanstack/react-router"
import {
  ChevronUp,
  FileText,
  Home,
  Package,
  Shield,
  Users,
} from "lucide-react"
import { toast } from "sonner"
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

interface AdminSidebarProps {
  adminName: string
}

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const location = useLocation()

  const navigationItems: Array<{
    to: string
    label: string
    matchPath: string
    icon: LucideIcon
  }> = [
    { to: "/admin/dashboard", label: "Dashboard", matchPath: "/admin/dashboard", icon: Home },
    { to: "/admin/users", label: "Users", matchPath: "/admin/users", icon: Users },
    { to: "/admin/assets", label: "Assets", matchPath: "/admin/assets", icon: Package },
    { to: "/admin/agreements", label: "Agreements", matchPath: "/admin/agreements", icon: FileText },
  ]

  const isActivePath = (matchPath: string) =>
    location.pathname === matchPath || location.pathname.startsWith(`${matchPath}/`)

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Logged out successfully')
        window.location.href = '/admin/login'
      }
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <Sidebar className="border-r border-sidebar-border/60">
      <SidebarHeader className="p-4 pb-2">
        <div className="rounded-2xl border border-sidebar-border/60 bg-gradient-to-br from-slate-100 via-sidebar to-sidebar p-3 shadow-sm">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Admin Portal</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Management Console</p>
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-3">
        <SidebarGroup className="pt-1">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60">
            Administration
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
                    <Link to={item.to}>
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
                    <Shield className="size-4" />
                  </div>
                  <span className="truncate">
                    {adminName || "Admin"}
                  </span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
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
