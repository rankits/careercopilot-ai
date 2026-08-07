import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Box, Typography } from '@/lib/material';

import {
  formatDateRange,
  hasPreviewContent,
  type ResumeDraft,
  type ResumeTemplateId,
} from '../../utils';

import {
  A4_PAGE_CONTENT_HEIGHT_PX,
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_MARGIN_PX,
  A4_PAGE_WIDTH_PX,
  ClassicPaper,
  ExecutivePaper,
  MinimalPaper,
  ModernPaper,
  OriginalPaper,
  PageBreakLabel,
  PageStack,
  PreviewFrame,
} from './template.styles';

interface ResumeTemplatePreviewProps {
  draft: ResumeDraft;
  template: ResumeTemplateId;
  targetRole: string;
}

function toBullets(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    // Break inline bullet runs onto their own lines (common in OCR / pasted resumes).
    .replace(/(?:^|\s)[•●▪▸►]\s+/g, '\n')
    .replace(/(?:^|\s)[-*]\s+(?=[A-Z0-9])/g, '\n')
    // Split glued "sentence. Next responsibility" into separate bullets when needed.
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n');

  const out: string[] = [];
  for (const raw of normalized.split(/\n/)) {
    const line = raw
      .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
      .replace(/^[\s·.•]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) continue;
    if (/^responsibilities:?$/i.test(line) || /^tech\s*(used|stack):?$/i.test(line)) continue;

    const prev = out[out.length - 1];
    const hadBullet = /^[\s|]*[-*•●·▪▸►]/.test(raw);
    // Only merge soft wrap fragments — never glue two full sentences/bullets.
    if (
      prev &&
      !hadBullet &&
      line.length < 50 &&
      (/^[a-z]/.test(line) || /[,;:/-]$/.test(prev)) &&
      !/[.!?]$/.test(prev)
    ) {
      out[out.length - 1] = `${prev} ${line}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    out.push(line);
  }
  return out;
}

function ContactRow({ contact }: { contact: string[] }) {
  if (contact.length === 0) return null;
  return (
    <Box className="contact">
      {contact.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </Box>
  );
}

function SkillsBlock({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <Box className="block">
      <Typography className="heading">Skills</Typography>
      <Box className="skills-list" component="ul">
        {skills.map((skill) => (
          <Box key={skill} className="skill-item" component="li">
            {skill}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function EntryList({
  title,
  entries,
  kind = 'experience',
}: {
  title: string;
  entries: Array<{
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    details: string;
  }>;
  kind?: 'experience' | 'project';
}) {
  const visible = entries.filter((entry) => {
    const hasBody = Boolean(entry.company || entry.details);
    const titleLooksLikeSection = /^(projects?|work experience|experience|role)$/i.test(
      entry.title.trim(),
    );
    // Drop empty section-noise rows that would reprint the heading as an entry title.
    if (titleLooksLikeSection && !hasBody) return false;
    return Boolean(entry.company || entry.title || entry.details);
  });
  if (visible.length === 0) return null;

  const resolveTitle = (entry: (typeof visible)[number]): string => {
    const raw = entry.title.trim();
    if (kind === 'project') {
      if (raw && !/^(projects?|project\s+\d+|role)$/i.test(raw)) return raw;
      const company = entry.company.trim();
      if (company && !/^https?:\/\//i.test(company) && !/^www\./i.test(company)) return company;
      const firstDetail = entry.details
        .split(/\n/)
        .map((line) =>
          line
            .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .find(
          (line) =>
            line &&
            line.length < 70 &&
            line.split(/\s+/).length <= 8 &&
            !/^(built|developed|implemented|created|designed|stack:|tech)/i.test(line),
        );
      return firstDetail || 'Project';
    }
    if (/^(projects?|work experience|experience|role)$/i.test(raw)) {
      return entry.company.trim() || raw || 'Role';
    }
    return raw || entry.company.trim() || 'Role';
  };

  return (
    <Box className="block">
      <Typography className="heading">{title}</Typography>
      {visible.map((entry) => {
        const bullets = toBullets(entry.details);
        const entryTitle = resolveTitle(entry);
        const showCompany =
          Boolean(entry.company) &&
          entryTitle !== entry.company &&
          !/^https?:\/\//i.test(entry.company) &&
          (kind === 'experience' || entry.company.trim().length > 0);
        return (
          <Box key={entry.id} className={`entry${kind === 'project' ? ' entry-project' : ''}`}>
            <Box className="entry-top">
              <Box>
                <Typography
                  className={kind === 'project' ? 'entry-title project-title' : 'entry-title'}
                >
                  {entryTitle}
                </Typography>
                {showCompany && kind === 'experience' ? (
                  <Typography className="entry-company">{entry.company}</Typography>
                ) : null}
                {showCompany && kind === 'project' && !/^https?:\/\//i.test(entry.company) ? (
                  <Typography className="entry-company">{entry.company}</Typography>
                ) : null}
              </Box>
              <Typography className="entry-dates">
                {formatDateRange(entry.startDate, entry.endDate)}
              </Typography>
            </Box>
            {bullets.length > 0 ? (
              <ul className="bullets">
                {bullets.map((bullet, index) => (
                  <li key={`${entry.id}-b-${index}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <Box className="block">
      <Typography className="heading">{title}</Typography>
      <Typography className="body">{body}</Typography>
    </Box>
  );
}

function MainSections({ draft }: { draft: ResumeDraft }) {
  const experiences = draft.experiences.filter(
    (entry) => entry.company || entry.title || entry.details,
  );
  const projects = draft.projectsList.filter((entry) => {
    const hasBody = Boolean(entry.company || entry.details);
    const titleLooksLikeSection = /^(projects?)$/i.test(entry.title.trim());
    if (titleLooksLikeSection && !hasBody) return false;
    return Boolean(entry.title || entry.company || entry.details);
  });
  const customFields = draft.customFields.filter(
    (field) =>
      (field.label || field.value) &&
      !/^(projects?|work experience|experience|skills?|education|summary|certifications?|achievements?)$/i.test(
        field.label.trim(),
      ),
  );

  return (
    <>
      <TextBlock title="Professional Summary" body={draft.summary} />
      <SkillsBlock skills={draft.skillsList} />
      <EntryList title="Work Experience" entries={experiences} kind="experience" />
      <EntryList title="Projects" entries={projects} kind="project" />
      <TextBlock title="Education" body={draft.education} />
      <TextBlock title="Certifications" body={draft.certifications} />
      <TextBlock title="Achievements" body={draft.achievements} />
      {customFields.map((field) => (
        <TextBlock key={field.id} title={field.label || 'Additional'} body={field.value} />
      ))}
    </>
  );
}

function StructuredResumeBody({
  draft,
  role,
  contact,
  template,
}: {
  draft: ResumeDraft;
  role: string;
  contact: string[];
  template: ResumeTemplateId;
}) {
  if (template === 'modern') {
    return (
      <>
        <Box className="header">
          <Typography className="name">{draft.fullName || 'Your Name'}</Typography>
          <Typography className="role">{role}</Typography>
          <ContactRow contact={contact} />
        </Box>
        <Box className="content">
          <MainSections draft={draft} />
        </Box>
      </>
    );
  }

  if (template === 'executive') {
    return (
      <Box className="exec-layout">
        <Box className="sidebar">
          <Typography className="name">{draft.fullName || 'Your Name'}</Typography>
          <Typography className="role">{role}</Typography>
          <ContactRow contact={contact} />
          <SkillsBlock skills={draft.skillsList} />
          <TextBlock title="Education" body={draft.education} />
        </Box>
        <Box className="main">
          <TextBlock title="Professional Summary" body={draft.summary} />
          <EntryList
            title="Work Experience"
            kind="experience"
            entries={draft.experiences.filter(
              (entry) => entry.company || entry.title || entry.details,
            )}
          />
          <EntryList
            title="Projects"
            kind="project"
            entries={draft.projectsList.filter((entry) => {
              const hasBody = Boolean(entry.company || entry.details);
              const titleLooksLikeSection = /^(projects?)$/i.test(entry.title.trim());
              if (titleLooksLikeSection && !hasBody) return false;
              return Boolean(entry.title || entry.company || entry.details);
            })}
          />
          <TextBlock title="Certifications" body={draft.certifications} />
          <TextBlock title="Achievements" body={draft.achievements} />
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Typography className="name">{draft.fullName || 'Your Name'}</Typography>
      <Typography className="role">{role}</Typography>
      <ContactRow contact={contact} />
      <MainSections draft={draft} />
    </>
  );
}

function getPaper(template: ResumeTemplateId) {
  if (template === 'original') return OriginalPaper;
  if (template === 'modern') return ModernPaper;
  if (template === 'minimal') return MinimalPaper;
  if (template === 'executive') return ExecutivePaper;
  return ClassicPaper;
}

function relativeTop(container: HTMLElement, el: HTMLElement): number {
  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - containerRect.top + container.scrollTop;
}

type PageAtom = { top: number; bottom: number };

function collectPageAtoms(container: HTMLElement): PageAtom[] {
  // Fine-grained units so we never slice mid-bullet / mid-heading.
  const nodes = container.querySelectorAll<HTMLElement>(
    '.header, .entry, .entry-top, .bullets li, .skills-list, .skill-item, .block > .heading, .block > .body',
  );
  const atoms = Array.from(nodes)
    .map((el) => {
      const top = relativeTop(container, el);
      return { top, bottom: top + el.offsetHeight };
    })
    .filter((atom) => Number.isFinite(atom.top) && atom.bottom > atom.top)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  // Prefer leaf atoms (bullets) over parents that fully contain them — keeps
  // page breaks between bullets instead of cutting through a tall entry.
  return atoms.filter(
    (atom) =>
      !atoms.some(
        (other) =>
          other !== atom &&
          other.top >= atom.top - 0.5 &&
          other.bottom <= atom.bottom + 0.5 &&
          other.bottom - other.top < atom.bottom - atom.top - 0.5,
      ),
  );
}

/**
 * Non-overlapping page starts. Never cut through a bullet, entry header, or section heading —
 * pull the incomplete unit onto the next page (whitespace at page bottom is preferred).
 */
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit tests
export function computePageOffsets(container: HTMLElement, pageInner: number): number[] {
  const total = container.scrollHeight;
  if (total <= pageInner) return [0];

  const atoms = collectPageAtoms(container);
  const offsets: number[] = [0];
  let pageStart = 0;

  while (pageStart + pageInner < total - 1) {
    const idealBreak = pageStart + pageInner;
    let breakAt = idealBreak;

    const cut = atoms.find((atom) => atom.top < idealBreak - 0.5 && atom.bottom > idealBreak + 0.5);

    if (cut) {
      if (cut.top > pageStart + 4) {
        // Move the whole incomplete unit to the next page — never mid-sentence.
        breakAt = cut.top;
      } else {
        // Unit started on this page and is taller than the remaining viewport:
        // break after the last fully visible nested atom, else hard-advance.
        const lastFitting = [...atoms]
          .reverse()
          .find((atom) => atom.bottom <= idealBreak && atom.top > pageStart + 4);
        breakAt = lastFitting ? lastFitting.bottom : idealBreak;
      }
    } else {
      // Soft edge: if idealBreak lands in a gap, snap to the end of the last complete atom
      // so the next page starts cleanly at the following unit.
      const lastComplete = [...atoms]
        .reverse()
        .find((atom) => atom.bottom <= idealBreak && atom.bottom > pageStart + pageInner * 0.2);
      if (lastComplete && idealBreak - lastComplete.bottom < 48) {
        breakAt = lastComplete.bottom;
      }
    }

    if (breakAt <= pageStart + 4) {
      breakAt = Math.min(total, pageStart + pageInner);
    }

    offsets.push(breakAt);
    pageStart = breakAt;
    if (offsets.length > 20) break;
  }

  return offsets;
}

export const ResumeTemplatePreview = forwardRef<HTMLDivElement, ResumeTemplatePreviewProps>(
  function ResumeTemplatePreview({ draft, template, targetRole }, ref) {
    const role = draft.role || targetRole || 'Professional';
    const contact = [draft.email, draft.phone, draft.location, draft.linkedin].filter(Boolean);
    const contactKey = contact.join('|');
    const structuredReady = hasPreviewContent(draft);
    const originalFallback = draft.originalText.trim();
    const showEmpty =
      template === 'original' ? !structuredReady && !originalFallback : !structuredReady;
    const measureRef = useRef<HTMLDivElement>(null);
    const scaleHostRef = useRef<HTMLDivElement>(null);
    const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
    const [scale, setScale] = useState(1);
    const Paper = useMemo(() => getPaper(template), [template]);
    const contentWidth = A4_PAGE_WIDTH_PX - A4_PAGE_MARGIN_PX * 2;

    useLayoutEffect(() => {
      const node = measureRef.current;
      if (!node) return;

      const update = () => {
        setPageOffsets(computePageOffsets(node, A4_PAGE_CONTENT_HEIGHT_PX));
      };

      update();
      if (typeof ResizeObserver === 'undefined') return undefined;

      const observer = new ResizeObserver(update);
      observer.observe(node);
      return () => observer.disconnect();
    }, [draft, template, role, contactKey]);

    useLayoutEffect(() => {
      const host = scaleHostRef.current;
      if (!host) return;

      const updateScale = () => {
        const available = host.clientWidth;
        setScale(available > 0 ? Math.min(1, available / A4_PAGE_WIDTH_PX) : 1);
      };

      updateScale();
      if (typeof ResizeObserver === 'undefined') return undefined;
      const observer = new ResizeObserver(updateScale);
      observer.observe(host);
      return () => observer.disconnect();
    }, [pageOffsets.length]);

    const pageCount = pageOffsets.length;

    const renderPaper = () => (
      <Paper className={`template-${template}`} data-template={template}>
        {template === 'original' ? (
          <Typography className="badge">Default · your resume</Typography>
        ) : null}
        {showEmpty ? (
          <Typography className="empty">
            {template === 'original'
              ? 'Your uploaded resume will appear here after we parse Summary, Experience, Skills, and Projects.'
              : 'Add content on the left to preview.'}
          </Typography>
        ) : template === 'original' && !structuredReady && originalFallback ? (
          <Typography className="original-fallback">{originalFallback}</Typography>
        ) : (
          <StructuredResumeBody draft={draft} role={role} contact={contact} template={template} />
        )}
      </Paper>
    );

    return (
      <PreviewFrame ref={ref} sx={{ position: 'relative' }}>
        {/* Unscaled off-screen measure — avoids wrong tops from scale/clip transforms. */}
        <Box
          aria-hidden
          sx={{
            left: -10000,
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            visibility: 'hidden',
            width: contentWidth,
          }}
        >
          <Box ref={measureRef} sx={{ width: '100%' }}>
            {renderPaper()}
          </Box>
        </Box>

        <PageStack>
          <Box ref={scaleHostRef} sx={{ maxWidth: '100%', minWidth: 0, width: '100%' }}>
            {pageOffsets.map((offsetY, index) => {
              const nextOffset = pageOffsets[index + 1];
              const remaining =
                nextOffset != null
                  ? Math.max(1, nextOffset - offsetY)
                  : Math.max(
                      1,
                      (measureRef.current?.scrollHeight ?? A4_PAGE_CONTENT_HEIGHT_PX) - offsetY,
                    );
              // Cap to one page; never stretch the last slice past remaining content + padding.
              const sliceHeight = Math.min(A4_PAGE_CONTENT_HEIGHT_PX, remaining);

              return (
                <Box
                  key={`page-${index}`}
                  sx={{ maxWidth: '100%', minWidth: 0, mb: index < pageCount - 1 ? 2 : 0 }}
                >
                  {index > 0 ? <PageBreakLabel>Page {index + 1}</PageBreakLabel> : null}
                  <Box
                    sx={{
                      height: A4_PAGE_HEIGHT_PX * scale,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      width: A4_PAGE_WIDTH_PX * scale,
                    }}
                  >
                    <Box
                      className="preview-page"
                      sx={{
                        background: '#ffffff',
                        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.12)',
                        boxSizing: 'border-box',
                        height: A4_PAGE_HEIGHT_PX,
                        overflow: 'hidden',
                        padding: `${A4_PAGE_MARGIN_PX}px`,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        width: A4_PAGE_WIDTH_PX,
                      }}
                    >
                      <Box
                        sx={{
                          height: sliceHeight,
                          maxHeight: A4_PAGE_CONTENT_HEIGHT_PX,
                          overflow: 'hidden',
                          position: 'relative',
                          width: '100%',
                        }}
                      >
                        <Box
                          sx={{
                            transform: `translateY(-${offsetY}px)`,
                            width: '100%',
                          }}
                        >
                          {renderPaper()}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </PageStack>

        <Typography
          sx={{
            color: '#64748b',
            fontSize: '0.72rem',
            textAlign: 'center',
          }}
        >
          {pageCount} page{pageCount === 1 ? '' : 's'} · A4 · equal margins · section-aware breaks
        </Typography>
      </PreviewFrame>
    );
  },
);
