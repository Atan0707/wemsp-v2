import { createFileRoute, Outlet, useNavigate, Link, useLocation } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
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

export const Route = createFileRoute('/app')({
  component: RouteComponent,
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
  const { data: session, isPending } = authClient.useSession()

  // Build breadcrumb items from current pathname segments
  const breadcrumbs = useMemo(() => {
    // Get segments after /app
    const segments = location.pathname.split('/').filter(Boolean).slice(1) // Remove 'app'

    return segments.map((segment, index) => {
      const label = formatSegment(segment)
      const isLast = index === segments.length - 1

      // Build the path up to this segment
      const pathSoFar = segments.slice(0, index + 1).join('/')
      let href = '/' + pathSoFar

      // Redirect /app/family breadcrumb to /app/family/dashboard
      if (href === '/app/family') {
        href = '/app/family/dashboard'
      }

      return {
        label,
        href,
        isLast,
      }
    })
  }, [location.pathname])

  useEffect(() => {
    // Only redirect if we've finished checking and there's no session
    if (!isPending && !session) {
      navigate({ to: '/' })
      return
    }
    
    // Redirect /app to /app/dashboard
    if (session && location.pathname === '/app') {
      navigate({ to: '/app/dashboard', replace: true })
    }
  }, [session, isPending, navigate, location.pathname])

  // Show loading while checking authentication
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If no session after loading, show nothing (will redirect)
  if (!session) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
