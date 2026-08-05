import * as yup from 'yup';

import type {
  AuthFormContent,
  AuthFormField,
  AuthFormMode,
} from '@/components/organisms/AuthForm/interfaces';
import type { AuthPageFeature } from '@/components/organisms/AuthPageLayout/interfaces';
import type { SidebarNavItem } from '@/components/organisms/Sidebar/interfaces';

import { ROUTES } from '@/constants/routes';
import {
  BookmarkBorderOutlinedIcon,
  BusinessCenterOutlinedIcon,
  CheckCircleOutlineIcon,
  DescriptionOutlinedIcon,
  HomeOutlinedIcon,
  InsightsOutlinedIcon,
  LockOutlinedIcon,
  SearchOutlinedIcon,
  SecurityOutlinedIcon,
  TuneOutlinedIcon,
} from '@/lib/material';

/* ----------------------------------------------------------------------------
 * Brand & actions shared across multiple components.
 * -------------------------------------------------------------------------- */

export const BRAND_NAME = 'Career Copilot';

export const APP_ACTIONS = {
  APPLY_NOW: 'Apply Now',
  RETRY: 'Retry',
  SAVE: 'Save',
  UPLOAD_RESUME: 'Upload Resume',
} as const;

export const JOB_UI = {
  MATCH_SUFFIX: '% Match',
} as const;

/* ----------------------------------------------------------------------------
 * ChatInput
 * -------------------------------------------------------------------------- */

export const CHAT_INPUT_COPY = {
  placeholder: 'Ask Career Copilot…',
  sendAriaLabel: 'Send message',
} as const;

/* ----------------------------------------------------------------------------
 * DashboardJobRow
 * -------------------------------------------------------------------------- */

export const DASHBOARD_JOB_ROW_COPY = {
  saveJobAria: (title: string) => `Save ${title}`,
  /** Prefix stripped from `postedAt` values such as "Posted 1d ago". */
  postedPrefix: 'Posted ',
} as const;

export const DASHBOARD_JOB_ROW_LIMITS = {
  featuredMaxSkills: 5,
  maxSkills: 4,
} as const;

/* ----------------------------------------------------------------------------
 * HeaderSearch
 * -------------------------------------------------------------------------- */

export const HEADER_SEARCH_COPY = {
  ariaLabel: 'Search',
  placeholder: 'Search jobs, companies, skills...',
} as const;

/* ----------------------------------------------------------------------------
 * HeaderUserMenu
 * -------------------------------------------------------------------------- */

export const HEADER_USER_MENU_COPY = {
  ariaLabel: 'User menu',
  editProfile: 'Edit Profile',
  logout: 'Logout',
  roleLabel: 'Frontend Developer',
} as const;

/** Fallback initials shown when a name yields no recognizable letters. */
export const USER_INITIALS_FALLBACK = 'U';

/* ----------------------------------------------------------------------------
 * JobCard
 * -------------------------------------------------------------------------- */

/** Static user-facing copy for the JobCard. */
export const JOB_CARD_COPY = {
  aiRecommended: 'AI Recommended',
  details: 'Details',
  dismiss: 'Dismiss',
  lessLikeThis: 'Less like this',
  moreLikeThis: 'More like this',
  notRelevant: 'Not relevant',
  verifiedCompany: 'Verified company',
} as const;

/** Accessible names composed from job data at render time. */
export const JOB_CARD_ARIA = {
  apply: (title: string, available: boolean) => `Apply to ${title}${available ? '' : ' unavailable'}`,
  companyLogo: (company: string) => `${company} logo`,
  details: (open: boolean, title: string) => `${open ? 'Hide' : 'Show'} details for ${title}`,
  dismiss: (title: string) => `Dismiss ${title} recommendation`,
  lessLikeThis: (title: string) => `Show fewer jobs like ${title}`,
  match: (match: number, subtitle?: string) =>
    `${match} percent match${subtitle ? `, ${subtitle}` : ''}`,
  moreLikeThis: (selected: boolean, title: string) =>
    selected ? `More jobs like ${title} selected` : `Show more jobs like ${title}`,
  notRelevant: (title: string) => `Mark ${title} as not relevant`,
  open: (title: string, company: string) => `Open ${title} at ${company}`,
  recommendationDetails: (title: string) => `${title} recommendation details`,
  save: (saved: boolean, title: string) => `${saved ? 'Unsave' : 'Save'} ${title}`,
} as const;

