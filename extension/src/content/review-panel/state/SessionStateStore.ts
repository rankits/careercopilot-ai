export interface ReviewPanelState {
  mode: 'auto' | 'dock-left' | 'dock-right' | 'pin' | 'bottom-sheet';
  x?: number;
  y?: number;
  width: number;
  height: number;
  snapState: 'collapsed' | 'medium' | 'expanded' | 'custom';
  selectedFieldIds: string[];
  draftValues: Record<string, unknown>;
  isOpen: boolean;
}

const STORAGE_KEY = 'career_copilot_review_state';

const defaultState: ReviewPanelState = {
  mode: 'auto',
  width: 420,
  height: 500,
  snapState: 'custom',
  selectedFieldIds: [],
  draftValues: {},
  isOpen: false,
};

export class SessionStateStore {
  static async load(): Promise<ReviewPanelState> {
    try {
      const result = await chrome.storage.session.get([STORAGE_KEY]);
      return result[STORAGE_KEY]
        ? { ...defaultState, ...result[STORAGE_KEY] }
        : { ...defaultState };
    } catch (err) {
      console.warn('Could not load session state', err);
      return { ...defaultState };
    }
  }

  static async save(state: Partial<ReviewPanelState>): Promise<void> {
    try {
      const current = await this.load();
      await chrome.storage.session.set({ [STORAGE_KEY]: { ...current, ...state } });
    } catch (err) {
      console.warn('Could not save session state', err);
    }
  }

  static async clear(): Promise<void> {
    try {
      await chrome.storage.session.remove([STORAGE_KEY]);
    } catch (err) {}
  }
}
