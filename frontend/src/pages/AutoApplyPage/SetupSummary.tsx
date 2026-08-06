import type { SetupStatusDto } from '@/features/auto-apply/types/autoApply.types';
import {
  CheckIcon,
  HelpOutlineIcon,
  MuiButton,
  Paper,
  Typography,
  Box,
} from '@/lib/material';

interface SetupSummaryProps {
  status: SetupStatusDto | undefined;
  onBrowseJobs: () => void;
}

export function SetupSummary({ status, onBrowseJobs }: SetupSummaryProps) {
  const complete = status?.sections.filter((section) => section.complete).length ?? 0;
  const total = status?.sections.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.035)',
          p: 2,
        }}
        variant="outlined"
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Setup overview</Typography>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              alignItems: 'center',
              border: 5,
              borderColor: 'primary.main',
              borderRadius: '50%',
              display: 'flex',
              flexShrink: 0,
              height: 68,
              justifyContent: 'center',
              width: 68,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {complete}/{total}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Sections completed</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
              Keep your details current for accurate applications.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ bgcolor: 'primary.50', borderRadius: 1.5, p: 1.25 }}>
          <Typography sx={{ color: 'primary.main', fontSize: 11, fontWeight: 700, mb: 0.75 }}>
            Why complete your setup?
          </Typography>
          {['Higher match quality', 'Faster application review', 'Better interview opportunities'].map(
            (benefit) => (
              <Box key={benefit} sx={{ alignItems: 'center', display: 'flex', gap: 0.75, mb: 0.4 }}>
                <CheckIcon color="success" sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 10 }}>{benefit}</Typography>
              </Box>
            ),
          )}
        </Box>
      </Paper>

      {status?.readyForAssistedApply ? (
        <MuiButton fullWidth onClick={onBrowseJobs} size="small" variant="contained">
          Browse matching jobs
        </MuiButton>
      ) : null}

      <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 1, px: 1 }}>
        <HelpOutlineIcon color="primary" sx={{ fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Need help?</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 10 }}>
            Our support team is here to help you finish your setup.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
