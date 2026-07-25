import type { FC } from "react";

import { Card } from "@/components/ui/card";

const STEPS = [
  {
    number: "01",
    title: "Registra tu barbería",
    description:
      "Nombre, ubicación y horario. Queda visible en el directorio para clientes de tu ciudad.",
  },
  {
    number: "02",
    title: "Arma tu equipo y servicios",
    description:
      "Invita a tus barberos, define servicios con precios y su disponibilidad.",
  },
  {
    number: "03",
    title: "Recibe reservas",
    description:
      "Las citas entran solas, los recordatorios salen solos y Pana organiza el resto.",
  },
];

export const StepsSection: FC = () => {
  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <h2 className="font-semibold text-3xl tracking-tighter md:text-4xl">
          Empieza a recibir reservas hoy.
        </h2>
        <p className="text-pretty text-muted-foreground">
          Tres pasos y tu barbería queda en línea.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <Card key={step.number} size="sm" className="gap-2.5 p-5">
            <span className="font-mono text-muted-foreground text-sm">
              {step.number}
            </span>
            <h3 className="font-semibold tracking-tight">{step.title}</h3>
            <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
};
