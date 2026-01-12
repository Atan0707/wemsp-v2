import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FamilyMembersTable } from '@/components/family/family-members-table'
import { FamilyMember } from '@/types/family'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/family')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const userId = session?.user?.id

  // Fetch family members
  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ['familyMembers', userId],
    queryFn: async () => {
      if (!userId) return null
      const response = await fetch(
        `/api/family?userId=${userId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch family members')
      }
      return response.json()
    },
    enabled: !!userId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string | number }) => {
      const response = await fetch(
        `/api/family?type=${type}&id=${id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        throw new Error('Failed to delete family member')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers', userId] })
      toast.success('Family member deleted successfully')
    },
    onError: (error) => {
      console.error('Error deleting family member:', error)
      toast.error('Failed to delete family member')
    },
  })

  // Combine registered and non-registered members
  const familyMembers: FamilyMember[] = []
  if (familyData?.registered) {
    familyMembers.push(...familyData.registered)
  }
  if (familyData?.nonRegistered) {
    familyMembers.push(...familyData.nonRegistered)
  }

  const handleDelete = async (type: string, id: string | number) => {
    if (!confirm('Are you sure you want to delete this family member?')) {
      return
    }
    await deleteMutation.mutateAsync({ type, id })
  }

  const handleAdd = () => {
    router.navigate({ to: '/app/family/add' })
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Family Members</CardTitle>
              <CardDescription>
                Manage your family relationships
              </CardDescription>
            </div>
            <CardAction>
              <Button onClick={handleAdd} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Family Member
              </Button>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <FamilyMembersTable
            data={familyMembers}
            isLoading={familyLoading}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  )
}
