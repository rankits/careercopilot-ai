import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  ProfileReviewSection,
  type ReviewField,
} from '@/features/resume/components/ProfileReviewSection';
import { ResumeSummary } from '@/features/resume/components/ResumeSummary';
import { ResumeUpload } from '@/features/resume/components/ResumeUpload';

import { useResumeParser } from '@/features/resume/hooks/useResumeParser';
import { useAppDispatch } from '@/hooks/redux';

import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { setProfileComplete } from '@/features/auth/authSlice';
import type { User } from '@/features/auth/types/auth.types';
import { resumeService } from '@/features/resume/services/resume.service';
import {
  OnboardingPage,
  OnboardingPageHeader,
  OnboardingViewport,
  ProfileReviewColumn,
  ProfileStickyActions,
  resumePrimaryActionSx,
} from '@/features/resume/styles';
import type { ResumeProfileFormValues } from '@/features/resume/types/resume.types';
import {
  getProfileCompletion,
  getResumePresentation,
} from '@/features/resume/utils/resumePresentation';
import {
  Alert,
  AutoAwesomeOutlinedIcon,
  AutoGraphOutlinedIcon,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FolderOutlinedIcon,
  LinearProgress,
  PersonOutlineIcon,
  SchoolOutlinedIcon,
  SecurityOutlinedIcon,
  Snackbar,
  Typography,
  WorkOutlineOutlinedIcon,
  WorkspacePremiumOutlinedIcon,
} from '@/lib/material';
import { borderRadius, spacing } from '@/tokens';
import { storage } from '@/utils/storage';

const DEFAULT_VALUES: ResumeProfileFormValues = {
  certifications: '',
  currentCompany: '',
  designation: '',
  education: '',
  email: '',
  fullName: '',
  location: '',
  phone: '',
  projects: '',
  skills: '',
  summary: '',
  totalExperience: '',
  workExperience: '',
};

const REQUIRED_PROFILE_FIELDS: Array<keyof ResumeProfileFormValues> = [
  'fullName',
  'email',
  'phone',
  'designation',
  'totalExperience',
  'skills',
  'summary',
];

const SECTIONS: Array<{
  badge?: string;
  fields: ReviewField[];
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}> = [
  {
    fields: [
      { label: 'Full name', name: 'fullName', required: true },
      { label: 'Email', name: 'email', required: true },
      { label: 'Phone number', name: 'phone', required: true },
      { label: 'Location', name: 'location' },
    ],
    icon: <PersonOutlineIcon fontSize="small" />,
    subtitle: 'Basic contact and personal details',
    title: 'Personal Information',
  },
  {
    badge: 'AI Generated',
    fields: [
      { label: 'Current company', name: 'currentCompany' },
      { label: 'Current designation', name: 'designation', required: true },
      { label: 'Total experience (years)', name: 'totalExperience', required: true },
      { label: 'Professional summary', multiline: true, name: 'summary', required: true },
    ],
    icon: <AutoGraphOutlinedIcon fontSize="small" />,
    subtitle: 'Snapshot of your professional background',
    title: 'Professional Profile',
  },
  {
    badge: 'Auto-filled',
    fields: [{ label: 'Skills', multiline: true, name: 'skills', required: true }],
    icon: <AutoAwesomeOutlinedIcon fontSize="small" />,
    subtitle: 'Technologies and tools you are proficient in',
    title: 'Skills',
  },
  {
    fields: [{ label: 'Work experience', multiline: true, name: 'workExperience' }],
    icon: <WorkOutlineOutlinedIcon fontSize="small" />,
    subtitle: 'Your work history and professional experience',
    title: 'Work Experience',
  },
  {
    fields: [{ label: 'Education', multiline: true, name: 'education' }],
    icon: <SchoolOutlinedIcon fontSize="small" />,
    subtitle: 'Your educational background',
    title: 'Education',
  },
  {
    fields: [{ label: 'Certifications', multiline: true, name: 'certifications' }],
    icon: <WorkspacePremiumOutlinedIcon fontSize="small" />,
    subtitle: 'Professional certifications and courses',
    title: 'Certifications',
  },
  {
    fields: [{ label: 'Projects', multiline: true, name: 'projects' }],
    icon: <FolderOutlinedIcon fontSize="small" />,
    subtitle: 'Key projects you have worked on',
    title: 'Projects',
  },
];

interface ProfilePageProps {
  onSave?: (values: ResumeProfileFormValues) => void | Promise<void>;
}

type Notice = { message: string; severity: 'error' | 'success' } | null;

