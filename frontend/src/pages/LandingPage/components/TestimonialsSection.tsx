import { useState } from 'react';

import { LANDING_COPY, LANDING_SECTION_IDS, LANDING_TESTIMONIALS } from '@/constants/pages/landing';
import { ChevronLeftIcon, ChevronRightIcon, IconButton, StarIcon, styled } from '@/lib/material';
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
  Section,
  SectionHeader,
  SectionInner,
  SectionSubtitle,
  SectionTitle,
} from '../styles';

const Shell = styled('div')({
  display: 'grid',
  gap: spacing[4],
  minWidth: 0,
});

const Track = styled('div')({
  display: 'grid',
  gap: spacing[4],
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  minWidth: 0,

  '@media (max-width: 1023px)': {
    gridTemplateColumns: '1fr',
  },
});

const Card = styled('article')({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderDefault}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.card,
  display: 'grid',
  gap: spacing[3],
  minWidth: 0,
  padding: spacing[5],

  '@media (max-width: 48rem)': {
    padding: spacing[4],
  },
});

const DesktopOnlyCard = styled(Card)({
  '@media (max-width: 1023px)': {
    display: 'none',
  },
});

const MobileCarousel = styled('div')({
  display: 'none',

  '@media (max-width: 1023px)': {
    display: 'grid',
    gap: spacing[3],
  },
});

const HeaderRow = styled('div')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  minWidth: 0,
});

const Avatar = styled('div')({
  alignItems: 'center',
  background: colorTokens.actionPrimarySubtle,
  borderRadius: borderRadius.full,
  color: colorTokens.actionPrimary,
  display: 'grid',
  flexShrink: 0,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.extraBold,
  height: '2.75rem',
  justifyItems: 'center',
  width: '2.75rem',
});

const Name = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  margin: 0,
});

const Role = styled('p')({
  color: colorTokens.textTertiary,
  fontSize: fontSize.sm,
  margin: 0,
});

const Feedback = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
});

const Stars = styled('div')({
  color: colorTokens.feedbackWarning,
  display: 'flex',
  gap: spacing[1],
});

const NavButtons = styled('div')({
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'center',
});

function TestimonialCard({
  feedback,
  initials,
  name,
  role,
}: {
  feedback: string;
  initials: string;
  name: string;
  role: string;
}) {
  return (
    <Card>
      <HeaderRow>
        <Avatar aria-hidden="true">{initials}</Avatar>
        <div>
          <Name>{name}</Name>
          <Role>{role}</Role>
        </div>
      </HeaderRow>
      <Feedback>“{feedback}”</Feedback>
      <Stars aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon fontSize="small" key={index} />
        ))}
      </Stars>
    </Card>
  );
}

export function TestimonialsSection() {
  const { ref, visible } = useInView();
  const [active, setActive] = useState(0);
  const current = LANDING_TESTIMONIALS[active] ?? LANDING_TESTIMONIALS[0];

  const prev = () =>
    setActive((value) => (value - 1 + LANDING_TESTIMONIALS.length) % LANDING_TESTIMONIALS.length);
  const next = () => setActive((value) => (value + 1) % LANDING_TESTIMONIALS.length);

  return (
    <Section
      aria-labelledby="landing-testimonials-title"
      id={LANDING_SECTION_IDS.testimonials}
      ref={ref}
    >
      <SectionInner>
        <SectionHeader>
          <SectionTitle id="landing-testimonials-title">
            {LANDING_COPY.testimonials.title}
          </SectionTitle>
          <SectionSubtitle>{LANDING_COPY.testimonials.subtitle}</SectionSubtitle>
        </SectionHeader>
        <FadeUp visible={visible}>
          <Shell>
            <Track>
              {LANDING_TESTIMONIALS.map((item) => (
                <DesktopOnlyCard key={item.id}>
                  <HeaderRow>
                    <Avatar aria-hidden="true">{item.initials}</Avatar>
                    <div>
                      <Name>{item.name}</Name>
                      <Role>{item.role}</Role>
                    </div>
                  </HeaderRow>
                  <Feedback>“{item.feedback}”</Feedback>
                  <Stars aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <StarIcon fontSize="small" key={index} />
                    ))}
                  </Stars>
                </DesktopOnlyCard>
              ))}
            </Track>

            <MobileCarousel aria-live="polite">
              {current ? (
                <TestimonialCard
                  feedback={current.feedback}
                  initials={current.initials}
                  name={current.name}
                  role={current.role}
                />
              ) : null}
              <NavButtons>
                <IconButton aria-label="Previous testimonial" onClick={prev}>
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton aria-label="Next testimonial" onClick={next}>
                  <ChevronRightIcon />
                </IconButton>
              </NavButtons>
            </MobileCarousel>
          </Shell>
        </FadeUp>
      </SectionInner>
    </Section>
  );
}
