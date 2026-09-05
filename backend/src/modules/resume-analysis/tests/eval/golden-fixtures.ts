import type { SkillAnalysis } from '@/modules/resume-analysis/types/resume-analysis.types.js';

/**
 * Tiny deterministic resume+JD fixtures for ATS scoring evals.
 * Scores come from local `scoreEditedResume` — never live AI.
 */
export type GoldenEvalFixture = {
  id: string;
  resume: string;
  jobDescription: string;
  targetRole: string;
  keywords: Array<{ term: string; status: string; importance: string }>;
  skillAnalysis: SkillAnalysis;
  /** Expected baseline score band (inclusive). */
  expected: {
    atsScoreMin: number;
    atsScoreMax: number;
    skillMatchMin: number;
    skillMatchMax: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
};

const emptySkills = (partial: Partial<SkillAnalysis> = {}): SkillAnalysis => ({
  matchedSkills: [],
  missingSkills: [],
  transferableSkills: [],
  additionalSkills: [],
  recommendedSkills: [],
  ...partial,
});

export const GOLDEN_EVAL_FIXTURES: GoldenEvalFixture[] = [
  {
    id: 'fe-strong-match',
    targetRole: 'Frontend Engineer',
    jobDescription:
      'Frontend Engineer with React, TypeScript, and CSS. Build accessible product UIs.',
    resume: `
Jane Doe
Frontend Engineer
SUMMARY
React and TypeScript developer shipping accessible product UI.
EXPERIENCE
Acme — Frontend Engineer
- Built design system in React and TypeScript
SKILLS
React, TypeScript, CSS, HTML, JavaScript
EDUCATION
B.S. Computer Science
`.trim(),
    keywords: [
      { term: 'React', status: 'MATCHED', importance: 'HIGH' },
      { term: 'TypeScript', status: 'MATCHED', importance: 'HIGH' },
      { term: 'CSS', status: 'MATCHED', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['React', 'TypeScript', 'CSS'],
      missingSkills: [],
      recommendedSkills: [],
    }),
    expected: {
      atsScoreMin: 55,
      atsScoreMax: 95,
      skillMatchMin: 70,
      skillMatchMax: 100,
      matchedSkills: ['React', 'TypeScript', 'CSS'],
      missingSkills: [],
    },
  },
  {
    id: 'fe-missing-typescript',
    targetRole: 'Frontend Engineer',
    jobDescription: 'Need React and TypeScript for SPA work.',
    resume: `
Sam Lee
Frontend Developer
EXPERIENCE
ShopCo — FE Dev
- Built React pages with JavaScript
SKILLS
React, JavaScript, HTML, CSS
`.trim(),
    keywords: [
      { term: 'React', status: 'MATCHED', importance: 'HIGH' },
      { term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['React'],
      missingSkills: ['TypeScript'],
      recommendedSkills: ['TypeScript'],
    }),
    expected: {
      atsScoreMin: 35,
      atsScoreMax: 80,
      skillMatchMin: 30,
      skillMatchMax: 70,
      matchedSkills: ['React'],
      missingSkills: ['TypeScript'],
    },
  },
  {
    id: 'be-node-match',
    targetRole: 'Backend Engineer',
    jobDescription: 'Backend Engineer: Node.js, PostgreSQL, REST APIs.',
    resume: `
Alex Kim
Backend Engineer
EXPERIENCE
DataPipe — Backend
- Built REST APIs in Node.js with PostgreSQL
SKILLS
Node.js, PostgreSQL, Express, REST
`.trim(),
    keywords: [
      { term: 'Node.js', status: 'MATCHED', importance: 'HIGH' },
      { term: 'PostgreSQL', status: 'MATCHED', importance: 'HIGH' },
      { term: 'REST', status: 'MATCHED', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['Node.js', 'PostgreSQL'],
      missingSkills: [],
    }),
    expected: {
      atsScoreMin: 55,
      atsScoreMax: 95,
      skillMatchMin: 70,
      skillMatchMax: 100,
      matchedSkills: ['Node.js', 'PostgreSQL'],
      missingSkills: [],
    },
  },
  {
    id: 'cross-domain-nurse-vs-fe',
    targetRole: 'Frontend Engineer',
    jobDescription: 'Frontend Engineer with React and TypeScript.',
    resume: `
Pat Smith
Registered Nurse
EXPERIENCE
City Hospital — RN
- Patient care and triage
SKILLS
Patient care, Triage, EHR
`.trim(),
    keywords: [
      { term: 'React', status: 'MISSING', importance: 'HIGH' },
      { term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: [],
      missingSkills: ['React', 'TypeScript'],
      recommendedSkills: ['React', 'TypeScript'],
    }),
    expected: {
      atsScoreMin: 0,
      atsScoreMax: 55,
      skillMatchMin: 0,
      skillMatchMax: 24,
      matchedSkills: [],
      missingSkills: ['React', 'TypeScript'],
    },
  },
  {
    id: 'data-python-partial',
    targetRole: 'Data Analyst',
    jobDescription: 'Data Analyst: Python, SQL, Tableau, statistics.',
    resume: `
Riley Chen
Data Analyst
EXPERIENCE
MetricsCo — Analyst
- Analyzed datasets with Python and SQL
SKILLS
Python, SQL, Excel
`.trim(),
    keywords: [
      { term: 'Python', status: 'MATCHED', importance: 'HIGH' },
      { term: 'SQL', status: 'MATCHED', importance: 'HIGH' },
      { term: 'Tableau', status: 'MISSING', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['Python', 'SQL'],
      missingSkills: ['Tableau'],
      recommendedSkills: ['Tableau'],
    }),
    expected: {
      atsScoreMin: 40,
      atsScoreMax: 85,
      skillMatchMin: 45,
      skillMatchMax: 85,
      matchedSkills: ['Python', 'SQL'],
      missingSkills: ['Tableau'],
    },
  },
  {
    id: 'devops-k8s-match',
    targetRole: 'DevOps Engineer',
    jobDescription: 'DevOps: Kubernetes, Docker, CI/CD, AWS.',
    resume: `
Jordan Park
DevOps Engineer
EXPERIENCE
CloudOps — DevOps
- Ran Kubernetes and Docker pipelines on AWS
SKILLS
Kubernetes, Docker, AWS, CI/CD, Terraform
`.trim(),
    keywords: [
      { term: 'Kubernetes', status: 'MATCHED', importance: 'HIGH' },
      { term: 'Docker', status: 'MATCHED', importance: 'HIGH' },
      { term: 'AWS', status: 'MATCHED', importance: 'HIGH' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['Kubernetes', 'Docker', 'AWS'],
      missingSkills: [],
    }),
    expected: {
      atsScoreMin: 55,
      atsScoreMax: 95,
      skillMatchMin: 70,
      skillMatchMax: 100,
      matchedSkills: ['Kubernetes', 'Docker', 'AWS'],
      missingSkills: [],
    },
  },
  {
    id: 'mobile-swift-gap',
    targetRole: 'iOS Engineer',
    jobDescription: 'iOS Engineer: Swift, UIKit, SwiftUI.',
    resume: `
Casey Ng
Mobile Developer
EXPERIENCE
AppLab — Android
- Built Android apps in Kotlin
SKILLS
Kotlin, Android, Java
`.trim(),
    keywords: [
      { term: 'Swift', status: 'MISSING', importance: 'HIGH' },
      { term: 'UIKit', status: 'MISSING', importance: 'MEDIUM' },
      { term: 'SwiftUI', status: 'MISSING', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: [],
      missingSkills: ['Swift', 'UIKit', 'SwiftUI'],
      recommendedSkills: ['Swift', 'SwiftUI'],
    }),
    expected: {
      atsScoreMin: 0,
      atsScoreMax: 50,
      skillMatchMin: 0,
      skillMatchMax: 25,
      matchedSkills: [],
      missingSkills: ['Swift', 'UIKit', 'SwiftUI'],
    },
  },
  {
    id: 'pm-soft-skills',
    targetRole: 'Product Manager',
    jobDescription: 'Product Manager: roadmap, stakeholder management, Agile, analytics.',
    resume: `
Morgan Ellis
Product Manager
EXPERIENCE
ProdCo — PM
- Owned roadmap and stakeholder management in Agile teams
- Used analytics to prioritize features
SKILLS
Roadmap, Agile, Analytics, Stakeholder management
`.trim(),
    keywords: [
      { term: 'roadmap', status: 'MATCHED', importance: 'HIGH' },
      { term: 'Agile', status: 'MATCHED', importance: 'HIGH' },
      { term: 'analytics', status: 'MATCHED', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['Roadmap', 'Agile', 'Analytics'],
      missingSkills: [],
    }),
    expected: {
      atsScoreMin: 50,
      atsScoreMax: 95,
      skillMatchMin: 65,
      skillMatchMax: 100,
      matchedSkills: ['Roadmap', 'Agile', 'Analytics'],
      missingSkills: [],
    },
  },
  {
    id: 'empty-resume-vs-jd',
    targetRole: 'Software Engineer',
    jobDescription: 'Software Engineer with Java and Spring Boot.',
    resume: 'Name Only\nLooking for opportunities.',
    keywords: [
      { term: 'Java', status: 'MISSING', importance: 'HIGH' },
      { term: 'Spring Boot', status: 'MISSING', importance: 'HIGH' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: [],
      missingSkills: ['Java', 'Spring Boot'],
      recommendedSkills: ['Java', 'Spring Boot'],
    }),
    expected: {
      atsScoreMin: 0,
      atsScoreMax: 45,
      skillMatchMin: 0,
      skillMatchMax: 20,
      matchedSkills: [],
      missingSkills: ['Java', 'Spring Boot'],
    },
  },
  {
    id: 'fullstack-partial',
    targetRole: 'Full Stack Engineer',
    jobDescription: 'Full Stack: React, Node.js, GraphQL, PostgreSQL.',
    resume: `
Taylor Brooks
Full Stack Engineer
EXPERIENCE
WebWorks — Full Stack
- React frontends and Node.js APIs
SKILLS
React, Node.js, JavaScript, MongoDB
`.trim(),
    keywords: [
      { term: 'React', status: 'MATCHED', importance: 'HIGH' },
      { term: 'Node.js', status: 'MATCHED', importance: 'HIGH' },
      { term: 'GraphQL', status: 'MISSING', importance: 'MEDIUM' },
      { term: 'PostgreSQL', status: 'MISSING', importance: 'MEDIUM' },
    ],
    skillAnalysis: emptySkills({
      matchedSkills: ['React', 'Node.js'],
      missingSkills: ['GraphQL', 'PostgreSQL'],
      recommendedSkills: ['GraphQL', 'PostgreSQL'],
    }),
    expected: {
      atsScoreMin: 40,
      atsScoreMax: 85,
      skillMatchMin: 35,
      skillMatchMax: 75,
      matchedSkills: ['React', 'Node.js'],
      missingSkills: ['GraphQL', 'PostgreSQL'],
    },
  },
];
