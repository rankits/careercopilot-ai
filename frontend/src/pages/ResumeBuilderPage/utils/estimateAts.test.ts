import { describe, expect, it } from 'vitest';

import {
  estimateImprovedAtsScore,
  refreshSkillAnalysisFromContent,
  scoreTone,
} from './estimateAts';

describe('estimateImprovedAtsScore', () => {
  it('returns baseline when no improvements are present', () => {
    expect(
      estimateImprovedAtsScore({
        baseline: 70,
        content: 'React TypeScript resume',
        missingSkills: ['Java', 'Spring Boot'],
        missingKeywords: ['Hibernate'],
        appliedCount: 0,
      }),
    ).toBe(70);
  });

  it('raises estimate when missing skills and applied suggestions are present', () => {
    const score = estimateImprovedAtsScore({
      baseline: 62,
      content: 'Java Spring Boot Hibernate React TypeScript',
      missingSkills: ['Java', 'Spring Boot', 'Hibernate'],
      missingKeywords: ['Java', 'Spring Boot'],
      appliedCount: 2,
      highAppliedCount: 2,
    });

    expect(score).toBeGreaterThan(62);
    expect(score).toBeLessThanOrEqual(94);
  });

  it('stays at baseline when no suggestions were applied even if content covers JD skills', () => {
    const low = estimateImprovedAtsScore({
      baseline: 45,
      content: 'React CSS HTML designer',
      matchedSkills: [],
      missingSkills: ['Java', 'Spring Boot', 'Hibernate', 'Kafka'],
      appliedCount: 0,
    });
    const highWithoutApply = estimateImprovedAtsScore({
      baseline: 45,
      content: 'Java Spring Boot Hibernate Kafka React',
      matchedSkills: ['Java', 'Spring Boot'],
      missingSkills: ['Hibernate', 'Kafka'],
      appliedCount: 0,
    });
    const highWithApply = estimateImprovedAtsScore({
      baseline: 45,
      content: 'Java Spring Boot Hibernate Kafka React',
      matchedSkills: ['Java', 'Spring Boot'],
      missingSkills: ['Hibernate', 'Kafka'],
      appliedCount: 2,
    });

    expect(low).toBe(45);
    expect(highWithoutApply).toBe(45);
    expect(highWithApply).toBeGreaterThan(45);
  });

  it('floors near Export when optimize succeeds from applied fixes + skill recovery', () => {
    const score = estimateImprovedAtsScore({
      baseline: 35,
      content:
        'PROFESSIONAL SUMMARY\nJava Spring Boot engineer.\nSKILLS\nJava, Spring Boot, Hibernate, Kafka, React\nWORK EXPERIENCE\n- Built Java APIs with Spring Boot and Kafka',
      missingSkills: ['Java', 'Spring Boot', 'Hibernate', 'Kafka'],
      matchedSkills: ['React'],
      missingKeywords: ['Java', 'Spring Boot', 'Hibernate'],
      appliedCount: 3,
      highAppliedCount: 2,
    });

    expect(score).toBeGreaterThanOrEqual(74);
    expect(score).toBeLessThanOrEqual(94);
  });
});

describe('refreshSkillAnalysisFromContent', () => {
  it('moves recovered skills from missing to matched', () => {
    const refreshed = refreshSkillAnalysisFromContent('Skills: React, Java, Spring Boot', {
      matchedSkills: ['React'],
      missingSkills: ['Java', 'Spring Boot', 'Kafka'],
      transferableSkills: [],
      recommendedSkills: ['Java', 'Spring Boot', 'Kafka'],
    });

    expect(refreshed.matchedSkills).toEqual(
      expect.arrayContaining(['React', 'Java', 'Spring Boot']),
    );
    expect(refreshed.missingSkills).toEqual(['Kafka']);
    expect(refreshed.recommendedSkills).toEqual(['Kafka']);
  });

  it('treats ReactJS / NodeJS as present for React / Node.js', () => {
    const refreshed = refreshSkillAnalysisFromContent('Skills: ReactJS, NodeJS, TypeScript', {
      matchedSkills: [],
      missingSkills: ['React', 'Node.js', 'Kafka'],
      transferableSkills: [],
      recommendedSkills: ['React', 'Node.js', 'Kafka'],
    });

    expect(refreshed.matchedSkills).toEqual(expect.arrayContaining(['React', 'Node.js']));
    expect(refreshed.missingSkills).toEqual(['Kafka']);
  });

  it('does not wipe matched skills when content is empty', () => {
    const refreshed = refreshSkillAnalysisFromContent('', {
      matchedSkills: ['React', 'TypeScript'],
      missingSkills: ['Kafka'],
      transferableSkills: [],
      recommendedSkills: ['Kafka'],
    });

    expect(refreshed.matchedSkills).toEqual(expect.arrayContaining(['React', 'TypeScript']));
    expect(refreshed.missingSkills).toContain('Kafka');
    expect(refreshed.missingSkills).not.toContain('React');
  });
});

describe('scoreTone', () => {
  it('maps score bands', () => {
    expect(scoreTone(85)).toBe('success');
    expect(scoreTone(65)).toBe('warning');
    expect(scoreTone(40)).toBe('error');
  });
});
