# Lead capture with instant AI reply

A visitor fills in your contact form. Within a minute they get a personal reply written by AI, and
your sales team gets an alert. Hot leads (budget, deadline, ready to buy) are flagged so nobody
misses them.

![Demo](demo.gif)

Full video: [demo.mp4](demo.mp4)

## How it works

```text
Contact form → Settings → Write reply with AI → Read AI answer ─┬→ Real lead? ──→ Email reply to lead
                              ↑                                 └→ Hot lead? ─┬→ Alert sales: hot lead
                       Local AI model                                         └→ Notify sales: new lead
```

1. **Contact form**: n8n's built-in form (name, email, company, message). The page is at
   `http://localhost:5678/form/contact`, or embed the form in your website.
2. **Settings**: your company name, your services, the "from" address and the sales inbox.
   Edit these first. The AI only mentions services from your list.
3. **Write reply with AI**: sorts the message (hot lead, lead, spam or job application), writes
   a one-line summary for sales and a 3 to 5 sentence reply. It is told never to promise prices or dates.
4. **Read AI answer**: checks the AI's answer and falls back to a polite standard reply if the
   AI is down or returns something unusable, so real customers always hear back. The reply goes to
   whatever address the visitor typed, and a message can try to steer the AI, so any reply with a
   link, email address, phone number or amount is replaced by the standard reply too. Unit tests:
   `tests/lead-capture-ai-reply.test.mjs`.
5. **Emails**: real leads get the reply. Spam and job applications get no reply, because
   answering spam only confirms your address. Sales gets an email for every message, with
   `HOT lead` in the subject when there is a budget or deadline.

## Credentials

| Node | Credential | Local default | In production |
| ---- | ---------- | ------------- | ------------- |
| Local AI model | OpenAI API | `Local AI (llama.cpp)`, free model on your machine, no key | Your OpenAI key, or replace the node with the Anthropic (Claude) or Google Gemini chat model node |
| Email nodes | SMTP | `Mailpit (local test inbox)` at http://localhost:8025 | Your SMTP provider (Gmail, Brevo, Postmark, SES...) |

## Try it

1. Turn the workflow on in n8n.
2. Open http://localhost:5678/form/contact and send a message.
3. Open http://localhost:8025 to see both emails (the local AI takes 10 to 60 seconds on a laptop).

## Limits

Like every contact form with an auto-reply, anyone can type someone else's address and send them
one reply from you. Before going live, add a CAPTCHA (n8n's form has none; embed your own form with
Cloudflare Turnstile or hCaptcha and post it to a Webhook node) or limit replies per address.

## Ideas to extend

- Save every lead to Google Sheets, Airtable, HubSpot or Pipedrive.
- Post hot leads to Slack or WhatsApp instead of email.
- Book a call automatically with a Calendly or Cal.com link in the reply.
