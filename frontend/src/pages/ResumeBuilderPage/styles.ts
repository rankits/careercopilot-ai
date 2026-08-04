import { Box, styled } from '@/lib/material';

export const Root = styled(Box)({
  background: 'radial-gradient(circle at 15% 0%, rgba(37, 99, 235, 0.08), transparent 28rem), #fff',
  display: 'grid',
  marginInline: 'auto',
  maxWidth: '100rem',
  minHeight: 'calc(100vh - 4rem)',
  width: '100%',
});
