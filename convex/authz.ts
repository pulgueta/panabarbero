import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { errorMessages } from "./errors";
import type { Appointment, BarbershopMember } from "./schema";

export type Role = "owner" | "barber" | "staff";

/**
 * Get a barbershop member by their user profile data ID and barbershop ID
 */
export async function getBarbershopMember(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userProfileDataId: Id<"userProfileData">,
) {
  return await ctx.db
    .query("barbershopMembers")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
    .filter((q) => q.eq(q.field("userProfileDataId"), userProfileDataId))
    .first();
}

/**
 * Get a barbershop member by their user ID and barbershop ID
 */
export async function getBarbershopMemberByUserId(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  const userProfile = await ctx.db
    .query("userProfileData")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!userProfile) {
    return null;
  }

  return await getBarbershopMember(ctx, barbershopId, userProfile._id);
}

/**
 * Check if a member has a specific role
 */
export function memberHasRole(member: BarbershopMember, role: Role): boolean {
  return member.roles.includes(role);
}

/**
 * Check if a member has any of the specified roles
 */
export function memberHasAnyRole(
  member: BarbershopMember,
  roles: Role[],
): boolean {
  return roles.some((role) => member.roles.includes(role));
}

/**
 * Check if a member has all of the specified roles
 */
export function memberHasAllRoles(
  member: BarbershopMember,
  roles: Role[],
): boolean {
  return roles.every((role) => member.roles.includes(role));
}

/**
 * Assert that a user is a member of a barbershop with at least one of the required roles.
 * Throws a ConvexError if the user is not a member or doesn't have the required role.
 */
export async function assertShopRole(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
  requiredRoles: Role | Role[],
) {
  const member = await getBarbershopMemberByUserId(ctx, barbershopId, userId);

  if (!member) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  if (!member.isActive) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  const rolesArray = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles];

  if (!memberHasAnyRole(member, rolesArray)) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  return member;
}

/**
 * Check if a user is a member of a barbershop with at least one of the required roles.
 * Returns false if the user is not a member or doesn't have the required role.
 * Does not throw an error.
 */
export async function hasShopRole(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
  requiredRoles: Role | Role[],
): Promise<boolean> {
  const member = await getBarbershopMemberByUserId(ctx, barbershopId, userId);

  if (!member || !member.isActive) {
    return false;
  }

  const rolesArray = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles];

  return memberHasAnyRole(member, rolesArray);
}

/**
 * Assert that a user is a barbershop owner
 */
export async function assertOwner(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, "owner");
}

/**
 * Assert that a user is a barber in a barbershop
 */
export async function assertBarber(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, "barber");
}

/**
 * Assert that a user is a staff member in a barbershop
 */
export async function assertStaff(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, "staff");
}

/**
 * Check if a user is a staff member in a specific barbershop.
 */
export async function isStaffInShop(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
): Promise<boolean> {
  return hasShopRole(ctx, barbershopId, userId, "staff");
}

/**
 * Assert that a user can manage team members (owner or staff).
 * Used for inviting barbers and assigning services to barbers.
 */
export async function assertCanManageTeam(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, ["owner", "staff"]);
}

/**
 * Assert that a user is a barbershop owner or admin (for management actions)
 */
export async function assertCanManageShop(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, "owner");
}

/**
 * Assert that a user can manage services (owner or barber)
 * In this implementation, barbers can create/edit their own services
 */
export async function assertCanManageServices(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, [
    "owner",
    "barber",
    "staff",
  ]);
}

/**
 * Assert that a user can manage appointments (must be a barber)
 */
export async function assertCanManageAppointments(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, "barber");
}

/**
 * Assert that a user is a member of a barbershop (any role).
 * Throws a ConvexError if the user is not a member.
 */
export async function assertShopMember(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
): Promise<BarbershopMember> {
  const member = await getBarbershopMemberByUserId(ctx, barbershopId, userId);

  if (!member) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  if (!member.isActive) {
    throw new ConvexError("Tu membresía está inactiva");
  }

  return member;
}

/**
 * Assert that a user can view appointments for a barbershop.
 * Requires owner, barber, or staff role.
 */
export async function assertCanViewAppointments(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
) {
  return assertShopRole(ctx, barbershopId, userId, [
    "owner",
    "barber",
    "staff",
  ]);
}

/**
 * Assert that a user can mutate an appointment.
 * Allowed if: user is the appointment owner (customer) OR user is a shop member (owner/barber).
 */
export async function assertCanMutateAppointment(
  ctx: QueryCtx | MutationCtx,
  appointment: Appointment,
  userId: string,
): Promise<void> {
  // Appointment owner (customer) can always mutate their own appointment
  if (appointment.userId === userId) {
    return;
  }

  // Otherwise, must be a shop member with owner or barber role
  const member = await getBarbershopMemberByUserId(
    ctx,
    appointment.barbershopId,
    userId,
  );

  if (!member || !member.isActive) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  if (!memberHasAnyRole(member, ["owner", "barber", "staff"])) {
    throw new ConvexError(errorMessages.unauthorized);
  }
}

/**
 * Check if a user can view an appointment (appointment owner OR shop member).
 * Returns false instead of throwing.
 */
export async function canViewAppointment(
  ctx: QueryCtx | MutationCtx,
  appointment: Appointment,
  userId: string,
): Promise<boolean> {
  // Appointment owner can view
  if (appointment.userId === userId) {
    return true;
  }

  // Shop member can view
  const member = await getBarbershopMemberByUserId(
    ctx,
    appointment.barbershopId,
    userId,
  );

  if (!member || !member.isActive) {
    return false;
  }

  return memberHasAnyRole(member, ["owner", "barber", "staff"]);
}

/**
 * Check if a user is a barber in a specific barbershop.
 * Scoped version that doesn't check global membership.
 */
export async function isBarberInShop(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
): Promise<boolean> {
  return hasShopRole(ctx, barbershopId, userId, "barber");
}

/**
 * Check if a user is an owner of a specific barbershop.
 * Scoped version that doesn't check global membership.
 */
export async function isOwnerOfShop(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  userId: string,
): Promise<boolean> {
  return hasShopRole(ctx, barbershopId, userId, "owner");
}
