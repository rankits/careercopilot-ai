import { Box, CircularProgress } from '@/lib/material';

export function RouteLoading() {
  return (
    <Box
      aria-busy="true"
      aria-label="Loading session"
      alignItems="center"
      display="flex"
      justifyContent="center"
      minHeight="100vh"
      role="status"
    >
      <CircularProgress />
    </Box>
  );
}
