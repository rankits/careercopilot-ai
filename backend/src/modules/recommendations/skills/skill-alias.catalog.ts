export interface CuratedSkillAlias {
  canonical: string;
  aliases: string[];
}

export const CURATED_SKILL_ALIASES: readonly CuratedSkillAlias[] = [
  { canonical: 'Node.js', aliases: ['NodeJS', 'Node JS', 'node.js'] },
  { canonical: 'PostgreSQL', aliases: ['Postgres', 'PostgreSQL'] },
  { canonical: 'TypeScript', aliases: ['Typescript', 'TS'] },
  { canonical: 'JavaScript', aliases: ['Javascript', 'JS'] },
  { canonical: 'React', aliases: ['React.js', 'ReactJS'] },
  { canonical: 'Amazon Web Services', aliases: ['AWS'] },
  { canonical: 'Express', aliases: ['Express.js', 'ExpressJS'] },
  { canonical: 'Next.js', aliases: ['NextJS', 'Next JS'] },
  { canonical: 'MySQL', aliases: ['Mysql'] },
  { canonical: 'Google Cloud Platform', aliases: ['GCP', 'Google Cloud'] },
];
