import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  ProfileReviewSection,
  type ReviewField,
} from '@/features/resume/components/ProfileReviewSection';
import { ResumeSummary } from '@/features/resume/components/ResumeSummary';
import { ResumeUpload } from '@/features/resume/components/ResumeUpload';
import { ResumeVersionsDialog } from '@/features/resume/components/ResumeVersionsDialog';

import { useResumeParser } from '@/features/resume/hooks/useResumeParser';
import { useAppSelector } from '@/hooks/redux';

import { resumeService } from '@/features/resume/services/resume.service';
import {
  OnboardingPage,
  OnboardingPageHeader,
  OnboardingViewport,
  ProfileReviewColumn,
  ProfileStickyActions,
  resumePrimaryActionSx,
} from '@/features/resume/styles';
import type {
  ResumeProfileFormValues,
  UploadedResumeVersion,
} from '@/features/resume/types/resume.types';
import {
  mapFormValuesToProfileUpdate,
  mapProfileToFormValues,
} from '@/features/resume/utils/profileFormMapper';
import {
  getProfileCompletion,
  getResumePresentation,
} from '@/features/resume/utils/resumePresentation';
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

function hasProfileFormChanges(
  current: ResumeProfileFormValues,
  baseline: ResumeProfileFormValues | null,
): boolean {
  if (!baseline) return false;
  return (Object.keys(current) as Array<keyof ResumeProfileFormValues>).some(
    (key) => (current[key] ?? '') !== (baseline[key] ?? ''),
  );
}

/**
 * Edits the caller's confirmed candidate profile. Re-uploading a resume parses
 * and replaces form values on this page (no redirect), while every upload is
 * kept as a downloadable version in a dedicated versions dialog.
 */
