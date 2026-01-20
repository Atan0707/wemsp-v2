import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FieldGroup,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  DollarSign,
  FileText,
  ExternalLink,
  ArrowLeft,
  Tag,
  Calendar,
  User,
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import type { Asset } from '@/components/assets/assets-table'

export const Route = createFileRoute('/app/assets/view/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { id } = Route.useParams()

  // Fetch session to get current user ID
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const currentUserId = session?.user?.id || ''

  const { data: assetData, isLoading } = useQuery<{ asset: Asset }>({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await fetch(`/api/asset/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch asset')
      }
      return response.json()
    },
    enabled: !!id,
  })

  const asset = assetData?.asset

  // Check if current user is the owner
  const isOwner = asset && (!asset.owner || asset.owner.id === currentUserId)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatAssetType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'PROPERTY':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'VEHICLE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'INVESTMENT':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
        <p className="text-muted-foreground max-w-md mb-4">
          The asset you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.navigate({ to: '/app/assets' })} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>
                {isOwner ? 'View your asset information' : 'View family member asset'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button
                  onClick={() => router.navigate({ to: `/app/assets/edit/${id}` as any })}
                  variant="default"
                >
                  Edit Asset
                </Button>
              )}
              <Button
                onClick={() => router.navigate({ to: '/app/assets' })}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Asset Name & Type Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{asset.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={getAssetTypeColor(asset.type)}>
                  {formatAssetType(asset.type)}
                </Badge>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border-primary/20">
                  <Calendar className="h-3 w-3" />
                  {formatDate(asset.createdAt)}
                </span>
                {!isOwner && asset.owner && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    <User className="h-3 w-3" />
                    {asset.owner.name}
                    {asset.relationship && ` (${asset.relationship.charAt(0) + asset.relationship.slice(1).toLowerCase()})`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fields */}
          <FieldGroup className="gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Asset Name</p>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={asset.name}
                  disabled
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Asset Type</p>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={formatAssetType(asset.type)}
                  disabled
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Value</p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={formatCurrency(asset.value)}
                  disabled
                  className="h-10 pl-10 bg-muted/50 font-semibold"
                />
              </div>
            </div>

            {asset.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={asset.description}
                    disabled
                    className="h-10 pl-10 bg-muted/50"
                  />
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Created Date</p>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={formatDate(asset.createdAt)}
                  disabled
                  className="h-10 pl-10 bg-muted/50"
                />
              </div>
            </div>

            {asset.documentUrl && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Document</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(asset.documentUrl!, '_blank')}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Document
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </div>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
