/**
 * One switch for the two supported run modes.
 *
 * `local` is the operator mode: no Clerk session, no Stripe subscription, and the
 * dashboard talks to an API started with `DEV_BYPASS_AUTH=true`. It is explicit
 * (`NEXT_PUBLIC_AUTH_MODE=local`) so a production build can never fall into it by
 * accident while Clerk keys are present.
 *
 * `clerk` is the hosted mode and is the default whenever a publishable key exists.
 * A build with no Clerk key and no explicit mode is local, matching the backend's
 * development defaults.
 */
export type AuthMode = "clerk" | "local";

const requested = (process.env.NEXT_PUBLIC_AUTH_MODE ?? "").trim().toLowerCase();
const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const authMode: AuthMode =
  requested === "local" ? "local" : hasClerkKey ? "clerk" : "local";

export const isLocalMode = authMode === "local";

/** Sent to the API in local mode. The API accepts it only with the dev bypass on. */
export const localApiToken =
  process.env.NEXT_PUBLIC_LOCAL_API_TOKEN?.trim() || "dev_bypass_token";

export const operatorLabel =
  process.env.NEXT_PUBLIC_OPERATOR_LABEL?.trim() || "Local operator";
