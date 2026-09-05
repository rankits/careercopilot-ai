import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import type { JobDescriptionDisplay } from '@/features/jobs/utils/resolveJobDescriptionDisplay';
import { sanitizeJobHtml } from '@/features/jobs/utils/sanitizeJobHtml';

import { JobDetailSectionHeader } from './JobDetailSectionHeader';
import { jobDetailPageSx } from './styles';

const COLLAPSED_CHAR_LIMIT = 320;

interface JobAboutRoleSectionProps {
  description: JobDescriptionDisplay;
}

function toPlainText(description: JobDescriptionDisplay): string {
  if (description.mode === 'text') {
    return description.content.replace(/\s+/g, ' ').trim();
  }

  return description.content
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function DescriptionToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <Box
      aria-expanded={expanded}
      component="button"
      onClick={onToggle}
      sx={jobDetailPageSx.descriptionToggle}
      type="button"
    >
      {expanded ? 'View less' : 'View more'}
    </Box>
  );
}

export function JobAboutRoleSection({ description }: JobAboutRoleSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const plainText = toPlainText(description);
  const canExpand = plainText.length > COLLAPSED_CHAR_LIMIT;
  const collapsedText = `${plainText.slice(0, COLLAPSED_CHAR_LIMIT).trimEnd()}...`;
  const toggleExpanded = () => setExpanded((current) => !current);

  return (
    <Box component="section" sx={jobDetailPageSx.panel}>
      <JobDetailSectionHeader title="About this role" />

      {canExpand && !expanded ? (
        <Typography component="p" sx={jobDetailPageSx.descriptionInline}>
          {collapsedText} <DescriptionToggle expanded={false} onToggle={toggleExpanded} />
        </Typography>
      ) : description.mode === 'html' ? (
        <Box sx={jobDetailPageSx.description}>
          <Box
            dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(description.content) }}
            sx={jobDetailPageSx.descriptionBody}
          />
          {canExpand ? (
            <Box sx={jobDetailPageSx.descriptionToggleAfter}>
              <DescriptionToggle expanded onToggle={toggleExpanded} />
            </Box>
          ) : null}
        </Box>
      ) : (
        <Typography component="p" sx={jobDetailPageSx.descriptionInline}>
          {description.content}
          {canExpand ? (
            <>
              {' '}
              <DescriptionToggle expanded onToggle={toggleExpanded} />
            </>
          ) : null}
        </Typography>
      )}
    </Box>
  );
}
