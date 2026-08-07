import { describe, expect, it } from 'vitest';

import {
  extractProfessionalSkillsFromText,
  normalizeProfessionalSkill,
  normalizeProfessionalSkills,
  skillAppearsIn,
  skillMatchKey,
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

  it('matches equivalent skill spellings in resume text', () => {
    expect(skillMatchKey('React.js')).toBe(skillMatchKey('React'));
    expect(skillMatchKey('Node.js')).toBe(skillMatchKey('Node'));
    expect(normalizeProfessionalSkill('React.js')).toBe('React');
    expect(normalizeProfessionalSkill('react.js')).toBe('React');
    expect(normalizeProfessionalSkill('angular')).toBe('Angular');
    expect(normalizeProfessionalSkill('AngularJS')).toBe('Angular');
    expect(skillAppearsIn('Built UI with React and TypeScript', 'React.js')).toBe(true);
    expect(skillAppearsIn('Experienced with Node.js APIs', 'Node')).toBe(true);
    expect(skillAppearsIn('Java Spring Boot services', 'Spring Boot')).toBe(true);
    expect(skillAppearsIn('Only Python listed here', 'Java')).toBe(false);
    expect(skillAppearsIn('Skills: ReactJS, NodeJS, NextJS', 'React')).toBe(true);
    expect(skillAppearsIn('Skills: ReactJS, NodeJS, NextJS', 'Node.js')).toBe(true);
    expect(skillAppearsIn('Skills: ReactJS, NodeJS, NextJS', 'Next.js')).toBe(true);
    expect(skillAppearsIn('Technical Skills\nJavaScript | React . js | HTML5', 'React')).toBe(true);
    expect(skillAppearsIn('SKILLS\nangular, typescript, rxjs', 'Angular')).toBe(true);
    expect(skillAppearsIn('Built dashboards with AngularJS', 'Angular')).toBe(true);
  });

  it('extracts glued JS skill names from resume prose', () => {
    expect(
      extractProfessionalSkillsFromText('SKILLS\nReactJS, NodeJS, TypeScript, ExpressJS'),
    ).toEqual(expect.arrayContaining(['React', 'Node.js', 'TypeScript', 'Express']));
  });

  it('extracts space-separated PDF skill grids', () => {
    expect(
      extractProfessionalSkillsFromText('SKILLS\nReact TypeScript Angular Docker AWS'),
    ).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Angular', 'Docker', 'AWS']));
  });
});
