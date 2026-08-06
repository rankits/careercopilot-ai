import { ROUTES } from '@/constants/routes';
import type { SvgIconComponent } from '@/lib/material';
import {
  AutoAwesomeOutlinedIcon,
  BookmarkBorderOutlinedIcon,
  BusinessCenterOutlinedIcon,
  CloudUploadOutlinedIcon,
  DescriptionOutlinedIcon,
  EventOutlinedIcon,
  HomeOutlinedIcon,
  PeopleOutlineIcon,
  PersonOutlineIcon,
  SearchOutlinedIcon,
  TaskAltOutlinedIcon,
  TrackChangesOutlinedIcon,
  TuneOutlinedIcon,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';
import type { IconTone } from '@/tokens';

export const LANDING_COPY = {
  brand: 'Career Copilot',
  tagline: 'Find. Optimise. Apply. Succeed.',
  nav: {
    features: 'Features',
    howItWorks: 'How It Works',
    resources: 'Resources',
    about: 'About',
    signIn: 'Sign in',
    getStarted: 'Get Started',
    menuAria: 'Open navigation menu',
    closeMenuAria: 'Close navigation menu',
  },
  hero: {
    badge: 'AI-POWERED CAREER PLATFORM',
    titleLead: 'Your',
    titleHighlight: 'AI',
    titleMid: 'Copilot for',
    titleAccent: 'Smarter Job Search',
    subtitle:
      'Find the right opportunities, optimise your resume, track applications, and get interview-ready — all in one intelligent workspace.',
    primaryCta: 'Explore Features',
    secondaryCta: 'How It Works',
    trusts: ['ATS Friendly', 'Secure & Private', 'Trusted by 4,500+ users'] as const,
    benefits: [
      {
        id: 'matching',
        title: 'Smart Job Matching',
        description: 'Opportunities aligned with your skills and career goals.',
        icon: SearchOutlinedIcon,
        tone: 'primary' as IconTone,
      },
      {
        id: 'guidance',
        title: 'AI-Powered Guidance',
        description: 'Personalised insights to help you create stronger applications.',
        icon: AutoAwesomeOutlinedIcon,
        tone: 'success' as IconTone,
      },
      {
        id: 'tracking',
        title: 'Application Tracking',
        description: 'Stay organised at every stage of your job search.',
        icon: BookmarkBorderOutlinedIcon,
        tone: 'warning' as IconTone,
      },
    ],
    floating: {
      resumeScore: { label: 'Resume Score', value: '94%', progress: 94 },
      aiMatch: { label: 'AI Match', value: '96%' },
      jobs: { label: 'Matching Jobs', value: '248' },
      applied: { label: 'Applications Sent', value: '24' },
    },
  },
  stats: {
    title: 'Platform statistics',
  },
  features: {
    title: 'Everything you need to land the role',
    subtitle: 'All-in-one tools to help you search smarter and achieve more.',
  },
  howItWorks: {
    title: 'How Career Copilot Works',
    subtitle: 'Your career journey, simplified.',
  },
  testimonials: {
    title: 'Loved by job seekers like you',
    subtitle: 'Real stories from people who found the right opportunities.',
  },
  faq: {
    title: 'Frequently asked questions',
    subtitle: 'Quick answers to common questions.',
  },
  finalCta: {
    title: 'Ready to accelerate your career?',
    subtitle: 'Join thousands of job seekers using AI to find better opportunities, faster.',
    primaryCta: 'Get Started Free',
    secondaryCta: 'Explore Features',
  },
  footer: {
    description: 'AI-powered career platform for resumes, job matches, and applications.',
    platform: 'Platform',
    resources: 'Resources',
    company: 'Company',
    connect: 'Connect',
    linkedInAria: 'Career Copilot on LinkedIn',
    copyright: `© ${new Date().getFullYear()} Career Copilot. All rights reserved.`,
  },
  seo: {
    title: 'Career Copilot — AI Resume Builder, Job Matching & Application Tracking',
    description:
      'Build ATS-friendly resumes, discover AI-matched jobs, track applications, and accelerate your career with Career Copilot.',
  },
} as const;

export const LANDING_SECTION_IDS = {
  features: 'features',
  howItWorks: 'how-it-works',
  resources: 'resources',
  about: 'about',
  faq: 'faq',
  testimonials: 'testimonials',
} as const;

export interface LandingNavItem {
  href: string;
  id: string;
  label: string;
}

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { id: 'features', label: LANDING_COPY.nav.features, href: `#${LANDING_SECTION_IDS.features}` },
  {
    id: 'how-it-works',
    label: LANDING_COPY.nav.howItWorks,
    href: `#${LANDING_SECTION_IDS.howItWorks}`,
  },
  {
    id: 'resources',
    label: LANDING_COPY.nav.resources,
    href: `#${LANDING_SECTION_IDS.resources}`,
  },
  { id: 'about', label: LANDING_COPY.nav.about, href: `#${LANDING_SECTION_IDS.about}` },
];

export interface LandingStat {
  icon: SvgIconComponent;
  id: string;
  label: string;
  value: string;
}

export const LANDING_STATS: LandingStat[] = [
  { id: 'users', icon: PeopleOutlineIcon, label: 'Users Joined', value: '4,500+' },
  { id: 'companies', icon: BusinessCenterOutlinedIcon, label: 'Companies Hiring', value: '1,200+' },
  {
    id: 'applications',
    icon: TrackChangesOutlinedIcon,
    label: 'Applications Tracked',
    value: '8,500+',
  },
  { id: 'interviews', icon: EventOutlinedIcon, label: 'Interviews Managed', value: '12,000+' },
];

