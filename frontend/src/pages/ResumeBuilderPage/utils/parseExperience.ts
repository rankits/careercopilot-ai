import { cleanBulletText, isNoiseLine, sanitizeExtractedText } from './sanitize';
import { newId, type ExperienceEntry } from './types';

const JOB_DATE_LINE =
  /^((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[/.-]\d{4}|\d{4})\s*[-–—−to]+\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[/.-]\d{4}|\d{4}|present|current|now)/i;

const COMPANY_TITLE_LINE =
  /^([A-Z][^|\n]{2,90}?)\s[-–—−]\s+((?:Senior|Junior|Lead|Sr\.?|Jr\.?|Intern|Associate|Principal|Staff)?\s*(?:Full[\s-]?Stack|Frontend|Backend|Software|Web|Mobile|UI\/UX|React|Node|Product|Project|Sales|Marketing|Data|Business)?\s*(?:Developer|Engineer|Architect|Manager|Consultant|Designer|Analyst|Specialist|Executive|Officer|Lead|Intern|Associate)[^|\n]*)$/i;

const TITLE_KEYWORDS =
  /developer|engineer|architect|manager|consultant|designer|analyst|lead|specialist|executive|officer|intern|associate|director|coordinator|administrator|scientist|teacher|instructor|recruiter|accountant|nurse|therapist|technician/i;

function parseCompanyTitle(line: string): { company: string; title: string } | null {
  const cleaned = line.replace(/^\|\s*/, '').trim();
  if (cleaned.length < 6 || cleaned.length > 160) return null;

  const match = cleaned.match(COMPANY_TITLE_LINE);
  if (match && match[1] && match[2]) return { company: match[1].trim(), title: match[2].trim() };

  // Title | Company  OR  Company | Title
  const pipe = cleaned.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipe && pipe[1] && pipe[2]) {
    const left = pipe[1].trim();
    const right = pipe[2].trim();
    if (TITLE_KEYWORDS.test(left) && !TITLE_KEYWORDS.test(right)) {
      return { company: right, title: left };
    }
    if (TITLE_KEYWORDS.test(right) && !TITLE_KEYWORDS.test(left)) {
      return { company: left, title: right };
    }
  }

  const dash = cleaned.match(/^(.+?)\s[-–—−]\s+(.+)$/);
  if (!dash || !dash[1] || !dash[2]) return null;
  const left = dash[1].trim();
  const right = dash[2].trim();
  if (/https?:\/\//i.test(left) || /https?:\/\//i.test(right)) return null;
  if (!TITLE_KEYWORDS.test(right) && !TITLE_KEYWORDS.test(left)) {
    return null;
  }
  if (TITLE_KEYWORDS.test(left) && !TITLE_KEYWORDS.test(right)) {
    return { company: right, title: left };
  }
  if (
    !/(ltd|llc|inc|pvt|technologies|infotech|solutions|systems|labs|company|corp|university|college|school|hospital|clinic|bank|group)/i.test(
      left,
    ) &&
    left.length < 6
  ) {
    return null;
  }
  return { company: left, title: right };
}

function parseJobDate(
  line: string,
): { startDate: string; endDate: string; location: string } | null {
  const cleaned = cleanBulletText(line);
  if (!JOB_DATE_LINE.test(cleaned)) return null;
  const [datePart, ...rest] = cleaned.split(',');
  const [start, end] = (datePart ?? cleaned)
    .trim()
    .split(/\s*[-–—−]|to\s+/i)
    .map((part) => part.trim());
  return { startDate: start ?? '', endDate: end ?? '', location: rest.join(',').trim() };
}

function splitInlineJobBoundary(line: string): { before: string; jobLine: string } | null {
  const pipeMatch = line.match(/^(.*?)(?:\s*\|\s+)([A-Z].+?\s[-–—−]\s+.+)$/);
  if (pipeMatch && pipeMatch[1] && pipeMatch[2] && parseCompanyTitle(pipeMatch[2])) {
    return { before: cleanBulletText(pipeMatch[1]), jobLine: pipeMatch[2].trim() };
  }
  return null;
}

function explodeGluedBullets(line: string): string[] {
  const cleaned = cleanBulletText(line);
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?:[.!?])\s*[·•]+\s*[·•]*\s*(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [cleaned];
  return parts.map((part, index) => {
    if (index === 0) {
      return part.endsWith('.') || part.endsWith('!') || part.endsWith('?') ? part : `${part}.`;
    }
    return cleanBulletText(part);
  });
}

