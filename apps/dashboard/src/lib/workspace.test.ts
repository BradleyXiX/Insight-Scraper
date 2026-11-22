import test from "node:test";
import assert from "node:assert/strict";
import { requiresWorkspace } from "./workspace.ts";

test("local mode never needs a workspace", () => {
  assert.equal(requiresWorkspace(true, null), false);
});

test("a hosted session without an organization needs a workspace", () => {
  assert.equal(requiresWorkspace(false, null), true);
});

test("a hosted session with an organization does not", () => {
  assert.equal(requiresWorkspace(false, "org_123"), false);
});
