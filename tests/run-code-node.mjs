// Runs a "Run Once for Each Item" Code node from a workflow file outside n8n, for unit tests.
// `nodes` fakes what $('Node name').item returns inside n8n.
// `staticData` fakes $getWorkflowStaticData('global'); pass the same object to share it between runs.
import { readFileSync } from "node:fs";

export function runCodeNode(workflow, nodeName, json, nodes = {}, { staticData = {} } = {}) {
  const file = new URL(`../workflows/${workflow}/workflow.json`, import.meta.url);
  const node = JSON.parse(readFileSync(file, "utf8")).nodes.find((n) => n.name === nodeName);
  if (!node) throw new Error(`No node "${nodeName}" in ${workflow}`);
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Test did not fake $('${name}')`);
    return { item: nodes[name], first: () => nodes[name] };
  };
  const $getWorkflowStaticData = () => staticData;
  return new Function("$json", "$", "$getWorkflowStaticData", node.parameters.jsCode)(json, $, $getWorkflowStaticData).json;
}
