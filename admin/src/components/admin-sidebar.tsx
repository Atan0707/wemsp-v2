import { Link, useLocation } from '@tanstack/react-router'
import {
  Home,
  ChevronUp,
  Users,
  Shield,
  Package,
  FileText,
  Sparkles,
} from 'lucide-react'

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
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { logoutAdmin } from '@/lib/admin-auth'
import { useState } from 'react'

interface AdminSidebarProps {
  adminName: string
}

const navigationItems = [
  { title: 'Dashboard', to: '/app/dashboard', icon: Home },
  { title: 'Users', to: '/app/users', icon: Users },
  { title: 'Assets', to: '/app/assets', icon: Package },
  { title: 'Agreements', to: '/app/agreements', icon: FileText },
] as const

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutAdmin()
      toast.success('Logged out successfully')
      window.location.href = '/login'
    } catch {
      toast.error('Failed to logout')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4">
        <Link to="/app/dashboard" className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Admin Portal</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">v2</Badge>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.to}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tips</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Quick workflow
              </div>
              <p>Review pending agreements first, then verify users with incomplete profiles.</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" disabled={isLoggingOut}>
                  <Shield />
                  <span className="truncate">{adminName || 'Admin'}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
