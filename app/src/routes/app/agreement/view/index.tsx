import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Clock3, Crown, FileText, Filter, Loader2, Plus, Search, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { AgreementStatus, DistributionType } from '@/generated/prisma/enums'
import { authClient } from '@/lib/auth-client'
import { getStatusColor } from '@/lib/agreement-workflow'

interface AgreementListItem {
  assetCount: number
  beneficiaryCount: number
  createdAt: string
  description: string | null
  distributionType: DistributionType
  id: string
  isBeneficiary: boolean
  isOwner: boolean
  ownerHasSigned: boolean
  signedBeneficiaryCount: number
  status: AgreementStatus
  title: string
  witnessedAt: string | null
}

interface AgreementsResponse {
  agreements?: Array<AgreementListItem>
}

const getStatusLabel = (status: AgreementStatus): string => {
  const labels: Record<AgreementStatus, string> = {
    ACTIVE: 'Active',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    DRAFT: 'Draft',
    EXPIRED: 'Expired',
    PENDING_SIGNATURES: 'Pending Signatures',
    PENDING_WITNESS: 'Pending Witness',
  }
  return labels[status] || status
}

const getDistributionTypeLabel = (type: DistributionType): string => {
  const labels: Record<DistributionType, string> = {
    FARAID: 'Faraid',
    HIBAH: 'Hibah',
    WAKAF: 'Wakaf',
    WASIYYAH: 'Wasiyyah',
  }
  return labels[type] || type
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const getSignatureProgress = (agreement: AgreementListItem): string => {
  const signed = agreement.signedBeneficiaryCount || 0
  const total = agreement.beneficiaryCount || 0
  const ownerSigned = agreement.ownerHasSigned
  const witnessed = !!agreement.witnessedAt

  const parts: Array<string> = []
  if (ownerSigned) parts.push('Owner signed')
  parts.push(`Beneficiaries ${signed}/${total}`)
  if (witnessed) parts.push('Witnessed')
  return parts.join(' • ')
}

export const Route = createFileRoute('/app/agreement/view/')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'beneficiary' | 'owner'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AgreementStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | DistributionType>('all')

  useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const { data: agreementsData, isLoading } = useQuery({
    queryKey: ['agreements'],
    queryFn: async () => {
      const response = await fetch('/api/agreement')
      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }
      return response.json() as Promise<AgreementsResponse>
    },
  })

  const agreements = agreementsData?.agreements || []

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agreement/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete agreement')
      }
      return response.json()
    },
    onError: (error) => {
      console.error('Error deleting agreement:', error)
      toast.error('Failed to delete agreement')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement deleted successfully')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agreement/${id}/status`, {
        body: JSON.stringify({ action: 'cancel' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to cancel agreement')
      }
      return response.json()
    },
    onError: (error) => {
      console.error('Error cancelling agreement:', error)
      toast.error('Failed to cancel agreement')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement cancelled successfully')
    },
  })

  const filteredAgreements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return agreements.filter((agreement) => {
      if (roleFilter === 'owner' && !agreement.isOwner) return false
      if (roleFilter === 'beneficiary' && !agreement.isBeneficiary) return false
      if (statusFilter !== 'all' && agreement.status !== statusFilter) return false
      if (typeFilter !== 'all' && agreement.distributionType !== typeFilter) return false

      if (!normalizedQuery) return true
      return `${agreement.title} ${agreement.description || ''}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [agreements, query, roleFilter, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const drafts = agreements.filter((agreement) => agreement.status === AgreementStatus.DRAFT).length
    const active = agreements.filter((agreement) => agreement.status === AgreementStatus.ACTIVE).length
    const pending = agreements.filter((agreement) =>
      [AgreementStatus.PENDING_SIGNATURES, AgreementStatus.PENDING_WITNESS].includes(agreement.status)
    ).length
    const ownerCount = agreements.filter((agreement) => agreement.isOwner).length
    return { active, drafts, ownerCount, pending, total: agreements.length }
  }, [agreements])

  const hasActiveFilters =
    query.trim().length > 0 ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all'

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agreement? This action cannot be undone.')) {
      return
    }
    await deleteMutation.mutateAsync(id)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this agreement?')) {
      return
    }
    await cancelMutation.mutateAsync(id)
  }

  const renderRoleBadge = (agreement: AgreementListItem) => {
    if (agreement.isOwner) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Crown className="h-3 w-3" />
          Owner
        </Badge>
      )
    }
    if (agreement.isBeneficiary) {
      return (
        <Badge variant="outline" className="gap-1">
          <User className="h-3 w-3" />
          Beneficiary
        </Badge>
      )
    }
    return <Badge variant="outline">Viewer</Badge>
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-emerald-50/30">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Agreements
              </CardTitle>
              <CardDescription className="mt-1">
                Create and track Islamic asset distribution agreements.
              </CardDescription>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/app/agreement/create' })}>
              <Plus className="h-4 w-4" />
              New Agreement
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="col-span-2 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm lg:col-span-1">
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total agreements</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <p className="text-2xl font-semibold">{stats.ownerCount}</p>
              <p className="text-xs text-muted-foreground">As owner</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <p className="text-2xl font-semibold">{stats.drafts}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <p className="text-2xl font-semibold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending actions</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <p className="text-2xl font-semibold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Filter Agreements</CardTitle>
              <CardDescription>Search and filter by role, status, and distribution type.</CardDescription>
            </div>
            {hasActiveFilters ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                  setTypeFilter('all')
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_200px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or description..."
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: 'all' | 'beneficiary' | 'owner') => setRoleFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="beneficiary">Beneficiary</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: 'all' | AgreementStatus) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {Object.values(AgreementStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value: 'all' | DistributionType) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Distribution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.values(DistributionType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getDistributionTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
              <Filter className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {hasActiveFilters ? 'No agreements match your filters' : 'No agreements yet'}
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try changing your filters or search terms.'
                  : 'Create your first asset distribution agreement to get started.'}
              </p>
              {!hasActiveFilters ? (
                <Button className="mt-4" onClick={() => router.navigate({ to: '/app/agreement/create' })}>
                  <Plus className="h-4 w-4" />
                  Create Agreement
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredAgreements.map((agreement) => {
                  const statusColors = getStatusColor(agreement.status)
                  const canDelete = agreement.isOwner && agreement.status === AgreementStatus.DRAFT
                  const canCancel = agreement.isOwner &&
                    [AgreementStatus.DRAFT, AgreementStatus.PENDING_SIGNATURES, AgreementStatus.PENDING_WITNESS].includes(agreement.status)

                  return (
                    <div key={agreement.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => router.navigate({ to: `/app/agreement/view/$id`, params: { id: agreement.id } })}
                          className="min-w-0 text-left"
                        >
                          <p className="truncate font-medium hover:text-primary">{agreement.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{agreement.description || 'No description'}</p>
                        </button>
                        {renderRoleBadge(agreement)}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                          {getStatusLabel(agreement.status)}
                        </span>
                        <Badge variant="outline">{getDistributionTypeLabel(agreement.distributionType)}</Badge>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">{getSignatureProgress(agreement)}</p>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Assets: {agreement.assetCount}</span>
                        <span>Created: {formatDate(agreement.createdAt)}</span>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => router.navigate({ to: `/app/agreement/view/$id`, params: { id: agreement.id } })}
                        >
                          View
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive sm:w-auto"
                            onClick={() => handleDelete(agreement.id)}
                          >
                            Delete
                          </Button>
                        ) : null}
                        {canCancel ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive sm:w-auto"
                            onClick={() => handleCancel(agreement.id)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-border/70 md:block">
                <table className="w-full">
                  <thead className="bg-muted/35">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Progress</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Assets</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgreements.map((agreement) => {
                      const statusColors = getStatusColor(agreement.status)
                      const canDelete = agreement.isOwner && agreement.status === AgreementStatus.DRAFT
                      const canCancel = agreement.isOwner &&
                        [AgreementStatus.DRAFT, AgreementStatus.PENDING_SIGNATURES, AgreementStatus.PENDING_WITNESS].includes(agreement.status)

                      return (
                        <tr key={agreement.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 align-top">
                            <div>
                              <button
                                onClick={() => router.navigate({ to: `/app/agreement/view/$id`, params: { id: agreement.id } })}
                                className="font-medium hover:text-primary hover:underline"
                              >
                                {agreement.title}
                              </button>
                              {agreement.description ? (
                                <p className="max-w-xs truncate text-sm text-muted-foreground">{agreement.description}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">{renderRoleBadge(agreement)}</td>
                          <td className="px-4 py-3 align-top text-sm">{getDistributionTypeLabel(agreement.distributionType)}</td>
                          <td className="px-4 py-3 align-top">
                            <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                              {getStatusLabel(agreement.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-sm text-muted-foreground">{getSignatureProgress(agreement)}</td>
                          <td className="px-4 py-3 align-top text-sm">{agreement.assetCount}</td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.navigate({ to: `/app/agreement/view/$id`, params: { id: agreement.id } })}
                              >
                                View
                              </Button>
                              {canDelete ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(agreement.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Delete
                                </Button>
                              ) : null}
                              {canCancel ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancel(agreement.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Cancel
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isLoading && filteredAgreements.length > 0 ? (
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Showing {filteredAgreements.length} of {agreements.length} agreements
        </div>
      ) : null}
    </div>
  )
}
