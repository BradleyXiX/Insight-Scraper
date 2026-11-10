import test from "node:test";
import assert from "node:assert/strict";
import {
  SPEED_PITCH, RAG_PITCH, QUALIFIED_PITCH,
  getMobileLoadMs, getHasChatbot, getPitchHook, pitchTone, computeKpis, toCsv, toJson,
  evidence,
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
  assert.ok(lines[0].startsWith('"business_name","phone"'));
  assert.ok(lines[1].includes('"Cedar ""North"" Spa"'));
  assert.ok(lines[1].includes('"Hidden"'));
  assert.ok(lines[1].includes('"medspas in Austin, TX"'));
});

test("json export keeps the same fields as csv", () => {
  const payload = JSON.parse(
    toJson(
      [
        {
          business_name: "Acme Coffee",
          mobile_load_ms: 2100,
          has_chatbot_widget: false,
          region: "GB",
        },
      ],
      { region: "US", query: "coffee shops" },
    ),
  ) as Array<Record<string, unknown>>;

  assert.equal(payload.length, 1);
  assert.equal(payload[0].business_name, "Acme Coffee");
  assert.equal(payload[0].region, "GB");
  assert.equal(payload[0].mobile_load_ms, 2100);
  assert.equal(payload[0].has_chatbot_widget, false);
  assert.equal(payload[0].search_query, "coffee shops");
});

test("csv includes the email columns in order", () => {
  const csv = toCsv(
    [
      {
        business_name: "Acme Dental",
        phone: "+1 555-1234",
        email: "info@acmedental.com",
        website: "https://acmedental.com",
        pitch_hook: "Fast site",
        email_subject: "Quick question",
        email_body: "Hi Acme,",
        region: "US",
        query: "dentists",
        created_at: "2026-11-08T00:00:00Z",
      },
    ],
    { region: "US", query: "dentists" },
  );
  const header = csv.split("\r\n")[0];
  const expectedHeader = [
    "business_name",
    "phone",
    "email",
    "website",
    "pitch",
    "evidence",
    "email_subject",
    "email_body",
    "region",
    "query",
    "found_at",
  ]
    .map((h) => `"${h}"`)
    .join(",");
  assert.equal(header, expectedHeader);
});

test("csv quotes a body containing commas, quotes and newlines", () => {
  const bodyWithSpecialChars = 'Hi "Team",\nI noticed your site, but did not see HTTPS.\n\nThanks,\nAlex';
  const csv = toCsv(
    [
      {
        business_name: "Special Clinic",
        email_body: bodyWithSpecialChars,
      },
    ],
    { region: "US", query: "clinics" },
  );
  assert.ok(csv.includes('"Hi ""Team"",\nI noticed your site, but did not see HTTPS.\n\nThanks,\nAlex"'));
});

test("csv sorts rows by pitch rank then slowest first", () => {
  const leads = [
    { business_name: "Lead Rank 2", pitch_rank: 2, mobile_load_ms: 1200 },
    { business_name: "Lead Rank 1 Faster", pitch_rank: 1, mobile_load_ms: 3200 },
    { business_name: "Lead Rank 1 Slower", pitch_rank: 1, mobile_load_ms: 5500 },
    { business_name: "Lead Rank Null", pitch_rank: null, mobile_load_ms: 800 },
  ];
  const csv = toCsv(leads, { region: "US", query: "leads" });
  const lines = csv.split("\r\n");
  assert.ok(lines[1].includes('"Lead Rank 1 Slower"'));
  assert.ok(lines[2].includes('"Lead Rank 1 Faster"'));
  assert.ok(lines[3].includes('"Lead Rank 2"'));
  assert.ok(lines[4].includes('"Lead Rank Null"'));
});

test("evidence lists the measured facts only", () => {
  const fullLead = {
    website: "http://example.com",
    mobile_load_ms: 4200,
    has_chatbot_widget: false,
  };
  assert.equal(evidence(fullLead), "4.2s mobile load · no chat widget · no HTTPS");

  const noSiteLead = {
    website: "",
    mobile_load_ms: 0,
    has_chatbot_widget: false,
  };
  assert.equal(evidence(noSiteLead), "no website");

  const fastSecureNoChat = {
    website: "https://example.com",
    mobile_load_ms: 1800,
    has_chatbot_widget: false,
  };
  assert.equal(evidence(fastSecureNoChat), "1.8s mobile load · no chat widget");
});
