import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { LANDING_COPY, LANDING_FEATURES, LANDING_SECTION_IDS } from '@/constants/pages/landing';
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
import {
  FadeUp,
  IconBadge,
  Section,
  SectionHeader,
  SectionInner,
  SectionSubtitle,
  SectionTitle,
} from '../styles';

const FeatureGrid = styled('div')({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  minWidth: 0,

  '@media (max-width: 1023px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
  },
});

const FeatureCard = styled(RouterLink)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  color: 'inherit',
  display: 'grid',
  gap: spacing[2],
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  minWidth: 0,
  padding: spacing[5],
  textDecoration: 'none',
  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',

  '&:hover': {
    borderColor: colorTokens.borderHover,
    transform: 'translateY(-0.15rem)',
  },

  '@media (max-width: 48rem)': {
    padding: spacing[4],
  },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'border-color 180ms ease',
  },
});

const FeatureBody = styled('div')({
  display: 'grid',
  gap: spacing[2],
});

const FeatureTitle = styled('h3')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  margin: 0,
});

const FeatureDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.55,
  margin: 0,
});

const FeatureArrow = styled('span')({
  alignSelf: 'center',
  color: colorTokens.textTertiary,
  display: 'inline-flex',
});

export function FeaturesSection() {
  const { ref, visible } = useInView();

  return (
    <Section aria-labelledby="landing-features-title" id={LANDING_SECTION_IDS.features} ref={ref}>
      <SectionInner>
        <SectionHeader>
          <SectionTitle id="landing-features-title">{LANDING_COPY.features.title}</SectionTitle>
          <SectionSubtitle>{LANDING_COPY.features.subtitle}</SectionSubtitle>
        </SectionHeader>
        <FadeUp visible={visible}>
          <FeatureGrid>
            {LANDING_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <FeatureCard key={feature.id} to={feature.href}>
                  <FeatureBody>
                    <IconBadge tone={feature.tone}>
                      <Icon fontSize="small" />
                    </IconBadge>
                    <FeatureTitle>{feature.title}</FeatureTitle>
                    <FeatureDescription>{feature.description}</FeatureDescription>
                  </FeatureBody>
                  <FeatureArrow aria-hidden="true">
                    <ArrowForwardIcon fontSize="small" />
                  </FeatureArrow>
                </FeatureCard>
              );
            })}
          </FeatureGrid>
        </FadeUp>
      </SectionInner>
    </Section>
  );
}
