import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/barbershops/$barbershopId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/barbershops/$barbershopId"!</div>
}
