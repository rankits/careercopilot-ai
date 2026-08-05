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
  return text
    .split(/\n/)
    .map((line) =>
      line
        .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
        .replace(/^[\s·.•]+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .filter(
      (line) => !/^responsibilities:?$/i.test(line) && !/^tech\s*(used|stack):?$/i.test(line),
    );
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
      <Box className="skills">
        {skills.map((skill) => (
          <span key={skill} className="skill">
            {skill}
          </span>
        ))}
      </Box>
    </Box>
  );
}

function EntryList({
  title,
  entries,
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
}) {
  const visible = entries.filter((entry) => {
    const hasBody = Boolean(entry.company || entry.details);
    const titleLooksLikeSection = /^(projects?|work experience|experience)$/i.test(
      entry.title.trim(),
    );
    // Drop empty section-noise rows that would reprint the heading as an entry title.
    if (titleLooksLikeSection && !hasBody) return false;
    return Boolean(entry.company || entry.title || entry.details);
  });
  if (visible.length === 0) return null;
  return (
    <Box className="block">
      <Typography className="heading">{title}</Typography>
      {visible.map((entry) => {
        const bullets = toBullets(entry.details);
        const entryTitle = /^(projects?|work experience|experience)$/i.test(entry.title.trim())
          ? entry.company || 'Role'
          : entry.title || 'Role';
        return (
          <Box key={entry.id} className="entry">
            <Box className="entry-top">
              <Box>
                <Typography className="entry-title">{entryTitle}</Typography>
                {entry.company && entryTitle !== entry.company ? (
                  <Typography className="entry-company">{entry.company}</Typography>
                ) : null}
              </Box>
              <Typography className="entry-dates">
                {formatDateRange(entry.startDate, entry.endDate)}
              </Typography>
            </Box>
            {bullets.length > 0 ? (
              <ul className="bullets">
                {bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
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
      <EntryList title="Work Experience" entries={experiences} />
      <EntryList title="Projects" entries={projects} />
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
            entries={draft.experiences.filter(
              (entry) => entry.company || entry.title || entry.details,
            )}
          />
          <EntryList
            title="Projects"
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
    '.header, .entry, .entry-top, .bullets li, .skills, .block > .heading, .block > .body',
  );
  return Array.from(nodes)
    .map((el) => {
      const top = relativeTop(container, el);
      return { top, bottom: top + el.offsetHeight };
    })
    .filter((atom) => Number.isFinite(atom.top) && atom.bottom > atom.top)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);
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

    const cut = atoms.find(
      (atom) => atom.top < idealBreak - 0.5 && atom.bottom > idealBreak + 0.5,
    );

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
    const showEmpty = !hasPreviewContent(draft);
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
      <Paper className={`template-${template}`}>
        {template === 'original' ? (
          <Typography className="badge">Uploaded resume design</Typography>
        ) : null}
        {showEmpty ? (
          <Typography className="empty">
            {template === 'original'
              ? 'Your uploaded resume will appear here after analysis.'
              : 'Add content on the left to preview.'}
          </Typography>
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
              const sliceHeight =
                nextOffset != null
                  ? Math.max(1, nextOffset - offsetY)
                  : A4_PAGE_CONTENT_HEIGHT_PX;

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
