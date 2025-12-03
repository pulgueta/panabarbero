import type { Appointment } from "@panabarbero/convex/schemas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AppointmentsTabProps {
  appointments: Appointment[];
}

const statusLabels: Record<Appointment["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  "no-show": "No asistió",
  rescheduled: "Reagendada",
  denied: "Denegada",
};

export const AppointmentsTab: FC<AppointmentsTabProps> = ({ appointments }) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Aún no tienes citas registradas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment._id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">
                {appointment.customerName}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {format(new Date(appointment.date), "PPPp", { locale: es })}
              </p>
            </div>
            <Badge
              variant={
                appointment.status === "completed"
                  ? "success"
                  : appointment.status === "cancelled" ||
                      appointment.status === "denied"
                    ? "destructive"
                    : "secondary"
              }
            >
              {statusLabels[appointment.status]}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contacto: {appointment.contactEmail} • {appointment.contactPhone}
            </p>
            {appointment.notes && (
              <p className="mt-2 text-sm italic text-muted-foreground">
                “{appointment.notes}”
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
