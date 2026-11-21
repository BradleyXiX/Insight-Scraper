import test from "node:test";
import assert from "node:assert/strict";
import { visibleDestinations } from "./nav.ts";

test("billing is hidden in local mode", () => {
  const hrefs = visibleDestinations(true, "local_operator").map((d) => d.href);
  assert.equal(hrefs.includes("/dashboard/billing"), false);
});

test("billing is shown to a workspace with an organization", () => {
  const hrefs = visibleDestinations(false, "org_123").map((d) => d.href);
  assert.deepEqual(hrefs, [
    "/dashboard",
    "/dashboard/history",
    "/dashboard/billing",
    "/dashboard/settings",
  ]);
});

test("billing is hidden from a signed-in user with no workspace", () => {
  const hrefs = visibleDestinations(false, null).map((d) => d.href);
  assert.equal(hrefs.includes("/dashboard/billing"), false);
  assert.equal(hrefs.length, 3);
});
