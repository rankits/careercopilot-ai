import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import { DASHBOARD_COPY } from '@/constants/pages/dashboard';
import { ROUTES } from '@/constants/routes';
import { ArrowForwardIcon } from '@/lib/material';

import { CtaBody, CtaCopy, CtaRoot, CtaSubtitle, CtaTitle } from '../styles';

export function ExploreJobsCta() {
  return (
    <CtaRoot>
      <CtaBody>
        <CtaCopy>
          <CtaTitle>{DASHBOARD_COPY.ctaTitle}</CtaTitle>
          <CtaSubtitle>{DASHBOARD_COPY.ctaSubtitle}</CtaSubtitle>
        </CtaCopy>
        <Button
          component={RouterLink}
          endIcon={<ArrowForwardIcon fontSize="small" />}
          to={ROUTES.AI_MATCH}
        >
          {DASHBOARD_COPY.exploreJobs}
        </Button>
      </CtaBody>
    </CtaRoot>
  );
}
