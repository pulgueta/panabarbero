import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthAction, zAuthMutation, zAuthQuery, zInternalQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertInventoryAllowed } from "./acl";
import { track } from "./analytics";
import { authz, barbershopScope } from "./authz";
import { errorMessages } from "./errors";
import { requireUserId } from "./identity";
import { recordMovement } from "./inventory";
import { auditLog } from "./log";
import { r2 } from "./r2";
import type { Barbershop, InventoryItem } from "./schema";
import {
  barbershops,
  inventoryItems,
  inventorySaleDocumentTypes,
  inventorySalePaymentMethods,
  inventorySales,
} from "./schema";
import { getProfileByUserId } from "./userProfileData";
import {
  colombiaDateKeyToMs,
  formatPhoneNumber,
  toColombiaDateKey,
} from "./utils";

const MAX_SALE_LINES = 25;
const MAX_PROOF_SIZE = 8 * 1024 * 1024;
const SALE_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
] as const;

const proofContentTypeSchema = z.enum(SALE_PROOF_TYPES);

const proofSchema = z.object({
  key: z.string(),
  fileName: z.string().trim().min(1).max(180),
  contentType: proofContentTypeSchema,
  size: z.number().int().positive().max(MAX_PROOF_SIZE),
});

const saleCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { error: "El nombre del cliente debe tener al menos 3 caracteres" })
    .max(120),
  documentType: z.enum(inventorySaleDocumentTypes).optional(),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{3,20}$/, {
      error: "El número de documento no es válido",
    })
    .optional(),
  phone: z.string().trim().min(7).max(16).optional(),
  email: z.email({ error: "El correo del cliente no es válido" }).optional(),
});

const saleLinesSchema = z
  .array(
    z.object({
      item: inventoryItems.tools.id,
      quantity: z.coerce.number().int().min(1).max(100_000),
    }),
  )
  .min(1, { error: "Agrega al menos un producto" })
  .max(MAX_SALE_LINES, {
    error: `Máximo ${MAX_SALE_LINES} productos por venta`,
  });

async function assertCanSell(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
  userId: string,
) {
  await Promise.all([
    assertInventoryAllowed(ctx, barbershopId),
    authz.require(ctx, userId, "inventory:sell", barbershopScope(barbershopId)),
  ]);
}

function proofExtension(contentType: (typeof SALE_PROOF_TYPES)[number]) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "application/pdf":
      return "pdf";
  }
}

export const createProofUpload = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    fileName: z.string().trim().min(1).max(180),
    contentType: proofContentTypeSchema,
    size: z.number().int().positive().max(MAX_PROOF_SIZE),
  }),
  ratelimit: "r2",
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const key = `assets/sales/${args.barbershop.id}/${crypto.randomUUID()}.${proofExtension(args.contentType)}`;
    return await r2.generateUploadUrl(key);
  },
});

export const deleteOrphanProof = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    key: z.string(),
  }),
  ratelimit: "deleteR2Object",
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    if (!args.key.startsWith(`assets/sales/${args.barbershop.id}/`)) {
      throw new ConvexError(errorMessages.invalidSaleProof);
    }

    const linkedSale = await ctx.db
      .query("inventorySales")
      .withIndex("by_proofKey", (q) => q.eq("proofKey", args.key))
      .unique();

    if (linkedSale) {
      throw new ConvexError(errorMessages.invalidSaleProof);
    }

    await r2.deleteObject(ctx, args.key);
  },
});

export const assertSellAccess = zInternalQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await assertCanSell(ctx, args.barbershop.id, userId);
  },
});

/**
 * Awaited metadata sync. The r2 clientApi `syncMetadata` mutation only
 * schedules the sync (`runAfter(0)`), so `registerSale`'s metadata
 * cross-check raced it and rejected valid proofs. Clients must call this
 * after the PUT; it returns once the component has the metadata row.
 */
export const finalizeProofUpload = zAuthAction({
  args: z.object({
    barbershop: barbershops.tools.id,
    key: z.string(),
  }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.inventorySales.assertSellAccess, {
      barbershop: args.barbershop,
    });

    if (!args.key.startsWith(`assets/sales/${args.barbershop.id}/`)) {
      throw new ConvexError(errorMessages.invalidSaleProof);
    }

    await r2.syncMetadata(ctx, args.key);
  },
});

