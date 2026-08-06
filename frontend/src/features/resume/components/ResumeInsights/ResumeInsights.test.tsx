import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ResumePresentation } from '@/features/resume/utils/resumePresentation';

import { ResumeInsights } from './ResumeInsights';

const mockPresentation: ResumePresentation = {
  confidenceScore: 0.85,
  counts: {
    certifications: 1,
    companies: 2,
    education: 1,
    projects: 3,
    skills: 10,
  },
  insights: {
    areasToImprove: ['Add quantified achievements to work experience'],
    missingInformation: ['LinkedIn Profile', 'Portfolio URL'],
    suggestions: ['Consider highlighting leadership roles'],
    strengths: ['Solid foundation in React and TypeScript', 'Clear project history'],
  },
};

const emptyPresentation: ResumePresentation = {
  confidenceScore: null,
  counts: {
    certifications: 0,
    companies: 0,
    education: 0,
    projects: 0,
    skills: 0,
  },
  insights: {
    areasToImprove: [],
    missingInformation: [],
    suggestions: [],
    strengths: [],
  },
};

describe('ResumeInsights', () => {
  it('renders loading state when isLoading is true', () => {
    render(
      <ResumeInsights hasParsedResume={false} isLoading={true} presentation={emptyPresentation} />,
    );

    expect(screen.getByRole('heading', { name: /ai insights/i })).toBeInTheDocument();
    expect(screen.getByText(/loading resume insights…/i)).toBeInTheDocument();
  });

  it('renders error alert when error message is provided', () => {
    render(
      <ResumeInsights
        error="Unable to parse resume insights"
        hasParsedResume={false}
        isLoading={false}
        presentation={emptyPresentation}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to parse resume insights/i);
  });

  it('renders prompt message when no resume has been parsed yet', () => {
    render(
      <ResumeInsights hasParsedResume={false} isLoading={false} presentation={emptyPresentation} />,
    );

    expect(
      screen.getByText(/parse a resume to view the score and insights returned by the parser\./i),
    ).toBeInTheDocument();
  });

  it('renders confidence score, strengths, improvements, missing info chips, and AI suggestions', () => {
    render(
      <ResumeInsights hasParsedResume={true} isLoading={false} presentation={mockPresentation} />,
    );

    // Score 0.85 -> 85 / 100
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();

    // Section Headings
    expect(screen.getByText(/areas to improve/i)).toBeInTheDocument();
    expect(screen.getByText(/resume score/i)).toBeInTheDocument();
    expect(screen.getByText(/strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/missing information/i)).toBeInTheDocument();
    expect(screen.getByText(/ai suggestions/i)).toBeInTheDocument();

    // Content Items
    expect(screen.getByText(/add quantified achievements to work experience/i)).toBeInTheDocument();
    expect(screen.getByText(/solid foundation in react and typescript/i)).toBeInTheDocument();
    expect(screen.getByText(/clear project history/i)).toBeInTheDocument();
    expect(screen.getByText(/consider highlighting leadership roles/i)).toBeInTheDocument();

    // Chips
    expect(screen.getByText('LinkedIn Profile')).toBeInTheDocument();
    expect(screen.getByText('Portfolio URL')).toBeInTheDocument();
  });

  it('correctly calculates score when confidenceScore is a whole percentage (> 1)', () => {
    const highPresentation: ResumePresentation = {
      ...emptyPresentation,
      confidenceScore: 92,
    };

    render(
      <ResumeInsights hasParsedResume={true} isLoading={false} presentation={highPresentation} />,
    );

    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('renders fallback score when confidenceScore is null', () => {
    render(
      <ResumeInsights hasParsedResume={true} isLoading={false} presentation={emptyPresentation} />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Not provided')).toBeInTheDocument();
  });

  it('renders empty section fallback messages when insights arrays are empty', () => {
    render(
      <ResumeInsights hasParsedResume={true} isLoading={false} presentation={emptyPresentation} />,
    );

    expect(
      screen.getByText(/no improvement areas were returned by the api\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no strengths were returned by the api\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/no missing information was returned by the api\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no suggestions were returned by the api\./i)).toBeInTheDocument();
  });
});
