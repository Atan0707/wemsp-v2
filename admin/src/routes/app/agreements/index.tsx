import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminToken, verifyAdminSession, getAuthHeaders } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Search, Plus, Pencil, Trash2, Loader2, Eye } from 'lucide-react'
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
  value: number
}

interface AgreementAsset {
  assetId: number
  asset: Asset
  allocatedValue: number
  allocatedPercentage: number
  notes: string | null
}

interface Beneficiary {
  familyMemberId: string | null
  nonRegisteredFamilyMemberId: string | null
  sharePercentage: number
  shareDescription: string | null
}

interface AgreementBeneficiary {
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

interface Agreement {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PENDING_SIGNATURES' | 'PENDING_WITNESS' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
  distributionType: 'FARAID' | 'HIBAH' | 'WASIYYAH' | 'WAKAF'
  effectiveDate: string | null
  expiryDate: string | null
  ownerId: string
  owner: User
  witness: User | null
  createdAt: string
  updatedAt: string
  _count: {
    assets: number
    beneficiaries: number
  }
  signedBeneficiaryCount: number
}

interface AgreementsResponse {
  agreements: Agreement[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const AGREEMENT_STATUSES = ['DRAFT', 'PENDING_SIGNATURES', 'PENDING_WITNESS', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'] as const
const DISTRIBUTION_TYPES = ['FARAID', 'HIBAH', 'WASIYYAH', 'WAKAF'] as const

export const Route = createFileRoute('/app/agreements/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [admin, setAdmin] = useState<{ name: string } | null>(null)

  // Agreements data
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null)

  // Form states (for create - simplified for now)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    distributionType: 'FARAID' as DistributionType,
    effectiveDate: '',
    expiryDate: '',
    ownerId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Users for dropdown
  const [users, setUsers] = useState<User[]>([])

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
      fetchAgreements()
      fetchUsers()
    }

    checkAuth()
  }, [navigate])

  const fetchAgreements = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      })

      const response = await fetch(`${endpoint}/api/admin/agreements?${params}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }

      const data: AgreementsResponse = await response.json()
      setAgreements(data.agreements)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Failed to load agreements')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${endpoint}/api/admin/users?limit=1000`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users)
    } catch (error) {
      console.error('Failed to load users')
    }
  }

  useEffect(() => {
    if (!isChecking) {
      fetchAgreements()
    }
  }, [page, search])

  const handleDeleteAgreement = async () => {
    if (!selectedAgreement) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${endpoint}/api/admin/agreements/${selectedAgreement.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete agreement')
      }

      toast.success('Agreement deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedAgreement(null)
      fetchAgreements()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete agreement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (agreement: Agreement) => {
    setSelectedAgreement(agreement)
    setIsDeleteDialogOpen(true)
  }

  const getStatusBadgeVariant = (status: AgreementStatus) => {
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

  const canEditOrDelete = (status: AgreementStatus) => {
    return status === 'DRAFT'
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
          <h1 className="text-lg font-semibold">Agreements</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, status, or owner..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Agreements Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Beneficiaries</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : agreements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No agreements found
                    </TableCell>
                  </TableRow>
                ) : (
                  agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell className="font-medium">{agreement.title}</TableCell>
                      <TableCell>{agreement.owner.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{agreement.distributionType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(agreement.status)}>
                          {agreement.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{agreement._count.assets}</TableCell>
                      <TableCell>{agreement._count.beneficiaries}</TableCell>
                      <TableCell>
                        {agreement._count.beneficiaries > 0
                          ? `${agreement.signedBeneficiaryCount}/${agreement._count.beneficiaries}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate({ to: '/app/agreements/$id', params: { id: agreement.id } })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditOrDelete(agreement.status) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(agreement)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} agreements
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      {/* Delete Agreement Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAgreement?.title}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedAgreement(null) }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAgreement} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
