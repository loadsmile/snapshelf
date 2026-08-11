const privateIpv4Patterns = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

function isPrivateHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '[::1]' ||
    normalizedHostname.endsWith('.local') ||
    privateIpv4Patterns.some((pattern) => pattern.test(normalizedHostname))
  );
}

export function normalizeSourceUrl(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue || trimmedValue.length > 4096) {
    return null;
  }

  try {
    const parsed = new URL(trimmedValue);

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || isPrivateHost(parsed.hostname)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
