import { useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FilterDropdown } from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useCreateApplication } from '@/features/applications/hooks/useCreateApplication';

import type { defaultAddApplicationForm } from '@/constants/pages/addApplication';
import {
  addApplicationEntryModes,
  addApplicationPriorityOptions,
  addApplicationStatusOptions,
  createDefaultAddApplicationForm,
  getTodayDateInputValue,
  jobFeedPickerFilters,
  jobFeedPickerJobs,
  type AddApplicationEntryMode,
} from '@/constants/pages/addApplication';
import type { ApplicationPriority } from '@/features/applications/types/application.view.types';
import type {
  AddApplicationFormErrors,
  AddApplicationFormField,
} from '@/features/applications/utils/addApplicationValidation';
import { validateAddApplicationForm } from '@/features/applications/utils/addApplicationValidation';
import { buildCreateApplicationPayload } from '@/features/applications/utils/createApplicationPayload';
import {
  AccessTimeOutlinedIcon,
  AutoAwesomeOutlinedIcon,
  BusinessCenterOutlinedIcon,
  CloseIcon,
  EditOutlinedIcon,
  EventOutlinedIcon,
  LanguageOutlinedIcon,
  LightbulbOutlinedIcon,
  LinkOutlinedIcon,
  LocationOnOutlinedIcon,
  SearchOutlinedIcon,
  TuneOutlinedIcon,
  ViewListOutlinedIcon,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

import {
  ApplicationDialog,
  CloseButton,
  DialogBody,
  DialogEyebrow,
  DialogFooter,
  DialogFooterActions,
  DialogFooterNote,
  DialogHeader,
  DialogHeaderAccent,
  DialogHeaderContent,
  DialogHeaderIcon,
  DialogSubtitle,
  DialogTitleGroup,
  DialogTitleText,
  EntryModeTab,
  EntryModeTabDescription,
  EntryModeTabIcon,
  EntryModeTabLabel,
  EntryModeTabs,
  EntryModeTabText,
  FetchButton,
  FetchRow,
  FieldErrorBanner,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormGrid,
  InfoBanner,
  InterestField,
  InterestHint,
  JobFeedAvatar,
  JobFeedCompany,
  JobFeedDetails,
  JobFeedEmpty,
  JobFeedEmptyText,
  JobFeedEmptyTitle,
  JobFeedFilters,
  JobFeedList,
  JobFeedMeta,
  JobFeedOption,
  JobFeedRadio,
  JobFeedTitle,
  JobFeedTrailing,
  MatchBadge,
  PriorityButton,
  PriorityGroup,
  SearchFieldWrap,
  SectionCard,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionHeaderIcon,
  SectionHeaderText,
  SectionTitle,
} from '../ApplicationDialog/styles';
import { InterestRating } from '../InterestRating';
import { SalaryRangeFields } from '../SalaryRangeFields';

const entryModeIcons = {
  edit: EditOutlinedIcon,
  link: LinkOutlinedIcon,
  list: ViewListOutlinedIcon,
} as const;

const priorityLevels: Record<ApplicationPriority, 'low' | 'medium' | 'high'> = {
  high: 'high',
  low: 'low',
  medium: 'medium',
};

const MAX_JOB_TITLE_LENGTH = 160;
const MAX_COMPANY_NAME_LENGTH = 160;
const MAX_LOCATION_LENGTH = 128;
const MAX_URL_LENGTH = 2048;

export interface AddApplicationDialogProps {
  onClose: () => void;
  open: boolean;
}

type FormValidationContext = {
  entryMode: AddApplicationEntryMode;
  form: typeof defaultAddApplicationForm;
  selectedJobId: string;
};

function DialogSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <SectionCard>
      <SectionHeader>
        <SectionHeaderIcon>{icon}</SectionHeaderIcon>
        <SectionHeaderText>
          <SectionTitle>{title}</SectionTitle>
          {description ? <SectionDescription>{description}</SectionDescription> : null}
        </SectionHeaderText>
      </SectionHeader>
      <SectionContent>{children}</SectionContent>
    </SectionCard>
  );
}

