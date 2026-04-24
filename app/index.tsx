import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/useAuth';

export default function IndexScreen() {
  const { isConfigured, status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (!isConfigured) {
    return <Redirect href="/board" />;
  }

  return <Redirect href={status === 'signedIn' ? '/board' : '/sign-in'} />;
}
