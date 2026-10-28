# Inbox triage with AI

Every email that lands in your shared inbox (info@) is read by AI, sorted into support, sales,
billing or spam, and forwarded to the right team with a one-line summary and a ready-to-send holding
reply. Urgent emails (something broken, money lost, angry client, legal threat) also alert the
manager. Spam never reaches anyone.

![Demo](demo.gif)

Full video: [demo.mp4](demo.mp4)

## How it works

```text
New email in shared inbox → Settings → Sort email with AI → Read AI answer → Needs a person? ─┬→ Forward to team
                                              ↑                                              └→ Urgent? → Alert manager
                                       Local AI model
```

1. **New email in shared inbox**: n8n watches the mailbox over IMAP and marks each email as read.
2. **Settings**: your company name and the address of each team and the manager. Edit these first.
3. **Sort email with AI**: returns a summary, a short topic, the category and whether it is urgent.
4. **Read AI answer**: picks the team and builds the holding reply from a fixed template
   ("Thanks for your email about *topic*. Our *team* will get back to you shortly."). The AI never
   writes the reply itself, so it can't promise refunds, dates or fixes. If the AI is down, the email
   goes to support so a person still sees it.
5. **Forward to team**: subject starts with `[URGENT]` and the team name. Reply-To is the customer,
   so the team just hits Reply.
6. **Alert manager**: a short heads-up for urgent emails.

## Credentials

| Node | Credential | Local default | In production |
| ---- | ---------- | ------------- | ------------- |
| New email in shared inbox | IMAP | `Shared inbox info@ (local GreenMail)` | Your mailbox over IMAP: Gmail (app password), Outlook/Microsoft 365, Zoho... |
| Local AI model | OpenAI API | `Local AI (llama.cpp)`, free model on your machine | Your OpenAI key, or the Anthropic (Claude) or Google Gemini chat model node |
| Email nodes | SMTP | `Mailpit (local test inbox)` at http://localhost:8025 | Your SMTP provider |

## Try it

1. Turn the workflow on in n8n.
2. Send a test email to `info@acme.test` through SMTP on `localhost:3025` (no login), for example
   with `scripts/demo/send-test-email.mjs`, or point any mail app at that server.
3. Open http://localhost:8025 to see the forwarded emails (the local AI takes about 30 to 60 seconds
   per email on a laptop).

## Known limits of the free local model

The small local model sorts most emails correctly, but borderline ones can land with the wrong
team: in testing, a client threatening to cancel over a missed deadline went to billing instead of
support. It was still flagged urgent, so the manager was alerted. A larger model such as Claude
handles these reliably.

## Ideas to extend

- Use the Gmail or Outlook nodes to add labels or move emails into folders instead of forwarding.
- Post urgent emails to Slack, Teams or WhatsApp.
- Log every email to Google Sheets or Airtable for a weekly report.
