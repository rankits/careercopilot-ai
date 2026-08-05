import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms';

import { AddIcon, Box, DeleteOutlineIcon, IconButton, TextField, Typography } from '@/lib/material';

import type {
  CustomField,
  ExperienceEntry,
  ProjectEntry,
  ResumeDraft,
  ResumeSectionId,
} from '../../utils';
import {
  createEmptyCustomField,
  createEmptyExperience,
  createEmptyProject,
  mergeSkillLists,
  splitSkillTokens,
} from '../../utils';

import {
  EntryCard,
  EntryGrid,
  FieldLabel,
  ScrollableEntries,
  SectionEditorShell,
  SkillSuggestionRow,
  scrollableMultilineSx,
} from './editor.styles';

interface SectionEditorProps {
  section: ResumeSectionId;
  draft: ResumeDraft;
  recommendedSkills?: string[];
  onChange: (next: ResumeDraft) => void;
}

export function SectionEditor({
  section,
  draft,
  recommendedSkills = [],
  onChange,
}: SectionEditorProps) {
  return (
    <SectionEditorShell>
      <ContactEditor draft={draft} onChange={onChange} />

      {section === 'skills' ? (
        <SkillsTextEditor draft={draft} recommendedSkills={recommendedSkills} onChange={onChange} />
      ) : section === 'experience' ? (
        <ExperienceEditor draft={draft} onChange={onChange} />
      ) : section === 'projects' ? (
        <ProjectsEditor draft={draft} onChange={onChange} />
      ) : (
        <TextField
          fullWidth
          multiline
          rows={section === 'summary' ? 6 : 5}
          label={`Edit ${section}`}
          value={draft[section]}
          onChange={(event) => onChange({ ...draft, [section]: event.target.value })}
          sx={scrollableMultilineSx}
        />
      )}

      <CustomFieldsEditor draft={draft} onChange={onChange} />
    </SectionEditorShell>
  );
}

function ContactEditor({
  draft,
  onChange,
}: {
  draft: ResumeDraft;
  onChange: (next: ResumeDraft) => void;
}) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <FieldLabel>Contact & headline</FieldLabel>
      <EntryGrid>
        <TextField
          size="small"
          label="Full name"
          value={draft.fullName}
          onChange={(event) => onChange({ ...draft, fullName: event.target.value })}
        />
        <TextField
          size="small"
          label="Target / headline role"
          value={draft.role}
          onChange={(event) => onChange({ ...draft, role: event.target.value })}
        />
        <TextField
          size="small"
          label="Email"
          value={draft.email}
          onChange={(event) => onChange({ ...draft, email: event.target.value })}
        />
        <TextField
          size="small"
          label="Phone"
          value={draft.phone}
          onChange={(event) => onChange({ ...draft, phone: event.target.value })}
        />
        <TextField
          size="small"
          label="Location"
          value={draft.location}
          onChange={(event) => onChange({ ...draft, location: event.target.value })}
        />
        <TextField
          size="small"
          label="LinkedIn"
          value={draft.linkedin}
          onChange={(event) => onChange({ ...draft, linkedin: event.target.value })}
        />
      </EntryGrid>
    </Box>
  );
}

function SkillsTextEditor({
  draft,
  recommendedSkills = [],
  onChange,
}: {
  draft: ResumeDraft;
  recommendedSkills?: string[];
  onChange: (next: ResumeDraft) => void;
}) {
  const [text, setText] = useState(() => draft.skillsList.join(', '));

  useEffect(() => {
    setText(draft.skillsList.join(', '));
  }, [draft.skillsList]);

  const commitText = (raw: string) => {
    const nextSkills = mergeSkillLists(splitSkillTokens(raw));
    setText(nextSkills.join(', '));
    onChange({ ...draft, skillsList: nextSkills });
  };

  const addSkill = (skill: string) => {
    const nextSkills = mergeSkillLists(draft.skillsList, [skill]);
    setText(nextSkills.join(', '));
    onChange({ ...draft, skillsList: nextSkills });
  };

  const suggestions = mergeSkillLists(splitSkillTokens(recommendedSkills.join(', '))).filter(
    (skill) => !draft.skillsList.some((item) => item.toLowerCase() === skill.toLowerCase()),
  );

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <FieldLabel>Skills</FieldLabel>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Skills list"
        helperText="Separate with commas — e.g. React, Node.js, TypeScript"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => commitText(text)}
        sx={scrollableMultilineSx}
      />

      {suggestions.length > 0 ? (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <FieldLabel>Suggested from your JD (click to add)</FieldLabel>
          <SkillSuggestionRow>
            {suggestions.slice(0, 12).map((skill) => (
              <button key={skill} type="button" onClick={() => addSkill(skill)}>
                + {skill}
              </button>
            ))}
          </SkillSuggestionRow>
        </Box>
      ) : null}
    </Box>
  );
}

