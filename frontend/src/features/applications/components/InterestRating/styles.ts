import { StarBorderIcon, StarIcon, styled } from '@/lib/material';
import { fontSize, palette } from '@/tokens';

export const InterestStars = styled('div')({
  alignItems: 'center',
  display: 'inline-flex',
  flexWrap: 'nowrap',
  gap: '0.125rem',
});

export const InterestStarButton = styled('button')({
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 0,
});

export const FilledStarIcon = styled(StarIcon)({
  color: palette.orange500,
  fontSize: fontSize.base,
});

export const EmptyStarIcon = styled(StarBorderIcon)({
  color: palette.gray300,
  fontSize: fontSize.base,
});

export const FilledStarIconLarge = styled(FilledStarIcon)({
  fontSize: '1.35rem',
});

export const EmptyStarIconLarge = styled(EmptyStarIcon)({
  fontSize: '1.35rem',
});
