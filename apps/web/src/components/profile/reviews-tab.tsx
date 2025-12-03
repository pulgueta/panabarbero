import type { Barbershop, Review } from "@panabarbero/convex/schemas";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ReviewsTabProps {
  reviews: Review[];
  barbershops: Barbershop[];
}

export const ReviewsTab: FC<ReviewsTabProps> = ({ reviews, barbershops }) => {
  const [search, setSearch] = useState("");

  const filteredVisited = useMemo(() => {
    if (!barbershops) return [];
    return barbershops.filter((item) =>
      item.barbershop.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [barbershops, search]);

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
              <a href="/reviews" target="_blank" rel="noreferrer">
                Crear nueva reseña
              </a>
            </Button>
          )}
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {review.customerName || "Anónimo"}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(review._creationTime), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
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
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aún no has publicado reseñas.
          </div>
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar barbería"
            className="pl-9"
          />
        </div>

        {filteredVisited.length > 0 ? (
          <div className="space-y-3">
            {filteredVisited.map((item) => (
              <Card key={item.barbershop._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {item.barbershop.name}
                  </CardTitle>
                  <CardDescription>
                    Última visita:{" "}
                    {formatDistanceToNow(new Date(item.lastVisitedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.barbershop.address.fullAddress}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No encontramos barberías recientes que coincidan con tu búsqueda.
          </div>
        )}
      </section>
    </div>
  );
};
