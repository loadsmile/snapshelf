import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBottomTabGeometry } from '@/features/snaps/bottom-tab-geometry';

export { BOTTOM_TAB_CONTENT_HEIGHT } from '@/features/snaps/bottom-tab-geometry';

export function useBottomTabGeometry() {
  return getBottomTabGeometry(useSafeAreaInsets().bottom);
}
