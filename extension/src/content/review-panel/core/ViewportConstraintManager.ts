export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export class ViewportConstraintManager {
  static getSafeBounds(
    panelWidth: number,
    panelHeight: number,
    safeInset: number = 12,
  ): ViewportBounds {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const offsetX = vv ? vv.offsetLeft : 0;
    const offsetY = vv ? vv.offsetTop : 0;

    return {
      left: offsetX + safeInset,
      top: offsetY + safeInset,
      right: offsetX + vw - safeInset,
      bottom: offsetY + vh - safeInset,
      width: vw,
      height: vh,
    };
  }

  static clampPosition(
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    safeInset: number = 12,
  ): { x: number; y: number } {
    const bounds = this.getSafeBounds(panelWidth, panelHeight, safeInset);
    const maxX = bounds.right - panelWidth;
    const maxY = bounds.bottom - panelHeight;

    const clampedX = Math.max(bounds.left, Math.min(x, maxX));
    // allow header to remain visible even if panel extends below bottom
    const clampedY = Math.max(
      bounds.top,
      Math.min(y, maxY > bounds.top ? maxY : bounds.bottom - 60),
    );

    return { x: clampedX, y: clampedY };
  }
}
