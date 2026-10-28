// Records the demo video for workflows/invoice-extraction.
// Needs the stack running (docker compose up -d) and the workflow turned on.
import { startRecording, N8N, MAILPIT } from "./recorder.mjs";

const WORKFLOW_ID = "invoiceExtractAi";
const DIR = new URL("../../workflows/invoice-extraction/", import.meta.url).pathname;
const OUT = `${DIR}demo`;
const GOOD = "cloudnest-hosting.pdf";
const WRONG = "brightpixel-design.pdf"; // total is wrong on purpose

const pause = (s) => new Promise((r) => setTimeout(r, s * 1000));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function waitForEmails(count, timeoutS = 400) {
  for (let i = 0; i < timeoutS; i++) {
    const { messages } = await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json());
    if (messages.length >= count) return messages;
    await pause(1);
  }
  throw new Error(`Expected ${count} emails in Mailpit, timed out`);
}

/** Reads the CSV attachment of an email and shows it as a spreadsheet-style table. */
async function csvTableHtml(messageId) {
  const msg = await fetch(`${MAILPIT}/api/v1/message/${messageId}`).then((r) => r.json());
  const part = msg.Attachments[0];
  const csv = (await fetch(`${MAILPIT}/api/v1/message/${messageId}/part/${part.PartID}`).then((r) => r.text())).replace(/^﻿/, "");
  const [head, ...rows] = csv.trim().split("\n").map((line) => line.split(","));
  const cells = (row, tag) => row.map((c) => `<${tag}>${esc(c)}</${tag}>`).join("");
  return `<!doctype html><html><body style="margin:0;font:15px system-ui,sans-serif;background:#f3f4f6">
    <header style="background:#107c41;color:#fff;padding:16px 32px;font-weight:600;font-size:19px">${esc(part.FileName)}</header>
    <style>table{border-collapse:collapse;margin:32px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15)}
      th,td{border:1px solid #d1d5db;padding:10px 14px;text-align:left}th{background:#e5e7eb}</style>
    <table><tr>${cells(head, "th")}</tr>${rows.map((r) => `<tr>${cells(r, "td")}</tr>`).join("")}</table></body></html>`;
}

async function upload(rec, file) {
  await rec.open(`${N8N}/form/invoice`, 'input[type="file"]');
  await rec.caption("1. Upload a supplier invoice (PDF)");
  await pause(1.5);
  await rec.page.locator('input[type="file"]').setInputFiles(DIR + "samples/" + file);
  await pause(2);
  await rec.page.getByRole("button", { name: "Upload" }).click();
  await rec.page.getByText("Accounts will get the invoice details").waitFor();
  await pause(1.5);
}

await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });

const rec = await startRecording();
const { page } = rec;
await rec.loginToN8n();

// 1. The workflow
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}`, ".vue-flow__node", { fit: true });
await rec.caption("Invoice data extraction with AI, built in n8n");
await pause(5);

// 2. Two uploads: a correct invoice and one whose total is wrong
await upload(rec, GOOD);
await upload(rec, WRONG);
await rec.caption("2. The AI reads each invoice. Plain code double-checks the math");
await pause(3);

rec.cutStart();
const messages = await waitForEmails(2);
rec.cutEnd();
const idFor = (vendor) => messages.find((m) => m.Subject.includes(vendor)).ID;

// 3. Results
await rec.open(MAILPIT, "text=accounts@acme.test");
await rec.caption("3. Accounts gets one email per invoice");
await pause(4);

await rec.open(`${MAILPIT}/view/${idFor("CloudNest")}`, "text=Return to inbox");
await rec.caption("Supplier, number, dates and amounts, all checked. Ready to pay");
await pause(7);

await page.setContent(await csvTableHtml(idFor("CloudNest")));
await rec.caption("The attached CSV row goes straight into Excel, Sheets or your accounts");
await pause(5);

await rec.open(`${MAILPIT}/view/${idFor("BrightPixel")}`, "text=Return to inbox");
await rec.caption("A total that doesn't add up is caught before anyone pays it");
await pause(8);

// 4. Execution log
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Succeeded");
await rec.caption("Every run is logged. Add Google Sheets, QuickBooks or Xero, or swap in Claude.");
await pause(6);

await rec.finish(OUT);
console.log(`Saved ${OUT}.mp4 and ${OUT}.gif`);
