import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  appointments: ["read", "create", "update", "delete"],
  barbershops: ["read", "create", "update", "delete"],
  combos: ["read", "create", "update", "delete"],
} as const;

export type ForStatement = keyof typeof statements;
export type StatementActions = (typeof statements)[ForStatement];

const ac = createAccessControl(statements);

export const roles = {
  barber: ac.newRole({
    appointments: ["read", "create", "update"],
    barbershops: ["read"],
    combos: ["read"],
  }),
  owner: ac.newRole({
    appointments: ["read", "create", "update", "delete"],
    barbershops: ["read", "update", "delete", "create"],
    combos: ["read", "create", "update", "delete"],
  }),
} as const;

export { ac };

export type Role = keyof typeof roles;
export type Action = (typeof statements)[ForStatement][number];
export type Permission = `${ForStatement}:${Action}`;

export function can(role: Role, permissions: Permission[]) {
  const currentRole = roles[role];

  return permissions.every((permission) => {
    const [resource, action] = permission.split(":") as [ForStatement, Action];
    const resourcePermissions = currentRole.statements[resource];

    return resourcePermissions.includes(action);
  });
}
