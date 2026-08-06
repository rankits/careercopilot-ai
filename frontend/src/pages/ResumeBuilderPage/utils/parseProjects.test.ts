import { describe, expect, it } from 'vitest';

import { parseProjectBlocks } from './parseProjects';

describe('parseProjectBlocks', () => {
  it('parses titled projects with details', () => {
    const projects = parseProjectBlocks(`
CareerCopilot - https://careercopilot.vercel.app
Built an ATS resume optimizer with React and NestJS
Improved suggestion apply flow
`);

    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]?.title).toMatch(/CareerCopilot/i);
    expect(projects[0]?.company).toContain('vercel.app');
    expect(projects[0]?.details).toContain('ATS resume optimizer');
  });

  it('creates a fallback project when only bullets exist', () => {
    const projects = parseProjectBlocks('Built payment checkout with Stripe');
    expect(projects).toHaveLength(1);
    expect(projects[0]?.title).toBe('Project');
    expect(projects[0]?.details).toContain('Stripe');
  });

  it('never leaves blank titles that would render as Role', () => {
    const projects = parseProjectBlocks(`
Vendor Management System
- Built vendor onboarding workflows
- Integrated reporting dashboards
`);
    expect(projects[0]?.title).toMatch(/Vendor Management System/i);
    expect(projects[0]?.details).toMatch(/vendor onboarding/i);
  });

  it('parses Project name: labeled headers', () => {
    const projects = parseProjectBlocks(`
Project name: Fieldwork
Responsibilities:
- Captured field survey data
- Built mobile forms
`);
    expect(projects[0]?.title).toMatch(/Fieldwork/i);
    expect(projects[0]?.details).toMatch(/field survey/i);
  });

  it('parses Title — Subtitle project headers and Stack lines', () => {
    const projects = parseProjectBlocks(`
Seedify  —  Web3 / Blockchain Platform
▸  Developed scalable Web3 applications using React.js and Next.js
Stack: React.js · Next.js · TypeScript · Node.js
Strayos  —  AI-Powered Analytics Platform
▸  Built AI-powered analytics dashboards using React.js
Stack: React.js · Vue.js · Angular
`);

    expect(projects).toHaveLength(2);
    expect(projects[0]?.title).toMatch(/Seedify/i);
    expect(projects[0]?.company).toMatch(/Web3/i);
    expect(projects[0]?.details).toMatch(/Web3 applications/i);
    expect(projects[0]?.details).toMatch(/Stack:/i);
    expect(projects[1]?.title).toMatch(/Strayos/i);
  });
});
