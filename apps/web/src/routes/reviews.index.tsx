import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/reviews/")({
  component: ReviewsListPage,
});

function ReviewsListPage() {
  // Mock data - in real app this would come from backend
  const mockReviews = [
    {
      id: "1",
      customerName: "Juan Pérez",
      barbershop: "Barbería El Clásico",
      rating: 5,
      comment:
        "Excelente servicio y atención. Los barberos son muy profesionales y el ambiente es muy agradable. Definitivamente volveré.",
      date: new Date("2024-01-10"),
      avatar: null,
    },
    {
      id: "2",
      customerName: "María García",
      barbershop: "The Gentleman's Cut",
      rating: 4,
      comment:
        "Muy buen servicio, aunque el tiempo de espera fue un poco largo. La calidad del corte es excelente.",
      date: new Date("2024-01-12"),
      avatar: null,
    },
    {
      id: "3",
      customerName: "Cliente Anónimo",
      barbershop: "Barbería Tradicional",
      rating: 5,
      comment:
        "La mejor barbería de la ciudad. Precios justos y excelente calidad.",
      date: new Date("2024-01-13"),
      avatar: null,
    },
    {
      id: "4",
      customerName: "Pedro López",
      barbershop: "Barbería El Clásico",
      rating: 3,
      comment:
        "El servicio fue bueno pero el local necesita renovación. Los barberos son amables.",
      date: new Date("2024-01-14"),
      avatar: null,
    },
    {
      id: "5",
      customerName: "Ana Martínez",
      barbershop: "The Gentleman's Cut",
      rating: 5,
      comment:
        "Increíble experiencia. El servicio premium vale totalmente la pena. El masaje capilar es relajante y el corte quedó perfecto.",
      date: new Date("2024-01-15"),
      avatar: null,
    },
    {
      id: "6",
      customerName: "Carlos Rodríguez",
      barbershop: "Barbería Tradicional",
      rating: 4,
      comment:
        "Buen servicio tradicional. El afeitado con navaja es excelente.",
      date: new Date("2024-01-15"),
      avatar: null,
    },
  ];

  function getRatingStars(rating: number) {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  }

  function getRatingColor(rating: number) {
    if (rating >= 4) return "default";
    if (rating === 3) return "secondary";
    return "destructive";
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Calculate stats
  const totalReviews = mockReviews.length;
  const averageRating =
    mockReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;
  const ratingDistribution = {
    5: mockReviews.filter((r) => r.rating === 5).length,
    4: mockReviews.filter((r) => r.rating === 4).length,
    3: mockReviews.filter((r) => r.rating === 3).length,
    2: mockReviews.filter((r) => r.rating === 2).length,
    1: mockReviews.filter((r) => r.rating === 1).length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Reseñas</h1>
          <p className="text-muted-foreground">
            Opiniones de clientes sobre nuestras barberías
          </p>
        </div>
        <Link to="/reviews/new">
          <Button>Nueva Reseña</Button>
        </Link>
      </div>

      {/* Stats Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resumen de Calificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <p className="font-bold text-4xl">{averageRating.toFixed(1)}</p>
              <p className="text-lg">
                {getRatingStars(Math.round(averageRating))}
              </p>
              <p className="text-muted-foreground">Calificación Promedio</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-4xl">{totalReviews}</p>
              <p className="text-muted-foreground">Total de Reseñas</p>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-8 text-sm">{rating}⭐</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${(ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-muted-foreground text-sm">
                    {
                      ratingDistribution[
                        rating as keyof typeof ratingDistribution
                      ]
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="grid gap-6">
        {mockReviews.map((review) => (
          <Card key={review.id} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={review.avatar || undefined} />
                    <AvatarFallback>
                      {getInitials(review.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {review.customerName}
                    </CardTitle>
                    <CardDescription>
                      {review.barbershop} •{" "}
                      {format(review.date, "d 'de' MMMM, yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={getRatingColor(review.rating)}>
                  {review.rating} ⭐
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-lg">{getRatingStars(review.rating)}</p>
              {review.comment && (
                <p className="text-muted-foreground">{review.comment}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">
                  Útil
                </Button>
                <Button variant="outline" size="sm">
                  Responder
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
