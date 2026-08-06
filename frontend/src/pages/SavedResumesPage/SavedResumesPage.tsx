import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { ResumeTemplatePreview } from '@/pages/ResumeBuilderPage/components/OptimizeStep/ResumeTemplatePreview';

import { ROUTES } from '@/constants/routes';
import {
  AddIcon,
  ArticleOutlinedIcon,
  Box,
  ChevronLeftIcon,
  ChevronRightIcon,
  DeleteOutlineIcon,
  DescriptionOutlinedIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  KeyboardArrowDownIcon,
  Menu,
  MenuItem,
  MoreVertIcon,
  PictureAsPdfOutlinedIcon,
  SearchOutlinedIcon,
  Typography,
  VisibilityOutlinedIcon,
} from '@/lib/material';
import { parseResumeContent } from '@/pages/ResumeBuilderPage/utils';
import { resumeBuilderService, type SavedResumeVersion } from '@/services/resumeBuilder.service';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import {
  ActionChip,
  CardActions,
  CardTop,
  EmptyState,
  JdBlock,
  JdSection,
  MetricsRow,
  PageButton,
  PageHeader,
  Pagination,
  Root,
  ScoreRing,
  SearchField,
  StatusRow,
  Thumb,
  Toolbar,
  ToolbarButton,
  TotalBadge,
  VersionCard,
  VersionsGrid,
  CircularProgress,
} from './styles';

const PAGE_SIZE = 9;

type SortMode = 'newest' | 'oldest' | 'score';

const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Updated (Newest)',
  oldest: 'Oldest',
  score: 'ATS Score',
};

function fileBase(version: SavedResumeVersion): string {
  const role = (version.targetRole || 'resume').replace(/[^\w\- ]+/g, '').trim();
  return `${role || 'resume'}_v${version.id}`.replace(/\s+/g, '_');
}

function scoreTone(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: colorTokens.feedbackSuccess };
  if (score >= 80) return { label: 'Very Good', color: colorTokens.actionSuccess };
  if (score >= 60) return { label: 'Good', color: colorTokens.feedbackWarning };
  return { label: 'Poor', color: colorTokens.feedbackError };
}

