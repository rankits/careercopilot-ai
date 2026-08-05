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

  it('returns empty for blank input', () => {
    expect(parseProjectBlocks('')).toEqual([]);
  });
});
