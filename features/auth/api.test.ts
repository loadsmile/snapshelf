import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeAuthRedirect,
  deleteCurrentUserAccount,
  requestPasswordReset,
  signUp,
  updatePassword,
} from '@/features/auth/api';
import { deleteImageLocally } from '@/features/images/local';
import { listCurrentDeviceMediaPaths } from '@/features/images/locations';

const mockClient = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
    setSession: vi.fn(),
    updateUser: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
}));

vi.mock('@/services/supabase', () => ({
  requireSupabaseClient: () => mockClient,
}));

vi.mock('expo-linking', () => ({
  createURL: (path: string) => `snapshelf://${path.replace(/^\//, '')}`,
}));

vi.mock('@/features/images/local', () => ({
  deleteImageLocally: vi.fn(),
}));

vi.mock('@/features/images/locations', () => ({
  listCurrentDeviceMediaPaths: vi.fn(),
}));

describe('deleteCurrentUserAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'mariana@example.com',
          user_metadata: {},
        },
      },
      error: null,
    });
    mockClient.auth.signInWithPassword.mockResolvedValue({ error: null });
    mockClient.auth.signOut.mockResolvedValue({ error: null });
    mockClient.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    vi.mocked(deleteImageLocally).mockResolvedValue(undefined);
    vi.mocked(listCurrentDeviceMediaPaths).mockResolvedValue([]);
  });

  it('deletes all current-device media after the Edge Function succeeds', async () => {
    vi.mocked(listCurrentDeviceMediaPaths).mockResolvedValue([
      'snaps/a.jpg',
      'shelf-covers/b.jpg',
      'stack-covers/c.jpg',
    ]);

    await deleteCurrentUserAccount(' password ');

    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'mariana@example.com',
      password: ' password ',
    });
    expect(mockClient.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { password: ' password ' },
    });
    expect(deleteImageLocally).toHaveBeenCalledTimes(3);
    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/a.jpg');
    expect(deleteImageLocally).toHaveBeenCalledWith('shelf-covers/b.jpg');
    expect(deleteImageLocally).toHaveBeenCalledWith('stack-covers/c.jpg');
    expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not delete local media when backend account deletion fails', async () => {
    vi.mocked(listCurrentDeviceMediaPaths).mockResolvedValue(['snaps/a.jpg']);
    mockClient.functions.invoke.mockResolvedValue({ data: null, error: new Error('Function failed') });

    await expect(deleteCurrentUserAccount('password')).rejects.toThrow('Function failed');

    expect(deleteImageLocally).not.toHaveBeenCalled();
    expect(mockClient.auth.signOut).not.toHaveBeenCalled();
  });

  it('requires a password before verification', async () => {
    await expect(deleteCurrentUserAccount('')).rejects.toThrow('Enter your current password to delete this account.');

    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockClient.functions.invoke).not.toHaveBeenCalled();
    expect(deleteImageLocally).not.toHaveBeenCalled();
  });

  it('signs out locally after backend deletion even when local media cleanup fails', async () => {
    vi.mocked(listCurrentDeviceMediaPaths).mockResolvedValue(['snaps/a.jpg']);
    vi.mocked(deleteImageLocally).mockRejectedValueOnce(new Error('delete failed'));

    await deleteCurrentUserAccount('password');

    expect(deleteImageLocally).toHaveBeenCalledWith('snaps/a.jpg');
    expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('email auth flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'user-1' } },
      error: null,
    });
    mockClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    mockClient.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockClient.auth.verifyOtp.mockResolvedValue({ error: null });
    mockClient.auth.setSession.mockResolvedValue({ error: null });
    mockClient.auth.updateUser.mockResolvedValue({ error: null });
  });

  it('returns an email-confirmation state with an app callback URL', async () => {
    await expect(signUp('mariana@example.com', 'password')).resolves.toEqual({
      requiresEmailConfirmation: true,
    });
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'mariana@example.com',
      password: 'password',
      options: { emailRedirectTo: 'snapshelf://auth-callback' },
    });
  });

  it('sends signed-out password recovery to the app reset route', async () => {
    await requestPasswordReset('mariana@example.com');

    expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('mariana@example.com', {
      redirectTo: 'snapshelf://reset-password',
    });
  });

  it('completes PKCE confirmation links', async () => {
    await expect(completeAuthRedirect('snapshelf://auth-callback?code=confirmation-code')).resolves.toBe('confirmed');
    expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('confirmation-code');
  });

  it('recognizes a PKCE code opened on the recovery route', async () => {
    await expect(completeAuthRedirect('snapshelf://reset-password?code=recovery-code', 'recovery')).resolves.toBe('recovery');
    expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
  });

  it('completes token-hash recovery links', async () => {
    await expect(completeAuthRedirect('snapshelf://reset-password?token_hash=reset-token&type=recovery')).resolves.toBe('recovery');
    expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'reset-token',
      type: 'recovery',
    });
  });

  it('completes implicit recovery links from URL fragments', async () => {
    await expect(completeAuthRedirect('snapshelf://reset-password#access_token=access&refresh_token=refresh&type=recovery')).resolves.toBe('recovery');
    expect(mockClient.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('rejects incomplete email links', async () => {
    await expect(completeAuthRedirect('snapshelf://auth-callback')).rejects.toThrow('incomplete or has expired');
  });

  it('updates the recovered account password', async () => {
    await updatePassword('new-password');
    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
  });
});
