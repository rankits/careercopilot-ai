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
  estimateImprovedAtsScore,
  getSectionText,
  isLocalSuggestionId,
  mergeSuggestionLists,
  normalizeSuggestionCategory,
  parseResumeContent,
  refreshSkillAnalysisFromContent,
  sanitizeExtractedText,
  serializeResumeDraft,
  skillFromSuggestion,
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
  onExportStep,
  onSaveContent,
  onTemplateChange,
}: OptimizeStepProps) {
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

  // Re-parse once per analysis for clean professional structure (do not re-wipe user edits).
  useEffect(() => {
    const source = analysis?.editedContent || editedContent;
    if (!source) return;
    const parseKey =
      analysis?.id != null ? `analysis:${analysis.id}:v10` : `local:${source.slice(0, 64)}`;
    if (lastParseKey.current === parseKey) return;
    lastParseKey.current = parseKey;
    const parsed = parseResumeContent(source, targetRole || analysis?.targetRole || '');
    setDraft((previous) => {
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
      // Never blank identity / experience if AI text omitted the name or sections.
      return {
        ...aligned,
        fullName: aligned.fullName || previous.fullName,
        email: aligned.email || previous.email,
        phone: aligned.phone || previous.phone,
        location: aligned.location || previous.location,
        linkedin: aligned.linkedin || previous.linkedin,
        experiences: aligned.experiences.some((item) => item.company || item.title || item.details)
          ? aligned.experiences
          : previous.experiences,
        projectsList: aligned.projectsList.some((item) => item.title || item.details)
          ? aligned.projectsList
          : previous.projectsList,
        education: aligned.education || previous.education,
        certifications: aligned.certifications || previous.certifications,
        achievements: aligned.achievements || previous.achievements,
        skillsList: aligned.skillsList.length > 0 ? aligned.skillsList : previous.skillsList,
        summary: aligned.summary || previous.summary,
        originalText: aligned.originalText || previous.originalText || source,
      };
    });
    // Intentionally omit editedContent / preferredSkills — user edits merge via separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id, analysis?.editedContent]);

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
    return withOverrides.map((item) => {
      if (normalizeSuggestionCategory(item.category) !== 'skills') return item;
      if (item.status !== 'PENDING') return item;
      const skill = skillFromSuggestion(item);
      if (skill && haveSkills.has(skill.toLowerCase())) {
        return { ...item, status: 'APPLIED' as const };
      }
      return item;
    });
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

  const commitAppliedDraft = (next: ResumeDraft) => {
    const serialized = serializeResumeDraft(next) || editedContent || analysis?.editedContent || '';
    draftRef.current = next;
    setDraft(next);
    if (serialized) onEditedContentChange(serialized);
    return serialized;
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
      const skill = skillFromSuggestion(suggestion);
      const alreadyHave = current.skillsList.some(
        (item) => item.toLowerCase() === skill.toLowerCase(),
      );
      if (alreadyHave || !skill) {
        markLocalApplied(suggestion);
        if (!isLocalSuggestionId(suggestion.id)) {
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
        sectionId === 'skills' ? skillFromSuggestion(suggestion) : suggestion.suggestedText,
      ),
      role: targetRole || analysis?.targetRole || current.role || '',
      originalText: current.originalText,
    };
    const serialized = commitAppliedDraft(next);

    if (isLocalSuggestionId(suggestion.id)) {
      markLocalApplied(suggestion);
      setSelectedSuggestionId(null);
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
    setSelectedSuggestionId(null);
  };

  const applyAllSuggestions = () => {
    if (pendingSuggestions.length === 0 || applyingAll) return;

    let next = draftRef.current;
    const appliedLocals: SuggestionItem[] = [];
    const serverIds: number[] = [];

    for (const suggestion of pendingSuggestions) {
      const sectionId = normalizeSuggestionCategory(suggestion.category);

      if (sectionId === 'skills') {
        const skill = skillFromSuggestion(suggestion);
        if (!skill || next.skillsList.some((item) => item.toLowerCase() === skill.toLowerCase())) {
          if (isLocalSuggestionId(suggestion.id)) appliedLocals.push(suggestion);
          else serverIds.push(suggestion.id);
          continue;
        }
        next = {
          ...applyTextReplaceToDraft(next, 'skills', '', skill),
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

    if (serverIds.length > 0 && serialized) {
      onApplyAllSuggestions(serverIds, serialized);
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
            Edit fields on the left. Live preview keeps your uploaded resume design by default —
            switch themes only if you want a new look. Open Skills to add AI JD suggestions (e.g.
            Java).
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
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
                  const skillLabel =
                    normalizeSuggestionCategory(suggestion.category) === 'skills'
                      ? skillFromSuggestion(suggestion)
                      : '';
                  const alreadyAdded =
                    Boolean(skillLabel) &&
                    draft.skillsList.some(
                      (item) => item.toLowerCase() === skillLabel.toLowerCase(),
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
                              ? skillFromSuggestion(suggestion)
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
              onChange={setDraft}
            />

            <ActionBar>
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <LightbulbOutlinedIcon fontSize="small" color="primary" />
                <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Uploaded = original text. Other themes = styled layouts of your edits.
                </Typography>
              </Box>
              <Button isLoading={saving} onClick={onSaveContent}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </ActionBar>
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
          <Button startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />} onClick={onExportStep}>
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
                ? 'Showing your uploaded resume text'
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
