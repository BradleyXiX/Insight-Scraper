/**
 * Shared API configuration helper.
 * Resolves NEXT_PUBLIC_API_URL with fallback to local FastAPI backend (http://localhost:8000)
 * and strips any trailing slashes to prevent malformed endpoint paths.
 */
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return url.replace(/\/+$/, "");
}
