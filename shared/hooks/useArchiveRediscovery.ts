import { Linking } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { getLocalImageAvailability } from '@/features/images/local';
import {
  getLocalDayKey,
  loadDailyArchiveRediscovery,
  type ArchiveRediscoveryAvailabilityCache,
  type ArchiveRediscoveryItem,
} from '@/features/snaps/archive-rediscovery';
import type { Snap } from '@/features/snaps/types';

type ArchiveRediscoveryState = {
  error: string | null;
  items: ArchiveRediscoveryItem[];
  loading: boolean;
};

export function useArchiveRediscovery(snaps: readonly Snap[]): ArchiveRediscoveryState {
  const [dayKey, setDayKey] = useState(() => getLocalDayKey(Date.now()));
  const [state, setState] = useState<ArchiveRediscoveryState>({ error: null, items: [], loading: snaps.length > 0 });
  const availabilityCacheRef = useRef<ArchiveRediscoveryAvailabilityCache>(new Map());
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = setTimeout(() => setDayKey(getLocalDayKey(Date.now())), nextDay.getTime() - now.getTime() + 100);

    return () => clearTimeout(timeout);
  }, [dayKey]);

  useEffect(() => {
    const request = ++latestRequestRef.current;

    if (snaps.length === 0) {
      setState({ error: null, items: [], loading: false });
      return;
    }

    setState((current) => ({ ...current, error: null, loading: true }));

    void loadDailyArchiveRediscovery(snaps, {
      availabilityCache: availabilityCacheRef.current,
      canOpenSourceUrl: Linking.canOpenURL,
      getLocalImageAvailability,
    })
      .then((items) => {
        if (request === latestRequestRef.current) {
          setState({ error: null, items, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (request === latestRequestRef.current) {
          setState({
            error: error instanceof Error ? error.message : 'Unable to find archive highlights right now.',
            items: [],
            loading: false,
          });
        }
      });

    return () => {
      if (request === latestRequestRef.current) {
        latestRequestRef.current += 1;
      }
    };
  }, [dayKey, snaps]);

  return state;
}
