import { Link, useRouter } from "@tanstack/react-router"
import {
  Home,
  User,
  ChevronUp,
  Users,
} from "lucide-react"

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
import { useQuery } from "@tanstack/react-query"

export function AppSidebar() {
  const router = useRouter()

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const data = await authClient.getSession()
      // console.log(data)
      return data
    },
  })

  const user = session?.data?.user

  const handleLogout = async () => {
    await authClient.signOut()
    router.navigate({ to: "/" })
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/app/dashboard" className="flex items-center gap-2">
          <img src="/assets/logo2.png" alt="WEMSP" className="h-10 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/family/dashboard">
                    <Users />
                    <span>Family</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/profile">
                    <User />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <User />
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
                <DropdownMenuItem onClick={() => router.navigate({ to: "/app/profile" })}>
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
