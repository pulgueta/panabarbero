import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarIcon,
  Clock,
  DollarSign,
  Scissors,
  Star,
  Store,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  // Mock data for key metrics - in a real app, this would come from a backend API.
  const metrics = {
    totalAppointments: 1250,
    pendingAppointments: 45,
    totalRevenue: 25000000, // COP
    averageRating: 4.7,
    totalBarbershops: 5,
    totalServices: 20,
    totalBarbers: 15,
    customerSatisfaction: 92, // percentage
  };

  // Mock data for recent activities - in a real app, this would be dynamic.
  const recentActivities = [
    {
      id: "1",
      type: "appointment",
      description: "Nueva cita agendada por Juan P. en Barbería El Clásico",
      time: "Hace 5 min",
    },
    {
      id: "2",
      type: "review",
      description: "Nueva reseña de María G. para The Gentleman's Cut",
      time: "Hace 30 min",
    },
    {
      id: "3",
      type: "barbershop",
      description: "Nueva barbería 'Barbería Moderna' registrada",
      time: "Hace 1 hora",
    },
    {
      id: "4",
      type: "service",
      description: "Nuevo servicio 'Corte Fade' añadido",
      time: "Hace 2 horas",
    },
    {
      id: "5",
      type: "appointment",
      description: "Cita confirmada para Pedro L. en Barbería Tradicional",
      time: "Hace 3 horas",
    },
  ];

  // Helper function for currency formatting (could be in a utils file)
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 font-bold text-3xl">Panel de Administración</h1>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Citas Totales</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {metrics.totalAppointments}
            </div>
            <p className="text-muted-foreground text-xs">
              +{metrics.pendingAppointments} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">
              Generados hasta la fecha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Calificación Promedio
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {metrics.averageRating} / 5.0
            </div>
            <p className="text-muted-foreground text-xs">
              De {metrics.totalBarbers} reseñas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Barberías Activas
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{metrics.totalBarbershops}</div>
            <p className="text-muted-foreground text-xs">Total registradas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {activity.type === "appointment" && (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                    {activity.type === "review" && (
                      <Star className="h-5 w-5 text-yellow-500" />
                    )}
                    {activity.type === "barbershop" && (
                      <Store className="h-5 w-5 text-green-500" />
                    )}
                    {activity.type === "service" && (
                      <Scissors className="h-5 w-5 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {activity.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {activity.time}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats/Overview (Example: Barbers and Services) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium">Barberos Registrados</p>
                </div>
                <span className="font-bold text-lg">
                  {metrics.totalBarbers}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                <div className="flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium">Servicios Ofrecidos</p>
                </div>
                <span className="font-bold text-lg">
                  {metrics.totalServices}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium">Satisfacción del Cliente</p>
                </div>
                <span className="font-bold text-lg">
                  {metrics.customerSatisfaction}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
