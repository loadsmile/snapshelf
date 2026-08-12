import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [inputPath, outputDirectory] = process.argv.slice(2);

if (!inputPath || !outputDirectory) {
  throw new Error('Usage: node scripts/record-eas-builds.mjs <eas-build.json> <output-directory>');
}

const parsed = JSON.parse(await readFile(inputPath, 'utf8'));
const builds = Array.isArray(parsed) ? parsed : [parsed];
const expectedCommitHash = process.env.GITHUB_SHA;

if (builds.length === 0) {
  throw new Error('EAS returned no builds.');
}

await mkdir(outputDirectory, { recursive: true });

const manifest = [];

for (const build of builds) {
  const archiveUrl = build.artifacts?.applicationArchiveUrl;

  if (!build.id || build.status !== 'FINISHED' || !archiveUrl) {
    throw new Error(`EAS build ${build.id ?? 'unknown'} did not produce a finished application archive.`);
  }

  if (!['ANDROID', 'IOS'].includes(build.platform)) {
    throw new Error(`EAS build ${build.id} has unexpected platform ${build.platform ?? 'unknown'}.`);
  }

  if (build.buildProfile !== 'production') {
    throw new Error(`EAS build ${build.id} used profile ${build.buildProfile ?? 'unknown'}, not production.`);
  }

  if (!build.gitCommitHash || (expectedCommitHash && build.gitCommitHash !== expectedCommitHash)) {
    throw new Error(`EAS build ${build.id} commit ${build.gitCommitHash ?? 'unknown'} does not match ${expectedCommitHash ?? 'the required release commit'}.`);
  }

  const response = await fetch(archiveUrl);

  if (!response.ok) {
    throw new Error(`Unable to download EAS build ${build.id}: ${response.status}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  const archiveName = `${build.platform.toLowerCase()}-${build.id}-${basename(new URL(archiveUrl).pathname)}`;
  const sha256 = createHash('sha256').update(archive).digest('hex');

  await writeFile(join(outputDirectory, archiveName), archive);
  manifest.push({
    archiveName,
    archiveSize: archive.length,
    buildDetailsUrl: `https://expo.dev/accounts/loadsmile/projects/snapshelf/builds/${build.id}`,
    buildId: build.id,
    buildProfile: build.buildProfile,
    buildVersion: build.appBuildVersion,
    fingerprint: build.fingerprint?.hash ?? build.fingerprint,
    gitCommitHash: build.gitCommitHash,
    platform: build.platform,
    githubRepository: process.env.GITHUB_REPOSITORY,
    githubRunId: process.env.GITHUB_RUN_ID,
    githubRunUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined,
    githubRef: process.env.GITHUB_REF,
    sha256,
    version: build.appVersion,
  });
}

await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(outputDirectory, 'eas-build.json'), `${JSON.stringify(parsed, null, 2)}\n`);
await writeFile(
  join(outputDirectory, 'SHA256SUMS'),
  `${manifest.map(({ archiveName, sha256 }) => `${sha256}  ${archiveName}`).join('\n')}\n`,
);
