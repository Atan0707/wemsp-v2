import { createFileRoute, Outlet, useNavigate, Link, useLocation, redirect } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import React from 'react'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getAdminSession } from '@/middleware'

export const Route = createFileRoute('/admin')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    // Skip auth check if already navigating to login page
    if (location.pathname === '/admin/login') {
      return { admin: null }
    }
    
    // Server-side authentication check using server function
    const admin = await getAdminSession()
    if (!admin) {
      throw redirect({ to: '/admin/login' })
    }
    return { admin }
  },
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
  const routeContext = Route.useRouteContext()

  const admin = routeContext?.admin

  // Build breadcrumb items from current pathname segments
  const breadcrumbs = useMemo(() => {
    // Get segments after /admin
    const pathSegments = location.pathname.split('/').filter(Boolean)

    // Remove 'admin' from the beginning
    const segments = pathSegments[0] === 'admin' ? pathSegments.slice(1) : pathSegments

    // Map segments to breadcrumb items
    return segments.map((segment, index) => {
      const label = formatSegment(segment)
      const isLast = index === segments.length - 1

      // Build href by reconstructing the path up to this segment
      const href = '/' + pathSegments.slice(0, index + 2).join('/')

      return {
        label,
        href,
        isLast,
      }
    })
  }, [location.pathname])

  useEffect(() => {
    // Redirect /admin to /admin/dashboard when session is available
    if (admin && location.pathname === '/admin') {
      navigate({ to: '/admin/dashboard', replace: true })
    }
  }, [admin, navigate, location.pathname])

  // If no admin and on login page, render only the outlet (login form)
  if (!admin) {
    return <Outlet />
  }

  return (
    <SidebarProvider>
      <AdminSidebar adminName={admin.name} />
      <SidebarInset>
        <header className="sticky top-0 z-20 px-4 pt-4">
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-border/60 bg-background/85 px-3 shadow-sm supports-[backdrop-filter]:backdrop-blur-sm">
            <SidebarTrigger className="rounded-lg border border-border/60 bg-background shadow-sm hover:bg-muted" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex h-2 w-2 rounded-full bg-sidebar-primary" />
          <Breadcrumb>
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
