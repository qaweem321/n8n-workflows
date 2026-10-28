// Records the demo video for workflows/payment-onboarding.
// Needs the stack running (docker compose up -d) and the workflow turned on.
import { readFileSync } from "node:fs";
import { startRecording, N8N, MAILPIT } from "./recorder.mjs";

const WORKFLOW_ID = "paymentOnboardAi";
const DIR = new URL("../../workflows/payment-onboarding/", import.meta.url).pathname;
const OUT = `${DIR}demo`;
const SECRET = "local-demo-secret-change-me";

// A fresh event id each run, so the duplicate check doesn't skip it.
const event = JSON.parse(readFileSync(`${DIR}samples/checkout-session-completed.json`, "utf8"));
event.id = `evt_demo_${Date.now()}`;
event.created = Math.floor(Date.now() / 1000);
const session = event.data.object;
const goal = session.custom_fields[0].text.value;

const pause = (s) => new Promise((r) => setTimeout(r, s * 1000));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function waitForEmails(count, timeoutS = 300) {
  for (let i = 0; i < timeoutS; i++) {
    const { messages } = await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json());
    if (messages.length >= count) return messages;
    await pause(1);
  }
  throw new Error(`Expected ${count} emails in Mailpit, timed out`);
}

/** A plain, unbranded checkout card showing what the customer buys (real payments go through Stripe). */
function checkoutHtml() {
  const field = (label, value) => `<label style="display:block;margin:14px 0 4px;color:#4b5563;font-size:14px">${label}</label>
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:10px 12px">${esc(value)}</div>`;
  return `<!doctype html><html><body style="margin:0;font:16px system-ui,sans-serif;background:#f3f4f6;display:grid;place-items:center;height:100vh">
    <div style="background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.1);padding:32px 40px;width:460px">
      <div style="color:#6b7280">Acme Studio</div>
      <div style="font-size:26px;font-weight:700;margin:6px 0">Website Care Pro</div>
      <div style="font-size:20px">$99.00 <span style="color:#6b7280;font-size:15px">per month</span></div>
      ${field("Name", session.customer_details.name)}${field("Email", session.customer_details.email)}
      ${field("What do you want to achieve first?", goal)}
      <button id="pay" style="margin-top:22px;width:100%;padding:14px;border:0;border-radius:8px;background:#4f46e5;color:#fff;font-size:17px;font-weight:600;cursor:pointer">Pay $99.00</button>
      <div id="done" style="display:none;margin-top:16px;color:#047857;font-weight:600;text-align:center">Payment successful</div>
    </div></body></html>`;
}

await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });

const rec = await startRecording();
const { page } = rec;
await rec.loginToN8n();

// 1. The workflow
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}`, ".vue-flow__node", { fit: true });
await rec.caption("Customer onboarding after payment, built in n8n");
await pause(5);

// 2. The customer pays
await page.setContent(checkoutHtml());
await rec.caption("1. A customer pays for your plan (through Stripe Checkout)");
await pause(4);
await page.locator("#pay").click();
const res = await fetch(`${N8N}/webhook/payment`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Webhook-Secret": SECRET },
  body: JSON.stringify(event),
});
if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
await page.evaluate(() => (document.getElementById("done").style.display = "block"));
await pause(2.5);

await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Auto refresh");
await rec.caption("2. Stripe tells n8n. The AI reads the customer's goal");
await pause(4);

rec.cutStart();
const messages = await waitForEmails(2);
rec.cutEnd();
const idTo = (address) => messages.find((m) => m.To.some((t) => t.Address === address)).ID;

// 3. The emails
await rec.open(MAILPIT, "text=team@acme.test");
await rec.caption("3. Within a minute, two emails go out");
await pause(4);

await rec.open(`${MAILPIT}/view/${idTo(session.customer_details.email)}`, "text=Return to inbox");
await rec.caption("The customer gets a welcome with the kickoff link and tips for their goal");
await pause(9);

await rec.open(`${MAILPIT}/view/${idTo("team@acme.test")}`, "text=Return to inbox");
await rec.caption("Your team gets an onboarding checklist with real dates");
await pause(7);

// 4. Execution log
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Succeeded");
await rec.caption("Stripe retries are ignored. Add your CRM, Slack or task app, or swap in Claude.");
await pause(6);

await rec.finish(OUT);
console.log(`Saved ${OUT}.mp4 and ${OUT}.gif`);
