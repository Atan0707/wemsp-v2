import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/assets/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/assets/add"!</div>
}
