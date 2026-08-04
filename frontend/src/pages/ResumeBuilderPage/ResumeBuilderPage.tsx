import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { ROUTES } from '@/constants/routes';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@/lib/material';
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
import type { ResumeTemplateId } from './utils';
import {
  getAnalysisFailureMessage,
  getApiErrorMessage,
  refreshSkillAnalysisFromContent,
  shouldBlockAnalyzeContinue,
} from './utils';

type CleanSnapshot = {
  content: string;
  targetRole: string;
  jobDescription: string;
  skillsKey: string;
};

function skillsKeyOf(skills: string[]) {
  return skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean).sort().join('|');
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
  });

  const skillsKey = skillsKeyOf(skills);
  const isDirty =
    Boolean(resumeId) &&
    (editedContent !== cleanSnapshot.content ||
      targetRole !== cleanSnapshot.targetRole ||
      jobDescription !== cleanSnapshot.jobDescription ||
      skillsKey !== cleanSnapshot.skillsKey);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // Re-arm the leave guard after the user keeps editing or makes new changes.
  useEffect(() => {
    if (isDirty) allowLeaveRef.current = false;
  }, [isDirty]);

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
      setCleanSnapshot({
        content: overrides?.content ?? editedContentRef.current,
        targetRole: overrides?.targetRole ?? targetRole,
        jobDescription: overrides?.jobDescription ?? jobDescription,
        skillsKey: overrides?.skillsKey ?? skillsKeyOf(skills),
      });
    },
    [jobDescription, skills, targetRole],
  );

  const closeLeaveDialog = () => {
    blocker.reset?.();
  };

  const confirmLeave = () => {
    allowLeaveRef.current = true;
    blocker.proceed?.();
  };


  useEffect(() => {
    resumeBuilderService
      .listResumes()
      .then(setExistingResumes)
      .catch(() => {});
  }, []);

  const hydrateFromExistingAnalysis = useCallback(async (id: string) => {
    try {
      const result = await resumeBuilderService.getAnalysis(id);
      if (!result) {
        setAnalysis(null);
        return;
      }
      setAnalysis(result);
      if (result.targetRole?.trim()) {
        setTargetRole((prev) => (prev.trim() ? prev : result.targetRole));
      }
      if (result.jobDescription?.trim()) {
        setJobDescription((prev) => (prev.trim() ? prev : (result.jobDescription ?? '')));
      }
      if (result.editedContent && !editedContentRef.current.trim()) {
        editedContentRef.current = result.editedContent;
        setEditedContent(result.editedContent);
        setCleanSnapshot({
          content: result.editedContent,
          targetRole: result.targetRole || '',
          jobDescription: result.jobDescription || '',
          skillsKey: '',
        });
      }
    } catch {
      setAnalysis(null);
    }
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    // Avoid duplicate status fetches while the analyze poller is already running.
    if (step === 3) return;
    void hydrateFromExistingAnalysis(resumeId);
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [resumeId, step, hydrateFromExistingAnalysis]);

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
        setAnalysis(result);

        // Terminal states: stop polling. Stay on Analyze until the user clicks Next.
        if (status === 'COMPLETED') {
          stopPolling();
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
    if (analysis?.status === 'COMPLETED') {
      return stopPolling;
    }
    if (analysis?.status === 'FAILED') {
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
    resumeBuilderService
      .getKeywords(resumeId)
      .then(setKeywords)
      .catch(() => {});
    resumeBuilderService
      .getSuggestions(resumeId)
      .then((items) => {
        if (items.length > 0) setSuggestions(items);
      })
      .catch(() => {});
    resumeBuilderService
      .getAnalysis(resumeId)
      .then((result) => {
        if (!result) return;
        setAnalysis(result);
        if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
          setSuggestions((prev) => (prev.length > 0 ? prev : result.suggestions));
        }
        if (result.editedContent && !editedContentRef.current.trim()) {
          setEditedContent(result.editedContent);
        }
      })
      .catch(() => {});
  }, [step, resumeId]);

  useEffect(() => {
    if (step !== 10 || !resumeId) return;

    const contentKey = (editedContent.trim() || analysis?.editedContent || '').trim();
    // Reuse cached ATS result while navigating — only recheck when resume text changed.
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
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                baselineAtsScore: result.previousAtsScore ?? prev.baselineAtsScore ?? prev.atsScore,
                atsScore: result.atsScore,
                keywordMatch: result.keywordMatch ?? prev.keywordMatch,
                skillMatch: result.skillMatch ?? prev.skillMatch,
                contentQuality: result.contentQuality ?? prev.contentQuality,
                readability: result.readability ?? prev.readability,
                formattingScore: result.formattingScore ?? prev.formattingScore,
                sectionScores: result.sectionScores ?? prev.sectionScores,
                skillAnalysis: result.skillAnalysis ?? prev.skillAnalysis,
              }
            : prev,
        );
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
        setResumeId(uploaded.id);
        setExistingResumes((prev) => [uploaded, ...prev.filter((r) => r.id !== uploaded.id)]);
        void navigate(`${ROUTES.RESUME_BUILDER}/${uploaded.id}`, { replace: true });
        setStep(2);
        void hydrateFromExistingAnalysis(uploaded.id);
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
    // Stop any previous poller before starting a new analysis job.
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStartingAnalysis(true);
    try {
      setRecheckResult(null);
      setAnalysis(null);
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
      });
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
      setStep(1);
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
    });
    setStep(1);
    void navigate(ROUTES.RESUME_BUILDER, { replace: true });
  };

  const mergeRecheckIntoAnalysis = (
    refreshed: AnalysisResult | null,
    recheck: Awaited<ReturnType<typeof resumeBuilderService.recheckAts>> | null,
    localContent: string,
  ) => {
    if (refreshed) {
      setAnalysis({
        ...refreshed,
        editedContent: localContent || refreshed.editedContent,
        ...(recheck
          ? {
              atsScore: recheck.atsScore,
              keywordMatch: recheck.keywordMatch ?? refreshed.keywordMatch,
              skillMatch: recheck.skillMatch ?? refreshed.skillMatch,
              contentQuality: recheck.contentQuality ?? refreshed.contentQuality,
              readability: recheck.readability ?? refreshed.readability,
              formattingScore: recheck.formattingScore ?? refreshed.formattingScore,
              sectionScores: recheck.sectionScores ?? refreshed.sectionScores,
              skillAnalysis: recheck.skillAnalysis ?? refreshed.skillAnalysis,
              baselineAtsScore:
                recheck.previousAtsScore ?? refreshed.baselineAtsScore ?? refreshed.atsScore,
            }
          : {}),
      });
      if (!localContent && refreshed.editedContent) {
        setEditedContent(refreshed.editedContent);
      }
      return;
    }

    if (!recheck) return;
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            atsScore: recheck.atsScore,
            keywordMatch: recheck.keywordMatch ?? prev.keywordMatch,
            skillMatch: recheck.skillMatch ?? prev.skillMatch,
            contentQuality: recheck.contentQuality ?? prev.contentQuality,
            readability: recheck.readability ?? prev.readability,
            formattingScore: recheck.formattingScore ?? prev.formattingScore,
            sectionScores: recheck.sectionScores ?? prev.sectionScores,
            skillAnalysis: recheck.skillAnalysis ?? prev.skillAnalysis,
            baselineAtsScore: recheck.previousAtsScore ?? prev.baselineAtsScore ?? prev.atsScore,
            editedContent: localContent || prev.editedContent,
          }
        : prev,
    );
  };

  const handleApplySuggestion = async (id: number, contentOverride?: string) => {
    if (id < 0) return;
    setApplyingId(id);
    try {
      const localContent = (contentOverride ?? editedContentRef.current).trim();
      if (localContent) {
        editedContentRef.current = localContent;
        setEditedContent(localContent);
        // Optimistic skill refresh so Missing Skills update before the network round-trip.
        setAnalysis((prev) => {
          if (!prev?.skillAnalysis) return prev;
          return {
            ...prev,
            skillAnalysis: refreshSkillAnalysisFromContent(localContent, prev.skillAnalysis),
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
          skillAnalysis: prev.skillAnalysis
            ? refreshSkillAnalysisFromContent(localContent, prev.skillAnalysis)
            : prev.skillAnalysis,
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
            preserveContent: true,
          });
          setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
        } catch {
          // Keep optimistic APPLIED status if a single mark fails.
        }
      }

      await resumeBuilderService.updateContent(resumeId, localContent);

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

  const handleExport = async (
    format: 'pdf' | 'docx',
    previewRoot?: HTMLElement | null,
  ) => {
    setExportingFormat(format);
    try {
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
      <StickyChrome>
        <PageHeader
          canContinue={canContinue}
          current={step}
          onBack={step > 1 ? handleHeaderBack : undefined}
          onNext={handleHeaderNext}
          onSaveDraft={resumeId && analysis ? () => void handleSaveContent() : undefined}
          savingDraft={saving}
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
        fileInputRef={fileInputRef}
        targetRole={targetRole}
        industry={industry}
        experienceLevel={experienceLevel}
        employmentType={employmentType}
        skills={skills}
        jobDescription={jobDescription}
        startingAnalysis={startingAnalysis}
        analysis={analysis}
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
          setResumeId(resume.id);
          void navigate(`${ROUTES.RESUME_BUILDER}/${resume.id}`, { replace: true });
          setStep(2);
          void hydrateFromExistingAnalysis(resume.id);
        }}
        onTargetRoleChange={setTargetRole}
        onIndustryChange={setIndustry}
        onExperienceLevelChange={setExperienceLevel}
        onEmploymentTypeChange={setEmploymentType}
        onSkillsChange={setSkills}
        onJobDescriptionChange={setJobDescription}
        onStartAnalysis={() => void handleStartAnalysis()}
        onBackFromDefineRole={() => setStep(1)}
        onReplaceResume={handleReplaceResume}
        onGoTo={goTo}
        onApplySuggestion={(id, content) => void handleApplySuggestion(id, content)}
        onApplyAllSuggestions={(ids, content) => void handleApplyAllSuggestions(ids, content)}
        onIgnoreSuggestion={(id) => void handleIgnoreSuggestion(id)}
        onEditedContentChange={(value) => {
          editedContentRef.current = value;
          setEditedContent(value);
        }}
        onSaveContent={() => void handleSaveContent()}
        onPreviewResume={() => {
          void handleSaveContent();
          goTo(8);
        }}
        onExport={(format, previewRoot) => void handleExport(format, previewRoot)}
        onDone={() => void handleSaveVersion({ navigateAfter: true })}
        onTemplateChange={setSelectedTemplate}
      />

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={closeLeaveDialog}
        fullWidth
        maxWidth="xs"
      >
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
