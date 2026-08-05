import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DefineRoleStep } from './DefineRoleStep';

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: {
    getResumeSkillHints: vi.fn().mockResolvedValue(['Java', 'React']),
  },
}));

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

  it('renders role form and starts analysis', async () => {
    render(<DefineRoleStep {...props} />);

    expect(screen.getByDisplayValue('Java Developer')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/JD skill preview/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(props.onStartAnalysis).toHaveBeenCalled();
  });

  it('blocks next and shows validation when JD is missing', () => {
    render(<DefineRoleStep {...props} jobDescription="" />);

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(props.onStartAnalysis).not.toHaveBeenCalled();
    expect(screen.getByText(/Job description is required/i)).toBeInTheDocument();
  });
});
