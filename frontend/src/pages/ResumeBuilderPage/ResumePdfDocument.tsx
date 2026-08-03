import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import type { ResumeDraft, ResumeTemplateId } from './utils';
import { formatDateRange } from './utils';

const THEME: Record<
  ResumeTemplateId,
  { accent: string; accentSoft: string; skillBg: string; skillText: string; nameSize: number }
> = {
  original: {
    accent: '#334155',
    accentSoft: '#cbd5e1',
    skillBg: '#f1f5f9',
    skillText: '#334155',
    nameSize: 18,
  },
  classic: {
    accent: '#4f46e5',
    accentSoft: '#c7d2fe',
    skillBg: '#eef2ff',
    skillText: '#4338ca',
    nameSize: 20,
  },
  modern: {
    accent: '#0f766e',
    accentSoft: '#99f6e4',
    skillBg: '#ccfbf1',
    skillText: '#0f766e',
    nameSize: 22,
  },
  minimal: {
    accent: '#111827',
    accentSoft: '#e5e7eb',
    skillBg: '#f3f4f6',
    skillText: '#111827',
    nameSize: 18,
  },
  executive: {
    accent: '#9a3412',
    accentSoft: '#fed7aa',
    skillBg: '#ffedd5',
    skillText: '#9a3412',
    nameSize: 21,
  },
};

function buildStyles(template: ResumeTemplateId) {
  const theme = THEME[template] ?? THEME.classic;
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: '#0f172a',
    },
    name: { fontSize: theme.nameSize, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
    role: { fontSize: 11, color: theme.accent, marginBottom: 6 },
    contact: { fontSize: 9, color: '#475569', marginBottom: 14 },
    heading: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: theme.accent,
      borderBottomWidth: 1,
      borderBottomColor: theme.accentSoft,
      paddingBottom: 3,
      marginTop: 10,
      marginBottom: 6,
    },
    body: { fontSize: 10, lineHeight: 1.45, marginBottom: 4 },
    entryTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    entryMeta: { fontSize: 9, color: '#64748b', marginBottom: 3 },
    bullet: { fontSize: 10, marginLeft: 8, marginBottom: 2, lineHeight: 1.4 },
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
    },
  });
}

export function ResumePdfDocument({
  draft,
  template,
}: {
  draft: ResumeDraft;
  template: ResumeTemplateId;
}) {
  const styles = buildStyles(template);
  const contact = [draft.email, draft.phone, draft.location, draft.linkedin]
    .filter(Boolean)
    .join('  |  ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{draft.fullName || 'Resume'}</Text>
        {draft.role ? <Text style={styles.role}>{draft.role}</Text> : null}
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}

        {draft.summary ? (
          <View>
            <Text style={styles.heading}>Profile Summary</Text>
            <Text style={styles.body}>{draft.summary}</Text>
          </View>
        ) : null}

        {draft.experiences.some((item) => item.title || item.company || item.details) ? (
          <View>
            <Text style={styles.heading}>Work Experience</Text>
            {draft.experiences
              .filter((item) => item.title || item.company || item.details)
              .map((entry) => (
                <View key={entry.id} wrap={false}>
                  <Text style={styles.entryTitle}>
                    {[entry.title, entry.company].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {formatDateRange(entry.startDate, entry.endDate)}
                  </Text>
                  {entry.details
                    .split(/\n/)
                    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                    .filter(Boolean)
                    .map((line, index) => (
                      <Text key={`${entry.id}-${index}`} style={styles.bullet}>
                        • {line}
                      </Text>
                    ))}
                </View>
              ))}
          </View>
        ) : null}

        {draft.skillsList.length > 0 ? (
          <View>
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

        {draft.projectsList.some((item) => item.title || item.details) ? (
          <View>
            <Text style={styles.heading}>Projects</Text>
            {draft.projectsList
              .filter((item) => item.title || item.details)
              .map((entry) => (
                <View key={entry.id} wrap={false}>
                  <Text style={styles.entryTitle}>
                    {[entry.title, entry.company].filter(Boolean).join(' · ')}
                  </Text>
                  {entry.details
                    .split(/\n/)
                    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                    .filter(Boolean)
                    .map((line, index) => (
                      <Text key={`${entry.id}-${index}`} style={styles.bullet}>
                        • {line}
                      </Text>
                    ))}
                </View>
              ))}
          </View>
        ) : null}

        {draft.education ? (
          <View>
            <Text style={styles.heading}>Education</Text>
            <Text style={styles.body}>{draft.education}</Text>
          </View>
        ) : null}

        {draft.customFields
          .filter((field) => field.label || field.value)
          .map((field) => (
            <View key={field.id}>
              <Text style={styles.heading}>{field.label || 'Additional'}</Text>
              <Text style={styles.body}>{field.value}</Text>
            </View>
          ))}
      </Page>
    </Document>
  );
}
