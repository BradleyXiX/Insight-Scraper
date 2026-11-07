/**
 * Turn an HTTP failure into a message that says what to do next.
 *
 * Users see one line under the form. It must never say "something went wrong": each
 * status the API can return has a distinct cause and a distinct next action.
 */
export function describeFailure(status: number, detail?: string): string {
  switch (status) {
    case 401:
      return "Your session is not valid. Sign in again, then retry the extraction.";
    case 402:
      return "Your subscription is not active. Open Billing and choose a plan.";
    case 403:
      return "A workspace organization is required. Select or create one in the account menu.";
    case 404:
      return "That extraction no longer exists. It may have been deleted or belong to another workspace.";
    case 422:
      return "Check the query: use 2–200 characters, a supported region, and a lead limit between 1 and 50.";
    case 429:
      return "Too many requests. Wait a minute, then retry.";
    case 502:
      return detail?.trim() ||
        "The extraction worker failed. Retry, then try a different source or a smaller limit.";
    case 503:
      return detail?.trim() ||
        "The service is not ready. Check that the API and database are running.";
    case 504:
      return "The extraction timed out. Try a narrower query or a smaller lead limit.";
    default:
      if (status >= 500) {
        return "The extraction service hit an error. Check the API logs, then retry.";
      }
      return detail?.trim() || "The request was rejected. Adjust the query and try again.";
  }
}

/** Read the API's `detail` when it is a sentence, not a validation array. */
export async function readFailure(response: Response): Promise<string> {
  let detail: string | undefined;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body) {
      const value = (body as { detail?: unknown }).detail;
      if (typeof value === "string") {
        detail = value;
      }
    }
  } catch {
    // A non-JSON error body is fine; the status code carries the meaning.
  }
  return describeFailure(response.status, detail);
}

export const NETWORK_FAILURE =
  "Could not reach the extraction service. Check that the API is running, then retry.";