export function ProfilePage({ onSave }: ProfilePageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const userId = storage.get<User>(STORAGE_KEYS.USER)?.id ?? 'public';
  const [notice, setNotice] = useState<Notice>(null);
  const [hasParsedResume, setHasParsedResume] = useState(false);
  const [expandedSection, setExpandedSection] = useState('Personal Information');
  const [pendingProfile, setPendingProfile] = useState<ResumeProfileFormValues | null>(null);
  const [saveCompleted, setSaveCompleted] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<ResumeProfileFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });
  const values = watch();
  const completion = getProfileCompletion(values);
  const hasRequiredManualDetails = REQUIRED_PROFILE_FIELDS.every(
    (field) => values[field].trim().length > 0,
  );
  const canSubmit = hasParsedResume || hasRequiredManualDetails;
  const parser = useResumeParser((profile) => {
    reset(profile);
    setHasParsedResume(true);
    setNotice({
      message: 'Resume parsed. Review your details before continuing.',
      severity: 'success',
    });
  });
  const presentation = getResumePresentation(parser.metadata);

  const saveMutation = useMutation({
    mutationFn: async (profile: ResumeProfileFormValues) => {
      if (onSave) await onSave(profile);
      if (parser.resumeId) {
        return resumeService.confirmProfile({ resumeId: parser.resumeId, userId });
      }
      if (!onSave) {
        throw new Error('Upload and parse a resume before saving your profile.');
      }
      return { message: 'Profile created successfully' };
    },
    mutationKey: ['resume', 'confirm-profile'],
    onError: (error) => {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save your profile.',
        severity: 'error',
      });
    },
    onSuccess: ({ message }) => {
      dispatch(setProfileComplete(true));
      setPendingProfile(null);
      setSaveCompleted(true);
      showToast({ message, severity: 'success' });
      window.setTimeout(() => void navigate(ROUTES.JOB_FEED, { replace: true }), 800);
    },
  });

  const clearProfile = () => {
    parser.reset();
    reset(DEFAULT_VALUES);
    setHasParsedResume(false);
    setExpandedSection('Personal Information');
    setPendingProfile(null);
    setSaveCompleted(false);
    setNotice(null);
  };

  const sectionStatus = (fields: ReviewField[]) => {
    const completed = fields.filter(({ name }) => values[name].trim()).length;
    return `${completed} / ${fields.length} completed`;
  };

  return (
    <OnboardingViewport>
      <OnboardingPage>
        <OnboardingPageHeader>
          <Box>
            <Typography component="h1" fontWeight={700} variant="h4">
              Let&apos;s Build Your Professional Profile
            </Typography>
            <Typography color="text.secondary">
              Upload your resume or enter your details manually. Review and complete your profile to
              unlock personalized job matches and AI-powered career insights.
            </Typography>
          </Box>
          <Box>
            <Box display="flex" justifyContent="space-between" mb={spacing[2]}>
              <Typography color="text.secondary" variant="body2">
                Profile completion
              </Typography>
              <Typography fontWeight={700} variant="body2">
                {completion}%
              </Typography>
            </Box>
            <LinearProgress
              aria-label="Profile completion"
              value={completion}
              variant="determinate"
            />
          </Box>
        </OnboardingPageHeader>

        <ProfileReviewColumn>
          <ResumeUpload
            onRemove={clearProfile}
            onUpload={parser.parse}
            parseProgress={parser.parseProgress}
            summary={
              <ResumeSummary presentation={presentation} totalExperience={values.totalExperience} />
            }
          />

          {parser.parseProgress?.requiresReview ? (
            <Alert severity="warning">
              Some extracted details need extra attention. Please review all information.
            </Alert>
          ) : null}

          <Box
            component="form"
            display="grid"
            gap={spacing[3]}
            id="profile-review-form"
            noValidate
            onSubmit={(event) => {
              void handleSubmit(
                (profile) => setPendingProfile(profile),
                (validationErrors) => {
                  const firstInvalid = SECTIONS.find((section) =>
                    section.fields.some(({ name }) => Boolean(validationErrors[name])),
                  );
                  if (firstInvalid) setExpandedSection(firstInvalid.title);
                },
              )(event);
            }}
          >
            {SECTIONS.map((section) => (
              <ProfileReviewSection
                {...section}
                badge={hasParsedResume ? section.badge : undefined}
                errors={errors}
                expanded={expandedSection === section.title}
                key={section.title}
                onToggle={() =>
                  setExpandedSection((current) => (current === section.title ? '' : section.title))
                }
                register={register}
                status={sectionStatus(section.fields)}
              />
            ))}
          </Box>
        </ProfileReviewColumn>
      </OnboardingPage>

      <ProfileStickyActions>
        <Box alignItems="center" display="flex" flex={1} gap={spacing[2]}>
          <SecurityOutlinedIcon color="primary" fontSize="small" />
          <Typography color="text.secondary" variant="caption">
            Your data is secure and only used to enhance your job match experience.
          </Typography>
        </Box>
        <Button
          disabled={saveCompleted || !canSubmit}
          form="profile-review-form"
          isLoading={saveMutation.isPending}
          size="medium"
          sx={resumePrimaryActionSx}
          type="submit"
        >
          Save Profile &amp; Continue
        </Button>
      </ProfileStickyActions>

      <Dialog
        aria-describedby="confirm-profile-description"
        aria-labelledby="confirm-profile-title"
        fullWidth
        maxWidth="sm"
        onClose={() => !saveMutation.isPending && setPendingProfile(null)}
        open={Boolean(pendingProfile)}
        slotProps={{ paper: { sx: { borderRadius: borderRadius['2xl'], p: spacing[2] } } }}
      >
        <DialogTitle id="confirm-profile-title">Confirm Profile Submission</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-profile-description">
            Please review your profile information before continuing. Once submitted, this
            information will be used to complete your onboarding. You can edit it later if allowed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ gap: spacing[2], p: spacing[3] }}>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => setPendingProfile(null)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            isLoading={saveMutation.isPending}
            onClick={() => {
              if (pendingProfile && !saveMutation.isPending && !saveCompleted) {
                saveMutation.mutate(pendingProfile);
              }
            }}
            type="button"
          >
            Save &amp; Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        open={Boolean(notice)}
      >
        <Alert
          onClose={() => setNotice(null)}
          severity={notice?.severity ?? 'success'}
          variant="filled"
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </OnboardingViewport>
  );
}
