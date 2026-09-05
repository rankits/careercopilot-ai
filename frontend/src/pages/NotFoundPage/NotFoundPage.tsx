import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { RouteLoading } from '@/routes/components/RouteLoading';

import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { useAppSelector } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';

import {
  NotFoundCard,
  NotFoundDescription,
  NotFoundEyebrow,
  NotFoundIconWrap,
  NotFoundRoot,
  NotFoundTitle,
} from './styles';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isSessionResolved } = useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isSessionResolved) {
    return <RouteLoading label="Loading session" />;
  }

  const handleReturnHome = () => {
    void navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME);
  };

  return (
    <NotFoundRoot>
      <NotFoundCard role="alert">
        <NotFoundIconWrap aria-hidden="true">
          <SearchOffOutlinedIcon fontSize="medium" />
        </NotFoundIconWrap>

        <NotFoundEyebrow>404</NotFoundEyebrow>
        <NotFoundTitle>Page not found</NotFoundTitle>
        <NotFoundDescription>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </NotFoundDescription>

        <Button
          onClick={handleReturnHome}
          size="small"
          startIcon={<HomeOutlinedIcon fontSize="small" />}
          variant="outline"
        >
          Return home
        </Button>
      </NotFoundCard>
    </NotFoundRoot>
  );
}
