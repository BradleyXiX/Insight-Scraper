/**
 * A hosted session with no Clerk organization cannot be scoped to a tenant.
 *
 * Local runs have no sign-in and always operate on the single local operator, so
 * they never need a workspace. In hosted mode the API rejects every request that
 * carries no organization; rendering the shell anyway would loop on 403s and
 * leave the visitor in a dead end.
 */
export function requiresWorkspace(isLocal: boolean, orgId: string | null): boolean {
  return !isLocal && orgId === null;
}
