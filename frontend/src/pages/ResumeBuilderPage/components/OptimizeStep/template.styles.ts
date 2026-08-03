import { Box, styled } from '@/lib/material';
import { colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

import { borderRadius, muted, t } from '../../styles/shared';

/** Approx A4 height at 96dpi — used for page-break guides in live preview. */
export const A4_PAGE_HEIGHT_PX = 1122;

export const PreviewFrame = styled(Box)({
  background: 'linear-gradient(180deg, #e2e8f0 0%, #eef2f7 100%)',
  borderRadius: borderRadius['2xl'],
  display: 'grid',
  gap: spacing[3],
  padding: spacing[3],
  width: '100%',
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
  textTransform: 'uppercase',
  width: '100%',
  '&::before, &::after': {
    background: 'repeating-linear-gradient(90deg, #94a3b8 0 6px, transparent 6px 12px)',
    content: '""',
    flex: 1,
    height: 1,
    maxWidth: '8rem',
  },
});

const pageSheetBase = {
  background: '#ffffff',
  borderRadius: borderRadius.lg,
  boxShadow: '0 14px 36px rgba(15, 23, 42, 0.12)',
  boxSizing: 'border-box' as const,
  color: '#0f172a',
  display: 'grid',
  gap: spacing[3],
  maxWidth: '100%',
  minHeight: `${A4_PAGE_HEIGHT_PX}px`,
  padding: `${spacing[6]} ${spacing[5]}`,
  position: 'relative' as const,
  width: 'min(100%, 50rem)',
  // Keep blocks/entries together so preview/print don't split mid-item.
  '& .block, & .entry, & .skills, & .header, & .sidebar, & .main': {
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
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[2],
  },
  '& .skill': {
    background: t.primarySofter,
    border: `1px solid ${t.primarySoft}`,
    borderRadius: borderRadius.full,
    color: t.primaryHover,
    fontSize: '0.72rem',
    fontWeight: fontWeight.semiBold,
    padding: `0.3rem ${spacing[3]}`,
  },
  '& .entry': {
    display: 'grid',
    gap: spacing[1],
    marginBottom: spacing[2],
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
    margin: `${spacing[1]} 0 0`,
    paddingLeft: '1.15rem',
    '& li': {
      color: '#1e293b',
      fontSize: '0.84rem',
      lineHeight: 1.55,
      marginBottom: '0.35rem',
      overflowWrap: 'anywhere' as const,
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
  border: '1px solid #d7dee8',
  '& .badge': {
    ...muted,
    fontSize: '0.7rem',
    fontWeight: fontWeight.extraBold,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  '& .name': { fontSize: '1.45rem', fontWeight: fontWeight.bold },
  '& .role': { color: '#334155', fontWeight: fontWeight.semiBold },
  '& .heading': {
    borderBottom: '1.5px solid #cbd5e1',
    color: '#0f172a',
  },
  '& .skill': {
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#334155',
  },
});

export const ClassicPaper = styled(Box)({
  ...pageSheetBase,
  border: '1px solid #e2e8f0',
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
  '& .skill': {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: borderRadius.md,
    color: '#0f172a',
  },
});

export const ModernPaper = styled(Box)({
  ...pageSheetBase,
  border: '1px solid #e2e8f0',
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
});

export const MinimalPaper = styled(Box)({
  ...pageSheetBase,
  border: '1px solid #e5e7eb',
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  gap: spacing[3],
  '& .name': { fontSize: fontSize['3xl'], letterSpacing: '-0.02em' },
  '& .role': { color: '#374151', fontWeight: fontWeight.medium },
  '& .heading': {
    borderBottom: '1px solid #d1d5db',
    color: '#111827',
  },
  '& .skill': {
    background: '#f3f4f6',
    borderRadius: borderRadius.md,
    color: '#111827',
  },
});

export const ExecutivePaper = styled(Box)({
  ...pageSheetBase,
  border: '1px solid #e2e8f0',
  gap: 0,
  overflow: 'hidden',
  padding: 0,
  '& .exec-layout': {
    display: 'grid',
    gridTemplateColumns: '12rem minmax(0, 1fr)',
    minHeight: `${A4_PAGE_HEIGHT_PX}px`,
    '@media (max-width: 40rem)': {
      gridTemplateColumns: '1fr',
    },
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
  '& .sidebar .skill': {
    background: 'rgba(147,197,253,0.15)',
    border: '1px solid rgba(147,197,253,0.25)',
    color: '#e2e8f0',
  },
  '& .main': {
    alignContent: 'start',
    display: 'grid',
    gap: spacing[3],
    padding: spacing[4],
  },
  '& .main .heading': {
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
  },
});
