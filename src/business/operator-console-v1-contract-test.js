const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const contractPath = path.join(ROOT, 'docs', 'JARVIS-LIVE-OPERATOR-CONSOLE-V1.md');

if (!fs.existsSync(contractPath)) throw new Error('Missing JARVIS Live Operator Console V1 contract');

const contract = fs.readFileSync(contractPath, 'utf8');

const required = [
  'Responsive browser: desktop and mobile.',
  'Voice input.',
  'Voice output.',
  'JARVIS may ask clarification questions before execution.',
  'JARVIS may request explicit approval for gated actions.',
  'The supplied JARVIS artwork is the visual reference and must not be redesigned.',
  'Surrounding orbital/ring motion is animated without replacing the artwork.',
  'Central star has a restrained glow/pulse effect.',
  'Execution Trace',
  'request_id',
  'existing action boundary',
  'Dashboard/Console is an operator surface, not a second business engine.',
  'Real Estate / Lead Generation',
  'E-commerce',
  'Trading',
  'AI Automation',
  'Architecture → Contract → Contract Test → Minimal Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence → Freeze.'
];

for (const item of required) {
  if (!contract.includes(item)) throw new Error(`Operator Console contract missing: ${item}`);
}

console.log('JARVIS LIVE OPERATOR CONSOLE V1 CONTRACT TEST: PASS');
console.log(`Contract: ${path.relative(ROOT, contractPath)}`);
console.log(`Requirements verified: ${required.length}`);
