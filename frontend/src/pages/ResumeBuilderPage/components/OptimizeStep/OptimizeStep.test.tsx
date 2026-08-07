import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OptimizeStep } from './OptimizeStep';

vi.mock('./ResumeTemplatePreview', () => ({
  ResumeTemplatePreview: () => <div>Preview</div>,
}));

vi.mock('./SectionEditor', () => ({
  SectionEditor: () => <div>Section editor</div>,
}));

const analysis = {
  id: 1,
  resumeId: 'r1',
  targetRole: 'Java Developer',
  experienceLevel: 'mid',
  status: 'COMPLETED',
  atsScore: 62,
  baselineAtsScore: 62,
  keywordMatch: 50,
  skillMatch: 40,
  contentQuality: 55,
  readability: 70,
  formattingScore: 65,
  strengths: [],
  weaknesses: [],
  keywords: [{ id: 1, term: 'Java', status: 'MISSING', importance: 'high' }],
  suggestions: [],
  skillAnalysis: {
    matchedSkills: ['React'],
    missingSkills: ['Java', 'Spring Boot'],
    transferableSkills: [],
    recommendedSkills: ['Java'],
  },
  editedContent: `PROFESSIONAL SUMMARY
Engineer

SKILLS
React

EXPERIENCE
Built apps

EDUCATION
B.Tech
`,
};

describe('OptimizeStep', () => {
  it('renders optimize shell and estimated ATS strip', () => {
    const onExportStep = vi.fn();
    render(
      <OptimizeStep
        analysis={analysis as never}
        applyingId={null}
        editedContent={analysis.editedContent}
        jobDescription="Java Spring Boot"
        preferredSkills={['Java']}
        saving={false}
        suggestions={[]}
        targetRole="Java Developer"
        template="original"
        onApplySuggestion={vi.fn()}
        onApplyAllSuggestions={vi.fn()}
        onIgnoreSuggestion={vi.fn()}
        onEditedContentChange={vi.fn()}
        onExportStep={onExportStep}
        onSaveContent={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Optimize Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/Current ATS Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Resume \/ ATS after edits/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue to Export/i }));
    expect(onExportStep).toHaveBeenCalled();
  });

  it('applies skill suggestion into draft content passed to parent', () => {
    const onApplySuggestion = vi.fn();
    const onApplyAllSuggestions = vi.fn();
    const onEditedContentChange = vi.fn();

    render(
      <OptimizeStep
        analysis={analysis as never}
        applyingId={null}
        editedContent={analysis.editedContent}
        jobDescription="Java Spring Boot"
        preferredSkills={[]}
        saving={false}
        suggestions={[
          {
            id: 11,
            title: 'Add Java to Skills',
            category: 'skills',
            originalText: 'Java',
            suggestedText: 'Java',
            impact: 'MEDIUM',
            status: 'PENDING',
            reason: 'Missing JD skills',
          },
        ]}
        targetRole="Java Developer"
        template="original"
        onApplySuggestion={onApplySuggestion}
        onApplyAllSuggestions={onApplyAllSuggestions}
        onIgnoreSuggestion={vi.fn()}
        onEditedContentChange={onEditedContentChange}
        onExportStep={vi.fn()}
        onSaveContent={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply next fix/i }));

    expect(onEditedContentChange).toHaveBeenCalled();
    const latestContent = onEditedContentChange.mock.calls.at(-1)?.[0] as string;
    expect(latestContent).toMatch(/Java/i);
    expect(onApplySuggestion).toHaveBeenCalledWith(11, expect.stringMatching(/Java/i));
  });

  it('applies summary suggestion into draft content for live preview', () => {
    const onApplySuggestion = vi.fn();
    const onEditedContentChange = vi.fn();

    render(
      <OptimizeStep
        analysis={
          {
            ...analysis,
            optimizedSummary: 'Java engineer with Spring Boot experience',
          } as never
        }
        applyingId={null}
        editedContent={analysis.editedContent}
        jobDescription="Java Spring Boot developer needed"
        preferredSkills={[]}
        saving={false}
        suggestions={[
          {
            id: 21,
            title: 'Improve summary',
            category: 'summary',
            originalText: 'Engineer',
            suggestedText: 'Java engineer with Spring Boot experience',
            impact: 'HIGH',
            status: 'PENDING',
            reason: 'Align summary to JD',
          },
        ]}
        targetRole="Java Developer"
        template="classic"
        onApplySuggestion={onApplySuggestion}
        onApplyAllSuggestions={vi.fn()}
        onIgnoreSuggestion={vi.fn()}
        onEditedContentChange={onEditedContentChange}
        onExportStep={vi.fn()}
        onSaveContent={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply next fix/i }));

    const latestContent = onEditedContentChange.mock.calls.at(-1)?.[0] as string;
    expect(latestContent).toMatch(/Java engineer with Spring Boot experience/i);
    expect(onApplySuggestion).toHaveBeenCalledWith(
      21,
      expect.stringMatching(/Java engineer with Spring Boot experience/i),
    );
  });

  it('applies all pending suggestions in one action', () => {
    const onApplyAllSuggestions = vi.fn();
    const onEditedContentChange = vi.fn();

    render(
      <OptimizeStep
        analysis={analysis as never}
        applyingId={null}
        editedContent={analysis.editedContent}
        jobDescription="Java Spring Boot"
        preferredSkills={[]}
        saving={false}
        suggestions={[
          {
            id: 11,
            title: 'Add Java to Skills',
            category: 'skills',
            originalText: 'Java',
            suggestedText: 'Java',
            impact: 'MEDIUM',
            status: 'PENDING',
            reason: 'Missing JD skills',
          },
          {
            id: 12,
            title: 'Improve summary',
            category: 'summary',
            originalText: 'Engineer',
            suggestedText: 'Java engineer with Spring Boot experience',
            impact: 'MEDIUM',
            status: 'PENDING',
            reason: 'Stronger summary',
          },
        ]}
        targetRole="Java Developer"
        template="original"
        onApplySuggestion={vi.fn()}
        onApplyAllSuggestions={onApplyAllSuggestions}
        onIgnoreSuggestion={vi.fn()}
        onEditedContentChange={onEditedContentChange}
        onExportStep={vi.fn()}
        onSaveContent={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply All Fixes/i }));

    expect(onApplyAllSuggestions).toHaveBeenCalled();
    const [ids, content] = onApplyAllSuggestions.mock.calls[0] as [number[], string];
    expect(ids).toEqual(expect.arrayContaining([11, 12]));
    expect(ids).toHaveLength(2);
    expect(content).toMatch(/Java/i);
    expect(content).toMatch(/Spring Boot/i);
  });
});
