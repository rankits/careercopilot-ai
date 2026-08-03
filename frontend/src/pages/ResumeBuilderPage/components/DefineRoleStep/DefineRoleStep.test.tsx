import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DefineRoleStep } from './DefineRoleStep';

describe('DefineRoleStep', () => {
  const props = {
    targetRole: 'Java Developer',
    industry: 'Software',
    experienceLevel: 'mid' as const,
    employmentType: 'Full-time',
    skills: ['Java'],
    jobDescription: 'Need Java Spring Boot',
    startingAnalysis: false,
    selectedResume: {
      id: 'r1',
      originalName: 'resume.pdf',
      storedName: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      status: 'READY',
      createdAt: '2026-08-01T10:00:00.000Z',
    },
    analysis: null,
    versions: [],
    onBack: vi.fn(),
    onTargetRoleChange: vi.fn(),
    onIndustryChange: vi.fn(),
    onExperienceLevelChange: vi.fn(),
    onEmploymentTypeChange: vi.fn(),
    onSkillsChange: vi.fn(),
    onJobDescriptionChange: vi.fn(),
    onStartAnalysis: vi.fn(),
  };

  it('renders role form and starts analysis', () => {
    render(<DefineRoleStep {...props} />);

    expect(screen.getByDisplayValue('Java Developer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(props.onStartAnalysis).toHaveBeenCalled();
  });
});
