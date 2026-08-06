import { Button } from '@/components/atoms';

import { Box, Typography } from '@/lib/material';

type GateAction = {
  label: string;
  onClick: () => void;
  variant?: 'solid' | 'outline';
};

type AnalysisGateBannerProps = {
  title: string;
  body: string;
  primary: GateAction;
  secondary?: GateAction;
};

/** Shared alert strip for Analyze-step gates (invalid target / low JD match). */
export function AnalysisGateBanner({ title, body, primary, secondary }: AnalysisGateBannerProps) {
  return (
    <Box className="invalid-target-banner" role="alert">
      <Typography className="invalid-title">{title}</Typography>
      <Typography className="invalid-body">{body}</Typography>
      <Box className="invalid-actions">
        <Button size="small" onClick={primary.onClick} variant={primary.variant ?? 'solid'}>
          {primary.label}
        </Button>
        {secondary ? (
          <Button size="small" variant={secondary.variant ?? 'outline'} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
