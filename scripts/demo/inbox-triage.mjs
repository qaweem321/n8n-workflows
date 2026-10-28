// Records the demo video for workflows/inbox-triage.
// Needs the stack running (docker compose up -d) and the workflow turned on.
import { startRecording, N8N, MAILPIT } from "./recorder.mjs";
import { sendTestEmail } from "./send-test-email.mjs";

const WORKFLOW_ID = "inboxTriageAiRte";
const OUT = new URL("../../workflows/inbox-triage/demo", import.meta.url).pathname;
const INBOX = "info@acme.test";
const emails = [
  {
    fromName: "Lena Fischer", from: "lena@greenleafshop.test", subject: "Checkout broken - losing orders!",
    text: "Hi team,\n\nSince your update this morning our checkout page gives an error and customers can't pay. We're losing sales every hour. Please fix this today!\n\nLena",
  },
  {
    fromName: "Omar Siddiqui", from: "omar@peakfitness.test", subject: "Quote for a new booking website",
    text: "Hello,\n\nWe run two gyms and want a website where members can book classes. Could you send us a quote and an idea of the timeline?\n\nThanks,\nOmar",
  },
  {
    fromName: "Julia Novak", from: "julia@novakdesign.test", subject: "Charged twice this month",
    text: "Hi,\n\nI was charged twice for my October subscription (invoice 1043). Can you refund the extra payment?\n\nBest,\nJulia",
  },
  {
    fromName: "Growth Weekly", from: "news@growthweekly.test", subject: "10 hacks to 10x your traffic",
    text: "This week's newsletter: 10 growth hacks every agency needs. Click here to unlock our premium SEO package at 50% off!",
  },
];
// 3 forwarded emails (spam is dropped) + 1 manager alert for the urgent one.
const EXPECTED = 4;

const pause = (s) => new Promise((r) => setTimeout(r, s * 1000));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function mailpitMessages() {
  return (await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json())).messages;
}

async function waitForEmails(timeoutS = 600) {
  for (let i = 0; i < timeoutS; i++) {
    const messages = await mailpitMessages();
    if (messages.length >= EXPECTED) return messages;
    await pause(1);
  }
  throw new Error(`Expected ${EXPECTED} emails in Mailpit, timed out`);
}

/** A plain inbox view of the emails that were sent (GreenMail has no web UI). */
function inboxHtml() {
  const rows = emails
    .map((e) => `<li><b>${esc(e.fromName)}</b><span>${esc(e.subject)}</span><i>${esc(e.text.split("\n").filter(Boolean)[1] || e.text)}</i></li>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;font:16px system-ui,sans-serif;background:#f3f4f6">
    <header style="background:#1f2937;color:#fff;padding:18px 32px;font-weight:600;font-size:20px">Inbox: ${INBOX}
      <span style="float:right;font-weight:400;font-size:15px;opacity:.8">${emails.length} new emails</span></header>
    <style>li{display:grid;grid-template-columns:200px 1fr;gap:4px 24px;padding:18px 32px;border-bottom:1px solid #e5e7eb;background:#fff}
      li b{grid-row:span 2}li span{font-weight:600}li i{font-style:normal;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style>
    <ul style="list-style:none;margin:24px 32px;padding:0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">${rows}</ul></body></html>`;
}

// Start from empty inboxes so the video only shows this run.
await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });

const rec = await startRecording();
const { page } = rec;
await rec.loginToN8n();

// 1. The workflow
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}`, ".vue-flow__node", { fit: true });
await rec.caption("Inbox triage with AI, built in n8n");
await pause(5);

// 2. Emails arrive in the shared inbox
await page.setContent(inboxHtml());
await rec.caption("1. Four emails land in your shared inbox (info@)");
for (const e of emails) await sendTestEmail({ ...e, to: INBOX });
await pause(6);

await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Auto refresh");
await rec.caption("2. n8n picks up each email. The AI sorts it and spots urgent ones");
await pause(5);

// Cut the time the local AI needs for all four emails.
rec.cutStart();
const messages = await waitForEmails();
rec.cutEnd();
const idTo = (address) => messages.find((m) => m.To.some((t) => t.Address === address))?.ID;

// 3. Routed emails
await rec.open(MAILPIT, "text=manager@acme.test");
await rec.caption("3. Each email goes to the right team. The newsletter is dropped");
await pause(6);

await rec.open(`${MAILPIT}/view/${idTo("support@acme.test")}`, "text=Return to inbox");
await rec.caption("Support gets the urgent one, with a summary and a safe reply ready to send");
await pause(8);

await rec.open(`${MAILPIT}/view/${idTo("billing@acme.test")}`, "text=Return to inbox");
await rec.caption("Billing gets the double charge. Hitting Reply answers the customer");
await pause(7);

await rec.open(`${MAILPIT}/view/${idTo("manager@acme.test")}`, "text=Return to inbox");
await rec.caption("Urgent emails also alert the manager");
await pause(6);

// 4. Execution log
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Succeeded");
await rec.caption("Works with Gmail or Outlook. Swap in Claude, OpenAI or Gemini anytime.");
await pause(6);

await rec.finish(OUT);
console.log(`Saved ${OUT}.mp4 and ${OUT}.gif`);
