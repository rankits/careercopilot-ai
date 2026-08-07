import { LANDING_COPY } from '@/constants/pages/landing';

import { FaqSection } from './components/FaqSection';
import { FeaturesSection } from './components/FeaturesSection';
import { FinalCtaSection } from './components/FinalCtaSection';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { LandingFooter } from './components/LandingFooter';
import { LandingNavbar } from './components/LandingNavbar';
import { StatsSection } from './components/StatsSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { useLandingScrollLock } from './hooks/useLandingScroll';
import { LandingMain, LandingRoot } from './styles';

export function LandingPage() {
  useLandingScrollLock();
  useDocumentMeta({
    description: LANDING_COPY.seo.description,
    title: LANDING_COPY.seo.title,
  });

  return (
    <LandingRoot>
      <LandingNavbar />
      <LandingMain>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
      </LandingMain>
      <LandingFooter />
    </LandingRoot>
  );
}
