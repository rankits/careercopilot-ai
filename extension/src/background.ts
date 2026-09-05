import { startPolling } from './orchestrator';

console.log('Career Copilot Background Service Worker initialized.');

// Start polling the backend for QUEUED jobs when the extension loads
startPolling();

const API_URL = 'http://localhost:3000/api/v1';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'FETCH_RESUME_BLOB') {
    (async () => {
      try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) {
          sendResponse({ success: false, error: 'No access token' });
          return;
        }

        const res = await fetch(`${API_URL}/extension/resume-blob`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Failed to fetch blob: ${res.statusText}` });
          return;
        }

        const mimeType = res.headers.get('Content-Type') || 'application/pdf';
        const disposition = res.headers.get('Content-Disposition') || '';
        let filename = 'resume.pdf';
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }

        const arrayBuffer = await res.arrayBuffer();

        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const data = btoa(binary);

        sendResponse({ success: true, data, mimeType, filename });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'DRAFT_ANSWER') {
    (async () => {
      try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) throw new Error('No access token');

        const res = await fetch(`${API_URL}/extension/draft-answer`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question: request.question }),
        });

        if (!res.ok) {
          throw new Error(`Failed to draft answer: ${res.statusText}`);
        }

        const data = await res.json();
        sendResponse({ success: true, data: data.data });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'FETCH_VAULT_ANSWERS') {
    (async () => {
      try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) {
          sendResponse({ success: false, error: 'No access token' });
          return;
        }

        const res = await fetch(`${API_URL}/extension/answers`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          sendResponse({ success: false, error: `Failed to fetch answers: ${res.statusText}` });
          return;
        }

        const data = await res.json();
        sendResponse({ success: true, data: data.data });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (request.action === 'TRACK_EVENT') {
    // In a real implementation this would batch and send to the backend analytics endpoint
    console.log(`[Analytics] Tracked event: ${request.event}`, request.properties);
    sendResponse({ success: true });
    return true;
  }
});
