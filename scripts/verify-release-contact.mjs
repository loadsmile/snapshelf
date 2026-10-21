import { readFileSync } from 'node:fs';

const URL_KEYS = ['EXPO_PUBLIC_PRIVACY_POLICY_URL', 'EXPO_PUBLIC_SUPPORT_URL'];
const CONTACT_KEYS = [...URL_KEYS, 'EXPO_PUBLIC_SUPPORT_EMAIL'];
const PLACEHOLDER_MARKER = 'example.invalid';

function readEasProductionEnv() {
  try {
    const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
    return easConfig?.build?.production?.env ?? {};
  } catch {
    return {};
  }
}

// eas.json `build.production.env` is the reviewed source of truth for the values that
// EAS embeds in the production bundle. Process environment values win when present so
// that a CI job can override them explicitly.
const easProductionEnv = readEasProductionEnv();
const requiredValues = {};
const valueSources = {};

for (const key of CONTACT_KEYS) {
  const fromProcess = process.env[key];

  if (fromProcess) {
    requiredValues[key] = fromProcess;
    valueSources[key] = 'process environment';
    continue;
  }

  const fromEas = easProductionEnv[key];

  if (fromEas) {
    requiredValues[key] = fromEas;
    valueSources[key] = 'eas.json build.production.env';
    continue;
  }

  requiredValues[key] = undefined;
  valueSources[key] = 'not set';
}

const missing = CONTACT_KEYS.filter((key) => !requiredValues[key] || requiredValues[key].includes(PLACEHOLDER_MARKER));

if (missing.length > 0) {
  console.error(`Release contact details are missing or still placeholders: ${missing.join(', ')}`);
  console.error('Set them in eas.json `build.production.env` or in the process environment.');
  process.exit(1);
}

for (const key of URL_KEYS) {
  try {
    const url = new URL(requiredValues[key]);

    if (url.protocol !== 'https:') {
      throw new Error('HTTPS is required');
    }
  } catch {
    console.error(`${key} must be a valid HTTPS URL.`);
    process.exit(1);
  }
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requiredValues.EXPO_PUBLIC_SUPPORT_EMAIL)) {
  console.error('EXPO_PUBLIC_SUPPORT_EMAIL must be a valid email address.');
  process.exit(1);
}

for (const key of CONTACT_KEYS) {
  console.log(`  ${key}: ${valueSources[key]}`);
}

console.log('Release contact details are configured.');
