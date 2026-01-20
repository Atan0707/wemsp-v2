import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/agreement/view/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/agreement/view/"!</div>
}
