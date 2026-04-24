import type { ShareIntent } from 'expo-share-intent';
import { useShareIntentContext } from 'expo-share-intent';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const EMPTY_SHARE_INTENT: ShareIntent = {
  files: null,
  text: null,
  webUrl: null,
  type: null,
};

type RetainedShareIntentContextValue = {
  error: string | null;
  hasShareIntent: boolean;
  isReady: boolean;
  resetShareIntent: (clearNativeModule?: boolean) => void;
  shareIntent: ShareIntent;
};

const RetainedShareIntentContext = createContext<RetainedShareIntentContextValue>({
  error: null,
  hasShareIntent: false,
  isReady: false,
  resetShareIntent: () => {},
  shareIntent: EMPTY_SHARE_INTENT,
});

function hasSharePayload(shareIntent: ShareIntent) {
  return Boolean(shareIntent.files?.length || shareIntent.text || shareIntent.webUrl);
}

export function RetainedShareIntentProvider({ children }: { children: ReactNode }) {
  const { error, hasShareIntent, isReady, resetShareIntent: resetNativeShareIntent, shareIntent } = useShareIntentContext();
  const [retainedShareIntent, setRetainedShareIntent] = useState<ShareIntent>(EMPTY_SHARE_INTENT);

  useEffect(() => {
    if (hasSharePayload(shareIntent)) {
      setRetainedShareIntent(shareIntent);
    }
  }, [shareIntent]);

  function resetShareIntent(clearNativeModule?: boolean) {
    setRetainedShareIntent(EMPTY_SHARE_INTENT);
    resetNativeShareIntent(clearNativeModule);
  }

  const activeShareIntent = hasSharePayload(shareIntent) ? shareIntent : retainedShareIntent;

  return (
    <RetainedShareIntentContext.Provider
      value={{
        error,
        hasShareIntent: hasShareIntent || hasSharePayload(retainedShareIntent),
        isReady,
        resetShareIntent,
        shareIntent: activeShareIntent,
      }}
    >
      {children}
    </RetainedShareIntentContext.Provider>
  );
}

export function useRetainedShareIntentContext() {
  return useContext(RetainedShareIntentContext);
}
