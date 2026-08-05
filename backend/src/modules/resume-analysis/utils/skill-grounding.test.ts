import { describe, expect, it } from 'vitest';

import { groundSkillGapAgainstResume } from '@/modules/resume-analysis/utils/skill-grounding.js'; //no-eslint-disable-line no-unused-vars

const PUSHPENDRA_RESUME = `
Pushpendra Mishra
Sr. Software Engineer

PROFESSIONAL SUMMARY
Highly experienced Senior Software Engineer with 8 years of experience building scalable web applications using React, Node.js, and MongoDB.

SKILLS
AWS, Bootstrap, CI/CD, PostgreSQL, React, React Testing Library, React.js, Redux, Redux Toolkit, REST API, Sass, TypeScript, Vite, Zustand

WORK EXPERIENCE
Senior Full Stack Developer | Shriffle Technologies
Built scalable web applications using React.js, Node.js, Express.js, RESTful APIs, MongoDB, and PostgreSQL. Delivered UI with React, Bootstrap, and Sass.

Full Stack Developer | Thought Mines Infotech
Implemented JWT authentication, CI/CD pipelines, and API development using React.js, Node.js, Express.js, and MongoDB.

PROJECTS
OpenTrack — React.js, Node.js, Express.js, Bootstrap
Patterson — Node.js, Express.js, React.js, CI/CD, SendGrid
`;

const REACT_JD = `
React Developer
Required Skills: React.js, JavaScript (ES6+), TypeScript, HTML5, CSS3, SCSS, Redux Toolkit, REST APIs, Axios, Git, GitHub, Material UI, Tailwind CSS, Responsive Design
`;

const ANGULAR_JD = `
Angular Developer
Required Skills: Angular, TypeScript, JavaScript, RxJS, HTML5, CSS3, SCSS, Angular Material, REST APIs, Git, Responsive Design
`;

const NODE_JD = `
Node.js Developer
Required Skills: Node.js, Express.js, JavaScript, TypeScript, REST APIs, MongoDB, PostgreSQL, MySQL, JWT Authentication, Git, GitHub, Docker, AWS
`;

describe('groundSkillGapAgainstResume', () => {
  it('matches React/Node resume against React JD (never 0 matched)', () => {
    const gap = groundSkillGapAgainstResume({
      resumeText: PUSHPENDRA_RESUME,
      jobDescription: REACT_JD,
      targetRole: 'React Developer',
      // Simulate broken AI that claimed zero matches.
      aiMatched: [],
      aiMissing: ['React.js', 'TypeScript', 'Redux Toolkit', 'REST APIs', 'JavaScript'],
    });

    expect(gap.matchedSkills.length).toBeGreaterThan(0);
    expect(gap.matchedSkills).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'Redux Toolkit', 'REST API']),
    );
    expect(gap.crossDomain).toBe(false);
    expect(gap.skillMatch).toBeGreaterThan(40);
  });

  it('matches Node resume skills against Node JD', () => {
    const gap = groundSkillGapAgainstResume({
      resumeText: PUSHPENDRA_RESUME,
      jobDescription: NODE_JD,
      targetRole: 'Node.js Developer',
      aiMatched: [],
      aiMissing: ['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'JWT'],
    });

    expect(gap.matchedSkills).toEqual(
      expect.arrayContaining(['Node.js', 'Express', 'MongoDB', 'PostgreSQL']),
    );
    expect(gap.crossDomain).toBe(false);
  });

  it('keeps Angular-specific skills missing for a React resume', () => {
    const gap = groundSkillGapAgainstResume({
      resumeText: PUSHPENDRA_RESUME,
      jobDescription: ANGULAR_JD,
      targetRole: 'Angular Developer',
      aiMatched: [],
      aiMissing: ['Angular', 'RxJS', 'Angular Material', 'TypeScript', 'REST APIs'],
    });

    expect(gap.matchedSkills).toEqual(expect.arrayContaining(['TypeScript', 'REST API']));
    expect(gap.missingSkills).toEqual(
      expect.arrayContaining(['Angular', 'RxJS', 'Angular Material']),
    );
    expect(gap.crossDomain).toBe(false);
  });
});
