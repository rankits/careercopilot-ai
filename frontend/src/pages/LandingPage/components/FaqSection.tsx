import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import faqPenguinUrl from '@/assets/illustrations/penguine-faq.png';
import { LANDING_COPY, LANDING_FAQ_ITEMS, LANDING_SECTION_IDS } from '@/constants/pages/landing';
import { borderRadius, borderWidth, colorTokens, spacing } from '@/tokens';

import { useInView } from '../hooks/useInView';
import {
  FadeUp,
  Section,
  SectionHeader,
  SectionInner,
  SectionSubtitle,
  SectionTitle,
} from '../styles';

const FaqLayout = styled('div')({
  alignItems: 'start',
  display: 'grid',
  gap: spacing[8],
  gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
  minWidth: 0,

  /* Keep desktop FAQ layout at 1024; stack only on smaller screens */
  '@media (max-width: 48rem)': {
    gap: spacing[5],
    gridTemplateColumns: '1fr',
  },
});

const FaqArt = styled('div')({
  display: 'grid',
  justifyItems: 'center',
  minWidth: 0,
  paddingTop: spacing[2],
  width: '100%',

  '@media (max-width: 48rem)': {
    order: -1,
    paddingTop: 0,
  },
});

const FaqImage = styled('img')({
  display: 'block',
  height: 'auto',
  maxWidth: 'min(22rem, 100%)',
  width: '100%',
});

const FaqList = styled('div')({
  display: 'grid',
  gap: spacing[2],
  minWidth: 0,
  width: '100%',
});

const FaqAccordion = styled(Accordion)({
  background: colorTokens.backgroundCard,
  border: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  borderRadius: `${borderRadius.xl} !important`,
  boxShadow: 'none',
  margin: 0,
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
  '&::before': { display: 'none' },
  '&.Mui-expanded': {
    margin: 0,
  },
  '& .MuiAccordionSummary-content': {
    margin: `${spacing[2]} 0`,
    minWidth: 0,
  },
  '& .MuiAccordionSummary-root': {
    minHeight: 'auto',
    paddingInline: spacing[3],
  },
  '& .MuiAccordionDetails-root': {
    padding: `0 ${spacing[3]} ${spacing[3]}`,
  },
});

export function FaqSection() {
  const { ref, visible } = useInView();
  const [expanded, setExpanded] = useState<string | false>(false);

  return (
    <Section aria-labelledby="landing-faq-title" id={LANDING_SECTION_IDS.faq} ref={ref}>
      <SectionInner>
        <SectionHeader>
          <SectionTitle id="landing-faq-title">{LANDING_COPY.faq.title}</SectionTitle>
          <SectionSubtitle>{LANDING_COPY.faq.subtitle}</SectionSubtitle>
        </SectionHeader>
        <FadeUp visible={visible}>
          <FaqLayout>
            <FaqArt>
              <FaqImage
                alt="Career Copilot penguin next to a question mark"
                height={360}
                loading="lazy"
                src={faqPenguinUrl}
                width={360}
              />
            </FaqArt>
            <FaqList>
              {LANDING_FAQ_ITEMS.map((item) => (
                <FaqAccordion
                  disableGutters
                  expanded={expanded === item.id}
                  key={item.id}
                  onChange={(_, isExpanded) => setExpanded(isExpanded ? item.id : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere', pr: 1 }}>
                      {item.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">{item.answer}</Typography>
                  </AccordionDetails>
                </FaqAccordion>
              ))}
            </FaqList>
          </FaqLayout>
        </FadeUp>
      </SectionInner>
    </Section>
  );
}
