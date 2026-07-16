import type { Barbershop, InventoryItem } from "@convex/schema";
import { StackIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { inventoryMovementTypeData } from "@/components/inventory/labels";
import {
  type FilterOption,
  MovementFilterBar,
} from "@/components/inventory/movements/movement-filter-bar";
import {
  datePresetToStart,
  movementDateTimeFormatter,
  movementDirection,
  type MovementFilterState,
  movementToneClass,
} from "@/components/inventory/movements/movement-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
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
import {
  type InventoryMovementRow,
  inventoryOverviewQueryOptions,
  type MovementFilters,
  usePaginatedShopMovements,
} from "@/hooks/use-inventory";
import { cn, formatCurrency } from "@/lib/utils";

const RETENTION_NOTE = "El historial se conserva durante 12 meses.";

interface MovementLedgerProps {
  barbershopId: Barbershop["_id"];
  pageSize?: number;
}

/**
 * Filterable, server-paginated audit log for a shop's stock movements. Filters
 * are pushed into `listShopMovements` (index-backed) rather than trimmed on the
 * client; changing them resets pagination by remounting `LedgerBody` via key.
 */
export const MovementLedger: FC<MovementLedgerProps> = ({
  barbershopId,
  pageSize = 20,
}) => {
  const [filterState, setFilterState] = useState<MovementFilterState>({
    datePreset: "all",
  });
  const [actors, setActors] = useState<Map<string, string>>(new Map());

  const { data: overview } = useQuery(
    inventoryOverviewQueryOptions(barbershopId),
  );

  const products = useMemo<FilterOption[]>(
    () =>
      (overview?.rows ?? [])
        .map((row) => ({ id: row._id as string, name: row.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [overview],
  );

  const actorOptions = useMemo<FilterOption[]>(
    () =>
      Array.from(actors, ([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      ),
    [actors],
  );

  const serverFilters = useMemo<MovementFilters>(
    () => ({
      type: filterState.type,
      itemId: filterState.itemId as InventoryItem["_id"] | undefined,
      actorUserId: filterState.actorUserId,
      startTime: datePresetToStart(filterState.datePreset, Date.now()),
    }),
    [filterState],
  );

  const hasActiveFilters =
    filterState.type !== undefined ||
    filterState.itemId !== undefined ||
    filterState.actorUserId !== undefined ||
    filterState.datePreset !== "all";

  const handleChange = useCallback((patch: Partial<MovementFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    setFilterState({ datePreset: "all" });
  }, []);

  // Actor options accumulate across every page/filter and never reset, so the
  // dropdown stays populated as the operator narrows the ledger.
  const handleActorsSeen = useCallback((rows: InventoryMovementRow[]) => {
    setActors((prev) => {
      let next: Map<string, string> | null = null;

      for (const row of rows) {
        if (row.actorName && !prev.has(row.actorUserId)) {
          next ??= new Map(prev);
          next.set(row.actorUserId, row.actorName);
        }
      }

      return next ?? prev;
    });
  }, []);

  const sig = `${serverFilters.type ?? ""}|${serverFilters.itemId ?? ""}|${
    serverFilters.actorUserId ?? ""
  }|${serverFilters.startTime ?? ""}`;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <MovementFilterBar
          filters={filterState}
          onChange={handleChange}
          onReset={handleReset}
          products={products}
          actors={actorOptions}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <LedgerBody
        key={sig}
        barbershopId={barbershopId}
        pageSize={pageSize}
        filters={serverFilters}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleReset}
        onActorsSeen={handleActorsSeen}
      />
    </div>
  );
};

type PageState = {
  page: InventoryMovementRow[];
  isDone: boolean;
  continueCursor: string;
};

interface LedgerBodyProps {
  barbershopId: Barbershop["_id"];
  pageSize: number;
  filters: MovementFilters;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onActorsSeen: (rows: InventoryMovementRow[]) => void;
}

const LedgerBody: FC<LedgerBodyProps> = ({
  barbershopId,
  pageSize,
  filters,
  hasActiveFilters,
  onResetFilters,
  onActorsSeen,
}) => {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [pages, setPages] = useState<Record<string, PageState>>({});

  const handleLoaded = useCallback((cursorKey: string, state: PageState) => {
    setPages((prev) => ({ ...prev, [cursorKey]: state }));
  }, []);

  const rows = cursors.flatMap(
    (cursor) => pages[cursor ?? "first"]?.page ?? [],
  );
  const lastCursor = cursors[cursors.length - 1] ?? "first";
  const lastPage = pages[lastCursor];
  const isPrimed = pages.first !== undefined;
  const canLoadMore = lastPage !== undefined && !lastPage.isDone;

  return (
    <>
      {cursors.map((cursor) => (
        <LedgerFetcher
          key={cursor ?? "first"}
          barbershopId={barbershopId}
          cursor={cursor}
          pageSize={pageSize}
          filters={filters}
          onLoaded={handleLoaded}
          onActorsSeen={onActorsSeen}
        />
      ))}

      {!isPrimed ? (
        <LedgerSkeleton />
      ) : rows.length === 0 ? (
        <LedgerEmpty
          hasActiveFilters={hasActiveFilters}
          onResetFilters={onResetFilters}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((movement) => (
                  <LedgerRow key={movement._id} movement={movement} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y md:hidden">
            {rows.map((movement) => (
              <LedgerCard key={movement._id} movement={movement} />
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col items-center gap-3 border-t p-4">
        {canLoadMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCursors((prev) => [...prev, lastPage.continueCursor])
            }
          >
            Cargar más
          </Button>
        )}
        <p className="text-muted-foreground text-xs">
          {isPrimed && rows.length > 0
            ? `${rows.length} movimiento${rows.length === 1 ? "" : "s"}${
                canLoadMore ? " · desplázate para ver más" : ""
              }`
            : RETENTION_NOTE}
        </p>
      </div>
    </>
  );
};

interface LedgerFetcherProps {
  barbershopId: Barbershop["_id"];
  cursor: string | null;
  pageSize: number;
  filters: MovementFilters;
  onLoaded: (cursorKey: string, state: PageState) => void;
  onActorsSeen: (rows: InventoryMovementRow[]) => void;
}

/** Invisible per-cursor fetcher; reports its page up so one table renders all. */
const LedgerFetcher: FC<LedgerFetcherProps> = ({
  barbershopId,
  cursor,
  pageSize,
  filters,
  onLoaded,
  onActorsSeen,
}) => {
  const { data } = usePaginatedShopMovements(
    barbershopId,
    cursor,
    pageSize,
    filters,
  );

  const cursorKey = cursor ?? "first";

  useEffect(() => {
    if (!data) {
      return;
    }

    onLoaded(cursorKey, {
      page: data.page,
      isDone: data.isDone,
      continueCursor: data.continueCursor,
    });
    onActorsSeen(data.page);
  }, [data, cursorKey, onLoaded, onActorsSeen]);

  return null;
};

const LedgerRow: FC<{ movement: InventoryMovementRow }> = ({ movement }) => {
  const { label, variant } = inventoryMovementTypeData[movement.type];
  const { sign, tone } = movementDirection(movement.type, movement.quantity);
  const magnitude = Math.abs(movement.quantity);

  return (
    <TableRow>
      <TableCell>
        <Badge variant={variant}>{label}</Badge>
      </TableCell>
      <TableCell>
        <p className="font-medium">{movement.itemName}</p>
        <MovementDetail movement={movement} />
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-mono font-semibold text-sm tabular-nums",
          movementToneClass[tone],
        )}
      >
        {sign}
        {magnitude}
      </TableCell>
      <TableCell className="text-right font-mono font-semibold text-muted-foreground text-sm tabular-nums">
        {movement.balanceAfter}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {movement.actorName ?? "Automático"}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground text-xs tabular-nums">
        {movementDateTimeFormatter.format(movement._creationTime)}
      </TableCell>
    </TableRow>
  );
};

const LedgerCard: FC<{ movement: InventoryMovementRow }> = ({ movement }) => {
  const { label, variant } = inventoryMovementTypeData[movement.type];
  const { sign, tone } = movementDirection(movement.type, movement.quantity);
  const magnitude = Math.abs(movement.quantity);

  return (
    <div className="space-y-1.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant={variant}>{label}</Badge>
          <span className="truncate font-medium text-sm">
            {movement.itemName}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 font-mono text-sm tabular-nums",
            movementToneClass[tone],
          )}
        >
          {sign}
          {magnitude}
        </span>
      </div>

      <MovementDetail movement={movement} />

      <p className="text-muted-foreground text-xs">
        <span className="font-mono tabular-nums">
          {movementDateTimeFormatter.format(movement._creationTime)}
        </span>
        {" · "}
        {movement.actorName ?? "Automático"}
        {" · Saldo "}
        <span className="font-mono tabular-nums">{movement.balanceAfter}</span>
      </p>
    </div>
  );
};

const MovementDetail: FC<{ movement: InventoryMovementRow }> = ({
  movement,
}) => {
  const hasSalePrice =
    movement.type === "sale" && typeof movement.salePriceAtTime === "number";

  if (!movement.reason && !hasSalePrice) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-xs">
      {movement.reason}
      {movement.reason && hasSalePrice ? " · " : null}
      {hasSalePrice
        ? `${formatCurrency(movement.salePriceAtTime as number)} c/u`
        : null}
    </p>
  );
};

const LedgerSkeleton: FC = () => (
  <div className="divide-y">
    {Array.from({ length: 6 }, (_, index) => (
      <div
        key={`ledger-skeleton-${index}`}
        className="flex items-center justify-between gap-4 p-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
    ))}
  </div>
);

interface LedgerEmptyProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const LedgerEmpty: FC<LedgerEmptyProps> = ({
  hasActiveFilters,
  onResetFilters,
}) => (
  <Empty className="py-12">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <StackIcon />
      </EmptyMedia>
      <EmptyTitle>
        {hasActiveFilters
          ? "Ningún movimiento coincide con los filtros."
          : "Aún no hay movimientos registrados."}
      </EmptyTitle>
      <EmptyDescription>
        {hasActiveFilters
          ? "Ajusta o limpia los filtros para ver más resultados."
          : "Cada entrada, venta, consumo o ajuste de stock quedará registrado aquí."}
      </EmptyDescription>
    </EmptyHeader>
    {hasActiveFilters && (
      <Button variant="outline" size="sm" onClick={onResetFilters}>
        Limpiar filtros
      </Button>
    )}
  </Empty>
);
