/**
 * Inventory domain — items, running balances and the append-only movement
 * ledger. See `docs/inventory-design.md`.
 *
 * The invariant that shapes this file: `inventoryLevels.onHand` (and
 * `.reserved`) must equal the signed sum of the item's ledger per the
 * `movementEffects` matrix. It holds because `recordMovement` is the ONLY
 * code path that writes levels and movements, and it appends the ledger row,
 * patches the level and updates the aggregates in one serializable mutation.
 * The sole sanctioned exceptions are the cost/reorder fan-out in `updateItem`
 * and the retention rollup — both documented, both through the wrapped db.
 */

import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import {
  zAuthMutation,
  zAuthQuery,
  zInternalMutation,
  zInternalQuery,
} from ".";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertInventoryAllowed, isInventoryAllowed } from "./acl";
import { inventoryMovementsAggregate, inventoryTriggers } from "./aggregates";
import { track } from "./analytics";
import { authz, barbershopScope } from "./authz";
import { errorMessages } from "./errors";
import { startLowStockAlert } from "./inventoryAlerts";
import { auditLog } from "./log";
import type {
  Appointment,
  Barbershop,
  InventoryItem,
  InventoryLevel,
  InventoryMovement,
  InventoryMovementType,
  InventorySale,
  Service,
} from "./schema";
import {
  barbershops,
  inventoryCategories,
  inventoryItems,
  inventoryMovementTypeSchema,
  services,
} from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { colombiaDateKeyToMs, toColombiaDateKey } from "./utils";

// ---------------------------------------------------------------------------
// Movement effects matrix
// ---------------------------------------------------------------------------

type MovementEffects = { onHandDelta: number; reservedDelta: number };

/**
 * Single source of truth for how each movement type touches the running
 * balances. `quantity` is a positive magnitude for every type except
 * `adjustment`, which carries the signed delta.
 */
export function movementEffects(
  type: InventoryMovementType,
  quantity: number,
): MovementEffects {
  switch (type) {
    case "receipt":
    case "return":
    case "transfer_in":
      return { onHandDelta: quantity, reservedDelta: 0 };
    case "sale":
    case "consumption":
    case "waste":
    case "transfer_out":
      return { onHandDelta: -quantity, reservedDelta: 0 };
    case "adjustment":
      return { onHandDelta: quantity, reservedDelta: 0 };
    case "reservation":
      return { onHandDelta: 0, reservedDelta: quantity };
    case "release":
      return { onHandDelta: 0, reservedDelta: -quantity };
    default:
      throw new ConvexError(
        errorMessages.notFound(`tipo de movimiento ${type satisfies never}`),
      );
  }
}

const ONHAND_DECREMENTS: ReadonlySet<InventoryMovementType> = new Set([
  "sale",
  "consumption",
  "waste",
  "transfer_out",
]);

// ---------------------------------------------------------------------------
// recordMovement — the single funnel
// ---------------------------------------------------------------------------

export async function getLevelForItem(
  ctx: MutationCtx,
  itemId: InventoryItem["_id"],
  locationId?: string,
): Promise<InventoryLevel | null> {
  const levels = await ctx.db
    .query("inventoryLevels")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .collect();

  return levels.find((level) => level.locationId === locationId) ?? null;
}

type RecordMovementArgs = {
  barbershopId: Barbershop["_id"];
  itemId: InventoryItem["_id"];
  type: InventoryMovementType;
  /** Positive magnitude; signed only for `adjustment`. */
  quantity: number;
  actorUserId: string;
  /** Receipt only: incoming unit cost feeding the weighted moving average. */
  unitCost?: number;
  /** Sale only: price charged at the time of the movement. */
  salePriceAtTime?: number;
  reason?: string;
  locationId?: string;
  relatedAppointmentId?: Appointment["_id"];
  relatedSaleId?: InventorySale["_id"];
  idempotencyKey?: string;
  /**
   * Lifecycle paths (appointment hooks) must never throw over stock: clamp
   * the quantity to what the balances allow and note the shortfall in the
   * movement reason instead of rejecting.
   */
  clampToAvailable?: boolean;
};

type RecordMovementResult = {
  movementId: InventoryMovement["_id"] | null;
  /** Quantity actually applied after clamping (0 = skipped no-op). */
  quantityApplied: number;
  onHand: number;
  reserved: number;
  belowReorder: boolean;
};

