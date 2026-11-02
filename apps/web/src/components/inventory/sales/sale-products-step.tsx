import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";

import { formatInventoryStockSuffix } from "@/components/inventory/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SellableInventoryItem } from "@/hooks/use-inventory-sales";
import { cn, formatCurrency } from "@/lib/utils";
import type { ResolvedSaleLine } from "./types";

interface SaleProductsStepProps {
  filteredItems: SellableInventoryItem[];
  items: SellableInventoryItem[];
  lines: ResolvedSaleLine[];
  search: string;
  selectedIds: ReadonlySet<SellableInventoryItem["_id"]>;
  onAddItem: (item: SellableInventoryItem) => void;
  onRemoveItem: (itemId: SellableInventoryItem["_id"]) => void;
  onSearchChange: (search: string) => void;
  onUpdateQuantity: (item: SellableInventoryItem, quantity: number) => void;
}

export const SaleProductsStep: FC<SaleProductsStepProps> = ({
  filteredItems,
  items,
  lines,
  search,
  selectedIds,
  onAddItem,
  onRemoveItem,
  onSearchChange,
  onUpdateQuantity,
}) => (
  <>
    <div className="flex flex-col gap-2">
      <Label htmlFor="sale-product-search">Producto</Label>
      {/* filter={null}: the list is already filtered by `search`; Base UI would
          otherwise match the query against item IDs and flag the popup empty
          while results are visible. */}
      <Combobox
        items={filteredItems.map((item) => item._id)}
        filter={null}
        onValueChange={(itemId: string | null) => {
          const item = itemId
            ? items.find((candidate) => candidate._id === itemId)
            : undefined;
          if (item) onAddItem(item);
        }}
      >
        <ComboboxInput
          id="sale-product-search"
          placeholder="Busca por nombre, marca, SKU o modelo"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          showClear
          className="w-full"
        />
        <ComboboxContent>
          <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
          <ComboboxList>
            {filteredItems.map((item) => {
              const unavailable =
                !item.allowNegativeStock && item.available <= 0;
              const lowStock = item.belowReorder && !unavailable;
              return (
                <ComboboxItem
                  key={item._id}
                  value={item._id}
                  disabled={unavailable || selectedIds.has(item._id)}
                  className={cn(
                    lowStock &&
                      "bg-warning/10 data-highlighted:bg-warning/20 dark:bg-warning/20 dark:data-highlighted:bg-warning/30",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-medium",
                        lowStock && "text-warning",
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                      {[item.brand, item.sku].filter(Boolean).join(" | ") ||
                        "Producto de inventario"}
                    </p>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <p>{formatCurrency(item.salePrice)}</p>
                    <p
                      className={cn(
                        "text-muted-foreground",
                        lowStock && "text-warning",
                      )}
                    >
                      {item.available}{" "}
                      {formatInventoryStockSuffix(item.available, item.unit)}
                    </p>
                  </div>
                </ComboboxItem>
              );
            })}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-muted-foreground text-xs">
        Solo aparecen productos marcados como disponibles para la venta.
      </p>
    </div>

    {lines.length === 0 ? (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
        <ShoppingCartIcon className="mb-2 size-6 text-muted-foreground" />
        <p className="font-medium text-sm">La venta está vacía</p>
        <p className="text-muted-foreground text-xs">
          Busca un producto para agregarlo.
        </p>
      </div>
    ) : (
      <div className="divide-y rounded-xl border">
        {lines.map(({ item, quantity, lineTotal }) => (
          <div
            key={item._id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(6rem,auto)_auto] sm:gap-4"
          >
            <div className="col-start-1 row-start-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-sm">{item.name}</p>
                {item.belowReorder ? (
                  <Badge variant="warning" className="shrink-0">
                    Bajo stock
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatCurrency(item.salePrice)} por{" "}
                {formatInventoryStockSuffix(1, item.unit)}
              </p>
            </div>

            <div className="col-start-1 row-start-2 flex items-center gap-1 sm:col-start-2 sm:row-start-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Quitar una unidad de ${item.name}`}
                disabled={quantity <= 1}
                onClick={() => onUpdateQuantity(item, quantity - 1)}
              >
                <MinusIcon />
              </Button>
              <Input
                aria-label={`Cantidad de ${item.name}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={item.allowNegativeStock ? 100_000 : item.available}
                value={quantity}
                onChange={(event) =>
                  onUpdateQuantity(item, Number(event.target.value))
                }
                className="w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Agregar una unidad de ${item.name}`}
                disabled={
                  !item.allowNegativeStock && quantity >= item.available
                }
                onClick={() => onUpdateQuantity(item, quantity + 1)}
              >
                <PlusIcon />
              </Button>
            </div>

            <span className="col-start-2 row-start-2 justify-self-end font-medium text-sm tabular-nums sm:col-start-3 sm:row-start-1">
              {formatCurrency(lineTotal)}
            </span>

            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`Quitar ${item.name}`}
              className="col-start-2 row-start-1 justify-self-end sm:col-start-4 sm:row-start-1"
              onClick={() => onRemoveItem(item._id)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
      </div>
    )}
  </>
);
