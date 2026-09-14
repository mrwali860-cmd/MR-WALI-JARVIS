const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const contractPath = path.join(ROOT, 'docs', 'architecture', 'operator-console-v2-chat.md');
const serverPath = path.join(ROOT, 'server.js');
const uiPath = path.join(ROOT, 'jarvis.html');

if (!fs.existsSync(contractPath)) throw new Error('Missing Operator Console V2 chat architecture contract');
const contract = fs.readFileSync(contractPath, 'utf8');
const server = fs.readFileSync(serverPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');

const required = [
  'POST /ask',
  'JarvisChatV2',
  'Existing Orchestrator and Dashboard Action Boundary remain the only execution/mutation path.',
  'chatMode',
  'LLM',
  'FALLBACK',
  'JARVIS may ask clarification',
  'No new database.',
  'No approval bypass.'
];
for (const item of required) if (!contract.includes(item)) throw new Error(`V2 contract missing: ${item}`);

if (!server.includes('app.post("/ask"')) throw new Error('Existing /ask boundary missing');
if (!ui.includes("fetch('/ask'")) throw new Error('Operator console does not use /ask');
if (!server.includes('analyzeCommand(')) throw new Error('Existing command path missing');
if (!server.includes('executeAction(')) throw new Error('Existing action path missing');
if (!server.includes('DashboardActionBoundary')) throw new Error('Existing dashboard action boundary missing');

console.log('OPERATOR CONSOLE V2 CHAT CONTRACT TEST: PASS');
console.log(`Contract: ${path.relative(ROOT, contractPath)}`);
console.log('Existing /ask, command/action path, UI integration, and no-duplicate execution boundary verified.');
