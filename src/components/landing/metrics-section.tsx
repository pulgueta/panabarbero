import type { FC } from "react";
import { Area, ComposedChart, Line, XAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const noShowsConfig = {
  con: {
    label: "Con PanaBarbero",
    color: "var(--chart-1)",
  },
  sin: {
    label: "Sin recordatorios",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

/** No-show rate (%) per week over the first 12 weeks with reminders on. */
const NO_SHOWS_DATA = [
  { week: "Semana 1", con: 18, sin: 18 },
  { week: "Semana 2", con: 17.4, sin: 18.1 },
  { week: "Semana 3", con: 17.6, sin: 17.9 },
  { week: "Semana 4", con: 16.2, sin: 18 },
  { week: "Semana 5", con: 15.4, sin: 17.8 },
  { week: "Semana 6", con: 15.7, sin: 18.2 },
  { week: "Semana 7", con: 14.1, sin: 17.9 },
  { week: "Semana 8", con: 13.2, sin: 18 },
  { week: "Semana 9", con: 12.7, sin: 17.7 },
  { week: "Semana 10", con: 12, sin: 17.9 },
  { week: "Semana 11", con: 11.6, sin: 18.1 },
  { week: "Semana 12", con: 11, sin: 17.8 },
];

interface Comparison {
  title: string;
  badge: string;
  before: { label: string; width: number };
  after: { label: string; width: number };
  caption: string;
}

const COMPARISONS: Comparison[] = [
  {
    title: "Ocupación de la agenda",
    badge: "+28 pts",
    before: { label: "54%", width: 66 },
    after: { label: "82%", width: 100 },
    caption:
      "El directorio trae clientes nuevos y la reserva en línea llena los huecos entre cita y cita.",
  },
  {
    title: "Administración por semana",
    badge: "−6 h",
    before: { label: "8 h", width: 100 },
    after: { label: "2 h", width: 25 },
    caption:
      "Confirmar citas, cuadrar la agenda y cerrar la caja dejan de ser trabajo manual del dueño.",
  },
];

const ComparisonRow: FC<{
  label: string;
  value: string;
  width: number;
  highlighted?: boolean;
}> = ({ label, value, width, highlighted }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 shrink-0 text-muted-foreground text-sm">{label}</span>
    <div className="flex-1">
      <div
        className={cn(
          "h-5 rounded-md",
          highlighted ? "bg-primary" : "bg-muted",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
    <span className="w-9 text-right font-medium text-sm tabular-nums">
      {value}
    </span>
  </div>
);

export const MetricsSection: FC = () => {
  return (
    <section className="space-y-5">
      <div className="max-w-2xl space-y-2">
        <h2 className="font-semibold text-3xl tracking-tighter md:text-4xl">
          Números que mejoran solos.
        </h2>
        <p className="text-pretty text-muted-foreground">
          Lo que cambia en una barbería durante sus primeros tres meses con
          PanaBarbero.
        </p>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-xs bg-muted" />
          Antes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-xs bg-primary" />
          Con PanaBarbero
        </span>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card size="sm" className="gap-3.5 p-6 lg:row-span-2">
          <div className="space-y-1">
            <h3 className="font-semibold tracking-tight">
              Citas perdidas (no-shows)
            </h3>
            <p className="text-muted-foreground text-sm">
              Primeras 12 semanas con recordatorios automáticos activados.
            </p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-semibold text-5xl tabular-nums tracking-tighter">
              −38%
            </span>
            <span className="text-muted-foreground text-sm tabular-nums">
              del 18% al 11% de las citas
            </span>
          </div>
          <ChartContainer
            config={noShowsConfig}
            className="aspect-auto h-44 w-full"
          >
            <ComposedChart
              data={NO_SHOWS_DATA}
              margin={{ left: 4, right: 4, top: 4 }}
            >
              <XAxis dataKey="week" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <defs>
                <linearGradient id="fillNoShows" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-con)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-con)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <Line
                dataKey="sin"
                type="monotone"
                stroke="var(--color-sin)"
                strokeWidth={2}
                strokeDasharray="4 5"
                strokeOpacity={0.45}
                dot={false}
              />
              <Area
                dataKey="con"
                type="monotone"
                fill="url(#fillNoShows)"
                stroke="var(--color-con)"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ChartContainer>
          <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
            <span>Semana 1 · 18%</span>
            <span>Semana 12 · 11%</span>
          </div>
          <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
            El recordatorio llega antes de que el cliente olvide la cita, y
            confirma con un solo mensaje. La línea punteada es una barbería sin
            recordatorios.
          </p>
        </Card>

        {COMPARISONS.map((comparison) => (
          <Card key={comparison.title} size="sm" className="gap-3.5 p-5">
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold tracking-tight">
                {comparison.title}
              </h3>
              <Badge variant="success" className="ml-auto">
                {comparison.badge}
              </Badge>
            </div>
            <div className="space-y-2.5">
              <ComparisonRow
                label="Antes"
                value={comparison.before.label}
                width={comparison.before.width}
              />
              <ComparisonRow
                label="Con PanaBarbero"
                value={comparison.after.label}
                width={comparison.after.width}
                highlighted
              />
            </div>
            <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
              {comparison.caption}
            </p>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Promedios de barberías activas en PanaBarbero · 2026.
      </p>
    </section>
  );
};
