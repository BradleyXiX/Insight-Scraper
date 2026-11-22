import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithTimeout } from "./http.ts";

test("a slow response is aborted instead of hanging", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((_input: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })) as typeof fetch;

  try {
    await assert.rejects(fetchWithTimeout("http://example.test", {}, 10));
  } finally {
    globalThis.fetch = original;
  }
});

test("a normal response passes through", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("ok")) as typeof fetch;
  try {
    const response = await fetchWithTimeout("http://example.test", {}, 1000);
    assert.equal(await response.text(), "ok");
  } finally {
    globalThis.fetch = original;
  }
});
