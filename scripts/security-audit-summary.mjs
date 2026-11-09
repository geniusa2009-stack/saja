import { readFileSync } from 'node:fs';
const file = process.argv[2] ?? 'security-audit.json';
try {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const count = raw.metadata?.vulnerabilities;
  if (!count) {
    console.log('Audit incomplete: npm did not provide vulnerability metadata.');
    process.exit(0);
  }
  console.log('npm audit report — read-only, no dependency changes made');
  console.log(JSON.stringify(count, null, 2));
  const entries = Object.entries(raw.vulnerabilities ?? {}).map(([name, v]) => ({
    name, severity: v.severity, isDirect: Boolean(v.isDirect), via: (v.via ?? []).map((item) => typeof item === 'string' ? item : item.title), fixAvailable: v.fixAvailable,
  }));
  console.log(JSON.stringify(entries, null, 2));
} catch (e) {
  console.log('Audit could not be parsed:', String(e));
}