export async function recordMovement(
  ctx: MutationCtx,
  args: RecordMovementArgs,
): Promise<RecordMovementResult> {
  // 1. Idempotency: webhook/import retries must not double-count.
  if (args.idempotencyKey) {
    const existing = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_barbershopId_and_idempotencyKey", (q) =>
        q
          .eq("barbershopId", args.barbershopId)
          .eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();

    if (existing) {
      if (
        existing.barbershopId !== args.barbershopId ||
        existing.itemId !== args.itemId
      ) {
        throw new ConvexError(errorMessages.idempotencyKeyConflict);
      }

      const level = await getLevelForItem(ctx, args.itemId, args.locationId);

      return {
        movementId: existing._id,
        quantityApplied: 0,
        onHand: level?.onHand ?? 0,
        reserved: level?.reserved ?? 0,
        belowReorder: level?.belowReorder ?? false,
      };
    }
  }

  // 2. Item — archived items only accept corrective movements.
  const item = await ctx.db.get(args.itemId);

  if (!item) {
    throw new ConvexError(errorMessages.notFound("producto"));
  }

  if (item.barbershopId !== args.barbershopId) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  if (
    item.deletedAt !== undefined &&
    args.type !== "adjustment" &&
    args.type !== "return" &&
    args.type !== "release"
  ) {
    throw new ConvexError(errorMessages.itemArchived);
  }

  if (args.type !== "adjustment" && args.quantity <= 0) {
    throw new ConvexError(errorMessages.invalidQuantity);
  }

  // 3. Level — lazily created on first movement. Uniqueness of
  //    (itemId, locationId) is race-free: the index range read joins the
  //    transaction's read set, so concurrent creators OCC-conflict.
  const db = inventoryTriggers.wrapDB(ctx).db;
  let level = await getLevelForItem(ctx, args.itemId, args.locationId);

  if (!level) {
    const levelId = await db.insert("inventoryLevels", {
      barbershopId: args.barbershopId,
      itemId: args.itemId,
      locationId: args.locationId,
      onHand: 0,
      reserved: 0,
      unitCost: item.unitCost,
      belowReorder: 0 <= item.reorderPoint,
    });

    // biome-ignore lint/style/noNonNullAssertion: row was inserted in this transaction
    level = (await ctx.db.get(levelId))!;
  }

  // 4. Availability checks per the effects matrix, inside this transaction —
  //    two barbers consuming the last blade cannot both pass (OCC retries the
  //    loser, which then fails the check cleanly).
  const available = level.onHand - level.reserved;
  let quantity = args.quantity;
  let shortfall = 0;

  if (ONHAND_DECREMENTS.has(args.type) && !item.allowNegativeStock) {
    if (available < quantity) {
      if (!args.clampToAvailable) {
        throw new ConvexError(errorMessages.insufficientStock);
      }

      const applied = Math.max(0, available);
      shortfall = quantity - applied;
      quantity = applied;
    }
  } else if (args.type === "reservation" && !item.allowNegativeStock) {
    if (available < quantity) {
      if (!args.clampToAvailable) {
        throw new ConvexError(errorMessages.insufficientStock);
      }

      const applied = Math.max(0, available);
      shortfall = quantity - applied;
      quantity = applied;
    }
  } else if (args.type === "release") {
    // Releases never throw and never over-release (ledger-derived caps).
    quantity = Math.min(quantity, level.reserved);
  } else if (args.type === "adjustment") {
    if (!item.allowNegativeStock && level.onHand + quantity < level.reserved) {
      throw new ConvexError(errorMessages.insufficientStock);
    }
  }

  // No-op after clamping (or a zero adjustment): write nothing.
  if (quantity === 0) {
    return {
      movementId: null,
      quantityApplied: 0,
      onHand: level.onHand,
      reserved: level.reserved,
      belowReorder: level.belowReorder,
    };
  }

  // 5. Valuation — weighted moving average on receipt; a receipt onto a
  //    non-positive balance resets the cost to the incoming one.
  let unitCost = level.unitCost;
  let unitCostAtTime = level.unitCost;

  if (args.type === "receipt") {
    const incoming = args.unitCost ?? item.unitCost;
    unitCostAtTime = incoming;
    unitCost =
      level.onHand <= 0
        ? incoming
        : Math.round(
            (level.onHand * level.unitCost + quantity * incoming) /
              (level.onHand + quantity),
          );

    if (unitCost !== item.unitCost) {
      await ctx.db.patch(item._id, { unitCost });
    }
  }

  // 6. Apply — level patch + ledger append through the trigger-wrapped db.
  const effects = movementEffects(args.type, quantity);
  const beforeLevel = {
    onHand: level.onHand,
    reserved: level.reserved,
    available: level.onHand - level.reserved,
    unitCost: level.unitCost,
    belowReorder: level.belowReorder,
    locationId: level.locationId,
  };
  const onHand = level.onHand + effects.onHandDelta;
  const reserved = Math.max(0, level.reserved + effects.reservedDelta);
  const belowReorder = onHand <= item.reorderPoint;

  const levelPatch: Partial<InventoryLevel> = {
    onHand,
    reserved,
    unitCost,
    belowReorder,
  };

  // Hysteresis: alert exactly once per downward crossing of the reorder
  // point; recovery strictly above it clears the stamp and re-arms the alert.
  const crossedDown =
    belowReorder &&
    !level.belowReorder &&
    level.lowStockAlertedAt === undefined &&
    item.deletedAt === undefined;

  if (crossedDown) {
    levelPatch.lowStockAlertedAt = Date.now();
  } else if (
    onHand > item.reorderPoint &&
    level.lowStockAlertedAt !== undefined
  ) {
    levelPatch.lowStockAlertedAt = undefined;
  }

  await db.patch(level._id, levelPatch);

  if (crossedDown) {
    await startLowStockAlert(ctx, {
      barbershopId: args.barbershopId,
      itemId: item._id,
      itemName: item.name,
      remaining: onHand,
      unit: item.unit,
      reorderPoint: item.reorderPoint,
    });
  }

  const reason =
    shortfall > 0
      ? [args.reason, `faltante: ${shortfall}`].filter(Boolean).join(" — ")
      : args.reason;

  const movementId = await db.insert("inventoryMovements", {
    barbershopId: args.barbershopId,
    itemId: args.itemId,
    itemName: item.name,
    locationId: args.locationId,
    type: args.type,
    quantity: args.type === "adjustment" ? quantity : Math.abs(quantity),
    unitCostAtTime,
    salePriceAtTime: args.type === "sale" ? args.salePriceAtTime : undefined,
    balanceAfter: onHand,
    reason,
    actorUserId: args.actorUserId,
    relatedAppointmentId: args.relatedAppointmentId,
    relatedSaleId: args.relatedSaleId,
    idempotencyKey: args.idempotencyKey,
  });

  await auditLog.logChange(ctx, {
    action: `inventory.movement.${args.type}`,
    actorId: args.actorUserId,
    resourceType: "inventory.item",
    resourceId: args.itemId,
    before: beforeLevel,
    after: {
      onHand,
      reserved,
      available: onHand - reserved,
      unitCost,
      belowReorder,
      locationId: args.locationId,
      movementId,
      movementType: args.type,
      quantity,
      reason,
      relatedAppointmentId: args.relatedAppointmentId,
      relatedSaleId: args.relatedSaleId,
    },
    generateDiff: true,
    severity: "info",
    tags: inventoryAuditTags(args.barbershopId, args.itemId),
    retentionCategory: "inventory",
  });

  return {
    movementId,
    quantityApplied: quantity,
    onHand,
    reserved,
    belowReorder,
  };
}

// ---------------------------------------------------------------------------
// Guards shared by the public mutations
// ---------------------------------------------------------------------------

async function assertCanManageInventory(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"],
  userId: string,
): Promise<void> {
  await Promise.all([
    assertInventoryAllowed(ctx, barbershopId),
    authz.require(
      ctx,
      userId,
      "inventory:manage",
      barbershopScope(barbershopId),
    ),
  ]);
}

async function assertCanRecordConsumption(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"],
  userId: string,
): Promise<void> {
  await Promise.all([
    assertInventoryAllowed(ctx, barbershopId),
    authz.require(
      ctx,
      userId,
      "inventory:consume",
      barbershopScope(barbershopId),
    ),
  ]);
}

async function requireItemInShop(
  ctx: MutationCtx,
  itemId: InventoryItem["_id"],
): Promise<InventoryItem> {
  const item = await ctx.db.get(itemId);

  if (!item) {
    throw new ConvexError(errorMessages.notFound("producto"));
  }

  return item;
}

const quantitySchema = z.coerce
  .number({ error: "La cantidad es requerida" })
  .int({ error: "La cantidad debe ser un número entero" })
  .min(1, { error: "La cantidad debe ser mayor a 0" })
  .max(100_000, { error: "La cantidad es demasiado grande" });

const reasonSchema = z
  .string()
  .max(300, { error: "El motivo debe tener menos de 300 caracteres" });

function inventoryAuditTags(
  barbershopId: Barbershop["_id"],
  itemId: InventoryItem["_id"],
) {
  return [
    "inventory",
    `barbershop:${barbershopId}`,
    `inventory-item:${itemId}`,
  ];
}

// ---------------------------------------------------------------------------
// Catalog mutations
// ---------------------------------------------------------------------------

export const createItem = zAuthMutation({
  // `initialQuantity` is a create-time convenience, not an item field: it
  // seeds stock through the movement ledger so a first-time setup doesn't
  // start every product at "Agotado".
  args: inventoryItems.tools.insert.extend({
    initialQuantity: quantitySchema.optional(),
  }),
  ratelimit: "createInventoryItem",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const { initialQuantity, ...itemArgs } = args;

    await assertCanManageInventory(ctx, itemArgs.barbershopId, userId);

    if (itemArgs.isSellable && itemArgs.salePrice === undefined) {
      throw new ConvexError(errorMessages.salePriceRequired);
    }

    if (itemArgs.stockBehavior === "durable" && itemArgs.isSellable) {
      throw new ConvexError(errorMessages.durableNotConsumable);
    }

    const itemId = await ctx.db.insert("inventoryItems", {
      ...itemArgs,
      deletedAt: undefined,
    });

    // Every item gets its level row up front so the dashboard join is total.
    const db = inventoryTriggers.wrapDB(ctx).db;

    await db.insert("inventoryLevels", {
      barbershopId: itemArgs.barbershopId,
      itemId,
      onHand: 0,
      reserved: 0,
      unitCost: itemArgs.unitCost,
      belowReorder: 0 <= itemArgs.reorderPoint,
    });

    if (initialQuantity !== undefined && initialQuantity > 0) {
      // Through recordMovement — the sole balance writer — so the ledger,
      // level and aggregates stay consistent from the very first unit.
      await recordMovement(ctx, {
        barbershopId: itemArgs.barbershopId,
        itemId,
        type: "receipt",
        quantity: initialQuantity,
        actorUserId: userId,
        unitCost: itemArgs.unitCost,
        reason: "Inventario inicial",
      });
    }

    const createdItem = await ctx.db.get(itemId);

    await auditLog.logChange(ctx, {
      action: "inventory.item.created",
      actorId: userId,
      resourceType: "inventory.item",
      resourceId: itemId,
      before: undefined,
      after: createdItem,
      generateDiff: true,
      severity: "info",
      tags: inventoryAuditTags(itemArgs.barbershopId, itemId),
      retentionCategory: "inventory",
    });

    await track(ctx, {
      distinctId: userId,
      event: "inventory_item_created",
      properties: {
        itemId,
        barbershopId: args.barbershopId,
        category: args.category,
        isSellable: args.isSellable,
      },
      groups: { barbershop: args.barbershopId },
    });

    return itemId;
  },
});

