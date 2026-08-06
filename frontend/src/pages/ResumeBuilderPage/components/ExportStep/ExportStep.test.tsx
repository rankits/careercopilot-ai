import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportStep } from './ExportStep';

vi.mock('../OptimizeStep/ResumeTemplatePreview', () => ({
  ResumeTemplatePreview: () => <div>Export preview</div>,
}));

describe('ExportStep', () => {
  it('shows recheck improvement and export actions', () => {
    const onExport = vi.fn();
    const onDone = vi.fn();
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
        exportingFormat={null}
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
        onDone={onDone}
        onExport={onExport}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/improved by \+16/i)).toBeInTheDocument();
    expect(screen.queryByText(/Version History/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /txt/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    expect(onExport).toHaveBeenCalledWith('pdf', null);

    fireEvent.click(screen.getByRole('button', { name: /Save Resume/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('keeps Export New ATS equal to Optimize score when provided', () => {
    render(
      <ExportStep
        analysis={
          {
            atsScore: 60,
            baselineAtsScore: 60,
            editedContent: 'SKILLS\nJava',
            targetRole: 'Java Developer',
            skillAnalysis: {
              matchedSkills: ['Java'],
              missingSkills: [],
              transferableSkills: [],
              recommendedSkills: [],
            },
          } as never
        }
        editedContent="SKILLS\nJava"
        exportingFormat={null}
        jobDescription="Java"
        preferredSkills={['Java']}
        optimizedAtsScore={66}
        recheckResult={{
          atsScore: 76,
          previousAtsScore: 60,
          improvement: 16,
          grade: 'B',
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
        onDone={vi.fn()}
        onExport={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Previous 60\/100 → now 66\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/improved by \+6/i)).toBeInTheDocument();
  });

  it('shows improved analysis ATS when recheck has not returned yet', () => {
    render(
      <ExportStep
        analysis={
          {
            atsScore: 81,
            baselineAtsScore: 55,
            editedContent: 'SKILLS\nJava, Spring Boot',
            targetRole: 'Java Developer',
            skillAnalysis: {
              matchedSkills: ['Java', 'Spring Boot'],
              missingSkills: [],
              transferableSkills: [],
              recommendedSkills: [],
            },
          } as never
        }
        editedContent="SKILLS\nJava, Spring Boot"
        exportingFormat={null}
        jobDescription="Java Spring Boot"
        preferredSkills={['Java']}
        recheckResult={null}
        rechecking={false}
        savingVersion={false}
        targetRole="Java Developer"
        template="original"
        onDone={vi.fn()}
        onExport={vi.fn()}
        onTemplateChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Previous 55\/100 → now 81\/100/i)).toBeInTheDocument();
  });
});
