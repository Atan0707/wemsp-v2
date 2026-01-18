import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

export const Route = createFileRoute('/app/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    icNumber: "",
    address: "",
    phoneNumber: "",
  })

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data
    },
  })

  const user = session?.data?.user

  // Update form data when user data loads
  if (user && !isEditing && formData.name === "") {
    setFormData({
      name: user.name || "",
      icNumber: (user as any).icNumber || "",
      address: (user as any).address || "",
      phoneNumber: (user as any).phoneNumber || "",
    })
  }

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

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await authClient.updateUser({
        name: data.name,
      })
      return response
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      queryClient.invalidateQueries({ queryKey: ["session"] })
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile")
    },
  })

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updateProfileMutation.mutate(formData)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        icNumber: (user as any).icNumber || "",
        address: (user as any).address || "",
        phoneNumber: (user as any).phoneNumber || "",
      })
    }
    setIsEditing(false)
  }

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
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
              <div className="space-y-2 text-center sm:text-left w-full">
                <Skeleton className="h-6 w-32 sm:w-48 mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-48 sm:w-64 mx-auto sm:mx-0" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          Please log in to view your profile information.
        </p>
      </div>
    )
  }

  const isEmailVerified = (user as any).emailVerified
  const createdAt = new Date((user as any).createdAt || Date.now())
  const updatedAt = new Date((user as any).updatedAt || Date.now())

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="space-y-1.5 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          My Profile
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Profile Header Card with Gradient */}
      <Card className="relative overflow-hidden border-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-background opacity-50" />
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <Avatar className="relative h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xl sm:text-2xl font-bold text-primary">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="ghost"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/50 backdrop-blur-sm"
              >
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </Button>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-2 sm:space-y-3 text-center w-full">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{user.name || "User"}</h2>
                <p className="text-muted-foreground text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {user.email}
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border",
                  isEmailVerified
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                )}>
                  {isEmailVerified ? (
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  )}
                  {isEmailVerified ? "Verified" : "Unverified"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary border-primary/20">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Joined {createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="w-full sm:w-auto flex-shrink-0 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">Profile Complete</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-2 w-24 sm:w-32 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <span className="text-base sm:text-lg font-bold text-primary">{profileCompletion}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Personal Information Card */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Update your personal details and contact information
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="default" className="shadow-sm w-full sm:w-auto">
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleCancel} variant="outline" className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 sm:flex-none shadow-sm"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <FieldGroup className="gap-5 sm:gap-7">
                {/* Name Field */}
                <Field className="group">
                  <FieldLabel htmlFor="name" className="text-sm font-medium">Full Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Your full name"
                    className={cn(
                      "h-10 sm:h-11 transition-all duration-200",
                      !isEditing && "bg-muted/50 cursor-not-allowed",
                      isEditing && "focus-visible:ring-2 focus-visible:ring-primary/20"
                    )}
                  />
                </Field>

                {/* Email Field (Read-only) */}
                <Field className="group">
                  <FieldLabel htmlFor="email" className="text-sm font-medium">Email Address</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="h-10 sm:h-11 pl-10 bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </Field>

                {/* IC Number Field */}
                <Field className="group">
                  <FieldLabel htmlFor="icNumber" className="text-sm font-medium">IC Number</FieldLabel>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="icNumber"
                      type="text"
                      value={formData.icNumber}
                      onChange={(e) => handleInputChange("icNumber", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Your IC number"
                      className={cn(
                        "h-10 sm:h-11 pl-10 transition-all duration-200",
                        !isEditing && "bg-muted/50 cursor-not-allowed",
                        isEditing && "focus-visible:ring-2 focus-visible:ring-primary/20"
                      )}
                    />
                  </div>
                </Field>

                {/* Phone Number Field */}
                <Field className="group">
                  <FieldLabel htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      disabled={!isEditing}
                      placeholder="+60 12-345-6789"
                      className={cn(
                        "h-10 sm:h-11 pl-10 transition-all duration-200",
                        !isEditing && "bg-muted/50 cursor-not-allowed",
                        isEditing && "focus-visible:ring-2 focus-visible:ring-primary/20"
                      )}
                    />
                  </div>
                </Field>

                {/* Address Field */}
                <Field className="group">
                  <FieldLabel htmlFor="address" className="text-sm font-medium">Address</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Your residential address"
                      className={cn(
                        "h-10 sm:h-11 pl-10 transition-all duration-200",
                        !isEditing && "bg-muted/50 cursor-not-allowed",
                        isEditing && "focus-visible:ring-2 focus-visible:ring-primary/20"
                      )}
                    />
                  </div>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar - Account Info & Quick Actions */}
        <div className="space-y-4 sm:space-y-6">
          {/* Account Information Card */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">User ID</p>
                <p className="font-mono text-[11px] sm:text-sm bg-muted px-2.5 sm:px-3 py-1.5 rounded-md truncate break-all">
                  {user.id}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Account Created
                </p>
                <p className="text-xs sm:text-sm">
                  {createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Updated
                </p>
                <p className="text-xs sm:text-sm">
                  {updatedAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="shadow-sm bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-xs sm:text-sm">Two-Factor Auth</span>
                <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs sm:text-sm">Password</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
