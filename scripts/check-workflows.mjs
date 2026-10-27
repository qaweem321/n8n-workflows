// Checks every workflows/<name>/workflow.json: valid n8n export, README present, no pasted secrets.
import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../workflows/", import.meta.url).pathname;
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/, // OpenAI / Anthropic style keys
  /AIza[0-9A-Za-z_-]{35}/, // Google API keys
  /gsk_[A-Za-z0-9]{20,}/, // Groq keys
  /(sk|rk)_(live|test)_[A-Za-z0-9]{10,}/, // Stripe keys
  /xox[abp]-[A-Za-z0-9-]{10,}/, // Slack tokens
];

async function checkFolder(name) {
  const dir = join(root, name);
  const errors = [];
  const raw = await readFile(join(dir, "workflow.json"), "utf8").catch(() => null);
  if (raw === null) return [`${name}: missing workflow.json`];
  try {
    const wf = JSON.parse(raw);
    if (!Array.isArray(wf.nodes) || typeof wf.connections !== "object") {
      errors.push(`${name}: workflow.json is not an n8n export (needs nodes + connections)`);
    }
  } catch (err) {
    errors.push(`${name}: workflow.json is not valid JSON (${err.message})`);
  }
  for (const pattern of secretPatterns) {
    if (pattern.test(raw)) errors.push(`${name}: looks like a secret is pasted in (${pattern})`);
  }
  await access(join(dir, "README.md")).catch(() => errors.push(`${name}: missing README.md`));
  return errors;
}

const entries = await readdir(root, { withFileTypes: true });
const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
const errors = (await Promise.all(folders.map(checkFolder))).flat();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Checked ${folders.length} workflow(s): OK`);
