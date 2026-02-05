import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminToken, verifyAdminSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/app/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAdminToken()
      if (!token) {
        navigate({ to: '/login' })
        return
      }

      const admin = await verifyAdminSession()
      if (!admin) {
        navigate({ to: '/login' })
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [navigate])

  if (isChecking) {
    return <div>Loading...</div>
  }

  return <div>Hello "/app/dashboard"!</div>
}
