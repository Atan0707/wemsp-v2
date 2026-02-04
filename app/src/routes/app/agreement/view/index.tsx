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
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Loader2, Crown, User } from 'lucide-react'
import { toast } from 'sonner'
import { AgreementStatus, DistributionType } from '@/generated/prisma/enums'
import { getStatusColor } from '@/lib/agreement-workflow'

export const Route = createFileRoute('/app/agreement/view/')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch session
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })


  // Fetch agreements
  const { data: agreementsData, isLoading } = useQuery({
    queryKey: ['agreements'],
    queryFn: async () => {
      const response = await fetch('/api/agreement')
      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }
      return response.json()
    },
  })

  const agreements = agreementsData?.agreements || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agreement/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete agreement')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement deleted successfully')
    },
    onError: (error) => {
      console.error('Error deleting agreement:', error)
      toast.error('Failed to delete agreement')
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agreement/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!response.ok) {
        throw new Error('Failed to cancel agreement')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement cancelled successfully')
    },
    onError: (error) => {
      console.error('Error cancelling agreement:', error)
      toast.error('Failed to cancel agreement')
    },
  })

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

  const handleAdd = () => {
    router.navigate({ to: '/app/agreement/create' })
  }

  const handleView = (id: string) => {
    router.navigate({ to: `/app/agreement/view/$id`, params: { id } })
  }

  const getStatusLabel = (status: AgreementStatus): string => {
    const labels: Record<AgreementStatus, string> = {
      DRAFT: 'Draft',
      PENDING_SIGNATURES: 'Pending Signatures',
      PENDING_WITNESS: 'Pending Witness',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
    }
    return labels[status] || status
  }

  const getDistributionTypeLabel = (type: DistributionType): string => {
    const labels: Record<DistributionType, string> = {
      FARAID: 'Faraid',
      HIBAH: 'Hibah (Gift)',
      WASIYYAH: 'Wasiyyah (Will)',
      WAKAF: 'Wakaf (Endowment)',
    }
    return labels[type] || type
  }

  const getSignatureProgress = (agreement: any): string => {
    const signed = agreement.signedBeneficiaryCount || 0
    const total = agreement.beneficiaryCount || 0
    const ownerSigned = agreement.ownerHasSigned
    const witnessed = !!agreement.witnessedAt

    let parts: string[] = []
    if (ownerSigned) parts.push('Owner ✓')
    parts.push(`Beneficiaries: ${signed}/${total}`)
    if (witnessed) parts.push('Witness ✓')

    return parts.join(' | ')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Asset Distribution Agreements
              </CardTitle>
              <CardDescription>
                Create and manage Islamic asset distribution agreements
              </CardDescription>
            </div>
            <CardAction>
              <Button onClick={handleAdd} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Agreement
              </Button>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agreements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agreements yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first asset distribution agreement to get started
              </p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agreement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Your Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Progress
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Assets
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((agreement: any) => {
                    const statusColors = getStatusColor(agreement.status)
                    const isOwner = agreement.isOwner
                    const isBeneficiary = agreement.isBeneficiary

                    return (
                      <tr key={agreement.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{agreement.title}</div>
                            {agreement.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {agreement.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isOwner ? (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="h-3 w-3" />
                              Owner
                            </Badge>
                          ) : isBeneficiary ? (
                            <Badge variant="outline" className="gap-1">
                              <User className="h-3 w-3" />
                              Beneficiary
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unknown</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {getDistributionTypeLabel(agreement.distributionType)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                          >
                            {getStatusLabel(agreement.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {getSignatureProgress(agreement)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {agreement.assetCount || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(agreement.id)}
                            >
                              View
                            </Button>
                            {isOwner && agreement.status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(agreement.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Delete
                              </Button>
                            )}
                            {isOwner && ['PENDING_SIGNATURES', 'PENDING_WITNESS'].includes(agreement.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(agreement.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