export const updateItem = zAuthMutation({
  args: inventoryItems.tools.update,
  ratelimit: "updateInventoryItem",
  handler: async (ctx, args) => {
    const { userId } = ctx;

    if (!args.data.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await assertCanManageInventory(ctx, args.data.barbershopId, userId);

    const item = await requireItemInShop(ctx, args.id);

    if (item.barbershopId !== args.data.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Archival has its own 2-step mutation; ignore deletedAt here.
    const { deletedAt: _deletedAt, ...data } = args.data;

    if (
      (data.isSellable ?? item.isSellable) &&
      (data.salePrice ?? item.salePrice) === undefined
    ) {
      throw new ConvexError(errorMessages.salePriceRequired);
    }

    if (
      (data.stockBehavior ?? item.stockBehavior) === "durable" &&
      (data.isSellable ?? item.isSellable)
    ) {
      throw new ConvexError(errorMessages.durableNotConsumable);
    }

    await ctx.db.patch(item._id, data);
    const updatedItem = await ctx.db.get(item._id);

    // Sanctioned fan-out (see aggregates.ts): cost and reorder-point changes
    // must reach the level docs through the wrapped db so the valuation
    // aggregate replaces and the low-stock flag stays truthful.
    const costChanged =
      data.unitCost !== undefined && data.unitCost !== item.unitCost;
    const reorderChanged =
      data.reorderPoint !== undefined &&
      data.reorderPoint !== item.reorderPoint;

    if (costChanged || reorderChanged) {
      const db = inventoryTriggers.wrapDB(ctx).db;
      const levels = await ctx.db
        .query("inventoryLevels")
        .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
        .collect();

      for (const level of levels) {
        const patch: Partial<InventoryLevel> = {};
        let crossedDown = false;

        if (costChanged) {
          patch.unitCost = data.unitCost;
        }

        if (reorderChanged && data.reorderPoint !== undefined) {
          const belowReorder = level.onHand <= data.reorderPoint;
          patch.belowReorder = belowReorder;

          if (!belowReorder && level.lowStockAlertedAt !== undefined) {
            patch.lowStockAlertedAt = undefined;
          }

          // A raised reorder point can itself cross the threshold.
          crossedDown =
            belowReorder &&
            !level.belowReorder &&
            level.lowStockAlertedAt === undefined;

          if (crossedDown) {
            patch.lowStockAlertedAt = Date.now();
          }
        }

        await db.patch(level._id, patch);

        if (crossedDown && data.reorderPoint !== undefined) {
          await startLowStockAlert(ctx, {
            barbershopId: item.barbershopId,
            itemId: item._id,
            itemName: data.name ?? item.name,
            remaining: level.onHand,
            unit: item.unit,
            reorderPoint: data.reorderPoint,
          });
        }

        if (costChanged && data.unitCost !== undefined) {
          // Zero-quantity audit row: the ledger records the cost change.
          const movementId = await db.insert("inventoryMovements", {
            barbershopId: item.barbershopId,
            itemId: item._id,
            itemName: data.name ?? item.name,
            locationId: level.locationId,
            type: "adjustment",
            quantity: 0,
            unitCostAtTime: data.unitCost,
            balanceAfter: level.onHand,
            reason: "Cambio de costo manual",
            actorUserId: userId,
          });

          // Ledger rows and movement audit entries stay 1:1 (see recordMovement).
          await auditLog.logChange(ctx, {
            action: "inventory.movement.adjustment",
            actorId: userId,
            resourceType: "inventory.item",
            resourceId: item._id,
            before: {
              unitCost: level.unitCost,
              locationId: level.locationId,
            },
            after: {
              unitCost: data.unitCost,
              locationId: level.locationId,
              movementId,
              movementType: "adjustment",
              quantity: 0,
              reason: "Cambio de costo manual",
            },
            generateDiff: true,
            severity: "info",
            tags: inventoryAuditTags(item.barbershopId, item._id),
            retentionCategory: "inventory",
          });
        }
      }
    }

    await auditLog.logChange(ctx, {
      action: "inventory.item.updated",
      actorId: userId,
      resourceType: "inventory.item",
      resourceId: item._id,
      before: item,
      after: updatedItem,
      generateDiff: true,
      severity: "info",
      tags: inventoryAuditTags(item.barbershopId, item._id),
      retentionCategory: "inventory",
    });

    if (
      item.imageKey &&
      data.imageKey !== undefined &&
      data.imageKey !== item.imageKey
    ) {
      try {
        await ctx.runMutation(internal.r2.deleteR2Object, {
          key: item.imageKey,
        });
      } catch {
        // Non-fatal: old object may already be gone.
      }
    }
  },
});

export const archiveItem = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    barbershop: barbershops.tools.id,
    force: z.boolean().optional(),
  }),
  ratelimit: "archiveInventoryItem",
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await assertCanManageInventory(ctx, args.barbershop.id, userId);

    const item = await requireItemInShop(ctx, args.item.id);

    if (item.barbershopId !== args.barbershop.id) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (item.deletedAt !== undefined) {
      return;
    }

    const [levels, recipeLines] = await Promise.all([
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
        .collect(),
      ctx.db
        .query("serviceInventoryUsage")
        .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
        .collect(),
    ]);

    const reservedTotal = levels.reduce(
      (sum, level) => sum + level.reserved,
      0,
    );
    const impacted = recipeLines.length + (reservedTotal > 0 ? 1 : 0);

    // 2-step destructive confirmation (delete-service-dialog contract).
    if (!args.force && impacted > 0) {
      throw new ConvexError(`WILL_RELEASE:${impacted}`);
    }

    // Free trapped holds, write off on-hand stock, and detach recipes.
    for (const level of levels) {
      if (level.reserved > 0) {
        await recordMovement(ctx, {
          barbershopId: item.barbershopId,
          itemId: item._id,
          type: "release",
          quantity: level.reserved,
          locationId: level.locationId,
          reason: "Producto archivado",
          actorUserId: userId,
        });
      }

      if (level.onHand > 0) {
        await recordMovement(ctx, {
          barbershopId: item.barbershopId,
          itemId: item._id,
          type: "adjustment",
          quantity: -level.onHand,
          locationId: level.locationId,
          reason: "Producto archivado — baja de stock",
          actorUserId: userId,
        });
      }
    }

    await Promise.all(recipeLines.map((line) => ctx.db.delete(line._id)));

    await ctx.db.patch(item._id, { deletedAt: Date.now() });
    const archivedItem = await ctx.db.get(item._id);

    await auditLog.logChange(ctx, {
      action: "inventory.item.archived",
      actorId: userId,
      resourceType: "inventory.item",
      resourceId: item._id,
      before: item,
      after: archivedItem,
      generateDiff: true,
      severity: "warning",
      tags: inventoryAuditTags(item.barbershopId, item._id),
      retentionCategory: "inventory",
    });

    await track(ctx, {
      distinctId: userId,
      event: "inventory_item_archived",
      properties: { itemId: item._id, barbershopId: item.barbershopId },
      groups: { barbershop: item.barbershopId },
    });
  },
});

