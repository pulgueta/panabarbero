import { AuditLog } from "convex-audit-log";
import { z } from "zod";

import { zAuthQuery } from ".";
import { components } from "./_generated/api";
import { assertInventoryAllowed } from "./acl";
import { authz, barbershopScope } from "./authz";
import { errorMessages } from "./errors";
import { inventoryItems } from "./schema";

export const auditLog = new AuditLog(components.auditLog, {
  piiFields: [],
});

export const getInventoryItemHistory = zAuthQuery({
  args: z.object({
    item: inventoryItems.tools.id,
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.item.id);

    if (!item) {
      throw new Error(errorMessages.notFound("producto"));
    }

    await Promise.all([
      assertInventoryAllowed(ctx, item.barbershopId),
      authz.require(
        ctx,
        ctx.userId,
        "inventory:consume",
        barbershopScope(item.barbershopId),
      ),
    ]);

    return await auditLog.queryByResource(ctx, {
      resourceType: "inventory.item",
      resourceId: item._id,
      limit: args.limit ?? 50,
    });
  },
});
