import React, { useState, useEffect, useRef } from 'react';

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
        tokenExpiry: Date.now() + expiresInSeconds * 1000,
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
      setPairingCode(''); // Reset pairing code on disconnect
    });
  };

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    const newValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!newValue && value !== '') return;

    const currentCode = pairingCode.padEnd(6, ' ').split('');
    currentCode[index] = newValue.slice(-1) || ' ';

    const newCode = currentCode.join('').trim();
    setPairingCode(newCode);

    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pairingCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    if (pasted) {
      setPairingCode(pasted);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const [isFilling, setIsFilling] = useState(false);
  const [fillResult, setFillResult] = useState<string | null>(null);

  const handleAutoFill = async (mode: 'AUTOFILL_FORM' | 'PREVIEW_AUTOFILL') => {
    setIsFilling(true);
    setFillResult(null);
    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found.');

      // 2. Request form fields from content script
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_FORM_FIELDS' });
      } catch (err: any) {
        if (err.message.includes('Receiving end does not exist')) {
          throw new Error(
            "Content script not found. Please refresh the page and try again (or ensure you aren't on a restricted page).",
          );
        }
        throw err;
      }
      if (!response || !response.fields) {
        throw new Error('Could not extract form fields. Is this a valid page?');
      }

      // 3. Send to backend to get AI answers
      const { accessToken } = await chrome.storage.local.get(['accessToken']);
      const res = await fetch(`${API_URL}/extension/autofill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url: tab.url,
          fields: response.fields,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to generate answers from backend.');

      // 4. Send answers back to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: mode,
        fields: response.fields,
        answers: json.data.answers,
      });

      setFillResult(
        mode === 'PREVIEW_AUTOFILL'
          ? 'Check the page for your preview!'
          : 'Successfully auto-filled the form!',
      );
    } catch (err: any) {
      setFillResult(`Error: ${err.message}`);
    } finally {
      setIsFilling(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div
        style={{
          padding: '0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          width: '400px',
          background: 'white',
          borderRadius: '12px',
          boxSizing: 'border-box',
          color: '#111827',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/assets/logo/career-copilot-full-logo.svg"
              alt="Career Copilot"
              style={{ height: '24px' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4b5563' }}>
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
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
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
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Connection Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ color: '#10b981', fontWeight: 600, fontSize: '15px' }}>
                  Connected to web app
                </div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>
                  Your account is synced and ready.
                </div>
              </div>
            </div>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                background: 'white',
                color: '#3b82f6',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
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
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              View Profile
            </button>
          </div>

          {/* Main Action Area */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: '#e0e7ff',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                  <path d="M19 4l1 1-1 1M18.5 5h3"></path>
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Auto-Fill Form
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.4 }}>
                  Extracts fields from the current page and fills them using your profile.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => handleAutoFill('AUTOFILL_FORM')}
                disabled={isFilling}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isFilling ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isFilling ? 'wait' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    background: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                {isFilling ? 'Processing...' : 'Auto-Fill (Immediate)'}
              </button>

              <button
                onClick={() => handleAutoFill('PREVIEW_AUTOFILL')}
                disabled={isFilling}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isFilling ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isFilling ? 'wait' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {isFilling ? 'Processing...' : 'Review & Fill'}
              </button>
            </div>

            {fillResult && (
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  textAlign: 'center',
                  fontWeight: 500,
                  color: fillResult.startsWith('Error') ? '#ef4444' : '#16a34a',
                }}
              >
                {fillResult}
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            style={{
              width: '100%',
              padding: '12px',
              background: 'white',
              color: '#ef4444',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Disconnect Account
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f8fafc',
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            <img
              src="/assets/logo/career-copilot-full-logo.svg"
              alt=""
              style={{ height: '16px' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span>•</span>
            <span>v1.2.0</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Help
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '420px',
        background: 'white',
        borderRadius: '16px',
        boxSizing: 'border-box',
        color: '#111827',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <img
          src="/assets/logo/career-copilot-full-logo.svg"
          alt="Career Copilot"
          style={{ height: '28px' }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <button
          onClick={() => window.close()}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#4b5563',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 1L1 13M1 1L13 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Big Icon */}
        <div
          style={{
            background: '#e0e7ff',
            borderRadius: '16px',
            width: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              stroke="#1d4ed8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
          Connect Extension
        </h2>
        <p
          style={{
            margin: '0 0 32px 0',
            fontSize: '15px',
            color: '#4b5563',
            lineHeight: '1.5',
            maxWidth: '300px',
          }}
        >
          Enter the 6-digit pairing code from the web app settings to connect this browser.
        </p>

        <form
          onSubmit={handlePair}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* Input Grid */}
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
            onPaste={handlePaste}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={pairingCode[index] || ''}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '24px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid ' + (pairingCode[index] ? '#2563eb' : '#d1d5db'),
                  boxShadow: pairingCode[index] ? '0 0 0 1px #2563eb' : 'none',
                  outline: 'none',
                  color: '#111827',
                  background: 'white',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '-8px' }}>{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || pairingCode.length !== 6}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading || pairingCode.length !== 6 ? '#93c5fd' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: isLoading || pairingCode.length !== 6 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        {/* Divider Link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            marginTop: '32px',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.09009 9.00008C9.32519 8.33175 9.78924 7.76819 10.4001 7.40921C11.0111 7.05022 11.729 6.91899 12.4273 7.03879C13.1255 7.15858 13.7589 7.52161 14.2152 8.06361C14.6714 8.60561 14.9211 9.2916 14.9201 10.0001C14.9201 12.0001 11.9201 13.0001 11.9201 13.0001"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 17H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Where do I find the code?
          </a>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '40px',
          paddingTop: '16px',
          background: '#f9fafb',
          margin: '40px -24px -24px -24px',
          padding: '16px 24px',
          borderRadius: '0 0 16px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Secure connection
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          Powered by <strong style={{ color: '#2563eb' }}>Career Copilot</strong>
          <img
            src="/assets/logo/career-copilot-penguin.svg"
            alt=""
            style={{ width: '20px', height: '20px' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
