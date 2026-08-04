import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ResumeDraft } from '../../utils';

import { ResumeTemplatePreview } from './ResumeTemplatePreview';

const draft: ResumeDraft = {
  originalText: '',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '123',
  location: 'London',
  linkedin: '',
  role: 'Software Engineer',
  summary: 'Pioneer of computing.',
  education: 'B.S. Mathematics',
  certifications: '',
  achievements: '',
  skillsList: ['Math', 'Algorithms'],
  experiences: [
    {
      id: 'e1',
      company: 'Analytical Engine Co',
      title: 'Analyst',
      startDate: '1842',
      endDate: '1843',
      details: '- Designed early programs',
    },
  ],
  projectsList: [],
  customFields: [],
};

describe('ResumeTemplatePreview', () => {
  it('renders classic template content', () => {
    render(<ResumeTemplatePreview draft={draft} template="classic" targetRole="Engineer" />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Professional Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/page/i)).toBeInTheDocument();
  });

  it('renders modern header layout', () => {
    const { container } = render(
      <ResumeTemplatePreview draft={draft} template="modern" targetRole="Engineer" />,
    );

    expect(container.querySelector('.header')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders default/uploaded badge for original template', () => {
    render(<ResumeTemplatePreview draft={draft} template="original" targetRole="Engineer" />);
    expect(screen.getByText(/Uploaded resume design/i)).toBeInTheDocument();
  });
});
