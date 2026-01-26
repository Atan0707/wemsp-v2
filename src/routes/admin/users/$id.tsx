import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getAdminSession } from '@/middleware'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { ArrowLeftIcon, MailIcon, PhoneIcon, MapPinIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, EditIcon, TrashIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface UserDetail {
  id: string
  name: string
  email: string
  icNumber: string | null
  phoneNumber: string | null
  address: string | null
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
  assets: Asset[]
  agreements: Agreement[]
  familyMembers: FamilyMember[]
  nonRegisteredFamilyMembers: NonRegisteredFamilyMember[]
  sessions: Session[]
  accounts: Account[]
}

interface Asset {
  id: number
  name: string
  type: string
  description: string | null
  value: number
  documentUrl: string | null
  createdAt: string
}

interface Agreement {
  id: string
  title: string
  description: string | null
  distributionType: string
  status: string
  createdAt: string
  updatedAt: string
  assets: AgreementAsset[]
  beneficiaries: AgreementBeneficiary[]
}

interface AgreementAsset {
  id: string
  assetId: number
  asset: {
    name: string
    type: string
  }
  allocatedValue: number | null
  allocatedPercentage: number | null
}

interface AgreementBeneficiary {
  id: string
  familyMemberId: number | null
  nonRegisteredFamilyMemberId: number | null
  sharePercentage: number
  shareDescription: string | null
  hasSigned: boolean
  isAccepted: boolean | null
  familyMember?: {
    relation: string
    familyMemberUser: {
      name: string
    }
  }
  nonRegisteredFamilyMember?: {
    name: string
    relation: string
  }
}

interface FamilyMember {
  id: number
  relation: string
  familyMemberUser: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

interface NonRegisteredFamilyMember {
  id: number
  name: string
  relation: string
  icNumber: string
  phoneNumber: string | null
  createdAt: string
}

interface Session {
  id: string
  token: string
  expiresAt: string
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
}

interface Account {
  id: string
  providerId: string
  accountId: string
  createdAt: string
}

export const Route = createFileRoute('/admin/users/$id')({
  loader: async ({ params }) => {
    const admin = await getAdminSession()
    if (!admin) {
      throw redirect({ to: '/admin/login' })
    }
    return { admin, userId: params.id }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { admin, userId } = Route.useLoaderData()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    icNumber: '',
    phoneNumber: '',
    address: '',
    emailVerified: false,
  })

  // Fetch user details
  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/detail`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setEditForm({
          name: data.user.name,
          email: data.user.email,
          icNumber: data.user.icNumber || '',
          phoneNumber: data.user.phoneNumber || '',
          address: data.user.address || '',
          emailVerified: data.user.emailVerified,
        })
      } else {
        toast.error('Failed to fetch user details')
        navigate({ to: '/admin/users' })
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to fetch user details')
      navigate({ to: '/admin/users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  // Edit user handler
  const handleUpdateUser = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        toast.success('User updated successfully')
        setEditDialogOpen(false)
        fetchUserDetails()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  // Delete user handler
  const handleDeleteUser = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('User deleted successfully')
        setDeleteDialogOpen(false)
        navigate({ to: '/admin/users' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(value)
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: 'secondary',
      PENDING_SIGNATURES: 'outline',
      PENDING_WITNESS: 'outline',
      ACTIVE: 'default',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
      EXPIRED: 'destructive',
    }
    return variants[status] || 'secondary'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p>Loading user details...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p>User not found</p>
      </div>
    )
  }

  const canDeleteUser = user.agreements.length === 0 && user.assets.length === 0

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/users' })}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-semibold">User Details</h1>
              <p className="text-sm text-muted-foreground">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={!canDeleteUser}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic user details and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-base">{user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <MailIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{user.email}</p>
                  {user.emailVerified ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">IC Number</p>
                <p className="text-base">{user.icNumber || 'Not provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{user.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{user.address || 'Not provided'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-base">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.assets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.agreements.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.familyMembers.length + user.nonRegisteredFamilyMembers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.sessions.filter(s => new Date(s.expiresAt) > new Date()).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Assets ({user.assets.length})</CardTitle>
            <CardDescription>All assets owned by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {user.assets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No assets found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.type}</Badge>
                      </TableCell>
                      <TableCell>{asset.description || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                      <TableCell>{formatDate(asset.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Agreements */}
        <Card>
          <CardHeader>
            <CardTitle>Agreements ({user.agreements.length})</CardTitle>
            <CardDescription>All distribution agreements created by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {user.agreements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No agreements found</p>
            ) : (
              <div className="space-y-4">
                {user.agreements.map((agreement) => (
                  <div key={agreement.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{agreement.title}</h4>
                        <p className="text-sm text-muted-foreground">{agreement.description || 'No description'}</p>
                      </div>
                      <Badge variant={getStatusBadge(agreement.status)}>{agreement.status}</Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Type: <Badge variant="outline" className="ml-1">{agreement.distributionType}</Badge>
                      </span>
                      <span className="text-muted-foreground">
                        Created: {formatDate(agreement.createdAt)}
                      </span>
                    </div>
                    {agreement.assets.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Allocated Assets:</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {agreement.assets.map((aa) => (
                            <div key={aa.id} className="text-sm bg-muted/50 rounded p-2">
                              <span className="font-medium">{aa.asset.name}</span>
                              <span className="text-muted-foreground"> ({aa.asset.type})</span>
                              {aa.allocatedValue && (
                                <span className="ml-2 text-muted-foreground">
                                  {formatCurrency(aa.allocatedValue)}
                                </span>
                              )}
                              {aa.allocatedPercentage && (
                                <span className="ml-2 text-muted-foreground">
                                  {aa.allocatedPercentage}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {agreement.beneficiaries.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Beneficiaries:</p>
                        <div className="space-y-2">
                          {agreement.beneficiaries.map((ab) => (
                            <div key={ab.id} className="text-sm bg-muted/50 rounded p-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {ab.familyMember?.familyMemberUser?.name || ab.nonRegisteredFamilyMember?.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {ab.familyMember?.relation || ab.nonRegisteredFamilyMember?.relation}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {ab.sharePercentage}%
                                </span>
                                {ab.hasSigned ? (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircleIcon className="h-4 w-4 text-red-600" />
                                )}
                                {ab.isAccepted === true && (
                                  <Badge variant="default" className="text-xs">Accepted</Badge>
                                )}
                                {ab.isAccepted === false && (
                                  <Badge variant="destructive" className="text-xs">Rejected</Badge>
                                )}
                              </div>
                              {ab.shareDescription && (
                                <p className="text-xs text-muted-foreground mt-1">{ab.shareDescription}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Members */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Registered Family Members */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Family Members ({user.familyMembers.length})</CardTitle>
              <CardDescription>Family members who are also system users</CardDescription>
            </CardHeader>
            <CardContent>
              {user.familyMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No registered family members</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relation</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.familyMembers.map((fm) => (
                      <TableRow key={fm.id}>
                        <TableCell className="font-medium">{fm.familyMemberUser.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{fm.relation}</Badge>
                        </TableCell>
                        <TableCell>{fm.familyMemberUser.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Non-Registered Family Members */}
          <Card>
            <CardHeader>
              <CardTitle>Non-Registered Family Members ({user.nonRegisteredFamilyMembers.length})</CardTitle>
              <CardDescription>Family members not yet registered in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {user.nonRegisteredFamilyMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No non-registered family members</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relation</TableHead>
                      <TableHead>IC Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.nonRegisteredFamilyMembers.map((nrfm) => (
                      <TableRow key={nrfm.id}>
                        <TableCell className="font-medium">{nrfm.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{nrfm.relation}</Badge>
                        </TableCell>
                        <TableCell>{nrfm.icNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions & Accounts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Sessions ({user.sessions.length})</CardTitle>
              <CardDescription>Login history and active sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {user.sessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No sessions found</p>
              ) : (
                <div className="space-y-3">
                  {user.sessions.map((session) => {
                    const isExpired = new Date(session.expiresAt) < new Date()
                    return (
                      <div key={session.id} className="text-sm border rounded p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Created: {formatDate(session.createdAt)}</span>
                          {isExpired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          Expires: {formatDate(session.expiresAt)}
                        </p>
                        {session.ipAddress && (
                          <p className="text-muted-foreground">IP: {session.ipAddress}</p>
                        )}
                        {session.userAgent && (
                          <p className="text-xs text-muted-foreground truncate">{session.userAgent}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts ({user.accounts.length})</CardTitle>
              <CardDescription>Linked authentication providers</CardDescription>
            </CardHeader>
            <CardContent>
              {user.accounts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No linked accounts</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Linked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium capitalize">{account.providerId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{account.accountId}</TableCell>
                        <TableCell>{formatDate(account.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ic">IC Number</Label>
              <Input
                id="edit-ic"
                value={editForm.icNumber}
                onChange={(e) => setEditForm({ ...editForm, icNumber: e.target.value })}
                placeholder="Enter IC number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                placeholder="+60123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-verified"
                checked={editForm.emailVerified}
                onChange={(e) => setEditForm({ ...editForm, emailVerified: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-verified">Email Verified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={!editForm.name || !editForm.email}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Name:</strong> {user.name}<br />
              <strong>Email:</strong> {user.email}
            </p>
            {!canDeleteUser && (
              <p className="text-sm text-red-600 mt-2">
                Warning: This user has {user.agreements.length} agreement(s) and {user.assets.length} asset(s).
                You cannot delete users with existing agreements or assets.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={!canDeleteUser}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
