import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { ROUTES } from '@/constants/routes';
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@/lib/material';
import type {
  UploadedResume,
  AnalysisResult,
  KeywordsResponse,
  SuggestionItem,
  RecheckResult,
  ResumeVersion,
} from '@/services/resumeBuilder.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';

import { PageHeader } from './components/PageHeader';
import { ResumeBuilderStepPanels } from './components/ResumeBuilderStepPanels';
import { WorkflowStepper } from './components/WorkflowStepper';
import type { ResumeBuilderStep as Step } from './constants';
import { Root, StickyChrome } from './styles';
import type { LiveSkillAnalysis, ResumeTemplateId } from './utils';
import { getAnalysisFailureMessage, getApiErrorMessage, shouldBlockAnalyzeContinue } from './utils';

type CleanSnapshot = {
  content: string;
  targetRole: string;
  jobDescription: string;
  skillsKey: string;
  skills: string[];
};

function skillsKeyOf(skills: string[]) {
  return skills
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

/** Builder workspace paths (not Saved Resumes). */
function isResumeBuilderWorkspacePath(pathname: string) {
  if (pathname === ROUTES.SAVED_RESUMES || pathname.startsWith(`${ROUTES.SAVED_RESUMES}/`)) {
    return false;
  }
  return pathname === ROUTES.RESUME_BUILDER || pathname.startsWith(`${ROUTES.RESUME_BUILDER}/`);
}

function analysisInputFingerprint(input: {
  resumeId: string;
  targetRole: string;
  jobDescription: string;
  industry: string;
  employmentType: string;
  experienceLevel: string;
  skillsKey: string;
}) {
  return [
    input.resumeId,
    input.targetRole.trim(),
    input.jobDescription.trim(),
    input.industry.trim(),
    input.employmentType.trim(),
    input.experienceLevel,
    input.skillsKey,
  ].join('\u0000');
}

export function ResumeBuilderPage() {
  const { resumeId: paramResumeId } = useParams<{ resumeId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(paramResumeId ? 2 : 1);
  const [resumeId, setResumeId] = useState<string>(paramResumeId ?? '');
  const [existingResumes, setExistingResumes] = useState<UploadedResume[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetRole, setTargetRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<
    'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  >('mid');
  const [employmentType, setEmploymentType] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>('original');

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  /** Frozen ATS snapshot from the last completed analysis run (Analyze step display). */
  const [originalAnalysis, setOriginalAnalysis] = useState<AnalysisResult | null>(null);
  const analysisRef = useRef<AnalysisResult | null>(null);
  const originalAnalysisRef = useRef<AnalysisResult | null>(null);
  const analyzedFingerprintRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [keywords, setKeywords] = useState<KeywordsResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const editedContentRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [recheckResult, setRecheckResult] = useState<RecheckResult | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const recheckContentKeyRef = useRef<string>('');
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const allowLeaveRef = useRef(false);
  const [cleanSnapshot, setCleanSnapshot] = useState<CleanSnapshot>({
    content: '',
    targetRole: '',
    jobDescription: '',
    skillsKey: '',
    skills: [],
  });

  const skillsKey = skillsKeyOf(skills);
  const isDirty =
    Boolean(resumeId) &&
    (editedContent !== cleanSnapshot.content ||
      targetRole !== cleanSnapshot.targetRole ||
      jobDescription !== cleanSnapshot.jobDescription ||
      skillsKey !== cleanSnapshot.skillsKey);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty || allowLeaveRef.current) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    // In-flow navigations (/resume-builder ↔ /resume-builder/:id) must not prompt.
    if (
      isResumeBuilderWorkspacePath(currentLocation.pathname) &&
      isResumeBuilderWorkspacePath(nextLocation.pathname)
    ) {
      return false;
    }
    // Only when leaving the Resume Builder workspace for another app page.
    return isResumeBuilderWorkspacePath(currentLocation.pathname);
  });

  // Re-arm the leave guard after the user keeps editing or makes new changes.
  useEffect(() => {
    if (isDirty) allowLeaveRef.current = false;
  }, [isDirty]);

  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  useEffect(() => {
    originalAnalysisRef.current = originalAnalysis;
  }, [originalAnalysis]);

  // Browser refresh / tab close.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const markSnapshotClean = useCallback(
    (overrides?: Partial<CleanSnapshot>) => {
      const nextSkills = overrides?.skills ?? skills;
      setCleanSnapshot({
        content: overrides?.content ?? editedContentRef.current,
        targetRole: overrides?.targetRole ?? targetRole,
        jobDescription: overrides?.jobDescription ?? jobDescription,
        skillsKey: overrides?.skillsKey ?? skillsKeyOf(nextSkills),
        skills: [...nextSkills],
      });
    },
    [jobDescription, skills, targetRole],
  );

  const cleanSnapshotRef = useRef(cleanSnapshot);
  useEffect(() => {
    cleanSnapshotRef.current = cleanSnapshot;
  }, [cleanSnapshot]);

  /** Drop unsaved Define Role edits when returning to Upload. */
  const discardDefineRoleDraft = useCallback(() => {
    const snap = cleanSnapshotRef.current;
    setTargetRole(snap.targetRole);
    setJobDescription(snap.jobDescription);
    setSkills([...snap.skills]);
    setIndustry('');
    setEmploymentType('');
    setExperienceLevel('mid');
  }, []);

  const goBackToUpload = useCallback(() => {
    discardDefineRoleDraft();
    setStep(1);
  }, [discardDefineRoleDraft]);

  const closeLeaveDialog = () => {
    blocker.reset?.();
  };

  const confirmLeave = () => {
    allowLeaveRef.current = true;
    blocker.proceed?.();
  };

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const resumes = await resumeBuilderService.listResumes();
        setExistingResumes(resumes);
      } catch (error) {
        console.error(error);
      }
    };

    void loadResumes();
  }, []);

  const hydrateFromExistingAnalysis = useCallback(
    async (id: string, options?: { force?: boolean }) => {
      const cached = analysisRef.current;
      const cachedOriginal = originalAnalysisRef.current;
      // Restore from in-memory cache when returning between steps — avoid duplicate API calls.
      if (
        !options?.force &&
        cached &&
        cached.resumeId === id &&
        String(cached.status || '').toUpperCase() === 'COMPLETED' &&
        cachedOriginal?.resumeId === id
      ) {
        return;
      }

      try {
        const result = await resumeBuilderService.getAnalysis(id);
        if (!result) {
          if (!cached || cached.resumeId !== id) {
            setAnalysis(null);
            setOriginalAnalysis(null);
            analyzedFingerprintRef.current = '';
          }
          return;
        }
        setAnalysis((prev) => {
          // Keep local edited content / freeze ATS scores if we already completed this run.
          if (
            prev &&
            prev.resumeId === id &&
            String(prev.status || '').toUpperCase() === 'COMPLETED' &&
            originalAnalysisRef.current?.resumeId === id &&
            !options?.force
          ) {
            return {
              ...prev,
              editedContent: editedContentRef.current || prev.editedContent || result.editedContent,
            };
          }
          return result;
        });
        if (String(result.status || '').toUpperCase() === 'COMPLETED') {
          setOriginalAnalysis((prev) => {
            if (prev?.resumeId === id && !options?.force) return prev;
            return result;
          });
          // Align cache key with form values after hydrate (force clears industry/skills).
          // Empty fingerprint used to skip ATS even after JD edits — always seed from result.
          if (options?.force || !analyzedFingerprintRef.current) {
            analyzedFingerprintRef.current = analysisInputFingerprint({
              resumeId: id,
              targetRole: result.targetRole?.trim() || '',
              jobDescription: result.jobDescription?.trim() || '',
              industry: '',
              employmentType: '',
              experienceLevel: 'mid',
              skillsKey: '',
            });
          }
        }
        if (options?.force) {
          // Re-selecting / re-uploading must not keep unsaved Define Role edits.
          setTargetRole(result.targetRole?.trim() || '');
          setJobDescription(result.jobDescription?.trim() || '');
          setIndustry('');
          setEmploymentType('');
          setExperienceLevel('mid');
          setSkills([]);
          setCleanSnapshot((prev) => ({
            ...prev,
            targetRole: result.targetRole?.trim() || '',
            jobDescription: result.jobDescription?.trim() || '',
            skillsKey: '',
            skills: [],
          }));
        } else {
          if (result.targetRole?.trim()) {
            setTargetRole((prev) => (prev.trim() ? prev : result.targetRole));
          }
          if (result.jobDescription?.trim()) {
            setJobDescription((prev) => (prev.trim() ? prev : (result.jobDescription ?? '')));
          }
        }
        if (result.editedContent && !editedContentRef.current.trim()) {
          editedContentRef.current = result.editedContent;
          setEditedContent(result.editedContent);
          setCleanSnapshot((prev) => ({
            ...prev,
            content: result.editedContent!,
            targetRole: result.targetRole || prev.targetRole,
            jobDescription: result.jobDescription || prev.jobDescription,
          }));
        }
      } catch {
        if (!analysisRef.current || analysisRef.current.resumeId !== id) {
          setAnalysis(null);
          setOriginalAnalysis(null);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!resumeId) return;
    void hydrateFromExistingAnalysis(resumeId);
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => setVersions([]));
    // Hydrate once per resume — step changes must not refetch ATS.
  }, [resumeId, hydrateFromExistingAnalysis]);

  useEffect(() => {
    if (step !== 3 || !resumeId) return;

    let cancelled = false;
    let attempt = 0;
    let inFlight = false;
    const maxAttempts = 40; // slower cadence → fewer calls (~4–5 min)

    const clearPoll = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const stopPolling = () => {
      cancelled = true;
      clearPoll();
    };

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      clearPoll();
      pollTimerRef.current = setTimeout(() => void poll(), delayMs);
    };

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      attempt += 1;
      try {
        const result = await resumeBuilderService.getAnalysis(resumeId);
        if (cancelled) return;

        // Analyze just started — row may not be visible for a beat.
        if (!result) {
          if (attempt >= maxAttempts) {
            stopPolling();
            alert('Analysis is taking too long. Please try again.');
            setStep(2);
            return;
          }
          schedule(Math.min(10000, 2500 + attempt * 400));
          return;
        }

        const status = String(result.status || '').toUpperCase();

        // Terminal states: stop polling. Stay on Analyze until the user clicks Next.
        if (status === 'COMPLETED') {
          stopPolling();
          // Trust AI semantic ATS JSON from the server — do not re-filter with chip parsers.
          setAnalysis(result);
          setOriginalAnalysis(result);
          analyzedFingerprintRef.current = analysisInputFingerprint({
            resumeId,
            targetRole,
            jobDescription,
            industry,
            employmentType,
            experienceLevel,
            skillsKey: skillsKeyOf(skills),
          });
          if (result.editedContent) {
            editedContentRef.current = result.editedContent;
            setEditedContent(result.editedContent);
            setCleanSnapshot((prev) => ({
              ...prev,
              content: result.editedContent!,
              targetRole: result.targetRole || prev.targetRole,
              jobDescription: result.jobDescription || prev.jobDescription,
            }));
          }
          if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
          }
          return;
        }

        setAnalysis(result);

        if (status === 'FAILED') {
          stopPolling();
          alert(`Analysis failed:\n${getAnalysisFailureMessage(result)}`);
          setStep(2);
          return;
        }

        if (attempt >= maxAttempts) {
          stopPolling();
          alert('Analysis is taking too long. Please try again.');
          setStep(2);
          return;
        }

        // Pending only: back off 3s → 10s so we do not hammer the API.
        const delay = Math.min(10000, 3000 + (attempt - 1) * 700);
        schedule(delay);
      } catch {
        if (cancelled) return;
        if (attempt >= maxAttempts) {
          stopPolling();
          alert(
            'Could not load analysis status. Check your network or AI API keys, then try again.',
          );
          setStep(2);
          return;
        }
        schedule(Math.min(10000, 4000 + attempt * 500));
      } finally {
        inFlight = false;
      }
    };

    // Analysis already finished — keep the user on Analyze until they click Next.
    // Prefer frozen original snapshot so returning from Review never restarts polling.
    const cachedStatus = String(
      (originalAnalysisRef.current ?? analysis)?.status || '',
    ).toUpperCase();
    if (cachedStatus === 'COMPLETED') {
      return stopPolling;
    }
    if (cachedStatus === 'FAILED') {
      setStep(2);
      return stopPolling;
    }

    schedule(1500);
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll only while step 3 is active
  }, [step, resumeId]);

  useEffect(() => {
    editedContentRef.current = editedContent;
  }, [editedContent]);

  useEffect(() => {
    if (step !== 5 || !resumeId) return;

    // Only fetch keywords/suggestions when missing — never overwrite a completed ATS snapshot.
    let cancelled = false;

    if (!keywords) {
      void resumeBuilderService
        .getKeywords(resumeId)
        .then((result) => {
          if (!cancelled) setKeywords(result);
        })
        .catch(() => {});
    }

    if (suggestions.length === 0) {
      void resumeBuilderService
        .getSuggestions(resumeId)
        .then((items) => {
          if (!cancelled && items.length > 0) setSuggestions(items);
        })
        .catch(() => {});
    }

    const hasCompleted =
      String((originalAnalysisRef.current ?? analysisRef.current)?.status || '').toUpperCase() ===
      'COMPLETED';
    if (!hasCompleted) {
      void resumeBuilderService
        .getAnalysis(resumeId)
        .then((result) => {
          if (cancelled || !result) return;
          setAnalysis(result);
          if (String(result.status || '').toUpperCase() === 'COMPLETED') {
            setOriginalAnalysis(result);
          }
          if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
            setSuggestions((prev) => (prev.length > 0 ? prev : result.suggestions));
          }
          if (result.editedContent && !editedContentRef.current.trim()) {
            setEditedContent(result.editedContent);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache-aware; avoid refetch on every analysis mutation
  }, [step, resumeId]);

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

    void (async () => {
      try {
        if (contentKey && analysis) {
          await resumeBuilderService.updateContent(resumeId, contentKey);
        }
        const result = await resumeBuilderService.recheckAts(resumeId);
        if (cancelled) return;
        recheckContentKeyRef.current = contentKey;
        setRecheckResult(result);
        // Do not overwrite the original Analyze-step ATS snapshot with export recheck scores.
      } catch (error) {
        if (!cancelled) {
          alert(
            `Could not recalculate ATS score:\n${getApiErrorMessage(error, 'Showing your last analysis score.')}`,
          );
        }
      } finally {
        if (!cancelled) setRechecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recheck only when export opens or content key changes
  }, [step, resumeId, editedContent]);

  useEffect(() => {
    if (step !== 10 || !resumeId) return;
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => {});
  }, [step, resumeId]);

  const goTo = useCallback(
    (s: Step) => {
      setStep(s);
      if (resumeId) resumeBuilderService.updateStep(resumeId, s).catch(() => {});
    },
    [resumeId],
  );

  const handleLiveAtsChange = useCallback((_score: number, _skills?: LiveSkillAnalysis) => {
    // Live Optimize estimates stay local to OptimizeStep.
    // Never mutate the original Analyze-step ATS snapshot while reviewing.
    void _score;
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
        setCleanSnapshot({
          content: '',
          targetRole: '',
          jobDescription: '',
          skillsKey: '',
          skills: [],
        });
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
        void hydrateFromExistingAnalysis(uploaded.id, { force: true });
      } catch {
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [navigate, hydrateFromExistingAnalysis],
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
      alert('Target role is required.');
      return;
    }
    if (!jobDescription.trim()) {
      alert('Job description is required.');
      return;
    }
    if (!resumeId) {
      alert('Please upload or select a resume first.');
      setStep(1);
      return;
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
      alert(`Failed to start analysis:\n${getApiErrorMessage(error)}`);
    } finally {
      setStartingAnalysis(false);
    }
  };

  const handleHeaderNext = () => {
    if (step === 1) {
      if (resumeId) setStep(2);
      return;
    }
    if (step === 2) {
      void handleStartAnalysis();
      return;
    }
    if (step === 3) {
      if (String(analysis?.status || '').toUpperCase() !== 'COMPLETED') return;
      if (shouldBlockAnalyzeContinue(analysis)) return;
      goTo(5);
      return;
    }
    if (step === 4 || step === 5) {
      goTo(10);
      return;
    }
    goTo(Math.min(10, step + 1) as Step);
  };

  const handleHeaderBack = () => {
    if (step === 1) return;
    if (step === 2) {
      goBackToUpload();
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 4 || step === 5) {
      goTo(3);
      return;
    }
    if (step === 10) {
      goTo(5);
      return;
    }
    goTo(Math.max(1, step - 1) as Step);
  };

  const selectedResume = resumeId
    ? (existingResumes.find((resume) => resume.id === resumeId) ?? null)
    : null;

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
    setCleanSnapshot({
      content: '',
      targetRole: '',
      jobDescription: '',
      skillsKey: '',
      skills: [],
    });
    setTargetRole('');
    setJobDescription('');
    setIndustry('');
    setEmploymentType('');
    setExperienceLevel('mid');
    setSkills([]);
    setStep(1);
    void navigate(ROUTES.RESUME_BUILDER, { replace: true });
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
      alert(`Failed to apply suggestion:\n${getApiErrorMessage(error)}`);
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
          const updated = await resumeBuilderService.applySuggestion(resumeId, id, {
            // Allow backend to update resume content for each suggestion (skills in particular).
            preserveContent: false,
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

      const refreshed = await resumeBuilderService.getAnalysis(resumeId);
      mergeRecheckIntoAnalysis(refreshed, recheck, localContent);
      if (recheck) {
        setRecheckResult(recheck);
        recheckContentKeyRef.current = localContent;
      }
      showToast({
        message:
          ids.length > 1
            ? 'All improvements applied successfully'
            : 'Improvement applied successfully',
        severity: 'success',
      });
    } catch (error) {
      alert(`Failed to apply all suggestions:\n${getApiErrorMessage(error)}`);
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
      alert('Failed to ignore suggestion.');
    } finally {
      setApplyingId(null);
    }
  };

  const handleSaveContent = async () => {
    if (!analysis) {
      alert('Run Analyze first before saving optimized content.');
      return;
    }
    setSaving(true);
    try {
      await resumeBuilderService.updateContent(resumeId, editedContent);
      markSnapshotClean({ content: editedContent });
    } catch (error) {
      alert(`Failed to save content:\n${getApiErrorMessage(error)}`);
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

      const { alignDraftToJob, parseResumeContent } = await import('./utils');
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
        const { downloadResumePdf } = await import('./exportResume');
        await downloadResumePdf(draft, undefined, selectedTemplate, previewRoot);
        return;
      }

      const result = await resumeBuilderService.exportResume(resumeId, format);
      const link = document.createElement('a');
      link.href = `data:${result.mimeType};base64,${result.content}`;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      alert(`Export failed:\n${getApiErrorMessage(error)}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleSaveVersion = async (options?: { navigateAfter?: boolean }) => {
    if (!analysis) {
      alert('Run Analyze first before saving a version.');
      return;
    }
    setSavingVersion(true);
    try {
      if (editedContent.trim()) {
        await resumeBuilderService.updateContent(resumeId, editedContent);
      }
      const label = `${targetRole || analysis?.targetRole || 'Resume'} — ${new Date().toLocaleDateString()}`;
      await resumeBuilderService.saveVersion(resumeId, label, editedContent);
      setVersions(await resumeBuilderService.getVersions(resumeId));
      markSnapshotClean({ content: editedContent });
      if (options?.navigateAfter) {
        allowLeaveRef.current = true;
        showToast({
          message: 'Resume saved successfully',
          severity: 'success',
        });
        void navigate(ROUTES.SAVED_RESUMES);
      }
    } catch (error) {
      alert(`Failed to save resume:\n${getApiErrorMessage(error)}`);
    } finally {
      setSavingVersion(false);
    }
  };

  const canContinue =
    step === 1
      ? Boolean(resumeId)
      : step === 2
        ? Boolean(targetRole.trim() && jobDescription.trim() && resumeId)
        : step === 3
          ? String(analysis?.status || '').toUpperCase() === 'COMPLETED' &&
            !shouldBlockAnalyzeContinue(analysis)
          : true;

  return (
    <Root>
      <style>
        {`
          /* Make A4 preview robust for long/unbroken text. */
          .preview-page * {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
        `}
      </style>
      <StickyChrome>
        <PageHeader
          canContinue={canContinue}
          current={step}
          onBack={step > 1 ? handleHeaderBack : undefined}
          onNext={handleHeaderNext}
        />
        <WorkflowStepper current={step} />
      </StickyChrome>
      <ResumeBuilderStepPanels
        step={step}
        existingResumes={existingResumes}
        selectedResume={selectedResume}
        isDragging={isDragging}
        uploadError={uploadError}
        uploading={uploading}
        deletingResumeId={deletingResumeId}
        fileInputRef={fileInputRef}
        targetRole={targetRole}
        industry={industry}
        experienceLevel={experienceLevel}
        employmentType={employmentType}
        skills={skills}
        jobDescription={jobDescription}
        startingAnalysis={startingAnalysis}
        analysis={analysis}
        originalAnalysis={originalAnalysis}
        keywords={keywords}
        suggestions={suggestions}
        applyingId={applyingId}
        editedContent={editedContent}
        saving={saving}
        recheckResult={recheckResult}
        rechecking={rechecking}
        exportingFormat={exportingFormat}
        versions={versions}
        savingVersion={savingVersion}
        selectedTemplate={selectedTemplate}
        onDragStateChange={setIsDragging}
        onDrop={handleDrop}
        onFileSelect={(file) => void handleFileSelect(file)}
        onUseResume={(resume) => {
          discardDefineRoleDraft();
          setResumeId(resume.id);
          setSelectedTemplate('original');
          setOriginalAnalysis(null);
          analyzedFingerprintRef.current = '';
          setRecheckResult(null);
          recheckContentKeyRef.current = '';
          void navigate(`${ROUTES.RESUME_BUILDER}/${resume.id}`, { replace: true });
          setStep(2);
          void hydrateFromExistingAnalysis(resume.id, { force: true });
        }}
        onDeleteResume={async (resume) => {
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
            alert(`Could not delete resume:\n${getApiErrorMessage(error)}`);
          } finally {
            setDeletingResumeId(null);
          }
        }}
        onShowMoreResumes={() => {
          void navigate(ROUTES.SAVED_RESUMES);
        }}
        onTargetRoleChange={setTargetRole}
        onIndustryChange={setIndustry}
        onExperienceLevelChange={setExperienceLevel}
        onEmploymentTypeChange={setEmploymentType}
        onSkillsChange={setSkills}
        onJobDescriptionChange={setJobDescription}
        onStartAnalysis={() => void handleStartAnalysis()}
        onBackFromDefineRole={goBackToUpload}
        onReplaceResume={handleReplaceResume}
        onGoTo={goTo}
        onApplySuggestion={(id, content) => void handleApplySuggestion(id, content)}
        onApplyAllSuggestions={(ids, content) => void handleApplyAllSuggestions(ids, content)}
        onIgnoreSuggestion={(id) => void handleIgnoreSuggestion(id)}
        onEditedContentChange={(value) => {
          editedContentRef.current = value;
          setEditedContent(value);
        }}
        onLiveAtsChange={handleLiveAtsChange}
        onSaveContent={() => void handleSaveContent()}
        onPreviewResume={() => {
          void handleSaveContent();
          goTo(8);
        }}
        onExport={(format, previewRoot) => void handleExport(format, previewRoot)}
        onDone={() => void handleSaveVersion({ navigateAfter: true })}
        onTemplateChange={setSelectedTemplate}
      />

      <Dialog open={blocker.state === 'blocked'} onClose={closeLeaveDialog} fullWidth maxWidth="xs">
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes in your resume.
            <br />
            Are you sure you want to discard them?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button variant="outline" onClick={closeLeaveDialog}>
            Keep Editing
          </Button>
          <Button onClick={confirmLeave}>Discard Changes</Button>
        </DialogActions>
      </Dialog>
    </Root>
  );
}
