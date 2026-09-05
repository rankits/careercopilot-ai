import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import CloseIcon from '@mui/icons-material/Close';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import MenuItem from '@mui/material/MenuItem';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail';
import {
  useAddApplicationNote,
  useTransitionApplicationStatus,
  useUpdateApplication,
} from '@/features/applications/hooks/useApplicationMutations';

import {
  addApplicationPriorityOptions,
  getTodayDateInputValue,
  MAX_APPLICATION_NOTE_LENGTH,
} from '@/constants/pages/addApplication';
import { applicationDetailStatusOptions } from '@/constants/pages/applicationDetail';
import type { ApiApplicationStatus } from '@/features/applications/types/application.types';
import type { ApplicationPriority } from '@/features/applications/types/application.view.types';
import { validateApplicationNoteContent } from '@/features/applications/utils/addApplicationValidation';
import {
  mapApiPriorityToUi,
  mapUiPriorityToApi,
  toDateInputValue,
} from '@/features/applications/utils/applicationMappers';
import type {
  EditApplicationFormField,
  EditApplicationFormErrors,
  EditApplicationFormState,
} from '@/features/applications/utils/editApplicationValidation';
import { validateEditApplicationForm } from '@/features/applications/utils/editApplicationValidation';

import {
  ApplicationDialog,
  CloseButton,
  DialogBody,
  DialogEyebrow,
  DialogFooter,
  DialogFooterActions,
  DialogHeader,
  DialogHeaderAccent,
  DialogHeaderContent,
  DialogHeaderIcon,
  DialogSubtitle,
  DialogTitleGroup,
  DialogTitleText,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormGrid,
  InterestField,
  InterestHint,
  PriorityButton,
  PriorityGroup,
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

const priorityLevels: Record<ApplicationPriority, 'low' | 'medium' | 'high'> = {
  high: 'high',
  low: 'low',
  medium: 'medium',
};

export interface EditApplicationDialogProps {
  applicationId: string | null;
  onClose: () => void;
  open: boolean;
}

export function EditApplicationDialog({
  applicationId,
  onClose,
  open,
}: EditApplicationDialogProps) {
  const { showToast } = useToast();
  const { data, isError, isLoading } = useApplicationDetail(open ? applicationId : null);
  const updateApplication = useUpdateApplication(applicationId ?? '');
  const transitionStatus = useTransitionApplicationStatus(applicationId ?? '');
  const addNote = useAddApplicationNote(applicationId ?? '');

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ApiApplicationStatus>('PREPARING');
  const [priority, setPriority] = useState<ApplicationPriority>('medium');
  const [interest, setInterest] = useState(0);
  const [appliedDate, setAppliedDate] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<EditApplicationFormErrors>({});
  const [noteError, setNoteError] = useState<string | undefined>();
  const [touched, setTouched] = useState<Partial<Record<EditApplicationFormField, boolean>>>({});
  const [notesTouched, setNotesTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isSaving = updateApplication.isPending || transitionStatus.isPending || addNote.isPending;

  const getFormState = (): EditApplicationFormState => ({
    appliedDate,
    companyName,
    jobTitle,
    location,
    salaryMax,
    salaryMin,
  });

  const runValidation = (form: EditApplicationFormState = getFormState()) =>
    validateEditApplicationForm(form);

  const fieldError = (field: EditApplicationFormField) => {
    if (!submitAttempted && !touched[field]) {
      return undefined;
    }

    return errors[field];
  };

  const clearValidationState = () => {
    setErrors({});
    setNoteError(undefined);
    setTouched({});
    setNotesTouched(false);
    setSubmitAttempted(false);
  };

  const updateFormField = (field: EditApplicationFormField, value: string) => {
    const nextForm = { ...getFormState(), [field]: value };

    switch (field) {
      case 'appliedDate':
        setAppliedDate(value);
        break;
      case 'companyName':
        setCompanyName(value);
        break;
      case 'jobTitle':
        setJobTitle(value);
        break;
      case 'location':
        setLocation(value);
        break;
      case 'salaryMax':
        setSalaryMax(value);
        break;
      case 'salaryMin':
        setSalaryMin(value);
        break;
      default:
        break;
    }

    if (submitAttempted || touched[field]) {
      setErrors(runValidation(nextForm).errors);
    }
  };

  const handleFieldBlur = (field: EditApplicationFormField) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(runValidation().errors);
  };

  useEffect(() => {
    if (!open) {
      clearValidationState();
      return;
    }

    if (!data) {
      return;
    }

    setJobTitle(data.jobTitle);
    setCompanyName(data.companyName);
    setLocation(data.location ?? '');
    setStatus(data.currentStatus);
    setPriority(mapApiPriorityToUi(data.priority));
    setInterest(data.interestLevel ?? 0);
    setAppliedDate(toDateInputValue(data.appliedAt));
    setSalaryMin(data.salaryMin ?? '');
    setSalaryMax(data.salaryMax ?? '');
    setCurrency(data.salaryCurrency ?? 'USD');
    setNotes('');
    clearValidationState();
  }, [data, open]);

  const handleClose = () => {
    clearValidationState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!applicationId) {
      return;
    }

    const validation = runValidation();
    const nextNoteError = validateApplicationNoteContent(notes);

    flushSync(() => {
      setSubmitAttempted(true);
      setErrors(validation.errors);
      setNoteError(nextNoteError);
    });

    if (!validation.isValid || nextNoteError) {
      showToast({
        message: validation.firstError ?? nextNoteError ?? 'Please fix the highlighted fields.',
        severity: 'error',
      });
      return;
    }

    try {
      await updateApplication.mutateAsync({
        appliedAt: appliedDate.trim() || null,
        companyName: companyName.trim(),
        interestLevel: interest > 0 ? interest : null,
        jobTitle: jobTitle.trim(),
        location: location.trim() || null,
        priority: mapUiPriorityToApi(priority),
        salaryCurrency: currency || null,
        salaryMax: salaryMax.trim() ? Number(salaryMax) : null,
        salaryMin: salaryMin.trim() ? Number(salaryMin) : null,
        salaryPeriod: salaryMin.trim() || salaryMax.trim() ? 'YEAR' : null,
      });

      if (status !== data?.currentStatus) {
        await transitionStatus.mutateAsync({ toStatus: status });
      }

      const noteContent = notes.trim();

      if (noteContent) {
        await addNote.mutateAsync({ content: noteContent });
      }

      showToast({ message: 'Application updated successfully', severity: 'success' });
      handleClose();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update application.',
        severity: 'error',
      });
    }
  };

  const maxAppliedDate = getTodayDateInputValue();

  return (
    <ApplicationDialog
      aria-labelledby="edit-application-title"
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
            <BusinessCenterOutlinedIcon />
          </DialogHeaderIcon>
          <DialogTitleGroup>
            <DialogEyebrow>Edit application</DialogEyebrow>
            <DialogTitleText id="edit-application-title">Update application</DialogTitleText>
            <DialogSubtitle>
              Keep your application details accurate as things change.
            </DialogSubtitle>
          </DialogTitleGroup>
        </DialogHeaderContent>
        <CloseButton aria-label="Close edit application dialog" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </DialogHeader>

      <DialogBody>
        {isLoading ? (
          <SectionCard>Loading application details...</SectionCard>
        ) : isError || !data ? (
          <SectionCard>Unable to load application details.</SectionCard>
        ) : (
          <>
            <SectionCard>
              <SectionHeader>
                <SectionHeaderIcon>
                  <BusinessCenterOutlinedIcon fontSize="small" />
                </SectionHeaderIcon>
                <SectionHeaderText>
                  <SectionTitle>Job details</SectionTitle>
                  <SectionDescription>
                    Update the core information for this application.
                  </SectionDescription>
                </SectionHeaderText>
              </SectionHeader>
              <SectionContent>
                <FormGrid>
                  <Input
                    errorMessage={fieldError('jobTitle')}
                    fullWidth
                    label="Job title"
                    onBlur={() => handleFieldBlur('jobTitle')}
                    onChange={(event) => updateFormField('jobTitle', event.target.value)}
                    required
                    size="small"
                    value={jobTitle}
                  />
                  <Input
                    errorMessage={fieldError('companyName')}
                    fullWidth
                    label="Company name"
                    onBlur={() => handleFieldBlur('companyName')}
                    onChange={(event) => updateFormField('companyName', event.target.value)}
                    required
                    size="small"
                    value={companyName}
                  />
                  <Input
                    errorMessage={fieldError('location')}
                    fullWidth
                    label="Location"
                    onBlur={() => handleFieldBlur('location')}
                    onChange={(event) => updateFormField('location', event.target.value)}
                    size="small"
                    value={location}
                  />
                </FormGrid>

                <FieldGroup>
                  <FieldLabel>Salary range</FieldLabel>
                  <FieldHint>Optional — helps you compare offers later.</FieldHint>
                  <SalaryRangeFields
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    onSalaryMaxBlur={() => handleFieldBlur('salaryMax')}
                    onSalaryMaxChange={(value) => updateFormField('salaryMax', value)}
                    onSalaryMinBlur={() => handleFieldBlur('salaryMin')}
                    onSalaryMinChange={(value) => updateFormField('salaryMin', value)}
                    salaryMax={salaryMax}
                    salaryMaxError={fieldError('salaryMax')}
                    salaryMin={salaryMin}
                    salaryMinError={fieldError('salaryMin')}
                  />
                </FieldGroup>
              </SectionContent>
            </SectionCard>

            <SectionCard>
              <SectionHeader>
                <SectionHeaderIcon>
                  <TuneOutlinedIcon fontSize="small" />
                </SectionHeaderIcon>
                <SectionHeaderText>
                  <SectionTitle>Tracking preferences</SectionTitle>
                  <SectionDescription>
                    Set how this opportunity fits into your pipeline.
                  </SectionDescription>
                </SectionHeaderText>
              </SectionHeader>
              <SectionContent>
                <FormGrid>
                  <Input
                    fullWidth
                    label="Status"
                    onChange={(event) => setStatus(event.target.value as ApiApplicationStatus)}
                    select
                    size="small"
                    value={status}
                  >
                    {applicationDetailStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Input>
                  <Input
                    errorMessage={fieldError('appliedDate')}
                    fullWidth
                    label="Applied date"
                    onBlur={() => handleFieldBlur('appliedDate')}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value && value > maxAppliedDate) {
                        return;
                      }
                      updateFormField('appliedDate', value);
                    }}
                    size="small"
                    slotProps={{
                      htmlInput: { max: maxAppliedDate },
                      inputLabel: { shrink: true },
                    }}
                    type="date"
                    value={appliedDate}
                  />
                </FormGrid>

                <FieldGroup>
                  <FieldLabel>Priority</FieldLabel>
                  <PriorityGroup aria-label="Priority">
                    {addApplicationPriorityOptions.map((option) => (
                      <PriorityButton
                        active={priority === option.id}
                        aria-pressed={priority === option.id}
                        key={option.id}
                        level={priorityLevels[option.id]}
                        onClick={() => setPriority(option.id)}
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
                      {interest > 0
                        ? `${interest} of 5 stars selected`
                        : 'Rate your excitement for this role'}
                    </InterestHint>
                    <InterestRating onChange={setInterest} size="large" value={interest} />
                  </InterestField>
                </FieldGroup>
              </SectionContent>
            </SectionCard>

            <SectionCard>
              <SectionHeader>
                <SectionHeaderText>
                  <SectionTitle>Notes</SectionTitle>
                  <SectionDescription>
                    {data.notes.length > 0
                      ? `${data.notes.length} saved note${data.notes.length === 1 ? '' : 's'}. Add another below.`
                      : 'Optional — add context about this application when saving.'}
                  </SectionDescription>
                </SectionHeaderText>
              </SectionHeader>
              <SectionContent>
                <FieldGroup>
                  <FieldLabel htmlFor="edit-application-note">Add a note</FieldLabel>
                  <FieldHint>Optional — saved when you update this application.</FieldHint>
                  <Input
                    errorMessage={submitAttempted || notesTouched ? noteError : undefined}
                    fullWidth
                    id="edit-application-note"
                    inputProps={{ maxLength: MAX_APPLICATION_NOTE_LENGTH }}
                    multiline
                    onBlur={() => {
                      setNotesTouched(true);
                      setNoteError(validateApplicationNoteContent(notes));
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNotes(value);

                      if (submitAttempted || notesTouched) {
                        setNoteError(validateApplicationNoteContent(value));
                      }
                    }}
                    placeholder="Capture interview feedback, recruiter updates, or next steps..."
                    rows={3}
                    size="small"
                    value={notes}
                  />
                </FieldGroup>
              </SectionContent>
            </SectionCard>
          </>
        )}
      </DialogBody>

      <DialogFooter>
        <DialogFooterActions>
          <Button disabled={isSaving} onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSaving || isLoading || isError} onClick={() => void handleSubmit()}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooterActions>
      </DialogFooter>
    </ApplicationDialog>
  );
}
