import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminToken, verifyAdminSession, getAuthHeaders } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Calendar, Mail, Phone, MapPin, FileText, Package, Users as UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AdminBreadcrumb } from '@/components/admin-breadcrumb'
import { endpoint } from '@/lib/config'

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
  _count: {
    agreements: number
    assets: number
    familyMembers: number
    nonRegisteredFamilyMembers: number
    sessions: number
    accounts: number
  }
}

export const Route = createFileRoute('/app/users/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [admin, setAdmin] = useState<{ name: string } | null>(null)
  const [user, setUser] = useState<UserDetail | null>(null)
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
      fetchUser()
    }

    checkAuth()
  }, [navigate, id])

  const fetchUser = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${endpoint}/api/admin/users/${id}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      toast.error('Failed to load user details')
      navigate({ to: '/app/users' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>User not found</div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin?.name || 'Admin'} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumb entityLabel={user?.name} />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{user.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </CardDescription>
                </div>
                <Badge variant={user.emailVerified ? 'default' : 'secondary'}>
                  {user.emailVerified ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone Number</p>
                      <p className="text-muted-foreground">{user.phoneNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-muted-foreground">{user.address || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Member Since</p>
                      <p className="text-muted-foreground">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">IC Number</p>
                      <p className="text-muted-foreground">{user.icNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-muted-foreground">{formatDate(user.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Agreements</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.agreements}</div>
                <p className="text-xs text-muted-foreground">Total agreements</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Assets</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.assets}</div>
                <p className="text-xs text-muted-foreground">Total assets</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Family Members</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.familyMembers}</div>
                <p className="text-xs text-muted-foreground">Registered family</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.sessions}</div>
                <p className="text-xs text-muted-foreground">Active sessions</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          {user._count.nonRegisteredFamilyMembers > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Non-Registered Family Members</CardTitle>
                <CardDescription>Family members added by this user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user._count.nonRegisteredFamilyMembers}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
