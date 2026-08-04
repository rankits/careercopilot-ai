import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
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
import { Root } from './styles';
import type { ResumeTemplateId } from './utils';
import { getAnalysisFailureMessage, getApiErrorMessage } from './utils';

export function ResumeBuilderPage() {
  const { resumeId: paramResumeId } = useParams<{ resumeId?: string }>();
  const navigate = useNavigate();

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
  const [exporting, setExporting] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);

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
        setEditedContent(result.editedContent);
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

        // Terminal states: stop all further GET /analysis calls immediately.
        if (status === 'COMPLETED') {
          stopPolling();
          if (result.editedContent) setEditedContent(result.editedContent);
          if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
          }
          setStep(4);
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

    // If we already have a finished analysis in memory, skip polling.
    if (analysis?.status === 'COMPLETED') {
      setStep(4);
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
    let cancelled = false;
    setRechecking(true);

    void (async () => {
      try {
        // Persist latest editor content so recheck scores the real resume, not stale DB text.
        if (editedContent.trim() && analysis) {
          await resumeBuilderService.updateContent(resumeId, editedContent);
        }
        const result = await resumeBuilderService.recheckAts(resumeId);
        if (cancelled) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recheck once when entering export
  }, [step, resumeId]);

  useEffect(() => {
    if (step !== 10 || !resumeId) return;
    resumeBuilderService
      .getVersions(resumeId)
      .then(setVersions)
      .catch(() => {});
  }, [step, resumeId]);

  const goTo = useCallback(
    (s: Step) => {
      if (s === 10) setRecheckResult(null);
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
    if (step === 5) {
      goTo(10);
      return;
    }
    goTo(Math.min(10, step + 1) as Step);
  };

  const selectedResume = resumeId
    ? (existingResumes.find((resume) => resume.id === resumeId) ?? null)
    : null;

  const handleReplaceResume = () => {
    setResumeId('');
    setAnalysis(null);
    setKeywords(null);
    setSuggestions([]);
    setVersions([]);
    setRecheckResult(null);
    setEditedContent('');
    setStep(1);
    void navigate(ROUTES.RESUME_BUILDER, { replace: true });
  };

  const handleApplySuggestion = async (id: number) => {
    if (id < 0) return;
    setApplyingId(id);
    try {
      const updated = await resumeBuilderService.applySuggestion(resumeId, id);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));

      // Persist the Optimize editor content so recheck scores the draft, not a coarse server replace.
      const localContent = editedContentRef.current.trim();
      if (localContent) {
        await resumeBuilderService.updateContent(resumeId, localContent);
      }

      const refreshed = await resumeBuilderService.getAnalysis(resumeId);
      if (refreshed) {
        setAnalysis(refreshed);
        if (!localContent && refreshed.editedContent) {
          setEditedContent(refreshed.editedContent);
        }
      }
    } catch (error) {
      alert(`Failed to apply suggestion:\n${getApiErrorMessage(error)}`);
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
    } catch (error) {
      alert(`Failed to save content:\n${getApiErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    setExporting(true);
    try {
      const { alignDraftSkillsToJob, parseResumeContent, serializeResumeDraft } =
        await import('./utils');
      const draft = alignDraftSkillsToJob(
        parseResumeContent(
          editedContent || analysis?.editedContent || '',
          targetRole || analysis?.targetRole || '',
        ),
        {
          preferredSkills: skills,
          jobDescription,
          matchedSkills: analysis?.skillAnalysis?.matchedSkills,
          recommendedSkills: analysis?.skillAnalysis?.recommendedSkills,
          optimizedSummary: analysis?.optimizedSummary,
        },
      );

      if (format === 'pdf') {
        const { downloadResumePdf } = await import('./exportResume');
        await downloadResumePdf(draft, undefined, selectedTemplate);
        return;
      }

      if (format === 'txt') {
        const { downloadResumeTxt } = await import('./exportResume');
        downloadResumeTxt(draft, serializeResumeDraft(draft));
        return;
      }

      // DOCX falls back to backend export for now
      const result = await resumeBuilderService.exportResume(resumeId, format);
      const link = document.createElement('a');
      link.href = `data:${result.mimeType};base64,${result.content}`;
      link.download = result.fileName;
      link.click();
    } catch (error) {
      alert(`Export failed:\n${getApiErrorMessage(error)}`);
    } finally {
      setExporting(false);
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
      if (options?.navigateAfter) {
        void navigate(ROUTES.SAVED_RESUMES);
      }
    } catch (error) {
      alert(`Failed to save version:\n${getApiErrorMessage(error)}`);
    } finally {
      setSavingVersion(false);
    }
  };

  return (
    <Root>
      <PageHeader
        canContinue={step !== 1 || Boolean(resumeId)}
        current={step}
        onNext={handleHeaderNext}
        onSaveDraft={resumeId && analysis ? () => void handleSaveContent() : undefined}
        savingDraft={saving}
        targetRole={targetRole || analysis?.targetRole || ''}
        onEditRole={() => setStep(2)}
      />
      <WorkflowStepper current={step} />
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
        exporting={exporting}
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
        onApplySuggestion={(id) => void handleApplySuggestion(id)}
        onIgnoreSuggestion={(id) => void handleIgnoreSuggestion(id)}
        onEditedContentChange={setEditedContent}
        onSaveContent={() => void handleSaveContent()}
        onPreviewResume={() => {
          void handleSaveContent();
          goTo(8);
        }}
        onExport={(format) => void handleExport(format)}
        onSaveVersion={() => void handleSaveVersion()}
        onDone={() => void handleSaveVersion({ navigateAfter: true })}
        onTemplateChange={setSelectedTemplate}
      />
    </Root>
  );
}
