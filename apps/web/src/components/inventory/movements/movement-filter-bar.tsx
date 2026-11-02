import { FunnelXIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { inventoryMovementTypeData } from "@/components/inventory/labels";
import {
  MOVEMENT_DATE_PRESETS,
  type MovementDatePreset,
  type MovementFilterState,
  movementTypeOrder,
} from "@/components/inventory/movements/movement-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { id: string; name: string };

interface MovementFilterBarProps {
  filters: MovementFilterState;
  onChange: (patch: Partial<MovementFilterState>) => void;
  onReset: () => void;
  products: FilterOption[];
  actors: FilterOption[];
  hasActiveFilters: boolean;
}

const ALL = "all";

export const MovementFilterBar: FC<MovementFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  products,
  actors,
  hasActiveFilters,
}) => {
  const productName = filters.itemId
    ? (products.find((product) => product.id === filters.itemId)?.name ??
      "Producto")
    : "Todos los productos";
  const actorName = filters.actorUserId
    ? (actors.find((actor) => actor.id === filters.actorUserId)?.name ??
      "Actor")
    : "Todo el equipo";

  return (
    <div className="space-y-3">
      {/* Type is the headline filter — colored chips, single select. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TypeChip
          label="Todos"
          active={filters.type === undefined}
          activeVariant="default"
          onClick={() => onChange({ type: undefined })}
        />
        {movementTypeOrder.map((type) => {
          const { label, variant } = inventoryMovementTypeData[type];
          const active = filters.type === type;

          return (
            <TypeChip
              key={type}
              label={label}
              active={active}
              activeVariant={variant}
              onClick={() => onChange({ type: active ? undefined : type })}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.itemId ?? ALL}
          onValueChange={(value: string | null) =>
            onChange({ itemId: !value || value === ALL ? undefined : value })
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-40"
            aria-label="Filtrar por producto"
          >
            <SelectValue>{productName}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>Todos los productos</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.actorUserId ?? ALL}
          onValueChange={(value: string | null) =>
            onChange({
              actorUserId: !value || value === ALL ? undefined : value,
            })
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-40"
            aria-label="Filtrar por actor"
            disabled={actors.length === 0}
          >
            <SelectValue>{actorName}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>Todo el equipo</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>
                {actor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.datePreset}
          onValueChange={(value: MovementDatePreset | null) =>
            onChange({ datePreset: value ?? "all" })
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-36"
            aria-label="Filtrar por periodo"
          >
            <SelectValue>
              {
                MOVEMENT_DATE_PRESETS.find(
                  (preset) => preset.value === filters.datePreset,
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <FunnelXIcon />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
};

interface TypeChipProps {
  label: string;
  active: boolean;
  activeVariant: React.ComponentProps<typeof Badge>["variant"];
  onClick: () => void;
}

const TypeChip: FC<TypeChipProps> = ({
  label,
  active,
  activeVariant,
  onClick,
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className="rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
  >
    <Badge
      variant={active ? activeVariant : "outline"}
      className={cn(
        "cursor-pointer border px-2.5 py-0.5",
        active
          ? "border-transparent"
          : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Badge>
  </button>
);
