import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Box, Typography } from '@/lib/material';

import {
  formatDateRange,
  hasPreviewContent,
  type ResumeDraft,
  type ResumeTemplateId,
} from '../../utils';

import {
  A4_PAGE_HEIGHT_PX,
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
  if (entries.length === 0) return null;
  return (
    <Box className="block">
      <Typography className="heading">{title}</Typography>
      {entries.map((entry) => {
        const bullets = toBullets(entry.details);
        return (
          <Box key={entry.id} className="entry">
            <Box className="entry-top">
              <Box>
                <Typography className="entry-title">{entry.title || 'Role'}</Typography>
                {entry.company ? (
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
  const projects = draft.projectsList.filter(
    (entry) => entry.title || entry.company || entry.details,
  );
  const customFields = draft.customFields.filter((field) => field.label || field.value);

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
            entries={draft.projectsList.filter(
              (entry) => entry.title || entry.company || entry.details,
            )}
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

export const ResumeTemplatePreview = forwardRef<HTMLDivElement, ResumeTemplatePreviewProps>(
  function ResumeTemplatePreview({ draft, template, targetRole }, ref) {
    const role = draft.role || targetRole || 'Professional';
    const contact = [draft.email, draft.phone, draft.location, draft.linkedin].filter(Boolean);
    const contactKey = contact.join('|');
    const showEmpty = !hasPreviewContent(draft);
    const measureRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const Paper = useMemo(() => getPaper(template), [template]);

    useLayoutEffect(() => {
      const node = measureRef.current;
      if (!node) return;

      const update = () => {
        const height = node.scrollHeight;
        setPageCount(Math.max(1, Math.ceil(height / A4_PAGE_HEIGHT_PX)));
      };

      update();
      if (typeof ResizeObserver === 'undefined') return undefined;

      const observer = new ResizeObserver(update);
      observer.observe(node);
      return () => observer.disconnect();
    }, [draft, template, role, contactKey]);

    return (
      <PreviewFrame ref={ref}>
        <PageStack>
          <Box sx={{ position: 'relative', width: 'min(100%, 50rem)' }}>
            <Paper ref={measureRef} className={`template-${template}`}>
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
                <StructuredResumeBody
                  draft={draft}
                  role={role}
                  contact={contact}
                  template={template}
                />
              )}
            </Paper>

            {pageCount > 1
              ? Array.from({ length: pageCount - 1 }, (_, index) => (
                  <Box
                    key={`guide-${index}`}
                    sx={{
                      alignItems: 'center',
                      display: 'flex',
                      gap: 1,
                      left: 0,
                      pointerEvents: 'none',
                      position: 'absolute',
                      right: 0,
                      top: `${(index + 1) * A4_PAGE_HEIGHT_PX}px`,
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                    }}
                  >
                    <Box
                      sx={{
                        borderTop: '2px dashed #64748b',
                        flex: 1,
                        opacity: 0.85,
                      }}
                    />
                    <PageBreakLabel sx={{ flex: '0 0 auto', width: 'auto' }}>
                      Page {index + 2}
                    </PageBreakLabel>
                    <Box
                      sx={{
                        borderTop: '2px dashed #64748b',
                        flex: 1,
                        opacity: 0.85,
                      }}
                    />
                  </Box>
                ))
              : null}
          </Box>
        </PageStack>

        <Typography
          sx={{
            color: '#64748b',
            fontSize: '0.72rem',
            textAlign: 'center',
          }}
        >
          {pageCount} page{pageCount === 1 ? '' : 's'} · A4 guides · entries/sections avoid
          mid-split
        </Typography>
      </PreviewFrame>
    );
  },
);