export const restoreItem = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    barbershop: barbershops.tools.id,
  }),
  ratelimit: "updateInventoryItem",
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await assertCanManageInventory(ctx, args.barbershop.id, userId);

    const item = await requireItemInShop(ctx, args.item.id);

    if (item.barbershopId !== args.barbershop.id) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (item.deletedAt === undefined) {
      return;
    }

    await ctx.db.patch(item._id, { deletedAt: undefined });
    const restoredItem = await ctx.db.get(item._id);

    await auditLog.logChange(ctx, {
      action: "inventory.item.restored",
      actorId: userId,
      resourceType: "inventory.item",
      resourceId: item._id,
      before: item,
      after: restoredItem,
      generateDiff: true,
      severity: "info",
      tags: inventoryAuditTags(item.barbershopId, item._id),
      retentionCategory: "inventory",
    });
  },
});

// ---------------------------------------------------------------------------
// Stock mutations — thin wrappers over recordMovement
// ---------------------------------------------------------------------------

export const receiveStock = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    quantity: quantitySchema,
    unitCost: z.coerce.number().int().min(0).optional(),
    reason: reasonSchema.optional(),
    idempotencyKey: z.string().optional(),
  }),
  ratelimit: "receiveStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanManageInventory(ctx, item.barbershopId, userId);

    const result = await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "receipt",
      quantity: args.quantity,
      unitCost: args.unitCost,
      reason: args.reason,
      idempotencyKey: args.idempotencyKey,
      actorUserId: userId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "stock_received",
      properties: {
        itemId: item._id,
        barbershopId: item.barbershopId,
        quantity: result.quantityApplied,
      },
      groups: { barbershop: item.barbershopId },
    });

    return result;
  },
});

export const receiveStockBatch = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    lines: z
      .array(
        z.object({
          item: inventoryItems.tools.id,
          quantity: quantitySchema,
          unitCost: z.coerce.number().int().min(0).optional(),
        }),
      )
      .min(1, { error: "Agrega al menos un producto" })
      .max(50, { error: "Máximo 50 productos por recepción" }),
    reason: reasonSchema.optional(),
    idempotencyKey: z.string().optional(),
  }),
  ratelimit: "receiveStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await assertCanManageInventory(ctx, args.barbershop.id, userId);

    // One atomic mutation: either the whole delivery lands or none of it.
    for (const [index, line] of args.lines.entries()) {
      await recordMovement(ctx, {
        barbershopId: args.barbershop.id,
        itemId: line.item.id,
        type: "receipt",
        quantity: line.quantity,
        unitCost: line.unitCost,
        reason: args.reason,
        idempotencyKey: args.idempotencyKey
          ? `${args.idempotencyKey}:${index}`
          : undefined,
        actorUserId: userId,
      });
    }

    await track(ctx, {
      distinctId: userId,
      event: "stock_received",
      properties: {
        barbershopId: args.barbershop.id,
        lineCount: args.lines.length,
        batch: true,
      },
      groups: { barbershop: args.barbershop.id },
    });
  },
});

export const adjustStock = zAuthMutation({
  args: z
    .object({
      item: inventoryItems.tools.id,
      /** Signed correction applied to onHand. */
      delta: z.coerce.number().int().optional(),
      /** Physical count: the delta is computed server-side so the ledger stays truthful. */
      absoluteCount: z.coerce.number().int().min(0).optional(),
      reason: reasonSchema.min(3, {
        error: "El motivo debe tener al menos 3 caracteres",
      }),
    })
    .refine(
      (value) =>
        (value.delta === undefined) !== (value.absoluteCount === undefined),
      { error: "Indica el ajuste o el conteo físico, no ambos" },
    ),
  ratelimit: "adjustStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanManageInventory(ctx, item.barbershopId, userId);

    let delta = args.delta ?? 0;

    if (args.absoluteCount !== undefined) {
      const level = await getLevelForItem(ctx, item._id);
      delta = args.absoluteCount - (level?.onHand ?? 0);
    }

    const result = await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "adjustment",
      quantity: delta,
      reason: args.reason,
      actorUserId: userId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "stock_adjusted",
      properties: {
        itemId: item._id,
        barbershopId: item.barbershopId,
        delta,
      },
      groups: { barbershop: item.barbershopId },
    });

    return result;
  },
});

export const recordConsumption = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    quantity: quantitySchema,
    reason: reasonSchema.optional(),
  }),
  ratelimit: "recordConsumption",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanRecordConsumption(ctx, item.barbershopId, userId);

    if (item.stockBehavior === "durable") {
      throw new ConvexError(errorMessages.durableNotConsumable);
    }

    const result = await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "consumption",
      quantity: args.quantity,
      reason: args.reason,
      actorUserId: userId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "stock_consumed",
      properties: {
        itemId: item._id,
        barbershopId: item.barbershopId,
        quantity: result.quantityApplied,
      },
      groups: { barbershop: item.barbershopId },
    });

    return result;
  },
});

export const recordWaste = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    quantity: quantitySchema,
    reason: reasonSchema.min(3, {
      error: "El motivo debe tener al menos 3 caracteres",
    }),
  }),
  ratelimit: "adjustStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanManageInventory(ctx, item.barbershopId, userId);

    if (item.stockBehavior === "durable") {
      throw new ConvexError(errorMessages.durableNotConsumable);
    }

    const result = await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "waste",
      quantity: args.quantity,
      reason: args.reason,
      actorUserId: userId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "stock_adjusted",
      properties: {
        itemId: item._id,
        barbershopId: item.barbershopId,
        delta: -result.quantityApplied,
        kind: "waste",
      },
      groups: { barbershop: item.barbershopId },
    });

    return result;
  },
});

export const reserveStock = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    quantity: quantitySchema,
    reason: reasonSchema.optional(),
  }),
  ratelimit: "reserveStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanManageInventory(ctx, item.barbershopId, userId);

    const result = await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "reservation",
      quantity: args.quantity,
      reason: args.reason,
      actorUserId: userId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "stock_reserved",
      properties: {
        itemId: item._id,
        barbershopId: item.barbershopId,
        quantity: result.quantityApplied,
      },
      groups: { barbershop: item.barbershopId },
    });

    return result;
  },
});

export const releaseStock = zAuthMutation({
  args: z.object({
    item: inventoryItems.tools.id,
    quantity: quantitySchema,
    reason: reasonSchema.optional(),
  }),
  ratelimit: "reserveStock",
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await requireItemInShop(ctx, args.item.id);

    await assertCanManageInventory(ctx, item.barbershopId, userId);

    return await recordMovement(ctx, {
      barbershopId: item.barbershopId,
      itemId: item._id,
      type: "release",
      quantity: args.quantity,
      reason: args.reason,
      actorUserId: userId,
    });
  },
});

// ---------------------------------------------------------------------------
// Service recipes
// ---------------------------------------------------------------------------

