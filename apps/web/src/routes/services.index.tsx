import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/form-utils";
import type { ServiceFormData } from "@/lib/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

export const ServicesListPage = () => {
  const [_createDialogOpen, setCreateDialogOpen] = useState(false);
  const [_editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] =
    useState<ServiceFormData | null>(null);
  const [
    _editServiceId,
    _editServiceDescriptionId,
    _editServicePriceId,
    _editServiceDurationId,
  ] = [useId(), useId(), useId(), useId()];

  // Mock data - in real app this would come from backend
  const mockServices = [
    {
      id: "1",
      name: "Corte de Cabello Clásico",
      description: "Corte de cabello para hombre con máquina y tijera.",
      price: 30000,
      duration: 30,
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
    },
    {
      id: "2",
      name: "Afeitado Clásico",
      description: "Afeitado tradicional con navaja y toallas calientes.",
      price: 25000,
      duration: 45,
      barbershop: "The Gentleman's Cut",
      barbershopId: "2",
    },
    {
      id: "3",
      name: "Diseño de Barba",
      description: "Diseño y perfilado de barba con técnicas modernas.",
      price: 20000,
      duration: 20,
      barbershop: "Barbería Tradicional",
      barbershopId: "3",
    },
    {
      id: "4",
      name: "Corte Premium",
      description:
        "Corte de cabello con lavado, masaje capilar y productos de alta gama.",
      price: 50000,
      duration: 60,
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
    },
  ];

  const handleEdit = (service: ServiceFormData) => {
    setSelectedService(service);
    setEditDialogOpen(true);
  };

  const handleDelete = (service: ServiceFormData) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    toast.success(`Servicio "${selectedService?.name}" eliminado exitosamente`);
    setDeleteDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Servicios</h1>
            <p className="text-muted-foreground">
              Catálogo de servicios disponibles en las barberías
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockServices.map((service) => (
            <Card
              key={service.id}
              className="transition-shadow hover:shadow-lg"
            >
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
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service)}
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

      {/* Create Service Dialog */}
      {/* <FormDialog
        trigger={_createDialogOpen ? <div /> : undefined}
        title="Nuevo Servicio"
        description="Complete la información para agregar un nuevo servicio"
        open={_createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <ServiceForm
          mode="create"
          onSuccess={() => setCreateDialogOpen(false)}
        />
      </FormDialog>

      
      <FormDialog
        trigger={editDialogOpen ? <div /> : undefined}
        title="Editar Servicio"
        description="Actualice la información del servicio"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        {selectedService && (
          <ServiceForm
            mode="edit"
            initialData={selectedService}
            onSuccess={() => setEditDialogOpen(false)}
          />
        )}
      </FormDialog> */}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Servicio"
        description="¿Está seguro que desea eliminar el servicio"
        itemName={selectedService?.name}
      />
    </>
  );
};

export const Route = createFileRoute("/services/")({
  component: ServicesListPage,
});
