import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { NavigateFunction } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { autoApplyService } from '@/features/auto-apply/services/autoApply.service';
import { navigateAfterAssistedApplyExit } from '@/features/auto-apply/utils/returnToNavigation';
import type {
  AnalysisResult,
  KeywordsResponse,
  RecheckResult,
  ResumeVersion,
  SuggestionItem,
  UploadedResume,
} from '@/services/resumeBuilder.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';

import type { ResumeBuilderStep as Step } from '../constants';
import type { LiveSkillAnalysis, ResumeTemplateId } from '../utils';
import { getApiErrorMessage } from '../utils';

import {
  analysisInputFingerprint,
  EMPTY_CLEAN_SNAPSHOT,
  skillsKeyOf,
  type CleanSnapshot,
} from './resumeBuilder.shared';

type ShowToast = (input: {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  autoHideDuration?: number;
}) => void;

export function useResumeBuilderActions({
  resumeId,
  setResumeId,
  step,
  setStep,
  navigate,
  showToast,
  analysis,
  setAnalysis,
  originalAnalysis,
  setOriginalAnalysis,
  analyzedFingerprintRef,
  pollTimerRef,
  setKeywords,
  setSuggestions,
  targetRole,
  setTargetRole,
  industry,
  setIndustry,
  experienceLevel,
  setExperienceLevel,
  employmentType,
  setEmploymentType,
  skills,
  setSkills,
  jobDescription,
  setJobDescription,
  editedContent,
  setEditedContent,
  editedContentRef,
  setCleanSnapshot,
  markSnapshotClean,
  allowLeaveRef,
  discardDefineRoleDraft,
  selectedTemplate,
  setSelectedTemplate,
  hydrateFromExistingAnalysis,
  returnTo,
  jobApplicationId,
}: {
  resumeId: string;
  setResumeId: Dispatch<SetStateAction<string>>;
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  navigate: NavigateFunction;
  showToast: ShowToast;
  analysis: AnalysisResult | null;
  setAnalysis: Dispatch<SetStateAction<AnalysisResult | null>>;
  originalAnalysis: AnalysisResult | null;
  setOriginalAnalysis: Dispatch<SetStateAction<AnalysisResult | null>>;
  analyzedFingerprintRef: React.MutableRefObject<string>;
  pollTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setKeywords: Dispatch<SetStateAction<KeywordsResponse | null>>;
  setSuggestions: Dispatch<SetStateAction<SuggestionItem[]>>;
  targetRole: string;
  setTargetRole: Dispatch<SetStateAction<string>>;
  industry: string;
  setIndustry: Dispatch<SetStateAction<string>>;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  setExperienceLevel: Dispatch<SetStateAction<'entry' | 'mid' | 'senior' | 'lead' | 'executive'>>;
  employmentType: string;
  setEmploymentType: Dispatch<SetStateAction<string>>;
  skills: string[];
  setSkills: Dispatch<SetStateAction<string[]>>;
  jobDescription: string;
  setJobDescription: Dispatch<SetStateAction<string>>;
  editedContent: string;
  setEditedContent: Dispatch<SetStateAction<string>>;
  editedContentRef: React.MutableRefObject<string>;
  setCleanSnapshot: Dispatch<SetStateAction<CleanSnapshot>>;
  markSnapshotClean: (overrides?: Partial<CleanSnapshot>) => void;
  allowLeaveRef: React.MutableRefObject<boolean>;
  discardDefineRoleDraft: () => void;
  selectedTemplate: ResumeTemplateId;
  setSelectedTemplate: Dispatch<SetStateAction<ResumeTemplateId>>;
  hydrateFromExistingAnalysis: (id: string, options?: { force?: boolean }) => Promise<void>;
  returnTo?: string | null;
  jobApplicationId?: string | null;
}) {
  const [existingResumes, setExistingResumes] = useState<UploadedResume[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [recheckResult, setRecheckResult] = useState<RecheckResult | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const recheckContentKeyRef = useRef<string>('');
  /** Optimize strip score — Export must show this same number, not a higher server floor. */
  const [liveAtsScore, setLiveAtsScore] = useState<number | null>(null);
  const liveAtsScoreRef = useRef<number | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        // Only resumes the user has explicitly Save'd should appear on Upload.
        const [resumes, savedVersions] = await Promise.all([
          resumeBuilderService.listResumes(),
          resumeBuilderService.listSavedVersions(),
        ]);
        const savedResumeIds = new Set(
          savedVersions.map((version) => version.resumeId).filter(Boolean),
        );
        setExistingResumes(resumes.filter((resume) => savedResumeIds.has(resume.id)));
      } catch {
        // Ignore list failures on mount — upload step still works.
      }
    };

    void loadResumes();
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [resumeId]);

  useEffect(() => {
    if (step !== 10 || !resumeId) return;

    const contentKey = (editedContent.trim() || analysis?.editedContent || '').trim();
    // Reuse cached ATS recheck while navigating — only recheck when resume text changed.
    if (recheckResult && recheckContentKeyRef.current === contentKey && contentKey) {
      setRechecking(false);
      return;
    }

    let cancelled = false;
    setRechecking(true);

    // Debounce content-driven rechecks so Export does not hammer ATS on every keystroke.
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (cancelled) return;
          if (contentKey && analysis) {
            await resumeBuilderService.updateContent(resumeId, contentKey);
          }
          const result = await resumeBuilderService.recheckAts(resumeId);
          if (cancelled) return;
          recheckContentKeyRef.current = contentKey;
          // Keep New ATS identical to Optimize strip (server floor was inflating 66 → 76).
          setRecheckResult(
            pinRecheckToLiveAts(result, analysis?.baselineAtsScore ?? analysis?.atsScore),
          );
          // Do not overwrite the original Analyze-step ATS snapshot with export recheck scores.
        } catch (error) {
          if (!cancelled) {
            showToast({
              message: getApiErrorMessage(error, 'Could not recalculate ATS score.'),
              severity: 'error',
            });
          }
        } finally {
          if (!cancelled) setRechecking(false);
        }
      })();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recheck only when export opens or content key changes
  }, [step, resumeId, editedContent]);

  // After Apply All, further Optimize edits must drop the stale Export recheck score.
  useEffect(() => {
    if (!recheckResult) return;
    const contentKey = editedContent.trim();
    if (!contentKey || !recheckContentKeyRef.current) return;
    if (contentKey !== recheckContentKeyRef.current) {
      setRecheckResult(null);
      recheckContentKeyRef.current = '';
    }
  }, [editedContent, recheckResult]);

  useEffect(() => {
    if (step !== 10 || !resumeId) return;
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => {});
  }, [step, resumeId]);

  const pinRecheckToLiveAts = useCallback(
    (result: RecheckResult, baselineFallback?: number | null): RecheckResult => {
      const pinned = liveAtsScoreRef.current;
      if (pinned == null || !Number.isFinite(pinned)) return result;
      const previous = result.previousAtsScore ?? baselineFallback ?? result.atsScore;
      return {
        ...result,
        atsScore: pinned,
        previousAtsScore: previous,
        improvement: pinned - previous,
      };
    },
    [],
  );

  const handleLiveAtsChange = useCallback((score: number, _skills?: LiveSkillAnalysis) => {
    // Sync Optimize → Export. Never mutate the Analyze-step ATS snapshot here.
    if (!Number.isFinite(score)) return;
    const next = Math.min(100, Math.max(0, Math.round(score)));
    liveAtsScoreRef.current = next;
    setLiveAtsScore(next);
    void _skills;
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const allowed = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!allowed.includes(file.type) && !['pdf', 'docx', 'txt'].includes(ext ?? '')) {
        setUploadError('Please upload a PDF, DOCX, or TXT file.');
        return;
      }
      setUploadError('');
      setUploading(true);
      try {
        const uploaded = await resumeBuilderService.uploadResume(file);

        const readability = await resumeBuilderService.waitForReadableResume(uploaded.id);
        if (!readability.ok) {
          setUploadError(
            readability.message ||
              'Please upload a valid resume (PDF or DOCX) to continue with ATS analysis.',
          );
          try {
            await resumeBuilderService.deleteResume(uploaded.id);
          } catch {
            // Best-effort cleanup of unreadable upload.
          }
          return;
        }

        // Fully reset UI state for the new resume so Live Preview/Optimize step hydrate correctly.
        // (hydrateFromExistingAnalysis only sets edited content when the current draft is empty.)
        setAnalysis(null);
        setOriginalAnalysis(null);
        analyzedFingerprintRef.current = '';
        setKeywords(null);
        setSuggestions([]);
        setVersions([]);
        setRecheckResult(null);
        editedContentRef.current = '';
        setEditedContent('');
        recheckContentKeyRef.current = '';
        liveAtsScoreRef.current = null;
        setLiveAtsScore(null);
        setCleanSnapshot(EMPTY_CLEAN_SNAPSHOT);
        setTargetRole('');
        setJobDescription('');
        setIndustry('');
        setEmploymentType('');
        setExperienceLevel('mid');
        setSkills([]);
        setSelectedTemplate('original');

        setResumeId(uploaded.id);
        setExistingResumes((prev) => [uploaded, ...prev.filter((r) => r.id !== uploaded.id)]);
        void navigate(`${ROUTES.RESUME_BUILDER}/${uploaded.id}`, { replace: true });
        setStep(2);
        // Skip force hydrate on fresh upload — no analysis exists yet (avoids a useless getAnalysis).
      } catch {
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [
      analyzedFingerprintRef,
      editedContentRef,
      navigate,
      setAnalysis,
      setCleanSnapshot,
      setEditedContent,
      setEmploymentType,
      setExperienceLevel,
      setIndustry,
      setJobDescription,
      setKeywords,
      setOriginalAnalysis,
      setResumeId,
      setSelectedTemplate,
      setSkills,
      setStep,
      setSuggestions,
      setTargetRole,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleStartAnalysis = async () => {
    if (startingAnalysis) return;
    if (!targetRole.trim()) {
      showToast({ message: 'Target role is required.', severity: 'warning' });
      return;
    }
    if (!jobDescription.trim()) {
      showToast({ message: 'Job description is required.', severity: 'warning' });
      return;
    }
    if (!resumeId) {
      showToast({ message: 'Please upload or select a resume first.', severity: 'warning' });
      setStep(1);
      return;
    }

    try {
      const status = await resumeBuilderService.getResumeStatus(resumeId);
      if (String(status.status || '').toUpperCase() === 'FAILED') {
        showToast({
          message:
            status.failureReason?.trim() ||
            'Please upload a valid resume (PDF or DOCX) to continue with ATS analysis.',
          severity: 'warning',
        });
        setStep(1);
        return;
      }
    } catch {
      // If status check fails, continue — analyze will surface errors.
    }

    const fingerprint = analysisInputFingerprint({
      resumeId,
      targetRole,
      jobDescription,
      industry,
      employmentType,
      experienceLevel,
      skillsKey: skillsKeyOf(skills),
    });
    // Re-analyze from the Analyze step always forces a new run; Define Role Next reuses cache.
    const forceReanalyze = step === 3;
    const hasCompletedOriginal =
      String((originalAnalysis ?? analysis)?.status || '').toUpperCase() === 'COMPLETED';

    if (!forceReanalyze && hasCompletedOriginal) {
      const previousFingerprint = analyzedFingerprintRef.current;
      // Only reuse cached ATS when Define Role inputs match the last completed run.
      if (previousFingerprint && previousFingerprint === fingerprint) {
        setStep(3);
        return;
      }
    }

    // Stop any previous poller before starting a new analysis job.
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStartingAnalysis(true);
    try {
      setRecheckResult(null);
      liveAtsScoreRef.current = null;
      setLiveAtsScore(null);
      setAnalysis(null);
      setOriginalAnalysis(null);
      analyzedFingerprintRef.current = '';
      await resumeBuilderService.startAnalysis(resumeId, {
        targetRole,
        experienceLevel,
        jobDescription: [
          jobDescription.trim(),
          industry && `Industry: ${industry}`,
          employmentType && `Employment type: ${employmentType}`,
          skills.length > 0 && `Preferred skills: ${skills.join(', ')}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
      markSnapshotClean({
        content: editedContentRef.current,
        targetRole,
        jobDescription,
        skillsKey: skillsKeyOf(skills),
        skills,
      });
      // Store intended fingerprint; confirmed when poll completes.
      analyzedFingerprintRef.current = fingerprint;
      setStep(3);
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Failed to start analysis.'),
        severity: 'error',
        autoHideDuration: 8000,
      });
    } finally {
      setStartingAnalysis(false);
    }
  };

  const handleReplaceResume = () => {
    allowLeaveRef.current = true;
    setResumeId('');
    setAnalysis(null);
    setOriginalAnalysis(null);
    analyzedFingerprintRef.current = '';
    setKeywords(null);
    setSuggestions([]);
    setVersions([]);
    setRecheckResult(null);
    editedContentRef.current = '';
    setEditedContent('');
    setCleanSnapshot(EMPTY_CLEAN_SNAPSHOT);
    liveAtsScoreRef.current = null;
    setLiveAtsScore(null);
    setTargetRole('');
    setJobDescription('');
    setIndustry('');
    setEmploymentType('');
    setExperienceLevel('mid');
    setSkills([]);
    setStep(1);
    if (!navigateAfterAssistedApplyExit(navigate, returnTo, false)) {
      void navigate(ROUTES.RESUME_BUILDER, { replace: true });
    }
  };

  const mergeRecheckIntoAnalysis = (
    refreshed: AnalysisResult | null,
    recheck: Awaited<ReturnType<typeof resumeBuilderService.recheckAts>> | null,
    localContent: string,
  ) => {
    // Keep analysis.id and original ATS metrics stable so Analyze step stays frozen.
    // Export uses recheckResult for updated scores; Review uses editedContent.
    void recheck;
    setAnalysis((prev) => {
      if (!prev) {
        if (!refreshed) return prev;
        return {
          ...refreshed,
          editedContent: localContent || refreshed.editedContent,
        };
      }

      return {
        ...prev,
        editedContent: localContent || refreshed?.editedContent || prev.editedContent,
        suggestions: prev.suggestions?.length
          ? prev.suggestions
          : (refreshed?.suggestions ?? prev.suggestions),
      };
    });
  };

  const handleApplySuggestion = async (id: number, contentOverride?: string) => {
    if (id < 0) return;
    setApplyingId(id);
    try {
      const localContent = (contentOverride ?? editedContentRef.current).trim();
      if (localContent) {
        editedContentRef.current = localContent;
        setEditedContent(localContent);
        // Optimistic content update only — do not mutate original ATS skill gaps/scores.
        setAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            editedContent: localContent,
          };
        });
      }

      // Prefer client draft; mark APPLIED without backend re-writing content.
      const updated = await resumeBuilderService.applySuggestion(resumeId, id, {
        preserveContent: Boolean(localContent),
      });
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));

      if (localContent) {
        await resumeBuilderService.updateContent(resumeId, localContent);
      }
      // Do not re-run ATS/reload analysis here:
      // recheck can change analysis id and regenerate the "missing skills" suggestions list.
      // OptimizeStep already updates skill cards optimistically from the edited draft.
      setRecheckResult(null);
      recheckContentKeyRef.current = '';
      showToast({
        message: 'Improvement applied successfully',
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Failed to apply suggestion.'),
        severity: 'error',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleApplyAllSuggestions = async (ids: number[], content: string) => {
    const localContent = content.trim();
    if (!localContent) return;

    setApplyingId(-1);
    try {
      editedContentRef.current = localContent;
      setEditedContent(localContent);
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          editedContent: localContent,
        };
      });
      if (ids.length > 0) {
        setSuggestions((prev) =>
          prev.map((item) =>
            ids.includes(item.id) ? { ...item, status: 'APPLIED' as const } : item,
          ),
        );
      }

      await resumeBuilderService.updateContent(resumeId, localContent);

      for (const id of ids) {
        try {
          // Client already merged the draft — only mark APPLIED; do not re-mutate content
          // (double-apply was inflating Export ATS and scrambling section formatting).
          const updated = await resumeBuilderService.applySuggestion(resumeId, id, {
            preserveContent: true,
          });
          setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
        } catch {
          // Keep optimistic APPLIED status if a single mark fails.
        }
      }

      let recheck: Awaited<ReturnType<typeof resumeBuilderService.recheckAts>> | null = null;
      try {
        recheck = await resumeBuilderService.recheckAts(resumeId);
      } catch {
        recheck = null;
      }

      // Skip trailing getAnalysis when recheck succeeded — avoids an extra ATS round trip.
      // Only refetch analysis when recheck failed and we still need suggestion/status sync.
      const refreshed = recheck
        ? null
        : await resumeBuilderService.getAnalysis(resumeId).catch(() => null);
      mergeRecheckIntoAnalysis(refreshed, recheck, localContent);
      if (recheck) {
        setRecheckResult(
          pinRecheckToLiveAts(recheck, analysis?.baselineAtsScore ?? analysis?.atsScore),
        );
        recheckContentKeyRef.current = localContent;
      } else {
        // Content changed; clear stale export recheck so Export will recalculate once.
        setRecheckResult(null);
        recheckContentKeyRef.current = '';
      }
      showToast({
        message:
          ids.length > 1
            ? 'All improvements applied successfully'
            : 'Improvement applied successfully',
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Failed to apply all suggestions.'),
        severity: 'error',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleIgnoreSuggestion = async (id: number) => {
    if (id < 0) return;
    setApplyingId(id);
    try {
      const updated = await resumeBuilderService.ignoreSuggestion(resumeId, id);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      showToast({ message: 'Failed to ignore suggestion.', severity: 'error' });
    } finally {
      setApplyingId(null);
    }
  };

  const handleSaveContent = async () => {
    if (!analysis) {
      showToast({
        message: 'Run Analyze first before saving optimized content.',
        severity: 'warning',
      });
      return;
    }
    setSaving(true);
    try {
      await resumeBuilderService.updateContent(resumeId, editedContent);
      markSnapshotClean({ content: editedContent });
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Failed to save content.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx', previewRoot?: HTMLElement | null) => {
    setExportingFormat(format);
    try {
      if (format === 'pdf' && previewRoot) {
        // Ensure fonts/layout are settled before html2canvas runs,
        // so pagination & wrapping offsets match the Live Preview.
        const doc = previewRoot.ownerDocument;
        try {
          const fontSet = doc?.fonts;
          if (fontSet != null) {
            await fontSet.ready;
          }
        } catch {
          // Ignore font waiting failures — best-effort only.
        }

        // Wait a couple frames for ResizeObserver/layout effects to re-run.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        // If pages are still being constructed, wait briefly.
        const startedAt = Date.now();
        while (
          Date.now() - startedAt < 2500 &&
          previewRoot.querySelectorAll<HTMLElement>('.preview-page').length === 0
        ) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      }

      const { alignDraftToJob, parseResumeContent } = await import('../utils');
      const draft = alignDraftToJob(
        parseResumeContent(
          editedContent || analysis?.editedContent || '',
          targetRole || analysis?.targetRole || '',
        ),
        {
          preferredSkills: skills,
          jobDescription,
          matchedSkills: analysis?.skillAnalysis?.matchedSkills,
          recommendedSkills: [
            ...(analysis?.skillAnalysis?.recommendedSkills ?? []),
            ...(analysis?.skillAnalysis?.missingSkills ?? []),
          ],
          optimizedSummary: analysis?.optimizedSummary,
        },
      );

      if (format === 'pdf') {
        const { downloadResumePdf } = await import('../exportResume');
        await downloadResumePdf(draft, undefined, selectedTemplate, previewRoot);
        return;
      }

      const result = await resumeBuilderService.exportResume(resumeId, format);
      const link = document.createElement('a');
      link.href = `data:${result.mimeType};base64,${result.content}`;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Export failed.'),
        severity: 'error',
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const handleSaveVersion = async (options?: { navigateAfter?: boolean }) => {
    if (!analysis) {
      showToast({
        message: 'Run Analyze first before saving a version.',
        severity: 'warning',
      });
      return;
    }
    setSavingVersion(true);
    try {
      if (editedContent.trim()) {
        await resumeBuilderService.updateContent(resumeId, editedContent);
      }
      const label = `${targetRole || analysis?.targetRole || 'Resume'} — ${new Date().toLocaleDateString()}`;
      const savedVersion = await resumeBuilderService.saveVersion(resumeId, label, editedContent);
      setVersions(await resumeBuilderService.getVersions(resumeId));
      // Refresh Upload list so this resume appears only after a real save.
      try {
        const [resumes, savedVersions] = await Promise.all([
          resumeBuilderService.listResumes(),
          resumeBuilderService.listSavedVersions(),
        ]);
        const savedResumeIds = new Set(
          savedVersions.map((version) => version.resumeId).filter(Boolean),
        );
        setExistingResumes(resumes.filter((resume) => savedResumeIds.has(resume.id)));
      } catch {
        // Non-blocking — save already succeeded.
      }
      markSnapshotClean({ content: editedContent });

      if (jobApplicationId && savedVersion?.id != null) {
        await autoApplyService.syncBuilderResume(jobApplicationId, {
          resumeId,
          builderVersionId: savedVersion.id,
          label,
        });
      }

      if (options?.navigateAfter) {
        allowLeaveRef.current = true;
        showToast({
          message: jobApplicationId
            ? 'Resume saved and selected for Assisted Apply'
            : 'Resume saved successfully',
          severity: 'success',
        });
        if (!navigateAfterAssistedApplyExit(navigate, returnTo, true)) {
          void navigate(ROUTES.SAVED_RESUMES);
        }
      }
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Failed to save resume.'),
        severity: 'error',
      });
    } finally {
      setSavingVersion(false);
    }
  };

  const handleUseResume = (resume: UploadedResume) => {
    discardDefineRoleDraft();
    setResumeId(resume.id);
    setSelectedTemplate('original');
    setOriginalAnalysis(null);
    analyzedFingerprintRef.current = '';
    setRecheckResult(null);
    recheckContentKeyRef.current = '';
    liveAtsScoreRef.current = null;
    setLiveAtsScore(null);
    void navigate(`${ROUTES.RESUME_BUILDER}/${resume.id}`, { replace: true });
    setStep(2);
    void hydrateFromExistingAnalysis(resume.id, { force: true });
  };

  const handleDeleteResume = async (resume: UploadedResume) => {
    setDeletingResumeId(resume.id);
    try {
      await resumeBuilderService.deleteResume(resume.id);
      setExistingResumes((prev) => prev.filter((item) => item.id !== resume.id));
      if (resumeId === resume.id) {
        allowLeaveRef.current = true;
        setResumeId('');
        setAnalysis(null);
        setOriginalAnalysis(null);
        analyzedFingerprintRef.current = '';
        editedContentRef.current = '';
        setEditedContent('');
        setStep(1);
        void navigate(ROUTES.RESUME_BUILDER, { replace: true });
      }
      showToast({ message: 'Resume deleted', severity: 'success' });
    } catch (error) {
      showToast({
        message: getApiErrorMessage(error, 'Could not delete resume.'),
        severity: 'error',
      });
    } finally {
      setDeletingResumeId(null);
    }
  };

  const selectedResume = resumeId
    ? (existingResumes.find((resume) => resume.id === resumeId) ?? null)
    : null;

  return {
    existingResumes,
    selectedResume,
    isDragging,
    setIsDragging,
    uploadError,
    uploading,
    deletingResumeId,
    fileInputRef,
    startingAnalysis,
    applyingId,
    saving,
    recheckResult,
    liveAtsScore,
    rechecking,
    recheckContentKeyRef,
    exportingFormat,
    versions,
    savingVersion,
    handleLiveAtsChange,
    handleFileSelect,
    handleDrop,
    handleStartAnalysis,
    handleReplaceResume,
    handleApplySuggestion,
    handleApplyAllSuggestions,
    handleIgnoreSuggestion,
    handleSaveContent,
    handleExport,
    handleSaveVersion,
    handleUseResume,
    handleDeleteResume,
  };
}
