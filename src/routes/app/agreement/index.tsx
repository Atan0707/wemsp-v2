import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/agreement/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/agreement/"!</div>
}
