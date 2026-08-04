import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';

import { ROUTES } from '@/constants/routes';
import { Box, DescriptionOutlinedIcon, DownloadIcon, Typography } from '@/lib/material';
import { resumeBuilderService, type SavedResumeVersion } from '@/services/resumeBuilder.service';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  EmptyState,
  JdBlock,
  PageHeader,
  Root,
  VersionCard,
  VersionMeta,
  VersionsGrid,
} from './styles';

function truncate(text: string | null | undefined, max = 220): string {
  if (!text?.trim()) return 'No job description saved for this version.';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function fileBase(version: SavedResumeVersion): string {
  const role = (version.targetRole || 'resume').replace(/[^\w\- ]+/g, '').trim();
  return `${role || 'resume'}_v${version.id}`.replace(/\s+/g, '_');
}

export function SavedResumesPage() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<SavedResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await resumeBuilderService.listSavedVersions();
        if (!cancelled) setVersions(list);
      } catch {
        if (!cancelled) setError('Could not load saved resumes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = useCallback(async (version: SavedResumeVersion, format: 'pdf' | 'txt') => {
    setDownloadingId(version.id);
    try {
      const { parseResumeContent } = await import('@/pages/ResumeBuilderPage/utils');
      const draft = parseResumeContent(version.content, version.targetRole || '');
      const base = fileBase(version);

      if (format === 'pdf') {
        const { downloadResumePdf } = await import('@/pages/ResumeBuilderPage/exportResume');
        await downloadResumePdf(draft, `${base}.pdf`, 'original');
        return;
      }

      const blob = new Blob([version.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${base}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return (
    <Root>
      <PageHeader>
        <Box>
          <Typography component="h1" fontWeight={fontWeight.extraBold} fontSize={fontSize['2xl']}>
            Saved resumes
          </Typography>
          <Typography
            color={colorTokens.textSecondary}
            fontSize={fontSize.sm}
            sx={{ mt: spacing[1] }}
          >
            Finished versions from Resume Builder — with the role and job description they were
            optimized for.
          </Typography>
        </Box>
        <Button variant="outline" onClick={() => void navigate(ROUTES.RESUME_BUILDER)}>
          Build new resume
        </Button>
      </PageHeader>

      {loading ? (
        <EmptyState>Loading saved resumes…</EmptyState>
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : versions.length === 0 ? (
        <EmptyState>
          <DescriptionOutlinedIcon sx={{ fontSize: 40, opacity: 0.45 }} />
          <Typography fontWeight={fontWeight.semiBold}>No saved resumes yet</Typography>
          <Typography color={colorTokens.textSecondary} fontSize={fontSize.sm}>
            Complete the Resume Builder and tap Done on the export step to save a version here.
          </Typography>
          <Button onClick={() => void navigate(ROUTES.RESUME_BUILDER)}>Open Resume Builder</Button>
        </EmptyState>
      ) : (
        <VersionsGrid>
          {versions.map((version) => (
            <VersionCard key={version.id}>
              <VersionMeta>
                <Box>
                  <Typography fontWeight={fontWeight.bold} fontSize={fontSize.lg}>
                    {version.targetRole || 'Untitled role'}
                  </Typography>
                  <Typography
                    color={colorTokens.textSecondary}
                    fontSize={fontSize.xs}
                    sx={{ mt: 0.5 }}
                  >
                    {version.label}
                    {version.resumeFileName ? ` · ${version.resumeFileName}` : ''}
                    {' · '}
                    {new Date(version.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Typography
                  fontWeight={fontWeight.semiBold}
                  fontSize={fontSize.sm}
                  color={
                    version.atsScore >= 80
                      ? colorTokens.feedbackSuccess
                      : version.atsScore >= 60
                        ? colorTokens.feedbackWarning
                        : colorTokens.feedbackError
                  }
                >
                  ATS {version.atsScore}
                </Typography>
              </VersionMeta>

              <Box>
                <Typography
                  fontWeight={fontWeight.semiBold}
                  fontSize={fontSize.xs}
                  color={colorTokens.textSecondary}
                  sx={{
                    mb: spacing[1],
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Job description
                </Typography>
                <JdBlock>{truncate(version.jobDescription)}</JdBlock>
              </Box>

              <Box sx={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  disabled={downloadingId === version.id}
                  startIcon={<DownloadIcon fontSize="small" />}
                  onClick={() => void handleDownload(version, 'pdf')}
                >
                  {downloadingId === version.id ? '…' : 'Download PDF'}
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  disabled={downloadingId === version.id}
                  startIcon={<DownloadIcon fontSize="small" />}
                  onClick={() => void handleDownload(version, 'txt')}
                >
                  Download TXT
                </Button>
              </Box>
            </VersionCard>
          ))}
        </VersionsGrid>
      )}
    </Root>
  );
}
