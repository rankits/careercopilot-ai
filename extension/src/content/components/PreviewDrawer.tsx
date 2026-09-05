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

export const PreviewDrawer: React.FC<PreviewDrawerProps> = ({
  fields,
  answers,
  vaultKeys = {},
  contentGenerationAllowed = false,
  onConfirm,
  onCancel,
}) => {
  const displayFields = fields.filter(
    (f) =>
      answers[f.identifier] ||
      vaultKeys[f.identifier] ||
      f.tagName === 'textarea' ||
      f.type === 'text' ||
      f.isSensitive,
  );

  useEffect(() => {
    const sensitiveCount = displayFields.filter((f) => f.isSensitive).length;
    if (sensitiveCount > 0) {
      chrome.runtime.sendMessage({
        action: 'TRACK_EVENT',
        event: 'extension_sensitive_field_shown',
        properties: { count: sensitiveCount },
      });
    }
  }, [displayFields]);

  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    displayFields.forEach((f) => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      initial[f.identifier] = !isMissingVault && !f.isSensitive;
    });
    return initial;
  });

  const [draftedAnswers, setDraftedAnswers] = useState<Record<string, string>>({});
  const [draftingState, setDraftingState] = useState<Record<string, 'idle' | 'drafting' | 'done'>>(
    {},
  );

  const handleToggle = (identifier: string) => {
    setCheckedFields((prev) => ({ ...prev, [identifier]: !prev[identifier] }));
  };

  const handleSelectAll = () => {
    const allSelected = displayFields.every((f) => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      if (isMissingVault || f.isSensitive) return true; // ignore unselectable in "all" logic
      return checkedFields[f.identifier];
    });

    const nextState: Record<string, boolean> = {};
    displayFields.forEach((f) => {
      const isMissingVault = vaultKeys[f.identifier] && !answers[f.identifier];
      if (isMissingVault || f.isSensitive) {
        nextState[f.identifier] = false;
      } else {
        nextState[f.identifier] = !allSelected;
      }
    });
    setCheckedFields(nextState);
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
    setDraftingState((prev) => ({ ...prev, [f.identifier]: 'drafting' }));
    try {
      const response = await new Promise<{ success: boolean; data?: { draft: string } }>(
        (resolve) => {
          chrome.runtime.sendMessage({ action: 'DRAFT_ANSWER', question: f.label }, resolve);
        },
      );

      if (response.success && response.data?.draft) {
        setDraftedAnswers((prev) => ({ ...prev, [f.identifier]: response.data!.draft }));
        setDraftingState((prev) => ({ ...prev, [f.identifier]: 'done' }));
        setCheckedFields((prev) => ({ ...prev, [f.identifier]: true })); // Auto check after drafting
      } else {
        setDraftingState((prev) => ({ ...prev, [f.identifier]: 'idle' }));
      }
    } catch (err) {
      console.error('Draft generation failed', err);
      setDraftingState((prev) => ({ ...prev, [f.identifier]: 'idle' }));
    }
  };

  const selectedCount = Object.values(checkedFields).filter(Boolean).length;
  const totalSelectable = displayFields.filter(
    (f) => !(vaultKeys[f.identifier] && !answers[f.identifier]) && !f.isSensitive,
  ).length;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '460px',
        maxHeight: '90vh',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2147483647,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#111827',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af">
            <path
              d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM16 6a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 11-4 0 2 2 0 014 0zM16 18a2 2 0 11-4 0 2 2 0 014 0zM24 6a2 2 0 11-4 0 2 2 0 014 0zM24 12a2 2 0 11-4 0 2 2 0 014 0zM24 18a2 2 0 11-4 0 2 2 0 014 0z"
              transform="translate(-2, 0)"
            />
          </svg>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
              Review before filling
            </h3>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Draggable • Resizable • Auto-positioned
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}
          >
            <button
              style={{
                border: 'none',
                background: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#2563eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              Auto
            </button>
            <button
              style={{
                border: 'none',
                background: 'transparent',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Left
            </button>
            <button
              style={{
                border: 'none',
                background: 'transparent',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Right
            </button>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Sub-header status bar */}
      <div
        style={{
          padding: '8px 20px',
          borderTop: '1px solid #f3f4f6',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#10b981',
              fontWeight: 500,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Fits viewport
          </div>
          <div style={{ color: '#9ca3af' }}>•</div>
          <div style={{ color: '#6b7280' }}>Scrollable content</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#6b7280' }}>
            {selectedCount} of {totalSelectable} selected
          </span>
          <button
            onClick={handleSelectAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Select all
          </button>
        </div>
      </div>

      {/* Fields List */}
      <div style={{ padding: '0 20px', overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
        {displayFields.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px', padding: '20px 0' }}>No fields mapped.</p>
        ) : (
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

              // Determine layout (single line vs multi-line)
              const isTextarea =
                f.tagName === 'textarea' ||
                hasDraft ||
                (!answer && !isMissingVault && !f.isSensitive && f.type === 'text');

              return (
                <div
                  key={f.identifier}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: i === displayFields.length - 1 ? 'none' : '1px solid #f3f4f6',
                    opacity: f.isSensitive ? 0.6 : 1,
                  }}
                >
                  {/* Custom Checkbox */}
                  <div style={{ paddingTop: '8px', paddingRight: '12px' }}>
                    <div
                      onClick={() =>
                        !f.isSensitive && !isMissingVault && handleToggle(f.identifier)
                      }
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: isChecked ? '#0a66c2' : 'white',
                        border: isChecked ? '1px solid #0a66c2' : '1px solid #d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: f.isSensitive || isMissingVault ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isChecked && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: isTextarea ? 'column' : 'row',
                      alignItems: isTextarea ? 'flex-start' : 'center',
                      gap: isTextarea ? '8px' : '16px',
                      minWidth: 0,
                      paddingTop: isTextarea ? '8px' : '0',
                    }}
                  >
                    {/* Label */}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#111827',
                        width: isTextarea ? '100%' : '140px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.label}
                    </div>

                    {/* Value Area */}
                    <div
                      style={{
                        flex: 1,
                        width: '100%',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'flex-start',
                      }}
                    >
                      {hasDraft ? (
                        <textarea
                          value={draftedAnswers[f.identifier]}
                          onChange={(e) =>
                            setDraftedAnswers((prev) => ({
                              ...prev,
                              [f.identifier]: e.target.value,
                            }))
                          }
                          style={{
                            flex: 1,
                            minHeight: '60px',
                            fontSize: '13px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            color: '#374151',
                            background: '#f9fafb',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            fontSize: '13px',
                            color: textColor,
                            backgroundColor: bg,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${borderColor}`,
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {valueDisplay || (
                            <span style={{ color: '#9ca3af' }}>
                              {isTextarea ? 'Will be drafted...' : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons (Draft with AI) */}
                      {!answer &&
                        !isMissingVault &&
                        !f.isSensitive &&
                        contentGenerationAllowed &&
                        (isTextarea || hasDraft) && (
                          <button
                            onClick={() => requestDraft(f)}
                            disabled={isDrafting}
                            style={{
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#0a66c2',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              cursor: isDrafting ? 'wait' : 'pointer',
                              height: '32px',
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                            </svg>
                            {isDrafting ? 'Drafting...' : 'Draft with AI'}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Your data stays private
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{
              padding: '8px 24px',
              backgroundColor: selectedCount > 0 ? '#0a66c2' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm Fill
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 24px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      {/* Bottom right resize handle decoration */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '12px',
          height: '12px',
          opacity: 0.2,
        }}
      >
        <svg viewBox="0 0 12 12">
          <path
            d="M10,0 L12,0 L12,12 L0,12 L0,10 L10,10 L10,0 Z M5,5 L7,5 L7,12 L5,12 L5,5 Z M0,5 L2,5 L2,12 L0,12 L0,5 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};
