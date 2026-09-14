import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { gateway, rolesOf, sessionToken, type GatewayResult, type Me, type OperatorRole } from "./gateway.server";

/*
 * The operator console's access rule. Operators sign in by email like everyone else; the gateway
 * lists their roles on GET /v1/me and accepts their web session on /admin/v1. There is no shared
 * admin token. Anyone without a role gets a 404, so the console doesn't admit it exists.
 */

export interface Operator {
  me: Me;
  roles: OperatorRole[];
  isAdmin: boolean;
  token: string;
}

/** The signed-in operator, or null. Cached for one request, so the layout and page ask once. */
export const currentOperator = cache(async (): Promise<Operator | null> => {
  const token = await sessionToken();
  if (!token) return null;
  const me = await gateway<Me>("/v1/me", { token });
  if (!me.ok) return null;
  const roles = rolesOf(me.data);
  if (roles.length === 0) return null;
  return { me: me.data, roles, isAdmin: roles.includes("admin"), token };
});

/** Renders the 404 page unless the visitor holds the role (admins hold every moderator power). */
export async function requireOperator(level: OperatorRole = "moderator"): Promise<Operator> {
  const operator = await currentOperator();
  if (!operator || (level === "admin" && !operator.isAdmin)) notFound();
  return operator;
}

/** A call to the gateway's operator API with the operator's own session. */
export function adminApi<T>(
  operator: Operator,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<GatewayResult<T>> {
  return gateway<T>(`/admin/v1${path}`, { ...init, token: operator.token });
}
