import { describe, expect, it } from 'vitest';

import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkill,
  normalizeProfessionalSkills,
} from '@/modules/resumes/utils/skill-normalizer.js';

describe('skill-normalizer', () => {
  it('rejects generic fragments, section labels, and incomplete tokens', () => {
    expect(
      normalizeProfessionalSkills([
        'API',
        'APIs',
        'CD',
        'Control',
        'Design',
        'In',
        'RESTful',
        'Missing / Recommended',
        'Automation',
        'Babel',
        'Collaboration',
        'Context',
        'Context API',
        'CS',
        'CSS Deep',
        'Familiarity',
        'Engineering',
        'Proficiency',
        'Key',
        'Industry',
      ]),
    ).toEqual([]);
  });

  it('normalizes recognized professional skills and merges duplicates', () => {
    expect(
      normalizeProfessionalSkills([
        'JAVA',
        'SpringBoot',
        'postgres',
        'js',
        'node',
        'reactjs',
        'docker',
        'REST APIs',
        'git',
        'HTML5',
        'CSS3',
      ]),
    ).toEqual([
      'CSS3',
      'Docker',
      'Git',
      'HTML5',
      'Java',
      'JavaScript',
      'Node.js',
      'PostgreSQL',
      'React',
      'REST API',
      'Spring Boot',
    ]);
  });

  it('extracts only catalog skills from job-description prose', () => {
    expect(
      extractProfessionalSkillsFromText(
        'Required: Strong Java, SpringBoot, Hibernate, postgres, Kafka. Ability to troubleshoot applications and write code.',
      ),
    ).toEqual(['Hibernate', 'Java', 'Kafka', 'PostgreSQL', 'Spring Boot']);
  });

  it('validates a single skill before returning it', () => {
    expect(normalizeProfessionalSkill('Docker')).toBe('Docker');
    expect(normalizeProfessionalSkill('Nice to Have')).toBeNull();
    expect(normalizeProfessionalSkill('API')).toBeNull();
    expect(normalizeProfessionalSkill('TypeScript')).toBe('TypeScript');
  });

  it('does not treat role titles as skills', () => {
    expect(normalizeProfessionalSkill('Business Development Executive')).toBeNull();
    expect(normalizeProfessionalSkill('Full Stack Developer')).toBeNull();
  });
});
