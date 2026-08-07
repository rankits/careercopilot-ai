import React from 'react';

interface PanelHeaderProps {
  onDragStart: (e: React.PointerEvent) => void;
  onClose: () => void;
  mode: string;
  setMode: (mode: 'auto' | 'dock-left' | 'dock-right' | 'pin') => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ onDragStart, onClose, mode, setMode }) => {
  return (
    <div 
      onPointerDown={onDragStart}
      style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        background: '#ffffff',
        borderRadius: '12px 12px 0 0',
        borderBottom: '1px solid #f3f4f6'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Drag Handle Icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af"><path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM16 6a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 11-4 0 2 2 0 014 0zM16 18a2 2 0 11-4 0 2 2 0 014 0zM24 6a2 2 0 11-4 0 2 2 0 014 0zM24 12a2 2 0 11-4 0 2 2 0 014 0zM24 18a2 2 0 11-4 0 2 2 0 014 0z" transform="translate(-2, 0)"/></svg>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Review before filling</h3>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Draggable • Resizable • Auto-positioned</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onPointerDown={(e) => e.stopPropagation()}>
        {/* Position Controls */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
          <button 
            onClick={() => setMode('auto')}
            style={{ border: 'none', background: mode === 'auto' ? 'white' : 'transparent', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, color: mode === 'auto' ? '#2563eb' : '#6b7280', boxShadow: mode === 'auto' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
          >Auto</button>
          <button 
            onClick={() => setMode('dock-left')}
            style={{ border: 'none', background: mode === 'dock-left' ? 'white' : 'transparent', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, color: mode === 'dock-left' ? '#2563eb' : '#6b7280', boxShadow: mode === 'dock-left' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
          >Left</button>
          <button 
            onClick={() => setMode('dock-right')}
            style={{ border: 'none', background: mode === 'dock-right' ? 'white' : 'transparent', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, color: mode === 'dock-right' ? '#2563eb' : '#6b7280', boxShadow: mode === 'dock-right' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
          >Right</button>
        </div>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
};
