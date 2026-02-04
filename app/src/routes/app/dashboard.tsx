import { createFileRoute } from '@tanstack/react-router'
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute('/app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleLogout = async () => {
    await authClient.signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to your dashboard. This area is protected by authentication.
      </p>
      <Button onClick={handleLogout} variant="outline" className="w-fit">
        Logout
      </Button>
    </div>
  )
}