export const JOB_CARD_LIMITS = {
  /** Number of recommendation bullets rendered before collapsing. */
  maxBullets: 3,
  /** Number of supporting evidence items joined into the bullet text. */
  maxEvidence: 2,
  /** Converts a 0-1 score into a percentage. */
  percentScale: 100,
} as const;

type SkillGapKey = 'alias' | 'exact' | 'missing' | 'related' | 'transferable';

/** Ordered skill-gap groups and their display labels. */
export const SKILL_GAP_SECTIONS: ReadonlyArray<{ key: SkillGapKey; label: string }> = [
  { key: 'exact', label: 'Matched' },
  { key: 'alias', label: 'Alias' },
  { key: 'related', label: 'Related' },
  { key: 'transferable', label: 'Transferable' },
  { key: 'missing', label: 'Missing' },
];

/* ----------------------------------------------------------------------------
 * JobFeedStatus
 * -------------------------------------------------------------------------- */

/** Friendly copy shown while jobs load or when the feed errors. */
export const JOB_FEED_STATUS_MESSAGES = {
  defaultError: 'Something went wrong. Please try again.',
  forbidden: 'You don’t have access to this content.',
  loading: 'Loading jobs…',
  notFound: 'We couldn’t find matching results right now. Try again in a moment.',
  requestFailed: 'We couldn’t complete this request. Please try again.',
  unavailable: 'The service is temporarily unavailable. Please try again.',
  unauthorized: 'Your session may have expired. Sign in again, then retry.',
} as const;

/**
 * Raw API error messages are mapped to friendly copy by their first matching
 * pattern. Unknown messages are surfaced verbatim.
 */
export const JOB_FEED_STATUS_RULES: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    message: JOB_FEED_STATUS_MESSAGES.notFound,
    pattern: /status code 404|not found/i,
  },
  {
    message: JOB_FEED_STATUS_MESSAGES.unauthorized,
    pattern: /status code 401|unauthorized|session/i,
  },
  {
    message: JOB_FEED_STATUS_MESSAGES.forbidden,
    pattern: /status code 403|forbidden/i,
  },
  {
    message: JOB_FEED_STATUS_MESSAGES.unavailable,
    pattern: /status code 5\d\d|unavailable|network|timeout|failed to fetch|network error/i,
  },
  {
    message: JOB_FEED_STATUS_MESSAGES.requestFailed,
    pattern: /request failed with status code/i,
  },
];

/* ----------------------------------------------------------------------------
 * JobFilterBar
 * -------------------------------------------------------------------------- */

export const JOB_FILTER_BAR_COPY = {
  scrollLeftAria: 'Scroll filters left',
  scrollRightAria: 'Scroll filters right',
  trackAria: 'Job filters',
} as const;

export const JOB_FILTER_BAR_SCROLL = {
  /** Remaining scroll (px) below which the edge button is disabled. */
  edgeThresholdPx: 2,
  /** Minimum smooth-scroll step used for narrow tracks. */
  minStepPx: 160,
} as const;

/* ----------------------------------------------------------------------------
 * ResumeScoreCard
 * -------------------------------------------------------------------------- */

/** Static user-facing copy for the ResumeScoreCard. */
export const RESUME_SCORE_COPY = {
  aiAnalysis: 'AI Analysis',
  ariaLabel: (score: number) => `Resume score ${score} percent`,
  excellent: 'Excellent',
  growth: 'up 4% from last scan',
  improveResume: 'Improve Resume',
  message: 'Great job! Your resume is performing really well.',
  title: 'Resume Score',
} as const;

export const RESUME_SCORE_ANIMATION = {
  /** Total count-up frames; higher scores advance in larger steps. */
  frames: 24,
  /** Milliseconds between count-up ticks. */
  intervalMs: 28,
} as const;

/* ----------------------------------------------------------------------------
 * AppHeader
 * -------------------------------------------------------------------------- */

export const APP_HEADER_DEFAULTS = {
  notificationCount: 3,
  userName: 'User',
} as const;

/* ----------------------------------------------------------------------------
 * AuthForm
 * -------------------------------------------------------------------------- */

export const AUTH_FORM_CONTENT: Record<AuthFormMode, AuthFormContent> = {
  login: {
    footerActionLabel: 'Create account',
    footerText: "Don't have an account?",
    submitLabel: 'Login',
    subtitle: 'Login to continue to your account',
    title: 'Welcome back!',
  },
  register: {
    footerActionLabel: 'Login',
    footerText: 'Already have an account?',
    submitLabel: 'Create account',
    subtitle: 'Create your CareerCopilot account',
    title: 'Create account',
  },
};

