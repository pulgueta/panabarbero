import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, handleFormSubmit } from "@/lib/form-utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/services/new")({
  component: NewServicePage,
});

function NewServicePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [barbershopId, setBarbershopId] = useState("");

  // Mock data for barbershops - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!barbershopId) {
      toast.error("Por favor seleccione una barbería");
      return;
    }

    const formData = {
      name,
      description,
      price: parseInt(price, 10),
      duration: duration ? parseInt(duration, 10) : null,
      barbershopId,
    };

    handleFormSubmit(formData);
    toast.success("Servicio creado exitosamente");

    // Navigate back to services list
    navigate({ to: "/services" });
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Servicio</CardTitle>
            <CardDescription>
              Agregue un nuevo servicio al catálogo de la barbería
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barbershop">Barbería *</Label>
              <Select value={barbershopId} onValueChange={setBarbershopId}>
                <SelectTrigger id="barbershop">
                  <SelectValue placeholder="Seleccione una barbería" />
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
              <Label htmlFor="name">Nombre del Servicio *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Corte de cabello clásico"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el servicio en detalle..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (COP) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="30000"
                  min="0"
                  required
                />
                {price && (
                  <p className="text-muted-foreground text-sm">
                    {formatCurrency(parseInt(price, 10))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duración (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  min="5"
                  max="480"
                />
                {duration && (
                  <p className="text-muted-foreground text-sm">
                    {parseInt(duration, 10) < 60
                      ? `${duration} minutos`
                      : `${Math.floor(parseInt(duration, 10) / 60)} hora${Math.floor(parseInt(duration, 10) / 60) > 1 ? "s" : ""} ${parseInt(duration, 10) % 60 > 0 ? `${parseInt(duration, 10) % 60} minutos` : ""}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/services" })}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Servicio</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
