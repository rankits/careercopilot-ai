export type ResumeSectionId =
  | 'summary'
  | 'experience'
  | 'skills'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'achievements';

export type ResumeTemplateId = 'original' | 'classic' | 'modern' | 'minimal' | 'executive';

export type ExperienceEntry = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  details: string;
};

export type ProjectEntry = {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  details: string;
};

export type CustomField = {
  id: string;
  label: string;
  value: string;
};

export type ResumeDraft = {
  originalText: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  role: string;
  summary: string;
  education: string;
  certifications: string;
  achievements: string;
  skillsList: string[];
  experiences: ExperienceEntry[];
  projectsList: ProjectEntry[];
  customFields: CustomField[];
};

export const RESUME_TEMPLATES: Array<{
  id: ResumeTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: 'original',
    label: 'Default',
    description: 'Your resume content in a clean document layout',
  },
  { id: 'classic', label: 'Classic', description: 'Clean ATS-friendly single column' },
  { id: 'modern', label: 'Modern', description: 'Bold gradient header layout' },
  { id: 'minimal', label: 'Minimal', description: 'Tight spacing, quiet type' },
  { id: 'executive', label: 'Executive', description: 'Two-tone sidebar layout' },
];

export const RESUME_SECTIONS: Array<{ id: ResumeSectionId; label: string; tip: string }> = [
  {
    id: 'summary',
    label: 'Profile Summary',
    tip: 'Lead with your role, years of experience, and the value you deliver.',
  },
  {
    id: 'experience',
    label: 'Work Experience',
    tip: 'Add each company with title, dates, and bullet details.',
  },
  {
    id: 'skills',
    label: 'Skills',
    tip: 'List skills separated by commas.',
  },
  {
    id: 'education',
    label: 'Education',
    tip: 'Keep education concise with degree, school, and year.',
  },
  {
    id: 'projects',
    label: 'Projects',
    tip: 'Title, company/client, dates, and details.',
  },
  {
    id: 'certifications',
    label: 'Certifications',
    tip: 'List certifications that reinforce your target role.',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    tip: 'Call out awards or metrics that prove results.',
  },
];

export const SECTION_ALIASES: Record<ResumeSectionId, RegExp> = {
  summary:
    /^(professional\s+)?summary$|^profile(\s+summary)?$|^objective$|^about(\s+me)?$|^career\s+summary$|^professional\s+profile$/i,
  experience:
    /^(work\s+)?experience$|^employment(\s+history)?$|^work\s+history$|^professional\s+experience$|^career\s+history$|^professional\s+background$|^relevant\s+experience$/i,
  skills:
    /^skills$|^technical\s+skills$|^core\s+competencies$|^technologies$|^tech\s+stack$|^tools(\s+&\s+technologies)?$|^technical\s+proficiencies$|^key\s+skills$/i,
  education: /^education$|^academic(\s+background)?$|^qualifications$|^academic\s+qualifications$/i,
  projects:
    /^projects?$|^personal\s+projects$|^key\s+projects$|^selected\s+projects$|^academic\s+projects$/i,
  certifications: /^certifications?$|^licenses?$|^certificates?$|^professional\s+certifications?$/i,
  achievements: /^achievements?$|^awards?$|^accomplishments?$|^honors?(\s+&\s+awards)?$/i,
};

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