function hasLeadingBullet(line: string): boolean {
  return /^[\s|]*[-*•●·▪▸►]/.test(line);
}

function shouldAppendContinuation(
  prevDetails: string,
  nextBullet: string,
  rawLine: string,
): boolean {
  if (!prevDetails || hasLeadingBullet(rawLine)) return false;
  if (/^[a-z]/.test(nextBullet)) return true;
  const last = (prevDetails.split('\n').pop() ?? '').trim();
  if (/[,;:/-]$/.test(last)) return true;
  // Soft-wrapped PDF lines often capitalize the next word but the sentence is unfinished.
  if (
    !/[.!?]$/.test(last) &&
    last.length > 30 &&
    !/^(Location:|Tech used:)/i.test(nextBullet) &&
    !TITLE_KEYWORDS.test(nextBullet.split(/\s+/).slice(0, 3).join(' '))
  ) {
    return true;
  }
  return false;
}

export function parseExperienceBlocks(text: string): ExperienceEntry[] {
  const rawLines = sanitizeExtractedText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isNoiseLine(line) && !/^work\s+experience$/i.test(line));

  const lines: string[] = [];
  for (const line of rawLines) {
    const split = splitInlineJobBoundary(line);
    if (split) {
      if (split.before) lines.push(...explodeGluedBullets(split.before));
      lines.push(split.jobLine);
      continue;
    }
    if (parseCompanyTitle(line) || parseJobDate(line)) {
      lines.push(line);
      continue;
    }
    lines.push(...explodeGluedBullets(line));
  }

  if (!lines.length) return [];

  const jobs: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.company || current.title || current.details) jobs.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const next = lines[i + 1] ?? '';
    const companyTitle = parseCompanyTitle(line);
    const dateOnLine = parseJobDate(line);
    const dateNext = parseJobDate(next);

    if (companyTitle && dateNext) {
      pushCurrent();
      current = {
        id: newId(),
        company: companyTitle.company,
        title: companyTitle.title,
        startDate: dateNext.startDate,
        endDate: dateNext.endDate,
        details: dateNext.location ? `Location: ${dateNext.location}` : '',
      };
      i += 1;
      continue;
    }

    if (companyTitle && dateOnLine) {
      pushCurrent();
      current = {
        id: newId(),
        company: companyTitle.company,
        title: companyTitle.title,
        startDate: dateOnLine.startDate,
        endDate: dateOnLine.endDate,
        details: dateOnLine.location ? `Location: ${dateOnLine.location}` : '',
      };
      continue;
    }

    if (companyTitle) {
      pushCurrent();
      current = {
        id: newId(),
        company: companyTitle.company,
        title: companyTitle.title,
        startDate: '',
        endDate: '',
        details: '',
      };
      continue;
    }

    if (dateOnLine && current && !current.startDate) {
      current.startDate = dateOnLine.startDate;
      current.endDate = dateOnLine.endDate;
      if (dateOnLine.location) {
        current.details = [current.details, `Location: ${dateOnLine.location}`]
          .filter(Boolean)
          .join('\n');
      }
      continue;
    }

    if (
      !dateOnLine &&
      !parseCompanyTitle(next) &&
      !parseJobDate(next) &&
      parseJobDate(lines[i + 2] ?? '') &&
      line.length < 90
    ) {
      const dateInfo = parseJobDate(lines[i + 2] ?? '')!;
      pushCurrent();
      current = {
        id: newId(),
        title: line,
        company: next,
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
        details: dateInfo.location ? `Location: ${dateInfo.location}` : '',
      };
      i += 2;
      continue;
    }

    const bullet = cleanBulletText(line);
    if (!bullet || /^responsibilities:?$/i.test(bullet) || /^tech\s*used:?$/i.test(bullet)) {
      continue;
    }

    if (
      current?.details &&
      shouldAppendContinuation(current.details, bullet, line) &&
      !parseCompanyTitle(bullet) &&
      !parseJobDate(bullet)
    ) {
      const parts = current.details.split('\n');
      const last = parts.pop() ?? '';
      parts.push(`${last} ${bullet}`.replace(/\s+/g, ' ').trim());
      current.details = parts.join('\n');
      continue;
    }

    if (!current) {
      current = {
        id: newId(),
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        details: bullet,
      };
      continue;
    }

    current.details = [current.details, bullet].filter(Boolean).join('\n');
  }

  pushCurrent();
  return jobs;
}
