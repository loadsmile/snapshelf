export const BOTTOM_TAB_CONTENT_HEIGHT = 56;
export const BOTTOM_TAB_OVERLAY_GAP = 10;

export function getBottomTabGeometry(bottomInset: number) {
  const occupiedHeight = BOTTOM_TAB_CONTENT_HEIGHT + bottomInset;

  return {
    bottomInset,
    barHeight: occupiedHeight,
    occupiedHeight,
    overlayClearance: occupiedHeight + BOTTOM_TAB_OVERLAY_GAP,
  };
}
