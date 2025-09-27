import { BarbershopForm } from "@/components/barbershop-form";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { FormDialog } from "@/components/form-dialog";
import { ServiceForm } from "@/components/service-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Plus, Store, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/barbershops/")({
  component: BarbershopsListPage,
});

function BarbershopsListPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBarbershop, setSelectedBarbershop] = useState<any>(null);

  // This would normally fetch data from the backend
  const mockBarbershops = [
    {
      id: "1",
      name: "Barbería El Clásico",
      address: "Calle 100 #45-67",
      city: "Bogotá",
      isActive: true,
      servicesCount: 8,
      description: "Barbería tradicional con más de 20 años de experiencia",
    },
    {
      id: "2",
      name: "The Gentleman's Cut",
      address: "Carrera 15 #93-20",
      city: "Bogotá",
      isActive: true,
      servicesCount: 12,
      description: "Barbería moderna especializada en cortes contemporáneos",
    },
    {
      id: "3",
      name: "Barbería Tradicional",
      address: "Calle 72 #10-34",
      city: "Bogotá",
      isActive: false,
      servicesCount: 6,
      description: "Barbería familiar con servicios clásicos",
    },
  ];

  function handleEdit(barbershop: any) {
    setSelectedBarbershop(barbershop);
    setEditDialogOpen(true);
  }

  function handleDelete(barbershop: any) {
    setSelectedBarbershop(barbershop);
    setDeleteDialogOpen(true);
  }

  function handleAddService(barbershop: any) {
    setSelectedBarbershop(barbershop);
    setServiceDialogOpen(true);
  }

  function handleDeleteConfirm() {
    toast.success(
      `Barbería "${selectedBarbershop?.name}" eliminada exitosamente`,
    );
    setDeleteDialogOpen(false);
    setSelectedBarbershop(null);
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Barberías</h1>
            <p className="text-muted-foreground">
              Gestiona las barberías registradas en el sistema
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Barbería
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockBarbershops.map((barbershop) => (
            <Card
              key={barbershop.id}
              className="transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-xl">{barbershop.name}</CardTitle>
                  </div>
                  <Badge
                    variant={barbershop.isActive ? "default" : "secondary"}
                  >
                    {barbershop.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <CardDescription>{barbershop.description}</CardDescription>
                <CardDescription>
                  {barbershop.address}, {barbershop.city}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    {barbershop.servicesCount} servicios
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(barbershop)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddService(barbershop)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Servicio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(barbershop)}
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

      {/* Create Barbershop Dialog */}
      <FormDialog
        trigger={<></>}
        title="Nueva Barbería"
        description="Complete la información para registrar una nueva barbería"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <BarbershopForm
          mode="create"
          onSuccess={() => setCreateDialogOpen(false)}
        />
      </FormDialog>

      {/* Edit Barbershop Dialog */}
      <FormDialog
        trigger={<></>}
        title="Editar Barbería"
        description="Actualice la información de la barbería"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        <BarbershopForm
          mode="edit"
          initialData={selectedBarbershop}
          onSuccess={() => setEditDialogOpen(false)}
        />
      </FormDialog>

      {/* Add Service Dialog */}
      <FormDialog
        trigger={<></>}
        title="Nuevo Servicio"
        description={`Agregar un nuevo servicio a ${selectedBarbershop?.name}`}
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
      >
        <ServiceForm
          mode="create"
          barbershopId={selectedBarbershop?.id}
          onSuccess={() => setServiceDialogOpen(false)}
        />
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Barbería"
        description="¿Está seguro que desea eliminar la barbería"
        itemName={selectedBarbershop?.name}
      />
    </>
  );
}
