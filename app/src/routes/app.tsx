import { createFileRoute, Outlet, useNavigate, Link, useLocation, redirect } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import React from 'react'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { authClient } from '@/lib/auth-client'
import { getServerSession, requireCompletedProfile } from '@/middleware'
import { ProfileCompletionDialog } from '@/components/profile-completion-dialog'
import { useLanguage } from '@/lib/i18n/context'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    // Server-side authentication check using server function
    // This properly accesses cookies/headers on the server
    const session = await getServerSession()
    if (!session) {
      throw redirect({ to: '/' })
    }

    // Check profile completion - skip for all profile pages to avoid showing dialog there
    const isProfilePage = location.pathname.startsWith('/app/profile')
    if (!isProfilePage) {
      const profileCheck = await requireCompletedProfile()
      if (profileCheck && !profileCheck.profileComplete) {
        // Return profile incomplete status instead of redirecting
        // The dialog will be shown on the current page
        return {
          session,
          profileIncomplete: true,
        }
      }
    }

    return { session }
  },
  // Add context type for profileIncomplete
})

// Helper to format route segment to title case
const formatSegment = (segment: string) => {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { data: session, isPending } = authClient.useSession()
  const routeContext = Route.useRouteContext()

  const profileIncomplete = routeContext?.profileIncomplete ?? false

  // Build breadcrumb items from current pathname segments
  const breadcrumbs = useMemo(() => {
    // Get segments after /app
    const pathSegments = location.pathname.split('/').filter(Boolean)

    // Remove 'app' from the beginning
    const segments = pathSegments[0] === 'app' ? pathSegments.slice(1) : pathSegments

    // Map segments to breadcrumb items
    return segments.map((segment, index) => {
      const labelMap: Record<string, string> = {
        dashboard: t('breadcrumbs.dashboard'),
        family: t('breadcrumbs.family'),
        assets: t('breadcrumbs.assets'),
        agreement: t('breadcrumbs.agreement'),
        profile: t('breadcrumbs.profile'),
        settings: t('breadcrumbs.settings'),
        add: t('breadcrumbs.add'),
        edit: t('breadcrumbs.edit'),
        view: t('breadcrumbs.view'),
        create: t('breadcrumbs.create'),
      }
      const label = labelMap[segment] || formatSegment(segment)
      const isLast = index === segments.length - 1

      // Build href by reconstructing the path up to this segment
      const href = '/' + pathSegments.slice(0, index + 2).join('/')

      return {
        label,
        href,
        isLast,
      }
    })
  }, [location.pathname, t])

  useEffect(() => {
    // Redirect /app to /app/dashboard when session is available
    if (session && location.pathname === '/app') {
      navigate({ to: '/app/dashboard', replace: true })
    }
  }, [session, navigate, location.pathname])

  // Show loading while checking authentication
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If no session after loading, show nothing (beforeLoad will handle redirect)
  if (!session) {
    return null
  }

  return (
    <SidebarProvider>
      <ProfileCompletionDialog open={profileIncomplete} />
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 px-4 pt-4">
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-border/60 bg-background/85 px-3 shadow-sm supports-[backdrop-filter]:backdrop-blur-sm">
            <SidebarTrigger className="rounded-lg border border-border/60 bg-background shadow-sm hover:bg-muted" />
            <Separator orientation="vertical" className="h-5" />
          <Breadcrumb className="pl-1">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
