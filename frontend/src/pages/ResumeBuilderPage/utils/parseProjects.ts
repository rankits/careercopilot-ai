import { cleanBulletText, isNoiseLine, sanitizeExtractedText } from './sanitize';
import { newId, type ProjectEntry } from './types';

const PROJECT_HEADER_LINE =
  /^([A-Za-z][A-Za-z0-9 .&'/_-]{1,60}?)\s[-–—−]\s+(https?:\/\/\S+|www\.\S+)$/i;

export function parseProjectBlocks(text: string): ProjectEntry[] {
  const lines = sanitizeExtractedText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isNoiseLine(line) && !/^projects?$/i.test(line));

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

    const header = cleaned.match(PROJECT_HEADER_LINE);
    if (header && header[1] && header[2]) {
      pushCurrent();
      current = {
        id: newId(),
        title: header[1].trim(),
        company: header[2].trim(),
        startDate: '',
        endDate: '',
        details: '',
      };
      continue;
    }

    if (
      !/^(tech\s*stack|built|developed|improved|integrated|enhanced|contributed|implemented)/i.test(
        cleaned,
      ) &&
      cleaned.length < 60 &&
      /^[A-Z][A-Za-z0-9 .&'/_-]+$/.test(cleaned) &&
      cleaned.split(/\s+/).length <= 5 &&
      !/\.$/.test(cleaned)
    ) {
      pushCurrent();
      current = {
        id: newId(),
        title: cleaned,
        company: '',
        startDate: '',
        endDate: '',
        details: '',
      };
      continue;
    }

    if (!current) {
      current = {
        id: newId(),
        title: 'Project',
        company: '',
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
