import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FamilyRelation } from '@/lib/family-types'
import { FamilyMember, isNonRegisteredFamilyMember } from '@/types/family'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/family/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  // @ts-ignore - TanStack Router state access
  const member = router.state.location.state?.member as FamilyMember | undefined

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ type, id, data }: {
      type: string
      id: string
      data: any
    }) => {
      const response = await fetch(
        `/api/family?type=${type}&id=${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update family member')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Family member updated successfully')
      router.navigate({ to: '/app/family' })
    },
    onError: (error: Error) => {
      console.error('Error updating family member:', error)
      toast.error(error.message || 'Failed to update family member')
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!member) return

    if (isNonRegisteredFamilyMember(member)) {
      const name = formData.get('name') as string
      const icNumber = formData.get('icNumber') as string
      const relation = formData.get('relation') as string
      const address = formData.get('address') as string
      const phoneNumber = formData.get('phoneNumber') as string

      if (!name || !icNumber || !relation) {
        toast.error('Please fill in all required fields')
        return
      }

      await updateMutation.mutateAsync({
        type: 'non-registered',
        id: member.id.toString(),
        data: { name, icNumber, relation, address, phoneNumber },
      })
    } else {
      const relation = formData.get('relation') as string

      if (!relation) {
        toast.error('Please select a relationship')
        return
      }

      await updateMutation.mutateAsync({
        type: 'registered',
        id: member.familyMemberUserId,
        data: { relation },
      })
    }
  }

  if (!member) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">No family member selected.</p>
              <Button
                variant="outline"
                onClick={() => router.navigate({ to: '/app/family' })}
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Family Members
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Family Member</CardTitle>
          <CardDescription>
            Update family member information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isNonRegisteredFamilyMember(member) ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={member.name}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="icNumber">IC Number *</Label>
                  <Input
                    id="icNumber"
                    name="icNumber"
                    defaultValue={member.icNumber}
                    placeholder="Enter IC number"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="relation-non-registered">Relationship *</Label>
                  <Select name="relation" defaultValue={member.relation} required>
                    <SelectTrigger id="relation-non-registered">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FamilyRelation).map((relation) => (
                        <SelectItem key={relation} value={relation}>
                          {relation.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={member.phoneNumber || ''}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={member.address || ''}
                    placeholder="Enter address"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Name</Label>
                  <Input
                    value={member.name}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Registered users cannot have their name changed.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input
                    value={member.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="relation-registered">Relationship *</Label>
                  <Select name="relation" defaultValue={member.relation} required>
                    <SelectTrigger id="relation-registered">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FamilyRelation).map((relation) => (
                        <SelectItem key={relation} value={relation}>
                          {relation.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Only the relationship can be modified for registered users.
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.navigate({ to: '/app/family' })}
                disabled={updateMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
