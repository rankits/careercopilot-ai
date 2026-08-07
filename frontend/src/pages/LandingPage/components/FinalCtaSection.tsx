import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import ctaPenguinUrl from '@/assets/logo/career-copilot-penguin.png';
import { LANDING_COPY, LANDING_SECTION_IDS } from '@/constants/pages/landing';
import { ROUTES } from '@/constants/routes';
import { borderRadius, colorTokens, fontSize, fontWeight, shadows, spacing } from '@/tokens';

import { useInView } from '../hooks/useInView';
import { FadeUp } from '../styles';

const Band = styled('section')({
  background: `linear-gradient(115deg, ${colorTokens.actionPrimary} 0%, ${colorTokens.actionPrimaryHover} 55%, ${colorTokens.actionPrimaryActive} 100%)`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  margin: `0 auto ${spacing[16]}`,
  maxWidth: '72rem',
  overflow: 'hidden',
  padding: `${spacing[10]} ${spacing[8]}`,
  width: `calc(100% - ${spacing[8]})`,

  '@media (max-width: 1023px)': {
    width: `calc(100% - ${spacing[8]})`,
  },

  '@media (max-width: 48rem)': {
    marginBottom: spacing[12],
    padding: spacing[6],
    width: `calc(100% - ${spacing[6]})`,
  },

  '@media (max-width: 30rem)': {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: `calc(100% - ${spacing[4]})`,
  },
});

const Grid = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[6],
  gridTemplateColumns: 'minmax(0, 1.2fr) auto',

  '@media (max-width: 48rem)': {
    gridTemplateColumns: '1fr',
    justifyItems: 'center',
    textAlign: 'center',
  },
});

const Copy = styled('div')({
  display: 'grid',
  gap: spacing[3],
});

const Title = styled('h2')({
  color: colorTokens.textInverse,
  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.03em',
  margin: 0,
  overflowWrap: 'anywhere',
});

const Subtitle = styled('p')({
  color: colorTokens.actionPrimarySubtle,
  fontSize: fontSize.base,
  lineHeight: 1.6,
  margin: 0,
  maxWidth: '34rem',
});

const Actions = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],

  '@media (max-width: 48rem)': {
    justifyContent: 'center',
    width: '100%',
    '& > *': {
      flex: '1 1 auto',
      minWidth: '10rem',
    },
  },

  '@media (max-width: 30rem)': {
    '& > *': {
      flex: '1 1 100%',
    },
  },
});

const Mascot = styled('img')({
  height: 'auto',
  maxWidth: '11rem',
  width: '100%',
});

const WhiteButtonSx = {
  bgcolor: colorTokens.backgroundCard,
  boxShadow: 'none',
  color: colorTokens.actionPrimary,
  '&:hover': {
    bgcolor: colorTokens.actionPrimarySubtle,
    boxShadow: 'none',
    color: colorTokens.actionPrimaryHover,
  },
} as const;

const OutlineOnBlueSx = {
  bgcolor: 'transparent',
  borderColor: colorTokens.textInverse,
  color: colorTokens.textInverse,
  '&:hover': {
    bgcolor: 'rgba(255, 255, 255, 0.12)',
    borderColor: colorTokens.textInverse,
    color: colorTokens.textInverse,
  },
} as const;

export function FinalCtaSection() {
  const { ref, visible } = useInView();

  return (
    <Box ref={ref}>
      <FadeUp visible={visible}>
        <Band aria-labelledby="landing-final-cta-title" id={LANDING_SECTION_IDS.about}>
          <Grid>
            <Copy>
              <Title id="landing-final-cta-title">{LANDING_COPY.finalCta.title}</Title>
              <Subtitle>{LANDING_COPY.finalCta.subtitle}</Subtitle>
              <Actions>
                <Button component={RouterLink} sx={WhiteButtonSx} to={ROUTES.REGISTER}>
                  {LANDING_COPY.finalCta.primaryCta}
                </Button>
                <Button
                  component="a"
                  href={`#${LANDING_SECTION_IDS.features}`}
                  sx={OutlineOnBlueSx}
                  variant="outline"
                >
                  {LANDING_COPY.finalCta.secondaryCta}
                </Button>
              </Actions>
            </Copy>
            <Mascot
              alt="Career Copilot penguin celebrating career success"
              height={180}
              loading="lazy"
              src={ctaPenguinUrl}
              width={180}
            />
          </Grid>
        </Band>
      </FadeUp>
    </Box>
  );
}
