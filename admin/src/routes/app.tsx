import { createFileRoute } from '@tanstack/react-router'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/app') {
      navigate({ to: '/app/dashboard', replace: true })
    }
  }, [navigate, location.pathname])

  return <div>
    <Outlet />
  </div>
}
