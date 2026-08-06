import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/atoms/Button';

import type { JobDescriptionDisplay } from '@/features/jobs/utils/resolveJobDescriptionDisplay';
import { sanitizeJobHtml } from '@/features/jobs/utils/sanitizeJobHtml';
import { Box, Typography } from '@/lib/material';

import { JobDetailSectionHeader } from './JobDetailSectionHeader';
import { jobDetailPageSx } from './styles';

const COLLAPSED_MAX_HEIGHT_PX = 240;
const LONG_DESCRIPTION_CHARS = 480;

interface JobAboutRoleSectionProps {
  description: JobDescriptionDisplay;
}

export function JobAboutRoleSection({ description }: JobAboutRoleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const isLongContent = description.content.length >= LONG_DESCRIPTION_CHARS;

  const updateCanExpand = useCallback(() => {
    const node = contentRef.current;
    if (!node) {
      setCanExpand(false);
      return;
    }

    setCanExpand(node.scrollHeight > COLLAPSED_MAX_HEIGHT_PX + 1);
  }, []);

  useEffect(() => {
    if (isLongContent) {
      setCanExpand(true);
      return;
    }

    updateCanExpand();
  }, [description.content, description.mode, isLongContent, updateCanExpand]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => updateCanExpand());
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateCanExpand]);

  const showToggle = expanded || canExpand || isLongContent;

  return (
    <Box component="section" sx={jobDetailPageSx.panel}>
      <JobDetailSectionHeader title="About this role" />

      <Box
        ref={contentRef}
        sx={{
          ...jobDetailPageSx.description,
          ...(expanded
            ? jobDetailPageSx.descriptionExpanded
            : jobDetailPageSx.descriptionCollapsed),
        }}
      >
        {description.mode === 'html' ? (
          <Box
            dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(description.content) }}
            sx={jobDetailPageSx.descriptionBody}
          />
        ) : (
          <Typography component="div" sx={jobDetailPageSx.descriptionBody} whiteSpace="pre-wrap">
            {description.content}
          </Typography>
        )}
      </Box>

      {showToggle ? (
        <Button
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          size="small"
          variant="outline"
        >
          {expanded ? 'See less' : 'See more'}
        </Button>
      ) : null}
    </Box>
  );
}
