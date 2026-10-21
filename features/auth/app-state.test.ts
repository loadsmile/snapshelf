import { describe, expect, it, vi } from 'vitest';

import { handleAppStateChange } from '@/services/app-state';

describe('Supabase AppState handling', () => {
  it('starts auth refresh and recovery when active', () => {
    const dependencies = { startAutoRefresh: vi.fn().mockResolvedValue(undefined), stopAutoRefresh: vi.fn().mockResolvedValue(undefined), recover: vi.fn() };
    handleAppStateChange('active', dependencies);
    expect(dependencies.startAutoRefresh).toHaveBeenCalledOnce();
    expect(dependencies.recover).toHaveBeenCalledOnce();
    expect(dependencies.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('stops auth refresh while backgrounded', () => {
    const dependencies = { startAutoRefresh: vi.fn().mockResolvedValue(undefined), stopAutoRefresh: vi.fn().mockResolvedValue(undefined), recover: vi.fn() };
    handleAppStateChange('background', dependencies);
    expect(dependencies.stopAutoRefresh).toHaveBeenCalledOnce();
    expect(dependencies.recover).not.toHaveBeenCalled();
  });
});
