import type { Appointment } from "@panabarbero/convex/schemas";
import { CheckCircle, Edit, Star, Trash2, XCircle } from "lucide-react";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

type AppointmentCardProps = {
  appointment: Appointment & { _id: string };
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddReview?: (id: string) => void;
  details?: {
    barbershop?: string;
    barber?: string;
    service?: string;
    priceLabel?: string;
  };
};

export const AppointmentCard: FC<AppointmentCardProps> = (props) => {
  const {
    appointment,
    onConfirm,
    onCancel,
    onComplete,
    onEdit,
    onDelete,
    onAddReview,
  } = props;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{appointment.userId}</CardTitle>
            <CardDescription className="mt-1">
              {appointment.contactPhone}
            </CardDescription>
          </div>
          <Badge variant={getAppointmentStatusBadgeVariant(appointment.status)}>
            {getAppointmentStatusLabel(appointment.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-sm">Barbería</p>
            <p className="font-medium">{String(appointment.barbershopId)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Barbero</p>
            <p className="font-medium">{String(appointment.barberId)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Servicio</p>
            <p className="font-medium">{String(appointment.serviceId)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Contacto</p>
            <p className="font-medium">{appointment.contactPhone}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {appointment.status === "pending" && (
            <>
              <Button onClick={() => onConfirm?.(appointment._id)}>
                <CheckCircle className="mr-1 h-3 w-3" /> Confirmar
              </Button>
              <Button
                variant="destructive"
                onClick={() => onCancel?.(appointment._id)}
              >
                <XCircle className="mr-1 h-3 w-3" /> Cancelar
              </Button>
            </>
          )}
          {appointment.status === "confirmed" && (
            <>
              <Button onClick={() => onComplete?.(appointment._id)}>
                <CheckCircle className="mr-1 h-3 w-3" /> Completar
              </Button>
              <Button
                variant="destructive"
                onClick={() => onCancel?.(appointment._id)}
              >
                <XCircle className="mr-1 h-3 w-3" /> Cancelar
              </Button>
            </>
          )}
          {appointment.status === "completed" && (
            <Button
              variant="outline"
              onClick={() => onAddReview?.(appointment._id)}
            >
              <Star className="mr-1 h-3 w-3" /> Reseña
            </Button>
          )}
          <Button variant="outline" onClick={() => onEdit?.(appointment._id)}>
            <Edit className="mr-1 h-3 w-3" /> Editar
          </Button>
          <Button variant="outline" onClick={() => onDelete?.(appointment._id)}>
            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
