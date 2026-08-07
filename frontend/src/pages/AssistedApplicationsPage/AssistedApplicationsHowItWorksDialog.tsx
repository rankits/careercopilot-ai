import { ASSISTED_APPLICATIONS_HOW_IT_WORKS } from '@/constants/pages/assistedApplications';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MuiButton,
  Stack,
  Typography,
} from '@/lib/material';

export interface AssistedApplicationsHowItWorksDialogProps {
  onClose: () => void;
  open: boolean;
}

export function AssistedApplicationsHowItWorksDialog({
  onClose,
  open,
}: AssistedApplicationsHowItWorksDialogProps) {
  const copy = ASSISTED_APPLICATIONS_HOW_IT_WORKS;

  return (
    <Dialog
      aria-labelledby="assisted-applications-how-it-works-title"
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
    >
      <DialogTitle id="assisted-applications-how-it-works-title">{copy.title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2.5 }} variant="body2">
          {copy.intro}
        </Typography>
        <Stack component="ol" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {copy.steps.map((step, index) => (
            <Stack
              alignItems="flex-start"
              component="li"
              direction="row"
              key={step.title}
              spacing={1.5}
            >
              <Box
                aria-hidden="true"
                sx={{
                  alignItems: 'center',
                  bgcolor: 'primary.50',
                  borderRadius: '50%',
                  color: 'primary.main',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  height: 28,
                  justifyContent: 'center',
                  mt: 0.25,
                  width: 28,
                }}
              >
                {index + 1}
              </Box>
              <Box>
                <Typography fontWeight={700} variant="body2">
                  {step.title}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {step.description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onClose} variant="contained">
          {copy.closeLabel}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
