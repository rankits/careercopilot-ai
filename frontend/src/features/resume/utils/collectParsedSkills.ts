const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const texts = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const splitSkillText = (value: string) =>
  value
    .split(/[,|;\n/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const SKILL_OBJECT_KEYS = [
  'technical',
  'tools',
  'frameworks',
  'softSkills',
  'soft_skills',
  'domains',
  'coreSkills',
  'core_skills',
  'coreCompetencies',
  'core_competencies',
  'competencies',
  'core',
  'backend',
  'frontend',
  'data',
  'cloudDevops',
  'cloud_devops',
  'practices',
  'backendTechnologies',
  'backend_technologies',
  'frontendTechnologies',
  'frontend_technologies',
  'database',
  'databases',
] as const;

/** Collects skill tokens from parser output (grouped object, array, or string). */
export const collectParsedSkills = (skillsValue: unknown): string[] => {
  if (Array.isArray(skillsValue)) {
    return skillsValue.flatMap((item) => {
      if (typeof item === 'string') return splitSkillText(item);
      if (isRecord(item)) {
        const label = item.name ?? item.label ?? item.skill;
        return typeof label === 'string' ? splitSkillText(label) : [];
      }
      return [];
    });
  }

  if (typeof skillsValue === 'string') {
    return splitSkillText(skillsValue);
  }

  if (!isRecord(skillsValue)) {
    return [];
  }

  return SKILL_OBJECT_KEYS.flatMap((key) => {
    const entry = skillsValue[key];
    if (typeof entry === 'string') return splitSkillText(entry);
    return texts(entry);
  });
};
