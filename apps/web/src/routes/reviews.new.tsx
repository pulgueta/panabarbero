import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { handleFormSubmit } from "@/lib/form-utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews/new")({
  component: NewReviewPage,
});

function NewReviewPage() {
  const navigate = useNavigate();

  const [barbershopId, setBarbershopId] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Mock data - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  const ratingOptions = [
    {
      value: "5",
      label: "⭐⭐⭐⭐⭐ Excelente",
      description: "Superó mis expectativas",
    },
    {
      value: "4",
      label: "⭐⭐⭐⭐ Muy Bueno",
      description: "Muy satisfecho con el servicio",
    },
    { value: "3", label: "⭐⭐⭐ Bueno", description: "Servicio aceptable" },
    { value: "2", label: "⭐⭐ Regular", description: "Podría mejorar" },
    { value: "1", label: "⭐ Malo", description: "No recomendaría este lugar" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!barbershopId) {
      toast.error("Por favor seleccione una barbería");
      return;
    }

    const formData = {
      barbershopId,
      rating: parseInt(rating, 10),
      comment,
      customerName,
    };

    handleFormSubmit(formData);
    toast.success("¡Gracias por su reseña! Ha sido publicada exitosamente");

    // Navigate back to reviews list
    navigate({ to: "/reviews" });
  }

  function getRatingStars(value: string) {
    const num = parseInt(value, 10);
    return "⭐".repeat(num) + "☆".repeat(5 - num);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nueva Reseña</CardTitle>
            <CardDescription>
              Comparta su experiencia y ayude a otros clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barbershop">Barbería *</Label>
              <Select value={barbershopId} onValueChange={setBarbershopId}>
                <SelectTrigger id="barbershop">
                  <SelectValue placeholder="Seleccione la barbería a calificar" />
                </SelectTrigger>
                <SelectContent>
                  {barbershops.map((barbershop) => (
                    <SelectItem key={barbershop.id} value={barbershop.id}>
                      {barbershop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Su Nombre (Opcional)</Label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Juan Pérez"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-muted-foreground text-sm">
                Si no proporciona su nombre, la reseña será anónima
              </p>
            </div>

            <div className="space-y-3">
              <Label>Calificación *</Label>
              <RadioGroup value={rating} onValueChange={setRating}>
                <div className="space-y-3">
                  {ratingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      onClick={() => setRating(option.value)}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`rating-${option.value}`}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`rating-${option.value}`}
                          className="cursor-pointer font-medium"
                        >
                          {option.label}
                        </Label>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comentario (Opcional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntenos sobre su experiencia... ¿Qué le gustó? ¿Qué podría mejorar?"
                rows={6}
              />
              <p className="text-muted-foreground text-sm">
                Su opinión es muy importante para nosotros y ayuda a otros
                clientes
              </p>
            </div>

            {barbershopId && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="mb-2 font-medium text-sm">
                  Vista Previa de su Reseña:
                </p>
                <div className="space-y-2">
                  <p className="text-lg">{getRatingStars(rating)}</p>
                  <p className="font-medium">
                    {customerName || "Cliente Anónimo"}
                  </p>
                  {comment && (
                    <p className="text-muted-foreground text-sm italic">
                      "{comment}"
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/reviews" })}
              >
                Cancelar
              </Button>
              <Button type="submit">Publicar Reseña</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
