import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowRight, Bell, FileText, Loader2, Plus, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AgreementStatus } from '@/generated/prisma/enums'
import { authClient } from '@/lib/auth-client'

interface AssetSummary {
  id: number
  name: string
  type: string
  value: number
}

interface AssetsResponse {
  assets?: Array<AssetSummary>
}

interface FamilyMemberSummary {
  id: number | string
}

interface FamilyResponse {
  nonRegistered?: Array<FamilyMemberSummary>
  registered?: Array<FamilyMemberSummary>
}

interface AgreementSummary {
  assetCount: number
  createdAt: string
  id: string
  isBeneficiary: boolean
  isOwner: boolean
  status: AgreementStatus
  title: string
}

interface AgreementsResponse {
  agreements?: Array<AgreementSummary>
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-MY', {
    currency: 'MYR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)

const formatAssetType = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const getAgreementTaskText = (agreement: AgreementSummary) => {
  if (agreement.isOwner && agreement.status === AgreementStatus.DRAFT) {
    return 'Draft: review details and submit for signatures'
  }
  if (agreement.isOwner && agreement.status === AgreementStatus.PENDING_SIGNATURES) {
    return 'Waiting for beneficiary signatures'
  }
  if (agreement.isOwner && agreement.status === AgreementStatus.PENDING_WITNESS) {
    return 'Ready for witness verification'
  }
  if (agreement.isBeneficiary && agreement.status === AgreementStatus.PENDING_SIGNATURES) {
    return 'Your signature is required'
  }
  return 'Open agreement details'
}

export const Route = createFileRoute('/app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const { data: assetsData, isLoading: isAssetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/asset')
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      return response.json() as Promise<AssetsResponse>
    },
  })

  const userId = sessionData?.user.id
  const { data: familyData, isLoading: isFamilyLoading } = useQuery({
    enabled: !!userId,
    queryKey: ['familyMembers', userId],
    queryFn: async () => {
      if (!userId) return null
      const response = await fetch(`/api/family?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch family members')
      }
      return response.json() as Promise<FamilyResponse>
    },
  })

  const { data: agreementsData, isLoading: isAgreementsLoading } = useQuery({
    queryKey: ['agreements'],
    queryFn: async () => {
      const response = await fetch('/api/agreement')
      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }
      return response.json() as Promise<AgreementsResponse>
    },
  })

  const isLoading =
    isSessionLoading ||
    isAssetsLoading ||
    isFamilyLoading ||
    isAgreementsLoading

  const assets = assetsData?.assets || []
  const agreements = agreementsData?.agreements || []
  const familyMembers = [
    ...(familyData?.registered || []),
    ...(familyData?.nonRegistered || []),
  ]

  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)
  const ownerAgreements = agreements.filter((agreement) => agreement.isOwner)
  const pendingActions = agreements.filter((agreement) =>
    (agreement.isOwner &&
      [
        AgreementStatus.DRAFT,
        AgreementStatus.PENDING_SIGNATURES,
        AgreementStatus.PENDING_WITNESS,
      ].includes(agreement.status)) ||
    (agreement.isBeneficiary &&
      agreement.status === AgreementStatus.PENDING_SIGNATURES)
  )
  const recentAssets = [...assets]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
  const recentAgreements = [...agreements]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-emerald-50/30">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">
                Welcome{sessionData?.user.name ? `, ${sessionData.user.name}` : ''}
              </CardTitle>
              <CardDescription className="mt-1">
                Track your estate planning progress and complete pending actions.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/app/agreement/create' })}>
                <Plus className="h-4 w-4" />
                New Agreement
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => router.navigate({ to: '/app/assets/add' })}>
                <Plus className="h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="col-span-2 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm lg:col-span-1">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">{formatCurrency(totalAssetValue)}</p>
              <p className="text-xs text-muted-foreground">{assets.length} total assets</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{agreements.length}</p>
              <p className="text-xs text-muted-foreground">{ownerAgreements.length} as owner</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <Bell className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{pendingActions.length}</p>
              <p className="text-xs text-muted-foreground">Pending actions</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/15 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{familyMembers.length}</p>
              <p className="text-xs text-muted-foreground">Family members linked</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="order-2 border-border/70 lg:order-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Action Required
            </CardTitle>
            <CardDescription>Agreements that need your attention now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No urgent actions. You are up to date.
              </div>
            ) : (
              pendingActions.slice(0, 5).map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{agreement.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getAgreementTaskText(agreement)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      router.navigate({
                        params: { id: agreement.id },
                        to: '/app/agreement/view/$id',
                      })
                    }
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="order-1 border-border/70 lg:order-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4" />
              Quick Links
            </CardTitle>
            <CardDescription>Jump to core workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/app/assets/view"
              className="flex items-center justify-between rounded-lg border border-border/70 p-2.5 text-sm hover:bg-muted/40"
            >
              <span>Manage Assets</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/app/family/view"
              className="flex items-center justify-between rounded-lg border border-border/70 p-2.5 text-sm hover:bg-muted/40"
            >
              <span>Update Family</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/app/agreement/view"
              className="flex items-center justify-between rounded-lg border border-border/70 p-2.5 text-sm hover:bg-muted/40"
            >
              <span>View Agreements</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/app/profile/view"
              className="flex items-center justify-between rounded-lg border border-border/70 p-2.5 text-sm hover:bg-muted/40"
            >
              <span>Profile</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Top Assets
            </CardTitle>
            <CardDescription>Your highest value assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAssets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No assets yet.
              </div>
            ) : (
              recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{asset.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatAssetType(asset.type)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(asset.value)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Recent Agreements
            </CardTitle>
            <CardDescription>Most recently created agreements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAgreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No agreements yet.
              </div>
            ) : (
              recentAgreements.map((agreement) => (
                <button
                  key={agreement.id}
                  onClick={() =>
                    router.navigate({
                      params: { id: agreement.id },
                      to: '/app/agreement/view/$id',
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 p-3 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{agreement.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {agreement.assetCount} assets • {formatDate(agreement.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
