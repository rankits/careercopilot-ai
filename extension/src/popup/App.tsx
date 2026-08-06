import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const App: React.FC = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if we already have a token
    chrome.storage.local.get(['accessToken'], (result) => {
      if (result.accessToken) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairingCode.length !== 6) {
      setError('Pairing code must be 6 digits.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/extension/pair/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || 'Failed to pair device.');
      }

      const { accessToken, refreshToken, expiresInSeconds } = json.data;

      await chrome.storage.local.set({ 
        accessToken, 
        refreshToken, 
        tokenExpiry: Date.now() + (expiresInSeconds * 1000)
      });
      
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    chrome.storage.local.remove(['accessToken', 'refreshToken', 'tokenExpiry'], () => {
      setIsAuthenticated(false);
    });
  };

  const [isFilling, setIsFilling] = useState(false);
  const [fillResult, setFillResult] = useState<string | null>(null);

  const handleAutoFill = async (mode: 'AUTOFILL_FORM' | 'PREVIEW_AUTOFILL') => {
    setIsFilling(true);
    setFillResult(null);
    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab found.");

      // 2. Request form fields from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_FORM_FIELDS' });
      if (!response || !response.fields) {
        throw new Error("Could not extract form fields. Is this a valid page?");
      }

      // 3. Send to backend to get AI answers
      const { accessToken } = await chrome.storage.local.get(['accessToken']);
      const res = await fetch(`${API_URL}/extension/autofill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          url: tab.url,
          fields: response.fields
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to generate answers from backend.');

      // 4. Send answers back to content script
      await chrome.tabs.sendMessage(tab.id, { 
        action: mode,
        fields: response.fields,
        answers: json.data.answers 
      });

      setFillResult(mode === 'PREVIEW_AUTOFILL' ? "Check the page for your preview!" : "Successfully auto-filled the form!");
    } catch (err: any) {
      setFillResult(`Error: ${err.message}`);
    } finally {
      setIsFilling(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div style={{ padding: '16px', fontFamily: 'sans-serif', width: '300px' }}>
        <h2>Career Copilot</h2>
        <p style={{ color: 'green' }}>✓ Connected to web app</p>
        
        <div style={{ marginTop: '20px', marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Auto-Fill Form</h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            Extracts fields from the current page and fills them using your profile.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => handleAutoFill('AUTOFILL_FORM')}
              disabled={isFilling}
              style={{ 
                width: '100%',
                padding: '10px', 
                background: isFilling ? '#9e9e9e' : '#4caf50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: isFilling ? 'wait' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isFilling ? 'Processing...' : 'Auto-Fill (Immediate)'}
            </button>
            <button 
              onClick={() => handleAutoFill('PREVIEW_AUTOFILL')}
              disabled={isFilling}
              style={{ 
                width: '100%',
                padding: '10px', 
                background: isFilling ? '#9e9e9e' : '#1976d2', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: isFilling ? 'wait' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isFilling ? 'Processing...' : 'Review & Fill'}
            </button>
          </div>
          {fillResult && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: fillResult.startsWith('Error') ? 'red' : 'green' }}>
              {fillResult}
            </div>
          )}
        </div>

        <button 
          onClick={handleDisconnect}
          style={{ 
            width: '100%',
            padding: '8px 12px', 
            background: 'transparent', 
            color: '#f44336', 
            border: '1px solid #f44336', 
            borderRadius: '4px',
            cursor: 'pointer' 
          }}
        >
          Disconnect Account
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', width: '300px' }}>
      <h2>Connect Extension</h2>
      <p style={{ fontSize: '13px', color: '#555' }}>
        Enter the 6-digit pairing code from the web app settings to connect this browser.
      </p>
      <form onSubmit={handlePair} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input 
          type="text" 
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="000000"
          style={{ 
            padding: '10px', 
            fontSize: '18px', 
            letterSpacing: '4px', 
            textAlign: 'center',
            textTransform: 'uppercase' 
          }}
          disabled={isLoading}
        />
        {error && <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>}
        <button 
          type="submit" 
          disabled={isLoading || pairingCode.length !== 6}
          style={{ 
            padding: '10px', 
            background: isLoading || pairingCode.length !== 6 ? '#ccc' : '#1976d2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isLoading || pairingCode.length !== 6 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
};

export default App;
