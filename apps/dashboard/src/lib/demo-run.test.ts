import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_RUN, DEMO_PROVENANCE } from "./demo-run.ts";
import { toCsv, getEmailBody, getEmailSubject } from "./leads.ts";

test("the demo carries ten real leads from the captured run", () => {
  assert.equal(DEMO_RUN.leads.length, 10);
  assert.equal(DEMO_RUN.query, "dental clinic");
  assert.equal(DEMO_RUN.region, "KE");
  for (const lead of DEMO_RUN.leads) {
    assert.ok(lead.business_name);
    assert.ok(lead.pitch_hook && lead.pitch_hook.length > 0);
    assert.ok(typeof lead.pitch_rank === "number");
  }
});

test("contact details are masked but the email is still sendable", () => {
  for (const lead of DEMO_RUN.leads) {
    assert.equal(lead.phone, "—");
    assert.equal(lead.email, "");
    assert.ok(getEmailSubject(lead).length > 0);
    assert.ok(getEmailBody(lead).length > 0);
  }
});

test("no address survives anywhere in the published snapshot", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(new URL("./demo-run.ts", import.meta.url), "utf8");
  assert.equal(raw.includes("@"), false);
  assert.equal(/\b0[17]\d{8}\b/.test(raw), false);
});

test("provenance names the run without implying it is live", () => {
  assert.match(DEMO_PROVENANCE, /2026-11-18/);
  assert.match(DEMO_PROVENANCE, /masked/i);
});

test("the export a visitor downloads is masked too", () => {
  const csv = toCsv(DEMO_RUN.leads, { region: DEMO_RUN.region, query: DEMO_RUN.query });
  assert.equal(csv.includes("@"), false);
  assert.equal(csv.includes("0707459099"), false);
});
