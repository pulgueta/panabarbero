import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { LazyMotion, domAnimation, m, useInView } from "motion/react";
import type { FC } from "react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useLocationStore } from "@/store/barbershop-filters";

export const CtaSection: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const { data: user } = useSession();
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);

  return (
    <LazyMotion features={domAnimation}>
      <section ref={ref} className="relative overflow-hidden">
        <m.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={isInView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative overflow-hidden rounded-2xl border border-border/40 bg-linear-to-br from-primary/8 via-card to-card p-8"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative flex flex-col items-center gap-6 text-center">
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-3"
            >
              <h2 className="mx-auto max-w-lg font-semibold text-3xl tracking-tighter md:text-4xl">
                Tu próximo corte está a un{" "}
                <span className="text-primary">clic</span> de distancia
              </h2>
              <p className="mx-auto max-w-md text-pretty text-muted-foreground">
                Ya seas cliente buscando barbería o barbero organizando tu
                negocio, PanaBarbero te tiene cubierto.
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Button
                render={
                  <Link
                    to="/barbershops"
                    search={{ city: persistedCity, state: persistedState }}
                  />
                }
                nativeButton={false}
              >
                Buscar barberías
                <ArrowRightIcon weight="bold" className="ml-1 size-4" />
              </Button>

              {!user && (
                <Button
                  render={<Link to="/login" />}
                  nativeButton={false}
                  variant="outline"
                >
                  Registrar mi barbería
                </Button>
              )}
            </m.div>
          </div>
        </m.div>
      </section>
    </LazyMotion>
  );
};
