# n8n Workflows

Ready-to-import [n8n](https://n8n.io) automations for small businesses: lead follow-up, inbox triage,
document extraction and customer onboarding. Each workflow runs on free tiers only, and the AI steps
use a free model by default, so you can swap in Claude or GPT with one node change.

## Workflows

| Workflow | What it does | Demo |
| -------- | ------------ | ---- |
| _Coming soon_ | | |

## Run it locally

You need Docker.

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

Open http://localhost:5678. On first launch n8n asks you to create the owner account.

| Email | Password | Role |
| ----- | -------- | ---- |
| The email you enter on first launch | The password you choose (8+ characters, 1 number, 1 capital) | Owner |

## Import a workflow

1. In n8n, open **Workflows → Create Workflow**, then the **⋯** menu → **Import from File**.
2. Pick `workflows/<name>/workflow.json`.
3. Add your own credentials to the nodes marked with a warning (each workflow's README lists them).

The `workflows/` folder is also mounted read-only inside the container at `/workflows`, so you can
import one from the command line instead (replace `<name>` with the folder name):

```bash
docker compose exec n8n n8n import:workflow --input=/workflows/<name>/workflow.json
```

## Project structure

```text
compose.yaml              n8n in Docker (data kept in the n8n_data volume)
workflows/<name>/         one folder per automation
  workflow.json           n8n export, no credentials inside
  README.md               what it does, setup, credentials needed
scripts/check-workflows.mjs  CI check: valid exports, README present, no pasted API keys
```

## Contributing

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (checked by a git hook).
Run `npm ci` once after cloning to install the hook, and `npm run check` before pushing.

## License

MIT
