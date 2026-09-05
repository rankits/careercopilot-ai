import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface RouteLoadingProps {
  /** Accessible label for the loading state. */
  label?: string;
}

export function RouteLoading({ label = 'Loading page' }: RouteLoadingProps) {
  return (
    <Box
      aria-busy="true"
      aria-label={label}
      alignItems="center"
      display="flex"
      justifyContent="center"
      minHeight="100vh"
      role="status"
    >
      <CircularProgress aria-hidden="true" />
    </Box>
  );
}
