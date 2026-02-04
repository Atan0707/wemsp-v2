import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminSession } from '@/middleware'

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const admin = await getAdminSession()
    if (admin) {
      throw redirect({ to: '/admin/dashboard' })
    } else {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
