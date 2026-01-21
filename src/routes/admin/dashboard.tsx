import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminSession } from '@/middleware'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/dashboard')({
  loader: async () => {
    const admin = await getAdminSession()
    if (!admin) {
      throw redirect({ to: '/admin/login' })
    }
    return { admin }
  },
  component: RouteComponent,
})

function RouteComponent() {
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

  // Get admin data from loader
  const { admin } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {admin.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="bg-background rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-2">Welcome to the Admin Portal</h2>
            <p className="text-muted-foreground">
              This is the admin dashboard where you can manage agreements, users, and system settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
