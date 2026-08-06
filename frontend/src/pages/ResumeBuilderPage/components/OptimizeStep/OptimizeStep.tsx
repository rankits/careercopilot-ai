import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  AutoAwesomeOutlinedIcon,
  Box,
  LightbulbOutlinedIcon,
  NavigateNextIcon,
  Typography,
} from '@/lib/material';
import type { AnalysisResult, SuggestionItem } from '@/services/resumeBuilder.service';

import {
  RESUME_SECTIONS,
  RESUME_TEMPLATES,
  alignDraftToJob,
  applyTextReplaceToDraft,
  buildFallbackSuggestions,
  consolidatePendingSkillSuggestions,
  estimateImprovedAtsScore,
  getSectionText,
  isLocalSuggestionId,
  mergeSuggestionLists,
  normalizeSuggestionCategory,
  parseResumeContent,
  refreshSkillAnalysisFromContent,
  sanitizeExtractedText,
  serializeResumeDraft,
  skillsFromSuggestion,
  type LiveSkillAnalysis,
  type ResumeDraft,
  type ResumeSectionId,
  type ResumeTemplateId,
} from '../../utils';

import { TemplateOption, TemplatePicker } from './editor.styles';
import { ResumeTemplatePreview } from './ResumeTemplatePreview';
import { SectionEditor } from './SectionEditor';
import {
  ActionBar,
  AiBanner,
  DiffBlock,
  EditorCard,
  EditorFooterBar,
  EmptyHint,
  ImpactPill,
  OptimizeHeader,
  OptimizeLayout,
  OptimizeMain,
  OptimizeShell,
  PreviewPanel,
  ScoreStrip,
  SectionNav,
  SectionNavButton,
  SuggestionCard,
  SuggestionList,
  SuggestionMeta,
  SuggestionReason,
} from './styles';

interface OptimizeStepProps {
  analysis: AnalysisResult | null;
  applyingId: number | null;
  editedContent: string;
  jobDescription?: string;
  preferredSkills?: string[];
  saving: boolean;
  suggestions: SuggestionItem[];
  targetRole: string;
  template: ResumeTemplateId;
  onApplySuggestion: (id: number, content?: string) => void;
  onApplyAllSuggestions: (ids: number[], content: string) => void;
  onIgnoreSuggestion: (id: number) => void;
  onEditedContentChange: (value: string) => void;
  /** Keep parent analysis.atsScore in sync with the live Optimize estimate. */
  onLiveAtsChange?: (score: number, skillAnalysis?: LiveSkillAnalysis) => void;
  onExportStep: () => void;
  onSaveContent: () => void;
  onTemplateChange: (template: ResumeTemplateId) => void;
}

