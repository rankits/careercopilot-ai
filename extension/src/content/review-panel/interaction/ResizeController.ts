export class ResizeController {
  private isResizing = false;
  private initialY = 0;
  private initialHeight = 0;
  private panelElement: HTMLElement | null = null;
  private onResizeEnd: (height: number) => void;

  constructor(onResizeEnd: (height: number) => void) {
    this.onResizeEnd = onResizeEnd;
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  startResize(e: React.PointerEvent, panelRef: React.RefObject<HTMLElement | null>, currentHeight: number) {
    this.panelElement = panelRef.current;
    if (!this.panelElement) return;

    (e.target as Element).setPointerCapture(e.pointerId);
    
    this.isResizing = true;
    this.initialY = e.clientY;
    this.initialHeight = currentHeight;

    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);
    document.body.style.userSelect = 'none';
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isResizing || !this.panelElement) return;
    
    const deltaY = e.clientY - this.initialY;
    let newHeight = this.initialHeight + deltaY;
    
    // Enforce basic boundaries visually during drag
    newHeight = Math.max(360, newHeight);
    if (window.visualViewport) {
       newHeight = Math.min(newHeight, window.visualViewport.height - 24);
    }
    
    this.panelElement.style.height = `${newHeight}px`;
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isResizing || !this.panelElement) return;
    this.isResizing = false;

    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
    document.body.style.userSelect = '';

    const finalHeight = parseFloat(this.panelElement.style.height);
    this.onResizeEnd(finalHeight);
  }
}
