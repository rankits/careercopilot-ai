import { describe, expect, it } from 'vitest';
import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkill,
  normalizeProfessionalSkills,
} from '@/modules/resumes/utils/skill-normalizer.js';

describe('skill-normalizer', () => {
  it('rejects generic fragments and action words', () => {
    expect(
      normalizeProfessionalSkills([
        'microservices.Required',
        'applications.Write',
        'lifecycle.Troubleshoot',
        'field.Strong',
        'code.Contribute',
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
        'docker container',
        'REST APIs',
        'git',
      ]),
    ).toEqual([
      'Docker',
      'Git',
      'Java',
      'JavaScript',
      'Node.js',
      'PostgreSQL',
      'React',
      'REST API',
      'Spring Boot',
    ]);
  });

  it('extracts only recognized skills from job-description prose', () => {
    expect(
      extractProfessionalSkillsFromText(
        'Required: Strong Java, SpringBoot, Hibernate, postgres, Kafka. Ability to troubleshoot applications and write code.',
      ),
    ).toEqual(['Hibernate', 'Java', 'Kafka', 'PostgreSQL', 'Spring Boot']);
  });

  it('validates a single skill before returning it', () => {
    expect(normalizeProfessionalSkill('Docker')).toBe('Docker');
    expect(normalizeProfessionalSkill('Nice to Have')).toBeNull();
  });

  it('keeps valid cross-industry professional skills', () => {
    expect(
      normalizeProfessionalSkills([
        'Lead Generation',
        'Cold Calling',
        'Salesforce',
        'Clinical Documentation',
        'Electronic Health Records',
        'Financial Analysis',
        'RF Planning',
      ]),
    ).toEqual([
      'Clinical Documentation',
      'Cold Calling',
      'Electronic Health Records',
      'Financial Analysis',
      'Lead Generation',
      'RF Planning',
      'Salesforce',
    ]);
  });

  it('does not treat role titles as skills', () => {
    expect(normalizeProfessionalSkill('Business Development Executive')).toBeNull();
    expect(normalizeProfessionalSkill('Full Stack Developer')).toBeNull();
    expect(normalizeProfessionalSkill('Lead Generation')).toBe('Lead Generation');
  });

  it('rejects generic JD and resume words from skill gap analysis', () => {
    expect(
      normalizeProfessionalSkills([
        'Development',
        'Management',
        'Performance',
        'Present',
        'Summary',
        'Years',
        'Achievement',
        'Administration',
        'BDE',
        'Business',
        'Client',
        'Conduct',
        'Cloud',
        'Component-based',
        'CSS3',
        'Description',
        'Educational',
        'ES6',
        'Google',
        'HTML5',
        'Hybrid',
        'Information',
      ]),
    ).toEqual([]);
    expect(normalizeProfessionalSkill('Business Development')).toBe('Business Development');
    expect(normalizeProfessionalSkill('Client Acquisition')).toBe('Client Acquisition');
  });
});