export const listSellableItems = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const [items, levels] = await Promise.all([
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId_and_deletedAt", (q) =>
          q.eq("barbershopId", args.barbershop.id).eq("deletedAt", undefined),
        )
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershop.id),
        )
        .collect(),
    ]);

    const levelByItem = new Map(
      levels
        .filter((level) => level.locationId === undefined)
        .map((level) => [level.itemId, level]),
    );

    return items
      .flatMap((item) => {
        if (
          !item.isSellable ||
          item.stockBehavior !== "consumable" ||
          item.salePrice === undefined
        ) {
          return [];
        }

        const level = levelByItem.get(item._id);
        const onHand = level?.onHand ?? 0;
        const reserved = level?.reserved ?? 0;

        return [
          {
            _id: item._id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            unit: item.unit,
            brand: item.brand,
            model: item.model,
            customLabel: item.customLabel,
            presentationValue: item.presentationValue,
            presentationUnit: item.presentationUnit,
            imageKey: item.imageKey,
            salePrice: item.salePrice,
            allowNegativeStock: item.allowNegativeStock,
            onHand,
            reserved,
            available: onHand - reserved,
            belowReorder: onHand <= item.reorderPoint,
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});

/**
 * Folds one sale into its Bogotá day's rollup rows, which `getSalesMetrics`
 * reads in place of the raw sales/lines.
 *
 * Increment-only on purpose: nothing outside the barbershop cascade (which
 * deletes the rollup rows too) ever removes a sale, so these counters never
 * need to walk backwards. The day row is one hot document per shop, so two
 * sales rung up in the same instant contend and one retries — a non-issue at a
 * register's volume, and the append-then-fold alternative would just move the
 * unbounded scan back into the dashboard.
 */
async function foldSaleIntoRollup(
  ctx: MutationCtx,
  args: {
    barbershopId: Barbershop["_id"];
    date: string;
    revenue: number;
    unitsSold: number;
    lines: {
      itemId: InventoryItem["_id"];
      itemName: string;
      units: number;
      revenue: number;
    }[];
  },
) {
  const day = await ctx.db
    .query("inventorySalesDaily")
    .withIndex("by_barbershopId_and_date", (q) =>
      q.eq("barbershopId", args.barbershopId).eq("date", args.date),
    )
    .unique();

  if (day) {
    await ctx.db.patch(day._id, {
      revenue: day.revenue + args.revenue,
      saleCount: day.saleCount + 1,
      unitsSold: day.unitsSold + args.unitsSold,
    });
  } else {
    await ctx.db.insert("inventorySalesDaily", {
      barbershopId: args.barbershopId,
      date: args.date,
      revenue: args.revenue,
      saleCount: 1,
      unitsSold: args.unitsSold,
    });
  }

  // `registerSale` rejects duplicate items in one sale, so each line maps to a
  // distinct rollup row.
  for (const line of args.lines) {
    const existing = await ctx.db
      .query("inventorySalesDailyItems")
      .withIndex("by_barbershopId_and_date_and_itemId", (q) =>
        q
          .eq("barbershopId", args.barbershopId)
          .eq("date", args.date)
          .eq("itemId", line.itemId),
      )
      .unique();

    if (existing) {
      // itemName left alone: the chart labels an item by the first name seen in
      // the window, matching the line snapshots it used to aggregate.
      await ctx.db.patch(existing._id, {
        units: existing.units + line.units,
        revenue: existing.revenue + line.revenue,
      });
    } else {
      await ctx.db.insert("inventorySalesDailyItems", {
        barbershopId: args.barbershopId,
        itemId: line.itemId,
        date: args.date,
        itemName: line.itemName,
        units: line.units,
        revenue: line.revenue,
      });
    }
  }
}

export const registerSale = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    lines: saleLinesSchema,
    paymentMethod: z.enum(inventorySalePaymentMethods),
    paymentReference: z.string().trim().max(60).optional(),
    issueReceipt: z.boolean().optional(),
    customer: saleCustomerSchema.optional(),
    notes: z.string().trim().max(300).optional(),
    proof: proofSchema.optional(),
  }),
  ratelimit: "recordSale",
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const itemIds = args.lines.map((line) => line.item.id);

    if (new Set(itemIds).size !== itemIds.length) {
      throw new ConvexError(errorMessages.duplicateSaleItem);
    }

    const customer = args.customer;
    const issueReceipt = args.issueReceipt ?? false;

    if (
      issueReceipt &&
      (!customer ||
        !customer.documentType ||
        !customer.documentNumber ||
        !customer.phone)
    ) {
      throw new ConvexError(errorMessages.receiptRequiresCustomer);
    }

    if (
      customer &&
      Boolean(customer.documentType) !== Boolean(customer.documentNumber)
    ) {
      throw new ConvexError(errorMessages.incompleteSaleCustomerDocument);
    }

    const customerPhone = customer?.phone
      ? formatPhoneNumber(customer.phone)
      : undefined;

    if (customer?.phone && !customerPhone) {
      throw new ConvexError(errorMessages.invalidSaleCustomerPhone);
    }

    const proof = args.proof;

    if (proof && !proof.key.startsWith(`assets/sales/${args.barbershop.id}/`)) {
      throw new ConvexError(errorMessages.invalidSaleProof);
    }

    if (proof) {
      const [metadata, linkedSale] = await Promise.all([
        r2.getMetadata(ctx, proof.key),
        ctx.db
          .query("inventorySales")
          .withIndex("by_proofKey", (q) => q.eq("proofKey", proof.key))
          .unique(),
      ]);

      if (
        !metadata ||
        linkedSale ||
        metadata.contentType !== proof.contentType ||
        metadata.size !== proof.size
      ) {
        throw new ConvexError(errorMessages.invalidSaleProof);
      }
    }

    const items = await Promise.all(
      itemIds.map((itemId) => ctx.db.get(itemId)),
    );
    const preparedLines = args.lines.map((line, index) => {
      const item = items[index];

      if (!item) {
        throw new ConvexError(errorMessages.notFound("producto"));
      }
      if (item.barbershopId !== args.barbershop.id) {
        throw new ConvexError(errorMessages.unauthorized);
      }
      if (item.deletedAt !== undefined) {
        throw new ConvexError(errorMessages.itemArchived);
      }
      if (!item.isSellable || item.salePrice === undefined) {
        throw new ConvexError(errorMessages.itemNotSellable);
      }
      if (item.stockBehavior === "durable") {
        throw new ConvexError(errorMessages.durableNotConsumable);
      }

      const lineTotal = line.quantity * item.salePrice;

      if (!Number.isSafeInteger(lineTotal)) {
        throw new ConvexError(errorMessages.invalidSaleTotal);
      }

      return {
        item,
        quantity: line.quantity,
        unitPrice: item.salePrice,
        lineTotal,
      };
    });

    const totalAmount = preparedLines.reduce(
      (total, line) => total + line.lineTotal,
      0,
    );
    if (!Number.isSafeInteger(totalAmount)) {
      throw new ConvexError(errorMessages.invalidSaleTotal);
    }

    const saleId = await ctx.db.insert("inventorySales", {
      barbershopId: args.barbershop.id,
      actorUserId: ctx.userId,
      totalAmount,
      lineCount: preparedLines.length,
      paymentMethod: args.paymentMethod,
      paymentReference: args.paymentReference || undefined,
      receiptIssued: issueReceipt || undefined,
      customerName: customer?.name,
      customerDocumentType: customer?.documentType,
      customerDocumentNumber: customer?.documentNumber,
      customerPhone,
      customerEmail: customer?.email,
      notes: args.notes || undefined,
      proofKey: args.proof?.key,
      proofFileName: args.proof?.fileName,
      proofContentType: args.proof?.contentType,
      proofSize: args.proof?.size,
    });

    await Promise.all(
      preparedLines.map(async (line) => {
        const movement = await recordMovement(ctx, {
          barbershopId: args.barbershop.id,
          itemId: line.item._id,
          type: "sale",
          quantity: line.quantity,
          actorUserId: ctx.userId,
          salePriceAtTime: line.unitPrice,
          relatedSaleId: saleId,
        });

        if (!movement.movementId) {
          throw new ConvexError(errorMessages.invalidQuantity);
        }

        await ctx.db.insert("inventorySaleLines", {
          saleId,
          barbershopId: args.barbershop.id,
          itemId: line.item._id,
          movementId: movement.movementId,
          itemName: line.item.name,
          sku: line.item.sku,
          category: line.item.category,
          unit: line.item.unit,
          brand: line.item.brand,
          model: line.item.model,
          customLabel: line.item.customLabel,
          presentationValue: line.item.presentationValue,
          presentationUnit: line.item.presentationUnit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCostAtTime: line.item.unitCost,
          lineTotal: line.lineTotal,
        });
      }),
    );

    await foldSaleIntoRollup(ctx, {
      barbershopId: args.barbershop.id,
      date: toColombiaDateKey(Date.now()),
      revenue: totalAmount,
      unitsSold: preparedLines.reduce(
        (units, line) => units + line.quantity,
        0,
      ),
      lines: preparedLines.map((line) => ({
        itemId: line.item._id,
        itemName: line.item.name,
        units: line.quantity,
        revenue: line.lineTotal,
      })),
    });

    await auditLog.logChange(ctx, {
      action: "inventory.sale.created",
      actorId: ctx.userId,
      resourceType: "inventory.sale",
      resourceId: saleId,
      before: undefined,
      after: {
        totalAmount,
        lineCount: preparedLines.length,
        paymentMethod: args.paymentMethod,
        hasCustomer: Boolean(customer),
        receiptIssued: issueReceipt,
        hasProof: Boolean(args.proof),
      },
      generateDiff: true,
      severity: "info",
      tags: ["inventory", `barbershop:${args.barbershop.id}`, `sale:${saleId}`],
      retentionCategory: "inventory",
    });

    await track(ctx, {
      distinctId: ctx.userId,
      event: "product_sold",
      properties: {
        barbershopId: args.barbershop.id,
        saleId,
        lineCount: preparedLines.length,
        revenue: totalAmount,
        paymentMethod: args.paymentMethod,
        hasCustomer: Boolean(customer),
        receiptIssued: issueReceipt,
        hasProof: Boolean(args.proof),
      },
      groups: { barbershop: args.barbershop.id },
    });

    if (issueReceipt && customer?.email) {
      const barbershop = await ctx.db.get(args.barbershop.id);

      await ctx.scheduler.runAfter(0, internal.emails.sendSaleReceiptEmail, {
        to: customer.email,
        customerName: customer.name,
        customerDocument:
          customer.documentType && customer.documentNumber
            ? `${customer.documentType.toUpperCase()} ${customer.documentNumber}`
            : undefined,
        barbershopName: barbershop?.name ?? "PanaBarbero",
        receiptNumber: saleId.slice(-8).toUpperCase(),
        soldAt: Date.now(),
        paymentMethod: args.paymentMethod,
        paymentReference: args.paymentReference || undefined,
        totalAmount,
        lines: preparedLines.map((line) => ({
          name: line.item.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
      });
    }

    return saleId;
  },
});

