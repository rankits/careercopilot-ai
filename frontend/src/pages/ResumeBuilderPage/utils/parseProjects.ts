import { cleanBulletText, isNoiseLine, sanitizeExtractedText } from './sanitize';
import { newId, type ProjectEntry } from './types';

const PROJECT_HEADER_URL =
  /^([A-Za-z0-9][A-Za-z0-9 .&'/_+-]{0,60}?)\s[-–—−]\s+(https?:\/\/\S+|www\.\S+)$/i;

/** "Seedify — Web3 / Blockchain Platform" / "Rhino - SaaS Platform" */
const PROJECT_TITLE_SUBTITLE = /^([A-Za-z0-9][A-Za-z0-9 .&'/_+-]{0,48}?)\s*[-–—−|:]\s+(.+)$/;

const ACTION_START =
  /^(built|developed|improved|integrated|enhanced|contributed|implemented|created|designed|delivered|led|architected|collaborated|conducted|optimized|migrated|established|worked|responsible|managed|owned)/i;

const BAD_PROJECT_TITLE =
  /^(projects?|project\s+\d+|key\s+projects?|role|responsibilities|tech\s*stack|stack)$/i;

function hasLeadingBullet(line: string): boolean {
  return /^[\s|]*[-*•●·▪▸►]/.test(line);
}

function parseProjectHeader(line: string): { title: string; company: string } | null {
  const cleaned = cleanBulletText(line);
  if (!cleaned || cleaned.length > 100) return null;
  if (BAD_PROJECT_TITLE.test(cleaned)) return null;

  const labeled = cleaned.match(/^(?:project\s*(?:name|title)?)\s*[:\-–—]\s*(.+)$/i);
  if (labeled?.[1]?.trim()) {
    return { title: labeled[1].trim(), company: '' };
  }

  const urlHeader = cleaned.match(PROJECT_HEADER_URL);
  if (urlHeader?.[1] && urlHeader[2]) {
    return { title: urlHeader[1].trim(), company: urlHeader[2].trim() };
  }

  const subtitle = cleaned.match(PROJECT_TITLE_SUBTITLE);
  if (subtitle?.[1] && subtitle[2]) {
    const title = subtitle[1].trim();
    const company = subtitle[2].trim();
    if (
      title.split(/\s+/).length <= 6 &&
      company.length < 90 &&
      !ACTION_START.test(title) &&
      !/^stack\b/i.test(title) &&
      !BAD_PROJECT_TITLE.test(title)
    ) {
      return { title, company };
    }
  }

  // Short project name on its own line (Title Case, ALL CAPS, or mixed).
  if (
    !ACTION_START.test(cleaned) &&
    !/^stack\b|^tech\s*stack\b|^responsibilities?\b/i.test(cleaned) &&
    cleaned.length < 80 &&
    /^[A-Za-z0-9][A-Za-z0-9 .&'/_+-]*$/.test(cleaned) &&
    cleaned.split(/\s+/).length <= 8 &&
    !/\.$/.test(cleaned) &&
    !BAD_PROJECT_TITLE.test(cleaned)
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

/** Prefer a real project name — never leave blank titles that render as "Role". */
export function resolveProjectDisplayTitle(entry: {
  title: string;
  company: string;
  details: string;
}): string {
  const title = entry.title.trim();
  if (title && !BAD_PROJECT_TITLE.test(title)) return title;

  const company = entry.company.trim();
  if (company && !/^https?:\/\//i.test(company) && !/^www\./i.test(company)) {
    return company;
  }

  for (const raw of entry.details.split(/\n/)) {
    const line = cleanBulletText(raw);
    if (!line) continue;
    if (ACTION_START.test(line)) continue;
    if (/^stack\s*:|^tech\s*stack\s*:|^responsibilities?\b/i.test(line)) continue;
    if (line.length > 70) continue;
    if (line.split(/\s+/).length <= 8) return line;
  }

  return 'Project';
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
    if (!current.title.trim() || BAD_PROJECT_TITLE.test(current.title.trim())) {
      current.title = resolveProjectDisplayTitle(current);
    }
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
          title: '',
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

    if (/^responsibilities?\s*:?\s*$/i.test(cleaned)) {
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
        title: header?.title || '',
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
