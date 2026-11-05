import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_LEADS, DEMO_QUERY, DEMO_REGION, DEMO_SOURCE, DEMO_STAGES } from "./demo-data.ts";
import { getPitchHook, pitchTone, SPEED_PITCH, RAG_PITCH, QUALIFIED_PITCH } from "./leads.ts";

test("demo constants are defined", () => {
  assert.equal(DEMO_QUERY, "medspas in Austin, TX");
  assert.equal(DEMO_REGION, "US");
  assert.equal(DEMO_SOURCE, "Google Maps");
  assert.equal(DEMO_STAGES.length, 6);
  assert.equal(DEMO_LEADS.length, 5);
});

test("demo leads produce expected pitch hooks and tones", () => {
  const expected = [
    { name: "Cedar North Aesthetics", pitch: SPEED_PITCH, tone: "attention" },
    { name: "Barton Creek Skin Studio", pitch: QUALIFIED_PITCH, tone: "neutral" },
    { name: "Lone Star Laser Collective", pitch: SPEED_PITCH, tone: "attention" },
    { name: "Verde Wellness ATX", pitch: RAG_PITCH, tone: "accent" },
    { name: "Mesa Med Spa Group", pitch: SPEED_PITCH, tone: "attention" },
  ];

  DEMO_LEADS.forEach((lead, i) => {
    const leadItem = {
      mobile_load_ms: lead.loadMs,
      has_chatbot_widget: lead.hasChatbot,
      business_name: lead.name,
    };
    const hook = getPitchHook(leadItem);
    const tone = pitchTone(hook);
    assert.equal(lead.name, expected[i].name);
    assert.equal(hook, expected[i].pitch);
    assert.equal(tone, expected[i].tone);
  });
});