export const listRecent = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    limit: z.number().int().min(1).max(50).optional(),
  }),
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const sales = await ctx.db
      .query("inventorySales")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershop.id),
      )
      .order("desc")
      .take(args.limit ?? 20);

    const actorIds = [...new Set(sales.map((sale) => sale.actorUserId))];
    const actorNames = new Map(
      await Promise.all(
        actorIds.map(async (actorId) => {
          const profile = await getProfileByUserId(ctx, actorId);
          return [actorId, profile?.name] as const;
        }),
      ),
    );

    return await Promise.all(
      sales.map(async (sale) => {
        const lines = await ctx.db
          .query("inventorySaleLines")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .collect();

        return {
          _id: sale._id,
          _creationTime: sale._creationTime,
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName,
          customerDocumentType: sale.customerDocumentType,
          customerDocumentNumber: sale.customerDocumentNumber,
          customerPhone: sale.customerPhone,
          notes: sale.notes,
          actorName: actorNames.get(sale.actorUserId),
          hasProof: sale.proofKey !== undefined,
          lines: lines.map((line) => ({
            itemName: line.itemName,
            quantity: line.quantity,
          })),
        };
      }),
    );
  },
});

export const getProofUrl = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    sale: inventorySales.tools.id,
  }),
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const sale = await ctx.db.get(args.sale.id);

    if (!sale) {
      throw new ConvexError(errorMessages.notFound("venta"));
    }
    if (sale.barbershopId !== args.barbershop.id) {
      throw new ConvexError(errorMessages.unauthorized);
    }
    if (!sale.proofKey) {
      return null;
    }

    return await r2.getUrl(sale.proofKey, { expiresIn: 15 * 60 });
  },
});

