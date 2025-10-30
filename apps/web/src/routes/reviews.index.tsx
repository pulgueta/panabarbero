import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReviewFormData } from "@/lib/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const ReviewsListPage = () => {
  const [_createDialogOpen, setCreateDialogOpen] = useState(false);
  const [_editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewFormData | null>(
    null,
  );

  // Mock data - in real app this would come from backend
  const mockReviews: (ReviewFormData & {
    id: string;
    barbershop: string;
    barbershopId: string;
    date: Date;
    avatar: string | null;
  })[] = [
    {
      id: "1",
      customerName: "Juan Pérez",
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
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
      barbershopId: "2",
      rating: 4,
      comment:
        "Muy buen servicio, aunque el tiempo de espera fue un poco largo. La calidad del corte es excelente.",
      date: new Date("2024-01-12"),
      avatar: null,
    },
    {
      id: "3",
      customerName: "Pedro López",
      barbershop: "Barbería Tradicional",
      barbershopId: "3",
      rating: 5,
      comment:
        "La mejor barbería de la ciudad. Precios justos y excelente calidad.",
      date: new Date("2024-01-13"),
      avatar: null,
    },
    {
      id: "4",
      customerName: "Ana Fernández",
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
      rating: 3,
      comment:
        "El servicio fue bueno pero el local necesita renovación. Los barberos son amables.",
      date: new Date("2024-01-14"),
      avatar: null,
    },
    {
      id: "5",
      customerName: "Carlos Ruiz",
      barbershop: "The Gentleman's Cut",
      barbershopId: "2",
      rating: 5,
      comment:
        "Increíble experiencia. El servicio premium vale totalmente la pena. El masaje capilar es relajante y el corte quedó perfecto.",
      date: new Date("2024-01-15"),
      avatar: null,
    },
    {
      id: "6",
      customerName: "Sofía Vargas",
      barbershop: "Barbería Tradicional",
      barbershopId: "3",
      rating: 4,
      comment:
        "Buen servicio tradicional. El afeitado con navaja es excelente.",
      date: new Date("2024-01-15"),
      avatar: null,
    },
  ];

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

  const getRatingStars = (value: number) => {
    return "⭐".repeat(value) + "☆".repeat(5 - value);
  };

  const _getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getCustomerInitials = (name: string | null | undefined) => {
    if (!name) return "AN";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (
    review: ReviewFormData & {
      id: string;
      barbershop: string;
      barbershopId: string;
      date: Date;
      avatar: string | null;
    },
  ) => {
    setSelectedReview(review);
    setEditDialogOpen(true);
  };

  const handleDelete = (
    review: ReviewFormData & {
      id: string;
      barbershop: string;
      barbershopId: string;
      date: Date;
      avatar: string | null;
    },
  ) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    toast.success(
      `Reseña de "${selectedReview?.customerName || "Anónimo"}" eliminada exitosamente`,
    );
    setDeleteDialogOpen(false);
    setSelectedReview(null);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Reseñas</h1>
            <p className="text-muted-foreground">
              Opiniones de clientes sobre nuestras barberías
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Reseña
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estadísticas de Reseñas</CardTitle>
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

        <div className="grid gap-6">
          {mockReviews.map((review) => (
            <Card key={review.id} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={review.avatar || undefined} />
                    <AvatarFallback>
                      {getCustomerInitials(review.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {review.customerName || "Anónimo"}
                    </CardTitle>
                    <CardDescription>
                      {review.barbershop} •{" "}
                      {format(review.date, "d 'de' MMMM, yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-lg">{getRatingStars(review.rating)}</p>
                {review.comment && (
                  <p className="text-muted-foreground">{review.comment}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button variant="outline">Útil</Button>
                  <Button variant="outline">Reportar</Button>
                  <Button variant="outline" onClick={() => handleEdit(review)}>
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(review)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Review Dialog */}
      {/* <FormDialog
        trigger={createDialogOpen ? <div /> : undefined}
        title="Nueva Reseña"
        description="Comparta su experiencia y califique el servicio"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <ReviewForm
          mode="create"
          onSuccess={() => setCreateDialogOpen(false)}
        />
      </FormDialog>

      
      <FormDialog
        trigger={editDialogOpen ? <div /> : undefined}
        title="Editar Reseña"
        description="Actualice su opinión sobre el servicio"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        {selectedReview && (
          <ReviewForm
            mode="edit"
            initialData={selectedReview}
            onSuccess={() => setEditDialogOpen(false)}
          />
        )}
      </FormDialog> */}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Reseña"
        description="¿Está seguro que desea eliminar la reseña de"
        itemName={selectedReview?.customerName || "Anónimo"}
      />
    </>
  );
};

export const Route = createFileRoute("/reviews/")({
  component: ReviewsListPage,
});
