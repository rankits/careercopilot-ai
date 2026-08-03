export const SKILL_RELATIONSHIP_TYPES = ['RELATED', 'TRANSFERABLE'] as const;
export type SkillRelationshipType = (typeof SKILL_RELATIONSHIP_TYPES)[number];

export interface CuratedSkillRelationship {
  from: string;
  to: string;
  type: SkillRelationshipType;
}

export const CURATED_SKILL_RELATIONSHIPS: readonly CuratedSkillRelationship[] = [
  { from: 'Node.js', to: 'Express', type: 'RELATED' },
  { from: 'Express', to: 'Node.js', type: 'RELATED' },
  { from: 'React', to: 'Next.js', type: 'RELATED' },
  { from: 'Next.js', to: 'React', type: 'RELATED' },
  { from: 'PostgreSQL', to: 'MySQL', type: 'RELATED' },
  { from: 'MySQL', to: 'PostgreSQL', type: 'RELATED' },
  { from: 'TypeScript', to: 'JavaScript', type: 'TRANSFERABLE' },
  { from: 'JavaScript', to: 'TypeScript', type: 'TRANSFERABLE' },
  { from: 'Amazon Web Services', to: 'Google Cloud Platform', type: 'TRANSFERABLE' },
  { from: 'Google Cloud Platform', to: 'Amazon Web Services', type: 'TRANSFERABLE' },
];
