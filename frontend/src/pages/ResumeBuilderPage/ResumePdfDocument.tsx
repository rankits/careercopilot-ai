import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import type { ResumeDraft, ResumeTemplateId } from './utils';
import { formatDateRange } from './utils';

/** Shared bullet cleanup with ResumeTemplatePreview. */
function toBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) =>
      line
        .replace(/^[\s|]*[-*•●·▪▸►]+[\s·.•]*/g, '')
        .replace(/^[\s·.•]+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .filter(
      (line) => !/^responsibilities:?$/i.test(line) && !/^tech\s*(used|stack):?$/i.test(line),
    );
}

const THEME: Record<
  ResumeTemplateId,
  {
    accent: string;
    accentSoft: string;
    skillBg: string;
    skillText: string;
    skillBorder: string;
    nameSize: number;
    headerBg?: string;
    sidebarBg?: string;
    centered?: boolean;
    serif?: boolean;
  }
> = {
  original: {
    accent: '#2563eb',
    accentSoft: '#bfdbfe',
    skillBg: '#eff6ff',
    skillText: '#1d4ed8',
    skillBorder: '#93c5fd',
    nameSize: 18,
  },
  classic: {
    accent: '#0f172a',
    accentSoft: '#cbd5e1',
    skillBg: '#f1f5f9',
    skillText: '#334155',
    skillBorder: '#cbd5e1',
    nameSize: 22,
    centered: true,
    serif: true,
  },
  modern: {
    accent: '#0f766e',
    accentSoft: '#99f6e4',
    skillBg: '#ccfbf1',
    skillText: '#0f766e',
    skillBorder: '#5eead4',
    nameSize: 22,
    headerBg: '#0f766e',
  },
  minimal: {
    accent: '#111827',
    accentSoft: '#d1d5db',
    skillBg: '#f3f4f6',
    skillText: '#111827',
    skillBorder: '#e5e7eb',
    nameSize: 20,
  },
  executive: {
    accent: '#0f172a',
    accentSoft: '#e2e8f0',
    skillBg: '#1e293b',
    skillText: '#e2e8f0',
    skillBorder: 'rgba(147,197,253,0.25)',
    nameSize: 16,
    sidebarBg: '#0f172a',
  },
};