export function OptimizeStep({
  analysis,
  applyingId,
  editedContent,
  jobDescription = '',
  preferredSkills = [],
  saving,
  suggestions,
  targetRole,
  template,
  onApplySuggestion,
  onApplyAllSuggestions,
  onIgnoreSuggestion,
  onEditedContentChange,
  onLiveAtsChange,
  onExportStep,
  onSaveContent,
  onTemplateChange,
}: OptimizeStepProps) {
  void saving;
  void onSaveContent;
  const { showToast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const lastParseKey = useRef<string>('');
  const [activeSection, setActiveSection] = useState<ResumeSectionId>('summary');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ResumeDraft>(() =>
    parseResumeContent(
      editedContent || analysis?.editedContent || '',
      targetRole || analysis?.targetRole || '',
    ),
  );
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const [localOverrides, setLocalOverrides] = useState<SuggestionItem[]>([]);
  const skillBundleServerIdsRef = useRef<number[]>([]);

  const handlePrint = () => {
    const node = previewRef.current;
    if (!node) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`<!doctype html><html><head><title>${
      draft.fullName || 'Resume'
    }</title>
      <style>
        body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #fff; }
        * { box-sizing: border-box; }
      </style>
      </head><body>${node.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Re-parse once per analysis into the app's structured default draft.
  useEffect(() => {
    const source = analysis?.editedContent || editedContent;
    if (!source) return;
    const parseKey =
      analysis?.id != null
        ? `analysis:${analysis.id}:${analysis.resumeId}:v12`
        : `local:${source.slice(0, 96)}:${source.length}`;
    if (lastParseKey.current === parseKey) return;
    lastParseKey.current = parseKey;
    const parsed = parseResumeContent(source, targetRole || analysis?.targetRole || '');
    const aligned = alignDraftToJob(parsed, {
      preferredSkills,
      jobDescription,
      matchedSkills: analysis?.skillAnalysis?.matchedSkills,
      recommendedSkills: [
        ...(analysis?.skillAnalysis?.recommendedSkills ?? []),
        ...(analysis?.skillAnalysis?.missingSkills ?? []),
      ],
      optimizedSummary: analysis?.optimizedSummary,
      targetRole: targetRole || analysis?.targetRole || '',
    });
    // Fresh upload/analysis: trust the new parse. Do not merge stale previous sections.
    draftRef.current = aligned;
    setDraft(aligned);
    const serialized = serializeResumeDraft(aligned);
    if (serialized) onEditedContentChange(serialized);
    // Intentionally omit editedContent / preferredSkills — user edits merge via separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id, analysis?.resumeId, analysis?.editedContent]);

  // Merge Define-Role preferred skills into the live draft without re-parsing.
  // Do NOT depend on skillAnalysis — recheck after Apply must not reshuffle suggestions/skills.
  useEffect(() => {
    if (!preferredSkills.length) return;
    setDraft((current) =>
      alignDraftToJob(current, {
        preferredSkills,
        jobDescription,
        targetRole: targetRole || analysis?.targetRole || '',
      }),
    );
  }, [preferredSkills, jobDescription, targetRole, analysis?.targetRole]);

  // One-pass OCR glyph cleanup (Σ/Θ etc.) so preview text is readable.
  const ocrCleaned = useRef(false);
  useEffect(() => {
    if (ocrCleaned.current) return;
    ocrCleaned.current = true;
    setDraft((current) => {
      const cleanEntry = <T extends { details: string; title: string; company: string }>(
        entry: T,
      ): T => ({
        ...entry,
        title: sanitizeExtractedText(entry.title),
        company: sanitizeExtractedText(entry.company),
        details: sanitizeExtractedText(entry.details),
      });
      return {
        ...current,
        summary: sanitizeExtractedText(current.summary),
        education: sanitizeExtractedText(current.education),
        certifications: sanitizeExtractedText(current.certifications),
        achievements: sanitizeExtractedText(current.achievements),
        experiences: current.experiences.map(cleanEntry),
        projectsList: current.projectsList.map(cleanEntry),
        customFields: current.customFields.map((field) => ({
          ...field,
          label: sanitizeExtractedText(field.label),
          value: sanitizeExtractedText(field.value),
        })),
      };
    });
  }, []);

  // Auto-apply only clear OCR/spelling typos — not generic "wording/improve" suggestions.
  const autoAppliedSpelling = useRef(false);
  useEffect(() => {
    if (!analysis?.id || autoAppliedSpelling.current) return;
    const spellingFixes = suggestions.filter(
      (item) =>
        item.status === 'PENDING' &&
        /ocr|typo|mistype|misspell|spelling\s+error|glyph|encoding/i.test(
          `${item.title} ${item.reason ?? ''}`,
        ) &&
        !/skill|keyword|summary|experience|project|ats/i.test(item.category),
    );
    if (spellingFixes.length === 0) return;
    autoAppliedSpelling.current = true;

    setDraft((current) => {
      let next = current;
      for (const suggestion of spellingFixes) {
        const sectionId = normalizeSuggestionCategory(suggestion.category);
        next = {
          ...applyTextReplaceToDraft(
            next,
            sectionId,
            suggestion.originalText,
            suggestion.suggestedText,
          ),
          role: targetRole || analysis?.targetRole || next.role || '',
          originalText: next.originalText,
        };
      }
      draftRef.current = next;
      const serialized = serializeResumeDraft(next);
      if (serialized) onEditedContentChange(serialized);
      const serverIds = spellingFixes
        .map((suggestion) => suggestion.id)
        .filter((id) => !isLocalSuggestionId(id));
      if (serverIds.length > 0) {
        onApplyAllSuggestions(serverIds, serialized);
      }
      return next;
    });

    const localSpelling = spellingFixes.filter((item) => isLocalSuggestionId(item.id));
    if (localSpelling.length > 0) {
      setLocalOverrides((prev) => {
        const overrideIds = new Set(localSpelling.map((item) => item.id));
        const rest = prev.filter((item) => !overrideIds.has(item.id));
        return [...rest, ...localSpelling.map((item) => ({ ...item, status: 'APPLIED' as const }))];
      });
    }
  }, [
    analysis?.id,
    analysis?.targetRole,
    onApplyAllSuggestions,
    onEditedContentChange,
    suggestions,
    targetRole,
  ]);

  useEffect(() => {
    const serialized = serializeResumeDraft(draft);
    if (serialized && serialized !== editedContent) {
      onEditedContentChange(serialized);
    }
  }, [draft, editedContent, onEditedContentChange]);

  const fallbackKey = String(analysis?.id ?? 'none');
  const frozenFallbacks = useMemo(() => {
    if (!analysis) return [] as SuggestionItem[];
    return buildFallbackSuggestions({ analysis, draft: draftRef.current });
    // Intentionally freeze on analysis id only — Apply/recheck must not reshuffle cards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackKey]);

  const effectiveSuggestions = useMemo(() => {
    const merged = mergeSuggestionLists(suggestions, frozenFallbacks);
    const withOverrides =
      localOverrides.length === 0
        ? merged
        : (() => {
            const overrideIds = new Set(localOverrides.map((item) => item.id));
            return [...localOverrides, ...merged.filter((item) => !overrideIds.has(item.id))];
          })();

    const haveSkills = new Set(draft.skillsList.map((skill) => skill.toLowerCase()));
    const marked = withOverrides.map((item) => {
      if (normalizeSuggestionCategory(item.category) !== 'skills') return item;
      if (item.status !== 'PENDING') return item;
      const skills = skillsFromSuggestion(item);
      if (skills.length > 0 && skills.every((skill) => haveSkills.has(skill.toLowerCase()))) {
        return { ...item, status: 'APPLIED' as const };
      }
      return item;
    });

    // One Skills card for all missing skills (API + fallback), not one card per skill.
    const consolidated = consolidatePendingSkillSuggestions(marked);
    skillBundleServerIdsRef.current = consolidated.bundledServerIds;
    return consolidated.items;
  }, [draft.skillsList, frozenFallbacks, localOverrides, suggestions]);

  const pendingSuggestions = useMemo(
    () => effectiveSuggestions.filter((item) => item.status === 'PENDING'),
    [effectiveSuggestions],
  );

  const suggestionsBySection = useMemo(() => {
    const map = Object.fromEntries(
      RESUME_SECTIONS.map((section) => [section.id, [] as SuggestionItem[]]),
    ) as Record<ResumeSectionId, SuggestionItem[]>;

    pendingSuggestions.forEach((suggestion) => {
      const sectionId = normalizeSuggestionCategory(suggestion.category);
      if (sectionId === 'other') {
        map.summary.push(suggestion);
        return;
      }
      map[sectionId].push(suggestion);
    });

    return map;
  }, [pendingSuggestions]);

  const sectionSuggestions = suggestionsBySection[activeSection];
  const selectedSuggestion =
    sectionSuggestions.find((item) => item.id === selectedSuggestionId) ??
    sectionSuggestions[0] ??
    null;

  useEffect(() => {
    setSelectedSuggestionId(sectionSuggestions[0]?.id ?? null);
  }, [activeSection, sectionSuggestions]);

  const currentScore = analysis?.baselineAtsScore ?? analysis?.atsScore ?? 0;
  const pendingCount = pendingSuggestions.length;
  const appliedSuggestions = effectiveSuggestions.filter((item) => item.status === 'APPLIED');
  const appliedCount = appliedSuggestions.length;
  const highAppliedCount = appliedSuggestions.filter((item) => /high/i.test(item.impact)).length;
  const draftContent = serializeResumeDraft(draft) || editedContent;
  const liveSkillAnalysis = useMemo(
    () => refreshSkillAnalysisFromContent(draftContent, analysis?.skillAnalysis),
    [analysis?.skillAnalysis, draftContent],
  );
  const missingKeywords =
    analysis?.keywords?.filter((item) => item.status === 'MISSING').map((item) => item.term) ?? [];
  const estimatedScore = estimateImprovedAtsScore({
    baseline: currentScore,
    content: draftContent,
    // Only the original gap pool — recovered items already in content raise the estimate.
    missingSkills: [
      ...(analysis?.skillAnalysis?.missingSkills ?? []),
      ...(analysis?.skillAnalysis?.recommendedSkills ?? []),
    ],
    matchedSkills: analysis?.skillAnalysis?.matchedSkills ?? liveSkillAnalysis.matchedSkills,
    missingKeywords,
    appliedCount,
    highAppliedCount,
  });
  // Prefer server recheck score when it exceeds the local estimate (after Apply).
  const improvedScore = Math.max(estimatedScore, analysis?.atsScore ?? 0);
  const scoreDelta = Math.max(0, improvedScore - currentScore);
  const activeMeta = RESUME_SECTIONS.find((section) => section.id === activeSection);
  const isSentenceSection = activeSection === 'experience' || activeSection === 'projects';
  const applyingAll = applyingId === -1;

  // Keep parent analysis + Export page on the same improved ATS the strip shows.
  const liveSkillsKey = `${liveSkillAnalysis.matchedSkills.join('\0')}::${liveSkillAnalysis.missingSkills.join('\0')}`;
  useEffect(() => {
    if (!onLiveAtsChange) return;
    onLiveAtsChange(improvedScore, liveSkillAnalysis);
    // liveSkillAnalysis identity changes often; key tracks real skill moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed
  }, [improvedScore, liveSkillsKey, onLiveAtsChange]);

  const pushDraftToParent = (next: ResumeDraft) => {
    const serialized = serializeResumeDraft(next) || editedContent || analysis?.editedContent || '';
    draftRef.current = next;
    setDraft(next);
    if (serialized) onEditedContentChange(serialized);
    return serialized;
  };

  const commitAppliedDraft = (next: ResumeDraft) => {
    return pushDraftToParent(next);
  };

  const markLocalApplied = (suggestion: SuggestionItem) => {
    setLocalOverrides((prev) => {
      const rest = prev.filter((item) => item.id !== suggestion.id);
      return [...rest, { ...suggestion, status: 'APPLIED' }];
    });
  };

  const applySuggestion = (suggestion: SuggestionItem) => {
    const sectionId = normalizeSuggestionCategory(suggestion.category);
    const current = draftRef.current;

    if (sectionId === 'skills') {
      const skills = skillsFromSuggestion(suggestion);
      const have = new Set(current.skillsList.map((item) => item.toLowerCase()));
      const missing = skills.filter((skill) => !have.has(skill.toLowerCase()));
      if (skills.length === 0 || missing.length === 0) {
        markLocalApplied(suggestion);
        const bundleIds = skillBundleServerIdsRef.current;
        if (bundleIds.length > 0) {
          onApplyAllSuggestions(bundleIds, serializeResumeDraft(current) || editedContent);
        } else if (!isLocalSuggestionId(suggestion.id)) {
          onApplySuggestion(suggestion.id, serializeResumeDraft(current) || editedContent);
        }
        setSelectedSuggestionId(null);
        return;
      }
    }

    const next = {
      ...applyTextReplaceToDraft(
        current,
        sectionId,
        sectionId === 'skills' ? '' : suggestion.originalText,
        sectionId === 'skills'
          ? skillsFromSuggestion(suggestion).join(', ')
          : suggestion.suggestedText,
      ),
      role: targetRole || analysis?.targetRole || current.role || '',
      originalText: current.originalText,
    };
    const serialized = commitAppliedDraft(next);
    setSelectedSuggestionId(null);

    if (sectionId === 'skills') {
      markLocalApplied(suggestion);
      const bundleIds = skillBundleServerIdsRef.current;
      if (bundleIds.length > 1 && serialized) {
        onApplyAllSuggestions(bundleIds, serialized);
        return;
      }
      if (bundleIds.length === 1 && serialized) {
        onApplySuggestion(bundleIds[0]!, serialized);
        return;
      }
      if (isLocalSuggestionId(suggestion.id)) {
        if (serialized) onApplyAllSuggestions([], serialized);
        else {
          showToast({
            message: 'Improvement applied successfully',
            severity: 'success',
          });
        }
        return;
      }
      onApplySuggestion(suggestion.id, serialized);
      return;
    }

    if (isLocalSuggestionId(suggestion.id)) {
      markLocalApplied(suggestion);
      // Persist + recheck so ATS / skill match refresh without a server suggestion id.
      if (serialized) onApplyAllSuggestions([], serialized);
      else {
        showToast({
          message: 'Improvement applied successfully',
          severity: 'success',
        });
      }
      return;
    }

    onApplySuggestion(suggestion.id, serialized);
  };

  const applyAllSuggestions = () => {
    if (pendingSuggestions.length === 0 || applyingAll) return;

    let next = draftRef.current;
    const appliedLocals: SuggestionItem[] = [];
    const serverIds: number[] = [];

    for (const suggestion of pendingSuggestions) {
      const sectionId = normalizeSuggestionCategory(suggestion.category);

      if (sectionId === 'skills') {
        const skills = skillsFromSuggestion(suggestion);
        const have = new Set(next.skillsList.map((item) => item.toLowerCase()));
        const missing = skills.filter((skill) => !have.has(skill.toLowerCase()));
        if (skills.length === 0 || missing.length === 0) {
          if (isLocalSuggestionId(suggestion.id)) appliedLocals.push(suggestion);
          else serverIds.push(suggestion.id);
          continue;
        }
        next = {
          ...applyTextReplaceToDraft(next, 'skills', '', missing.join(', ')),
          role: targetRole || analysis?.targetRole || next.role || '',
          originalText: next.originalText,
        };
      } else {
        next = {
          ...applyTextReplaceToDraft(
            next,
            sectionId,
            suggestion.originalText,
            suggestion.suggestedText,
          ),
          role: targetRole || analysis?.targetRole || next.role || '',
          originalText: next.originalText,
        };
      }

      if (isLocalSuggestionId(suggestion.id)) appliedLocals.push(suggestion);
      else serverIds.push(suggestion.id);
    }

    const serialized = commitAppliedDraft(next);
    setSelectedSuggestionId(null);

    if (appliedLocals.length > 0) {
      setLocalOverrides((prev) => {
        const overrideIds = new Set(appliedLocals.map((item) => item.id));
        const rest = prev.filter((item) => !overrideIds.has(item.id));
        return [...rest, ...appliedLocals.map((item) => ({ ...item, status: 'APPLIED' as const }))];
      });
    }

    const bundleIds = skillBundleServerIdsRef.current;
    const allServerIds = Array.from(new Set([...serverIds, ...bundleIds]));

    if (allServerIds.length > 0 && serialized) {
      onApplyAllSuggestions(allServerIds, serialized);
    } else if (serialized && appliedLocals.length > 0) {
      onApplyAllSuggestions([], serialized);
    }
  };

  return (
    <OptimizeShell>
      <OptimizeMain>
        <OptimizeHeader>
          <Typography className="title" component="h2">
            Step 4: Optimize Your Resume
          </Typography>
          <Typography className="subtitle">
            Edit fields on the left. Live preview always uses our structured default layout —
            experience, projects, skills and other sections parsed from your upload. Switch themes
            only if you want a different look.
          </Typography>
        </OptimizeHeader>

        {pendingCount > 0 ? (
          <AiBanner>
            <Box className="icon">
              <LightbulbOutlinedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography className="title">
                {pendingCount} AI improvement{pendingCount === 1 ? '' : 's'} ready
              </Typography>
              <Typography className="text">
                Apply every pending fix in one click, or review cards one by one.
              </Typography>
              <Box className="actions">
                {RESUME_SECTIONS.filter(
                  (section) => suggestionsBySection[section.id].length > 0,
                ).map((section) => (
                  <Button
                    key={section.id}
                    size="small"
                    variant={activeSection === section.id ? 'solid' : 'outline'}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {section.label} ({suggestionsBySection[section.id].length})
                  </Button>
                ))}
                <Button
                  size="small"
                  startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                  isLoading={applyingAll}
                  disabled={applyingId != null && !applyingAll}
                  onClick={applyAllSuggestions}
                >
                  Apply All Fixes
                </Button>
                {pendingSuggestions[0] ? (
                  <Button
                    size="small"
                    variant="outline"
                    startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                    disabled={applyingId != null}
                    onClick={() => {
                      const first = pendingSuggestions[0]!;
                      const sectionId = normalizeSuggestionCategory(first.category);
                      if (sectionId !== 'other') setActiveSection(sectionId);
                      setSelectedSuggestionId(first.id);
                      applySuggestion(first);
                    }}
                  >
                    Apply next fix
                  </Button>
                ) : null}
              </Box>
            </Box>
          </AiBanner>
        ) : (
          <AiBanner>
            <Box className="icon">
              <LightbulbOutlinedIcon />
            </Box>
            <Box>
              <Typography className="title">No pending AI suggestions</Typography>
              <Typography className="text">
                Edit sections manually below. If analysis just finished, reopen Review to reload
                suggestions from the API.
              </Typography>
            </Box>
          </AiBanner>
        )}

        <OptimizeLayout>
          <SectionNav>
            <Typography className="nav-title">Sections</Typography>
            {RESUME_SECTIONS.map((section) => {
              const count = suggestionsBySection[section.id].length;
              return (
                <SectionNavButton
                  key={section.id}
                  active={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <span>{section.label}</span>
                  {count > 0 && <span className="count">{count}</span>}
                </SectionNavButton>
              );
            })}
          </SectionNav>

          <EditorCard>
            <Box className="section-title-row">
              <Box>
                <Typography className="section-title">{activeMeta?.label}</Typography>
                <Typography className="section-tip">{activeMeta?.tip}</Typography>
              </Box>
              {selectedSuggestion && selectedSuggestion.status === 'PENDING' && (
                <Button
                  size="small"
                  startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
                  variant="outline"
                  onClick={() => applySuggestion(selectedSuggestion)}
                  isLoading={applyingId === selectedSuggestion.id}
                >
                  Apply AI Fix
                </Button>
              )}
            </Box>

            <SuggestionList>
              {sectionSuggestions.length === 0 ? (
                <EmptyHint>
                  {pendingCount > 0 ? (
                    <Box component="span">
                      No fixes in this section. Jump to{' '}
                      {RESUME_SECTIONS.filter((s) => suggestionsBySection[s.id].length > 0).map(
                        (section) => (
                          <Button
                            key={section.id}
                            size="small"
                            variant="outline"
                            onClick={() => setActiveSection(section.id)}
                            sx={{ mx: 0.5, my: 0.25 }}
                          >
                            {section.label} ({suggestionsBySection[section.id].length})
                          </Button>
                        ),
                      )}
                    </Box>
                  ) : isSentenceSection ? (
                    'No sentence improvements pending. Add/edit companies or projects below.'
                  ) : (
                    'No pending AI suggestions. Edit fields below or continue.'
                  )}
                </EmptyHint>
              ) : (
                sectionSuggestions.map((suggestion) => {
                  const skillLabels =
                    normalizeSuggestionCategory(suggestion.category) === 'skills'
                      ? skillsFromSuggestion(suggestion)
                      : [];
                  const skillLabel = skillLabels.join(', ');
                  const alreadyAdded =
                    skillLabels.length > 0 &&
                    skillLabels.every((skill) =>
                      draft.skillsList.some((item) => item.toLowerCase() === skill.toLowerCase()),
                    );

                  return (
                    <SuggestionCard
                      key={suggestion.id}
                      selected={selectedSuggestion?.id === suggestion.id}
                      onClick={() => setSelectedSuggestionId(suggestion.id)}
                    >
                      <SuggestionMeta>
                        <Typography className="title">
                          {isSentenceSection
                            ? suggestion.title || 'Sentence improvement'
                            : suggestion.title}
                        </Typography>
                        <ImpactPill impact={suggestion.impact}>
                          {suggestion.impact} IMPACT
                        </ImpactPill>
                      </SuggestionMeta>

                      {suggestion.reason ? (
                        <SuggestionReason>{suggestion.reason}</SuggestionReason>
                      ) : null}

                      <DiffBlock>
                        <Box className="pane before">
                          <Typography className="label">
                            {isSentenceSection ? 'Current sentence' : 'Before'}
                          </Typography>
                          <Typography className="body">
                            {normalizeSuggestionCategory(suggestion.category) === 'skills'
                              ? draft.skillsList.join(', ') || 'No skills yet'
                              : suggestion.originalText ||
                                getSectionText(draft, activeSection) ||
                                'No excerpt available'}
                          </Typography>
                        </Box>
                        <Box className="pane after">
                          <Typography className="label">
                            {isSentenceSection
                              ? 'Improved sentence'
                              : normalizeSuggestionCategory(suggestion.category) === 'skills'
                                ? 'Skill to add'
                                : 'After (AI)'}
                          </Typography>
                          <Typography className="body">
                            {normalizeSuggestionCategory(suggestion.category) === 'skills'
                              ? skillLabel || suggestion.suggestedText
                              : suggestion.suggestedText}
                          </Typography>
                        </Box>
                      </DiffBlock>

                      <ActionBar>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isLocalSuggestionId(suggestion.id)) {
                              setLocalOverrides((prev) => {
                                const rest = prev.filter((item) => item.id !== suggestion.id);
                                return [...rest, { ...suggestion, status: 'IGNORED' }];
                              });
                              return;
                            }
                            onIgnoreSuggestion(suggestion.id);
                          }}
                        >
                          Ignore
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedSuggestionId(suggestion.id);
                          }}
                        >
                          Edit Manually
                        </Button>
                        <Button
                          size="small"
                          tone="success"
                          disabled={alreadyAdded}
                          isLoading={applyingId === suggestion.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (alreadyAdded) return;
                            applySuggestion(suggestion);
                          }}
                        >
                          {alreadyAdded ? 'Already Added' : 'Apply Fix'}
                        </Button>
                      </ActionBar>
                    </SuggestionCard>
                  );
                })
              )}
            </SuggestionList>

            <SectionEditor
              section={activeSection}
              draft={draft}
              recommendedSkills={liveSkillAnalysis.missingSkills}
              onChange={pushDraftToParent}
            />

            <EditorFooterBar>
              <Box
                sx={{
                  alignItems: 'flex-start',
                  display: 'flex',
                  gap: 1,
                  minWidth: 0,
                  width: '100%',
                }}
              >
                <LightbulbOutlinedIcon
                  fontSize="small"
                  color="primary"
                  sx={{ flexShrink: 0, mt: 0.25 }}
                />
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    lineHeight: 1.45,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  Uploaded resume is parsed into Summary, Experience, Skills, Projects, and more.
                </Typography>
              </Box>
            </EditorFooterBar>
          </EditorCard>
        </OptimizeLayout>

        <ScoreStrip>
          <Box>
            <Typography className="label">Current ATS Score</Typography>
            <Typography className="current">{currentScore}/100</Typography>
          </Box>
          <NavigateNextIcon color="primary" />
          <Box>
            <Typography className="label">Resume / ATS after edits</Typography>
            <Typography className="improved">{improvedScore}/100</Typography>
          </Box>
          <Box className="badge" component="span">
            {scoreDelta > 0 ? `+${scoreDelta} est.` : 'Apply fixes'} · {pendingCount} open ·{' '}
            {appliedCount} applied
            {liveSkillAnalysis.missingSkills.length === 0 && appliedCount > 0
              ? ' · skills synced'
              : ''}
          </Box>
        </ScoreStrip>

        <AiBanner>
          <Box className="icon">
            <AutoAwesomeOutlinedIcon />
          </Box>
          <Box>
            <Typography className="title">Ready for the final ATS boost?</Typography>
            <Typography className="text">
              Continue to Export to run a real ATS recheck. The estimate above updates as you apply
              JD skills and suggestions.
            </Typography>
          </Box>
          <Button
            startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
            onClick={() => {
              // Flush latest editor draft so Export recheck uses the improved resume.
              pushDraftToParent(draftRef.current);
              onExportStep();
            }}
          >
            Continue to Export
          </Button>
        </AiBanner>
      </OptimizeMain>

      <PreviewPanel>
        <Box className="preview-header">
          <Box>
            <Typography className="preview-title">Live Resume Preview</Typography>
            <Typography className="preview-meta">
              {template === 'original'
                ? 'Default template (your resume content)'
                : `Theme: ${RESUME_TEMPLATES.find((item) => item.id === template)?.label}`}
            </Typography>
          </Box>
          <Button size="small" variant="outline" onClick={handlePrint}>
            Print preview
          </Button>
        </Box>

        <TemplatePicker>
          {RESUME_TEMPLATES.map((item) => (
            <TemplateOption
              key={item.id}
              type="button"
              active={template === item.id}
              onClick={() => onTemplateChange(item.id)}
            >
              <span className="label">{item.label}</span>
              <span className="desc">{item.description}</span>
            </TemplateOption>
          ))}
        </TemplatePicker>

        <ResumeTemplatePreview
          ref={previewRef}
          draft={draft}
          template={template}
          targetRole={targetRole || analysis?.targetRole || ''}
        />
      </PreviewPanel>
    </OptimizeShell>
  );
}
