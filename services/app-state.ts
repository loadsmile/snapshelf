export type AppStateDependencies = {
  startAutoRefresh: () => Promise<unknown>;
  stopAutoRefresh: () => Promise<unknown>;
  recover: () => void;
};

export function handleAppStateChange(state: string, dependencies: AppStateDependencies) {
  if (state === 'active') {
    dependencies.startAutoRefresh().catch(() => undefined);
    dependencies.recover();
    return;
  }

  dependencies.stopAutoRefresh().catch(() => undefined);
}
