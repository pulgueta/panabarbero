import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  DollarSign,
  Scissors,
  Star,
  Store,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  // Mock statistics - in real app these would come from backend
  const stats = {
    barbershops: 3,
    services: 12,
    appointments: {
      today: 5,
      week: 24,
      month: 87,
    },
    revenue: {
      today: 450000,
      week: 2340000,
      month: 9870000,
    },
    reviews: {
      total: 45,
      average: 4.5,
    },
  };

  const recentAppointments = [
    {
      id: "1",
      customer: "Juan Pérez",
      time: "10:00",
      service: "Corte de Cabello",
      barbershop: "Barbería El Clásico",
      status: "confirmed",
    },
    {
      id: "2",
      customer: "María García",
      time: "11:30",
      service: "Corte Premium",
      barbershop: "The Gentleman's Cut",
      status: "pending",
    },
    {
      id: "3",
      customer: "Pedro López",
      time: "14:00",
      service: "Afeitado Clásico",
      barbershop: "Barbería Tradicional",
      status: "confirmed",
    },
  ];

  const quickActions = [
    {
      title: "Nueva Barbería",
      description: "Registrar una nueva barbería",
      icon: Store,
      to: "/barbershops/new",
      color: "bg-blue-500",
    },
    {
      title: "Nuevo Servicio",
      description: "Agregar un servicio al catálogo",
      icon: Scissors,
      to: "/services/new",
      color: "bg-green-500",
    },
    {
      title: "Nueva Cita",
      description: "Reservar una cita para un cliente",
      icon: CalendarDays,
      to: "/appointments/new",
      color: "bg-purple-500",
    },
    {
      title: "Nueva Reseña",
      description: "Compartir una experiencia",
      icon: Star,
      to: "/reviews/new",
      color: "bg-yellow-500",
    },
  ];

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-4xl">Panel de Control</h1>
        <p className="text-muted-foreground">
          Bienvenido al sistema de gestión de barberías
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.to} to={action.to}>
              <Card className="h-full cursor-pointer transition-all hover:scale-105 hover:shadow-lg">
                <CardHeader>
                  <div
                    className={`h-12 w-12 ${action.color} mb-2 flex items-center justify-center rounded-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Statistics Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Barberías Activas</CardDescription>
            <CardTitle className="text-3xl">{stats.barbershops}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/barbershops">
              <Button variant="link" className="px-0">
                Ver todas →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Servicios Disponibles</CardDescription>
            <CardTitle className="text-3xl">{stats.services}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/services">
              <Button variant="link" className="px-0">
                Ver catálogo →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Citas Este Mes</CardDescription>
            <CardTitle className="text-3xl">
              {stats.appointments.month}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-muted-foreground text-sm">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              <span>{stats.appointments.today} hoy</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calificación Promedio</CardDescription>
            <CardTitle className="flex items-center text-3xl">
              {stats.reviews.average}
              <Star className="ml-2 h-6 w-6 fill-yellow-400 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              {stats.reviews.total} reseñas totales
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Citas de Hoy</CardTitle>
              <Link to="/appointments">
                <Button variant="outline" size="sm">
                  Ver Todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{appointment.customer}</p>
                    <p className="text-muted-foreground text-sm">
                      {appointment.service} - {appointment.barbershop}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {appointment.time}
                      </span>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "confirmed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {appointment.status === "confirmed"
                        ? "Confirmada"
                        : "Pendiente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumen de Ingresos</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Hoy</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(stats.revenue.today)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: "25%" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Esta Semana
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(stats.revenue.week)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Este Mes
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(stats.revenue.month)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
