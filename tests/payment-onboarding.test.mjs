// Runs the Code nodes of the payment onboarding workflow against sample Stripe events and AI answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runCodeNode } from "./run-code-node.mjs";

const sample = JSON.parse(
  readFileSync(new URL("../workflows/payment-onboarding/samples/checkout-session-completed.json", import.meta.url), "utf8"),
);
const withSession = (changes, eventChanges = {}) => ({
  ...sample,
  ...eventChanges,
  data: { object: { ...sample.data.object, ...changes } },
});
const readPayment = (event, staticData = {}) =>
  runCodeNode("payment-onboarding", "Read payment", { body: event }, {}, { staticData });

test("a paid checkout is read correctly", () => {
  const r = readPayment(sample);
  assert.equal(r.skip, false);
  assert.equal(r.customerEmail, "maria@sunrisecafe.test");
  assert.equal(r.firstName, "Maria");
  assert.equal(r.plan, "Website Care Pro");
  assert.equal(r.amountText, "USD 99.00");
  assert.equal(r.goal, "Get more table bookings from Google for our cafe");
});

test("the same event sent twice is only handled once", () => {
  const memory = {};
  assert.equal(readPayment(sample, memory).skip, false);
  const again = readPayment(sample, memory);
  assert.equal(again.skip, true);
  assert.match(again.reason, /^Duplicate event/);
});

test("other event types and unpaid sessions are skipped", () => {
  assert.match(readPayment({ ...sample, type: "invoice.paid" }).reason, /Ignored event type: invoice.paid/);
  assert.match(readPayment(withSession({ payment_status: "unpaid" })).reason, /Payment not completed \(unpaid\)/);
});

test("emails are lowercased and zero-decimal currencies are not divided", () => {
  const r = readPayment(withSession({ currency: "jpy", amount_total: 15000, customer_details: { name: "Ken Sato", email: "Ken@Example.TEST" } }));
  assert.equal(r.customerEmail, "ken@example.test");
  assert.equal(r.amountText, "JPY 15,000");
});

const settings = {
  ...readPayment(sample),
  companyName: "Acme Studio",
  fromEmail: "hello@acme.test",
  teamEmail: "team@acme.test",
  kickoffLink: "https://acme.test/book-kickoff",
};
const build = (aiAnswer, overrides = {}) =>
  runCodeNode("payment-onboarding", "Build welcome emails", aiAnswer, { Settings: { json: { ...settings, ...overrides } } });

test("welcome email uses the AI tips and the team gets dated checklist", () => {
  const tips = ["List your top dishes.", "Share photos of your cafe.", "Decide your booking hours."];
  const r = build({ tips }, { paidAt: "2026-10-28T09:00:00.000Z" });
  assert.equal(r.welcomeSubject, "Welcome to Website Care Pro, Maria!");
  assert.match(r.welcomeBody, /1\. List your top dishes\.\n2\. Share photos of your cafe\.\n3\. Decide your booking hours\./);
  assert.match(r.welcomeBody, /https:\/\/acme\.test\/book-kickoff/);
  assert.match(r.teamBody, /Kickoff call booked by Oct 30, 2026/);
  assert.match(r.teamBody, /First check-in on Nov 4, 2026/);
});

test("tips asking for passwords or logins are replaced", () => {
  const r = build({ tips: ["Gather all login credentials.", "Share your password.", "List your top dishes."] });
  assert.equal(r.tips.length, 3);
  assert.ok(r.tips.every((t) => !/password|login|credential/i.test(t)));
  assert.equal(r.tips[0], "List your top dishes.");
});

test("if the AI fails, the customer still gets three safe tips", () => {
  const r = build({ text: "not json" });
  assert.equal(r.aiUsed, false);
  assert.equal(r.tips.length, 3);
  assert.equal(new Set(r.tips).size, 3);
});
