import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Phone, MapPin, IdCard, Loader2 } from "lucide-react"
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
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
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
        name: user?.name || "",
      })
      return response
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      queryClient.invalidateQueries({ queryKey: ["session"] })
      router.navigate({ to: "/app/profile" })
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
    router.navigate({ to: "/app/profile" })
  }

  if (isLoading) {
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>
                Update your additional information
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
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
  )
}
