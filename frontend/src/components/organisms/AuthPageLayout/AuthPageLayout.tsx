import type { ReactNode } from 'react';

import aiPlatformIllustration from '@/assets/illustrations/ai-platform-illustration.svg';
import careerBoyIllustration from '@/assets/illustrations/career-boy-illustration.svg';
import careerCopilotLogo from '@/assets/logo/career-copilot-full-logo.svg';
import { ROUTES } from '@/constants/routes';
import {
  AutoAwesomeOutlinedIcon,
  BookmarkBorderOutlinedIcon,
  Box,
  CheckCircleOutlineIcon,
  InsightsOutlinedIcon,
  LockOutlinedIcon,
  SearchOutlinedIcon,
  SecurityOutlinedIcon,
  type SvgIconComponent,
} from '@/lib/material';

import * as Styled from './styles';

interface AuthPageLayoutProps {
  children: ReactNode;
  error?: string | null;
  mode: Styled.AuthPageMode;
}

interface Feature {
  description: string;
  icon: SvgIconComponent;
  title: string;
}

const LOGIN_FEATURES: Feature[] = [
  {
    description: 'Opportunities aligned with your experience.',
    icon: SearchOutlinedIcon,
    title: 'Smart Job Matching',
  },
  {
    description: 'Stronger applications with focused insights.',
    icon: InsightsOutlinedIcon,
    title: 'AI-powered guidance',
  },
  {
    description: 'Every application organized in one place.',
    icon: BookmarkBorderOutlinedIcon,
    title: 'Application tracking',
  },
];

const TRUST_ITEMS: Feature[] = [
  {
    description: 'Advanced encryption',
    icon: SecurityOutlinedIcon,
    title: 'Your data is safe',
  },
  {
    description: 'Your data stays private',
    icon: LockOutlinedIcon,
    title: 'Privacy first',
  },
  {
    description: 'Transparent recommendations',
    icon: CheckCircleOutlineIcon,
    title: 'AI you can trust',
  },
];

function LoginFeatureRow({ description, icon: Icon, title }: Feature) {
  return (
    <Styled.LoginFeatureItem>
      <Styled.FeatureIcon size="small">
        <Icon fontSize="small" />
      </Styled.FeatureIcon>
      <Box>
        <Styled.FeatureTitle>{title}</Styled.FeatureTitle>
        <Styled.FeatureDescription>{description}</Styled.FeatureDescription>
      </Box>
    </Styled.LoginFeatureItem>
  );
}

function RegisterFeatureCard({ description, icon: Icon, title }: Feature) {
  return (
    <Styled.RegisterFeatureCard>
      <Styled.FeatureIcon size="large">
        <Icon />
      </Styled.FeatureIcon>
      <Styled.FeatureTitle>{title}</Styled.FeatureTitle>
      <Styled.RegisterFeatureDescription>{description}</Styled.RegisterFeatureDescription>
    </Styled.RegisterFeatureCard>
  );
}

function LoginHero() {
  return (
    <Styled.LoginHeroSection aria-label="Career Copilot product overview" as="section">
      <Styled.HeroCopy>
        <Styled.AiBadge>
          <AutoAwesomeOutlinedIcon fontSize="small" />
          AI-powered career platform
        </Styled.AiBadge>
        <Styled.HeroHeading as="h2">
          Find the right opportunities.{' '}
          <Styled.AccentText as="span">
            Build your dream career.
          </Styled.AccentText>
        </Styled.HeroHeading>
        <Styled.Description>
          Discover roles, optimize your resume, track applications, and prepare for interviews
          with one intelligent career workspace.
        </Styled.Description>
      </Styled.HeroCopy>

      <Styled.LoginFeatureList>
        {LOGIN_FEATURES.map((feature) => (
          <LoginFeatureRow key={feature.title} {...feature} />
        ))}
      </Styled.LoginFeatureList>

      <Styled.LoginVisual>
        <Styled.LoginIllustration
          alt="AI platform illustration"
          src={aiPlatformIllustration}
        />
      </Styled.LoginVisual>
    </Styled.LoginHeroSection>
  );
}

function TrustPanel() {
  return (
    <Styled.TrustPanel aria-label="Security and trust">
      {TRUST_ITEMS.map(({ description, icon: Icon, title }) => (
        <Styled.TrustItem key={title}>
          <Styled.FeatureIcon size="small">
            <Icon fontSize="small" />
          </Styled.FeatureIcon>
          <Box>
            <Styled.FeatureTitle>{title}</Styled.FeatureTitle>
            <Styled.FeatureDescription>{description}</Styled.FeatureDescription>
          </Box>
        </Styled.TrustItem>
      ))}
    </Styled.TrustPanel>
  );
}

function RegisterPanel() {
  return (
    <Styled.RegisterPanel as="aside">
      <Styled.RegisterHeroTop>
        <Styled.RegisterCopy>
          <Styled.RegisterHeading as="h2">
            Start your{' '}
            <Styled.AccentText as="span">
              smarter career
            </Styled.AccentText>{' '}
            journey today
          </Styled.RegisterHeading>
          <Styled.Description>
            Build a stronger profile and make every career move with confidence.
          </Styled.Description>
        </Styled.RegisterCopy>
        <Styled.RegisterIllustration
          alt="Career journey illustration"
          src={careerBoyIllustration}
        />
      </Styled.RegisterHeroTop>
      <Styled.RegisterFeatureList>
        {LOGIN_FEATURES.map((feature) => (
          <RegisterFeatureCard key={feature.title} {...feature} />
        ))}
      </Styled.RegisterFeatureList>
    </Styled.RegisterPanel>
  );
}

export function AuthPageLayout({ children, error, mode }: AuthPageLayoutProps) {
  const isRegister = mode === 'register';

  return (
    <Styled.AuthRoot as="main" mode={mode}>
      <Styled.AuthHeader mode={mode}>
        <Styled.LogoImage
          alt="CareerCopilot"
          mode={mode}
          src={careerCopilotLogo}
        />
        {isRegister ? (
          <Styled.HeaderLoginText>
            Already have an account?{' '}
            <Styled.HeaderLoginLink aria-label="Login from header" href={ROUTES.LOGIN}>
              Login
            </Styled.HeaderLoginLink>
          </Styled.HeaderLoginText>
        ) : null}
      </Styled.AuthHeader>

      <Styled.AuthContent data-testid="auth-page-content" mode={mode}>
        {isRegister ? <RegisterPanel /> : <LoginHero />}
        <Styled.FormColumn mode={mode}>
          <Styled.FormStack mode={mode}>
            {error ? <Styled.ErrorAlert role="alert">{error}</Styled.ErrorAlert> : null}
            {children}
            {!isRegister ? <TrustPanel /> : null}
          </Styled.FormStack>
        </Styled.FormColumn>
      </Styled.AuthContent>
    </Styled.AuthRoot>
  );
}
