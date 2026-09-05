import { styled } from '@mui/material/styles';

import { LANDING_COPY, LANDING_SECTION_IDS, LANDING_STEPS } from '@/constants/pages/landing';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  iconToneTokens,
  spacing,
  type IconTone,
} from '@/tokens';

import { useInView } from '../hooks/useInView';
import {
  FadeUp,
  Section,
  SectionHeader,
  SectionInner,
  SectionSubtitle,
  SectionTitle,
} from '../styles';

const StepsTrack = styled('ol')({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  position: 'relative',

  '@media (max-width: 1023px)': {
    gap: 0,
    gridTemplateColumns: '1fr',
  },
});

const StepItem = styled('li')({
  display: 'grid',
  gap: spacing[3],
  justifyItems: 'center',
  position: 'relative',
  textAlign: 'center',

  '&:not(:last-child)::after': {
    borderTop: `0.125rem dashed ${colorTokens.borderDefault}`,
    content: '""',
    left: 'calc(50% + 1.75rem)',
    position: 'absolute',
    right: 'calc(-50% + 1.75rem)',
    top: '2.75rem',
  },

  '@media (max-width: 1023px)': {
    alignItems: 'start',
    gap: spacing[2],
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    justifyItems: 'start',
    paddingBottom: spacing[6],
    textAlign: 'left',

    '&:not(:last-child)::after': {
      borderLeft: `0.125rem dashed ${colorTokens.borderDefault}`,
      borderTop: 'none',
      bottom: spacing[1],
      left: '1.7rem',
      right: 'auto',
      top: '3.5rem',
      width: 0,
    },

    '&:last-child': {
      paddingBottom: 0,
    },
  },
});

const StepNumber = styled('span')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  gridColumn: '1 / -1',
  letterSpacing: '0.06em',

  '@media (max-width: 1023px)': {
    display: 'none',
  },
});

const StepBadge = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: IconTone }>(({ tone }) => ({
  alignItems: 'center',
  background: iconToneTokens[tone].background,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.full,
  color: iconToneTokens[tone].color,
  display: 'inline-grid',
  height: '3.5rem',
  justifyItems: 'center',
  position: 'relative',
  width: '3.5rem',
  zIndex: 1,
}));

const StepCopy = styled('div')({
  display: 'grid',
  gap: spacing[1],
  minWidth: 0,

  '@media (min-width: 1024px)': {
    justifyItems: 'center',
  },
});

const StepTitle = styled('h3')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  margin: 0,
});

const StepDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.55,
  margin: 0,
  maxWidth: '12rem',

  '@media (max-width: 1023px)': {
    maxWidth: 'none',
  },
});

export function HowItWorksSection() {
  const { ref, visible } = useInView();

  return (
    <Section aria-labelledby="landing-how-title" id={LANDING_SECTION_IDS.howItWorks} ref={ref}>
      <SectionInner>
        <SectionHeader>
          <SectionTitle id="landing-how-title">{LANDING_COPY.howItWorks.title}</SectionTitle>
          <SectionSubtitle>{LANDING_COPY.howItWorks.subtitle}</SectionSubtitle>
        </SectionHeader>
        <FadeUp visible={visible}>
          <StepsTrack>
            {LANDING_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <StepItem key={step.id}>
                  <StepNumber>{step.step}</StepNumber>
                  <StepBadge tone={step.tone}>
                    <Icon fontSize="small" />
                  </StepBadge>
                  <StepCopy>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </StepCopy>
                </StepItem>
              );
            })}
          </StepsTrack>
        </FadeUp>
      </SectionInner>
    </Section>
  );
}
