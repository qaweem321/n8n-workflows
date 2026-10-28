# Customer onboarding after payment

When a customer pays through Stripe Checkout, they get a welcome email within a minute: their plan,
the payment confirmed, a link to book the kickoff call, and three things to prepare, suggested by AI
from the goal they typed at checkout. Your team gets an onboarding checklist with real dates.

![Demo](demo.gif)

Full video: [demo.mp4](demo.mp4)

## How it works

```text
Payment received → Read payment → New paid order? → Settings → Suggest first steps with AI → Build welcome emails ─┬→ Welcome customer
                                                                         ↑                                         └→ Tell the team
                                                                  Local AI model
```

1. **Payment received**: a webhook that only accepts requests with the secret header
   `X-Webhook-Secret`. It answers Stripe right away, so Stripe never times out.
2. **Read payment**: handles `checkout.session.completed` events that are paid. Other events,
   unpaid sessions and **duplicates** are skipped: Stripe re-sends events, and nobody should get two
   welcome emails. Amounts are converted from cents (zero-decimal currencies like JPY are handled),
   and emails are lowercased.
3. **Settings**: company name, sender, team inbox and your kickoff booking link.
4. **Suggest first steps with AI**: three short things the customer can prepare, based on their goal.
5. **Build welcome emails**: fixed templates. The AI tips are filtered, so a customer is never asked
   for passwords or logins; if the AI is down, three standard tips are used. Dates read
   "Oct 30, 2026" (UTC). Unit tests: `tests/payment-onboarding.test.mjs`.
6. **Welcome customer** and **Tell the team**: the team email has the checklist (kickoff booked within
   2 days, first check-in after 7 days).

## Credentials

| Node | Credential | Local default | In production |
| ---- | ---------- | ------------- | ------------- |
| Payment received | Header Auth | `Payment webhook secret (local)`: header `X-Webhook-Secret` | Your own long random secret (see below), or swap the node for the **Stripe Trigger** node, which checks Stripe's signature |
| Local AI model | OpenAI API | `Local AI (llama.cpp)`, free model on your machine | Your OpenAI key, or the Anthropic (Claude) or Google Gemini chat model node |
| Email nodes | SMTP | `Mailpit (local test inbox)` at http://localhost:8025 | Your SMTP provider |

The local secret is public in this repo, so change it before exposing n8n to the internet. Generate
one (64 hex characters, minimum 32):

```bash
openssl rand -hex 32
```

## Try it

1. Turn the workflow on in n8n.
2. Send the sample Stripe event:

```bash
curl -X POST http://localhost:5678/webhook/payment -H "Content-Type: application/json" -H "X-Webhook-Secret: local-demo-secret-change-me" --data @workflows/payment-onboarding/samples/checkout-session-completed.json
```

3. Open http://localhost:8025 to see both emails (the local AI takes 10 to 30 seconds). Sending the
   same file again does nothing, because the event id was already handled. Change `"id"` to resend.

## Connect real Stripe

1. In Stripe Checkout, add a text custom field with the key `goal` and put the plan name in the
   session `metadata.plan`.
2. Either replace **Payment received** with the **Stripe Trigger** node (event
   `checkout.session.completed`), or add a webhook endpoint in Stripe pointing to
   `https://<your-n8n>/webhook/payment`. Stripe can't send custom headers, so with the plain
   webhook use the Stripe Trigger node or check Stripe's signature in a Code node.

## Limits

The duplicate check uses n8n's workflow memory, which n8n saves when a run finishes. Stripe's
retries (minutes apart, because this webhook answers at once) are caught, but two copies of an event
arriving within the same few seconds can both get through. If that matters, store handled event ids
in a database table with a unique key (Postgres, Redis, Supabase) and check it first.

## Ideas to extend

- Create the customer in your CRM (HubSpot, Pipedrive) and a task list in Trello, Asana or ClickUp.
- Post new customers to Slack.
- Add a Wait node to send a check-in email after 7 days.
