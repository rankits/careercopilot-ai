import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { ROUTES } from '@/constants/routes';
import {
  DEFAULT_AI_MAIL_JD_LIMIT,
  DEFAULT_MAIL_GENERATION_CONSTRAINTS,
  isAiMailVersionConflict,
  useAiMailConfig,
  useAiMailDraft,
  useAiMailDraftRevisions,
  useAiMailDrafts,
  useAiMailGenerationReadiness,
  useAiMailProfileSummary,
  useAiMailResumes,
  useArchiveAiMailDraft,
  useCreateAiMailDraft,
  useGenerateAiMailDraft,
  useGenerateAiMailSubject,
  useMarkAiMailDraftReady,
  useRegenerateAiMailDraft,
  useRestoreAiMailDraftRevision,
  useRewriteAiMailDraft,
  useSendAiMailDraft,
  useAiMailSendPreview,
  useAiMailDraftDeliveries,
  useAiMailSendLimits,
  useUpdateAiMailDraft,
  type AiMailGenerationResult,
  type AiMailResumeListItem,
  type AiMailRewritePayload,
  type GenerationWarning,
  type UpdateAiMailDraftPayload,
} from '@/features/ai-mail';
import {
  Alert,
  ArchiveOutlinedIcon,
  Box,
  CheckCircleOutlineIcon,
  Chip,
  CircularProgress,
  DescriptionOutlinedIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  HistoryOutlinedIcon,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  PersonOutlineIcon,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  WarningAmberOutlinedIcon,
} from '@/lib/material';
import {
  connectedAccountsService,
  type ConnectedAccount,
} from '@/services/connected-accounts.service';

import { SentHistoryPanel } from './SentHistoryPanel';

interface SkeletonSectionProps {
  number: number;
  title: string;
  children: ReactNode;
}

