import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/assets/view')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/assets/view"!</div>
}
