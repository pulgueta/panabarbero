import type { Appointment, Barbershop, Review } from "@convex/tables";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

interface ReviewsTabProps {
  reviews: Review[];
  barbershops: Barbershop[];
  appointments: Appointment[];
}

export const ReviewsTab: FC<ReviewsTabProps> = ({ reviews, barbershops }) => {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Tus reseñas recientes</h3>
            <p className="text-muted-foreground text-sm">
              Consulta y administra las opiniones que has compartido.
            </p>
          </div>
          {reviews && reviews.length > 0 && (
            <Button asChild>
              <Link to="/reviews">Crear nueva reseña</Link>
            </Button>
          )}
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {review.userId || "Anónimo"}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(review._creationTime), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Calificación: {review.rating} / 5
                  </p>
                  {review.comment && (
                    <p className="mt-2 text-sm">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyTitle>Aún no has publicado reseñas.</EmptyTitle>
            <EmptyDescription>
              Cuando publiques una reseña, podrás verla aquí.
            </EmptyDescription>
          </Empty>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Barberías visitadas</h3>
          <p className="text-muted-foreground text-sm">
            Busca entre tus últimas barberías atendidas para calificarlas.
          </p>
        </div>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar barbería"
            className="pl-9"
          />
        </div>

        {barbershops && barbershops.length > 0 ? (
          <div className="space-y-3">
            {barbershops.map((barbershop) => (
              <Card key={barbershop._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{barbershop.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {barbershop.address.fullAddress}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyTitle>No se han encontrado barberías.</EmptyTitle>
            <EmptyDescription>
              Cuando completes una cita, podrás calificar la barbería aquí.
            </EmptyDescription>
          </Empty>
        )}
      </section>
    </div>
  );
};
