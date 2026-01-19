import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"
import { Phone, MapPin, IdCard, Loader2, AlertTriangle } from "lucide-react"
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
  const searchParams = Route.useSearch()
  const [formData, setFormData] = useState({
    icNumber: "",
    address: "",
    phoneNumber: "",
  })
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string | undefined>(undefined)
  const [isOnboarding, setIsOnboarding] = useState(false)

  // Fetch session data
  const { data: session, isPending } = authClient.useSession()

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

  // Show dialog when in onboarding mode - delay slightly to ensure session is loaded
  useEffect(() => {
    if (isOnboarding && user && !isPending) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        console.log('Showing onboarding dialog...')
        setShowOnboardingDialog(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOnboarding, user, isPending])

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        icNumber: (user as any).icNumber || "",
        address: (user as any).address || "",
        phoneNumber: (user as any).phoneNumber || "",
      })
    }
  }, [user])

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.updateUser({
        name: user?.name,
        image: user?.image,
        icNumber: formData.icNumber,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
      } as {
        name?: string
        image?: string | null
        icNumber?: string
        address?: string
        phoneNumber?: string
      })
      return response
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      // Close dialog and redirect to original path if in onboarding mode
      if (isOnboarding) {
        setShowOnboardingDialog(false)
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

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate()
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
                Please fill in your IC number, phone number, and address below to access the feature you were trying to reach.
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
                    placeholder="Enter your IC number"
                    className="h-10 pl-10"
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
                    placeholder="+60 12-345-6789"
                    className="h-10 pl-10"
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
