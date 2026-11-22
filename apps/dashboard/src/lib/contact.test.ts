import test from "node:test";
import assert from "node:assert/strict";
import { CONTACT_CHANNELS, OPERATOR_CONTACT } from "./contact.ts";

test("contact channels expose all four operator links in order", () => {
  assert.deepEqual(
    CONTACT_CHANNELS.map((channel) => channel.id),
    ["email", "portfolio", "github", "linkedin"],
  );
  assert.equal(OPERATOR_CONTACT.name, "Bradley John Chiwo");
  assert.equal(OPERATOR_CONTACT.githubHandle, "BradleyXiX");
});

test("email channel uses mailto and stays in-tab", () => {
  const email = CONTACT_CHANNELS.find((channel) => channel.id === "email");
  assert.ok(email);
  assert.equal(email.href, "mailto:bradjohn70@gmail.com");
  assert.equal(email.value, "bradjohn70@gmail.com");
  assert.equal(email.external, false);
});

test("external channels use https URLs and open externally", () => {
  const externalIds = new Set(["portfolio", "github", "linkedin"]);
  for (const channel of CONTACT_CHANNELS) {
    if (externalIds.has(channel.id)) {
      assert.equal(channel.external, true);
      assert.ok(channel.href.startsWith("https://"), `${channel.id} must use https://`);
    }
  }
  assert.equal(OPERATOR_CONTACT.githubUrl, "https://github.com/BradleyXiX");
  assert.equal(OPERATOR_CONTACT.portfolioUrl, "https://bradleychiwo.netlify.app/");
  assert.equal(
    OPERATOR_CONTACT.linkedinUrl,
    "https://www.linkedin.com/in/bradley-john-chiwo",
  );
});

test("no placeholder sales email exists in contact config", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(new URL("./contact.ts", import.meta.url), "utf8");
  assert.equal(raw.includes("sales@insightscraper.com"), false);
});
