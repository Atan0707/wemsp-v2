import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminToken, verifyAdminSession, getAuthHeaders } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, FileText, Package, Users } from 'lucide-react'
import { toast } from 'sonner'
import { endpoint } from '@/lib/config'

interface User {
  id: string
  name: string
  email: string
}

interface Asset {
  id: number
  name: string
  type: string
  value: number
}

interface AgreementAsset {
  id: string
  assetId: number
  allocatedValue: number
  allocatedPercentage: number
  notes: string | null
  asset: Asset
}

interface Beneficiary {
  id: string
  sharePercentage: number
  shareDescription: string | null
  hasSigned: boolean
  isAccepted: boolean
  familyMember: {
    familyMemberUser: {
      name: string
    } | null
    relation: string
  } | null
  nonRegisteredFamilyMember: {
    name: string
    relation: string
  } | null
}

interface AgreementDetail {
  id: string
  title: string
  description: string | null
  status: string
  distributionType: string
  effectiveDate: string | null
  expiryDate: string | null
  createdAt: string
  updatedAt: string
  owner: User
  witness: User | null
  assets: AgreementAsset[]
  beneficiaries: Beneficiary[]
}

export const Route = createFileRoute('/app/agreements/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [admin, setAdmin] = useState<{ name: string } | null>(null)
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAdminToken()
      if (!token) {
        navigate({ to: '/login' })
        return
      }

      const adminData = await verifyAdminSession()
      if (!adminData) {
        navigate({ to: '/login' })
        return
      }

      setAdmin({ name: adminData.name })
      setIsChecking(false)
      fetchAgreement()
    }

    checkAuth()
  }, [navigate, id])

  const fetchAgreement = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${endpoint}/api/admin/agreements/${id}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch agreement')
      }

      const data = await response.json()
      setAgreement(data.agreement)
    } catch (error) {
      toast.error('Failed to load agreement')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'PENDING_SIGNATURES': return 'outline'
      case 'PENDING_WITNESS': return 'default'
      case 'ACTIVE': return 'default'
      case 'COMPLETED': return 'default'
      case 'CANCELLED': return 'destructive'
      case 'EXPIRED': return 'secondary'
      default: return 'secondary'
    }
  }

  if (isChecking) {
    return <div>Loading...</div>
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin?.name || 'Admin'} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/app/agreements' })}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agreements
          </Button>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !agreement ? (
            <div className="text-center text-muted-foreground py-12">
              Agreement not found
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{agreement.title}</h1>
                  <p className="text-muted-foreground mt-1">
                    Created on {new Date(agreement.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(agreement.status)} className="text-sm">
                  {agreement.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Description */}
              {agreement.description && (
                <div className="rounded-md border p-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{agreement.description}</p>
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Distribution Type</p>
                  <p className="font-semibold">{agreement.distributionType}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-semibold">{agreement.owner.name}</p>
                  <p className="text-sm text-muted-foreground">{agreement.owner.email}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Witness</p>
                  <p className="font-semibold">{agreement.witness?.name || 'Not assigned'}</p>
                  {agreement.witness && (
                    <p className="text-sm text-muted-foreground">{agreement.witness.email}</p>
                  )}
                </div>
                {agreement.effectiveDate && (
                  <div className="rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">Effective Date</p>
                    <p className="font-semibold">{new Date(agreement.effectiveDate).toLocaleDateString()}</p>
                  </div>
                )}
                {agreement.expiryDate && (
                  <div className="rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-semibold">{new Date(agreement.expiryDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Assets */}
              <div className="rounded-md border">
                <div className="flex items-center gap-2 p-4 border-b">
                  <Package className="h-5 w-5" />
                  <h3 className="font-semibold">Assets ({agreement.assets.length})</h3>
                </div>
                <div className="divide-y">
                  {agreement.assets.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-sm">No assets assigned</p>
                  ) : (
                    agreement.assets.map((aa) => (
                      <div key={aa.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{aa.asset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {aa.asset.type} • RM {aa.asset.value.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">RM {aa.allocatedValue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{aa.allocatedPercentage}%</p>
                          {aa.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{aa.notes}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Beneficiaries */}
              <div className="rounded-md border">
                <div className="flex items-center gap-2 p-4 border-b">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">Beneficiaries ({agreement.beneficiaries.length})</h3>
                </div>
                <div className="divide-y">
                  {agreement.beneficiaries.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-sm">No beneficiaries assigned</p>
                  ) : (
                    agreement.beneficiaries.map((b) => (
                      <div key={b.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {b.familyMember?.familyMemberUser?.name || b.nonRegisteredFamilyMember?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {b.familyMember?.relation || b.nonRegisteredFamilyMember?.relation}
                          </p>
                          {b.shareDescription && (
                            <p className="text-xs text-muted-foreground mt-1">{b.shareDescription}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{b.sharePercentage}%</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={b.hasSigned ? 'default' : 'secondary'}>
                              {b.hasSigned ? 'Signed' : 'Not Signed'}
                            </Badge>
                            <Badge variant={b.isAccepted ? 'default' : 'secondary'}>
                              {b.isAccepted ? 'Accepted' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
