import { styled } from '@/lib/material';
import { borderRadius, jobFeedTokens, spacing } from '@/tokens';

export const VirtualListRoot = styled('div')({
  maxHeight: 'calc(100vh - 15rem)',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  padding: `${spacing[1]} ${spacing[1]} ${spacing[2]} 0`,
  position: 'relative',
  scrollbarColor: `${jobFeedTokens.scrollbarThumb} ${jobFeedTokens.scrollbarTrack}`,
  scrollbarWidth: 'thin',
  width: '100%',

  '&::-webkit-scrollbar': {
    width: spacing[2],
  },

  '&::-webkit-scrollbar-track': {
    background: jobFeedTokens.scrollbarTrack,
    borderRadius: borderRadius.full,
  },

  '&::-webkit-scrollbar-thumb': {
    background: jobFeedTokens.scrollbarThumb,
    borderRadius: borderRadius.full,
  },

  '@media (max-width: 48rem)': {
    maxHeight: '70dvh',
  },
});

export const VirtualListSpacer = styled('div')({
  position: 'relative',
  width: '100%',
});

export const VirtualListItem = styled('div')({
  left: 0,
  position: 'absolute',
  top: 0,
  width: '100%',
});
