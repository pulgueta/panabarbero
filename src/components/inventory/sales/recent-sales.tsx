import type { Barbershop } from "@convex/schema";
import { ArrowSquareOutIcon, ReceiptIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventorySaleRow } from "@/hooks/use-inventory-sales";
import { useRecentSales } from "@/hooks/use-inventory-sales";
import { formatCurrency } from "@/lib/utils";
import { saleDocumentTypeShortLabels, salePaymentMethodLabels } from "./labels";

const saleDateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

function saleProducts(sale: InventorySaleRow) {
  return sale.lines
    .map((line) => `${line.quantity} ${line.itemName}`)
    .join(", ");
}

/** Phone first (follow-up), then document (invoicing) as secondary detail. */
function saleCustomerDetail(sale: InventorySaleRow) {
  if (sale.customerPhone) return sale.customerPhone;
  if (sale.customerDocumentType && sale.customerDocumentNumber) {
    return `${saleDocumentTypeShortLabels[sale.customerDocumentType]} ${sale.customerDocumentNumber}`;
  }
  return undefined;
}

const SalePaymentBadge: FC<{ sale: InventorySaleRow }> = ({ sale }) =>
  sale.paymentMethod ? (
    <Badge variant="outline">
      {salePaymentMethodLabels[sale.paymentMethod]}
    </Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const ProofLink: FC<{ sale: InventorySaleRow }> = ({ sale }) => {
  const url = sale.proofUrl;
  if (!url)
    return <span className="text-muted-foreground">Sin comprobante</span>;

  return (
    <Button
      nativeButton={false}
      variant="link"
      size="sm"
      className="h-auto p-0"
      render={
        <a href={url} target="_blank" rel="noreferrer">
          Ver comprobante
          <ArrowSquareOutIcon />
        </a>
      }
    />
  );
};

interface RecentSalesProps {
  barbershopId: Barbershop["_id"];
}

export const RecentSales: FC<RecentSalesProps> = ({ barbershopId }) => {
  const { data: sales } = useRecentSales(barbershopId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas recientes</CardTitle>
        <CardDescription>
          Las últimas ventas registradas y sus comprobantes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptIcon />
              </EmptyMedia>
              <EmptyTitle>Aún no hay ventas registradas.</EmptyTitle>
              <EmptyDescription>
                Las ventas confirmadas aparecerán aquí.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link to="/profile/barbershops/inventory/sales/new" />}
              >
                Registrar venta
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sales.map((sale) => (
                <article
                  key={sale._id}
                  className="space-y-3 rounded-xl border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {sale.actorName ?? "Miembro de la barbería"}
                      </p>
                      <time className="text-muted-foreground text-xs">
                        {saleDateFormatter.format(sale._creationTime)}
                      </time>
                    </div>
                    <p className="font-semibold text-sm tabular-nums">
                      {formatCurrency(sale.totalAmount)}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {saleProducts(sale)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                    <SalePaymentBadge sale={sale} />
                    <span>{sale.customerName ?? "Consumidor final"}</span>
                    {saleCustomerDetail(sale) ? (
                      <span>· {saleCustomerDetail(sale)}</span>
                    ) : null}
                  </div>
                  {sale.notes ? (
                    <p className="text-muted-foreground text-xs">
                      {sale.notes}
                    </p>
                  ) : null}
                  <ProofLink sale={sale} />
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vendido por</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell>
                        <time>
                          {saleDateFormatter.format(sale._creationTime)}
                        </time>
                      </TableCell>
                      <TableCell>
                        {sale.actorName ?? "Miembro de la barbería"}
                      </TableCell>
                      <TableCell>
                        {sale.customerName ? (
                          <>
                            <p>{sale.customerName}</p>
                            {saleCustomerDetail(sale) ? (
                              <p className="text-muted-foreground text-xs">
                                {saleCustomerDetail(sale)}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            Consumidor final
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="truncate">{saleProducts(sale)}</p>
                        {sale.notes ? (
                          <p className="truncate text-muted-foreground text-xs">
                            {sale.notes}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <SalePaymentBadge sale={sale} />
                      </TableCell>
                      <TableCell>
                        <ProofLink sale={sale} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
