// Runs the "Read AI answer" Code node of the lead capture workflow against sample AI answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCodeNode } from "./run-code-node.mjs";

const read = (aiAnswer) =>
  runCodeNode("lead-capture-ai-reply", "Read AI answer", aiAnswer, {
    Settings: {
      json: {
        name: "Tom Baker", email: "tom@peak.test", message: "We need a booking site.",
        companyName: "Acme Studio", fromEmail: "hello@acme.test", salesEmail: "sales@acme.test",
      },
    },
  });

const good = {
  summary: "Gym wants a booking website.", category: "hot_lead", reply_subject: "Your booking website",
  reply_body: "Hi Tom,\n\nThanks for reaching out about a booking website. A team member will contact you within one business day.\n\nThe Acme Studio team",
};

test("a normal AI reply is used", () => {
  const r = read(good);
  assert.equal(r.aiUsed, true);
  assert.equal(r.priority, "high");
  assert.equal(r.replySubject, "Your booking website");
  assert.equal(r.replyBody, good.reply_body);
});

test("replies with links, email addresses, phone numbers or amounts fall back to the standard reply", () => {
  for (const bad of [
    "Claim your prize at https://evil.test now.",
    "Visit evil-prizes.com today.",
    "Write to winner@evil.test.",
    "Call us on +1 555 123 4567.",
    "Your site will cost $500.",
    "We can do it for 5k.",
    "The price is 300 euros.",
  ]) {
    const r = read({ ...good, reply_body: bad });
    assert.equal(r.aiUsed, false, bad);
    assert.match(r.replyBody, /^Hi Tom,\n\nThanks for reaching out\. A member of our team/, bad);
    assert.equal(r.replySubject, "Thanks for contacting Acme Studio", bad);
  }
});

test("an unreadable AI answer gets the standard reply as a normal lead", () => {
  const r = read({ text: "not json" });
  assert.equal(r.aiUsed, false);
  assert.equal(r.category, "lead");
  assert.equal(r.summary, "We need a booking site.");
});
