import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/app/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  useEffect(() => {
    router.navigate({ to: '/app/profile/view', replace: true })
  }, [router])

  return null
}
