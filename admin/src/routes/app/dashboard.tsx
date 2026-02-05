import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminToken, verifyAdminSession } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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

  if (isChecking) {
    return <div>Loading...</div>
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin?.name || 'Admin'} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h3 className="font-semibold">Total Users</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h3 className="font-semibold">Total Assets</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h3 className="font-semibold">Pending Agreements</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
