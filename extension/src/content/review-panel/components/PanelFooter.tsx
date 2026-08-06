import React from 'react';

interface PanelFooterProps {
  onConfirm: () => void;
  onCancel: () => void;
  selectedCount: number;
  onResizeStart: (e: React.PointerEvent) => void;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({ onConfirm, onCancel, selectedCount, onResizeStart }) => {
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderRadius: '0 0 12px 12px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        Your data stays private
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={onConfirm}
          disabled={selectedCount === 0}
          style={{ 
            padding: '8px 24px', 
            backgroundColor: selectedCount > 0 ? '#0a66c2' : '#9ca3af', 
            color: 'white', 
            border: 'none', 
            borderRadius: '24px', 
            fontWeight: 600, 
            fontSize: '14px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed' 
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
            cursor: 'pointer' 
          }}
        >
          Cancel
        </button>
      </div>

      {/* Resize Handle */}
      <div 
        onPointerDown={onResizeStart}
        style={{ 
          position: 'absolute', 
          bottom: '2px', 
          right: '2px', 
          width: '16px', 
          height: '16px', 
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '4px',
          opacity: 0.3
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M10,0 L12,0 L12,12 L0,12 L0,10 L10,10 L10,0 Z M5,5 L7,5 L7,12 L5,12 L5,5 Z M0,5 L2,5 L2,12 L0,12 L0,5 Z" fill="currentColor"/></svg>
      </div>
    </div>
  );
};
