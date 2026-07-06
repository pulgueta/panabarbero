import type { Service } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const DeleteServiceDialog = lazy(() =>
  import("@/components/barbershops/services/delete-service-dialog").then(
    (module) => ({
      default: module.DeleteServiceDialog,
    }),
  ),
);
const ServiceDialog = lazy(() =>
  import("@/components/barbershops/services/service-dialog").then((module) => ({
    default: module.ServiceDialog,
  })),
);
interface ServiceCardProps {
  service: Service;
  canManage: boolean;
}
export const ServiceCard: FC<ServiceCardProps> = ({ service, canManage }) => {
  return (
    <Card key={service._id} className="h-full">
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
        <CardDescription>{service.duration} minutos</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="font-bold">{formatCurrency(service.price)}</p>
      </CardContent>

      {canManage && (
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                to="/profile/barbershops/services/$serviceId/recipe"
                params={{ serviceId: service._id }}
              />
            }
          >
            Insumos
          </Button>

          <Suspense
            fallback={
              <Button disabled variant="outline">
                Editar
              </Button>
            }
          >
            <ServiceDialog
              barbershopId={service.barbershopId}
              initialValues={service}
              serviceId={service._id}
              trigger={
                <Button variant="outline" disabled={!canManage}>
                  Editar
                </Button>
              }
            />
          </Suspense>

          <Suspense
            fallback={
              <Button disabled variant="destructive">
                Eliminar
              </Button>
            }
          >
            <DeleteServiceDialog
              serviceId={service._id}
              barbershopId={service.barbershopId}
              trigger={
                <Button variant="destructive" disabled={!canManage}>
                  Eliminar
                </Button>
              }
            />
          </Suspense>
        </CardFooter>
      )}
    </Card>
  );
};
