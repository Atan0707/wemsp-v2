import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/assets/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/assets/"!</div>
}
