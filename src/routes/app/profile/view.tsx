import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Mail, Phone, MapPin, IdCard, Camera, Shield, Calendar, Clock, CheckCircle2, XCircle, Sparkles } from "lucide-react"
import { authClient } from "@/lib/auth-client"
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
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const Route = createFileRoute('/app/profile/view')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data
    },
  })

  const user = session?.data?.user

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!user) return 0
    const fields = [
      user.name,
      user.email,
      (user as any).icNumber,
      (user as any).address,
      (user as any).phoneNumber,
    ]
    const filledFields = fields.filter(Boolean).length
    return Math.round((filledFields / fields.length) * 100)
  }, [user])

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Skeleton className="h-8 w-32" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          Please log in to view your profile information.
        </p>
      </div>
    )
  }

  const isEmailVerified = (user as any).emailVerified
  const createdAt = new Date((user as any).createdAt || Date.now())
  const updatedAt = new Date((user as any).updatedAt || Date.now())

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                Manage your personal information and account settings
              </CardDescription>
            </div>
            <Button
              onClick={() => router.navigate({ to: '/app/profile/edit' })}
              variant="default"
            >
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
              <AvatarFallback className="text-lg sm:text-xl font-semibold">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-semibold">{user.name || "User"}</h2>
              <p className="text-sm sm:text-base text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                  isEmailVerified
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                )}>
                  {isEmailVerified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {isEmailVerified ? "Verified" : "Unverified"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border-primary/20">
                  <Calendar className="h-3 w-3" />
                  Joined {createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">Profile Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <FieldGroup className="gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Full Name</p>
              <Input value={user.name || ""} disabled className="h-10 bg-muted/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Email Address</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">IC Number</p>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={(user as any).icNumber || ""}
                  disabled
                  placeholder="Not provided"
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Phone Number</p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="tel"
                  value={(user as any).phoneNumber || ""}
                  disabled
                  placeholder="Not provided"
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={(user as any).address || ""}
                  disabled
                  placeholder="Not provided"
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-xs bg-muted px-2 py-1.5 rounded-md truncate">
                {user.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Account Created
              </p>
              <p className="text-sm">
                {createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Updated
              </p>
              <p className="text-sm">
                {updatedAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
