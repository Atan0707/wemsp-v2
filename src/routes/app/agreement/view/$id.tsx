import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { AgreementStatus, DistributionType } from '@/generated/prisma/enums'
import { getStatusColor, getStatusDescription, canUserSign } from '@/lib/agreement-workflow'

export const Route = createFileRoute('/app/agreement/view/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = Route.useParams()

  // Fetch session
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  // Fetch agreement
  const { data: agreementData, isLoading } = useQuery({
    queryKey: ['agreement', id],
    queryFn: async () => {
      const response = await fetch(`/api/agreement/${id}`)
      if (!response.ok) throw new Error('Failed to fetch agreement')
      return response.json()
    },
    enabled: !!id,
  })

  const agreement = agreementData?.agreement

  // Sign as owner mutation
  const signOwnerMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const response = await fetch(`/api/agreement/${id}/sign/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign agreement')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', id] })
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement signed successfully')
    },
    onError: (error: Error) => {
      console.error('Error signing agreement:', error)
      toast.error(error.message || 'Failed to sign agreement')
    },
  })

  // Sign as beneficiary mutation
  const signBeneficiaryMutation = useMutation({
    mutationFn: async ({ beneficiaryId, accept }: { beneficiaryId: string; accept: boolean }) => {
      const response = await fetch(`/api/agreement/${id}/sign/beneficiary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryId, accept }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign agreement')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', id] })
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Signature recorded successfully')
    },
    onError: (error: Error) => {
      console.error('Error signing agreement:', error)
      toast.error(error.message || 'Failed to sign agreement')
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/agreement/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel agreement')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', id] })
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement cancelled successfully')
    },
    onError: (error: Error) => {
      console.error('Error cancelling agreement:', error)
      toast.error(error.message || 'Failed to cancel agreement')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Agreement not found</h3>
        <Button onClick={() => router.navigate({ to: '/app/agreement/view' })}>
          Back to Agreements
        </Button>
      </div>
    )
  }

  const isOwner = session?.user?.id === agreement.owner.id
  const signingPermissions = canUserSign(
    session?.user?.id || '',
    agreement.owner.id,
    agreement.status,
    agreement.beneficiaries.some((b: any) =>
      b.familyMember?.user?.id === session?.user?.id
    ),
    false, // isAdmin - would need admin check
    false  // isBeneficiary - checked above
  )

  const statusColors = getStatusColor(agreement.status)

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

  const handleSignAsOwner = (submit = false) => {
    signOwnerMutation.mutate(submit)
  }

  const handleSignAsBeneficiary = (beneficiaryId: string, accept = true) => {
    signBeneficiaryMutation.mutate({ beneficiaryId, accept })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.navigate({ to: '/app/agreement/view' })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agreements
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{agreement.title}</CardTitle>
              {agreement.description && (
                <CardDescription className="mt-2">{agreement.description}</CardDescription>
              )}
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
            >
              {getStatusLabel(agreement.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Distribution Type:</span>
              <span className="ml-2 font-medium">{getDistributionTypeLabel(agreement.distributionType)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 font-medium">{getStatusLabel(agreement.status)}</span>
            </div>
            {agreement.effectiveDate && (
              <div>
                <span className="text-muted-foreground">Effective Date:</span>
                <span className="ml-2">{new Date(agreement.effectiveDate).toLocaleDateString()}</span>
              </div>
            )}
            {agreement.expiryDate && (
              <div>
                <span className="text-muted-foreground">Expiry Date:</span>
                <span className="ml-2">{new Date(agreement.expiryDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">{getStatusDescription(agreement.status)}</p>
        </CardContent>
      </Card>

      {/* Signature Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signature Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Owner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {agreement.ownerSignature?.hasSigned ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <div className="font-medium">Owner (You)</div>
                  <div className="text-sm text-muted-foreground">{agreement.owner.name}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {agreement.ownerSignature?.hasSigned
                  ? `Signed on ${new Date(agreement.ownerSignature.signedAt).toLocaleDateString()}`
                  : 'Pending'}
              </div>
            </div>

            {/* Beneficiaries */}
            {agreement.beneficiaries.map((beneficiary: any) => (
              <div key={beneficiary.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {beneficiary.hasSigned && beneficiary.isAccepted !== false ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : beneficiary.isAccepted === false ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <div className="font-medium">{beneficiary.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {beneficiary.relation} • {beneficiary.sharePercentage}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {beneficiary.hasSigned && beneficiary.isAccepted !== false
                    ? `Signed on ${new Date(beneficiary.signedAt).toLocaleDateString()}`
                    : beneficiary.isAccepted === false
                    ? 'Rejected'
                    : 'Pending'}
                </div>
              </div>
            ))}

            {/* Witness */}
            {agreement.status !== 'DRAFT' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {agreement.witnessedAt ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <div className="font-medium">Admin Witness</div>
                    <div className="text-sm text-muted-foreground">
                      {agreement.witness ? agreement.witness.name : 'Pending assignment'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {agreement.witnessedAt
                    ? `Witnessed on ${new Date(agreement.witnessedAt).toLocaleDateString()}`
                    : 'Pending'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Allocated Assets ({agreement.assets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agreement.assets.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.asset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.asset.type} • ${item.asset.value.toLocaleString()}
                  </div>
                </div>
                {item.allocatedPercentage && (
                  <div className="text-sm font-medium">{item.allocatedPercentage}%</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Beneficiaries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Beneficiaries ({agreement.beneficiaries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agreement.beneficiaries.map((beneficiary: any) => (
              <div key={beneficiary.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{beneficiary.name}</div>
                  <div className="text-sm text-muted-foreground">{beneficiary.relation}</div>
                </div>
                <div className="font-medium">{beneficiary.sharePercentage}%</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right text-sm font-medium">
            Total: {agreement.beneficiaries.reduce((sum: number, b: any) => sum + b.sharePercentage, 0)}%
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Created on {new Date(agreement.createdAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              {/* Owner actions */}
              {isOwner && agreement.status === 'DRAFT' && !agreement.ownerSignature?.hasSigned && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSignAsOwner(false)}
                    disabled={signOwnerMutation.isPending}
                  >
                    Sign
                  </Button>
                  <Button
                    onClick={() => handleSignAsOwner(true)}
                    disabled={signOwnerMutation.isPending}
                  >
                    Sign & Submit
                  </Button>
                </>
              )}

              {/* Cancel button */}
              {isOwner && ['DRAFT', 'PENDING_SIGNATURES', 'PENDING_WITNESS'].includes(agreement.status) && (
                <Button
                  variant="destructive"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  Cancel Agreement
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