function TrackingPreferencesSection({
  fieldError,
  form,
  maxAppliedDate,
  onChange,
  onFieldBlur,
}: {
  fieldError: (field: AddApplicationFormField) => string | undefined;
  form: typeof defaultAddApplicationForm;
  maxAppliedDate: string;
  onChange: <K extends keyof typeof defaultAddApplicationForm>(
    key: K,
    value: (typeof defaultAddApplicationForm)[K],
  ) => void;
  onFieldBlur: (field: AddApplicationFormField) => void;
}) {
  return (
    <DialogSection
      description="Set how this opportunity fits into your pipeline."
      icon={<TuneOutlinedIcon fontSize="small" />}
      title="Tracking preferences"
    >
      <FormGrid>
        <FilterDropdown
          fullWidth
          label="Initial status"
          onChange={(value) => onChange('initialStatus', value)}
          options={addApplicationStatusOptions}
          value={form.initialStatus}
        />

        <Input
          errorMessage={fieldError('appliedDate')}
          fullWidth
          label="Applied date"
          onBlur={() => onFieldBlur('appliedDate')}
          onChange={(event) => {
            const value = event.target.value;

            if (value && value > maxAppliedDate) {
              return;
            }

            onChange('appliedDate', value);
          }}
          size="small"
          slotProps={{
            htmlInput: { max: maxAppliedDate },
            inputLabel: { shrink: true },
          }}
          type="date"
          value={form.appliedDate}
        />
      </FormGrid>

      <FieldGroup>
        <FieldLabel>Priority</FieldLabel>
        <FieldHint>How important is this role to you right now?</FieldHint>
        <PriorityGroup aria-label="Priority">
          {addApplicationPriorityOptions.map((option) => (
            <PriorityButton
              active={form.priority === option.id}
              aria-pressed={form.priority === option.id}
              key={option.id}
              level={priorityLevels[option.id]}
              onClick={() => onChange('priority', option.id)}
              type="button"
            >
              {option.label}
            </PriorityButton>
          ))}
        </PriorityGroup>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Interest level</FieldLabel>
        <InterestField>
          <InterestHint>
            {form.interest > 0
              ? `${form.interest} of 5 stars selected`
              : 'Rate your excitement for this role'}
          </InterestHint>
          <InterestRating
            onChange={(value) => onChange('interest', value)}
            size="large"
            value={form.interest}
          />
        </InterestField>
      </FieldGroup>
    </DialogSection>
  );
}

