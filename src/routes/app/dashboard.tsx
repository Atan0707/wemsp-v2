import { createFileRoute } from '@tanstack/react-router'
import { createAuthClient } from "better-auth/client"
import { Button } from "@/components/ui/button"

const authClient = createAuthClient()

export const Route = createFileRoute('/app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleLogout = async () => {
    await authClient.signOut()
    window.location.href = '/'
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <Button onClick={handleLogout} variant="outline">
        Logout
      </Button>
    </div>
  )
}
