import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Filter, Loader2, Plus, Search, Sparkles, Users, Wallet, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Asset } from '@/components/assets/assets-table'

import { AssetsTable } from '@/components/assets/assets-table'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'

interface AssetsResponse {
  assets?: Array<Asset>
  familyAssets?: Array<Asset>
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-MY', {
    currency: 'MYR',
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value)

const formatType = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export const Route = createFileRoute('/app/assets/view/')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const currentUserId = session?.user.id || ''

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/asset')
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      return response.json() as Promise<AssetsResponse>
    },
  })

  const assets = assetsData?.assets || []
  const familyAssets = assetsData?.familyAssets || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/asset/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete asset')
      }
      return response.json()
    },
    onError: (error) => {
      console.error('Error deleting asset:', error)
      toast.error('Failed to delete asset')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Asset deleted successfully')
    },
  })

  const allAssets = useMemo(() => [...assets, ...familyAssets], [assets, familyAssets])

  const typeOptions = useMemo(() => {
    const types = new Set<string>()
    for (const asset of allAssets) {
      types.add(asset.type)
    }
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [allAssets])

  const filterAssets = (items: Array<Asset>) => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((asset) => {
      if (typeFilter !== 'all' && asset.type !== typeFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const ownerName = asset.owner ? asset.owner.name : ''
      return `${asset.name} ${asset.description || ''} ${asset.type} ${ownerName}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }

  const filteredAssets = filterAssets(assets)
  const filteredFamilyAssets = filterAssets(familyAssets)
  const hasActiveFilters = query.trim().length > 0 || typeFilter !== 'all'

  const totalValue = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.value, 0),
    [assets]
  )
  const familyValue = useMemo(
    () => familyAssets.reduce((sum, asset) => sum + asset.value, 0),
    [familyAssets]
  )

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return
    }
    await deleteMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-emerald-50/30">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Asset Portfolio
              </div>
              <CardTitle className="text-xl">Assets</CardTitle>
              <CardDescription className="mt-1">
                Track your assets and review family-owned assets in one place.
              </CardDescription>
            </div>
            <Button onClick={() => router.navigate({ to: '/app/assets/add' })}>
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{assets.length}</p>
              <p className="text-xs text-muted-foreground">My assets</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <WalletCards className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{familyAssets.length}</p>
              <p className="text-xs text-muted-foreground">Family assets</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">My total value</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/15 text-slate-700">
                <Filter className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">{formatCurrency(familyValue)}</p>
              <p className="text-xs text-muted-foreground">Family total value</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Filter Assets</CardTitle>
              <CardDescription>Search by name/description and narrow by asset type.</CardDescription>
            </div>
            {hasActiveFilters ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery('')
                  setTypeFilter('all')
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assets..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>My Assets</CardTitle>
          <CardDescription>Assets you own and can manage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AssetsTable
              data={filteredAssets}
              isLoading={isLoading}
              onDelete={handleDelete}
              currentUserId={currentUserId}
              showOwner={false}
              emptyTitle={hasActiveFilters ? 'No matching assets' : 'No assets yet'}
              emptyDescription={hasActiveFilters ? 'Try changing filters or search terms.' : 'Start by adding your first asset.'}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Assets
          </CardTitle>
          <CardDescription>Assets shared by your linked family members.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetsTable
            data={filteredFamilyAssets}
            isLoading={isLoading}
            currentUserId={currentUserId}
            showOwner={true}
            emptyTitle={hasActiveFilters ? 'No matching family assets' : 'No family assets yet'}
            emptyDescription={
              hasActiveFilters
                ? 'Try changing filters or search terms.'
                : 'Family assets will appear here when available.'
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