function buildStyles(template: ResumeTemplateId) {
  const theme = THEME[template] ?? THEME.classic;
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 36,
      fontSize: 10,
      fontFamily: theme.serif ? 'Times-Roman' : 'Helvetica',
      color: '#0f172a',
    },
    pageFlush: {
      padding: 0,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: '#0f172a',
    },
    name: {
      fontSize: theme.nameSize,
      fontFamily: theme.serif ? 'Times-Bold' : 'Helvetica-Bold',
      marginBottom: 4,
      textAlign: theme.centered ? 'center' : 'left',
    },
    role: {
      fontSize: 11,
      color: theme.accent,
      marginBottom: 6,
      textAlign: theme.centered ? 'center' : 'left',
      fontFamily: 'Helvetica',
    },
    contact: {
      fontSize: 9,
      color: '#475569',
      marginBottom: 14,
      textAlign: theme.centered ? 'center' : 'left',
      fontFamily: 'Helvetica',
    },
    section: { marginBottom: 4 },
    heading: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: theme.accent,
      borderBottomWidth: 1.5,
      borderBottomColor: theme.accentSoft,
      paddingBottom: 3,
      marginTop: 10,
      marginBottom: 6,
    },
    body: { fontSize: 10, lineHeight: 1.45, marginBottom: 4, fontFamily: 'Helvetica' },
    entry: { marginBottom: 8 },
    entryTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    entryCompany: { fontSize: 9, color: '#475569', marginTop: 1 },
    entryMeta: { fontSize: 9, color: '#64748b', marginBottom: 3 },
    entryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 2,
    },
    bullet: {
      fontSize: 10,
      marginLeft: 8,
      marginBottom: 2,
      lineHeight: 1.4,
      fontFamily: 'Helvetica',
    },
    skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    skill: {
      fontSize: 8,
      backgroundColor: theme.skillBg,
      color: theme.skillText,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: theme.skillBorder,
      fontFamily: 'Helvetica',
    },
    modernHeader: {
      backgroundColor: theme.headerBg || theme.accent,
      color: '#ffffff',
      paddingTop: 28,
      paddingBottom: 22,
      paddingHorizontal: 36,
      marginBottom: 8,
    },
    modernHeaderName: {
      fontSize: theme.nameSize,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      marginBottom: 4,
    },
    modernHeaderRole: { fontSize: 11, color: 'rgba(255,255,255,0.92)', marginBottom: 6 },
    modernHeaderContact: { fontSize: 9, color: 'rgba(255,255,255,0.82)' },
    modernBody: { paddingHorizontal: 36, paddingBottom: 36 },
    execLayout: { flexDirection: 'row', minHeight: '100%' },
    sidebar: {
      width: '28%',
      backgroundColor: theme.sidebarBg || '#0f172a',
      color: '#e2e8f0',
      paddingTop: 28,
      paddingBottom: 28,
      paddingHorizontal: 18,
    },
    sidebarName: {
      fontSize: theme.nameSize,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      marginBottom: 4,
    },
    sidebarRole: { fontSize: 10, color: '#cbd5e1', marginBottom: 10 },
    sidebarContact: { fontSize: 8, color: '#94a3b8', marginBottom: 14 },
    sidebarHeading: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#93c5fd',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(147,197,253,0.25)',
      paddingBottom: 3,
      marginTop: 12,
      marginBottom: 6,
    },
    sidebarBody: { fontSize: 8, color: '#e2e8f0', lineHeight: 1.4 },
    sidebarSkill: {
      fontSize: 7,
      color: '#e2e8f0',
      backgroundColor: '#1e293b',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
      marginRight: 3,
      marginBottom: 3,
    },
    main: {
      width: '72%',
      paddingTop: 28,
      paddingBottom: 28,
      paddingHorizontal: 24,
    },
  });
}

function EntryBlock({
  entry,
  styles,
  showCompanyLine,
}: {
  entry: ResumeDraft['experiences'][number];
  styles: ReturnType<typeof buildStyles>;
  showCompanyLine?: boolean;
}) {
  const bullets = toBullets(entry.details);
  return (
    <View style={styles.entry} wrap={false} minPresenceAhead={48}>
      <View style={styles.entryTop}>
        <View>
          <Text style={styles.entryTitle}>{entry.title || 'Role'}</Text>
          {showCompanyLine && entry.company ? (
            <Text style={styles.entryCompany}>{entry.company}</Text>
          ) : null}
        </View>
        <Text style={styles.entryMeta}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
      </View>
      {!showCompanyLine && entry.company ? (
        <Text style={styles.entryMeta}>{entry.company}</Text>
      ) : null}
      {bullets.map((line, index) => (
        <Text key={`${entry.id}-${index}`} style={styles.bullet}>
          • {line}
        </Text>
      ))}
    </View>
  );
}