export const setServiceRecipe = zAuthMutation({
  args: z.object({
    service: services.tools.id,
    lines: z
      .array(
        z.object({
          item: inventoryItems.tools.id,
          quantity: quantitySchema,
        }),
      )
      .max(20, { error: "Máximo 20 productos por servicio" }),
  }),
  ratelimit: "setServiceRecipe",
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const service = await ctx.db.get(args.service.id);

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    await assertCanManageInventory(ctx, service.barbershopId, userId);

    const itemIds = args.lines.map((line) => line.item.id);

    if (new Set(itemIds).size !== itemIds.length) {
      throw new ConvexError(errorMessages.duplicateRecipeItem);
    }

    for (const line of args.lines) {
      const item = await requireItemInShop(ctx, line.item.id);

      if (item.barbershopId !== service.barbershopId) {
        throw new ConvexError(errorMessages.unauthorized);
      }

      if (item.deletedAt !== undefined) {
        throw new ConvexError(errorMessages.itemArchived);
      }

      // Recipes consume stock on completion; durable items are reusable assets.
      if (item.stockBehavior === "durable") {
        throw new ConvexError(errorMessages.durableNotConsumable);
      }
    }

    // Replace atomically: the recipe is small and edited as a whole.
    const existing = await ctx.db
      .query("serviceInventoryUsage")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", service._id))
      .collect();

    await Promise.all(existing.map((line) => ctx.db.delete(line._id)));

    for (const line of args.lines) {
      await ctx.db.insert("serviceInventoryUsage", {
        barbershopId: service.barbershopId,
        serviceId: service._id,
        itemId: line.item.id,
        quantity: line.quantity,
      });
    }
  },
});

export const getServiceSupplyCounts = zAuthQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.id),
      authz.require(ctx, userId, "inventory:manage", barbershopScope(args.id)),
    ]);

    const lines = await ctx.db
      .query("serviceInventoryUsage")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .collect();

    const counts = new Map<Service["_id"], Set<InventoryItem["_id"]>>();

    for (const line of lines) {
      const serviceCounts =
        counts.get(line.serviceId) ?? new Set<InventoryItem["_id"]>();

      serviceCounts.add(line.itemId);
      counts.set(line.serviceId, serviceCounts);
    }

    return [...counts.entries()].map(([serviceId, itemIds]) => ({
      serviceId,
      supplyCount: itemIds.size,
    }));
  },
});

// ---------------------------------------------------------------------------
// Appointment lifecycle hooks (design §3.5)
//
// The ledger IS the reservation state: outstanding(appointment, item) =
// Σ reservation − Σ release over movements with that relatedAppointmentId.
// IRON RULE: these helpers never throw — a booking or completion must not
// fail over stock. They clamp, skip archived items, and no-op for shops
// whose plan lacks inventory.
// ---------------------------------------------------------------------------

type AppointmentStockContext = Pick<
  Appointment,
  "_id" | "barbershopId" | "serviceId" | "userId"
>;

async function movementsForAppointment(
  ctx: MutationCtx,
  appointmentId: Appointment["_id"],
): Promise<InventoryMovement[]> {
  return await ctx.db
    .query("inventoryMovements")
    .withIndex("by_relatedAppointmentId", (q) =>
      q.eq("relatedAppointmentId", appointmentId),
    )
    .collect();
}

function outstandingFrom(movements: InventoryMovement[]) {
  const outstanding = new Map<
    string,
    { itemId: InventoryItem["_id"]; locationId?: string; quantity: number }
  >();

  for (const movement of movements) {
    if (movement.type !== "reservation" && movement.type !== "release") {
      continue;
    }

    const key = `${movement.itemId}:${movement.locationId ?? ""}`;
    const entry = outstanding.get(key) ?? {
      itemId: movement.itemId,
      locationId: movement.locationId,
      quantity: 0,
    };

    entry.quantity +=
      movement.type === "reservation" ? movement.quantity : -movement.quantity;
    outstanding.set(key, entry);
  }

  return [...outstanding.values()].filter((entry) => entry.quantity > 0);
}

/** Reserve the service's recipe on booking (both `create` and `agentBook`). */
export async function reserveForAppointment(
  ctx: MutationCtx,
  appointment: AppointmentStockContext,
): Promise<void> {
  if (!(await isInventoryAllowed(ctx, appointment.barbershopId))) {
    return;
  }

  // Idempotent: any prior lifecycle movement means this booking already ran.
  const prior = await ctx.db
    .query("inventoryMovements")
    .withIndex("by_relatedAppointmentId", (q) =>
      q.eq("relatedAppointmentId", appointment._id),
    )
    .first();

  if (prior) {
    return;
  }

  const recipe = await ctx.db
    .query("serviceInventoryUsage")
    .withIndex("by_serviceId", (q) => q.eq("serviceId", appointment.serviceId))
    .collect();

  for (const line of recipe) {
    const item = await ctx.db.get(line.itemId);

    if (!item || item.deletedAt !== undefined) {
      continue;
    }

    // Legacy recipe lines may predate the durable guard — never hold assets.
    if (item.stockBehavior === "durable") {
      continue;
    }

    // Partial reservations are fine: release/consume work from outstanding.
    await recordMovement(ctx, {
      barbershopId: appointment.barbershopId,
      itemId: line.itemId,
      type: "reservation",
      quantity: line.quantity,
      relatedAppointmentId: appointment._id,
      reason: "Reserva por cita",
      actorUserId: appointment.userId,
      clampToAvailable: true,
    });
  }
}

/**
 * Free every outstanding hold for the appointment. Runs on all four exit
 * paths (cancel, no-show, denied reschedule, delete) and — for the
 * hard-deleting `setStatus("cancelled")` — BEFORE the row disappears.
 * Deliberately not plan-gated: releasing holds must always work.
 */
export async function releaseForAppointment(
  ctx: MutationCtx,
  appointment: AppointmentStockContext,
  reason = "Liberación por cita cancelada",
): Promise<void> {
  const movements = await movementsForAppointment(ctx, appointment._id);

  for (const entry of outstandingFrom(movements)) {
    await recordMovement(ctx, {
      barbershopId: appointment.barbershopId,
      itemId: entry.itemId,
      type: "release",
      quantity: entry.quantity,
      locationId: entry.locationId,
      relatedAppointmentId: appointment._id,
      reason,
      actorUserId: appointment.userId,
      clampToAvailable: true,
    });
  }
}

/**
 * Completion: release the holds, then consume the CURRENT recipe (clamped to
 * onHand for strict items, shortfall noted in the reason — the
 * completed-but-stock-changed race never blocks the barber).
 */
