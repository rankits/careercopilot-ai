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
        onIgnoreSuggestion={vi.fn()}
        onEditedContentChange={vi.fn()}
        onExportStep={onExportStep}
        onSaveContent={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Optimize Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/Current ATS Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated after edits/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue to Export/i }));
    expect(onExportStep).toHaveBeenCalled();
  });
});
