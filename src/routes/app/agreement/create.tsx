import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/agreement/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/agreement/create"!</div>
}
