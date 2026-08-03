import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportStep } from './ExportStep';

vi.mock('../OptimizeStep/ResumeTemplatePreview', () => ({
  ResumeTemplatePreview: () => <div>Export preview</div>,
}));

describe('ExportStep', () => {
  it('shows recheck improvement and export actions', () => {
    const onExport = vi.fn();
    render(
      <ExportStep
        analysis={
          {
            atsScore: 78,
            baselineAtsScore: 62,
            editedContent: 'PROFESSIONAL SUMMARY\nJava developer\nSKILLS\nJava',
            targetRole: 'Java Developer',
            skillAnalysis: {
              matchedSkills: ['Java'],
              missingSkills: [],
              transferableSkills: [],
              recommendedSkills: [],
            },
          } as never
        }
        editedContent="PROFESSIONAL SUMMARY\nJava developer\nSKILLS\nJava"
        exporting={false}
        jobDescription="Java"
        preferredSkills={['Java']}
        recheckResult={{
          atsScore: 78,
          previousAtsScore: 62,
          improvement: 16,
          grade: 'B+',
          keywordMatch: 80,
          skillMatch: 75,
          contentQuality: 70,
          readability: 72,
          formattingScore: 74,
        }}
        rechecking={false}
        savingVersion={false}
        targetRole="Java Developer"
        template="original"
        versions={[]}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onExport={onExport}
        onSaveVersion={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/improved by \+16/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
    expect(onExport).toHaveBeenCalled();
  });
});
