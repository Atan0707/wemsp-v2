import { createFileRoute, redirect } from '@tanstack/react-router'
import { verifyAdminSession } from '@/lib/admin-auth'

export const Route = createFileRoute('/app/')({
  beforeLoad: async () => {
    const admin = await verifyAdminSession()
    if (!admin) {
      throw redirect({
        to: '/login',
      })
    }
    return { admin }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/"!</div>
}
