import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ResumeDraft } from '../../utils';

import { computePageOffsets, ResumeTemplatePreview } from './ResumeTemplatePreview';
import { A4_PAGE_CONTENT_HEIGHT_PX } from './template.styles';

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

describe('computePageOffsets', () => {
  const mockRect = (top: number, height: number): DOMRect => ({
    top,
    left: 0,
    bottom: top + height,
    right: 100,
    width: 100,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });

  it('breaks before a straddling bullet instead of cutting mid-sentence', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollHeight', { value: 1600, configurable: true });
    container.scrollTop = 0;
    container.getBoundingClientRect = () => mockRect(0, 1600);

    const mkLi = (top: number, height: number) => {
      const ul = document.createElement('ul');
      ul.className = 'bullets';
      const li = document.createElement('li');
      Object.defineProperty(li, 'offsetHeight', { value: height, configurable: true });
      li.getBoundingClientRect = () => mockRect(top, height);
      ul.appendChild(li);
      container.appendChild(ul);
      return li;
    };

    mkLi(100, 40);
    mkLi(200, 40);
    // This bullet straddles the 900px page end — must move entirely to page 2.
    mkLi(860, 80);
    mkLi(980, 60);

    const pageInner = 900;
    const offsets = computePageOffsets(container, pageInner);

    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(860);
    expect(offsets[1]).toBeLessThan(pageInner);
  });

  it('returns non-overlapping offsets that never restart earlier content', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true });
    container.scrollTop = 0;
    container.getBoundingClientRect = () => mockRect(0, 2000);

    const mkEntry = (top: number, height: number) => {
      const el = document.createElement('div');
      el.className = 'entry';
      Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true });
      el.getBoundingClientRect = () => mockRect(top, height);
      container.appendChild(el);
      return el;
    };

    mkEntry(0, 400);
    mkEntry(400, 520); // straddles first page end (400–920)
    mkEntry(920, 400);
    mkEntry(1320, 700);

    const pageInner = 900;
    const offsets = computePageOffsets(container, pageInner);

    expect(offsets[0]).toBe(0);
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
    expect(offsets[1]).toBe(400);
    for (let i = 0; i < offsets.length - 1; i += 1) {
      expect(offsets[i + 1] - offsets[i]).toBeLessThanOrEqual(pageInner);
    }
  });

  it('fits on a single page when content is short', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollHeight', {
      value: A4_PAGE_CONTENT_HEIGHT_PX - 40,
      configurable: true,
    });
    expect(computePageOffsets(container, A4_PAGE_CONTENT_HEIGHT_PX)).toEqual([0]);
  });
});

describe('ResumeTemplatePreview', () => {
  it('renders classic template content', () => {
    render(<ResumeTemplatePreview draft={draft} template="classic" targetRole="Engineer" />);

    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Professional Summary/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/page/i)).toBeInTheDocument();
  });

  it('renders modern header layout', () => {
    const { container } = render(
      <ResumeTemplatePreview draft={draft} template="modern" targetRole="Engineer" />,
    );

    expect(container.querySelector('.header')).toBeTruthy();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThanOrEqual(1);
  });

  it('renders default badge for original template', () => {
    render(<ResumeTemplatePreview draft={draft} template="original" targetRole="Engineer" />);
    expect(screen.getAllByText(/Default · your resume/i).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps Projects as one logical section (measure + page copies only)', () => {
    const withProjects: ResumeDraft = {
      ...draft,
      projectsList: [
        {
          id: 'p1',
          title: 'Career Copilot',
          company: 'Personal',
          startDate: '2024',
          endDate: '2025',
          details: '- Built resume preview\n- Fixed pagination',
        },
      ],
    };

    render(<ResumeTemplatePreview draft={withProjects} template="classic" targetRole="Engineer" />);
    const headings = screen.getAllByText(/^Projects$/i);
    const pageLabel = screen.getByText(/\d+ pages? · A4/i).textContent ?? '';
    const pages = Number(pageLabel.match(/(\d+)\s+page/)?.[1] ?? 1);
    // 1 off-screen measure copy + 1 copy per visible page frame
    expect(headings.length).toBe(pages + 1);
  });
});
