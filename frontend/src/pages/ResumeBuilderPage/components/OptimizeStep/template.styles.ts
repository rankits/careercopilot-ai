import { Box, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import { borderRadius, muted, t } from '../../styles/shared';

/** A4 at 96dpi (210mm × 297mm) — preview page frame size. */
export const A4_PAGE_WIDTH_PX = 794;
export const A4_PAGE_HEIGHT_PX = 1123;
/** Matches PDF page padding (36pt) for preview/PDF parity. */
export const A4_PAGE_MARGIN_PX = 36;
/** Usable content height inside each page after top+bottom margins. */
export const A4_PAGE_CONTENT_HEIGHT_PX = A4_PAGE_HEIGHT_PX - A4_PAGE_MARGIN_PX * 2;
/** @deprecated Use A4_PAGE_MARGIN_PX */
export const A4_PAGE_TOP_PAD_PX = A4_PAGE_MARGIN_PX;

export const PreviewFrame = styled(Box)({
  background: 'linear-gradient(180deg, #e2e8f0 0%, #eef2f7 100%)',
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[3],
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'hidden',
  padding: spacing[3],
  width: '100%',
  '@media (max-width: 40rem)': {
    padding: spacing[2],
  },
});

export const PageStack = styled(Box)({
  display: 'grid',
  gap: spacing[4],
  justifyItems: 'center',
  width: '100%',
});

export const PageBreakLabel = styled(Box)({
  alignItems: 'center',
  color: '#64748b',
  display: 'flex',
  fontSize: '0.68rem',
  fontWeight: fontWeight.semiBold,
  gap: spacing[2],
  justifyContent: 'center',
  letterSpacing: '0.06em',
  marginBottom: spacing[2],
  marginTop: spacing[2],
  textTransform: 'uppercase',
  width: '100%',
});

const pageSheetBase = {
  background: '#ffffff',
  boxSizing: 'border-box' as const,
  color: '#0f172a',
  display: 'grid',
  gap: spacing[3],
  // Continuous content sheet — page frames supply exact A4 size + margins.
  minHeight: 0,
  padding: 0,
  position: 'relative' as const,
  width: '100%',
  // Keep blocks/entries together so preview/print don't split mid-item.
  '& .block, & .entry, & .skills, & .skills-list, & .header, & .sidebar, & .main': {
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    WebkitColumnBreakInside: 'avoid',
  },
  '& .bullets li, & .heading, & .entry-title, & .name, & .role': {
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    WebkitColumnBreakInside: 'avoid',
  },
  '& .name': {
    color: '#0f172a',
    fontSize: '1.7rem',
    fontWeight: fontWeight.extraBold,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  '& .role': {
    color: t.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  '& .contact': {
    color: '#64748b',
    display: 'flex',
    flexWrap: 'wrap' as const,
    fontSize: '0.78rem',
    gap: `${spacing[1]} ${spacing[3]}`,
  },
  '& .block': {
    display: 'grid',
    gap: spacing[2],
  },
  '& .heading': {
    borderBottom: `1.5px solid ${t.primarySoft}`,
    color: t.primary,
    fontSize: '0.72rem',
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.08em',
    paddingBottom: spacing[1],
    textTransform: 'uppercase' as const,
  },
  '& .body': {
    color: '#1e293b',
    fontSize: '0.875rem',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap' as const,
    overflowWrap: 'anywhere' as const,
  },
  '& .skills': {
    color: '#1e293b',
    fontSize: '0.875rem',
    lineHeight: 1.7,
    overflowWrap: 'anywhere' as const,
  },
  '& .skills-list': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    listStyle: 'none',
    margin: `${spacing[1]} 0 0`,
    padding: 0,
  },
  '& .skill-item': {
    background: 'rgba(15, 23, 42, 0.04)',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '999px',
    color: '#0f172a',
    display: 'inline-flex',
    fontSize: '0.78rem',
    fontWeight: fontWeight.semiBold,
    letterSpacing: '0.01em',
    lineHeight: 1.3,
    listStyle: 'none',
    maxWidth: '100%',
    overflowWrap: 'anywhere' as const,
    padding: '0.28rem 0.7rem',
    position: 'relative' as const,
    '&::before': {
      content: 'none',
    },
  },
  '& .entry': {
    display: 'grid',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  '& .entry-project': {
    marginBottom: spacing[3],
    paddingBottom: spacing[1],
  },
  '& .entry-top': {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  '& .entry-title': {
    color: '#0f172a',
    fontSize: '0.9rem',
    fontWeight: fontWeight.bold,
  },
  '& .project-title': {
    color: '#0f172a',
    fontSize: '0.95rem',
    fontWeight: fontWeight.extraBold,
    letterSpacing: '-0.01em',
  },
  '& .entry-company': {
    color: '#475569',
    fontSize: '0.8rem',
    fontWeight: fontWeight.medium,
    marginTop: '0.1rem',
  },
  '& .entry-dates': {
    color: '#64748b',
    fontSize: '0.72rem',
    fontWeight: fontWeight.semiBold,
    whiteSpace: 'nowrap' as const,
  },
  '& .bullets': {
    listStyle: 'none',
    margin: `${spacing[1]} 0 0`,
    padding: 0,
    '& li': {
      color: '#1e293b',
      display: 'list-item',
      fontSize: '0.84rem',
      lineHeight: 1.55,
      listStyle: 'none',
      marginBottom: '0.45rem',
      overflowWrap: 'anywhere' as const,
      paddingLeft: '1rem',
      position: 'relative' as const,
      '&::before': {
        color: '#0f172a',
        content: '"•"',
        fontSize: '0.95rem',
        fontWeight: fontWeight.bold,
        left: 0,
        lineHeight: 1.45,
        position: 'absolute' as const,
        top: 0,
      },
    },
  },
  '& .empty': {
    ...muted,
    textAlign: 'center' as const,
    padding: spacing[6],
  },
  '@media print': {
    boxShadow: 'none',
    minHeight: 'auto',
    pageBreakAfter: 'always',
    width: '210mm',
  },
};

export const OriginalPaper = styled(Box)({
  ...pageSheetBase,
  fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  '& .badge': {
    color: '#64748b',
    fontSize: '0.65rem',
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.1em',
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  '& .name': {
    color: '#0f172a',
    fontSize: '1.65rem',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.01em',
  },
  '& .role': {
    color: '#475569',
    fontSize: '0.95rem',
    fontWeight: fontWeight.semiBold,
  },
  '& .contact': {
    borderBottom: '1.5px solid #0f172a',
    color: '#64748b',
    paddingBottom: spacing[2],
  },
  '& .heading': {
    borderBottom: '2px solid #0f172a',
    color: '#0f172a',
    letterSpacing: '0.06em',
  },
  '& .skill-item': {
    background: 'rgba(15, 23, 42, 0.05)',
    borderColor: 'rgba(15, 23, 42, 0.14)',
    color: '#1e293b',
    fontSize: '0.8rem',
    '&::before': {
      content: 'none',
    },
  },
  '& .project-title': {
    fontSize: '1rem',
  },
  '& .original-fallback': {
    color: '#1e293b',
    fontSize: '0.875rem',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
});

export const ClassicPaper = styled(Box)({
  ...pageSheetBase,
  fontFamily: '"Georgia", "Times New Roman", serif',
  '& .name': {
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: '1.85rem',
    textAlign: 'center',
  },
  '& .role': {
    color: '#1e293b',
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: '0.95rem',
    fontWeight: fontWeight.semiBold,
    textAlign: 'center',
  },
  '& .contact': {
    borderBottom: '1px solid #cbd5e1',
    justifyContent: 'center',
    paddingBottom: spacing[3],
  },
  '& .heading': {
    borderBottom: '2px solid #0f172a',
    color: '#0f172a',
    fontFamily: '"Segoe UI", sans-serif',
  },
  '& .skills-list': {
    justifyContent: 'flex-start',
  },
  '& .project-title': {
    fontFamily: '"Georgia", "Times New Roman", serif',
  },
});

export const ModernPaper = styled(Box)({
  ...pageSheetBase,
  gap: 0,
  overflow: 'hidden',
  padding: 0,
  '& .header': {
    background: `linear-gradient(135deg, ${t.primary}, ${t.primaryHover})`,
    color: colorTokens.textInverse,
    display: 'grid',
    gap: spacing[2],
    padding: spacing[5],
  },
  '& .header .name': { color: colorTokens.textInverse },
  '& .header .role': { color: 'rgba(255,255,255,0.92)' },
  '& .header .contact': { color: 'rgba(255,255,255,0.82)' },
  '& .content': {
    display: 'grid',
    gap: spacing[3],
    padding: spacing[5],
  },
  '& .heading': {
    borderBottom: `2px solid ${t.primarySoft}`,
    color: t.primary,
  },
  '& .skill-item': {
    background: t.primarySoft,
    borderColor: 'transparent',
    color: t.primary,
    '&::before': { content: 'none' },
  },
  '& .project-title': {
    color: t.primary,
  },
});

export const MinimalPaper = styled(Box)({
  ...pageSheetBase,
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  gap: spacing[3],
  '& .name': { fontSize: fontSize['3xl'], letterSpacing: '-0.02em' },
  '& .role': { color: '#374151', fontWeight: fontWeight.medium },
  '& .heading': {
    borderBottom: '1px solid #d1d5db',
    color: '#111827',
  },
  '& .skill-item': {
    background: '#f3f4f6',
    borderColor: '#e5e7eb',
    color: '#111827',
    '&::before': { content: 'none' },
  },
});

export const ExecutivePaper = styled(Box)({
  ...pageSheetBase,
  gap: 0,
  overflow: 'hidden',
  padding: 0,
  '& .exec-layout': {
    display: 'grid',
    gridTemplateColumns: '12rem minmax(0, 1fr)',
    minHeight: 0,
  },
  '& .sidebar': {
    alignContent: 'start',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'grid',
    gap: spacing[3],
    padding: spacing[4],
  },
  '& .sidebar .name': { color: '#fff', fontSize: fontSize.xl },
  '& .sidebar .role': { color: '#93c5fd' },
  '& .sidebar .contact': {
    color: '#94a3b8',
    flexDirection: 'column',
    gap: spacing[1],
  },
  '& .sidebar .heading': {
    borderBottom: '1px solid rgba(147,197,253,0.25)',
    color: '#93c5fd',
  },
  '& .sidebar .body': { color: '#cbd5e1', fontSize: fontSize.xs },
  '& .sidebar .skills-list': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  '& .sidebar .skill-item': {
    background: 'rgba(147, 197, 253, 0.12)',
    borderColor: 'rgba(147, 197, 253, 0.28)',
    color: '#e2e8f0',
    fontSize: fontSize.xs,
    padding: '0.22rem 0.55rem',
    '&::before': { content: 'none' },
  },
  '& .main': {
    alignContent: 'start',
    display: 'grid',
    gap: spacing[3],
    padding: spacing[4],
  },
  '& .main .project-title': {
    fontSize: '0.95rem',
  },
  '& .main .heading': {
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
  },
});
