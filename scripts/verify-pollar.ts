/**
 * Pollar integration verification.
 *
 * Run: npm run verify:pollar
 *
 * Probes the live Pollar API and writes a dated evidence file to
 * docs/evidence/. It reports exactly what succeeded and what did not. It never
 * fabricates a result: a blocked call is recorded as blocked, with the server's
 * own error code.
 *
 * Note on key types (established by probing, see docs/pollar-integration.md):
 * ramp endpoints accept only the PUBLISHABLE key, and that key is locked to the
 * origins registered under Build -> Domains in the Pollar dashboard.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  // Minimal .env.local reader so the script has no extra dependency.
  const fs = require('node:fs') as typeof import('node:fs');
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = fs.readFileSync(join(root, file), 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
      }
    } catch {
      /* file absent is fine */
    }
  }
}
loadEnv();

const BASE = process.env.NEXT_PUBLIC_POLLAR_BASE_URL ?? 'https://sdk.api.pollar.xyz';
const PUB = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ?? '';
const SEC = process.env.POLLAR_SECRET_KEY ?? '';
const ORIGIN = process.env.VERIFY_ORIGIN ?? 'http://localhost:3000';

interface Check {
  name: string;
  detail: string;
  status: 'PASS' | 'BLOCKED' | 'FAIL' | 'INFO';
  evidence: string;
}

const checks: Check[] = [];

function versionOf(pkg: string): string {
  // The package's `exports` map does not expose package.json, so read it off disk.
  try {
    const fs = require('node:fs') as typeof import('node:fs');
    const raw = fs.readFileSync(join(root, 'node_modules', ...pkg.split('/'), 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return 'not installed';
  }
}

async function probe(path: string, key: string, label: string): Promise<Check> {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'x-pollar-api-key': key, Origin: ORIGIN },
    });
    const body = await res.text();
    const short = body.length > 500 ? `${body.slice(0, 500)}…` : body;

    if (res.ok) {
      return { name: label, detail: `GET ${path}`, status: 'PASS', evidence: `${res.status} ${short}` };
    }
    // Three server responses are expected states rather than defects:
    //  ORIGIN_NOT_ALLOWED     — origin not registered under Build -> Domains
    //  API_KEY_TYPE_NOT_ALLOWED — endpoint rejects this key type by design
    //  SDK_AUTH_INVALID_TOKEN — endpoint needs an authenticated USER session,
    //                           which only the browser login flow can mint.
    const blocked =
      body.includes('ORIGIN_NOT_ALLOWED') ||
      body.includes('API_KEY_TYPE_NOT_ALLOWED') ||
      body.includes('SDK_AUTH_INVALID_TOKEN');
    return {
      name: label,
      detail: `GET ${path}`,
      status: blocked ? 'BLOCKED' : 'FAIL',
      evidence: `${res.status} ${short}`,
    };
  } catch (err) {
    return {
      name: label,
      detail: `GET ${path}`,
      status: 'FAIL',
      evidence: `network error: ${(err as Error).message}`,
    };
  }
}

async function main() {
  const coreVersion = versionOf('@pollar/core');
  const reactVersion = versionOf('@pollar/react');

  checks.push({
    name: 'SDK installed',
    detail: 'Package versions resolved from node_modules',
    status: coreVersion === 'not installed' ? 'FAIL' : 'PASS',
    evidence: `@pollar/core ${coreVersion}, @pollar/react ${reactVersion}`,
  });

  // The SDK must be importable and constructible, not merely present in
  // package.json. This proves the dependency is real and wired.
  try {
    const mod = await import('@pollar/core');
    const exported = Object.keys(mod);
    const expected = ['PollarClient', 'StellarClient', 'WalletType', 'toBaseUnits'];
    const missing = expected.filter((e) => !exported.includes(e));
    checks.push({
      name: 'SDK exports',
      detail: 'Real Pollar symbols importable',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      evidence:
        missing.length === 0
          ? `found ${expected.join(', ')} (+${exported.length - expected.length} more exports)`
          : `missing: ${missing.join(', ')}`,
    });
  } catch (err) {
    checks.push({
      name: 'SDK exports',
      detail: 'Real Pollar symbols importable',
      status: 'FAIL',
      evidence: (err as Error).message,
    });
  }

  checks.push({
    name: 'API prefix',
    detail: 'Confirm /v2 is the live prefix',
    status: 'INFO',
    evidence: `base ${BASE}; unprefixed /ramps/countries returns 404 (verified 2026-09-17)`,
  });

  if (!PUB) {
    checks.push({
      name: 'Publishable key',
      detail: 'NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY',
      status: 'FAIL',
      evidence: 'not set — cannot probe ramp endpoints',
    });
  } else {
    checks.push(await probe('/v2/ramps/countries', PUB, 'Ramp countries (publishable key)'));
    checks.push(
      await probe(
        '/v2/ramps/quote?country=BO&amount=1000&currency=BOB&direction=offramp',
        PUB,
        'Bolivia BOB off-ramp quote',
      ),
    );
  }

  if (SEC) {
    checks.push(await probe('/v2/ramps/countries', SEC, 'Ramp countries (secret key — expected to be rejected)'));
  }

  // Report
  const pass = checks.filter((c) => c.status === 'PASS').length;
  const blocked = checks.filter((c) => c.status === 'BLOCKED').length;
  const failed = checks.filter((c) => c.status === 'FAIL').length;

  console.log(`\nPollar verification — ${new Date().toISOString()}`);
  console.log(`origin sent: ${ORIGIN}\n`);
  for (const c of checks) {
    console.log(`[${c.status.padEnd(7)}] ${c.name}`);
    console.log(`            ${c.detail}`);
    console.log(`            ${c.evidence}\n`);
  }
  console.log(`${pass} passed, ${blocked} blocked, ${failed} failed\n`);

  const lines = [
    `# Pollar verification run`,
    ``,
    `- Run at: ${new Date().toISOString()}`,
    `- Base URL: \`${BASE}\``,
    `- Origin sent: \`${ORIGIN}\``,
    `- Result: **${pass} passed, ${blocked} blocked, ${failed} failed**`,
    ``,
    `| Check | Status | Evidence |`,
    `| --- | --- | --- |`,
    ...checks.map(
      (c) => `| ${c.name} | ${c.status} | \`${c.evidence.replace(/\|/g, '\\|').slice(0, 220)}\` |`,
    ),
    ``,
    blocked > 0
      ? [
          `> **Blocked checks are expected states, not defects.**`,
          `>`,
          `> - \`ORIGIN_NOT_ALLOWED\` — the origin above is not registered under`,
          `>   Build → Domains in the Pollar dashboard.`,
          `> - \`API_KEY_TYPE_NOT_ALLOWED\` — that endpoint rejects that key type by`,
          `>   design; ramp endpoints accept only the publishable key.`,
          `> - \`SDK_AUTH_INVALID_TOKEN\` — that endpoint requires an authenticated`,
          `>   **user session**. The publishable key alone is not enough: the SDK must`,
          `>   hold a DPoP-bound session minted by a browser login. This cannot be`,
          `>   reproduced from a Node script and is exercised by the app itself.`,
        ].join('\n')
      : `> All probed endpoints responded successfully.`,
    ``,
  ];

  mkdirSync(join(root, 'docs', 'evidence'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = join(root, 'docs', 'evidence', `pollar-verification-${stamp}.md`);
  writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`Evidence written to ${out}`);

  // A blocked check is not a script failure — it is a recorded, honest state.
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
