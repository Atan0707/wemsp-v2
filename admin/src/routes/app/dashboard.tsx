import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { getAdminToken, verifyAdminSession } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Bell, FileText, Package, Users } from 'lucide-react'

export const Route = createFileRoute('/app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [admin, setAdmin] = useState<{ name: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAdminToken()
      if (!token) {
        navigate({ to: '/login' })
        return
      }

      const adminData = await verifyAdminSession()
      if (!adminData) {
        navigate({ to: '/login' })
        return
      }

      setAdmin({ name: adminData.name })
      setIsChecking(false)
    }

    checkAuth()
  }, [navigate])

  const stats = useMemo(
    () => [
      {
        title: 'Total users',
        value: '0',
        helper: 'Registered accounts',
        icon: Users,
      },
      {
        title: 'Total assets',
        value: '0',
        helper: 'Tracked by owners',
        icon: Package,
      },
      {
        title: 'Pending agreements',
        value: '0',
        helper: 'Need attention',
        icon: FileText,
      },
    ],
    []
  )

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin?.name || 'Admin'} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold md:text-lg">Dashboard</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">Overview</Badge>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Welcome back, {admin?.name || 'Admin'}</CardTitle>
              <CardDescription>
                Your admin workspace is ready. Start with pending agreements or review latest users.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate({ to: '/app/agreements' })}>
                Review agreements
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/app/users' })}>
                Manage users
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title}>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      {stat.title}
                      <Icon className="h-4 w-4" />
                    </CardDescription>
                    <CardTitle className="text-3xl">{stat.value}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Recommended next step
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Prioritize agreements in pending states to keep signature flow moving and reduce support requests.
              </p>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
