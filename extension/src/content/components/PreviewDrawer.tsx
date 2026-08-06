import React, { useState, useEffect } from 'react';

export interface FieldInfo {
  identifier: string;
  tagName: string;
  type: string;
  name?: string;
  label: string;
  isSensitive?: boolean;
}

export interface PreviewDrawerProps {
  fields: FieldInfo[];
  answers: Record<string, string>;
  vaultKeys?: Record<string, string | null>;
  contentGenerationAllowed?: boolean;
  onConfirm: (selectedAnswers: Record<string, string>) => void;
  onCancel: () => void;
}

export const PreviewDrawer: React.FC<PreviewDrawerProps> = ({ fields, answers, vaultKeys = {}, contentGenerationAllowed = false, onConfirm, onCancel }) => {
  // Consider fields that have proposed answers OR are mapped to a vault key (even if missing) OR are open-ended text/textarea fields OR are sensitive
  const displayFields = fields.filter(f => 
    answers[f.identifier] || 
    vaultKeys[f.identifier] || 
    f.tagName === 'textarea' || 
    f.type === 'text' ||
    f.isSensitive
  );
  
  useEffect(() => {
    const sensitiveCount = displayFields.filter(f => f.isSensitive).length;
    if (sensitiveCount > 0) {
      chrome.runtime.sendMessage({ 
        action: 'TRACK_EVENT', 
        event: 'extension_sensitive_field_shown',
        properties: { count: sensitiveCount }
      });
    }
  }, [displayFields]);

  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    displayFields.forEach(f => {
      // If it has a vault key but no answer, it's missing, so uncheck by default
      // Also uncheck sensitive fields
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      initial[f.identifier] = !isMissingVault && !f.isSensitive;
    });
    return initial;
  });

  const [draftedAnswers, setDraftedAnswers] = useState<Record<string, string>>({});
  const [draftingState, setDraftingState] = useState<Record<string, 'idle' | 'drafting' | 'done'>>({});

  const handleToggle = (identifier: string) => {
    setCheckedFields(prev => ({ ...prev, [identifier]: !prev[identifier] }));
  };

  const handleConfirm = () => {
    const selectedAnswers: Record<string, string> = {};
    for (const [identifier, isChecked] of Object.entries(checkedFields)) {
      if (isChecked) {
        if (draftedAnswers[identifier]) {
          selectedAnswers[identifier] = draftedAnswers[identifier];
        } else if (answers[identifier]) {
          selectedAnswers[identifier] = answers[identifier];
        }
      }
    }
    onConfirm(selectedAnswers);
  };

  const requestDraft = async (f: FieldInfo) => {
    setDraftingState(prev => ({ ...prev, [f.identifier]: 'drafting' }));
    try {
      const response = await new Promise<{ success: boolean; data?: { draft: string } }>(resolve => {
        chrome.runtime.sendMessage({ 
          action: 'DRAFT_ANSWER', 
          question: f.label 
        }, resolve);
      });

      if (response.success && response.data?.draft) {
        setDraftedAnswers(prev => ({ ...prev, [f.identifier]: response.data!.draft }));
        setDraftingState(prev => ({ ...prev, [f.identifier]: 'done' }));
        // Do NOT auto-check drafted answers
        setCheckedFields(prev => ({ ...prev, [f.identifier]: false }));
      } else {
        setDraftingState(prev => ({ ...prev, [f.identifier]: 'idle' }));
      }
    } catch (err) {
      console.error('Draft generation failed', err);
      setDraftingState(prev => ({ ...prev, [f.identifier]: 'idle' }));
    }
  };

  const hasSelections = Object.values(checkedFields).some(v => v);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '320px',
      maxHeight: '90vh',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2147483647,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#333'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Review before filling</h3>
        <button 
          onClick={onCancel}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
        >
          &times;
        </button>
      </div>

      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {displayFields.length === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>No fields mapped.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayFields.map(f => {
              const vaultKey = vaultKeys[f.identifier];
              const answer = answers[f.identifier];
              const isMissingVault = vaultKey && !answer;

              let answerDisplay = answer;
              let styleBg = '#f9f9f9';
              let styleBorder = '#eee';
              let styleColor = '#666';

              if (f.isSensitive) {
                answerDisplay = 'Answer this yourself';
                styleBg = '#f5f5f5';
                styleBorder = '#e0e0e0';
                styleColor = '#9e9e9e';
              } else if (answer === '__RESUME__') {
                answerDisplay = '📄 Attach your Resume';
                styleBg = '#e3f2fd';
                styleBorder = '#90caf9';
                styleColor = '#1565c0';
              } else if (isMissingVault) {
                answerDisplay = 'Not answered yet — complete in Setup';
                styleBg = '#fff3e0';
                styleBorder = '#ffcc80';
                styleColor = '#e65100';
              }

              const isDrafting = draftingState[f.identifier] === 'drafting';
              const hasDraft = !!draftedAnswers[f.identifier];
              if (hasDraft) {
                return (
                  <label key={f.identifier} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!checkedFields[f.identifier]}
                      onChange={() => handleToggle(f.identifier)}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.label}
                      </div>
                      <textarea
                        value={draftedAnswers[f.identifier]}
                        onChange={(e) => setDraftedAnswers(prev => ({ ...prev, [f.identifier]: e.target.value }))}
                        style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '6px', borderRadius: '4px', border: '1px solid #1976d2', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      <div style={{ fontSize: '10px', color: '#1976d2', marginTop: '2px', fontStyle: 'italic' }}>
                        Suggestion — review and edit before using
                      </div>
                    </div>
                  </label>
                );
              }

              if (!answer && !isMissingVault && !f.isSensitive) {
                // No answer, no vault key. Show Draft UI if open-ended (e.g. text/textarea)
                if (f.tagName !== 'textarea' && f.type !== 'text') return null;

                return (
                  <div key={f.identifier} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', opacity: 0.8 }}>
                    <input type="checkbox" disabled style={{ marginTop: '4px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.label}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {contentGenerationAllowed ? (
                          <button 
                            onClick={() => requestDraft(f)}
                            disabled={isDrafting}
                            style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #1976d2', backgroundColor: '#e3f2fd', color: '#1565c0', cursor: isDrafting ? 'wait' : 'pointer' }}
                          >
                            {isDrafting ? 'Drafting...' : '✨ Draft with AI'}
                          </button>
                        ) : (
                          <a href="#" style={{ fontSize: '12px', color: '#e65100', textDecoration: 'underline' }}>
                            Grant AI assistance in Setup to use this
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <label 
                  key={f.identifier} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    cursor: f.isSensitive ? 'default' : (isMissingVault ? 'not-allowed' : 'pointer'),
                    opacity: f.isSensitive ? 0.7 : 1
                  }}
                >
                  {!f.isSensitive && (
                    <input 
                      type="checkbox" 
                      checked={checkedFields[f.identifier] || false}
                      onChange={() => handleToggle(f.identifier)}
                      disabled={!!isMissingVault}
                      style={{ marginTop: '4px' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: '13px', color: styleColor, wordBreak: 'break-word', backgroundColor: styleBg, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${styleBorder}` }}>
                      {answerDisplay}
                      {vaultKey && !isMissingVault && (
                        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', fontStyle: 'italic' }}>
                          ✓ From your saved answers
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
        <button 
          onClick={handleConfirm}
          disabled={!hasSelections}
          style={{ 
            flex: 1, 
            padding: '10px', 
            backgroundColor: hasSelections ? '#1976d2' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            fontWeight: 600, 
            cursor: hasSelections ? 'pointer' : 'not-allowed' 
          }}
        >
          Confirm fill
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '10px 16px', 
            backgroundColor: 'transparent', 
            color: '#666', 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
