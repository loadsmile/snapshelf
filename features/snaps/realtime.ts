export type RealtimeConnectionStatus = 'CHANNEL_ERROR' | 'TIMED_OUT';

export class RealtimeConnectionError extends Error {
  readonly status: RealtimeConnectionStatus;

  constructor(status: RealtimeConnectionStatus, cause?: Error) {
    super(cause?.message ?? 'Realtime connection was interrupted.', { cause });
    this.name = 'RealtimeConnectionError';
    this.status = status;
  }
}

export function logRealtimeError(resource: string, error: Error) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  const cause = error.cause instanceof Error ? { name: error.cause.name, message: error.cause.message } : undefined;
  console.warn(`${resource} realtime connection interrupted`, { name: error.name, message: error.message, cause });
}
