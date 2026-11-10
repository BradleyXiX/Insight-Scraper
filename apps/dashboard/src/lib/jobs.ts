import { getApiUrl } from "./api";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "empty"
  | "failed"
  | "cancelled";

export const ACTIVE_JOB_STATUSES: JobStatus[] = ["queued", "running"];

export interface ScrapeJob {
  id: string;
  batch_id?: string | null;
  query: string;
  region: string;
  source: string;
  limit: number;
  status: JobStatus;
  cancel_requested: boolean;
  result_count: number;
  duplicate_count: number;
  error: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobPage {
  jobs: ScrapeJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkspaceSettings {
  default_region: string;
  default_source: string;
  default_limit: number;
}

export interface StartScrapeInput {
  query: string;
  region: string;
  source: string;
  limit: number;
}

export const REGION_OPTIONS = [
  { value: "US", label: "USA" },
  { value: "GB", label: "UK" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "AE", label: "UAE" },
  { value: "KE", label: "Kenya" },
] as const;

export interface SourceInfo {
  label: string;
  degraded: boolean;
  note: string;
}

export type SourceMap = Record<string, SourceInfo>;

export const DEFAULT_SOURCE_INFO: SourceMap = {
  gmaps: {
    label: "Google Maps",
    degraded: false,
    note: "",
  },
  "duckduckgo-places": {
    label: "DuckDuckGo Places",
    degraded: true,
    note: "DuckDuckGo places endpoint currently triggers anti-bot error responses; zero results returned.",
  },
  "yellowpages-intl": {
    label: "YellowPages Intl",
    degraded: false,
    note: "",
  },
};

export interface SourceOption {
  value: string;
  label: string;
  degraded: boolean;
  note: string;
}

export const SOURCE_OPTIONS: SourceOption[] = Object.entries(DEFAULT_SOURCE_INFO).map(
  ([value, info]) => ({
    value,
    label: info.label,
    degraded: info.degraded,
    note: info.note,
  }),
);

export const REGION_VALUES = REGION_OPTIONS.map((option) => option.value);
export const SOURCE_VALUES = SOURCE_OPTIONS.map((option) => option.value);

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  default_region: "US",
  default_source: "gmaps",
  default_limit: 25,
};

export type GetToken = () => Promise<string | null>;

function withQuery(path: string, params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return `${path}?${search.toString()}`;
}

/**
 * Authorised request against the FastAPI service.
 *
 * The token callback is supplied by `useAppAuth`, so this module works in both local
 * and hosted modes. Responses are returned unparsed: callers need the status code to
 * distinguish an invalid query from an inactive subscription.
 */
export async function apiRequest(
  path: string,
  getToken: GetToken,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${getApiUrl()}${path}`, { ...init, headers });
}

export function startScrape(
  getToken: GetToken,
  input: StartScrapeInput,
): Promise<Response> {
  return apiRequest(withQuery("/api/scrape", { ...input }), getToken, {
    method: "POST",
  });
}

export interface BatchItemInput {
  query: string;
  region: string;
  source: string;
  limit: number;
}

export interface BatchResponse {
  batch_id: string;
  jobs: ScrapeJob[];
}

export function createBatch(
  getToken: GetToken,
  items: BatchItemInput[],
): Promise<Response> {
  return apiRequest("/api/batches", getToken, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function listJobs(
  getToken: GetToken,
  page: { limit: number; offset: number; batch_id?: string },
): Promise<Response> {
  const params: Record<string, string | number> = {
    limit: page.limit,
    offset: page.offset,
  };
  if (page.batch_id) {
    params.batch_id = page.batch_id;
  }
  return apiRequest(withQuery("/api/jobs", params), getToken);
}

export function getJob(getToken: GetToken, jobId: string): Promise<Response> {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}`, getToken);
}

export function getJobLeads(getToken: GetToken, jobId: string): Promise<Response> {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}/leads`, getToken);
}

export function cancelJob(getToken: GetToken, jobId: string): Promise<Response> {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, getToken, {
    method: "POST",
  });
}

export function rerunJob(getToken: GetToken, jobId: string): Promise<Response> {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}/rerun`, getToken, {
    method: "POST",
  });
}

export function deleteJob(getToken: GetToken, jobId: string): Promise<Response> {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}`, getToken, {
    method: "DELETE",
  });
}

export function getSettings(getToken: GetToken): Promise<Response> {
  return apiRequest("/api/settings", getToken);
}

export function getSources(getToken: GetToken): Promise<Response> {
  return apiRequest("/api/sources", getToken);
}

export function updateSettings(
  getToken: GetToken,
  settings: WorkspaceSettings,
): Promise<Response> {
  return apiRequest("/api/settings", getToken, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** Parse API timestamps as UTC even when the database returns a naive datetime. */
export function parseApiDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const millis = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isFinite(millis) ? millis : null;
}

export function jobStartedAt(job: ScrapeJob): number {
  return parseApiDate(job.started_at ?? job.created_at) ?? Date.now();
}

export function formatJobTime(value: string | null | undefined): string {
  const millis = parseApiDate(value);
  if (millis === null) return "—";
  return new Date(millis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isActiveJob(job: ScrapeJob | null | undefined): boolean {
  return Boolean(job && ACTIVE_JOB_STATUSES.includes(job.status));
}
