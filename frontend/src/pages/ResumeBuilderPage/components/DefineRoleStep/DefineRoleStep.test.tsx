import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DefineRoleStep } from './DefineRoleStep';

describe('DefineRoleStep', () => {
  const props = {
    targetRole: 'Java Developer',
    industry: 'technology',
    experienceLevel: 'mid' as const,
    employmentType: 'full-time',
    skills: ['Java'],
    jobDescription: 'Need Java Spring Boot',
    startingAnalysis: false,
    selectedResume: {
      id: 'r1',
      originalName: 'resume.pdf',
      fileName: 'resume.pdf',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders role form without bottom Back/Next actions', () => {
    render(<DefineRoleStep {...props} />);

    expect(screen.getByDisplayValue('Java Developer')).toBeInTheDocument();
    expect(screen.queryByText(/JD skill preview/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Back$/i })).not.toBeInTheDocument();
  });
});
