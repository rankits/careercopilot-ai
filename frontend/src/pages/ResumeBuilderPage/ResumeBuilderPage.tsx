import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { ROUTES } from '@/constants/routes';
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@/lib/material';
import type { SuggestionItem } from '@/services/resumeBuilder.service';

import { PageHeader } from './components/PageHeader';
import { ResumeBuilderStepPanels } from './components/ResumeBuilderStepPanels';
import { WorkflowStepper } from './components/WorkflowStepper';
import type { ResumeBuilderStep as Step } from './constants';
import {
  useResumeAnalysisPolling,
  useResumeBuilderActions,
  useResumeBuilderDraft,
  useResumeBuilderNavigation,
} from './hooks';
import { Root, StickyChrome } from './styles';
import type { ResumeTemplateId } from './utils';

export function ResumeBuilderPage() {
  const { resumeId: paramResumeId } = useParams<{ resumeId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [resumeId, setResumeId] = useState<string>(paramResumeId ?? '');
  const [step, setStep] = useState<Step>(paramResumeId ? 2 : 1);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>('original');

  const draft = useResumeBuilderDraft(resumeId);

  const polling = useResumeAnalysisPolling({
    resumeId,
    step,
    setStep,
    targetRole: draft.targetRole,
    jobDescription: draft.jobDescription,
    industry: draft.industry,
    employmentType: draft.employmentType,
    experienceLevel: draft.experienceLevel,
    skills: draft.skills,
    suggestions,
    setSuggestions,
    showToast,
    editedContentRef: draft.editedContentRef,
    setTargetRole: draft.setTargetRole,
    setJobDescription: draft.setJobDescription,
    setIndustry: draft.setIndustry,
    setEmploymentType: draft.setEmploymentType,
    setExperienceLevel: draft.setExperienceLevel,
    setSkills: draft.setSkills,
    setEditedContent: draft.setEditedContent,
    setCleanSnapshot: draft.setCleanSnapshot,
  });

  const actions = useResumeBuilderActions({
    resumeId,
    setResumeId,
    step,
    setStep,
    navigate,
    showToast,
    analysis: polling.analysis,
    setAnalysis: polling.setAnalysis,
    originalAnalysis: polling.originalAnalysis,
    setOriginalAnalysis: polling.setOriginalAnalysis,
    analyzedFingerprintRef: polling.analyzedFingerprintRef,
    pollTimerRef: polling.pollTimerRef,
    setKeywords: polling.setKeywords,
    setSuggestions,
    targetRole: draft.targetRole,
    setTargetRole: draft.setTargetRole,
    industry: draft.industry,
    setIndustry: draft.setIndustry,
    experienceLevel: draft.experienceLevel,
    setExperienceLevel: draft.setExperienceLevel,
    employmentType: draft.employmentType,
    setEmploymentType: draft.setEmploymentType,
    skills: draft.skills,
    setSkills: draft.setSkills,
    jobDescription: draft.jobDescription,
    setJobDescription: draft.setJobDescription,
    editedContent: draft.editedContent,
    setEditedContent: draft.setEditedContent,
    editedContentRef: draft.editedContentRef,
    setCleanSnapshot: draft.setCleanSnapshot,
    markSnapshotClean: draft.markSnapshotClean,
    allowLeaveRef: draft.allowLeaveRef,
    discardDefineRoleDraft: draft.discardDefineRoleDraft,
    selectedTemplate,
    setSelectedTemplate,
    hydrateFromExistingAnalysis: polling.hydrateFromExistingAnalysis,
  });

  const navigation = useResumeBuilderNavigation({
    paramResumeId,
    resumeId,
    analysis: polling.analysis,
    targetRole: draft.targetRole,
    jobDescription: draft.jobDescription,
    discardDefineRoleDraft: draft.discardDefineRoleDraft,
    onStartAnalysis: actions.handleStartAnalysis,
    step,
    setStep,
  });

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
          canContinue={navigation.canContinue}
          current={step}
          onBack={step > 1 && step !== 10 ? navigation.handleHeaderBack : undefined}
          onNext={navigation.handleHeaderNext}
        />
        <WorkflowStepper current={step} />
      </StickyChrome>
      <ResumeBuilderStepPanels
        step={step}
        existingResumes={actions.existingResumes}
        selectedResume={actions.selectedResume}
        isDragging={actions.isDragging}
        uploadError={actions.uploadError}
        uploading={actions.uploading}
        deletingResumeId={actions.deletingResumeId}
        fileInputRef={actions.fileInputRef}
        targetRole={draft.targetRole}
        industry={draft.industry}
        experienceLevel={draft.experienceLevel}
        employmentType={draft.employmentType}
        skills={draft.skills}
        jobDescription={draft.jobDescription}
        startingAnalysis={actions.startingAnalysis}
        analysis={polling.analysis}
        originalAnalysis={polling.originalAnalysis}
        keywords={polling.keywords}
        suggestions={suggestions}
        applyingId={actions.applyingId}
        editedContent={draft.editedContent}
        saving={actions.saving}
        recheckResult={actions.recheckResult}
        optimizedAtsScore={actions.liveAtsScore}
        rechecking={actions.rechecking}
        exportingFormat={actions.exportingFormat}
        versions={actions.versions}
        savingVersion={actions.savingVersion}
        selectedTemplate={selectedTemplate}
        onDragStateChange={actions.setIsDragging}
        onDrop={actions.handleDrop}
        onFileSelect={(file) => void actions.handleFileSelect(file)}
        onUseResume={actions.handleUseResume}
        onDeleteResume={(resume) => void actions.handleDeleteResume(resume)}
        onShowMoreResumes={() => {
          void navigate(ROUTES.SAVED_RESUMES);
        }}
        onTargetRoleChange={draft.setTargetRole}
        onIndustryChange={draft.setIndustry}
        onExperienceLevelChange={draft.setExperienceLevel}
        onEmploymentTypeChange={draft.setEmploymentType}
        onSkillsChange={draft.setSkills}
        onJobDescriptionChange={draft.setJobDescription}
        onStartAnalysis={() => void actions.handleStartAnalysis()}
        onBackFromDefineRole={navigation.goBackToUpload}
        onReplaceResume={actions.handleReplaceResume}
        onGoTo={navigation.goTo}
        onApplySuggestion={(id, content) => void actions.handleApplySuggestion(id, content)}
        onApplyAllSuggestions={(ids, content) =>
          void actions.handleApplyAllSuggestions(ids, content)
        }
        onIgnoreSuggestion={(id) => void actions.handleIgnoreSuggestion(id)}
        onEditedContentChange={(value) => {
          draft.editedContentRef.current = value;
          draft.setEditedContent(value);
        }}
        onLiveAtsChange={actions.handleLiveAtsChange}
        onSaveContent={() => void actions.handleSaveContent()}
        onPreviewResume={() => {
          void actions.handleSaveContent();
          navigation.goTo(8);
        }}
        onExport={(format, previewRoot) => void actions.handleExport(format, previewRoot)}
        onDone={() => void actions.handleSaveVersion({ navigateAfter: true })}
        onTemplateChange={setSelectedTemplate}
      />

      <Dialog
        open={draft.blocker.state === 'blocked'}
        onClose={draft.closeLeaveDialog}
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
          <Button variant="outline" onClick={draft.closeLeaveDialog}>
            Keep Editing
          </Button>
          <Button onClick={draft.confirmLeave}>Discard Changes</Button>
        </DialogActions>
      </Dialog>
    </Root>
  );
}
