import test from "node:test";
import assert from "node:assert/strict";
import {
  SLOW_LOAD_MS, SPEED_PITCH, RAG_PITCH, QUALIFIED_PITCH,
  getMobileLoadMs, getHasChatbot, getPitchHook, pitchTone, computeKpis, toCsv,
} from "./leads.ts";

test("load of exactly 3000ms is not slow", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 3000, has_chatbot_widget: true }), QUALIFIED_PITCH);
  assert.equal(getPitchHook({ mobile_load_ms: 3001, has_chatbot_widget: true }), SPEED_PITCH);
});

test("speed pitch wins over the chatbot pitch", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 5000, has_chatbot_widget: false }), SPEED_PITCH);
});

test("missing chatbot with a fast site is the RAG pitch", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 1800, has_chatbot_widget: false }), RAG_PITCH);
});

test("an explicit pitch hook from the API is never overridden", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 9000, pitch_hook: "Custom" }), "Custom");
});

test("capitalised API keys are read", () => {
  assert.equal(getMobileLoadMs({ "Mobile_Load_Ms": 2100 }), 2100);
  assert.equal(getHasChatbot({ "Has_Chatbot_Widget": true }), true);
});

test("an unmeasured load reads as 0, never NaN", () => {
  assert.equal(getMobileLoadMs({}), 0);
  assert.equal(getMobileLoadMs({ mobile_load_ms: undefined }), 0);
});

test("pitch tone maps to the three signal states", () => {
  assert.equal(pitchTone(SPEED_PITCH), "attention");
  assert.equal(pitchTone(RAG_PITCH), "accent");
  assert.equal(pitchTone(QUALIFIED_PITCH), "neutral");
});

test("mean load ignores unmeasured leads", () => {
  const k = computeKpis([{ mobile_load_ms: 2000 }, { mobile_load_ms: 4000 }, { mobile_load_ms: 0 }]);
  assert.equal(k.meanLoadMs, 3000);
  assert.equal(k.total, 3);
});

test("mean load is null when nothing was measured", () => {
  assert.equal(computeKpis([{ mobile_load_ms: 0 }]).meanLoadMs, null);
});

test("chatbot share is a rounded percentage of the loaded set", () => {
  const k = computeKpis([
    { has_chatbot_widget: true }, { has_chatbot_widget: false }, { has_chatbot_widget: false },
  ]);
  assert.equal(k.withoutChatbot, 2);
  assert.equal(k.withoutChatbotPct, 67);
});

test("markets counts distinct non-empty regions", () => {
  const k = computeKpis([{ region: "US" }, { region: "US" }, { region: "GB" }, {}]);
  assert.equal(k.markets, 2);
});

test("csv quotes, escapes and falls back", () => {
  const csv = toCsv(
    [{ business_name: 'Cedar "North" Spa', phone: undefined }],
    { region: "US", query: "medspas in Austin, TX" },
  );
  const lines = csv.split("\r\n");
  assert.ok(lines[0].startsWith('"Business Name","Phone"'));
  assert.ok(lines[1].includes('"Cedar ""North"" Spa"'));
  assert.ok(lines[1].includes('"Hidden"'));
  assert.ok(lines[1].includes('"medspas in Austin, TX"'));
});
