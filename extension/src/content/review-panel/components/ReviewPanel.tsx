import React, { useState, useEffect, useRef } from 'react';
import { PanelHeader } from './PanelHeader';
import { PanelFooter } from './PanelFooter';
import { ReviewFieldList, FieldInfo } from './ReviewFieldList';
import { DragController } from '../interaction/DragController';
import { ResizeController } from '../interaction/ResizeController';
import { SessionStateStore, ReviewPanelState } from '../state/SessionStateStore';
import { FrameworkEventAdapter } from '../core/FrameworkEventAdapter';

export interface ReviewPanelProps {
  fields: FieldInfo[];
  answers: Record<string, string>;
  vaultKeys?: Record<string, string | null>;
  contentGenerationAllowed?: boolean;
  onConfirm: (selectedAnswers: Record<string, string>) => void;
  onCancel: () => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ fields, answers, vaultKeys = {}, contentGenerationAllowed = false, onConfirm, onCancel }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [panelState, setPanelState] = useState<ReviewPanelState>({
    mode: 'auto',
    width: 460,
    height: 500,
    snapState: 'custom',
    selectedFieldIds: [],
    draftValues: {},
    isOpen: true
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [draftingState, setDraftingState] = useState<Record<string, 'idle' | 'drafting' | 'done'>>({});

  useEffect(() => {
    SessionStateStore.load().then(state => {
      setPanelState(s => ({ ...s, ...state, isOpen: true }));
      setIsLoaded(true);
    });
  }, []);

  const saveState = (updates: Partial<ReviewPanelState>) => {
    setPanelState(prev => {
      const next = { ...prev, ...updates };
      SessionStateStore.save(next);
      return next;
    });
  };

  const displayFields = fields.filter(f => answers[f.identifier] || vaultKeys[f.identifier] || f.tagName === 'textarea' || f.type === 'text' || f.isSensitive);

  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    displayFields.forEach(f => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      initial[f.identifier] = !isMissingVault && !f.isSensitive;
    });
    return initial;
  });

  const handleToggle = (identifier: string) => {
    setCheckedFields(prev => ({ ...prev, [identifier]: !prev[identifier] }));
  };

  const handleSelectAll = () => {
    const allSelected = displayFields.every(f => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      if (isMissingVault || f.isSensitive) return true;
      return checkedFields[f.identifier];
    });

    const nextState: Record<string, boolean> = {};
    displayFields.forEach(f => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      if (isMissingVault || f.isSensitive) {
        nextState[f.identifier] = false;
      } else {
        nextState[f.identifier] = !allSelected;
      }
    });
    setCheckedFields(nextState);
  };

  const requestDraft = async (f: FieldInfo) => {
    setDraftingState(prev => ({ ...prev, [f.identifier]: 'drafting' }));
    try {
      const response = await new Promise<{ success: boolean; data?: { draft: string } }>(resolve => {
        chrome.runtime.sendMessage({ action: 'DRAFT_ANSWER', question: f.label }, resolve);
      });

      if (response.success && response.data?.draft) {
        saveState({ draftValues: { ...panelState.draftValues, [f.identifier]: response.data.draft } });
        setDraftingState(prev => ({ ...prev, [f.identifier]: 'done' }));
        setCheckedFields(prev => ({ ...prev, [f.identifier]: true }));
      } else {
        setDraftingState(prev => ({ ...prev, [f.identifier]: 'idle' }));
      }
    } catch (err) {
      setDraftingState(prev => ({ ...prev, [f.identifier]: 'idle' }));
    }
  };

  const handleConfirm = () => {
    const selectedAnswers: Record<string, string> = {};
    for (const [identifier, isChecked] of Object.entries(checkedFields)) {
      if (isChecked) {
        if (panelState.draftValues[identifier]) {
          selectedAnswers[identifier] = panelState.draftValues[identifier] as string;
        } else if (answers[identifier]) {
          selectedAnswers[identifier] = answers[identifier];
        }
      }
    }
    
    onConfirm(selectedAnswers);
  };

  // Drag and Resize Instances
  const dragController = React.useMemo(() => new DragController((x, y) => {
    saveState({ x, y, mode: 'custom' as any });
  }), []);

  const resizeController = React.useMemo(() => new ResizeController((height) => {
    saveState({ height, snapState: 'custom' });
  }), []);

  if (!isLoaded) return null;

  const stylePosition = panelState.mode === 'dock-right' 
    ? { top: '20px', right: '20px', bottom: '20px' } 
    : panelState.mode === 'dock-left' 
      ? { top: '20px', left: '20px', bottom: '20px' }
      : { top: panelState.y || 20, left: panelState.x || (window.innerWidth - panelState.width - 20) };

  const selectedCount = Object.values(checkedFields).filter(Boolean).length;
  const totalSelectable = displayFields.filter(f => !(vaultKeys[f.identifier] && !answers[f.identifier]) && !f.isSensitive).length;

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'fixed',
        width: `${panelState.width}px`,
        height: panelState.mode.includes('dock') ? 'auto' : `${panelState.height}px`,
        ...stylePosition,
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2147483647,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#111827'
      }}
    >
      <PanelHeader 
        onDragStart={(e) => dragController.startDrag(e, panelRef, panelRef.current?.getBoundingClientRect().left || 0, panelRef.current?.getBoundingClientRect().top || 0)}
        onClose={onCancel}
        mode={panelState.mode}
        setMode={(m) => saveState({ mode: m })}
      />
      
      <div style={{ padding: '8px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Fits viewport
          </div>
          <div style={{ color: '#9ca3af' }}>•</div>
          <div style={{ color: '#6b7280' }}>Scrollable content</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#6b7280' }}>{selectedCount} of {totalSelectable} selected</span>
          <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', padding: 0 }}>Select all</button>
        </div>
      </div>

      <div style={{ padding: '0 20px', overflowY: 'auto', flex: 1 }}>
        <ReviewFieldList 
          displayFields={displayFields}
          answers={answers}
          vaultKeys={vaultKeys}
          checkedFields={checkedFields}
          draftedAnswers={panelState.draftValues as Record<string, string>}
          draftingState={draftingState}
          contentGenerationAllowed={contentGenerationAllowed}
          onToggle={handleToggle}
          onDraftRequest={requestDraft}
          onDraftChange={(id, val) => saveState({ draftValues: { ...panelState.draftValues, [id]: val } })}
        />
      </div>

      <PanelFooter 
        onConfirm={handleConfirm}
        onCancel={onCancel}
        selectedCount={selectedCount}
        onResizeStart={(e) => resizeController.startResize(e, panelRef, panelRef.current?.getBoundingClientRect().height || 500)}
      />
    </div>
  );
};