function ApplicationFormFields({
  entryMode,
  fieldError,
  form,
  onChange,
  onFieldBlur,
}: {
  entryMode: Extract<AddApplicationEntryMode, 'manual' | 'external-url'>;
  fieldError: (field: AddApplicationFormField) => string | undefined;
  form: typeof defaultAddApplicationForm;
  onChange: <K extends keyof typeof defaultAddApplicationForm>(
    key: K,
    value: (typeof defaultAddApplicationForm)[K],
  ) => void;
  onFieldBlur: (field: AddApplicationFormField) => void;
}) {
  return (
    <DialogSection
      description={
        entryMode === 'external-url'
          ? 'Paste a job link and we will help prefill the details when available.'
          : 'Tell us about the role you want to track.'
      }
      icon={<BusinessCenterOutlinedIcon fontSize="small" />}
      title="Job details"
    >
      {entryMode === 'external-url' ? (
        <>
          <FieldGroup>
            <FetchRow>
              <Input
                errorMessage={fieldError('jobUrl')}
                fullWidth
                inputProps={{ maxLength: MAX_URL_LENGTH }}
                label="Job URL"
                onBlur={() => onFieldBlur('jobUrl')}
                onChange={(event) => onChange('jobUrl', event.target.value)}
                placeholder="https://company.com/careers/job"
                required
                size="small"
                type="url"
                value={form.jobUrl}
              />
              <FetchButton type="button">Fetch job details</FetchButton>
            </FetchRow>
          </FieldGroup>

          <InfoBanner>
            <LanguageOutlinedIcon fontSize="small" />
            <span>We&apos;ll use this URL to prefill the job details when available.</span>
          </InfoBanner>
        </>
      ) : null}

      <FormGrid>
        <Input
          errorMessage={fieldError('jobTitle')}
          fullWidth
          inputProps={{ maxLength: MAX_JOB_TITLE_LENGTH }}
          label="Job title"
          onBlur={() => onFieldBlur('jobTitle')}
          onChange={(event) => onChange('jobTitle', event.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          required
          size="small"
          value={form.jobTitle}
        />

        <Input
          errorMessage={fieldError('companyName')}
          fullWidth
          inputProps={{ maxLength: MAX_COMPANY_NAME_LENGTH }}
          label="Company name"
          onBlur={() => onFieldBlur('companyName')}
          onChange={(event) => onChange('companyName', event.target.value)}
          placeholder="e.g. Acme Corp"
          required
          size="small"
          value={form.companyName}
        />

        <Input
          errorMessage={fieldError('location')}
          fullWidth
          inputProps={{ maxLength: MAX_LOCATION_LENGTH }}
          label="Location"
          onBlur={() => onFieldBlur('location')}
          onChange={(event) => onChange('location', event.target.value)}
          placeholder="e.g. Remote or San Francisco, CA"
          size="small"
          value={form.location}
        />

        {entryMode === 'manual' ? (
          <Input
            errorMessage={fieldError('jobUrl')}
            fullWidth
            inputProps={{ maxLength: MAX_URL_LENGTH }}
            label="Job URL"
            onBlur={() => onFieldBlur('jobUrl')}
            onChange={(event) => onChange('jobUrl', event.target.value)}
            placeholder="https://company.com/careers/job"
            size="small"
            type="url"
            value={form.jobUrl}
          />
        ) : null}
      </FormGrid>

      <FieldGroup>
        <FieldLabel>Salary range</FieldLabel>
        <FieldHint>Optional — helps you compare offers later.</FieldHint>
        <SalaryRangeFields
          currency={form.currency}
          onCurrencyChange={(value) => onChange('currency', value)}
          onSalaryMaxBlur={() => onFieldBlur('salaryMax')}
          onSalaryMaxChange={(value) => onChange('salaryMax', value)}
          onSalaryMinBlur={() => onFieldBlur('salaryMin')}
          onSalaryMinChange={(value) => onChange('salaryMin', value)}
          salaryMax={form.salaryMax}
          salaryMaxError={fieldError('salaryMax')}
          salaryMin={form.salaryMin}
          salaryMinError={fieldError('salaryMin')}
        />
      </FieldGroup>
    </DialogSection>
  );
}

function JobFeedPicker({
  fieldError,
  onSelect,
  selectedJobId,
}: {
  fieldError: (field: AddApplicationFormField) => string | undefined;
  onSelect: (jobId: string) => void;
  selectedJobId: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [recommendedFilter, setRecommendedFilter] = useState('recommended');
  const selectionError = fieldError('selectedJobId');

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return jobFeedPickerJobs
      .filter((job) => {
        const matchesSearch =
          !query ||
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query);
        const matchesLocation =
          locationFilter === 'all' ||
          (locationFilter === 'remote' && job.location.toLowerCase().includes('remote')) ||
          (locationFilter === 'hybrid' && job.type.toLowerCase().includes('hybrid'));
        const matchesType =
          jobTypeFilter === 'all' ||
          job.type.toLowerCase().includes(jobTypeFilter.replace('-', ' '));

        return matchesSearch && matchesLocation && matchesType;
      })
      .sort((left, right) => {
        if (recommendedFilter === 'best-match') {
          return right.match - left.match;
        }

        return 0;
      });
  }, [jobTypeFilter, locationFilter, recommendedFilter, searchQuery]);

  return (
    <DialogSection
      description="Browse recommended roles and select the one you want to track."
      icon={<AutoAwesomeOutlinedIcon fontSize="small" />}
      title="Choose from job feed"
    >
      <SearchFieldWrap>
        <Input
          fullWidth
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, company, or skill..."
          size="small"
          startAdornment={<SearchOutlinedIcon fontSize="small" />}
          value={searchQuery}
        />
      </SearchFieldWrap>

      <JobFeedFilters>
        <FilterDropdown
          fullWidth
          label="Location"
          onChange={setLocationFilter}
          options={jobFeedPickerFilters.location}
          value={locationFilter}
        />
        <FilterDropdown
          fullWidth
          label="Job type"
          onChange={setJobTypeFilter}
          options={jobFeedPickerFilters.jobType}
          value={jobTypeFilter}
        />
        <FilterDropdown
          fullWidth
          label="Recommended for you"
          onChange={setRecommendedFilter}
          options={jobFeedPickerFilters.recommended}
          value={recommendedFilter}
        />
      </JobFeedFilters>

      {selectionError ? <FieldErrorBanner role="alert">{selectionError}</FieldErrorBanner> : null}

      <JobFeedList aria-label="Jobs from feed" aria-invalid={Boolean(selectionError)}>
        {filteredJobs.length === 0 ? (
          <JobFeedEmpty>
            <SearchOutlinedIcon fontSize="small" />
            <JobFeedEmptyTitle>No matching jobs found</JobFeedEmptyTitle>
            <JobFeedEmptyText>
              Try adjusting your search or filters to discover more opportunities.
            </JobFeedEmptyText>
          </JobFeedEmpty>
        ) : (
          filteredJobs.map((job) => (
            <JobFeedOption key={job.id} selected={selectedJobId === job.id}>
              <JobFeedAvatar backgroundColor={job.avatarColor}>{job.initials}</JobFeedAvatar>
              <JobFeedMeta>
                <JobFeedTitle>{job.title}</JobFeedTitle>
                <JobFeedCompany>{job.company}</JobFeedCompany>
                <JobFeedDetails>
                  <LocationOnOutlinedIcon sx={{ fontSize: '0.875rem' }} />
                  {job.location} • {job.type}
                </JobFeedDetails>
              </JobFeedMeta>
              <JobFeedTrailing>
                <MatchBadge>{job.match}% match</MatchBadge>
                <JobFeedRadio
                  checked={selectedJobId === job.id}
                  inputProps={{ 'aria-label': `Select ${job.title} at ${job.company}` }}
                  name="job-feed-selection"
                  onChange={() => onSelect(job.id)}
                  value={job.id}
                />
              </JobFeedTrailing>
            </JobFeedOption>
          ))
        )}
      </JobFeedList>
    </DialogSection>
  );
}

