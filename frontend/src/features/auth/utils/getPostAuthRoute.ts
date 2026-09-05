import { ROUTES } from '@/constants/routes';

export function getPostAuthRoute(isProfileComplete: boolean): string {
  return isProfileComplete ? ROUTES.JOB_FEED : ROUTES.PROFILE;
}
