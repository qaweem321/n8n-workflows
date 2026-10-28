// Records the demo video for workflows/lead-capture-ai-reply.
// Needs the stack running (docker compose up -d) and the workflow turned on.
import { startRecording, N8N, MAILPIT } from "./recorder.mjs";

const WORKFLOW_ID = "leadCaptureAiRpl";
const OUT = new URL("../../workflows/lead-capture-ai-reply/demo", import.meta.url).pathname;
const SALES_EMAIL = "sales@acme.test";
const lead = {
  name: "Sara Khan",
  email: "sara@brightbakery.test",
  company: "Bright Bakery",
  message:
    "Hi! We're opening a second bakery next month and need a website with online ordering. " +
    "Our budget is around $3,000. Could you start this week?",
};

const pause = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** Waits until both emails arrive and returns their Mailpit ids by recipient. */
async function waitForEmails(timeoutS = 300) {
  for (let i = 0; i < timeoutS; i++) {
    const { messages } = await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json());
    const idFor = (to) => messages.find((m) => m.To.some((t) => t.Address === to))?.ID;
    if (idFor(lead.email) && idFor(SALES_EMAIL)) return { reply: idFor(lead.email), alert: idFor(SALES_EMAIL) };
    await pause(1);
  }
  throw new Error("Both emails did not arrive in Mailpit in time");
}

// Start from an empty test inbox so the video only shows this run.
await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });

const rec = await startRecording();
const { page } = rec;
await rec.loginToN8n();

// 1. The workflow
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}`, ".vue-flow__node", { fit: true });
await rec.caption("Lead capture with an instant AI reply, built in n8n");
await pause(5);

// 2. A customer fills in the form
await rec.open(`${N8N}/form/contact`, "form");
await rec.caption("1. A customer fills in the contact form on your website");
await pause(1.5);
await page.getByLabel("Your name").pressSequentially(lead.name, { delay: 45 });
await page.getByLabel("Email").pressSequentially(lead.email, { delay: 35 });
await page.getByLabel("Company").pressSequentially(lead.company, { delay: 45 });
await page.getByLabel("How can we help?").pressSequentially(lead.message, { delay: 18 });
await pause(1);
await page.getByRole("button", { name: "Send" }).click();
await page.getByText("Thanks! We've sent a reply").waitFor();
await rec.caption("2. The AI reads the message, sorts the lead and writes a reply");
await pause(3);

// Cut the time the local AI needs to write the reply.
rec.cutStart();
const ids = await waitForEmails();
rec.cutEnd();

// 3. The emails
await rec.open(MAILPIT, `text=${SALES_EMAIL}`);
await rec.caption("3. Seconds later, two emails go out");
await pause(4);

await rec.open(`${MAILPIT}/view/${ids.reply}`, "text=Return to inbox");
await rec.caption("The customer gets a personal reply, not a template");
await pause(8);

await rec.open(`${MAILPIT}/view/${ids.alert}`, "text=Return to inbox");
await rec.caption("Sales gets an alert, with hot leads flagged");
await pause(8);

// 4. Execution log
await rec.openN8n(`${N8N}/workflow/${WORKFLOW_ID}/executions`, "text=Succeeded");
await rec.caption("Every run is logged in n8n. Swap in Claude, OpenAI or Gemini anytime.");
await pause(6);

await rec.finish(OUT);
console.log(`Saved ${OUT}.mp4 and ${OUT}.gif`);