function ExperienceEditor({
  draft,
  onChange,
}: {
  draft: ResumeDraft;
  onChange: (next: ResumeDraft) => void;
}) {
  const placeholder = useMemo(() => createEmptyExperience(), []);
  const entries = draft.experiences.length > 0 ? draft.experiences : [placeholder];

  const commit = (next: ExperienceEntry[]) => onChange({ ...draft, experiences: next });

  const updateEntry = (id: string, patch: Partial<ExperienceEntry>) => {
    const base = draft.experiences.length > 0 ? draft.experiences : [placeholder];
    commit(base.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <FieldLabel>Companies / roles</FieldLabel>
      <ScrollableEntries>
        {entries.map((entry, index) => (
          <EntryCard key={entry.id}>
            <Box className="entry-head">
              <Typography className="entry-title">Company #{index + 1}</Typography>
              <IconButton
                size="small"
                aria-label="Remove company"
                onClick={() => {
                  const next = entries.filter((item) => item.id !== entry.id);
                  commit(next.length > 0 ? next : [createEmptyExperience()]);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
            <EntryGrid>
              <TextField
                size="small"
                label="Company"
                value={entry.company}
                onChange={(event) => updateEntry(entry.id, { company: event.target.value })}
              />
              <TextField
                size="small"
                label="Job title"
                value={entry.title}
                onChange={(event) => updateEntry(entry.id, { title: event.target.value })}
              />
              <TextField
                size="small"
                label="Start date"
                placeholder="Jan 2022"
                value={entry.startDate}
                onChange={(event) => updateEntry(entry.id, { startDate: event.target.value })}
              />
              <TextField
                size="small"
                label="End date"
                placeholder="Present"
                value={entry.endDate}
                onChange={(event) => updateEntry(entry.id, { endDate: event.target.value })}
              />
            </EntryGrid>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Role details / bullets"
              placeholder="One achievement per line"
              value={entry.details}
              onChange={(event) => updateEntry(entry.id, { details: event.target.value })}
              sx={scrollableMultilineSx}
            />
          </EntryCard>
        ))}
      </ScrollableEntries>
      <Button
        size="small"
        variant="outline"
        startIcon={<AddIcon fontSize="small" />}
        onClick={() =>
          commit([
            ...(draft.experiences.length > 0 ? draft.experiences : entries),
            createEmptyExperience(),
          ])
        }
      >
        Add company / role
      </Button>
    </Box>
  );
}

function ProjectsEditor({
  draft,
  onChange,
}: {
  draft: ResumeDraft;
  onChange: (next: ResumeDraft) => void;
}) {
  const placeholder = useMemo(() => createEmptyProject(), []);
  const entries = draft.projectsList.length > 0 ? draft.projectsList : [placeholder];

  const commit = (next: ProjectEntry[]) => onChange({ ...draft, projectsList: next });

  const updateEntry = (id: string, patch: Partial<ProjectEntry>) => {
    const base = draft.projectsList.length > 0 ? draft.projectsList : [placeholder];
    commit(base.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <FieldLabel>Projects</FieldLabel>
      <ScrollableEntries>
        {entries.map((entry, index) => (
          <EntryCard key={entry.id}>
            <Box className="entry-head">
              <Typography className="entry-title">Project #{index + 1}</Typography>
              <IconButton
                size="small"
                aria-label="Remove project"
                onClick={() => {
                  const next = entries.filter((item) => item.id !== entry.id);
                  commit(next.length > 0 ? next : [createEmptyProject()]);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
            <EntryGrid>
              <TextField
                size="small"
                label="Project title"
                value={entry.title}
                onChange={(event) => updateEntry(entry.id, { title: event.target.value })}
              />
              <TextField
                size="small"
                label="Company / client"
                value={entry.company}
                onChange={(event) => updateEntry(entry.id, { company: event.target.value })}
              />
              <TextField
                size="small"
                label="Start date"
                placeholder="Mar 2023"
                value={entry.startDate}
                onChange={(event) => updateEntry(entry.id, { startDate: event.target.value })}
              />
              <TextField
                size="small"
                label="End date"
                placeholder="Aug 2023"
                value={entry.endDate}
                onChange={(event) => updateEntry(entry.id, { endDate: event.target.value })}
              />
            </EntryGrid>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Project details"
              placeholder="What you built, stack, and impact — one line per point"
              value={entry.details}
              onChange={(event) => updateEntry(entry.id, { details: event.target.value })}
              sx={scrollableMultilineSx}
            />
          </EntryCard>
        ))}
      </ScrollableEntries>
      <Button
        size="small"
        variant="outline"
        startIcon={<AddIcon fontSize="small" />}
        onClick={() =>
          commit([
            ...(draft.projectsList.length > 0 ? draft.projectsList : entries),
            createEmptyProject(),
          ])
        }
      >
        Add project
      </Button>
    </Box>
  );
}

function CustomFieldsEditor({
  draft,
  onChange,
}: {
  draft: ResumeDraft;
  onChange: (next: ResumeDraft) => void;
}) {
  const updateField = (id: string, patch: Partial<CustomField>) => {
    onChange({
      ...draft,
      customFields: draft.customFields.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <FieldLabel>Extra fields</FieldLabel>
      {draft.customFields.map((field) => (
        <EntryCard key={field.id}>
          <Box className="entry-head">
            <Typography className="entry-title">Custom field</Typography>
            <IconButton
              size="small"
              aria-label="Remove field"
              onClick={() =>
                onChange({
                  ...draft,
                  customFields: draft.customFields.filter((item) => item.id !== field.id),
                })
              }
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          <EntryGrid>
            <TextField
              size="small"
              label="Label"
              placeholder="Languages / Interests / ..."
              value={field.label}
              onChange={(event) => updateField(field.id, { label: event.target.value })}
            />
            <TextField
              size="small"
              label="Value"
              value={field.value}
              onChange={(event) => updateField(field.id, { value: event.target.value })}
            />
          </EntryGrid>
        </EntryCard>
      ))}
      <Button
        size="small"
        variant="ghost"
        startIcon={<AddIcon fontSize="small" />}
        onClick={() =>
          onChange({
            ...draft,
            customFields: [...draft.customFields, createEmptyCustomField()],
          })
        }
      >
        Add extra field
      </Button>
    </Box>
  );
}
