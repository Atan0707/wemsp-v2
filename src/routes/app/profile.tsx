import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/app/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Redirect /app/profile to /app/profile/view
    if (location.pathname === '/app/profile') {
      navigate({ to: '/app/profile/view', replace: true })
    }
  }, [navigate, location.pathname])

  return <Outlet />
}
