import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AssetsTable } from '@/components/assets/assets-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/assets/view')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch assets
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/asset')
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      return response.json()
    },
  })

  const assets = assetsData?.assets || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/asset/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete asset')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Asset deleted successfully')
    },
    onError: (error) => {
      console.error('Error deleting asset:', error)
      toast.error('Failed to delete asset')
    },
  })

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return
    }
    await deleteMutation.mutateAsync(id)
  }

  const handleAdd = () => {
    router.navigate({ to: '/app/assets/add' })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                Manage your assets
              </CardDescription>
            </div>
            <CardAction>
              <Button onClick={handleAdd} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <AssetsTable
            data={assets}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  )
}
