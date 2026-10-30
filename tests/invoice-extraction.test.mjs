// Runs the "Check the numbers" Code node from the invoice workflow against sample AI answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCodeNode } from "./run-code-node.mjs";

const check = (aiAnswer) =>
  runCodeNode("invoice-extraction", "Check the numbers", aiAnswer, {
    Settings: { json: { accountsEmail: "accounts@acme.test", botEmail: "bot@acme.test" } },
    "Upload invoice": { binary: { invoice: { fileName: "bill.pdf" } } },
  });

const good = {
  vendor: "CloudNest Hosting Ltd", invoice_number: "CN-1", invoice_date: "2026-10-01",
  due_date: "2099-10-31", currency: "GBP", subtotal: 150, tax: 30, total: 180,
};

test("a correct invoice is ready to pay", () => {
  const r = check(good);
  assert.equal(r.needsReview, false);
  assert.equal(r.emailSubject, "Invoice from CloudNest Hosting Ltd: GBP 180.00, due Oct 31, 2099");
});

test("totals that don't add up are flagged with the math", () => {
  const r = check({ ...good, subtotal: "2,000.00", tax: "165.00", total: "$2,265.00" });
  assert.equal(r.needsReview, true);
  assert.match(r.emailSubject, /^\[CHECK\]/);
  assert.match(r.issues[0], /2,000\.00 \+ 165\.00 tax = 2,165\.00, but the invoice says 2,265\.00/);
});

test("an unreadable invoice asks for manual entry once", () => {
  const r = check({ text: "not json" });
  assert.equal(r.needsReview, true);
  assert.deepEqual(r.issues, ["The AI could not read this invoice. Please enter it by hand."]);
  assert.equal(r.emailSubject, "[CHECK] Invoice could not be read: bill.pdf");
});

test("missing fields are listed", () => {
  const r = check({ ...good, invoice_number: "", currency: "pounds" });
  assert.deepEqual(r.issues, ["Invoice number is missing.", "Currency is missing."]);
});

test("a past due date is marked overdue", () => {
  const r = check({ ...good, due_date: "2020-01-31" });
  assert.equal(r.overdue, true);
  assert.match(r.emailSubject, /due Jan 31, 2020 \(OVERDUE\)$/);
});

test("invalid dates are treated as missing", () => {
  const r = check({ ...good, invoice_date: "31/10/2026", due_date: "2026-02-30" });
  assert.equal(r.invoiceDate, null);
  assert.equal(r.dueDate, null);
  assert.deepEqual(r.issues, ["Invoice date is missing."]);
});
