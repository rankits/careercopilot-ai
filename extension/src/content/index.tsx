import { mountReviewPanel } from './review-panel/ReviewPanelRoot';

console.log('Career Copilot Content Script initialized.');

const userOverrides = new Set<string>();

import { matchFieldToVaultKey } from '../autofill/vaultMatching';
import { FrameworkEventAdapter } from './review-panel/core/FrameworkEventAdapter';

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'EXTRACT_FORM_FIELDS') {
    const fields = extractFormFields();
    sendResponse({ fields });
  } else if (request.action === 'AUTOFILL_FORM') {
    fillFormFields(request.answers);
    sendResponse({ success: true });
  } else if (request.action === 'PREVIEW_AUTOFILL') {
    (async () => {
      let vaultData: Record<string, string> = {};
      let contentGenerationAllowed = false;
      try {
        const response = await new Promise<{ success: boolean; data?: { answers: Record<string, string>; contentGenerationAllowed: boolean } }>(resolve => {
          chrome.runtime.sendMessage({ action: 'FETCH_VAULT_ANSWERS' }, resolve);
        });
        if (response.success && response.data) {
          vaultData = response.data.answers;
          contentGenerationAllowed = response.data.contentGenerationAllowed;
        }
      } catch (err) {
        console.error('Failed to fetch vault answers', err);
      }

      const vaultKeys: Record<string, string | null> = {};
      const augmentedAnswers = { ...request.answers };

      for (const field of request.fields) {
        const matchedKey = matchFieldToVaultKey(field);
        if (matchedKey) {
          vaultKeys[field.identifier] = matchedKey;
          if (vaultData[matchedKey]) {
            // Populate the preview with the vault answer (overrides AI answer if any)
            augmentedAnswers[field.identifier] = vaultData[matchedKey];
          } else {
            // Missing vault answer, remove any AI hallucinated answer so the user goes to Setup
            delete augmentedAnswers[field.identifier];
          }
        }
      }

      mountReviewPanel(request.fields, augmentedAnswers, vaultKeys, contentGenerationAllowed);
      sendResponse({ success: true });
    })();
    return true; // Keep the channel open for the async response
  }
  return true; // Keep the message channel open for asynchronous responses if needed
});

// mount logic moved to ReviewPanelRoot.tsx

function trackUserEdit(identifier: string) {
  userOverrides.add(identifier);
}

function getFieldLabel(el: HTMLElement): string {
  // Try to find a <label> that specifically points to this element
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }

  // Try to find a wrapping <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    // Remove the text of the input itself if it's inside the label
    let text = parentLabel.textContent;
    if (el.textContent) {
      text = text.replace(el.textContent, '');
    }
    return text.trim();
  }

  // Fallback to placeholder, name, or aria-label
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('name') ||
    'Unknown Field'
  );
}

function isSensitiveField(name: string, label: string): boolean {
  const combined = `${name || ''} ${label || ''}`.toLowerCase();
  
  // Based on AA-025 PROHIBITED/SENSITIVE taxonomy (EEOC, demographic, etc.)
  const sensitivePatterns = [
    /\b(race|ethnicity)\b/i,
    /\b(gender|sex|pronouns)\b/i,
    /\bveteran( status)?\b/i,
    /\bdisability\b/i,
    /\b(hispanic|latino)\b/i,
    /\bsexual orientation\b/i,
    /\b(marital status)\b/i,
    /\b(religion|religious)\b/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(combined));
}

function extractFormFields() {
  const inputs = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLInputElement[];
  
  const fields = inputs
    .filter(el => {
      const type = el.getAttribute('type');
      // Ignore hidden, submit, button, etc. (Allow file)
      return !['hidden', 'submit', 'button', 'image', 'reset'].includes(type || '');
    })
    .map(el => {
      // Generate a unique selector or use an existing id/name to identify this field later
      const identifier = el.id || el.name || generateUniqueSelector(el);
      
      // Store our generated identifier on the element for easy retrieval during autofill
      el.setAttribute('data-career-copilot-id', identifier);

      const name = el.name || '';
      const label = getFieldLabel(el);
      const isSensitive = isSensitiveField(name, label);

      return {
        identifier,
        tagName: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || 'text',
        name,
        label,
        currentValue: el.value,
        isSensitive,
      };
    });

  return fields;
}

export async function fillFormFields(answers: Record<string, string>) {
  for (const [identifier, value] of Object.entries(answers)) {
    // Do not overwrite if the user manually edited this field this session
    if (userOverrides.has(identifier)) {
      continue;
    }

    const el = document.querySelector(`[data-career-copilot-id="${identifier}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (el) {
      if (value === '__RESUME__' && el instanceof HTMLInputElement && el.type === 'file') {
        try {
          const { accessToken } = await chrome.storage.local.get(['accessToken']);
          if (accessToken) {
            // Using API_URL would be ideal, but for now we'll assume it's the same origin or we can use the stored API URL if we have it.
            // Wait, we don't have API_URL in content script. We need to get it from popup or hardcode to localhost.
            // Actually, we can ask background/popup to fetch it, but let's just fetch it here if we know the URL.
            // To be safe, we'll send a message to background to fetch the blob.
            const response = await new Promise<{ success: boolean; data?: string; mimeType?: string; filename?: string; error?: string }>(resolve => {
              chrome.runtime.sendMessage({ action: 'FETCH_RESUME_BLOB' }, resolve);
            });

            if (response.success && response.data && response.mimeType && response.filename) {
              // response.data is base64 string
              const res = await fetch(`data:${response.mimeType};base64,${response.data}`);
              const blob = await res.blob();
              const file = new File([blob], response.filename, { type: response.mimeType });
              
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              el.files = dataTransfer.files;

              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              continue;
            } else {
              console.error('Failed to fetch resume blob:', response.error);
            }
          }
        } catch (err) {
          console.error('Error attaching resume:', err);
        }
      }

      FrameworkEventAdapter.setValue(el, value);
      
      // Listen for future manual edits to flag as user-overridden
      el.addEventListener('input', () => trackUserEdit(identifier), { once: true });
    }
  }
}

function generateUniqueSelector(el: Element): string {
  if (el.tagName.toLowerCase() === "html") return "html";
  let str = el.tagName.toLowerCase();
  str += (el.id != "") ? "#" + el.id : "";
  if (el.className) {
    const classes = el.className.split(/\s/).filter(Boolean);
    for (let i = 0; i < classes.length; i++) {
      str += "." + classes[i];
    }
  }
  if (el.parentNode) {
    str = generateUniqueSelector(el.parentNode as Element) + " > " + str;
  }
  return str;
}