export async function consumeForAppointment(
  ctx: MutationCtx,
  appointment: AppointmentStockContext,
): Promise<void> {
  const movements = await movementsForAppointment(ctx, appointment._id);

  // Idempotent: a completed appointment consumes at most once.
  if (movements.some((movement) => movement.type === "consumption")) {
    return;
  }

  for (const entry of outstandingFrom(movements)) {
    await recordMovement(ctx, {
      barbershopId: appointment.barbershopId,
      itemId: entry.itemId,
      type: "release",
      quantity: entry.quantity,
      locationId: entry.locationId,
      relatedAppointmentId: appointment._id,
      reason: "Liberación por cita completada",
      actorUserId: appointment.userId,
      clampToAvailable: true,
    });
  }

  if (!(await isInventoryAllowed(ctx, appointment.barbershopId))) {
    return;
  }

  const recipe = await ctx.db
    .query("serviceInventoryUsage")
    .withIndex("by_serviceId", (q) => q.eq("serviceId", appointment.serviceId))
    .collect();

  for (const line of recipe) {
    const item = await ctx.db.get(line.itemId);

    if (!item || item.deletedAt !== undefined) {
      continue;
    }

    // Legacy recipe lines may predate the durable guard — never consume assets.
    if (item.stockBehavior === "durable") {
      continue;
    }

    await recordMovement(ctx, {
      barbershopId: appointment.barbershopId,
      itemId: line.itemId,
      type: "consumption",
      quantity: line.quantity,
      relatedAppointmentId: appointment._id,
      reason: "Consumo por servicio",
      actorUserId: appointment.userId,
      clampToAvailable: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries — every read path is indexed; ledger reads are always paginated
// ---------------------------------------------------------------------------

/**
 * Viewers need `inventory:view` (barbers get the reduced view).
 * Returns whether the caller may see costs/valuation (`inventory:manage`).
 */
async function assertCanViewInventory(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
  userId: string,
): Promise<{ canManage: boolean }> {
  await assertInventoryAllowed(ctx, barbershopId);

  const scope = barbershopScope(barbershopId);
  const [canManage, canView] = await Promise.all([
    authz.can(ctx, userId, "inventory:manage", scope),
    authz.can(ctx, userId, "inventory:view", scope),
  ]);

  if (!canManage && !canView) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  return { canManage };
}

/**
 * The dashboard spine: active items joined with their summed balances in one
 * live subscription. Costs and valuation are included only for managers —
 * barbers get the reduced shape by design.
 */
export const getInventoryOverview = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const { canManage } = await assertCanViewInventory(
      ctx,
      args.barbershop.id,
      userId,
    );

    const [items, levels] = await Promise.all([
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
    ]);

    const balances = new Map<string, { onHand: number; reserved: number }>();

    for (const level of levels) {
      const current = balances.get(level.itemId) ?? { onHand: 0, reserved: 0 };
      current.onHand += level.onHand;
      current.reserved += level.reserved;
      balances.set(level.itemId, current);
    }

    const rows = items
      .filter((item) => item.deletedAt === undefined)
      .map((item) => {
        const balance = balances.get(item._id) ?? { onHand: 0, reserved: 0 };

        return {
          _id: item._id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          stockBehavior: item.stockBehavior,
          brand: item.brand,
          customLabel: item.customLabel,
          presentationValue: item.presentationValue,
          presentationUnit: item.presentationUnit,
          isSellable: item.isSellable,
          // The sale price is what the customer pays — barbers need it to
          // register sales. Costs and valuation stay manager-only.
          salePrice: item.salePrice,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
          imageKey: item.imageKey,
          onHand: balance.onHand,
          reserved: balance.reserved,
          available: balance.onHand - balance.reserved,
          belowReorder: balance.onHand <= item.reorderPoint,
          ...(canManage
            ? {
                unitCost: item.unitCost,
                allowNegativeStock: item.allowNegativeStock,
                value: balance.onHand * item.unitCost,
                supplier: item.supplier,
                model: item.model,
                serialNumber: item.serialNumber,
                purchasedAt: item.purchasedAt,
                warrantyUntil: item.warrantyUntil,
                notes: item.notes,
              }
            : {}),
        };
      });

    return { rows, canManage };
  },
});

export const listArchivedItems = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.barbershop.id),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(args.barbershop.id),
      ),
    ]);

    const [items, levels] = await Promise.all([
      // gt(0) skips active rows (deletedAt undefined sorts below all numbers).
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId_and_deletedAt", (q) =>
          q.eq("barbershopId", args.barbershop.id).gt("deletedAt", 0),
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
    ]);

    const balances = new Map<
      InventoryItem["_id"],
      { onHand: number; reserved: number }
    >();

    for (const level of levels) {
      const current = balances.get(level.itemId) ?? { onHand: 0, reserved: 0 };
      current.onHand += level.onHand;
      current.reserved += level.reserved;
      balances.set(level.itemId, current);
    }

    return items.map((item) => {
      const balance = balances.get(item._id) ?? { onHand: 0, reserved: 0 };

      return {
        _id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        stockBehavior: item.stockBehavior,
        brand: item.brand,
        customLabel: item.customLabel,
        presentationValue: item.presentationValue,
        presentationUnit: item.presentationUnit,
        isSellable: item.isSellable,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        imageKey: item.imageKey,
        deletedAt: item.deletedAt,
        onHand: balance.onHand,
        reserved: balance.reserved,
        available: balance.onHand - balance.reserved,
        unitCost: item.unitCost,
        salePrice: item.salePrice,
        allowNegativeStock: item.allowNegativeStock,
        value: balance.onHand * item.unitCost,
      };
    });
  },
});

export const listItems = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    category: z.enum(inventoryCategories).optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const { canManage } = await assertCanViewInventory(
      ctx,
      args.barbershop.id,
      userId,
    );

    const category = args.category;
    const query = category
      ? ctx.db
          .query("inventoryItems")
          .withIndex("by_barbershopId_and_category_and_deletedAt", (q) =>
            q
              .eq("barbershopId", args.barbershop.id)
              .eq("category", category)
              .eq("deletedAt", undefined),
          )
      : ctx.db
          .query("inventoryItems")
          .withIndex("by_barbershopId_and_deletedAt", (q) =>
            q.eq("barbershopId", args.barbershop.id).eq("deletedAt", undefined),
          );

    const page = await query.order("desc").paginate(args.paginationOpts);

    if (canManage) {
      return page;
    }

    return {
      ...page,
      page: page.page.map((item) => {
        // Same policy as getInventoryOverview: costs and the supplier/equipment
        // sheet are manager-only; salePrice is the public price barbers charge.
        const {
          unitCost: _uc,
          supplier: _sup,
          notes: _no,
          model: _mo,
          serialNumber: _sn,
          purchasedAt: _pa,
          warrantyUntil: _wu,
          ...reduced
        } = item;

        return reduced;
      }),
    };
  },
});

export const getItem = zAuthQuery({
  args: z.object({ item: inventoryItems.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await ctx.db.get(args.item.id);

    if (!item) {
      throw new ConvexError(errorMessages.notFound("producto"));
    }

    const { canManage } = await assertCanViewInventory(
      ctx,
      item.barbershopId,
      userId,
    );

    const levels = await ctx.db
      .query("inventoryLevels")
      .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
      .collect();

    if (!canManage) {
      // Same policy as getInventoryOverview: costs and the supplier/equipment
      // sheet are manager-only; salePrice is the public price barbers charge.
      const {
        unitCost: _uc,
        supplier: _sup,
        notes: _no,
        model: _mo,
        serialNumber: _sn,
        purchasedAt: _pa,
        warrantyUntil: _wu,
        ...reduced
      } = item;

      return {
        item: reduced,
        levels: levels.map(({ unitCost: _luc, ...level }) => level),
      };
    }

    return { item, levels };
  },
});

/** The restock list: levels flagged below their reorder point, item-joined. */
export const listLowStock = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await assertCanViewInventory(ctx, args.barbershop.id, userId);

    const levels = await ctx.db
      .query("inventoryLevels")
      .withIndex("by_barbershopId_and_belowReorder", (q) =>
        q.eq("barbershopId", args.barbershop.id).eq("belowReorder", true),
      )
      .collect();

    const rows = await Promise.all(
      levels.map(async (level) => {
        const item = await ctx.db.get(level.itemId);

        if (!item || item.deletedAt !== undefined) {
          return null;
        }

        return {
          itemId: item._id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          onHand: level.onHand,
          reserved: level.reserved,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
        };
      }),
    );

    return rows.filter((row) => row !== null);
  },
});