export function AddApplicationDialog({ onClose, open }: AddApplicationDialogProps) {
  const { showToast } = useToast();
  const createApplication = useCreateApplication();
  const [entryMode, setEntryMode] = useState<AddApplicationEntryMode>('manual');
  const [form, setForm] = useState(createDefaultAddApplicationForm);
  const [selectedJobId, setSelectedJobId] = useState(jobFeedPickerJobs[0]?.id ?? '');
  const [errors, setErrors] = useState<AddApplicationFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<AddApplicationFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const selectedJob = useMemo(
    () => jobFeedPickerJobs.find((job) => job.id === selectedJobId),
    [selectedJobId],
  );

  const validationContext: FormValidationContext = {
    entryMode,
    form,
    selectedJobId,
  };

  const runValidation = (context: FormValidationContext = validationContext) =>
    validateAddApplicationForm(context.entryMode, context.form, context.selectedJobId);

  const fieldError = (field: AddApplicationFormField) => {
    if (!submitAttempted && !touched[field]) {
      return undefined;
    }

    return errors[field];
  };

  const clearValidationState = () => {
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  };

  const updateForm = <K extends keyof typeof defaultAddApplicationForm>(
    key: K,
    value: (typeof defaultAddApplicationForm)[K],
  ) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);

    if (submitAttempted || touched[key as AddApplicationFormField]) {
      setErrors(validateAddApplicationForm(entryMode, nextForm, selectedJobId).errors);
    }
  };

  const handleFieldBlur = (field: AddApplicationFormField) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(runValidation().errors);
  };

  const handleEntryModeChange = (mode: AddApplicationEntryMode) => {
    setEntryMode(mode);
    clearValidationState();
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setTouched((current) => ({ ...current, selectedJobId: true }));
    setErrors(runValidation({ ...validationContext, selectedJobId: jobId }).errors);
  };

  const resetDialog = () => {
    setEntryMode('manual');
    setForm(createDefaultAddApplicationForm());
    setSelectedJobId(jobFeedPickerJobs[0]?.id ?? '');
    clearValidationState();
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const handleSubmit = async () => {
    const validation = runValidation();

    flushSync(() => {
      setSubmitAttempted(true);
      setErrors(validation.errors);
    });

    if (!validation.isValid) {
      showToast({
        message: validation.firstError ?? 'Please fix the highlighted fields.',
        severity: 'error',
      });
      return;
    }

    try {
      const payload = buildCreateApplicationPayload(entryMode, form, selectedJob);

      if (form.appliedDate.trim()) {
        payload.appliedAt = form.appliedDate.trim();
      }

      await createApplication.mutateAsync(payload);

      showToast({ message: 'Application added successfully', severity: 'success' });
      handleClose();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to add application.',
        severity: 'error',
      });
    }
  };

  const submitLabel = entryMode === 'job-feed' ? 'Track selected job' : 'Add application';
  const maxAppliedDate = getTodayDateInputValue();

  return (
    <ApplicationDialog
      aria-labelledby="add-application-title"
      fullWidth
      maxWidth={false}
      onClose={handleClose}
      open={open}
      scroll="paper"
    >
      <DialogHeaderAccent />

      <DialogHeader>
        <DialogHeaderContent>
          <DialogHeaderIcon>
            <WorkOutlineOutlinedIcon />
          </DialogHeaderIcon>
          <DialogTitleGroup>
            <DialogEyebrow>New application</DialogEyebrow>
            <DialogTitleText id="add-application-title">Add application</DialogTitleText>
            <DialogSubtitle>Track a job opportunity and keep your search organized.</DialogSubtitle>
          </DialogTitleGroup>
        </DialogHeaderContent>
        <CloseButton aria-label="Close add application dialog" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </DialogHeader>

      <DialogBody>
        <DialogSection
          description="Pick the fastest way to add this opportunity to your pipeline."
          icon={<LightbulbOutlinedIcon fontSize="small" />}
          title="How would you like to add it?"
        >
          <EntryModeTabs aria-label="Add application entry mode" role="tablist">
            {addApplicationEntryModes.map((mode) => {
              const Icon = entryModeIcons[mode.icon];

              return (
                <EntryModeTab
                  active={entryMode === mode.id}
                  aria-selected={entryMode === mode.id}
                  key={mode.id}
                  onClick={() => handleEntryModeChange(mode.id)}
                  role="tab"
                  type="button"
                >
                  <EntryModeTabIcon active={entryMode === mode.id}>
                    <Icon fontSize="small" />
                  </EntryModeTabIcon>
                  <EntryModeTabText>
                    <EntryModeTabLabel active={entryMode === mode.id}>
                      {mode.label}
                    </EntryModeTabLabel>
                    <EntryModeTabDescription>{mode.description}</EntryModeTabDescription>
                  </EntryModeTabText>
                </EntryModeTab>
              );
            })}
          </EntryModeTabs>
        </DialogSection>

        {entryMode === 'job-feed' ? (
          <JobFeedPicker
            fieldError={fieldError}
            onSelect={handleJobSelect}
            selectedJobId={selectedJobId}
          />
        ) : (
          <ApplicationFormFields
            entryMode={entryMode}
            fieldError={fieldError}
            form={form}
            onChange={updateForm}
            onFieldBlur={handleFieldBlur}
          />
        )}

        <TrackingPreferencesSection
          fieldError={fieldError}
          form={form}
          maxAppliedDate={maxAppliedDate}
          onChange={updateForm}
          onFieldBlur={handleFieldBlur}
        />
      </DialogBody>

      <DialogFooter>
        {entryMode === 'job-feed' ? (
          <DialogFooterNote>
            <AccessTimeOutlinedIcon fontSize="small" />
            You can update the application status after tracking.
          </DialogFooterNote>
        ) : (
          <DialogFooterNote>
            <EventOutlinedIcon fontSize="small" />
            Fields marked required must be filled before saving.
          </DialogFooterNote>
        )}

        <DialogFooterActions>
          <Button disabled={createApplication.isPending} onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={createApplication.isPending} onClick={() => void handleSubmit()}>
            {createApplication.isPending ? 'Saving...' : submitLabel}
          </Button>
        </DialogFooterActions>
      </DialogFooter>
    </ApplicationDialog>
  );
}
