import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginAdmin } from "@/lib/admin-auth"
import { redirectIfAuthenticated } from "@/middleware"

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  beforeLoad: async () => {
    const result = await redirectIfAuthenticated()
    if (result?.admin) {
      throw redirect({ to: '/app/dashboard' })
    }
    return { admin: null }
  },
})

function RouteComponent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await loginAdmin(email, password)

    if (!result.success) {
      toast.error(result.error || "Login failed. Please try again.")
      setIsLoading(false)
      return
    }

    toast.success(`Welcome back, ${result.admin?.name}!`)

    // Redirect to admin dashboard
    navigate({ to: '/app/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin Portal</CardTitle>
            <CardDescription>
              Sign in with your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@wemsp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </Field>
                <Field>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
