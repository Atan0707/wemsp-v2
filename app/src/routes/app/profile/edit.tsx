import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Phone, MapPin, IdCard, Loader2, AlertTriangle, Mail, User, UserCheck, Users, CheckCircle2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

// Type for non-registered family member data returned from API
interface NonRegisteredData {
  id: number
  name: string
  icNumber: string
  address: string | null
  phoneNumber: string | null
  relation: string
  addedBy: {
    id: string
    name: string
    email: string
  }
}

export const Route = createFileRoute('/app/profile/edit')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    onboarding: typeof search.onboarding === 'boolean'
      ? search.onboarding
      : search.onboarding === 'true',
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = Route.useSearch()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    icNumber: "",
    address: "",
    phoneNumber: "",
  })
  const [redirectPath, setRedirectPath] = useState<string | undefined>(undefined)
  const [isOnboarding, setIsOnboarding] = useState(false)
  
  // State for claim flow
  const [showClaimConfirmation, setShowClaimConfirmation] = useState(false)
  const [nonRegisteredData, setNonRegisteredData] = useState<NonRegisteredData[] | null>(null)
  const [confirmClaim, setConfirmClaim] = useState(false)

  // Fetch session data
  const { data: session, isPending, refetch: refetchSession } = authClient.useSession()

  const user = session?.user

  // Read and clean up URL params on mount
  useEffect(() => {
    if (searchParams.onboarding) {
      setIsOnboarding(true)
      setRedirectPath(searchParams.redirect)
      // Clean up URL by removing search params
      router.navigate({
        to: '.',
        search: {},
        replace: true,
      })
    }
  }, [searchParams, router])


  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        icNumber: (user as any).icNumber || "",
        address: (user as any).address || "",
        phoneNumber: (user as any).phoneNumber || "",
      })
    }
  }, [user])

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (claimNonRegistered: boolean = false) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          icNumber: formData.icNumber,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          claimNonRegistered,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      return data
    },
    onSuccess: async (data) => {
      // Check if API is asking for claim confirmation
      if (data.requiresClaim) {
        setNonRegisteredData(data.nonRegisteredData)
        setShowClaimConfirmation(true)
        return
      }

      toast.success("Profile updated successfully")

      // Reset claim state
      setShowClaimConfirmation(false)
      setNonRegisteredData(null)
      setConfirmClaim(false)

      // Invalidate all better-auth related queries to force refetch
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Match queries that start with better-auth prefix or contain session/user data
          const queryKey = query.queryKey[0] as string
          return (
            queryKey?.startsWith('better-auth') ||
            typeof queryKey === 'string' && queryKey.includes('session')
          )
        },
      })

      // Also refetch the session directly
      await refetchSession()

      // Small delay to ensure data is refreshed before redirect
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect to original path if in onboarding mode
      if (isOnboarding) {
        if (redirectPath) {
          router.navigate({ to: redirectPath })
        } else {
          router.navigate({ to: "/app/profile", search: { onboarding: false, redirect: undefined } })
        }
      } else {
        router.navigate({ to: "/app/profile", search: { onboarding: false, redirect: undefined } })
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile")
    },
  })

  // Handle confirming the claim
  const handleConfirmClaim = () => {
    if (!confirmClaim) {
      toast.error("Please confirm that this is your information")
      return
    }
    updateProfileMutation.mutate(true)
  }

  // Handle canceling the claim
  const handleCancelClaim = () => {
    setShowClaimConfirmation(false)
    setNonRegisteredData(null)
    setConfirmClaim(false)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    if (!formData.icNumber.trim()) {
      toast.error("IC number is required")
      return
    }

    // Validate IC number is exactly 12 digits
    if (formData.icNumber.length !== 12) {
      toast.error("IC number must be exactly 12 digits")
      return
    }

    if (!formData.phoneNumber.trim()) {
      toast.error("Phone number is required")
      return
    }

    if (!formData.address.trim()) {
      toast.error("Address is required")
      return
    }

    updateProfileMutation.mutate(false)
  }

  const handleCancel = () => {
    if (isOnboarding) {
      // Don't allow cancel during onboarding
      return
    }
    router.navigate({ to: "/app/profile", search: { onboarding: false, redirect: undefined } })
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <IdCard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          Please log in to edit your profile.
        </p>
      </div>
    )
  }

  // Helper function to format relation for display
  const formatRelation = (relation: string) => {
    return relation.charAt(0) + relation.slice(1).toLowerCase().replace(/_/g, ' ')
  }

  // Show claim confirmation UI
  if (showClaimConfirmation && nonRegisteredData) {
    return (
      <div className="flex flex-col gap-4">
        {/* Claim Confirmation Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">We Found Your Information</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              A family member has already registered your IC number. Please verify the information below is correct before proceeding.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Verify Your Identity
            </CardTitle>
            <CardDescription>
              The following information was added by your family member(s). Please confirm this is you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display non-registered data */}
            {nonRegisteredData.map((data, index) => (
              <div key={data.id} className="border rounded-lg p-4 space-y-4">
                {nonRegisteredData.length > 1 && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Record {index + 1} of {nonRegisteredData.length}
                  </div>
                )}
                
                {/* Information from family member */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-28">Added by:</span>
                    <span className="font-medium">{data.addedBy.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {formatRelation(data.relation)}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{data.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">IC:</span>
                      <span className="font-medium font-mono">{data.icNumber}</span>
                    </div>
                    
                    {data.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{data.phoneNumber}</span>
                      </div>
                    )}
                    
                    {data.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">{data.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Your submitted information */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Your Submitted Information</h4>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IC:</span>
                  <span className="font-medium font-mono">{formData.icNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{formData.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{formData.address}</span>
                </div>
              </div>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start space-x-3 pt-4 border-t">
              <Checkbox
                id="confirmClaim"
                checked={confirmClaim}
                onCheckedChange={(checked: boolean | "indeterminate") => setConfirmClaim(checked === true)}
              />
              <label
                htmlFor="confirmClaim"
                className="text-sm leading-relaxed cursor-pointer"
              >
                <span className="font-medium">Yes, this is me.</span>{" "}
                I confirm that the IC number <span className="font-mono font-medium">{formData.icNumber}</span> belongs to me, 
                and I want to link my account with the family member(s) who added me.
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleConfirmClaim}
                disabled={!confirmClaim || updateProfileMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm & Link Account
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelClaim}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              By confirming, your profile will be updated and you will be linked as a family member 
              with the person(s) who added you. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>

      <div className="flex flex-col gap-4">
        {/* Onboarding Alert Banner */}
        {isOnboarding && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Complete Your Profile to Continue</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Please fill in your name, IC number (12 digits), phone number, and address below to access the feature you were trying to reach.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>
                  {isOnboarding ? "Complete Your Profile" : "Edit Profile"}
                </CardTitle>
                <CardDescription>
                  {isOnboarding
                    ? "Please fill in your information to continue"
                    : "Update your additional information"}
                </CardDescription>
              </div>
              {!isOnboarding && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup className="gap-6">
              {/* Name Field */}
              <Field className="group">
                <FieldLabel htmlFor="name" className="text-sm font-medium">Full Name <span className="text-destructive">*</span></FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>

              {/* Email Field */}
              <Field className="group">
                <FieldLabel htmlFor="email" className="text-sm font-medium">Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    placeholder="your.email@example.com"
                    className="h-10 pl-10 bg-muted/50 cursor-not-allowed"
                  />
                </div>
              </Field>

              {/* IC Number Field */}
              <Field className="group">
                <FieldLabel htmlFor="icNumber" className="text-sm font-medium">IC Number <span className="text-destructive">*</span></FieldLabel>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="icNumber"
                    type="text"
                    value={formData.icNumber}
                    onChange={(e) => {
                      // Only allow numbers and limit to 12 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12)
                      handleInputChange("icNumber", value)
                    }}
                    placeholder="Enter your IC number"
                    className="h-10 pl-10"
                    maxLength={12}
                  />
                </div>
              </Field>

              {/* Phone Number Field */}
              <Field className="group">
                <FieldLabel htmlFor="phoneNumber" className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></FieldLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="+60123456789"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>

              {/* Address Field */}
              <Field className="group">
                <FieldLabel htmlFor="address" className="text-sm font-medium">Address <span className="text-destructive">*</span></FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter your residential address"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>
            </FieldGroup>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