/** Immutable ledger history for one item — always paginated. Managers only. */
export const listMovements = zAuthQuery({
  args: z.object({
    item: inventoryItems.tools.id,
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const item = await ctx.db.get(args.item.id);

    if (!item) {
      throw new ConvexError(errorMessages.notFound("producto"));
    }

    await Promise.all([
      assertInventoryAllowed(ctx, item.barbershopId),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(item.barbershopId),
      ),
    ]);

    const result = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
      .order("desc")
      .paginate(args.paginationOpts);

    // Accountability: resolve each actor once per page so the ledger shows
    // WHO moved stock, not just what moved.
    const actorIds = [...new Set(result.page.map((m) => m.actorUserId))];
    const actorNames = new Map(
      await Promise.all(
        actorIds.map(async (actorId) => {
          const profile = await getProfileByUserId(ctx, actorId);
          return [actorId, profile?.name] as const;
        }),
      ),
    );

    return {
      ...result,
      page: result.page.map((movement) => ({
        ...movement,
        actorName: actorNames.get(movement.actorUserId),
      })),
    };
  },
});

/** Total inventory value, O(log n) from the aggregate. Managers only. */
export const getValuation = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.barbershop.id),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(args.barbershop.id),
      ),
    ]);

    // Joined in code instead of the raw aggregate: the aggregate sums every
    // level, but the dashboard number must exclude archived items and keep
    // durable assets apart from consumable stock — a clipper is capital, not
    // shelf inventory. Per-shop rows are few (same collect the overview does).
    const [items, levels] = await Promise.all([
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
    ]);

    const activeItems = new Map(
      items
        .filter((item) => item.deletedAt === undefined)
        .map((item) => [item._id, item]),
    );

    let totalValue = 0;
    let equipmentValue = 0;
    let levelCount = 0;

    for (const level of levels) {
      const item = activeItems.get(level.itemId);

      if (!item) {
        continue;
      }

      levelCount += 1;
      const value = level.onHand * level.unitCost;

      if (item.stockBehavior === "durable") {
        equipmentValue += value;
      } else {
        totalValue += value;
      }
    }

    return { totalValue, equipmentValue, levelCount };
  },
});

/**
 * Units moved in a Bogotá-local calendar month, summed from the movements
 * aggregate via [type, time] prefix bounds — no ledger scan. Managers only.
 */
export const getMonthlyConsumption = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    /** "YYYY-MM" (America/Bogota). Defaults to the current month. */
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, { error: "Usa el formato YYYY-MM" })
      .optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.barbershop.id),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(args.barbershop.id),
      ),
    ]);

    const month = args.month ?? toColombiaDateKey(Date.now()).slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth =
      monthNumber === 12
        ? `${year + 1}-01`
        : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
    const startMs = colombiaDateKeyToMs(`${month}-01`);
    const endMs = colombiaDateKeyToMs(`${nextMonth}-01`);

    const boundsFor = (type: InventoryMovementType) => ({
      lower: { key: [type, startMs] as [string, number], inclusive: true },
      upper: { key: [type, endMs] as [string, number], inclusive: false },
    });

    const [consumed, sold, received, wasted, consumedCount, soldCount] =
      await Promise.all([
        inventoryMovementsAggregate.sum(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("consumption"),
        }),
        inventoryMovementsAggregate.sum(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("sale"),
        }),
        inventoryMovementsAggregate.sum(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("receipt"),
        }),
        inventoryMovementsAggregate.sum(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("waste"),
        }),
        // Movement counts: the sums mix units (ml + und + cajas), so the
        // dashboard cards report operations instead of a meaningless total.
        inventoryMovementsAggregate.count(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("consumption"),
        }),
        inventoryMovementsAggregate.count(ctx, {
          namespace: args.barbershop.id,
          bounds: boundsFor("sale"),
        }),
      ]);

    return {
      month,
      consumed,
      sold,
      received,
      wasted,
      consumedCount,
      soldCount,
    };
  },
});

/** Bogotá months covered by the inventory activity trend. */
const MOVEMENT_TREND_MONTHS = 6;

/**
 * Movement activity per Bogotá month for the last 6 months, one aggregate
 * count per (type, month) — O(log n) each, no ledger scan. Counts operations
 * rather than quantities for the same reason as `getMonthlyConsumption`: the
 * sums mix units (ml + und + cajas). Managers only, like the rest of the
 * analytics surface. Months inside the 12-month retention horizon always have
 * their raw rows, so the aggregate alone is sufficient.
 */
export const getMovementTrend = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.barbershop.id),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(args.barbershop.id),
      ),
    ]);

    const currentMonth = toColombiaDateKey(Date.now()).slice(0, 7);
    const [currentYear, currentMonthNumber] = currentMonth
      .split("-")
      .map(Number);
    const baseMonthIndex = currentYear * 12 + (currentMonthNumber - 1);

    const monthKeys: string[] = [];

    for (let offset = MOVEMENT_TREND_MONTHS - 1; offset >= 0; offset--) {
      const monthIndex = baseMonthIndex - offset;
      const year = Math.floor(monthIndex / 12);
      const monthNumber = (monthIndex % 12) + 1;

      monthKeys.push(`${year}-${String(monthNumber).padStart(2, "0")}`);
    }

    return await Promise.all(
      monthKeys.map(async (month) => {
        const [year, monthNumber] = month.split("-").map(Number);
        const nextMonth =
          monthNumber === 12
            ? `${year + 1}-01`
            : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
        const startMs = colombiaDateKeyToMs(`${month}-01`);
        const endMs = colombiaDateKeyToMs(`${nextMonth}-01`);

        const countFor = (type: InventoryMovementType) =>
          inventoryMovementsAggregate.count(ctx, {
            namespace: args.barbershop.id,
            bounds: {
              lower: { key: [type, startMs], inclusive: true },
              upper: { key: [type, endMs], inclusive: false },
            },
          });

        const [consumption, sale, receipt, waste] = await Promise.all([
          countFor("consumption"),
          countFor("sale"),
          countFor("receipt"),
          countFor("waste"),
        ]);

        return { month, consumption, sale, receipt, waste };
      }),
    );
  },
});

/**
 * Shop-wide movement ledger (newest first) for the Movimientos view — the
 * per-item variant is `listMovements`. Managers only: rows expose costs.
 */
