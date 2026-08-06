import { Button } from '@/components/atoms/Button';

import heroPenguinUrl from '@/assets/illustrations/penguine-hero-section.png';
import { LANDING_COPY, LANDING_SECTION_IDS } from '@/constants/pages/landing';
import {
  CheckCircleOutlineIcon,
  CircularProgress,
  PlayArrowIcon,
  SendOutlinedIcon,
  ShowChartOutlinedIcon,
  styled,
} from '@/lib/material';
import {
  borderRadius,
  borderWidth,
  colorTokens,
  fontSize,
  fontWeight,
  iconToneTokens,
  shadows,
  spacing,
  type IconTone,
} from '@/tokens';

import { Section, SectionInner } from '../styles';

const HeroGrid = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[10],
  gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
  paddingTop: spacing[4],

  /* Stack only below tablet landscape / phones — keep desktop layout at 1024 */
  '@media (max-width: 48rem)': {
    gap: spacing[6],
    gridTemplateColumns: '1fr',
  },
});

const HeroCopy = styled('div')({
  display: 'grid',
  gap: spacing[5],
  minWidth: 0,

  '@media (max-width: 48rem)': {
    gap: spacing[4],
  },
});

const Badge = styled('span')({
  background: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'inline-flex',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.extraBold,
  letterSpacing: '0.06em',
  maxWidth: '100%',
  padding: `${spacing[1]} ${spacing[3]}`,
  textTransform: 'uppercase',
  width: 'fit-content',
});

const Title = styled('h1')({
  color: colorTokens.textPrimary,
  fontSize: 'clamp(1.75rem, 4.2vw, 3.25rem)',
  fontWeight: fontWeight.extraBold,
  letterSpacing: '-0.04em',
  lineHeight: 1.15,
  margin: 0,
  overflowWrap: 'anywhere',
});

const Accent = styled('span')({
  color: colorTokens.actionPrimary,
});

const TitleLine = styled('span')({
  display: 'block',
});

const Subtitle = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: 'clamp(1rem, 2.2vw, 1.125rem)',
  lineHeight: 1.65,
  margin: 0,
  maxWidth: '36rem',
});

const BenefitList = styled('ul')({
  display: 'grid',
  gap: spacing[3],
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const BenefitItem = styled('li')({
  alignItems: 'flex-start',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto minmax(0, 1fr)',
});

const BenefitIcon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: IconTone }>(({ tone }) => ({
  alignItems: 'center',
  background: iconToneTokens[tone].background,
  borderRadius: borderRadius.full,
  color: iconToneTokens[tone].color,
  display: 'inline-grid',
  flexShrink: 0,
  height: spacing[10],
  justifyItems: 'center',
  width: spacing[10],
}));

const BenefitTitle = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  margin: `0 0 ${spacing[1]}`,
});

const BenefitDescription = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  margin: 0,
});

const CtaRow = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[2],

  '@media (max-width: 30rem)': {
    '& > *': {
      flex: '1 1 100%',
    },
  },
});

