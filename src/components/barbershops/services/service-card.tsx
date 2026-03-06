import type { Service } from "@convex/tables";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  isOwner: boolean;
}
export const ServiceCard: FC<ServiceCardProps> = ({ service, isOwner }) => {
  return (
    <Card key={service._id} className="h-full">
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
        <CardDescription>{service.duration} minutos</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="font-bold">{formatCurrency(service.price)}</p>
      </CardContent>

      {isOwner && (
        <CardFooter className="justify-end gap-2">
          <Suspense fallback={<Skeleton className="h-9 w-18" />}>
            <ServiceDialog
              barbershopId={service.barbershopId}
              initialValues={service}
              serviceId={service._id}
              trigger={
                <Button variant="outline" disabled={!isOwner}>
                  Editar
                </Button>
              }
            />
          </Suspense>

          <Suspense fallback={<Skeleton className="h-9 w-20" />}>
            <DeleteServiceDialog
              serviceId={service._id}
              barbershopId={service.barbershopId}
              trigger={
                <Button variant="destructive" disabled={!isOwner}>
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
