import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ResumeBuilderStepPanels } from './ResumeBuilderStepPanels';

vi.mock('../UploadStep', () => ({
  UploadStep: () => <div>Upload step</div>,
}));

vi.mock('../DefineRoleStep', () => ({
  DefineRoleStep: () => <div>Define role step</div>,
}));

vi.mock('../OptimizeStep', () => ({
  OptimizeStep: () => <div>Optimize step</div>,
}));

vi.mock('../ExportStep', () => ({
  ExportStep: () => <div>Export step</div>,
}));

const analysis = {
  id: 11,
  resumeId: 'r1',
  targetRole: 'React Developer',
  experienceLevel: 'mid',
  status: 'COMPLETED',
  atsScore: 82,
  baselineAtsScore: 62,
  keywordMatch: 70,
  skillMatch: 65,
  contentQuality: 72,
  readability: 80,
  formattingScore: 75,
  strengths: ['Clear structure'],
  weaknesses: ['Missing GraphQL'],
  keywords: [
    { id: 1, term: 'React', status: 'MATCHED', importance: 'high' },
    { id: 2, term: 'GraphQL', status: 'MISSING', importance: 'high' },
  ],
  suggestions: [
    {
      id: 9,
      title: 'Add GraphQL',
      category: 'skills',
      originalText: 'React',
      suggestedText: 'React, GraphQL',
      impact: 'HIGH',
      status: 'PENDING',
    },
  ],
  skillAnalysis: {
    matchedSkills: ['React'],
    missingSkills: ['GraphQL'],
    transferableSkills: [],
    recommendedSkills: ['GraphQL'],
  },
  sectionScores: {
    summary: 70,
    experience: 75,
    skills: 60,
    education: 80,
    projects: 72,
    achievements: 50,
  },
  atsIssues: [],
  editedContent: 'SUMMARY\nReact engineer',
};

const baseProps = {
  existingResumes: [],
  selectedResume: {
    id: 'r1',
    originalName: 'resume.pdf',
    fileName: 'resume.pdf',
    status: 'READY',
    createdAt: '2026-08-01T10:00:00.000Z',
    sizeBytes: 2048,
  },
  isDragging: false,
  uploadError: '',
  uploading: false,
  fileInputRef: createRef<HTMLInputElement>(),
  targetRole: 'React Developer',
  industry: 'technology',
  experienceLevel: 'mid' as const,
  employmentType: 'full-time',
  skills: ['React'],
  jobDescription: 'Need React and GraphQL',
  startingAnalysis: false,
  analysis: null,
  keywords: null,
  suggestions: [],
  applyingId: null,
  editedContent: '',
  saving: false,
  recheckResult: null,
  rechecking: false,
  exportingFormat: null,
  versions: [],
  savingVersion: false,
  selectedTemplate: 'original' as const,
  onDragStateChange: vi.fn(),
  onDrop: vi.fn(),
  onFileSelect: vi.fn(),
  onUseResume: vi.fn(),
  onDeleteResume: vi.fn(),
  onShowMoreResumes: vi.fn(),
  onTargetRoleChange: vi.fn(),
  onIndustryChange: vi.fn(),
  onExperienceLevelChange: vi.fn(),
  onEmploymentTypeChange: vi.fn(),
  onSkillsChange: vi.fn(),
  onJobDescriptionChange: vi.fn(),
  onStartAnalysis: vi.fn(),
  onBackFromDefineRole: vi.fn(),
  onReplaceResume: vi.fn(),
  onGoTo: vi.fn(),
  onApplySuggestion: vi.fn(),
  onApplyAllSuggestions: vi.fn(),
  onIgnoreSuggestion: vi.fn(),
  onEditedContentChange: vi.fn(),
  onSaveContent: vi.fn(),
  onPreviewResume: vi.fn(),
  onExport: vi.fn(),
  onDone: vi.fn(),
  onTemplateChange: vi.fn(),
};

describe('ResumeBuilderStepPanels', () => {
  it('routes to Upload step', () => {
    render(<ResumeBuilderStepPanels {...baseProps} step={1} />);
    expect(screen.getByText('Upload step')).toBeInTheDocument();
  });

  it('routes to Define Role step', () => {
    render(<ResumeBuilderStepPanels {...baseProps} step={2} />);
    expect(screen.getByText('Define role step')).toBeInTheDocument();
  });

  it('shows analyzing dashboard while analysis is running', () => {
    render(
      <ResumeBuilderStepPanels
        {...baseProps}
        step={3}
        analysis={
          {
            ...analysis,
            status: 'ANALYZING',
            atsScore: 0,
          } as never
        }
      />,
    );

    expect(screen.getByText(/Analysis is running/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyzing/i)).toBeInTheDocument();
  });

  it('shows completed analysis score, keywords, and continues to optimize', () => {
    const onGoTo = vi.fn();
    render(
      <ResumeBuilderStepPanels
        {...baseProps}
        step={3}
        analysis={analysis as never}
        suggestions={analysis.suggestions as never}
        onGoTo={onGoTo}
      />,
    );

    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText(/Excellent Match/i)).toBeInTheDocument();
    expect(screen.getAllByText('GraphQL').length).toBeGreaterThan(0);
    expect(screen.getByText(/Add GraphQL/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /optimize resume/i }));
    expect(onGoTo).toHaveBeenCalledWith(5);
  });

  it('routes to Optimize and Export steps', () => {
    const { rerender } = render(
      <ResumeBuilderStepPanels
        {...baseProps}
        step={5}
        analysis={analysis as never}
        suggestions={analysis.suggestions as never}
      />,
    );
    expect(screen.getByText('Optimize step')).toBeInTheDocument();

    rerender(
      <ResumeBuilderStepPanels
        {...baseProps}
        step={10}
        analysis={analysis as never}
        suggestions={analysis.suggestions as never}
      />,
    );
    expect(screen.getByText('Export step')).toBeInTheDocument();
  });

  it('calls reanalyze from completed dashboard', () => {
    const onStartAnalysis = vi.fn();
    render(
      <ResumeBuilderStepPanels
        {...baseProps}
        step={3}
        analysis={analysis as never}
        onStartAnalysis={onStartAnalysis}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /re-analyze/i }));
    expect(onStartAnalysis).toHaveBeenCalled();
  });
});