const TrustRow = styled('ul')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${spacing[2]} ${spacing[3]}`,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const TrustItem = styled('li')({
  alignItems: 'center',
  color: colorTokens.textSecondary,
  display: 'inline-flex',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  gap: spacing[1],
});

const Visual = styled('div')({
  display: 'grid',
  gap: spacing[4],
  justifyItems: 'center',
  minWidth: 0,
  width: '100%',
});

const Stage = styled('div')({
  display: 'grid',
  justifyItems: 'center',
  maxWidth: '28rem',
  minHeight: '20rem',
  overflow: 'visible',
  position: 'relative',
  width: '100%',

  '@media (max-width: 48rem)': {
    maxWidth: '22rem',
    minHeight: '16rem',
  },
});

const Platform = styled('div')({
  background: `radial-gradient(circle at center, ${colorTokens.backgroundCard} 0%, ${colorTokens.actionPrimarySurface} 70%, transparent 72%)`,
  borderRadius: '50%',
  height: 'min(20rem, 72%)',
  left: '50%',
  position: 'absolute',
  top: '55%',
  transform: 'translate(-50%, -50%)',
  width: 'min(20rem, 85%)',
  zIndex: 0,
});

const Mascot = styled('img')({
  display: 'block',
  height: 'auto',
  maxWidth: 'min(18rem, 72%)',
  position: 'relative',
  width: '100%',
  zIndex: 1,

  '@media (max-width: 48rem)': {
    maxWidth: 'min(13rem, 62%)',
  },
});

const FloatCard = styled('article', {
  shouldForwardProp: (prop) => prop !== 'position',
})<{ position: 'tl' | 'tr' | 'bl' | 'br' }>(({ position }) => {
  const map = {
    tl: { left: '0%', top: '6%' },
    tr: { right: '0%', top: '12%' },
    bl: { bottom: '8%', left: '0%' },
    br: { bottom: '2%', right: '0%' },
  } as const;

  return {
    ...map[position],
    alignItems: 'center',
    animation: 'landingFloat 4.8s ease-in-out infinite',
    animationDelay: position === 'tr' || position === 'bl' ? '0.7s' : '0s',
    background: colorTokens.backgroundCard,
    border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    display: 'flex',
    gap: spacing[2],
    maxWidth: '9rem',
    padding: `${spacing[2]} ${spacing[3]}`,
    position: 'absolute',
    zIndex: 2,

    '@keyframes landingFloat': {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-0.35rem)' },
    },

    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },

    '@media (max-width: 48rem)': {
      display: 'none',
    },
  };
});

const MetricsGrid = styled('div')({
  display: 'none',
  gap: spacing[2],
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  maxWidth: '28rem',
  width: '100%',

  '@media (max-width: 48rem)': {
    display: 'grid',
  },
});

const MetricCard = styled('article')({
  alignItems: 'center',
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows.card,
  display: 'flex',
  gap: spacing[2],
  minWidth: 0,
  padding: `${spacing[2]} ${spacing[3]}`,
});

const FloatCopy = styled('div')({
  display: 'grid',
  gap: 0,
  minWidth: 0,
});

const FloatLabel = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semiBold,
  lineHeight: 1.2,
  margin: 0,
});

const FloatValue = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.extraBold,
  lineHeight: 1.2,
  margin: 0,
});

const MiniChart = styled('div')({
  alignItems: 'end',
  display: 'flex',
  flexShrink: 0,
  gap: '0.15rem',
  height: '1.5rem',
});

const MiniBar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'h',
})<{ h: string }>(({ h }) => ({
  background: colorTokens.actionPrimary,
  borderRadius: borderRadius.sm,
  display: 'block',
  height: h,
  opacity: 0.85,
  width: '0.28rem',
}));

const ChartIcon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone?: 'primary' | 'success' }>(({ tone = 'success' }) => ({
  alignItems: 'center',
  color: tone === 'primary' ? colorTokens.actionPrimary : colorTokens.actionSuccess,
  display: 'inline-flex',
  flexShrink: 0,
}));

export function HeroSection() {
  const { floating } = LANDING_COPY.hero;

  return (
    <Section aria-label="Hero">
      <SectionInner>
        <HeroGrid>
          <HeroCopy>
            <Badge>{LANDING_COPY.hero.badge}</Badge>
            <Title>
              {LANDING_COPY.hero.titleLead} <Accent>{LANDING_COPY.hero.titleHighlight}</Accent>{' '}
              {LANDING_COPY.hero.titleMid}{' '}
              <TitleLine>
                <Accent>{LANDING_COPY.hero.titleAccent}</Accent>
              </TitleLine>
            </Title>
            <Subtitle>{LANDING_COPY.hero.subtitle}</Subtitle>

            <BenefitList>
              {LANDING_COPY.hero.benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <BenefitItem key={benefit.id}>
                    <BenefitIcon tone={benefit.tone}>
                      <Icon fontSize="small" />
                    </BenefitIcon>
                    <div>
                      <BenefitTitle>{benefit.title}</BenefitTitle>
                      <BenefitDescription>{benefit.description}</BenefitDescription>
                    </div>
                  </BenefitItem>
                );
              })}
            </BenefitList>

            <CtaRow>
              <Button component="a" href={`#${LANDING_SECTION_IDS.features}`} size="large">
                {LANDING_COPY.hero.primaryCta}
              </Button>
              <Button
                component="a"
                href={`#${LANDING_SECTION_IDS.howItWorks}`}
                size="large"
                startIcon={<PlayArrowIcon />}
                variant="outline"
              >
                {LANDING_COPY.hero.secondaryCta}
              </Button>
            </CtaRow>

            <TrustRow aria-label="Trust indicators">
              {LANDING_COPY.hero.trusts.map((item) => (
                <TrustItem key={item}>
                  <CheckCircleOutlineIcon color="primary" fontSize="small" />
                  {item}
                </TrustItem>
              ))}
            </TrustRow>
          </HeroCopy>

          <Visual>
            <Stage>
              <Platform aria-hidden="true" />
              <Mascot
                alt="Career Copilot penguin mascot with graduation cap and briefcase"
                height={420}
                loading="eager"
                src={heroPenguinUrl}
                width={420}
              />

              <FloatCard position="tl">
                <CircularProgress
                  color="success"
                  size={32}
                  thickness={5}
                  value={floating.resumeScore.progress}
                  variant="determinate"
                />
                <FloatCopy>
                  <FloatLabel>{floating.resumeScore.label}</FloatLabel>
                  <FloatValue>{floating.resumeScore.value}</FloatValue>
                </FloatCopy>
              </FloatCard>

              <FloatCard position="tr">
                <ChartIcon aria-hidden="true">
                  <ShowChartOutlinedIcon fontSize="small" />
                </ChartIcon>
                <FloatCopy>
                  <FloatLabel>{floating.aiMatch.label}</FloatLabel>
                  <FloatValue>{floating.aiMatch.value}</FloatValue>
                </FloatCopy>
              </FloatCard>

              <FloatCard position="bl">
                <MiniChart aria-hidden="true">
                  <MiniBar h="40%" />
                  <MiniBar h="70%" />
                  <MiniBar h="55%" />
                  <MiniBar h="90%" />
                </MiniChart>
                <FloatCopy>
                  <FloatLabel>{floating.jobs.label}</FloatLabel>
                  <FloatValue>{floating.jobs.value}</FloatValue>
                </FloatCopy>
              </FloatCard>

              <FloatCard position="br">
                <ChartIcon aria-hidden="true" tone="primary">
                  <SendOutlinedIcon fontSize="small" />
                </ChartIcon>
                <FloatCopy>
                  <FloatLabel>{floating.applied.label}</FloatLabel>
                  <FloatValue>{floating.applied.value}</FloatValue>
                </FloatCopy>
              </FloatCard>
            </Stage>

            <MetricsGrid aria-label="Product highlights">
              <MetricCard>
                <CircularProgress
                  color="success"
                  size={28}
                  thickness={5}
                  value={floating.resumeScore.progress}
                  variant="determinate"
                />
                <FloatCopy>
                  <FloatLabel>{floating.resumeScore.label}</FloatLabel>
                  <FloatValue>{floating.resumeScore.value}</FloatValue>
                </FloatCopy>
              </MetricCard>
              <MetricCard>
                <ChartIcon aria-hidden="true">
                  <ShowChartOutlinedIcon fontSize="small" />
                </ChartIcon>
                <FloatCopy>
                  <FloatLabel>{floating.aiMatch.label}</FloatLabel>
                  <FloatValue>{floating.aiMatch.value}</FloatValue>
                </FloatCopy>
              </MetricCard>
              <MetricCard>
                <MiniChart aria-hidden="true">
                  <MiniBar h="40%" />
                  <MiniBar h="70%" />
                  <MiniBar h="55%" />
                  <MiniBar h="90%" />
                </MiniChart>
                <FloatCopy>
                  <FloatLabel>{floating.jobs.label}</FloatLabel>
                  <FloatValue>{floating.jobs.value}</FloatValue>
                </FloatCopy>
              </MetricCard>
              <MetricCard>
                <ChartIcon aria-hidden="true" tone="primary">
                  <SendOutlinedIcon fontSize="small" />
                </ChartIcon>
                <FloatCopy>
                  <FloatLabel>{floating.applied.label}</FloatLabel>
                  <FloatValue>{floating.applied.value}</FloatValue>
                </FloatCopy>
              </MetricCard>
            </MetricsGrid>
          </Visual>
        </HeroGrid>
      </SectionInner>
    </Section>
  );
}
