import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminSession } from '@/middleware'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
  beforeLoad: async () => {
    // Server-side authentication check using server function
    const admin = await getAdminSession()
    if (!admin) {
      throw redirect({ to: '/login' })
    }

    return { admin }
  },
})

function RouteComponent() {
  return <div>Hello "/app/"!</div>
}
