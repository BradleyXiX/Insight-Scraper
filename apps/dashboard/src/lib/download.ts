"use client";

/** Trigger a browser download without leaving a stray object URL behind. */
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportBaseName(job: { query: string; region: string; id?: string }): string {
  const query = job.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "leads";
  const region = job.region.toLowerCase();
  const suffix = job.id ? `_${job.id.slice(0, 8)}` : "";
  return `insight-scraper_${query}_${region}${suffix}_${exportStamp()}`;
}