function SkeletonSection({ number, title, children }: SkeletonSectionProps) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ borderRadius: 2.5, minWidth: 0, p: { xs: 2, md: 2.5 } }}
    >
      <Stack alignItems="center" direction="row" spacing={1.25} sx={{ mb: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            alignItems: 'center',
            bgcolor: 'primary.50',
            borderRadius: '50%',
            color: 'primary.main',
            display: 'flex',
            fontSize: 12,
            fontWeight: 700,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}
        >
          {number}
        </Box>
        <Typography component="h2" fontSize={15} fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

interface DraftForm {
  recruiterEmail: string;
  recruiterName: string;
  companyName: string;
  roleTitle: string;
  jobUrl: string;
  jobDescription: string;
  additionalContext: string;
  resumeId: string;
  subject: string;
  bodyText: string;
}

const EMPTY_FORM: DraftForm = {
  recruiterEmail: '',
  recruiterName: '',
  companyName: '',
  roleTitle: '',
  jobUrl: '',
  jobDescription: '',
  additionalContext: '',
  resumeId: '',
  subject: '',
  bodyText: '',
};

const DRAFT_LIST_PARAMS = { page: 1, limit: 20 } as const;

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function formatUpdatedAt(value?: string): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function resumeStatusLabel(resume: AiMailResumeListItem): string {
  if (resume.eligibleForAiMail) {
    return resume.availability === 'needs_review' ? 'Needs review' : 'Ready';
  }
  if (resume.availability === 'processing') return 'Processing';
  if (resume.availability === 'failed') return 'Failed';
  return 'Not parsed';
}

type PendingGenerationAction =
  | { kind: 'generate'; idempotencyKey: string }
  | { kind: 'regenerate'; idempotencyKey: string }
  | { kind: 'generate-subject'; idempotencyKey: string }
  | { kind: 'rewrite'; payload: AiMailRewritePayload };

function revisionSourceLabel(source: string): string {
  return source.replaceAll('_', ' ');
}

function hasUnsavedContentEdits(
  form: DraftForm,
  draft: { subject?: string; bodyText?: string } | undefined,
): boolean {
  if (!draft) return false;
  return (
    (form.subject ?? '') !== (draft.subject ?? '') ||
    (form.bodyText ?? '') !== (draft.bodyText ?? '')
  );
}

export function AiMailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDraftId = searchParams.get('draftId');
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [resumePickerOpen, setResumePickerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [generationApplied, setGenerationApplied] = useState(false);
  const [generationAnnouncement, setGenerationAnnouncement] = useState<string | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<GenerationWarning[]>([]);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [pendingGenerationAction, setPendingGenerationAction] =
    useState<PendingGenerationAction | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedConnectedAccountId, setSelectedConnectedAccountId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'sent'>(
    searchParams.get('tab') === 'sent' ? 'sent' : 'compose',
  );
  const bodyEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const { showToast } = useToast();

  const configQuery = useAiMailConfig();
  const resumesQuery = useAiMailResumes();
  const profileQuery = useAiMailProfileSummary();
  const draftsQuery = useAiMailDrafts(DRAFT_LIST_PARAMS);
  const draftQuery = useAiMailDraft(selectedDraftId);
  const readinessQuery = useAiMailGenerationReadiness(selectedDraftId);
  const createDraft = useCreateAiMailDraft();
  const updateDraft = useUpdateAiMailDraft(selectedDraftId);
  const archiveDraft = useArchiveAiMailDraft(selectedDraftId);
  const markReady = useMarkAiMailDraftReady(selectedDraftId);
  const generateDraft = useGenerateAiMailDraft(selectedDraftId);
  const regenerateDraft = useRegenerateAiMailDraft(selectedDraftId);
  const rewriteDraft = useRewriteAiMailDraft(selectedDraftId);
  const generateSubject = useGenerateAiMailSubject(selectedDraftId);
  const revisionsQuery = useAiMailDraftRevisions(selectedDraftId);
  const restoreRevision = useRestoreAiMailDraftRevision(selectedDraftId);
  const sendDraft = useSendAiMailDraft(selectedDraftId);
  const selectedDraft = draftQuery.data;

  const mailSendingEnabled = Boolean(
    configQuery.data?.phase2.mailSendingEnabled && configQuery.data?.phase2.gmailIntegrationEnabled,
  );

  const connectedAccountsQuery = useQuery({
    queryKey: ['connected-accounts', 'list'],
    queryFn: () => connectedAccountsService.getAccounts(),
    enabled: mailSendingEnabled,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const activeGoogleAccounts = useMemo(
    () =>
      (connectedAccountsQuery.data ?? []).filter(
        (account: ConnectedAccount) => account.provider === 'GOOGLE' && account.status === 'ACTIVE',
      ),
    [connectedAccountsQuery.data],
  );

  useEffect(() => {
    if (!sendDialogOpen) return;
    if (selectedConnectedAccountId) return;
    if (activeGoogleAccounts[0]) {
      setSelectedConnectedAccountId(activeGoogleAccounts[0].id);
    }
  }, [activeGoogleAccounts, selectedConnectedAccountId, sendDialogOpen]);

  const sendPreviewQuery = useAiMailSendPreview(
    selectedDraftId,
    selectedConnectedAccountId,
    sendDialogOpen && mailSendingEnabled,
  );
  const draftDeliveriesQuery = useAiMailDraftDeliveries(
    selectedDraftId,
    mailSendingEnabled && Boolean(selectedDraftId),
  );
  const sendLimitsQuery = useAiMailSendLimits(mailSendingEnabled);

  const jdLimit = configQuery.data?.limits.maxJobDescriptionCharacters ?? DEFAULT_AI_MAIL_JD_LIMIT;
  const selectedResume = useMemo(
    () => resumesQuery.data?.items.find((item) => item.id === form.resumeId),
    [form.resumeId, resumesQuery.data?.items],
  );

  useEffect(() => {
    if (!selectedDraft) return;
    setForm({
      recruiterEmail: selectedDraft.recruiterEmail,
      recruiterName: selectedDraft.recruiterName ?? '',
      companyName: selectedDraft.companyName ?? '',
      roleTitle: selectedDraft.roleTitle ?? '',
      jobUrl: selectedDraft.jobUrl ?? '',
      jobDescription: selectedDraft.jobDescription,
      additionalContext: selectedDraft.additionalContext ?? '',
      resumeId: selectedDraft.resumeId,
      subject: selectedDraft.subject ?? '',
      bodyText: selectedDraft.bodyText ?? '',
    });
    setActionError(null);
    setSaveStatus(null);
    setGenerationWarnings([]);
    setGenerationApplied(false);
  }, [selectedDraft]);

  useEffect(() => {
    const primaryResumeId = resumesQuery.data?.primaryResumeId;
    if (selectedDraftId || form.resumeId || !primaryResumeId) return;
    setForm((current) => (current.resumeId ? current : { ...current, resumeId: primaryResumeId }));
  }, [form.resumeId, resumesQuery.data?.primaryResumeId, selectedDraftId]);

  const updateField = (field: keyof DraftForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveStatus(null);
    setGenerationApplied(false);
  };

  const selectDraft = (draftId: string) => {
    setSearchParams({ draftId });
    setActionError(null);
  };

  const startNewDraft = () => {
    setSearchParams({});
    setForm({
      ...EMPTY_FORM,
      resumeId: resumesQuery.data?.primaryResumeId ?? '',
    });
    setActionError(null);
    setSaveStatus(null);
  };

  const draftPayload = () => ({
    recruiterEmail: form.recruiterEmail.trim(),
    recruiterName: optional(form.recruiterName),
    companyName: optional(form.companyName),
    roleTitle: optional(form.roleTitle),
    jobUrl: optional(form.jobUrl),
    jobDescription: form.jobDescription.trim(),
    additionalContext: optional(form.additionalContext),
    resumeId: form.resumeId.trim(),
    constraints: selectedDraft?.constraints ?? { ...DEFAULT_MAIL_GENERATION_CONSTRAINTS },
    subject: optional(form.subject),
    bodyText: optional(form.bodyText),
  });

  const updatePayload = (version: number): UpdateAiMailDraftPayload => ({
    recruiterEmail: form.recruiterEmail.trim(),
    recruiterName: optional(form.recruiterName) ?? null,
    companyName: optional(form.companyName) ?? null,
    roleTitle: optional(form.roleTitle) ?? null,
    jobUrl: optional(form.jobUrl) ?? null,
    jobDescription: form.jobDescription.trim(),
    additionalContext: optional(form.additionalContext) ?? null,
    resumeId: form.resumeId.trim(),
    constraints: selectedDraft?.constraints ?? { ...DEFAULT_MAIL_GENERATION_CONSTRAINTS },
    subject: optional(form.subject) ?? null,
    bodyText: optional(form.bodyText) ?? null,
    version,
  });

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    setActionError(message);
    setSaveStatus(null);
    showToast({ message, severity: 'error' });
  };

  const handleCreate = async () => {
    setActionError(null);
    try {
      const created = await createDraft.mutateAsync(draftPayload());
      selectDraft(created.id);
      setSaveStatus('Draft created');
      showToast({ message: 'AI Mail draft created.', severity: 'success' });
    } catch (error) {
      handleError(error);
    }
  };

  const handleSave = async () => {
    if (!selectedDraft) return;
    setActionError(null);
    try {
      await updateDraft.mutateAsync(updatePayload(selectedDraft.version));
      setSaveStatus('All changes saved');
      showToast({ message: 'AI Mail draft saved.', severity: 'success' });
    } catch (error) {
      handleError(error);
    }
  };

  const handleSelectResume = async (resumeId: string) => {
    setResumePickerOpen(false);
    if (resumeId === form.resumeId) return;
    updateField('resumeId', resumeId);
    if (!selectedDraft) return;
    setActionError(null);
    try {
      await updateDraft.mutateAsync({
        ...updatePayload(selectedDraft.version),
        resumeId,
      });
      setSaveStatus('Resume updated');
      showToast({ message: 'Selected resume updated.', severity: 'success' });
    } catch (error) {
      handleError(error);
    }
  };

  const handleUseDetectedDetails = () => {
    const suggested = readinessQuery.data?.suggestedJobMetadata;
    if (!suggested) return;
    setForm((current) => ({
      ...current,
      roleTitle: current.roleTitle.trim() || suggested.roleTitle || current.roleTitle,
      companyName: current.companyName.trim() || suggested.companyName || current.companyName,
    }));
    setSaveStatus(null);
  };

  const handleMarkReady = async () => {
    if (!selectedDraft) return;
    setActionError(null);
    try {
      const saved = await updateDraft.mutateAsync(updatePayload(selectedDraft.version));
      await markReady.mutateAsync({ version: saved.version });
      showToast({ message: 'Draft marked ready.', severity: 'success' });
    } catch (error) {
      handleError(error);
    }
  };

  const openSendDialog = () => {
    setActionError(null);
    setSendDialogOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!selectedDraft || !selectedConnectedAccountId) return;
    const preview = sendPreviewQuery.data;
    if (!preview?.canSend || !preview.contentHash) {
      setActionError('Send preview is not ready. Connect Google and mark the draft ready.');
      return;
    }

    setActionError(null);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `send-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await sendDraft.mutateAsync({
        version: preview.version,
        contentHash: preview.contentHash,
        connectedAccountId: selectedConnectedAccountId,
        idempotencyKey,
      });
      setSendDialogOpen(false);
      showToast({
        message: result.idempotentReplay
          ? 'Email was already sent (idempotent replay).'
          : 'Email sent via Gmail.',
        severity: 'success',
      });
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code ?? '')
          : '';
      if (
        code === 'CONNECTED_ACCOUNT_REAUTH_REQUIRED' ||
        code === 'CONNECTED_ACCOUNT_MISSING_GMAIL_SEND_SCOPE' ||
        code === 'CONNECTED_ACCOUNT_INACTIVE'
      ) {
        setActionError(
          'Your Google mailbox needs reconnection before sending. Open Connected Accounts to reconnect.',
        );
      } else if (code === 'MAIL_DELIVERY_AMBIGUOUS') {
        setActionError(
          'Send outcome is ambiguous. Check your Gmail Sent folder before trying again.',
        );
      } else {
        handleError(error);
      }
    }
  };

  const handleArchive = async () => {
    if (!selectedDraft) return;
    setActionError(null);
    try {
      await archiveDraft.mutateAsync({ version: selectedDraft.version });
      setArchiveOpen(false);
      startNewDraft();
      showToast({ message: 'AI Mail draft archived.', severity: 'success' });
    } catch (error) {
      setArchiveOpen(false);
      handleError(error);
    }
  };

  const applyGenerationResult = (result: AiMailGenerationResult) => {
    setForm((current) => ({
      ...current,
      subject: result.output.subject,
      bodyText: result.output.bodyText,
    }));
    setGenerationWarnings(result.output.warnings);
    setSaveStatus(null);
    setGenerationApplied(true);
    setGenerationAnnouncement('Personalized draft ready.');
    window.requestAnimationFrame(() => bodyEditorRef.current?.focus());
  };

  const runGenerationAction = async (
    action: PendingGenerationAction,
    confirmOverwriteUserEdits = false,
    versionOverride?: number,
  ) => {
    if (!selectedDraft) return;
    const version = versionOverride ?? selectedDraft.version;
    setActionError(null);
    setGenerationAnnouncement('Creating a personalized draft...');
    try {
      let result: AiMailGenerationResult;
      if (action.kind === 'generate') {
        result = await generateDraft.mutateAsync({
          version,
          idempotencyKey: action.idempotencyKey,
          confirmOverwriteUserEdits,
        });
      } else if (action.kind === 'regenerate') {
        result = await regenerateDraft.mutateAsync({
          version,
          idempotencyKey: action.idempotencyKey,
          confirmOverwriteUserEdits,
        });
      } else if (action.kind === 'generate-subject') {
        result = await generateSubject.mutateAsync({
          version,
          idempotencyKey: action.idempotencyKey,
          confirmOverwriteUserEdits,
        });
      } else {
        result = await rewriteDraft.mutateAsync({
          ...action.payload,
          version,
          confirmOverwriteUserEdits,
        });
      }
      applyGenerationResult(result);
      showToast({
        message: result.idempotentReplay ? 'Loaded cached generation result.' : 'Draft updated.',
        severity: 'success',
      });
    } catch (error) {
      setGenerationAnnouncement(null);
      handleError(error);
      throw error;
    }
  };

  const requestGenerationAction = (action: PendingGenerationAction) => {
    if (!selectedDraft) return;
    const needsConfirmation =
      hasUnsavedContentEdits(form, selectedDraft) || selectedDraft.userEdited;
    if (needsConfirmation) {
      setPendingGenerationAction(action);
      setOverwriteDialogOpen(true);
      return;
    }
    void runGenerationAction(action);
  };

  const handleGenerateEmail = () => {
    requestGenerationAction({ kind: 'generate', idempotencyKey: crypto.randomUUID() });
  };

  const handleRegenerateEmail = () => {
    requestGenerationAction({ kind: 'regenerate', idempotencyKey: crypto.randomUUID() });
  };

  const handleGenerateSubject = () => {
    requestGenerationAction({ kind: 'generate-subject', idempotencyKey: crypto.randomUUID() });
  };

  const handleRewrite = (payload: AiMailRewritePayload) => {
    requestGenerationAction({ kind: 'rewrite', payload });
  };

  const handleOverwriteCancel = () => {
    setOverwriteDialogOpen(false);
    setPendingGenerationAction(null);
  };

  const handleOverwriteDiscard = async () => {
    if (!pendingGenerationAction) return;
    setOverwriteDialogOpen(false);
    const action = pendingGenerationAction;
    setPendingGenerationAction(null);
    await runGenerationAction(action, true);
  };

  const handleOverwriteSaveAndContinue = async () => {
    if (!selectedDraft || !pendingGenerationAction) return;
    setActionError(null);
    try {
      const saved = await updateDraft.mutateAsync(updatePayload(selectedDraft.version));
      setSaveStatus('All changes saved');
      const action = pendingGenerationAction;
      setPendingGenerationAction(null);
      setOverwriteDialogOpen(false);
      const actionWithVersion: PendingGenerationAction =
        action.kind === 'rewrite'
          ? { ...action, payload: { ...action.payload, version: saved.version } }
          : action;
      await runGenerationAction(actionWithVersion, true, saved.version);
    } catch (error) {
      handleError(error);
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!selectedDraft) return;
    setActionError(null);
    try {
      await restoreRevision.mutateAsync({ revisionId, version: selectedDraft.version });
      showToast({ message: 'Draft revision restored.', severity: 'success' });
    } catch (error) {
      handleError(error);
    }
  };

  const createEnabled =
    form.recruiterEmail.trim().length > 0 &&
    form.jobDescription.trim().length > 0 &&
    form.jobDescription.length <= jdLimit &&
    Boolean(form.resumeId.trim());
  const readyEnabled =
    Boolean(selectedDraft) &&
    selectedDraft?.status !== 'archived' &&
    selectedDraft?.status !== 'ready_to_send' &&
    form.subject.trim().length > 0 &&
    form.bodyText.trim().length > 0;
  const isGenerating =
    generateDraft.isPending ||
    regenerateDraft.isPending ||
    rewriteDraft.isPending ||
    generateSubject.isPending;
  const isMutating =
    createDraft.isPending ||
    updateDraft.isPending ||
    archiveDraft.isPending ||
    markReady.isPending ||
    sendDraft.isPending ||
    isGenerating ||
    restoreRevision.isPending;
  const sendEnabled =
    mailSendingEnabled &&
    selectedDraft?.status === 'ready_to_send' &&
    Boolean(selectedDraft.contentHash) &&
    !isMutating;
  const readiness = readinessQuery.data;
  const profile = profileQuery.data;
  const suggested = readiness?.suggestedJobMetadata;
  const hasSuggestion = Boolean(suggested?.roleTitle || suggested?.companyName);
  const unsavedContentEdits = hasUnsavedContentEdits(form, selectedDraft);
  const generateDisabledReason = !selectedDraft
    ? 'Create or open a draft first.'
    : selectedDraft.status === 'archived'
      ? 'Archived drafts cannot be generated.'
      : !readiness?.ready
        ? 'Complete the generation readiness checklist first.'
        : isGenerating
          ? 'Generation in progress.'
          : undefined;
  const generateEnabled = Boolean(selectedDraft) && readiness?.ready === true && !isGenerating;
  const hasGeneratedContent = Boolean(
    selectedDraft &&
    (selectedDraft.generatedBy ||
      selectedDraft.status === 'generated' ||
      selectedDraft.status === 'edited' ||
      form.bodyText.trim()),
  );
  const rewriteEnabled =
    Boolean(selectedDraft) &&
    selectedDraft?.status !== 'archived' &&
    form.bodyText.trim().length > 0 &&
    !isGenerating;
  const contentStatusChips = useMemo(() => {
    const chips: string[] = [];
    if (unsavedContentEdits && !generationApplied) chips.push('Unsaved changes');
    else if (saveStatus === 'All changes saved') chips.push('Saved');
    else if (selectedDraft?.userEdited && !generationApplied) chips.push('User edited');
    else if (
      generationApplied ||
      selectedDraft?.generatedBy ||
      selectedDraft?.status === 'generated' ||
      selectedDraft?.status === 'edited'
    ) {
      if (generationApplied || (selectedDraft?.generatedBy && !selectedDraft?.userEdited)) {
        chips.push('AI-generated');
      }
    }
    return chips;
  }, [generationApplied, saveStatus, selectedDraft, unsavedContentEdits]);

  return (
    <Box
      sx={{
        maxWidth: 1500,
        mx: 'auto',
        p: { xs: 2, sm: 3, lg: 4 },
        pb: { xs: 11, md: 5 },
        width: '100%',
      }}
    >
      <Stack
        alignItems={{ sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack alignItems="center" direction="row" spacing={1}>
            <Typography component="h1" fontSize={{ xs: 23, md: 26 }} fontWeight={750}>
              AI Mail Composer
            </Typography>
            <Chip color="primary" label="Beta" size="small" variant="outlined" />
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Create a personalized recruiter email using your profile and selected resume.
          </Typography>
        </Box>
        <Button onClick={startNewDraft} variant="outline">
          New Draft
        </Button>
      </Stack>

      <Alert severity={mailSendingEnabled ? 'warning' : 'info'} sx={{ mb: 2.5 }}>
        {mailSendingEnabled
          ? 'Manual Gmail send is enabled. Emails are only sent after you confirm in the Send dialog.'
          : 'Draft only — no email has been sent.'}
      </Alert>

      {mailSendingEnabled && sendLimitsQuery.data && (
        <Typography color="text.secondary" fontSize={13} sx={{ mb: 1.5 }}>
          {sendLimitsQuery.data.daily.used} of {sendLimitsQuery.data.daily.limit} daily sends used
        </Typography>
      )}

      <Tabs
        aria-label="AI Mail sections"
        onChange={(_event, value: 'compose' | 'sent') => {
          setActiveTab(value);
          const next = new URLSearchParams(searchParams);
          if (value === 'sent') next.set('tab', 'sent');
          else next.delete('tab');
          setSearchParams(next);
        }}
        sx={{ mb: 2.5 }}
        value={activeTab}
      >
        <Tab label="Compose" value="compose" />
        <Tab label="Sent" value="sent" />
      </Tabs>

      {activeTab === 'sent' ? (
        <SentHistoryPanel
          enabled={mailSendingEnabled}
          onOpenDraft={(draftId) => {
            setActiveTab('compose');
            const next = new URLSearchParams(searchParams);
            next.delete('tab');
            next.set('draftId', draftId);
            setSearchParams(next);
          }}
        />
      ) : (
        <>
          {actionError && (
            <Alert
              action={
                actionError.includes('Connected Accounts') ? (
                  <Button component={RouterLink} to={ROUTES.CONNECTED_ACCOUNTS} variant="ghost">
                    Connected Accounts
                  </Button>
                ) : isAiMailVersionConflict(updateDraft.error) ||
                  isAiMailVersionConflict(archiveDraft.error) ||
                  isAiMailVersionConflict(markReady.error) ? (
                  <Button onClick={() => void draftQuery.refetch()} size="small" variant="ghost">
                    Reload
                  </Button>
                ) : undefined
              }
              severity="error"
              sx={{ mb: 2.5 }}
            >
              {actionError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                lg: 'minmax(260px, 0.85fr) minmax(380px, 1.55fr) minmax(260px, 0.85fr)',
              },
            }}
          >
            <SkeletonSection number={1} title="Job Details">
              <Stack spacing={1.5}>
                <TextField
                  label="Recruiter email"
                  onChange={(event) => updateField('recruiterEmail', event.target.value)}
                  required
                  type="email"
                  value={form.recruiterEmail}
                />
                <TextField
                  label="Recruiter name"
                  onChange={(event) => updateField('recruiterName', event.target.value)}
                  value={form.recruiterName}
                />
                <TextField
                  label="Company"
                  onChange={(event) => updateField('companyName', event.target.value)}
                  value={form.companyName}
                />
                <TextField
                  label="Role title"
                  onChange={(event) => updateField('roleTitle', event.target.value)}
                  value={form.roleTitle}
                />
                <TextField
                  helperText="Must be a valid http(s) URL when provided."
                  label="Job URL"
                  onChange={(event) => updateField('jobUrl', event.target.value)}
                  type="url"
                  value={form.jobUrl}
                />
                <TextField
                  error={form.jobDescription.length > jdLimit}
                  helperText={`${form.jobDescription.length.toLocaleString()} / ${jdLimit.toLocaleString()} characters`}
                  label="Job description"
                  minRows={7}
                  multiline
                  onChange={(event) => updateField('jobDescription', event.target.value)}
                  required
                  value={form.jobDescription}
                />
                {hasSuggestion && (
                  <Alert
                    action={
                      <Button onClick={handleUseDetectedDetails} size="small" variant="ghost">
                        Use detected details
                      </Button>
                    }
                    severity="info"
                  >
                    Detected:{' '}
                    {[suggested?.roleTitle, suggested?.companyName].filter(Boolean).join(' · ')}
                  </Alert>
                )}
                <TextField
                  label="Additional context"
                  minRows={3}
                  multiline
                  onChange={(event) => updateField('additionalContext', event.target.value)}
                  value={form.additionalContext}
                />
                {saveStatus && (
                  <Typography color="text.secondary" fontSize={12}>
                    {saveStatus}
                  </Typography>
                )}
              </Stack>
            </SkeletonSection>

            <SkeletonSection number={2} title="Email Draft">
              <Stack spacing={1.5}>
                {draftQuery.isLoading && selectedDraftId ? (
                  <Box
                    aria-label="Loading draft"
                    sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
                  >
                    <CircularProgress size={28} />
                  </Box>
                ) : draftQuery.isError ? (
                  <Alert severity="error">{draftQuery.error.message}</Alert>
                ) : (
                  <>
                    <Typography
                      aria-live="polite"
                      sx={{
                        clip: 'rect(0 0 0 0)',
                        clipPath: 'inset(50%)',
                        height: 1,
                        overflow: 'hidden',
                        position: 'absolute',
                        whiteSpace: 'nowrap',
                        width: 1,
                      }}
                    >
                      {isGenerating
                        ? 'Creating a personalized draft...'
                        : (generationAnnouncement ?? '')}
                    </Typography>
                    {contentStatusChips.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {contentStatusChips.map((label) => (
                          <Chip key={label} label={label} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    )}
                    <TextField
                      label="Subject"
                      onChange={(event) => updateField('subject', event.target.value)}
                      value={form.subject}
                    />
                    <TextField
                      inputRef={bodyEditorRef}
                      label="Email body"
                      minRows={12}
                      multiline
                      onChange={(event) => updateField('bodyText', event.target.value)}
                      value={form.bodyText}
                    />
                    {generationWarnings.length > 0 && (
                      <Alert severity="warning">
                        <Typography fontSize={13} fontWeight={700} sx={{ mb: 0.5 }}>
                          Truthfulness & constraint warnings
                        </Typography>
                        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                          {generationWarnings.map((warning) => (
                            <Typography
                              component="li"
                              fontSize={13}
                              key={`${warning.code}-${warning.message}`}
                            >
                              {warning.message}
                            </Typography>
                          ))}
                        </Stack>
                      </Alert>
                    )}
                    {mailSendingEnabled && (draftDeliveriesQuery.data?.length ?? 0) > 0 && (
                      <Alert severity="info">
                        Sent {draftDeliveriesQuery.data!.length} time
                        {draftDeliveriesQuery.data!.length === 1 ? '' : 's'}. Last sent:{' '}
                        {formatUpdatedAt(
                          draftDeliveriesQuery.data![0]?.sentAt ??
                            draftDeliveriesQuery.data![0]?.createdAt,
                        )}
                        . Editing creates a new draft version; the previously sent email is
                        unchanged.
                        <Button
                          onClick={() => {
                            setActiveTab('sent');
                            const next = new URLSearchParams(searchParams);
                            next.set('tab', 'sent');
                            setSearchParams(next);
                          }}
                          size="small"
                          sx={{ ml: 1 }}
                          variant="ghost"
                        >
                          View delivery history
                        </Button>
                      </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      {selectedDraft ? (
                        <Button
                          disabled={selectedDraft.status === 'archived'}
                          fullWidth
                          isLoading={updateDraft.isPending}
                          onClick={() => void handleSave()}
                        >
                          Save Draft
                        </Button>
                      ) : (
                        <Button
                          disabled={!createEnabled}
                          fullWidth
                          isLoading={createDraft.isPending}
                          onClick={() => void handleCreate()}
                        >
                          Create Draft
                        </Button>
                      )}
                      <Button
                        disabled={!readyEnabled || isMutating}
                        fullWidth
                        onClick={() => void handleMarkReady()}
                        variant="outline"
                      >
                        Mark Ready
                      </Button>
                    </Stack>
                    {mailSendingEnabled && (
                      <Button
                        disabled={!sendEnabled}
                        fullWidth
                        isLoading={sendDraft.isPending}
                        onClick={openSendDialog}
                      >
                        Send Email
                      </Button>
                    )}
                    {!mailSendingEnabled && selectedDraft?.status === 'ready_to_send' && (
                      <Typography color="text.secondary" fontSize={12}>
                        Google connection will be used when email sending is enabled.
                      </Typography>
                    )}
                    <Button
                      aria-describedby={
                        generateDisabledReason ? 'ai-mail-generate-help' : undefined
                      }
                      disabled={!generateEnabled || selectedDraft?.status === 'archived'}
                      fullWidth
                      isLoading={generateDraft.isPending}
                      onClick={() => void handleGenerateEmail()}
                      title={generateDisabledReason}
                      variant="outline"
                    >
                      Generate Email
                    </Button>
                    {generateDisabledReason && (
                      <Typography color="text.secondary" fontSize={12} id="ai-mail-generate-help">
                        {generateDisabledReason}
                      </Typography>
                    )}
                    {hasGeneratedContent && selectedDraft?.status !== 'archived' && (
                      <>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={rewriteDraft.isPending}
                            onClick={() =>
                              void handleRewrite({
                                version: selectedDraft!.version,
                                operation: 'shorten',
                              })
                            }
                            size="small"
                            variant="outline"
                          >
                            Shorten
                          </Button>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={rewriteDraft.isPending}
                            onClick={() =>
                              void handleRewrite({
                                version: selectedDraft!.version,
                                operation: 'expand',
                              })
                            }
                            size="small"
                            variant="outline"
                          >
                            Expand
                          </Button>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={rewriteDraft.isPending}
                            onClick={() =>
                              void handleRewrite({
                                version: selectedDraft!.version,
                                operation: 'rewrite_tone',
                                rewriteInstruction: { tone: 'professional' },
                              })
                            }
                            size="small"
                            variant="outline"
                          >
                            More Professional
                          </Button>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={rewriteDraft.isPending}
                            onClick={() =>
                              void handleRewrite({
                                version: selectedDraft!.version,
                                operation: 'rewrite_tone',
                                rewriteInstruction: { tone: 'warm' },
                              })
                            }
                            size="small"
                            variant="outline"
                          >
                            Warmer
                          </Button>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={rewriteDraft.isPending}
                            onClick={() =>
                              void handleRewrite({
                                version: selectedDraft!.version,
                                operation: 'fix_grammar',
                              })
                            }
                            size="small"
                            variant="outline"
                          >
                            Fix Grammar
                          </Button>
                          <Button
                            disabled={!rewriteEnabled}
                            isLoading={generateSubject.isPending}
                            onClick={() => void handleGenerateSubject()}
                            size="small"
                            variant="outline"
                          >
                            Generate New Subject
                          </Button>
                        </Stack>
                        <Button
                          disabled={isGenerating}
                          fullWidth
                          isLoading={regenerateDraft.isPending}
                          onClick={() => void handleRegenerateEmail()}
                          tone="danger"
                          variant="ghost"
                        >
                          Regenerate Email
                        </Button>
                      </>
                    )}
                    {selectedDraft && (
                      <Stack alignItems="center" direction="row" justifyContent="space-between">
                        <Chip label={selectedDraft.status.replaceAll('_', ' ')} size="small" />
                        <Typography color="text.secondary" fontSize={12}>
                          Version {selectedDraft.version}
                        </Typography>
                      </Stack>
                    )}
                  </>
                )}
              </Stack>
            </SkeletonSection>

            <Stack spacing={2}>
              <SkeletonSection number={3} title="Selected Resume">
                <Stack spacing={1.25}>
                  {resumesQuery.isLoading ? (
                    <Box
                      aria-label="Loading resumes"
                      sx={{ display: 'flex', justifyContent: 'center', py: 3 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : resumesQuery.isError ? (
                    <Alert severity="error">{resumesQuery.error.message}</Alert>
                  ) : selectedResume ? (
                    <>
                      <Stack alignItems="center" direction="row" spacing={1}>
                        <DescriptionOutlinedIcon color="primary" fontSize="small" />
                        <Typography fontSize={14} fontWeight={700}>
                          {selectedResume.label || selectedResume.fileName}
                        </Typography>
                        {selectedResume.isPrimary && (
                          <Chip color="primary" label="Primary" size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Typography color="text.secondary" fontSize={13}>
                        {selectedResume.fileName}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip label={resumeStatusLabel(selectedResume)} size="small" />
                        <Chip
                          label={`Updated ${formatUpdatedAt(selectedResume.updatedAt)}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      {selectedResume.warning && (
                        <Alert severity="warning">{selectedResume.warning}</Alert>
                      )}
                      {!selectedResume.eligibleForAiMail && selectedResume.ineligibleReason && (
                        <Alert severity="warning">{selectedResume.ineligibleReason}</Alert>
                      )}
                    </>
                  ) : (
                    <Alert severity="warning">
                      Select a processed resume before creating or generating a draft.
                    </Alert>
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button fullWidth onClick={() => setResumePickerOpen(true)} variant="outline">
                      Change Resume
                    </Button>
                    <Button
                      component={RouterLink}
                      disabled={!form.resumeId}
                      fullWidth
                      to={ROUTES.SAVED_RESUMES}
                      variant="ghost"
                    >
                      Preview Resume
                    </Button>
                  </Stack>
                  <Button
                    component={RouterLink}
                    fullWidth
                    to={ROUTES.SAVED_RESUMES}
                    variant="ghost"
                  >
                    Manage Resumes
                  </Button>
                </Stack>
              </SkeletonSection>

              <SkeletonSection number={4} title="Candidate Profile">
                <Stack spacing={1.25}>
                  {profileQuery.isLoading ? (
                    <Box
                      aria-label="Loading profile summary"
                      sx={{ display: 'flex', justifyContent: 'center', py: 3 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : profileQuery.isError ? (
                    <Alert severity="error">{profileQuery.error.message}</Alert>
                  ) : !profile?.exists ? (
                    <Alert severity="warning">
                      No candidate profile found. Complete your profile to unlock generation.
                    </Alert>
                  ) : (
                    <>
                      <Stack alignItems="center" direction="row" spacing={1}>
                        <PersonOutlineIcon color="primary" fontSize="small" />
                        <Typography fontSize={14} fontWeight={700}>
                          {profile.candidateName || 'Candidate'}
                        </Typography>
                      </Stack>
                      <Typography color="text.secondary" fontSize={13}>
                        {profile.currentTitle || 'Current title not set'}
                        {typeof profile.yearsOfExperience === 'number'
                          ? ` · ${profile.yearsOfExperience} yrs`
                          : ''}
                      </Typography>
                      <Box>
                        <Stack
                          alignItems="center"
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography fontSize={12} fontWeight={600}>
                            Profile completeness
                          </Typography>
                          <Typography fontSize={12}>{profile.completenessPercent}%</Typography>
                        </Stack>
                        <LinearProgress
                          aria-label="Profile completeness"
                          value={profile.completenessPercent}
                          variant="determinate"
                        />
                      </Box>
                      {profile.topSkills.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          {profile.topSkills.map((skill) => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                      {profile.missingRecommendedSections.length > 0 && (
                        <Typography color="text.secondary" fontSize={12}>
                          Missing: {profile.missingRecommendedSections.join(', ')}
                        </Typography>
                      )}
                    </>
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button component={RouterLink} fullWidth to={ROUTES.PROFILE} variant="outline">
                      View Profile
                    </Button>
                    <Button
                      component={RouterLink}
                      fullWidth
                      to={ROUTES.PROFILE_EDIT}
                      variant="ghost"
                    >
                      Complete Profile
                    </Button>
                  </Stack>
                </Stack>
              </SkeletonSection>

              <SkeletonSection number={5} title="Generation Readiness">
                <Stack spacing={1.25}>
                  {!selectedDraftId ? (
                    <Typography color="text.secondary" fontSize={13}>
                      Create or open a draft to evaluate generation readiness.
                    </Typography>
                  ) : readinessQuery.isLoading ? (
                    <Box
                      aria-label="Loading generation readiness"
                      sx={{ display: 'flex', justifyContent: 'center', py: 3 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : readinessQuery.isError ? (
                    <Alert severity="error">{readinessQuery.error.message}</Alert>
                  ) : readiness ? (
                    <>
                      <Stack alignItems="center" direction="row" spacing={1}>
                        {readiness.ready ? (
                          <CheckCircleOutlineIcon color="success" fontSize="small" />
                        ) : (
                          <WarningAmberOutlinedIcon color="warning" fontSize="small" />
                        )}
                        <Typography fontSize={14} fontWeight={700}>
                          {readiness.ready ? 'Ready to generate' : 'Not ready to generate'}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        {[
                          [
                            'Job description',
                            !readiness.blockers.some((item) => item.field === 'jobDescription'),
                          ],
                          [
                            'Recruiter email',
                            !readiness.blockers.some((item) => item.field === 'recruiterEmail'),
                          ],
                          [
                            'Candidate profile',
                            !readiness.blockers.some((item) => item.field === 'profile'),
                          ],
                          ['Resume', !readiness.blockers.some((item) => item.field === 'resumeId')],
                          ['Generation constraints', true],
                        ].map(([label, ok]) => (
                          <Typography
                            key={String(label)}
                            color={ok ? 'success.main' : 'warning.main'}
                            fontSize={13}
                          >
                            {ok ? '✓' : '•'} {label}
                          </Typography>
                        ))}
                      </Stack>
                      {readiness.blockers.length > 0 && (
                        <Alert severity="warning">
                          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                            {readiness.blockers.map((blocker) => (
                              <Typography component="li" fontSize={13} key={blocker.code}>
                                {blocker.message}
                              </Typography>
                            ))}
                          </Stack>
                        </Alert>
                      )}
                      {readiness.warnings.length > 0 && (
                        <Alert severity="info">
                          <Typography fontSize={13} fontWeight={700} sx={{ mb: 0.5 }}>
                            Warnings
                          </Typography>
                          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                            {readiness.warnings.map((warning) => (
                              <Typography component="li" fontSize={13} key={warning.code}>
                                {warning.message}
                              </Typography>
                            ))}
                          </Stack>
                        </Alert>
                      )}
                      <Typography color="text.secondary" fontSize={12}>
                        Stats: {readiness.counts.profileSkills} profile skills ·{' '}
                        {readiness.counts.resumeSkills} resume skills ·{' '}
                        {readiness.counts.experienceEntries} experience ·{' '}
                        {readiness.counts.jobRequirements} requirements
                      </Typography>
                    </>
                  ) : null}
                  <Typography color="text.secondary" fontSize={12}>
                    Google connection will be used when email sending is enabled.
                  </Typography>
                </Stack>
              </SkeletonSection>

              <SkeletonSection number={6} title="History & Context">
                <Stack spacing={1.5}>
                  <Stack alignItems="center" direction="row" spacing={1}>
                    <HistoryOutlinedIcon color="primary" fontSize="small" />
                    <Typography fontSize={14} fontWeight={700}>
                      Draft history
                    </Typography>
                  </Stack>
                  {draftsQuery.isLoading ? (
                    <Box
                      aria-label="Loading draft history"
                      sx={{ display: 'flex', justifyContent: 'center', py: 3 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : draftsQuery.isError ? (
                    <Alert severity="error">{draftsQuery.error.message}</Alert>
                  ) : draftsQuery.data?.items.length ? (
                    <List disablePadding sx={{ maxHeight: 300, overflowY: 'auto' }}>
                      {draftsQuery.data.items.map((draft) => (
                        <ListItemButton
                          key={draft.id}
                          onClick={() => selectDraft(draft.id)}
                          selected={draft.id === selectedDraftId}
                          sx={{ borderRadius: 1.5, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={draft.subject || draft.roleTitle || 'Untitled draft'}
                            secondary={`${draft.companyName || draft.recruiterEmail} · ${draft.status.replaceAll('_', ' ')}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary" fontSize={13}>
                      No drafts yet.
                    </Typography>
                  )}
                  {selectedDraft && selectedDraft.status !== 'archived' && (
                    <Button
                      disabled={isMutating}
                      onClick={() => setArchiveOpen(true)}
                      startIcon={<ArchiveOutlinedIcon />}
                      tone="danger"
                      variant="ghost"
                    >
                      Archive Draft
                    </Button>
                  )}
                  {selectedDraftId && (
                    <>
                      <Typography fontSize={13} fontWeight={700} sx={{ mt: 1 }}>
                        Revision history
                      </Typography>
                      {revisionsQuery.isLoading ? (
                        <Box
                          aria-label="Loading revision history"
                          sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
                        >
                          <CircularProgress size={22} />
                        </Box>
                      ) : revisionsQuery.isError ? (
                        <Alert severity="error">{revisionsQuery.error.message}</Alert>
                      ) : revisionsQuery.data?.length ? (
                        <List disablePadding sx={{ maxHeight: 220, overflowY: 'auto' }}>
                          {revisionsQuery.data.map((revision) => (
                            <ListItemButton
                              key={revision.id}
                              onClick={() => void handleRestoreRevision(revision.id)}
                              sx={{ borderRadius: 1.5, mb: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  revision.subject ||
                                  revision.bodyText?.slice(0, 48) ||
                                  `Revision ${revision.revisionNumber}`
                                }
                                secondary={`${revisionSourceLabel(revision.source)} · ${formatUpdatedAt(revision.createdAt)}`}
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary" fontSize={13}>
                          No revisions yet.
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </SkeletonSection>
            </Stack>
          </Box>

          <Paper
            component="section"
            variant="outlined"
            sx={{ bgcolor: 'primary.50', borderRadius: 2.5, mt: 2, p: { xs: 2, md: 2.5 } }}
          >
            <Typography component="h2" fontSize={14} fontWeight={700}>
              Delivery boundary
            </Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
              Every email requires explicit confirmation. Follow-ups never auto-send. Editing a
              draft after send creates a new version; previously sent email is unchanged.
            </Typography>
          </Paper>
        </>
      )}

      <Dialog
        aria-labelledby="ai-mail-resume-picker-title"
        onClose={() => setResumePickerOpen(false)}
        open={resumePickerOpen}
      >
        <DialogTitle id="ai-mail-resume-picker-title">Select a resume</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <TextField
              label="Resume"
              onChange={(event) => void handleSelectResume(event.target.value)}
              select
              value={form.resumeId}
            >
              {(resumesQuery.data?.items ?? []).map((resume) => (
                <MenuItem disabled={!resume.eligibleForAiMail} key={resume.id} value={resume.id}>
                  {resume.label || resume.fileName}
                  {resume.isPrimary ? ' (Primary)' : ''}
                  {!resume.eligibleForAiMail && resume.ineligibleReason
                    ? ` — ${resume.ineligibleReason}`
                    : ''}
                </MenuItem>
              ))}
            </TextField>
            <FormHelperText>
              Ineligible resumes stay visible with an explanation and cannot be selected.
            </FormHelperText>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResumePickerOpen(false)} variant="ghost">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-describedby="ai-mail-overwrite-description"
        aria-labelledby="ai-mail-overwrite-title"
        onClose={handleOverwriteCancel}
        open={overwriteDialogOpen}
      >
        <DialogTitle id="ai-mail-overwrite-title">Overwrite your edits?</DialogTitle>
        <DialogContent>
          <DialogContentText id="ai-mail-overwrite-description">
            This draft has unsaved or user-edited content. Choose whether to save your edits first
            or discard them before regenerating.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOverwriteCancel} variant="ghost">
            Cancel
          </Button>
          <Button
            isLoading={updateDraft.isPending || isGenerating}
            onClick={() => void handleOverwriteSaveAndContinue()}
            variant="outline"
          >
            Save & Regenerate
          </Button>
          <Button
            isLoading={isGenerating}
            onClick={() => void handleOverwriteDiscard()}
            tone="danger"
          >
            Discard Edits & Regenerate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog onClose={() => setArchiveOpen(false)} open={archiveOpen}>
        <DialogTitle>Archive this draft?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The draft will remain in history but can no longer be edited.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button
            isLoading={archiveDraft.isPending}
            onClick={() => void handleArchive()}
            tone="danger"
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-describedby="ai-mail-send-description"
        aria-labelledby="ai-mail-send-title"
        onClose={() => !sendDraft.isPending && setSendDialogOpen(false)}
        open={sendDialogOpen}
      >
        <DialogTitle id="ai-mail-send-title">Send this email?</DialogTitle>
        <DialogContent>
          <DialogContentText id="ai-mail-send-description" sx={{ mb: 2 }}>
            This will send a real email through your connected Gmail account. This action cannot be
            undone from Career Copilot.
          </DialogContentText>
          {activeGoogleAccounts.length === 0 ? (
            <Alert severity="warning">
              No active Google mailbox connected.{' '}
              <Button component={RouterLink} to={ROUTES.CONNECTED_ACCOUNTS} variant="ghost">
                Connect Google
              </Button>
            </Alert>
          ) : (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <TextField
                  label="From account"
                  onChange={(event) => setSelectedConnectedAccountId(Number(event.target.value))}
                  select
                  value={selectedConnectedAccountId ?? ''}
                >
                  {activeGoogleAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.emailAddress}
                      {account.displayName ? ` (${account.displayName})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
              {sendPreviewQuery.isLoading && <LinearProgress />}
              {sendPreviewQuery.data && (
                <Stack spacing={0.75}>
                  <Typography fontSize={13}>
                    <strong>To:</strong> {sendPreviewQuery.data.recipientEmail}
                  </Typography>
                  <Typography fontSize={13}>
                    <strong>From:</strong> {sendPreviewQuery.data.fromEmail}
                  </Typography>
                  <Typography fontSize={13}>
                    <strong>Subject:</strong> {sendPreviewQuery.data.subject}
                  </Typography>
                  <Typography fontSize={13}>
                    <strong>Resume:</strong>{' '}
                    {sendPreviewQuery.data.resumeFileName ?? sendPreviewQuery.data.resumeId}
                    {typeof sendPreviewQuery.data.resumeSizeBytes === 'number'
                      ? ` (${Math.round(sendPreviewQuery.data.resumeSizeBytes / 1024)} KB)`
                      : ''}
                  </Typography>
                  {!sendPreviewQuery.data.canSend && (
                    <Alert severity="warning">
                      Cannot send yet: {sendPreviewQuery.data.blockers.join(', ') || 'unknown'}
                    </Alert>
                  )}
                  {sendPreviewQuery.data.duplicateAssessment?.level !== 'none' &&
                    sendPreviewQuery.data.duplicateAssessment?.reason && (
                      <Alert
                        severity={
                          sendPreviewQuery.data.duplicateAssessment.level === 'hard_block'
                            ? 'error'
                            : sendPreviewQuery.data.duplicateAssessment.level === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {sendPreviewQuery.data.duplicateAssessment.reason}
                      </Alert>
                    )}
                </Stack>
              )}
              {sendPreviewQuery.isError && (
                <Alert severity="error">
                  {sendPreviewQuery.error?.message ?? 'Unable to load send preview.'}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={sendDraft.isPending}
            onClick={() => setSendDialogOpen(false)}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={
              !sendPreviewQuery.data?.canSend ||
              activeGoogleAccounts.length === 0 ||
              !selectedConnectedAccountId
            }
            isLoading={sendDraft.isPending}
            onClick={() => void handleConfirmSend()}
            tone="danger"
          >
            Confirm Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
