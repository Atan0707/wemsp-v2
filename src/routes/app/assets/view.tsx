import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/app/assets/view')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

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
          <p className="text-sm text-muted-foreground">No assets yet. Click "Add Asset" to create one.</p>
        </CardContent>
      </Card>
    </div>
  )
}
