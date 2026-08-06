import React from 'react';

export interface FieldInfo {
  identifier: string;
  tagName: string;
  type: string;
  name?: string;
  label: string;
  isSensitive?: boolean;
}

interface ReviewFieldListProps {
  displayFields: FieldInfo[];
  answers: Record<string, string>;
  vaultKeys: Record<string, string | null>;
  checkedFields: Record<string, boolean>;
  draftedAnswers: Record<string, string>;
  draftingState: Record<string, 'idle' | 'drafting' | 'done'>;
  contentGenerationAllowed: boolean;
  onToggle: (identifier: string) => void;
  onDraftRequest: (f: FieldInfo) => void;
  onDraftChange: (identifier: string, val: string) => void;
}

export const ReviewFieldList: React.FC<ReviewFieldListProps> = ({
  displayFields, answers, vaultKeys, checkedFields, draftedAnswers, draftingState, contentGenerationAllowed, onToggle, onDraftRequest, onDraftChange
}) => {
  if (displayFields.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px', padding: '20px 0' }}>No fields mapped.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {displayFields.map((f, i) => {
        const vaultKey = vaultKeys[f.identifier];
        const answer = answers[f.identifier];
        const isMissingVault = vaultKey && !answer;
        const isChecked = !!checkedFields[f.identifier];
        
        const isDrafting = draftingState[f.identifier] === 'drafting';
        const hasDraft = !!draftedAnswers[f.identifier];

        let valueDisplay = answer;
        let bg = '#ffffff';
        let borderColor = '#e5e7eb';
        let textColor = '#374151';

        if (f.isSensitive) {
          valueDisplay = 'Answer this yourself';
          bg = '#f9fafb';
          borderColor = '#e5e7eb';
          textColor = '#9ca3af';
        } else if (answer === '__RESUME__') {
          valueDisplay = 'Attach your Resume';
          bg = '#eff6ff';
          borderColor = '#bfdbfe';
          textColor = '#1d4ed8';
        } else if (isMissingVault) {
          valueDisplay = 'Not answered yet — complete in Setup';
          bg = '#fff7ed';
          borderColor = '#fed7aa';
          textColor = '#c2410c';
        }

        const isTextarea = f.tagName === 'textarea' || hasDraft || (!answer && !isMissingVault && !f.isSensitive && f.type === 'text');

        return (
          <div key={f.identifier} style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 0', borderBottom: i === displayFields.length - 1 ? 'none' : '1px solid #f3f4f6', opacity: f.isSensitive ? 0.6 : 1 }}>
            <div style={{ paddingTop: '8px', paddingRight: '12px' }}>
              <div 
                onClick={() => !f.isSensitive && !isMissingVault && onToggle(f.identifier)}
                style={{ 
                  width: '16px', height: '16px', borderRadius: '4px', 
                  background: isChecked ? '#0a66c2' : 'white', 
                  border: isChecked ? '1px solid #0a66c2' : '1px solid #d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: f.isSensitive || isMissingVault ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: isTextarea ? 'column' : 'row', alignItems: isTextarea ? 'flex-start' : 'center', gap: isTextarea ? '8px' : '16px', minWidth: 0, paddingTop: isTextarea ? '8px' : '0' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', width: isTextarea ? '100%' : '140px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.label}
              </div>

              <div style={{ flex: 1, width: '100%', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                {hasDraft ? (
                  <textarea
                    value={draftedAnswers[f.identifier]}
                    onChange={(e) => onDraftChange(f.identifier, e.target.value)}
                    style={{ flex: 1, minHeight: '60px', fontSize: '13px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontFamily: 'inherit', resize: 'vertical', color: '#374151', background: '#f9fafb' }}
                  />
                ) : (
                  <div style={{ flex: 1, fontSize: '13px', color: textColor, backgroundColor: bg, padding: '6px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, minHeight: '32px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {valueDisplay || (
                      <span style={{ color: '#9ca3af' }}>{isTextarea ? 'Will be drafted...' : ''}</span>
                    )}
                  </div>
                )}

                {(!answer && !isMissingVault && !f.isSensitive && contentGenerationAllowed && (isTextarea || hasDraft)) && (
                  <button 
                    onClick={() => onDraftRequest(f)}
                    disabled={isDrafting}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 500, color: '#0a66c2', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: isDrafting ? 'wait' : 'pointer', height: '32px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                    {isDrafting ? 'Drafting...' : 'Draft with AI'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
