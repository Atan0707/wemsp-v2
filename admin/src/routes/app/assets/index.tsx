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
import { Search, Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { toast } from 'sonner'
import { endpoint } from '@/lib/config'

interface User {
  id: string
  name: string
}

interface Asset {
  id: number
  name: string
  type: 'PROPERTY' | 'VEHICLE' | 'INVESTMENT' | 'OTHER'
  description: string | null
  value: number
  documentUrl: string | null
  userId: string
  user: User
  createdAt: string
  updatedAt: string
  _count: {
    agreementAssets: number
  }
}

interface AssetsResponse {
  assets: Asset[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const ASSET_TYPES = ['PROPERTY', 'VEHICLE', 'INVESTMENT', 'OTHER'] as const

export const Route = createFileRoute('/app/assets/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [admin, setAdmin] = useState<{ name: string } | null>(null)

  // Assets data
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'PROPERTY' as AssetType,
    description: '',
    value: '',
    userId: '',
    document: null as File | null,
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
      fetchAssets()
      fetchUsers()
    }

    checkAuth()
  }, [navigate])

  const fetchAssets = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      })

      const response = await fetch(`${endpoint}/api/admin/assets?${params}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data: AssetsResponse = await response.json()
      setAssets(data.assets)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Failed to load assets')
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
      fetchAssets()
    }
  }, [page, search])

  const handleCreateAsset = async () => {
    setIsSubmitting(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('name', formData.name)
      formDataObj.append('type', formData.type)
      formDataObj.append('description', formData.description)
      formDataObj.append('value', formData.value)
      formDataObj.append('userId', formData.userId)
      if (formData.document) {
        formDataObj.append('document', formData.document)
      }

      const response = await fetch(`${endpoint}/api/admin/assets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formDataObj,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create asset')
      }

      toast.success('Asset created successfully')
      setIsCreateDialogOpen(false)
      resetForm()
      fetchAssets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAsset = async () => {
    if (!selectedAsset) return

    setIsSubmitting(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('name', formData.name)
      formDataObj.append('type', formData.type)
      formDataObj.append('description', formData.description)
      formDataObj.append('value', formData.value)
      formDataObj.append('userId', formData.userId)
      if (formData.document) {
        formDataObj.append('document', formData.document)
      }

      const response = await fetch(`${endpoint}/api/admin/assets/${selectedAsset.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formDataObj,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update asset')
      }

      toast.success('Asset updated successfully')
      setIsEditDialogOpen(false)
      resetForm()
      setSelectedAsset(null)
      fetchAssets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${endpoint}/api/admin/assets/${selectedAsset.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete asset')
      }

      toast.success('Asset deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedAsset(null)
      fetchAssets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (asset: Asset) => {
    setSelectedAsset(asset)
    setFormData({
      name: asset.name,
      type: asset.type,
      description: asset.description || '',
      value: asset.value.toString(),
      userId: asset.userId,
      document: null,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PROPERTY',
      description: '',
      value: '',
      userId: '',
      document: null,
    })
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
          <AdminBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Assets</CardTitle>
              <CardDescription>Track property, vehicles, investments, and supporting documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, type, or owner..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          {/* Assets Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Agreements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.type}</Badge>
                      </TableCell>
                      <TableCell>RM {asset.value.toLocaleString()}</TableCell>
                      <TableCell>{asset.user.name}</TableCell>
                      <TableCell>
                        {asset.documentUrl ? (
                          <a
                            href={asset.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{asset._count.agreementAssets}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(asset)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(asset)}
                          disabled={asset._count.agreementAssets > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} assets
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

      {/* Create Asset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Asset</DialogTitle>
            <DialogDescription>Add a new asset to the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="create-name">Name *</FieldLabel>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-type">Type *</FieldLabel>
                <select
                  id="create-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ASSET_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
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
                <FieldLabel htmlFor="create-value">Value (RM) *</FieldLabel>
                <Input
                  id="create-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-user">Owner *</FieldLabel>
                <select
                  id="create-user"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="create-document">Document (PDF only, max 10MB)</FieldLabel>
                <Input
                  id="create-document"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setFormData({ ...formData, document: e.target.files?.[0] || null })}
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAsset} disabled={isSubmitting || !formData.name || !formData.value || !formData.userId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create'}
              Create Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-name">Name *</FieldLabel>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-type">Type *</FieldLabel>
                <select
                  id="edit-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ASSET_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-value">Value (RM) *</FieldLabel>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-user">Owner *</FieldLabel>
                <select
                  id="edit-user"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-document">Document (PDF only, max 10MB)</FieldLabel>
                <Input
                  id="edit-document"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setFormData({ ...formData, document: e.target.files?.[0] || null })}
                />
                {selectedAsset?.documentUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: <a href={selectedAsset.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View document</a>
                  </p>
                )}
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setSelectedAsset(null) }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAsset} disabled={isSubmitting || !formData.name || !formData.value || !formData.userId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Asset Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAsset?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedAsset(null) }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAsset} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
