import { ViewportConstraintManager } from '../core/ViewportConstraintManager';

export class DragController {
  private isDragging = false;
  private initialX = 0;
  private initialY = 0;
  private currentX = 0;
  private currentY = 0;
  private panelElement: HTMLElement | null = null;
  private onDragEnd: (x: number, y: number) => void;

  constructor(onDragEnd: (x: number, y: number) => void) {
    this.onDragEnd = onDragEnd;
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  startDrag(e: React.PointerEvent, panelRef: React.RefObject<HTMLElement | null>, currentX: number, currentY: number) {
    // Ignore interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    this.panelElement = panelRef.current;
    if (!this.panelElement) return;

    (e.target as Element).setPointerCapture(e.pointerId);
    
    this.isDragging = true;
    this.initialX = e.clientX;
    this.initialY = e.clientY;
    this.currentX = currentX;
    this.currentY = currentY;

    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);
    
    // Disable text selection
    document.body.style.userSelect = 'none';
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.panelElement) return;
    
    const deltaX = e.clientX - this.initialX;
    const deltaY = e.clientY - this.initialY;
    
    const newX = this.currentX + deltaX;
    const newY = this.currentY + deltaY;

    // Use translate3d for 60fps performance, don't update react state here
    this.panelElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;

    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
    
    document.body.style.userSelect = '';

    if (this.panelElement) {
      this.panelElement.style.transform = ''; // reset transform
      
      const deltaX = e.clientX - this.initialX;
      const deltaY = e.clientY - this.initialY;
      
      const rawX = this.currentX + deltaX;
      const rawY = this.currentY + deltaY;

      const rect = this.panelElement.getBoundingClientRect();
      const clamped = ViewportConstraintManager.clampPosition(rawX, rawY, rect.width, rect.height);
      
      this.onDragEnd(clamped.x, clamped.y);
    }
  }
}
