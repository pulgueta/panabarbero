import { FormDialog } from "@/components/form-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/form-utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/services/")({
  component: ServicesListPage,
});

function ServicesListPage() {
  const [editingService, setEditingService] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Mock data - in real app this would come from backend
  const mockServices = [
    {
      id: "1",
      name: "Corte de Cabello Clásico",
      description: "Corte tradicional con tijera y máquina",
      price: 30000,
      duration: 30,
      barbershop: "Barbería El Clásico",
    },
    {
      id: "2",
      name: "Corte + Barba",
      description: "Servicio completo de corte de cabello y arreglo de barba",
      price: 45000,
      duration: 45,
      barbershop: "Barbería El Clásico",
    },
    {
      id: "3",
      name: "Diseño de Barba",
      description: "Perfilado y diseño personalizado de barba",
      price: 25000,
      duration: 25,
      barbershop: "The Gentleman's Cut",
    },
    {
      id: "4",
      name: "Corte Premium",
      description: "Corte de cabello con productos premium y masaje capilar",
      price: 60000,
      duration: 60,
      barbershop: "The Gentleman's Cut",
    },
    {
      id: "5",
      name: "Afeitado Clásico",
      description: "Afeitado tradicional con navaja y toalla caliente",
      price: 35000,
      duration: 40,
      barbershop: "Barbería Tradicional",
    },
  ];

  function handleEdit(service: any) {
    setEditingService(service);
    setEditDialogOpen(true);
  }

  function handleSaveEdit() {
    toast.success("Servicio actualizado exitosamente");
    setEditDialogOpen(false);
    setEditingService(null);
  }

  function handleDelete(_serviceId: string) {
    toast.success("Servicio eliminado exitosamente");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Servicios</h1>
          <p className="text-muted-foreground">
            Catálogo de servicios disponibles en las barberías
          </p>
        </div>
        <Link to="/services/new">
          <Button>Nuevo Servicio</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockServices.map((service) => (
          <Card key={service.id} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <CardDescription>{service.barbershop}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {service.description}
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xl">
                    {formatCurrency(service.price)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {service.duration} minutos
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(service)}
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(service.id)}
                  className="flex-1"
                >
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <FormDialog
        trigger={<></>}
        title="Editar Servicio"
        description="Actualice la información del servicio"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        {editingService && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del Servicio</Label>
              <Input
                id="edit-name"
                value={editingService.name}
                onChange={(e) =>
                  setEditingService({ ...editingService, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editingService.description}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Precio (COP)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingService.price}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      price: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duración (minutos)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editingService.duration}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      duration: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
