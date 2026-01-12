import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FamilyRelation } from '@/lib/family'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/family/add')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const [memberType, setMemberType] = useState<'registered' | 'non-registered'>('registered')

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      type: string
      memberData: any
    }) => {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to add family member')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Family member added successfully')
      router.navigate({ to: '/app/family' })
    },
    onError: (error: Error) => {
      console.error('Error adding family member:', error)
      toast.error(error.message || 'Failed to add family member')
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (memberType === 'registered') {
      const familyMemberUserId = formData.get('familyMemberUserId') as string
      const relation = formData.get('relation') as string

      if (!familyMemberUserId || !relation) {
        toast.error('Please fill in all required fields')
        return
      }

      await createMutation.mutateAsync({
        type: 'registered',
        memberData: { familyMemberUserId, relation },
      })
    } else {
      const name = formData.get('name') as string
      const icNumber = formData.get('icNumber') as string
      const relation = formData.get('relation') as string
      const address = formData.get('address') as string
      const phoneNumber = formData.get('phoneNumber') as string

      if (!name || !icNumber || !relation) {
        toast.error('Please fill in all required fields')
        return
      }

      await createMutation.mutateAsync({
        type: 'non-registered',
        memberData: { name, icNumber, relation, address, phoneNumber },
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Family Member</CardTitle>
          <CardDescription>Add a new family member to your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={memberType} onValueChange={(v) => setMemberType(v as any)}>
            <TabsList>
              <TabsTrigger value="registered">Registered User</TabsTrigger>
              <TabsTrigger value="non-registered">Non-Registered</TabsTrigger>
            </TabsList>

            <TabsContent value="registered">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="familyMemberUserId">User ID *</Label>
                  <Input
                    id="familyMemberUserId"
                    name="familyMemberUserId"
                    placeholder="Enter user ID"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the ID of the registered user you want to add as a family member.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="relation-registered">Relationship *</Label>
                  <Select name="relation" required>
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
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.navigate({ to: '/app/family' })}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Family Member
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="non-registered">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="icNumber">IC Number *</Label>
                  <Input
                    id="icNumber"
                    name="icNumber"
                    placeholder="Enter IC number"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="relation-non-registered">Relationship *</Label>
                  <Select name="relation" required>
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
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Enter address"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.navigate({ to: '/app/family' })}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Family Member
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
