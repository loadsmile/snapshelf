import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [inputPath, expectedPlatform, expectedCommitHash, expectedArchiveSha256] = process.argv.slice(2);

if (!inputPath || !expectedPlatform || !expectedCommitHash || !expectedArchiveSha256) {
  throw new Error('Usage: node scripts/verify-eas-submit.mjs <eas-build.json> <platform> <release-commit> <archive-sha256>');
}

const build = JSON.parse(await readFile(inputPath, 'utf8'));
const platform = String(build.platform ?? '').toLowerCase();

if (build.status !== 'FINISHED') {
  throw new Error(`Build ${build.id ?? 'unknown'} is not finished.`);
}

if (build.buildProfile !== 'production') {
  throw new Error(`Build ${build.id ?? 'unknown'} did not use the production profile.`);
}

if (platform !== expectedPlatform) {
  throw new Error(`Build ${build.id ?? 'unknown'} is for ${platform || 'an unknown platform'}, not ${expectedPlatform}.`);
}

if (build.gitCommitHash !== expectedCommitHash) {
  throw new Error(`Build ${build.id ?? 'unknown'} commit ${build.gitCommitHash ?? 'unknown'} does not match ${expectedCommitHash}.`);
}

const archiveUrl = build.artifacts?.applicationArchiveUrl;
if (!archiveUrl) {
  throw new Error(`Build ${build.id ?? 'unknown'} has no application archive.`);
}

const response = await fetch(archiveUrl);
if (!response.ok) {
  throw new Error(`Unable to download build ${build.id ?? 'unknown'} archive: ${response.status}.`);
}

const archiveSha256 = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
if (archiveSha256 !== expectedArchiveSha256.toLowerCase()) {
  throw new Error(`Build ${build.id ?? 'unknown'} archive checksum does not match the approved artifact.`);
}
