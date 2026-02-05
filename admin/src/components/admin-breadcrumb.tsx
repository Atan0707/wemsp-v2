import { useLocation } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

// Route segment labels mapping
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  agreements: 'Agreements',
  users: 'Users',
  assets: 'Assets',
  app: 'Home',
}

// Format a segment to title case
function formatSegment(segment: string): string {
  if (routeLabels[segment]) {
    return routeLabels[segment]
  }
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface AdminBreadcrumbProps {
  entityLabel?: string // For detail pages (e.g., agreement title, user name)
}

export function AdminBreadcrumb({ entityLabel }: AdminBreadcrumbProps) {
  const location = useLocation()
  const pathname = location.pathname

  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean)

  // Remove 'app' prefix if present
  const relevantSegments = segments[0] === 'app' ? segments.slice(1) : segments

  // Build breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = []

  // Always add Dashboard as the first item
  if (relevantSegments.length > 0) {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/app/dashboard',
      isLast: relevantSegments.length === 1 && relevantSegments[0] === 'dashboard',
    })

    // Build subsequent items
    let currentPath = '/app'

    for (let i = 0; i < relevantSegments.length; i++) {
      const segment = relevantSegments[i]
      const isLast = i === relevantSegments.length - 1

      // Skip dashboard as we already added it
      if (segment === 'dashboard') continue

      currentPath += `/${segment}`

      // Check if this is a dynamic segment (contains numbers or looks like an ID)
      const isDynamicSegment = /^[a-z0-9]{10,}$/i.test(segment) || segment.includes('cmkp') || segment.includes('Auf')

      if (isDynamicSegment && entityLabel) {
        // For detail pages with entity label provided
        breadcrumbs.push({
          label: entityLabel,
          href: currentPath,
          isLast,
        })
      } else if (isDynamicSegment) {
        // For detail pages without entity label - show "Details"
        breadcrumbs.push({
          label: 'Details',
          href: currentPath,
          isLast,
        })
      } else {
        // For regular segments
        breadcrumbs.push({
          label: formatSegment(segment),
          href: currentPath,
          isLast,
        })
      }
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <div key={breadcrumb.href} className="flex items-center gap-1.5">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {breadcrumb.isLast ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
