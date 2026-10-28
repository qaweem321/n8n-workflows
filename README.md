# n8n Workflows

Ready-to-import [n8n](https://n8n.io) automations for small businesses: lead follow-up, inbox triage,
document extraction and customer onboarding.

Everything runs free on your own machine: n8n, a local AI model and a test inbox, with no API
keys and no accounts. To go live, swap the AI node for Claude, OpenAI or Gemini and the email
credential for your real SMTP provider.

## Workflows

| Workflow | What it does | Demo |
| -------- | ------------ | ---- |
| [Lead capture with instant AI reply](workflows/lead-capture-ai-reply) | Contact form → AI rates the lead and emails a personal reply → sales gets an alert, hot leads flagged | [Video](workflows/lead-capture-ai-reply/demo.mp4) |
| [Inbox triage with AI](workflows/inbox-triage) | New email in info@ → AI sorts it (support, sales, billing, spam) → forwarded to the right team with a summary and a safe reply; urgent ones alert the manager | [Video](workflows/inbox-triage/demo.mp4) |

![Lead capture demo](workflows/lead-capture-ai-reply/demo.gif)

## Run it locally

You need Docker and about 4 GB of free disk space.

```bash
cp .env.example .env
```

Generate the encryption key (64 hex characters, minimum 32) and put it in `.env` as `N8N_ENCRYPTION_KEY`:

```bash
openssl rand -hex 32
```

```bash
docker compose up -d
```

The first start downloads the AI model (about 2.1 GB), which can take a while. It is kept in a
Docker volume, so later starts are instant.

| Service | URL | What it is |
| ------- | --- | ---------- |
| n8n | http://localhost:5678 | The automation editor |
| Mailpit | http://localhost:8025 | Test inbox that catches every email the workflows send |
| GreenMail | SMTP `localhost:3025`, IMAP `greenmail:3143` (inside Docker) | A real test mailbox, `info@acme.test` (login `info`, password `demo`), read by the inbox workflow |
| Local AI | `http://llm:8080/v1` (inside Docker) | [llama.cpp](https://github.com/ggml-org/llama.cpp) server running Qwen2.5 3B, OpenAI-compatible |

Open http://localhost:5678. On first launch n8n asks you to create the owner account.

| Login | Password | Role |
| ----- | -------- | ---- |
| The email you enter on first launch | The password you choose (8+ characters, 1 number, 1 capital) | Owner |
| `info` (mailbox `info@acme.test`) | `demo` | Test mailbox (GreenMail IMAP/SMTP), already set in the imported credential |

Then import the credentials and all workflows (needs Node.js):

```bash
npm ci
```

```bash
npm run import
```

Imported workflows start switched off. Open one in n8n and turn it on.

## Import a single workflow by hand

1. In n8n, open **Create Workflow**, then the **⋯** menu → **Import from File**.
2. Pick `workflows/<name>/workflow.json`.
3. Pick a credential in the nodes that show a warning (each workflow's README lists them).

## Use a better AI model

The local model is small so it runs on any laptop. For production, open the **Local AI model**
node in a workflow and either:

- set its credential to your own OpenAI key, or
- delete it and connect the **Anthropic Chat Model** (Claude) or **Google Gemini Chat Model** node instead.

The rest of the workflow stays the same.

## Record the demo videos

The videos are recorded with Playwright in your installed Google Chrome, then cut and encoded with
ffmpeg. With the stack running and the workflow turned on, add your n8n login to `.env` as
`N8N_OWNER_EMAIL` and `N8N_OWNER_PASSWORD`. Install Playwright's recording helper once:

```bash
npx playwright-core install ffmpeg
```

Then record:

```bash
npm run demo:lead-capture
```

```bash
npm run demo:inbox-triage
```

## Project structure

```text
compose.yaml                 n8n + local AI (llama.cpp) + Mailpit + GreenMail test mailboxes
credentials/local.json       local credentials (no secrets: local AI and test mailboxes only)
workflows/<name>/
  workflow.json              n8n export, imported by npm run import
  README.md                  what it does, credentials, how to try it
  demo.mp4, demo.gif         recorded demo
scripts/
  import.sh                  imports credentials + all workflows into n8n
  check-workflows.mjs        CI check: valid exports, README present, no pasted API keys
  demo/                      Playwright scripts that record the demo videos, plus a tiny SMTP sender for test emails
```

## Contributing

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (checked by a git hook).
Run `npm ci` once after cloning to install the hook, and `npm run check` before pushing.

## License

MIT
