import penguinMascot from '@/assets/logo/career-copilot-penguin.png';
import { DASHBOARD_COPY, DASHBOARD_LIMITS } from '@/constants/pages/dashboard';

import {
  WelcomeCopy,
  WelcomeHeading,
  WelcomeMascot,
  WelcomeRoot,
  WelcomeSubtitle,
} from '../styles';

export interface WelcomeHeaderProps {
  greeting: string;
}

export function WelcomeHeader({ greeting }: WelcomeHeaderProps) {
  return (
    <WelcomeRoot>
      <WelcomeCopy>
        <WelcomeHeading>
          {greeting} <span aria-hidden="true">👋</span>
        </WelcomeHeading>
        <WelcomeSubtitle>{DASHBOARD_COPY.subtitle}</WelcomeSubtitle>
      </WelcomeCopy>
      <WelcomeMascot
        alt=""
        height={DASHBOARD_LIMITS.penguinMaxHeightPx}
        src={penguinMascot}
        width={DASHBOARD_LIMITS.penguinMaxHeightPx}
      />
    </WelcomeRoot>
  );
}
