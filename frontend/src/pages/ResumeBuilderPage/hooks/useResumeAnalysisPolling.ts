import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type {
  AnalysisResult,
  KeywordsResponse,
  SuggestionItem,
} from '@/services/resumeBuilder.service';
import { resumeBuilderService } from '@/services/resumeBuilder.service';

import type { ResumeBuilderStep as Step } from '../constants';
import { getAnalysisFailureMessage } from '../utils';

import { analysisInputFingerprint, skillsKeyOf, type CleanSnapshot } from './resumeBuilder.shared';

type ShowToast = (input: {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  autoHideDuration?: number;
}) => void;

export function useResumeAnalysisPolling({
  resumeId,
  step,
  setStep,
  targetRole,
  jobDescription,
  industry,
  employmentType,
  experienceLevel,
  skills,
  suggestions,
  setSuggestions,
  showToast,
  editedContentRef,
  setTargetRole,
  setJobDescription,
  setIndustry,
  setEmploymentType,
  setExperienceLevel,
  setSkills,
  setEditedContent,
  setCleanSnapshot,
}: {
  resumeId: string;
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  targetRole: string;
  jobDescription: string;
  industry: string;
  employmentType: string;
  experienceLevel: string;
  skills: string[];
  suggestions: SuggestionItem[];
  setSuggestions: Dispatch<SetStateAction<SuggestionItem[]>>;
  showToast: ShowToast;
  editedContentRef: React.MutableRefObject<string>;
  setTargetRole: Dispatch<SetStateAction<string>>;
  setJobDescription: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setEmploymentType: Dispatch<SetStateAction<string>>;
  setExperienceLevel: Dispatch<SetStateAction<'entry' | 'mid' | 'senior' | 'lead' | 'executive'>>;
  setSkills: Dispatch<SetStateAction<string[]>>;
  setEditedContent: Dispatch<SetStateAction<string>>;
  setCleanSnapshot: Dispatch<SetStateAction<CleanSnapshot>>;
}) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  /** Frozen ATS snapshot from the last completed analysis run (Analyze step display). */
  const [originalAnalysis, setOriginalAnalysis] = useState<AnalysisResult | null>(null);
  const analysisRef = useRef<AnalysisResult | null>(null);
  const originalAnalysisRef = useRef<AnalysisResult | null>(null);
  const analyzedFingerprintRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keywords, setKeywords] = useState<KeywordsResponse | null>(null);

  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  useEffect(() => {
    originalAnalysisRef.current = originalAnalysis;
  }, [originalAnalysis]);

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
    // Match prior page behavior: hydrate callback is stable across form edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!resumeId) return;
    void hydrateFromExistingAnalysis(resumeId);
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
            showToast({
              message: 'Analysis is taking too long. Please try again.',
              severity: 'warning',
            });
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
          showToast({
            message: getAnalysisFailureMessage(result),
            severity: 'error',
            autoHideDuration: 8000,
          });
          setStep(2);
          return;
        }

        if (attempt >= maxAttempts) {
          stopPolling();
          showToast({
            message: 'Analysis is taking too long. Please try again.',
            severity: 'warning',
          });
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
          showToast({
            message:
              'Could not load analysis status. Check your network or AI API keys, then try again.',
            severity: 'error',
            autoHideDuration: 8000,
          });
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

  return {
    analysis,
    setAnalysis,
    analysisRef,
    originalAnalysis,
    setOriginalAnalysis,
    originalAnalysisRef,
    analyzedFingerprintRef,
    pollTimerRef,
    keywords,
    setKeywords,
    hydrateFromExistingAnalysis,
  };
}