export const AUTH_FORM_FIELDS: Record<AuthFormMode, AuthFormField[]> = {
  login: [
    {
      autoComplete: 'email',
      label: 'Email address',
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'current-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
  register: [
    {
      autoComplete: 'given-name',
      label: 'First name',
      name: 'firstName',
      placeholder: 'Jane',
      startIcon: 'person',
      type: 'text',
    },
    {
      autoComplete: 'family-name',
      label: 'Last name',
      name: 'lastName',
      placeholder: 'Doe',
      startIcon: 'person',
      type: 'text',
    },
    {
      autoComplete: 'email',
      label: 'Email address',
      name: 'email',
      placeholder: 'you@example.com',
      startIcon: 'email',
      type: 'email',
    },
    {
      autoComplete: 'tel',
      label: 'Phone number',
      name: 'phone',
      placeholder: '+1 555 123 4567',
      startIcon: 'phone',
      type: 'tel',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Password',
      name: 'password',
      placeholder: 'Enter your password',
      startIcon: 'lock',
      type: 'password',
    },
    {
      autoComplete: 'new-password',
      endIcon: 'visibilityOff',
      label: 'Confirm password',
      name: 'confirmPassword',
      placeholder: 'Confirm your password',
      startIcon: 'lock',
      type: 'password',
    },
  ],
};

/** Copy that is not tied to a single mode (login vs register). */
export const AUTH_FORM_STATIC_COPY = {
  dividerLabel: 'or',
  forgotPasswordLabel: 'Forgot password?',
  rememberMeLabel: 'Remember me',
} as const;

/** Accessible names composed from field data at render time. */
export const AUTH_FORM_ARIA = {
  visibilityToggle: (visible: boolean, fieldLabel: string) =>
    `${visible ? 'Hide' : 'Show'} ${fieldLabel}`,
} as const;

export const AUTH_FORM_VALIDATION_SCHEMAS = {
  login: yup.object({
    email: yup.string().email('Enter a valid email address').required('Email is required'),
    password: yup.string().required('Password is required'),
    rememberMe: yup.boolean().default(true),
  }),
  register: yup.object({
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
    email: yup.string().email('Enter a valid email address').required('Email is required'),
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    password: yup
      .string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .matches(/[A-Z]/, 'Password must include an uppercase letter')
      .matches(/[a-z]/, 'Password must include a lowercase letter')
      .matches(/\d/, 'Password must include a number')
      .matches(/[^A-Za-z0-9]/, 'Password must include a symbol'),
    phone: yup
      .string()
      .required('Phone number is required')
      .matches(/^\+?(?=(?:\D*\d){10,15}\D*$)[\d\s()-]+$/, {
        excludeEmptyString: true,
        message: 'Enter a valid phone number',
      }),
  }),
} as const;

/* ----------------------------------------------------------------------------
 * AuthPageLayout
 * -------------------------------------------------------------------------- */

/** Static user-facing copy for the AuthPageLayout hero and panels. */
export const AUTH_PAGE_COPY = {
  aiBadge: 'AI-powered career platform',
  aiPlatformAlt: 'AI platform illustration',
  alreadyHaveAccount: 'Already have an account?',
  careerJourneyAlt: 'Career journey illustration',
  heroDescription:
    'Discover roles, optimize your resume, track applications, and prepare for interviews with one intelligent career workspace.',
  heroHeadingAccent: 'Build your dream career.',
  heroHeadingText: 'Find the right opportunities.',
  loginAria: 'Login from header',
  loginLink: 'Login',
  logoAlt: 'CareerCopilot',
  productOverviewAria: 'Career Copilot product overview',
  registerDescription: 'Build a stronger profile and make every career move with confidence.',
  registerHeadingAccent: 'smarter career',
  registerHeadingSuffix: ' journey today',
  registerHeadingText: 'Start your ',
  securityAria: 'Security and trust',
} as const;

export const LOGIN_FEATURES: AuthPageFeature[] = [
  {
    description: 'Opportunities aligned with your experience.',
    icon: SearchOutlinedIcon,
    title: 'Smart Job Matching',
    tone: 'primary',
  },
  {
    description: 'Stronger applications with focused insights.',
    icon: InsightsOutlinedIcon,
    title: 'AI-powered guidance',
    tone: 'success',
  },
  {
    description: 'Every application organized in one place.',
    icon: BookmarkBorderOutlinedIcon,
    title: 'Application tracking',
    tone: 'warning',
  },
];

export const TRUST_ITEMS: AuthPageFeature[] = [
  {
    description: 'Advanced encryption',
    icon: SecurityOutlinedIcon,
    title: 'Your data is safe',
    tone: 'primary',
  },
  {
    description: 'Your data stays private',
    icon: LockOutlinedIcon,
    title: 'Privacy first',
    tone: 'success',
  },
  {
    description: 'Transparent recommendations',
    icon: CheckCircleOutlineIcon,
    title: 'AI you can trust',
    tone: 'warning',
  },
];

/* ----------------------------------------------------------------------------
 * CareerCopilot
 * -------------------------------------------------------------------------- */

/** Static user-facing copy for the CareerCopilot panel. */
export const CAREER_COPILOT_COPY = {
  closeAria: `Close ${BRAND_NAME}`,
  openAria: `Open ${BRAND_NAME}`,
  retryLastMessage: 'Retry last message',
  suggestedPromptsAria: 'Suggested prompts',
  subtitle: 'Context-aware career coach',
  thinking: `${BRAND_NAME} is thinking…`,
  unavailable: `${BRAND_NAME} is temporarily unavailable.`,
} as const;

/* ----------------------------------------------------------------------------
 * Sidebar
 * -------------------------------------------------------------------------- */

export const SIDEBAR_NAV_LABELS = {
  applications: 'Applications',
  aiMatch: 'AI Match',
  dashboard: 'Dashboard',
  forYou: 'For You',
  jobsFeed: 'Jobs Feed',
  resumeBuilder: 'Resume Builder',
  savedJobs: 'Saved Jobs',
  savedResumes: 'Saved Resumes',
} as const;

export const DEFAULT_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    href: ROUTES.DASHBOARD,
    icon: HomeOutlinedIcon,
    id: 'dashboard',
    label: SIDEBAR_NAV_LABELS.dashboard,
  },
  {
    href: ROUTES.JOB_FEED,
    icon: SearchOutlinedIcon,
    id: 'jobs-feed',
    label: SIDEBAR_NAV_LABELS.jobsFeed,
  },
  {
    href: ROUTES.SAVED_JOBS,
    icon: BookmarkBorderOutlinedIcon,
    id: 'saved-jobs',
    label: SIDEBAR_NAV_LABELS.savedJobs,
  },
  {
    href: ROUTES.FOR_YOU,
    icon: TuneOutlinedIcon,
    id: 'for-you',
    label: SIDEBAR_NAV_LABELS.forYou,
  },
  {
    href: ROUTES.APPLICATIONS,
    icon: BusinessCenterOutlinedIcon,
    id: 'applications',
    label: SIDEBAR_NAV_LABELS.applications,
  },
  {
    href: ROUTES.RESUME_BUILDER,
    icon: DescriptionOutlinedIcon,
    id: 'resume-builder',
    label: SIDEBAR_NAV_LABELS.resumeBuilder,
  },
  {
    href: ROUTES.SAVED_RESUMES,
    icon: BookmarkBorderOutlinedIcon,
    id: 'saved-resumes',
    label: SIDEBAR_NAV_LABELS.savedResumes,
  },
  { icon: TuneOutlinedIcon, id: 'ai-match', label: SIDEBAR_NAV_LABELS.aiMatch },
  {
    icon: BusinessCenterOutlinedIcon,
    id: 'applications',
    label: SIDEBAR_NAV_LABELS.applications,
  },
];

/** Static user-facing copy and defaults for the Sidebar. */
export const SIDEBAR_COPY = {
  bottomNavAria: 'Mobile navigation',
  collapseAria: 'Collapse sidebar',
  dailyGoal: 'Daily Goal',
  dailyGoalProgress: 60,
  dailyGoalStatus: '3 / 5 applications today',
  expandAria: 'Expand sidebar',
  primaryNavAria: 'Primary navigation',
  uploadNow: 'Upload Now',
  uploadPanelDescription: 'Get AI analysis and better job matches',
} as const;

/* ----------------------------------------------------------------------------
 * SocialConnectButton
 * -------------------------------------------------------------------------- */

export const SOCIAL_CONNECT_LABELS = {
  google: 'Continue with Google',
  linkedin: 'Continue with LinkedIn',
} as const;