/** Bogotá days covered by the sales dashboard revenue trend. */
const SALES_TREND_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;
/** Colombia has no DST (UTC-5 year-round), so fixed day steps are safe. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * KPIs, daily revenue trend and top products for the sales dashboard.
 *
 * Reads the per-day rollups `registerSale` maintains rather than the sales and
 * lines themselves, so the cost is bounded by the window (≤62 day rows, and
 * ≤ catalog × 30 item rows) instead of growing with the shop's transaction
 * volume — a retail-heavy shop would otherwise cross the per-query scan limit
 * and lose the page entirely.
 */
export const getSalesMetrics = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    await assertCanSell(ctx, args.barbershop.id, ctx.userId);

    const now = Date.now();
    const todayKey = toColombiaDateKey(now);
    const currentMonth = todayKey.slice(0, 7);
    const [year, monthNumber] = currentMonth.split("-").map(Number);
    const previousMonth =
      monthNumber === 1
        ? `${year - 1}-12`
        : `${year}-${String(monthNumber - 1).padStart(2, "0")}`;

    const trendStartMs =
      colombiaDateKeyToMs(todayKey) - (SALES_TREND_DAYS - 1) * DAY_MS;
    const trendStartKey = toColombiaDateKey(trendStartMs);
    const previousMonthStartKey = `${previousMonth}-01`;
    // Both keys are ISO dates, so lexicographic order is chronological order.
    const windowStartKey =
      previousMonthStartKey < trendStartKey
        ? previousMonthStartKey
        : trendStartKey;

    // Bounding both ranges at today keeps the row count structural rather than
    // relying on no row ever carrying a future date.
    const [days, dayItems] = await Promise.all([
      ctx.db
        .query("inventorySalesDaily")
        .withIndex("by_barbershopId_and_date", (q) =>
          q
            .eq("barbershopId", args.barbershop.id)
            .gte("date", windowStartKey)
            .lte("date", todayKey),
        )
        .collect(),
      ctx.db
        .query("inventorySalesDailyItems")
        .withIndex("by_barbershopId_and_date_and_itemId", (q) =>
          q
            .eq("barbershopId", args.barbershop.id)
            .gte("date", trendStartKey)
            .lte("date", todayKey),
        )
        .collect(),
    ]);

    const daily = new Map<string, { revenue: number; saleCount: number }>();

    for (let offset = 0; offset < SALES_TREND_DAYS; offset++) {
      const date = toColombiaDateKey(trendStartMs + offset * DAY_MS);
      daily.set(date, { revenue: 0, saleCount: 0 });
    }

    let monthRevenue = 0;
    let monthSaleCount = 0;
    let monthUnitsSold = 0;
    let previousRevenue = 0;
    let previousSaleCount = 0;

    for (const day of days) {
      const month = day.date.slice(0, 7);

      if (month === currentMonth) {
        monthRevenue += day.revenue;
        monthSaleCount += day.saleCount;
        monthUnitsSold += day.unitsSold;
      } else if (month === previousMonth) {
        previousRevenue += day.revenue;
        previousSaleCount += day.saleCount;
      }

      const point = daily.get(day.date);

      if (point) {
        point.revenue = day.revenue;
        point.saleCount = day.saleCount;
      }
    }

    const byItem = new Map<
      string,
      { itemName: string; units: number; revenue: number }
    >();

    for (const row of dayItems) {
      const entry = byItem.get(row.itemId) ?? {
        itemName: row.itemName,
        units: 0,
        revenue: 0,
      };
      entry.units += row.units;
      entry.revenue += row.revenue;
      byItem.set(row.itemId, entry);
    }

    return {
      month: {
        month: currentMonth,
        revenue: monthRevenue,
        saleCount: monthSaleCount,
        unitsSold: monthUnitsSold,
        averageTicket:
          monthSaleCount > 0 ? Math.round(monthRevenue / monthSaleCount) : 0,
      },
      previousMonth: {
        month: previousMonth,
        revenue: previousRevenue,
        saleCount: previousSaleCount,
      },
      daily: [...daily.entries()].map(([date, point]) => ({
        date,
        ...point,
      })),
      topProducts: [...byItem.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, TOP_PRODUCTS_LIMIT),
    };
  },
});