export interface LandingFeature {
  description: string;
  href: string;
  icon: SvgIconComponent;
  id: string;
  title: string;
  tone: IconTone;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: 'resume-builder',
    icon: DescriptionOutlinedIcon,
    title: 'AI Resume Builder',
    description: 'Create ATS-friendly resumes that help you get noticed.',
    href: ROUTES.REGISTER,
    tone: 'primary',
  },
  {
    id: 'job-feed',
    icon: SearchOutlinedIcon,
    title: 'Job Feed',
    description: 'Discover personalised job recommendations updated daily.',
    href: ROUTES.LOGIN,
    tone: 'primary',
  },
  {
    id: 'ai-match',
    icon: TuneOutlinedIcon,
    title: 'AI Match',
    description: 'Get matched with the best roles based on your profile.',
    href: ROUTES.LOGIN,
    tone: 'success',
  },
  {
    id: 'tracker',
    icon: BusinessCenterOutlinedIcon,
    title: 'Application Tracker',
    description: 'Track every step and never miss an important update.',
    href: ROUTES.LOGIN,
    tone: 'primary',
  },
  {
    id: 'saved',
    icon: BookmarkBorderOutlinedIcon,
    title: 'Saved Jobs',
    description: 'Bookmark opportunities and apply when you are ready.',
    href: ROUTES.LOGIN,
    tone: 'warning',
  },
  {
    id: 'dashboard',
    icon: HomeOutlinedIcon,
    title: 'Career Dashboard',
    description: 'See your progress, statistics, and recommended next actions.',
    href: ROUTES.LOGIN,
    tone: 'success',
  },
];

export interface LandingStep {
  description: string;
  icon: SvgIconComponent;
  id: string;
  step: string;
  title: string;
  tone: IconTone;
}

export const LANDING_STEPS: LandingStep[] = [
  {
    id: 'account',
    step: '01',
    icon: PersonOutlineIcon,
    title: 'Create Account',
    description: 'Sign up and set up your career profile.',
    tone: 'primary',
  },
  {
    id: 'build',
    step: '02',
    icon: CloudUploadOutlinedIcon,
    title: 'Build & Optimise',
    description: 'Create or upload your resume and get AI-powered tips.',
    tone: 'primary',
  },
  {
    id: 'discover',
    step: '03',
    icon: WorkOutlineOutlinedIcon,
    title: 'Discover & Apply',
    description: 'Find matching jobs and apply with confidence.',
    tone: 'primary',
  },
  {
    id: 'track',
    step: '04',
    icon: TrackChangesOutlinedIcon,
    title: 'Track Progress',
    description: 'Manage applications and stay on top of every update.',
    tone: 'primary',
  },
  {
    id: 'hired',
    step: '05',
    icon: TaskAltOutlinedIcon,
    title: 'Get Hired',
    description: 'Prepare for interviews and land your ideal role.',
    tone: 'success',
  },
];

export interface LandingTestimonial {
  feedback: string;
  id: string;
  initials: string;
  name: string;
  role: string;
}

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: 'rohan',
    name: 'Rohan Sharma',
    role: 'Software Engineer',
    initials: 'RS',
    feedback:
      'Career Copilot helped me organise my job search and land my dream role in just three weeks.',
  },
  {
    id: 'neha',
    name: 'Neha Verma',
    role: 'Product Manager',
    initials: 'NV',
    feedback:
      'The AI resume suggestions and job matches were incredibly accurate and saved me so much time.',
  },
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    role: 'Data Analyst',
    initials: 'AM',
    feedback:
      'The dashboard gave me complete visibility, so I never missed a follow-up or opportunity.',
  },
];

export interface LandingFaqItem {
  answer: string;
  id: string;
  question: string;
}

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    id: 'free',
    question: 'Is Career Copilot free?',
    answer:
      'You can get started free and explore core workflows today. Paid plans with advanced AI features are coming soon.',
  },
  {
    id: 'ai-match',
    question: 'How does AI matching work?',
    answer:
      'AI Match compares your profile skills and experience with open roles, then ranks opportunities with a clear match score and rationale.',
  },
  {
    id: 'import',
    question: 'Can I import my existing resume?',
    answer:
      'Yes. Upload your resume and Career Copilot extracts your profile so you can optimise and apply faster.',
  },
  {
    id: 'secure',
    question: 'Is my data secure?',
    answer:
      'We take privacy seriously. Your data is protected with industry-standard security practices and is never sold.',
  },
  {
    id: 'tracking',
    question: 'Can I track applications?',
    answer:
      'Yes. Save roles, move them through pipeline stages, and keep notes in one place from apply to offer.',
  },
  {
    id: 'interview',
    question: 'Do you offer interview preparation?',
    answer:
      'Career Copilot helps you get interview-ready with role-aligned guidance and organised application context as you prepare.',
  },
];

export const LANDING_FOOTER_PLATFORM = [
  { href: `#${LANDING_SECTION_IDS.features}`, label: 'Features' },
  { href: `#${LANDING_SECTION_IDS.howItWorks}`, label: 'How It Works' },
] as const;

export const LANDING_FOOTER_RESOURCES = [
  { href: `#${LANDING_SECTION_IDS.resources}`, label: 'Blog' },
  { href: `#${LANDING_SECTION_IDS.resources}`, label: 'Guides' },
  { href: `#${LANDING_SECTION_IDS.faq}`, label: 'Help Center' },
] as const;

export const LANDING_FOOTER_COMPANY = [
  { href: `#${LANDING_SECTION_IDS.about}`, label: 'About Us' },
  { href: `#${LANDING_SECTION_IDS.faq}`, label: 'Contact' },
  { href: '#', label: 'Privacy Policy' },
] as const;

export const LANDING_LINKEDIN_URL = 'https://www.linkedin.com/';
