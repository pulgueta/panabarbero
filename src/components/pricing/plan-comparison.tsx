import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FREE_MAX_BARBERS } from "@/config/home-faqs";
import { useConfiguredProducts } from "@/hooks/billing/use-pricing";
import { cn } from "@/lib/utils";

/**
 * "Compara los planes" table + closing CTA for `/pricing`. Columns and rows
 * come from the Polar catalog (same source as the pricing cards): one row per
 * distinct benefit, matched across tiers by the shared benefit id.
 */
export const PlanComparison: FC = () => {
  const { data: products } = useConfiguredProducts();

  // Free → pro → premium, paired by stable product key (same as the pricing
  // cards). Benefits are identical across billing intervals, so the monthly
  // product represents each paid tier.
  const tierProducts = [
    products.independiente,
    products.barberiaMonthly,
    products.barberiaProfMonthly,
  ].filter((product) => product !== null && product !== undefined);

  // Ordered by first appearance from the free tier upward.
  const benefitRows = new Map<string, string>();
  for (const product of tierProducts) {
    for (const benefit of product.benefits ?? []) {
      if (!benefitRows.has(benefit.id)) {
        benefitRows.set(benefit.id, benefit.description.trim());
      }
    }
  }

  return (
    <>
      {benefitRows.size > 0 && (
        <>
          <Separator className="my-4" />

          <section className="space-y-5">
            <h2 className="font-semibold text-2xl tracking-tight">
              Compara los planes
            </h2>

            <Card className="py-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-5 py-3.5 text-muted-foreground text-xs">
                      Beneficio
                    </TableHead>
                    {tierProducts.map((product) => (
                      <TableHead className="px-5 py-3.5" key={product.id}>
                        {product.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(benefitRows, ([benefitId, description]) => (
                    <TableRow key={benefitId}>
                      <TableHead className="px-5 py-3 font-medium" scope="row">
                        {description}
                      </TableHead>
                      {tierProducts.map((product) => {
                        const isIncluded = product.benefits?.some(
                          (benefit) => benefit.id === benefitId,
                        );

                        return (
                          <TableCell
                            className={cn(
                              "px-5 py-3 tabular-nums",
                              !isIncluded && "text-muted-foreground",
                            )}
                            key={product.id}
                          >
                            {isIncluded ? "Incluido" : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>
        </>
      )}

      <Separator className="my-4" />

      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-balance font-semibold text-2xl tracking-tight">
          ¿Dudas sobre qué plan te sirve?
        </h2>
        <p className="max-w-prose text-pretty text-muted-foreground text-sm">
          Empieza gratis con hasta {FREE_MAX_BARBERS} barberos y cambia de plan
          cuando necesites inventario y Pana IA. Sin permanencia mínima.
        </p>
        <Button nativeButton={false} render={<Link to="/login" />} size="lg">
          Comenzar gratis
        </Button>
      </section>
    </>
  );
};
