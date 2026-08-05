import { cleanBulletText, isNoiseLine, sanitizeExtractedText } from './sanitize';
import { newId, type ProjectEntry } from './types';

const PROJECT_HEADER_URL =
  /^([A-Za-z][A-Za-z0-9 .&'/_-]{1,60}?)\s[-–—−]\s+(https?:\/\/\S+|www\.\S+)$/i;

/** "Seedify — Web3 / Blockchain Platform" / "Rhino - SaaS Platform" */
const PROJECT_TITLE_SUBTITLE = /^([A-Za-z][A-Za-z0-9 .&'/_+-]{0,48}?)\s*[-–—−]\s+(.+)$/;

const ACTION_START =
  /^(built|developed|improved|integrated|enhanced|contributed|implemented|created|designed|delivered|led|architected|collaborated|conducted|optimized|migrated|established)/i;

function hasLeadingBullet(line: string): boolean {
  return /^[\s|]*[-*•●·▪▸►]/.test(line);
}

function parseProjectHeader(line: string): { title: string; company: string } | null {
  const cleaned = cleanBulletText(line);
  if (!cleaned || cleaned.length > 100) return null;

  const urlHeader = cleaned.match(PROJECT_HEADER_URL);
  if (urlHeader?.[1] && urlHeader[2]) {
    return { title: urlHeader[1].trim(), company: urlHeader[2].trim() };
  }

  const subtitle = cleaned.match(PROJECT_TITLE_SUBTITLE);
  if (subtitle?.[1] && subtitle[2]) {
    const title = subtitle[1].trim();
    const company = subtitle[2].trim();
    if (
      title.split(/\s+/).length <= 5 &&
      company.length < 80 &&
      !ACTION_START.test(title) &&
      !/^stack\b/i.test(title)
    ) {
      return { title, company };
    }
  }

  // Short Title-Case project name on its own line.
  if (
    !ACTION_START.test(cleaned) &&
    !/^stack\b|^tech\s*stack\b/i.test(cleaned) &&
    cleaned.length < 80 &&
    /^[A-Z][A-Za-z0-9 .&'/_+-]+$/.test(cleaned) &&
    cleaned.split(/\s+/).length <= 8 &&
    !/\.$/.test(cleaned)
  ) {
    return { title: cleaned, company: '' };
  }

  return null;
}

function shouldAppendContinuation(prevDetails: string, nextText: string, rawLine: string): boolean {
  if (!prevDetails || hasLeadingBullet(rawLine)) return false;
  if (/^[a-z]/.test(nextText)) return true;
  const last = (prevDetails.split('\n').pop() ?? '').trim();
  if (/[,;:/-]$/.test(last)) return true;
  if (!/[.!?]$/.test(last) && !ACTION_START.test(nextText) && last.length > 30) return true;
  return false;
}

export function parseProjectBlocks(text: string): ProjectEntry[] {
  const lines = sanitizeExtractedText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isNoiseLine(line) && !/^projects?$|^key\s+projects?$/i.test(line));

  if (!lines.length) return [];

  const projects: ProjectEntry[] = [];
  let current: ProjectEntry | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.title || current.details) projects.push(current);
    current = null;
  };

  for (const line of lines) {
    const cleaned = cleanBulletText(line);
    if (!cleaned) continue;

    if (/^stack\s*:/i.test(cleaned) || /^tech\s*stack\s*:/i.test(cleaned)) {
      if (!current) {
        current = {
          id: newId(),
          title: 'Project',
          company: '',
          startDate: '',
          endDate: '',
          details: cleaned,
        };
      } else {
        current.details = [current.details, cleaned].filter(Boolean).join('\n');
      }
      continue;
    }

    const header = parseProjectHeader(line);
    // Prefer a new project when the line looks like a title — even if it also has a bullet.
    if (header && !hasLeadingBullet(line)) {
      pushCurrent();
      current = {
        id: newId(),
        title: header.title,
        company: header.company,
        startDate: '',
        endDate: '',
        details: '',
      };
      continue;
    }

    if (current && shouldAppendContinuation(current.details, cleaned, line)) {
      const parts = current.details.split('\n');
      const last = parts.pop() ?? '';
      parts.push(`${last} ${cleaned}`.replace(/\s+/g, ' ').trim());
      current.details = parts.join('\n');
      continue;
    }

    if (!current) {
      current = {
        id: newId(),
        title: header?.title || 'Project',
        company: header?.company || '',
        startDate: '',
        endDate: '',
        details: cleaned,
      };
      continue;
    }

    current.details = [current.details, cleaned].filter(Boolean).join('\n');
  }

  pushCurrent();
  return projects;
}
