import type { ReactNode } from 'react';

import aiPlatformIllustration from '@/assets/illustrations/ai-platform-illustration.png';
import careerBoyIllustration from '@/assets/illustrations/career-boy-illustration.png';
import careerCopilotLogo from '@/assets/logo/career-copilot-logo.png';
import { ROUTES } from '@/constants/routes';
import { AUTH_PAGE_COPY, LOGIN_FEATURES, TRUST_ITEMS } from '@/constants/ui';
import { AutoAwesomeOutlinedIcon, Box } from '@/lib/material';

import type { AuthPageFeature } from './interfaces';
import * as Styled from './styles';

interface AuthPageLayoutProps {
  children: ReactNode;
  mode: Styled.AuthPageMode;
}

function LoginFeatureRow({ description, icon: Icon, title, tone }: AuthPageFeature) {
  return (
    <Styled.LoginFeatureItem>
      <Styled.FeatureIcon size="small" tone={tone}>
        <Icon fontSize="small" />
      </Styled.FeatureIcon>
      <Box>
        <Styled.FeatureTitle>{title}</Styled.FeatureTitle>
        <Styled.FeatureDescription>{description}</Styled.FeatureDescription>
      </Box>
    </Styled.LoginFeatureItem>
  );
}

function RegisterFeatureCard({ description, icon: Icon, title, tone }: AuthPageFeature) {
  return (
    <Styled.RegisterFeatureCard>
      <Styled.FeatureIcon size="large" tone={tone}>
        <Icon />
      </Styled.FeatureIcon>
      <Styled.FeatureTitle>{title}</Styled.FeatureTitle>
      <Styled.RegisterFeatureDescription>{description}</Styled.RegisterFeatureDescription>
    </Styled.RegisterFeatureCard>
  );
}

function LoginHero() {
  return (
    <Styled.LoginHeroSection aria-label={AUTH_PAGE_COPY.productOverviewAria} as="section">
      <Styled.HeroCopy>
        <Styled.AiBadge>
          <AutoAwesomeOutlinedIcon fontSize="small" />
          {AUTH_PAGE_COPY.aiBadge}
        </Styled.AiBadge>
        <Styled.HeroHeading as="h2">
          {AUTH_PAGE_COPY.heroHeadingText}{' '}
          <Styled.AccentText as="span">{AUTH_PAGE_COPY.heroHeadingAccent}</Styled.AccentText>
        </Styled.HeroHeading>
        <Styled.Description>{AUTH_PAGE_COPY.heroDescription}</Styled.Description>
      </Styled.HeroCopy>

      <Styled.LoginFeatureList>
        {LOGIN_FEATURES.map((feature) => (
          <LoginFeatureRow key={feature.title} {...feature} />
        ))}
      </Styled.LoginFeatureList>

      <Styled.LoginVisual>
        <Styled.LoginIllustration alt={AUTH_PAGE_COPY.aiPlatformAlt} src={aiPlatformIllustration} />
      </Styled.LoginVisual>
    </Styled.LoginHeroSection>
  );
}

function TrustPanel() {
  return (
    <Styled.TrustPanel aria-label={AUTH_PAGE_COPY.securityAria}>
      {TRUST_ITEMS.map(({ description, icon: Icon, title, tone }) => (
        <Styled.TrustItem key={title}>
          <Styled.FeatureIcon size="small" tone={tone}>
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
            {AUTH_PAGE_COPY.registerHeadingText}
            <Styled.AccentText as="span">{AUTH_PAGE_COPY.registerHeadingAccent}</Styled.AccentText>
            {AUTH_PAGE_COPY.registerHeadingSuffix}
          </Styled.RegisterHeading>
          <Styled.Description>{AUTH_PAGE_COPY.registerDescription}</Styled.Description>
        </Styled.RegisterCopy>
        <Styled.RegisterIllustration
          alt={AUTH_PAGE_COPY.careerJourneyAlt}
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

export function AuthPageLayout({ children, mode }: AuthPageLayoutProps) {
  const isRegister = mode === 'register';

  return (
    <Styled.AuthRoot as="main" mode={mode}>
      <Styled.AuthHeader mode={mode}>
        <Styled.LogoImage alt={AUTH_PAGE_COPY.logoAlt} mode={mode} src={careerCopilotLogo} />
        {isRegister ? (
          <Styled.HeaderLoginText>
            {AUTH_PAGE_COPY.alreadyHaveAccount}{' '}
            <Styled.HeaderLoginLink
              aria-label={AUTH_PAGE_COPY.loginAria}
              href={ROUTES.LOGIN}
            >
              {AUTH_PAGE_COPY.loginLink}
            </Styled.HeaderLoginLink>
          </Styled.HeaderLoginText>
        ) : null}
      </Styled.AuthHeader>

      <Styled.AuthContent data-testid="auth-page-content" mode={mode}>
        {isRegister ? <RegisterPanel /> : <LoginHero />}
        <Styled.FormColumn mode={mode}>
          <Styled.FormStack mode={mode}>
            {children}
            {!isRegister ? <TrustPanel /> : null}
          </Styled.FormStack>
        </Styled.FormColumn>
      </Styled.AuthContent>
    </Styled.AuthRoot>
  );
}
