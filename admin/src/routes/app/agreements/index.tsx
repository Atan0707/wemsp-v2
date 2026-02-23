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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Search, Plus, Trash2, Loader2, Eye } from 'lucide-react'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { toast } from 'sonner'
import { endpoint } from '@/lib/config'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | AgreementStatus>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | DistributionType>('ALL')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null)

  // Form states
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
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(typeFilter !== 'ALL' && { distributionType: typeFilter }),
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
  }, [page, search, statusFilter, typeFilter])

  const handleCreateAgreement = async () => {
    if (formData.effectiveDate && formData.expiryDate && formData.expiryDate < formData.effectiveDate) {
      toast.error('Expiry date cannot be earlier than effective date')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${endpoint}/api/admin/agreements`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          distributionType: formData.distributionType,
          effectiveDate: formData.effectiveDate || undefined,
          expiryDate: formData.expiryDate || undefined,
          ownerId: formData.ownerId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create agreement')
      }

      toast.success('Agreement created successfully')
      setIsCreateDialogOpen(false)
      setFormData({
        title: '',
        description: '',
        distributionType: 'FARAID',
        effectiveDate: '',
        expiryDate: '',
        ownerId: '',
      })
      setPage(1)
      fetchAgreements()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create agreement')
    } finally {
      setIsSubmitting(false)
    }
  }

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground">Loading agreements...</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin?.name || 'Admin'} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Agreements</CardTitle>
              <CardDescription>Monitor status, signatures, and completion progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | AgreementStatus)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              {AGREEMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'ALL' | DistributionType)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="ALL">All types</option>
              {DISTRIBUTION_TYPES.map((type) => (
                <option key={type} value={type}>{formatLabel(type)}</option>
              ))}
            </select>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Agreement
            </Button>
          </div>

          {/* Agreements Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
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
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <div className="space-y-2">
                        <p>No agreements found.</p>
                        <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create first agreement
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell className="font-medium">{agreement.title}</TableCell>
                      <TableCell>{agreement.owner.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatLabel(agreement.distributionType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(agreement.status)}>
                          {formatLabel(agreement.status)}
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
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`View ${agreement.title}`}
                                onClick={() => navigate({ to: '/app/agreements/$id', params: { id: agreement.id } })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View agreement</TooltipContent>
                          </Tooltip>
                          {canEditOrDelete(agreement.status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  aria-label={`Delete ${agreement.title}`}
                                  onClick={() => openDeleteDialog(agreement)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete draft agreement</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
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
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Create Agreement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create Agreement</DialogTitle>
            <DialogDescription>Create a draft agreement and assign the owner.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="create-title">Title *</FieldLabel>
                <Input
                  id="create-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-description">Description</FieldLabel>
                <Input
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-owner">Owner *</FieldLabel>
                <select
                  id="create-owner"
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select an owner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="create-type">Distribution Type *</FieldLabel>
                <select
                  id="create-type"
                  value={formData.distributionType}
                  onChange={(e) => setFormData({ ...formData, distributionType: e.target.value as DistributionType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {DISTRIBUTION_TYPES.map((type) => (
                    <option key={type} value={type}>{formatLabel(type)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="create-effective">Effective Date</FieldLabel>
                  <Input
                    id="create-effective"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-expiry">Expiry Date</FieldLabel>
                  <Input
                    id="create-expiry"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgreement} disabled={isSubmitting || !formData.title || !formData.ownerId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create'}
              Create Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
