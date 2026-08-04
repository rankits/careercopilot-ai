import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  ProfileReviewSection,
  type ReviewField,
} from '@/features/resume/components/ProfileReviewSection';

import { ROUTES } from '@/constants/routes';
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
  mapFormValuesToProfileUpdate,
  mapProfileToFormValues,
} from '@/features/resume/utils/profileFormMapper';
import { getProfileCompletion } from '@/features/resume/utils/resumePresentation';
import {
  Alert,
  AutoAwesomeOutlinedIcon,
  AutoGraphOutlinedIcon,
  Box,
  CloudUploadOutlinedIcon,
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

type Notice = { message: string; severity: 'error' | 'success' } | null;

/**
 * Edits the caller's already-confirmed candidate profile. Deliberately has
 * no resume-upload/parse state of its own (that belongs to the onboarding
 * flow, `ProfilePage`) - this page only ever reads and writes the single
 * existing `CandidateProfile` row via GET/PATCH `/resumes/profile/me`.
 */
export function EditProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notice, setNotice] = useState<Notice>(null);
  const [expandedSection, setExpandedSection] = useState('Personal Information');
  const [pendingProfile, setPendingProfile] = useState<ResumeProfileFormValues | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
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
  const canSubmit = !profileMissing && hasRequiredManualDetails;

  useEffect(() => {
    let cancelled = false;

    resumeService
      .getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          // Routing normally keeps an incomplete-profile user out of this
          // page entirely (see OnboardingRoute/ProtectedRoute), but the
          // profile-complete flag can be stale (e.g. a second tab) - guard
          // against presenting a form that would 404 on save.
          setProfileMissing(true);
          setNotice({
            message: 'No profile found yet. Complete onboarding before editing your profile.',
            severity: 'error',
          });
          return;
        }
        reset(mapProfileToFormValues(profile));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({
          message: error instanceof Error ? error.message : 'Unable to load your profile.',
          severity: 'error',
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const saveMutation = useMutation({
    mutationFn: async (profile: ResumeProfileFormValues) => {
      const result = await resumeService.updateProfile(mapFormValuesToProfileUpdate(profile));
      return { message: result.message };
    },
    mutationKey: ['resume', 'update-profile'],
    onError: (error) => {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save your profile.',
        severity: 'error',
      });
    },
    onSuccess: ({ message }) => {
      setPendingProfile(null);
      showToast({ message, severity: 'success' });
    },
  });

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
              Update Your Professional Profile
            </Typography>
            <Typography color="text.secondary">
              Review and update your details to keep your profile accurate and your job matches
              relevant.
            </Typography>
            <Box mt={spacing[3]}>
              <Button
                onClick={() => void navigate(ROUTES.PROFILE)}
                size="small"
                startIcon={<CloudUploadOutlinedIcon />}
                type="button"
                variant="outline"
              >
                Upload a new resume
              </Button>
            </Box>
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

        {/* Only render the editable profile form after the profile has finished loading.
            This ensures the form fields are populated via `reset(...)` before they are
            mounted, avoiding timing issues in tests that assert on the field values. */}
        <ProfileReviewColumn>
          {!isLoadingProfile && !profileMissing ? (
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
                  errors={errors}
                  expanded={expandedSection === section.title}
                  key={section.title}
                  onToggle={() =>
                    setExpandedSection((current) =>
                      current === section.title ? '' : section.title,
                    )
                  }
                  register={register}
                  status={sectionStatus(section.fields)}
                />
              ))}
            </Box>
          ) : null}
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
          disabled={isLoadingProfile || !canSubmit}
          form="profile-review-form"
          isLoading={saveMutation.isPending}
          size="medium"
          sx={resumePrimaryActionSx}
          type="submit"
        >
          Save Changes
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
        <DialogTitle id="confirm-profile-title">Confirm Profile Changes</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-profile-description">
            Please review your updated details before saving these changes to your profile.
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
              if (pendingProfile && !saveMutation.isPending) {
                saveMutation.mutate(pendingProfile);
              }
            }}
            type="button"
          >
            Confirm & Save
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