export function EditProfilePage() {
  const { showToast } = useToast();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [notice, setNotice] = useState<Notice>(null);
  const [expandedSection, setExpandedSection] = useState('Personal Information');
  const [pendingProfile, setPendingProfile] = useState<ResumeProfileFormValues | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResumeVersion[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [baselineValues, setBaselineValues] = useState<ResumeProfileFormValues | null>(null);
  const [hasEditedFields, setHasEditedFields] = useState(false);
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ResumeProfileFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });
  const values = watch();
  const completion = getProfileCompletion(values);
  const hasUnsavedChanges = hasEditedFields || hasProfileFormChanges(values, baselineValues);

  const refreshUploadedResumes = useCallback(async () => {
    try {
      const resumes = await resumeService.listResumes();
      setUploadedResumes(resumes);
    } catch {
      // Version history is supplementary - keep the edit form usable if list fails.
    }
  }, []);

  const parser = useResumeParser((profile) => {
    reset(profile);
    setHasEditedFields(true);
    setNotice({
      message: 'Resume parsed. Review the updated details before saving.',
      severity: 'success',
    });
    void refreshUploadedResumes();
  });
  const presentation = getResumePresentation(parser.metadata);
  // Enable Save after any edit or a new resume parse. Required fields are validated on submit.
  const canSubmit =
    !profileMissing && !isLoadingProfile && (hasUnsavedChanges || Boolean(parser.resumeId));

  const aiSuggestMutation = useMutation({
    mutationFn: () => resumeService.suggestProfileFields(getValues()),
    mutationKey: ['resume', 'profile-ai-suggest', 'edit'],
    onError: (error) => {
      setNotice({
        message:
          error instanceof Error ? error.message : 'Unable to generate AI suggestions right now.',
        severity: 'error',
      });
    },
    onSuccess: (suggestion) => {
      if (!suggestion.summary.trim()) {
        setNotice({
          message: 'AI did not return a summary. Try again after adding more profile details.',
          severity: 'error',
        });
        return;
      }
      setValue('summary', suggestion.summary, { shouldDirty: true, shouldValidate: true });
      setHasEditedFields(true);
      setExpandedSection('Professional Profile');
      setNotice({
        message: 'AI summary applied. Review and edit before saving.',
        severity: 'success',
      });
    },
  });

  useEffect(() => {
    let cancelled = false;

    resumeService
      .getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          setProfileMissing(true);
          setNotice({
            message: 'No profile found yet. Complete onboarding before editing your profile.',
            severity: 'error',
          });
          return;
        }
        const mapped = mapProfileToFormValues(profile);
        reset(mapped);
        setBaselineValues(mapped);
        setHasEditedFields(false);
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

    void refreshUploadedResumes();

    return () => {
      cancelled = true;
    };
  }, [refreshUploadedResumes, reset]);

  const saveMutation = useMutation({
    mutationFn: async (profile: ResumeProfileFormValues) => {
      const payload = mapFormValuesToProfileUpdate(profile);
      if (parser.resumeId) {
        if (!currentUser) {
          throw new Error('You must be signed in to save a newly parsed resume.');
        }
        return resumeService.confirmProfile({
          ...payload,
          resumeId: parser.resumeId,
          userId: currentUser.id,
        });
      }
      const result = await resumeService.updateProfile(payload);
      return { message: result.message };
    },
    mutationKey: ['resume', 'update-profile'],
    onError: (error) => {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to save your profile.',
        severity: 'error',
      });
    },
    onSuccess: ({ message }, profile) => {
      setPendingProfile(null);
      reset(profile);
      setBaselineValues(profile);
      setHasEditedFields(false);
      parser.reset();
      showToast({ message, severity: 'success' });
      void refreshUploadedResumes();
    },
  });

  const sectionStatus = (fields: ReviewField[]) => {
    const completed = fields.filter(({ name }) => (values[name] ?? '').trim()).length;
    return `${completed} / ${fields.length} completed`;
  };

  const handleDownload = async (resume: UploadedResumeVersion) => {
    setDownloadingId(resume.id);
    try {
      await resumeService.downloadResume(resume.id, resume.originalName);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to download this resume.',
        severity: 'error',
      });
    } finally {
      setDownloadingId(null);
    }
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
              Upload a new resume to refresh these fields, or edit them manually. Open your version
              history anytime to download earlier uploads.
            </Typography>
            <Box mt={spacing[3]}>
              <Button
                onClick={() => setIsVersionsOpen(true)}
                size="small"
                startIcon={<HistoryOutlinedIcon />}
                type="button"
                variant="outline"
              >
                {uploadedResumes.length > 0
                  ? `View resume versions (${uploadedResumes.length})`
                  : 'View resume versions'}
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

        <ProfileReviewColumn>
          {!profileMissing ? (
            <ResumeUpload
              onRemove={() => parser.reset()}
              onUpload={parser.parse}
              parseProgress={parser.parseProgress}
              summary={
                <ResumeSummary
                  presentation={presentation}
                  totalExperience={values.totalExperience}
                />
              }
            />
          ) : null}

          {parser.parseProgress?.requiresReview ? (
            <Alert severity="warning">
              Some extracted details need extra attention. Please review all information.
            </Alert>
          ) : null}

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
                    showToast({
                      message: 'Please fill in all required fields before saving.',
                      severity: 'error',
                    });
                  },
                )(event);
              }}
            >
              {SECTIONS.map((section) => (
                <ProfileReviewSection
                  {...section}
                  errors={errors}
                  expanded={expandedSection === section.title}
                  fieldActions={
                    section.title === 'Professional Profile'
                      ? {
                          summary: (
                            <Button
                              disabled={aiSuggestMutation.isPending || isLoadingProfile}
                              isLoading={aiSuggestMutation.isPending}
                              onClick={() => {
                                void aiSuggestMutation.mutateAsync();
                              }}
                              size="small"
                              startIcon={<AutoAwesomeOutlinedIcon />}
                              type="button"
                              variant="outline"
                            >
                              AI Suggestion
                            </Button>
                          ),
                        }
                      : undefined
                  }
                  key={section.title}
                  onFieldChange={() => setHasEditedFields(true)}
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
      </OnboardingPage>

      <ResumeVersionsDialog
        downloadingId={downloadingId}
        onClose={() => setIsVersionsOpen(false)}
        onDownload={(resume) => void handleDownload(resume)}
        open={isVersionsOpen}
        resumes={uploadedResumes}
      />

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