function MainBody({
  draft,
  styles,
  omitSkills,
  omitEducation,
}: {
  draft: ResumeDraft;
  styles: ReturnType<typeof buildStyles>;
  omitSkills?: boolean;
  omitEducation?: boolean;
}) {
  return (
    <>
      {draft.summary ? (
        <View style={styles.section} wrap={false}>
          <Text style={styles.heading}>Professional Summary</Text>
          <Text style={styles.body}>{draft.summary}</Text>
        </View>
      ) : null}

      {!omitSkills && draft.skillsList.length > 0 ? (
        <View style={styles.section} wrap={false}>
          <Text style={styles.heading}>Skills</Text>
          <View style={styles.skills}>
            {draft.skillsList.map((skill) => (
              <Text key={skill} style={styles.skill}>
                {skill}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {draft.experiences.some((item) => item.title || item.company || item.details) ? (
        <View style={styles.section}>
          <Text style={styles.heading} minPresenceAhead={40}>
            Work Experience
          </Text>
          {draft.experiences
            .filter((item) => item.title || item.company || item.details)
            .map((entry) => (
              <EntryBlock key={entry.id} entry={entry} styles={styles} showCompanyLine />
            ))}
        </View>
      ) : null}

      {draft.projectsList.some((item) => item.title || item.details) ? (
        <View style={styles.section}>
          <Text style={styles.heading} minPresenceAhead={40}>
            Projects
          </Text>
          {draft.projectsList
            .filter((item) => item.title || item.company || item.details)
            .map((entry) => (
              <EntryBlock key={entry.id} entry={entry} styles={styles} showCompanyLine />
            ))}
        </View>
      ) : null}

      {!omitEducation && draft.education ? (
        <View style={styles.section} wrap={false} minPresenceAhead={40}>
          <Text style={styles.heading}>Education</Text>
          <Text style={styles.body}>{draft.education}</Text>
        </View>
      ) : null}

      {draft.certifications ? (
        <View style={styles.section} wrap={false} minPresenceAhead={40}>
          <Text style={styles.heading}>Certifications</Text>
          <Text style={styles.body}>{draft.certifications}</Text>
        </View>
      ) : null}

      {draft.achievements ? (
        <View style={styles.section} wrap={false} minPresenceAhead={40}>
          <Text style={styles.heading}>Achievements</Text>
          <Text style={styles.body}>{draft.achievements}</Text>
        </View>
      ) : null}

      {draft.customFields
        .filter((field) => field.label || field.value)
        .map((field) => (
          <View key={field.id} style={styles.section} wrap={false} minPresenceAhead={40}>
            <Text style={styles.heading}>{field.label || 'Additional'}</Text>
            <Text style={styles.body}>{field.value}</Text>
          </View>
        ))}
    </>
  );
}

export function ResumePdfDocument({
  draft,
  template,
}: {
  draft: ResumeDraft;
  template: ResumeTemplateId;
}) {
  const styles = buildStyles(template);
  const contactParts = [draft.email, draft.phone, draft.location, draft.linkedin].filter(Boolean);
  const contact = contactParts.join('  |  ');
  const role = draft.role || 'Professional';

  if (template === 'modern') {
    return (
      <Document>
        <Page size="A4" style={styles.pageFlush} wrap>
          <View style={styles.modernHeader} wrap={false}>
            <Text style={styles.modernHeaderName}>{draft.fullName || 'Resume'}</Text>
            <Text style={styles.modernHeaderRole}>{role}</Text>
            {contact ? <Text style={styles.modernHeaderContact}>{contact}</Text> : null}
          </View>
          <View style={styles.modernBody}>
            <MainBody draft={draft} styles={styles} />
          </View>
        </Page>
      </Document>
    );
  }

  if (template === 'executive') {
    return (
      <Document>
        <Page size="A4" style={styles.pageFlush} wrap>
          <View style={styles.execLayout}>
            <View style={styles.sidebar}>
              <Text style={styles.sidebarName}>{draft.fullName || 'Resume'}</Text>
              <Text style={styles.sidebarRole}>{role}</Text>
              {contact ? <Text style={styles.sidebarContact}>{contact}</Text> : null}
              {draft.skillsList.length > 0 ? (
                <View>
                  <Text style={styles.sidebarHeading}>Skills</Text>
                  <View style={styles.skills}>
                    {draft.skillsList.map((skill) => (
                      <Text key={skill} style={styles.sidebarSkill}>
                        {skill}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
              {draft.education ? (
                <View>
                  <Text style={styles.sidebarHeading}>Education</Text>
                  <Text style={styles.sidebarBody}>{draft.education}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.main}>
              <MainBody draft={draft} styles={styles} omitSkills omitEducation />
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View wrap={false}>
          <Text style={styles.name}>{draft.fullName || 'Resume'}</Text>
          <Text style={styles.role}>{role}</Text>
          {contact ? <Text style={styles.contact}>{contact}</Text> : null}
        </View>
        <MainBody draft={draft} styles={styles} />
      </Page>
    </Document>
  );
}
