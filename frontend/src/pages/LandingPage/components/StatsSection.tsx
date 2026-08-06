import { LANDING_COPY, LANDING_STATS } from '@/constants/pages/landing';
import { styled } from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/tokens';

import { useInView } from '../hooks/useInView';
import { FadeUp, IconBadge, Section, SectionInner } from '../styles';

const StatsPanel = styled('div')({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  overflow: 'hidden',

  '@media (max-width: 1023px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 36rem)': {
    gridTemplateColumns: '1fr',
  },
});

const StatItem = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'center',
  minWidth: 0,
  padding: `${spacing[6]} ${spacing[3]}`,
  textAlign: 'center',

  '&:not(:last-child)': {
    borderRight: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  },

  '@media (max-width: 1023px)': {
    '&:nth-of-type(2)': {
      borderRight: 'none',
    },
    '&:nth-of-type(1), &:nth-of-type(2)': {
      borderBottom: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
    },
  },

  '@media (max-width: 36rem)': {
    borderRight: 'none !important',
    '&:not(:last-child)': {
      borderBottom: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
    },
  },
});

const StatValue = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.03em',
  margin: 0,
});

const StatLabel = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  margin: 0,
});

export function StatsSection() {
  const { ref, visible } = useInView();

  return (
    <Section aria-label={LANDING_COPY.stats.title} ref={ref}>
      <SectionInner>
        <FadeUp visible={visible}>
          <StatsPanel>
            {LANDING_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <StatItem key={stat.id}>
                  <IconBadge>
                    <Icon fontSize="small" />
                  </IconBadge>
                  <StatValue>{stat.value}</StatValue>
                  <StatLabel>{stat.label}</StatLabel>
                </StatItem>
              );
            })}
          </StatsPanel>
        </FadeUp>
      </SectionInner>
    </Section>
  );
}
