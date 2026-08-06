import { Typography, Box } from '@/lib/material';

export function PageHeader() {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', m: 0 }}>
        For You
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        Personalized matches from your profile. Generation is explicit - loading this page never
        starts a new run.
      </Typography>
    </Box>
  );
}