function deriveMetrics(version: SavedResumeVersion) {
  const jd = (version.jobDescription || '').toLowerCase();
  const content = (version.content || '').toLowerCase();
  const jdTokens = Array.from(
    new Set(
      jd
        .split(/[^a-z0-9+#.]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && token.length <= 24),
    ),
  ).slice(0, 24);
  const matched = jdTokens.filter((token) => content.includes(token));
  const total = Math.max(jdTokens.length, 1);
  const skillsRatio = matched.length / total;
  const experienceMatch = Math.min(
    99,
    Math.max(35, Math.round(version.atsScore * 0.9 + (content.includes('experience') ? 8 : 0))),
  );
  const projectsMatch = Math.min(
    99,
    Math.max(30, Math.round(version.atsScore * 0.85 + (content.includes('project') ? 10 : 0))),
  );

  return {
    skillsLabel: `${matched.length}/${total}`,
    skillsPct: Math.round(skillsRatio * 100),
    experienceMatch,
    projectsMatch,
  };
}

export function SavedResumesPage() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<SavedResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<SavedResumeVersion | null>(null);
  const [jdDetail, setJdDetail] = useState<SavedResumeVersion | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [cardMenu, setCardMenu] = useState<{
    anchor: HTMLElement;
    version: SavedResumeVersion;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedResumeVersion | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = versions.filter((version) => {
      if (!needle) return true;
      return [version.targetRole, version.label, version.jobDescription, version.resumeFileName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    list = [...list].sort((a, b) => {
      if (sort === 'score') return b.atsScore - a.atsScore;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return list;
  }, [query, sort, versions]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  const handleDownload = useCallback(
    async (version: SavedResumeVersion, format: 'pdf' | 'docx') => {
      const key = `${version.id}:${format}`;
      setDownloadingKey(key);
      try {
        const draft = parseResumeContent(version.content, version.targetRole || '');
        const base = fileBase(version);

        if (format === 'pdf') {
          const { downloadResumePdf } = await import('@/pages/ResumeBuilderPage/exportResume');
          await downloadResumePdf(draft, `${base}.pdf`, 'classic');
          return;
        }

        try {
          const result = await resumeBuilderService.exportResume(version.resumeId, 'docx');
          const link = document.createElement('a');
          link.href = `data:${result.mimeType};base64,${result.content}`;
          link.download = result.fileName || `${base}.docx`;
          link.click();
        } catch {
          const blob = new Blob(
            [`<html><body><pre>${version.content.replace(/</g, '&lt;')}</pre></body></html>`],
            { type: 'application/msword' },
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${base}.doc`;
          link.click();
          URL.revokeObjectURL(url);
        }
      } catch {
        alert('Download failed. Please try again.');
      } finally {
        setDownloadingKey(null);
      }
    },
    [],
  );

  const openCardMenu = (event: MouseEvent<HTMLElement>, version: SavedResumeVersion) => {
    event.stopPropagation();
    setCardMenu({ anchor: event.currentTarget, version });
  };

  const closeCardMenu = () => setCardMenu(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await resumeBuilderService.deleteSavedVersion(deleteTarget.id);
      setVersions((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (preview?.id === deleteTarget.id) setPreview(null);
      setDeleteTarget(null);
    } catch {
      alert('Could not delete this resume. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const previewDraft = useMemo(() => {
    if (!preview) return null;
    return parseResumeContent(preview.content, preview.targetRole || '');
  }, [preview]);

  return (
    <Root>
      <PageHeader>
        <Box>
          <Typography component="h1" fontWeight={fontWeight.extraBold} fontSize={fontSize['2xl']}>
            Saved Resumes
          </Typography>
          <Typography
            color={colorTokens.textSecondary}
            fontSize={fontSize.sm}
            sx={{ mt: spacing[1] }}
          >
            Manage and download your optimized resumes.
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => void navigate(ROUTES.RESUME_BUILDER)}
        >
          Build New Resume
        </Button>
      </PageHeader>

      {!loading && !error && versions.length > 0 ? (
        <Toolbar>
          <SearchField>
            <SearchOutlinedIcon fontSize="small" sx={{ color: colorTokens.textSecondary }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resumes by role or keyword..."
              aria-label="Search saved resumes"
            />
          </SearchField>
          <ToolbarButton
            type="button"
            aria-haspopup="menu"
            aria-expanded={Boolean(sortAnchor)}
            onClick={(event) => setSortAnchor(event.currentTarget)}
          >
            Sort by: {SORT_LABELS[sort]}
            <KeyboardArrowDownIcon fontSize="small" />
          </ToolbarButton>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <MenuItem
                key={mode}
                selected={sort === mode}
                onClick={() => {
                  setSort(mode);
                  setSortAnchor(null);
                }}
              >
                {SORT_LABELS[mode]}
              </MenuItem>
            ))}
          </Menu>
          <TotalBadge>
            <DescriptionOutlinedIcon fontSize="small" />
            {filtered.length} Resume{filtered.length === 1 ? '' : 's'} Total saved
          </TotalBadge>
        </Toolbar>
      ) : null}

      {loading ? (
        <EmptyState>Loading saved resumes…</EmptyState>
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : versions.length === 0 ? (
        <EmptyState>
          <DescriptionOutlinedIcon sx={{ fontSize: 40, opacity: 0.45 }} />
          <Typography fontWeight={fontWeight.semiBold}>No saved resumes yet</Typography>
          <Typography color={colorTokens.textSecondary} fontSize={fontSize.sm}>
            Complete the Resume Builder and tap Save Resume on the export step to save a version
            here.
          </Typography>
          <Button onClick={() => void navigate(ROUTES.RESUME_BUILDER)}>Open Resume Builder</Button>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>No resumes match your search.</EmptyState>
      ) : (
        <>
          <VersionsGrid>
            {pageItems.map((version) => {
              const tone = scoreTone(version.atsScore);
              const metrics = deriveMetrics(version);
              const updated = new Date(version.createdAt);
              const pdfLoading = downloadingKey === `${version.id}:pdf`;
              const docxLoading = downloadingKey === `${version.id}:docx`;
              const jdText = version.jobDescription?.replace(/\s+/g, ' ').trim() || '';
              const hasJd = Boolean(jdText);

              return (
                <VersionCard key={version.id}>
                  <CardTop>
                    <Thumb aria-hidden>
                      <Box className="line" sx={{ width: '80%' }} />
                      <Box className="line" sx={{ width: '95%' }} />
                      <Box className="line" sx={{ width: '70%' }} />
                      <Box className="line" sx={{ width: '88%' }} />
                      <Box className="line" sx={{ width: '60%' }} />
                    </Thumb>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={fontWeight.bold} fontSize={fontSize.sm} noWrap>
                        {version.targetRole || 'Untitled role'}
                      </Typography>
                      <Typography color={colorTokens.textSecondary} fontSize={fontSize.xs} noWrap>
                        {version.label || version.resumeFileName}
                      </Typography>
                      <Typography
                        color={colorTokens.textSecondary}
                        fontSize="0.68rem"
                        sx={{ mt: 0.25 }}
                      >
                        Updated: {updated.toLocaleDateString()} •{' '}
                        {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <ScoreRing>
                      <Box className="score-circle">
                        <CircularProgress
                          className="score-track"
                          variant="determinate"
                          value={100}
                          size={44}
                          thickness={3.5}
                          sx={{ color: colorTokens.borderDefault }}
                        />
                        <CircularProgress
                          className="score-progress"
                          variant="determinate"
                          value={Math.min(100, Math.max(0, Number(version.atsScore) || 0))}
                          size={44}
                          thickness={3.5}
                          sx={{ color: tone.color }}
                        />
                        <Typography className="score-value" sx={{ color: tone.color }}>
                          {Math.round(Number(version.atsScore) || 0)}
                        </Typography>
                      </Box>
                      <Typography className="score-label" sx={{ color: tone.color }}>
                        {tone.label}
                      </Typography>
                    </ScoreRing>
                  </CardTop>

                  <StatusRow>
                    <span className="status">✓ Resume Ready</span>
                    <span className="status">✓ JD Matched</span>
                  </StatusRow>

                  <JdSection>
                    <Typography
                      fontWeight={fontWeight.semiBold}
                      fontSize="0.68rem"
                      color={colorTokens.textSecondary}
                    >
                      Job Description
                    </Typography>
                    <JdBlock>
                      <span className="jd-line" title={hasJd ? jdText : undefined}>
                        {hasJd ? jdText : 'No job description saved for this version.'}
                      </span>
                      {hasJd ? (
                        <button
                          type="button"
                          className="read-more"
                          onClick={() => setJdDetail(version)}
                        >
                          Read more
                        </button>
                      ) : null}
                    </JdBlock>
                  </JdSection>

                  <MetricsRow>
                    <Box>
                      <Typography className="metric-label">Skills Match</Typography>
                      <Typography className="metric-value" sx={{ color: tone.color }}>
                        {metrics.skillsLabel}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography className="metric-label">Experience Match</Typography>
                      <Typography className="metric-value" sx={{ color: tone.color }}>
                        {metrics.experienceMatch}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography className="metric-label">Projects Match</Typography>
                      <Typography className="metric-value" sx={{ color: tone.color }}>
                        {metrics.projectsMatch}%
                      </Typography>
                    </Box>
                  </MetricsRow>

                  <CardActions>
                    <ActionChip type="button" onClick={() => setPreview(version)}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                      Preview
                    </ActionChip>
                    <ActionChip
                      type="button"
                      disabled={pdfLoading}
                      onClick={() => void handleDownload(version, 'pdf')}
                    >
                      <PictureAsPdfOutlinedIcon sx={{ fontSize: 15 }} />
                      {pdfLoading ? '…' : 'PDF'}
                    </ActionChip>
                    <ActionChip
                      type="button"
                      disabled={docxLoading}
                      onClick={() => void handleDownload(version, 'docx')}
                    >
                      <ArticleOutlinedIcon sx={{ fontSize: 15 }} />
                      {docxLoading ? '…' : 'DOCX'}
                    </ActionChip>
                    <ActionChip
                      type="button"
                      aria-label="More options"
                      aria-haspopup="menu"
                      aria-expanded={cardMenu?.version.id === version.id}
                      style={{ marginLeft: 'auto' }}
                      onClick={(event) => openCardMenu(event, version)}
                    >
                      <MoreVertIcon sx={{ fontSize: 15 }} />
                    </ActionChip>
                  </CardActions>
                </VersionCard>
              );
            })}
          </VersionsGrid>

          <Menu
            anchorEl={cardMenu?.anchor ?? null}
            open={Boolean(cardMenu)}
            onClose={closeCardMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                if (!cardMenu) return;
                setDeleteTarget(cardMenu.version);
                closeCardMenu();
              }}
              sx={{
                color: colorTokens.actionDanger,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                gap: spacing[2],
                minHeight: '2.5rem',
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
              Delete resume
            </MenuItem>
          </Menu>

          {pageCount > 1 ? (
            <Pagination>
              <PageButton
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeftIcon fontSize="small" />
              </PageButton>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <PageButton
                  key={pageNumber}
                  type="button"
                  active={pageNumber === page}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PageButton>
              ))}
              <PageButton
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                <ChevronRightIcon fontSize="small" />
              </PageButton>
            </Pagination>
          ) : null}
        </>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete resume?</DialogTitle>
        <DialogContent>
          <Typography fontSize={fontSize.sm} color={colorTokens.textSecondary}>
            This will permanently remove{' '}
            <strong>{deleteTarget?.targetRole || 'this saved resume'}</strong>
            {deleteTarget?.label ? ` (${deleteTarget.label})` : ''}. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            disabled={deleting}
            isLoading={deleting}
            onClick={() => void handleDeleteConfirm()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(jdDetail)} onClose={() => setJdDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>Job Description</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: fontSize.sm }}>
            {jdDetail?.jobDescription || 'No job description saved for this version.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outline" onClick={() => setJdDetail(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} fullWidth maxWidth="md">
        <DialogTitle>{preview?.targetRole || 'Resume preview'}</DialogTitle>
        <DialogContent dividers sx={{ background: colorTokens.backgroundApp }}>
          {previewDraft ? (
            <ResumeTemplatePreview
              draft={previewDraft}
              template="classic"
              targetRole={preview?.targetRole || ''}
            />
          ) : (
            <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: fontSize.sm }}>
              {preview?.content || 'No content'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button variant="outline" onClick={() => setPreview(null)}>
            Close
          </Button>
          {preview ? (
            <Button
              disabled={downloadingKey === `${preview.id}:pdf`}
              onClick={() => void handleDownload(preview, 'pdf')}
            >
              {downloadingKey === `${preview.id}:pdf` ? 'Generating…' : 'Download PDF'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Root>
  );
}