export const listShopMovements = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    paginationOpts: convexToZod(paginationOptsValidator),
    /** Optional ledger filters. Equality combinations use compound indexes. */
    filters: z
      .object({
        type: inventoryMovementTypeSchema.optional(),
        itemId: inventoryItems.tools.id.shape.id.optional(),
        actorUserId: z.string().optional(),
        /** Window bounds in epoch ms; ride the index's `_creationTime`. */
        startTime: z.number().optional(),
        endTime: z.number().optional(),
      })
      .optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertInventoryAllowed(ctx, args.barbershop.id),
      authz.require(
        ctx,
        userId,
        "inventory:manage",
        barbershopScope(args.barbershop.id),
      ),
    ]);

    const { type, itemId, actorUserId, startTime, endTime } =
      args.filters ?? {};

    // A product filter reads `by_itemId`, which is not shop-scoped. Assert
    // ownership up-front (same guard `listMovements` uses) so the range can
    // never surface another shop's ledger.
    if (itemId !== undefined) {
      const item = await ctx.db.get(itemId);

      if (!item || item.barbershopId !== args.barbershop.id) {
        throw new ConvexError(errorMessages.notFound("producto"));
      }
    }

    // Unconditional creation-time bounds keep the index chain flat: an absent
    // bound widens to the full range without changing which index is scanned.
    const startBound = startTime ?? 0;
    const endBound = endTime ?? Number.MAX_SAFE_INTEGER;

    // Index priority = the most-specific active equality combination.
    const base =
      itemId !== undefined && type !== undefined && actorUserId !== undefined
        ? ctx.db
            .query("inventoryMovements")
            .withIndex("by_itemId_and_type_and_actorUserId", (q) =>
              q
                .eq("itemId", itemId)
                .eq("type", type)
                .eq("actorUserId", actorUserId)
                .gte("_creationTime", startBound)
                .lt("_creationTime", endBound),
            )
        : itemId !== undefined && type !== undefined
          ? ctx.db
              .query("inventoryMovements")
              .withIndex("by_itemId_and_type", (q) =>
                q
                  .eq("itemId", itemId)
                  .eq("type", type)
                  .gte("_creationTime", startBound)
                  .lt("_creationTime", endBound),
              )
          : itemId !== undefined && actorUserId !== undefined
            ? ctx.db
                .query("inventoryMovements")
                .withIndex("by_itemId_and_actorUserId", (q) =>
                  q
                    .eq("itemId", itemId)
                    .eq("actorUserId", actorUserId)
                    .gte("_creationTime", startBound)
                    .lt("_creationTime", endBound),
                )
            : itemId !== undefined
              ? ctx.db
                  .query("inventoryMovements")
                  .withIndex("by_itemId", (q) =>
                    q
                      .eq("itemId", itemId)
                      .gte("_creationTime", startBound)
                      .lt("_creationTime", endBound),
                  )
              : type !== undefined && actorUserId !== undefined
                ? ctx.db
                    .query("inventoryMovements")
                    .withIndex(
                      "by_barbershopId_and_type_and_actorUserId",
                      (q) =>
                        q
                          .eq("barbershopId", args.barbershop.id)
                          .eq("type", type)
                          .eq("actorUserId", actorUserId)
                          .gte("_creationTime", startBound)
                          .lt("_creationTime", endBound),
                    )
                : type !== undefined
                  ? ctx.db
                      .query("inventoryMovements")
                      .withIndex("by_barbershopId_and_type", (q) =>
                        q
                          .eq("barbershopId", args.barbershop.id)
                          .eq("type", type)
                          .gte("_creationTime", startBound)
                          .lt("_creationTime", endBound),
                      )
                  : actorUserId !== undefined
                    ? ctx.db
                        .query("inventoryMovements")
                        .withIndex("by_barbershopId_and_actorUserId", (q) =>
                          q
                            .eq("barbershopId", args.barbershop.id)
                            .eq("actorUserId", actorUserId)
                            .gte("_creationTime", startBound)
                            .lt("_creationTime", endBound),
                        )
                    : ctx.db
                        .query("inventoryMovements")
                        .withIndex("by_barbershopId", (q) =>
                          q
                            .eq("barbershopId", args.barbershop.id)
                            .gte("_creationTime", startBound)
                            .lt("_creationTime", endBound),
                        );

    const result = await base.order("desc").paginate(args.paginationOpts);

    // Accountability: resolve each actor once per page so the ledger shows
    // WHO moved stock, not just what moved.
    const actorIds = [...new Set(result.page.map((m) => m.actorUserId))];
    const actorNames = new Map(
      await Promise.all(
        actorIds.map(async (actorId) => {
          const profile = await getProfileByUserId(ctx, actorId);
          return [actorId, profile?.name] as const;
        }),
      ),
    );

    return {
      ...result,
      page: result.page.map((movement) => ({
        ...movement,
        actorName: actorNames.get(movement.actorUserId),
      })),
    };
  },
});

export const getServiceRecipe = zAuthQuery({
  args: z.object({ service: services.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const service = await ctx.db.get(args.service.id);

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    await assertCanViewInventory(ctx, service.barbershopId, userId);

    const lines = await ctx.db
      .query("serviceInventoryUsage")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", service._id))
      .collect();

    return await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);

        return {
          itemId: line.itemId,
          quantity: line.quantity,
          name: item?.name ?? "",
          unit: item?.unit ?? "unit",
          isArchived: item?.deletedAt !== undefined,
          /** Legacy lines only — new recipes reject durable items at save time. */
          isDurable: item?.stockBehavior === "durable",
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Retention — the ledger is append-only but not immortal
// ---------------------------------------------------------------------------

const MOVEMENT_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const ROLLUP_BATCH_SIZE = 500;

/**
 * Folds movements older than 12 months into `inventoryMovementSummaries`
 * (per item × Bogotá-month × type) and prunes the raw rows THROUGH the
 * trigger-wrapped db, so the movements aggregate stays consistent with live
 * rows by construction. Periods inside the horizon read the aggregate;
 * older periods read the summaries. Batched; the weekly cron catches up.
 */
export const rollupOldMovements = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const horizon = Date.now() - MOVEMENT_RETENTION_MS;

    const oldMovements = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", horizon))
      .take(ROLLUP_BATCH_SIZE);

    const db = inventoryTriggers.wrapDB(ctx).db;

    for (const movement of oldMovements) {
      const month = toColombiaDateKey(movement._creationTime).slice(0, 7);

      const summaries = await ctx.db
        .query("inventoryMovementSummaries")
        .withIndex("by_itemId_and_month", (q) =>
          q.eq("itemId", movement.itemId).eq("month", month),
        )
        .collect();
      const summary = summaries.find((row) => row.type === movement.type);

      // `quantity` is signed for adjustments, a magnitude otherwise — the
      // summary keeps the same semantics per type.
      if (summary) {
        await ctx.db.patch(summary._id, {
          totalQuantity: summary.totalQuantity + movement.quantity,
          totalCost:
            summary.totalCost + movement.quantity * movement.unitCostAtTime,
        });
      } else {
        await ctx.db.insert("inventoryMovementSummaries", {
          barbershopId: movement.barbershopId,
          itemId: movement.itemId,
          itemName: movement.itemName,
          month,
          type: movement.type,
          totalQuantity: movement.quantity,
          totalCost: movement.quantity * movement.unitCostAtTime,
        });
      }

      await db.delete(movement._id);
    }

    return { rolledUp: oldMovements.length };
  },
});

/**
 * Drift detector: recomputes both balances from the ledger via the effects
 * matrix and compares them to the level docs. Convex atomicity means this
 * should never report drift — it exists as the repair/verification path.
 */
export const reconcileItem = zInternalQuery({
  args: z.object({ itemId: inventoryItems.tools.id.shape.id }),
  handler: async (ctx, args) => {
    const [movements, levels] = await Promise.all([
      ctx.db
        .query("inventoryMovements")
        .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
        .collect(),
    ]);

    const computed = new Map<
      string | undefined,
      { onHand: number; reserved: number }
    >();

    for (const movement of movements) {
      const effects = movementEffects(movement.type, movement.quantity);
      const balance = computed.get(movement.locationId) ?? {
        onHand: 0,
        reserved: 0,
      };
      balance.onHand += effects.onHandDelta;
      balance.reserved += effects.reservedDelta;
      computed.set(movement.locationId, balance);
    }

    return levels.map((level) => {
      const ledger = computed.get(level.locationId) ?? {
        onHand: 0,
        reserved: 0,
      };

      return {
        levelId: level._id,
        locationId: level.locationId,
        level: { onHand: level.onHand, reserved: level.reserved },
        ledger,
        drift:
          level.onHand !== ledger.onHand || level.reserved !== ledger.reserved,
      };
    });
  },
});
