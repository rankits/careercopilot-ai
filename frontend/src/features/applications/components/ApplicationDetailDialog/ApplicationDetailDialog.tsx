import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FilterDropdown } from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail';
import {
  useAddApplicationNote,
  useAddApplicationTask,
  useDeleteApplicationNote,
  useDeleteApplicationTask,
  useUpdateApplicationTask,
} from '@/features/applications/hooks/useApplicationMutations';

import {
  applicationDetailTabs,
  applicationNoteTypeOptions,
  applicationTaskTypeOptions,
  noteTypeDisplayConfig,
  type ApplicationDetailTab,
} from '@/constants/pages/applicationDetail';
import type {
  ApiApplicationStatus,
  ApiNoteType,
  ApiTaskType,
} from '@/features/applications/types/application.types';
import type { ApplicationRecord } from '@/features/applications/types/application.view.types';
import {
  archiveDisplayConfig,
  priorityDisplayConfig,
  sourceDisplayConfig,
  statusDisplayConfig,
} from '@/features/applications/utils/application.constants';
import {
  formatAbsoluteDate,
  formatDateTime,
  mapApiStatusToUi,
} from '@/features/applications/utils/applicationMappers';
import {
  AccessTimeOutlinedIcon,
  CheckCircleOutlineIcon,
  CloseIcon,
  DeleteOutlineIcon,
  HistoryOutlinedIcon,
  InsightsOutlinedIcon,
  Link,
  StickyNote2OutlinedIcon,
  TaskAltOutlinedIcon,
} from '@/lib/material';
import { palette } from '@/tokens';

import { LocationPinIcon, PriorityBadge, SourceBadge, StatusBadge } from '../../styles';
import {
  CloseButton,
  DialogEyebrow,
  DialogFooter,
  DialogFooterActions,
  DialogFooterNote,
  DialogHeader,
  DialogHeaderAccent,
  DialogHeaderContent,
  DialogSubtitle,
  DialogTitleGroup,
  DialogTitleText,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormGrid,
  JobFeedEmpty,
  JobFeedEmptyText,
  JobFeedEmptyTitle,
  SectionCard,
} from '../ApplicationDialog/styles';
import { InterestRating } from '../InterestRating';

import {
  DetailApplicationDialog,
  DetailDescription,
  DetailDialogBody,
  DetailMetaGrid,
  DetailMetaValue,
  DetailPanel,
  DetailPanelDescription,
  DetailPanelHeader,
  DetailPanelTitle,
  DetailTabBar,
  DetailTab,
  DetailTabPanel,
  HeaderBadges,
  HeaderLocation,
  HistoryItem,
  HistoryNote,
  HistoryStatusChange,
  HistoryTimeline,
  NoteEntry,
  NoteEntryContent,
  NoteEntryDate,
  NoteEntryHeader,
  NoteEntryMeta,
  NoteTypeBadge,
  NoteTypeChip,
  NoteTypeGroup,
  NotesComposer,
  NotesComposerActions,
  NotesDivider,
  NotesListCount,
  NotesListHeader,
  NotesListTitle,
  RecordActionButton,
  RecordCard,
  RecordCardActions,
  RecordCardContent,
  RecordCardHeader,
  RecordCardMeta,
  RecordCardTitle,
  RecordList,
  SkillChip,
  SkillList,
} from './styles';

const taskStatusConfig = {
  CANCELLED: { background: palette.gray100, color: palette.gray600, label: 'Cancelled' },
  COMPLETED: { background: '#dcfce7', color: '#15803d', label: 'Completed' },
  PENDING: { background: '#dbeafe', color: '#1d4ed8', label: 'Pending' },
} as const;

const tabIcons = {
  history: HistoryOutlinedIcon,
  notes: StickyNote2OutlinedIcon,
  overview: InsightsOutlinedIcon,
  tasks: TaskAltOutlinedIcon,
} as const;

export interface ApplicationDetailDialogProps {
  applicationId: string | null;
  onClose: () => void;
  open: boolean;
  record: ApplicationRecord | null;
}

function DetailSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <DetailPanel>
      <DetailPanelHeader>
        <DetailPanelTitle>{title}</DetailPanelTitle>
        {description ? <DetailPanelDescription>{description}</DetailPanelDescription> : null}
      </DetailPanelHeader>
      {children}
    </DetailPanel>
  );
}

function getNoteTypeConfig(type: ApiNoteType) {
  return noteTypeDisplayConfig[type] ?? noteTypeDisplayConfig.GENERAL;
}

function getTaskTypeLabel(type: ApiTaskType): string {
  return applicationTaskTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function formatStatusLabel(status: ApiApplicationStatus): string {
  const uiStatus = mapApiStatusToUi(status);
  return statusDisplayConfig[uiStatus]?.label ?? status;
}

export function ApplicationDetailDialog({
  applicationId,
  onClose,
  open,
  record,
}: ApplicationDetailDialogProps) {
  const { showToast } = useToast();
  const { data, isError, isLoading, refetch } = useApplicationDetail(open ? applicationId : null);
  const [activeTab, setActiveTab] = useState<ApplicationDetailTab>('overview');

  const addNote = useAddApplicationNote(applicationId ?? '');
  const deleteNote = useDeleteApplicationNote(applicationId ?? '');
  const addTask = useAddApplicationTask(applicationId ?? '');
  const updateTask = useUpdateApplicationTask(applicationId ?? '');
  const deleteTask = useDeleteApplicationTask(applicationId ?? '');

  const [noteType, setNoteType] = useState<ApiNoteType>('GENERAL');
  const [noteContent, setNoteContent] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<ApiTaskType>('FOLLOW_UP');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');

  useEffect(() => {
    if (open) {
      setActiveTab('overview');
      setNoteType('GENERAL');
      setNoteContent('');
      setTaskTitle('');
      setTaskType('FOLLOW_UP');
      setTaskDescription('');
      setTaskDueAt('');
    }
  }, [applicationId, open]);

  const status = record ? statusDisplayConfig[record.status] : null;
  const priority = record ? priorityDisplayConfig[record.priority] : null;
  const source = record ? sourceDisplayConfig[record.source] : null;
  const archiveState = record?.isArchived
    ? archiveDisplayConfig.archived
    : archiveDisplayConfig.active;

  const renderOverview = () => {
    if (!data) {
      return null;
    }

    return (
      <>
        <DetailSection
          description="Current pipeline position and tracking details."
          title="Application summary"
        >
          <HeaderBadges>
            {source ? (
              <SourceBadge background={source.background} color={source.color}>
                {source.label}
              </SourceBadge>
            ) : null}
            {status ? (
              <StatusBadge background={status.background} color={status.color}>
                {status.label}
              </StatusBadge>
            ) : null}
            {priority ? (
              <PriorityBadge background={priority.background} color={priority.color}>
                {priority.label}
              </PriorityBadge>
            ) : null}
            <StatusBadge background={archiveState.background} color={archiveState.color}>
              {archiveState.label}
            </StatusBadge>
          </HeaderBadges>

          <DetailMetaGrid>
            <FieldGroup>
              <FieldLabel>Location</FieldLabel>
              <DetailMetaValue>{data.location?.trim() || 'Not specified'}</DetailMetaValue>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Applied date</FieldLabel>
              <DetailMetaValue>
                {formatAbsoluteDate(data.appliedAt ?? data.createdAt)}
              </DetailMetaValue>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Interest level</FieldLabel>
              <DetailMetaValue>
                <InterestRating value={data.interestLevel ?? 0} />
              </DetailMetaValue>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Last updated</FieldLabel>
              <DetailMetaValue>{formatDateTime(data.updatedAt)}</DetailMetaValue>
            </FieldGroup>
            {data.salaryMin || data.salaryMax ? (
              <FieldGroup>
                <FieldLabel>Salary range</FieldLabel>
                <DetailMetaValue>
                  {[data.salaryMin, data.salaryMax].filter(Boolean).join(' – ')}{' '}
                  {data.salaryCurrency ?? ''}
                </DetailMetaValue>
              </FieldGroup>
            ) : null}
            {data.originalJobUrl ? (
              <FieldGroup>
                <FieldLabel>Job posting</FieldLabel>
                <DetailMetaValue>
                  <Link href={data.originalJobUrl} rel="noopener noreferrer" target="_blank">
                    View posting
                  </Link>
                </DetailMetaValue>
              </FieldGroup>
            ) : null}
          </DetailMetaGrid>
        </DetailSection>

        {data.descriptionSnapshot || data.skillsSnapshot.length > 0 ? (
          <DetailSection
            description="Saved snapshot from when this application was tracked."
            title="Role details"
          >
            {data.descriptionSnapshot ? (
              <FieldGroup>
                <FieldLabel>Description</FieldLabel>
                <DetailDescription>{data.descriptionSnapshot}</DetailDescription>
              </FieldGroup>
            ) : null}
            {data.skillsSnapshot.length > 0 ? (
              <FieldGroup>
                <FieldLabel>Skills</FieldLabel>
                <SkillList>
                  {data.skillsSnapshot.map((skill) => (
                    <SkillChip key={skill}>{skill}</SkillChip>
                  ))}
                </SkillList>
              </FieldGroup>
            ) : null}
          </DetailSection>
        ) : null}
      </>
    );
  };

  const renderNotes = () => {
    if (!data) {
      return null;
    }

    const sortedNotes = [...data.notes].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    return (
      <DetailSection
        description="Keep a running log of conversations, feedback, and follow-ups."
        title="Notes"
      >
        <NotesComposer>
          <FieldGroup>
            <FieldLabel>Note type</FieldLabel>
            <FieldHint>Choose the category that best fits this update.</FieldHint>
            <NoteTypeGroup aria-label="Note type">
              {applicationNoteTypeOptions.map((option) => {
                const typeConfig = getNoteTypeConfig(option.value);
                const isActive = noteType === option.value;

                return (
                  <NoteTypeChip
                    accentColor={typeConfig.accent}
                    active={isActive}
                    aria-pressed={isActive}
                    key={option.value}
                    onClick={() => setNoteType(option.value)}
                    type="button"
                  >
                    {option.label}
                  </NoteTypeChip>
                );
              })}
            </NoteTypeGroup>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Write a note</FieldLabel>
            <Input
              fullWidth
              multiline
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Capture interview feedback, recruiter updates, or next steps..."
              rows={4}
              size="small"
              value={noteContent}
            />
          </FieldGroup>

          <NotesComposerActions>
            <Button disabled={addNote.isPending} onClick={() => void handleAddNote()}>
              {addNote.isPending ? 'Adding...' : 'Add note'}
            </Button>
          </NotesComposerActions>
        </NotesComposer>

        <NotesDivider />

        <NotesListHeader>
          <NotesListTitle>Saved notes</NotesListTitle>
          <NotesListCount>{sortedNotes.length}</NotesListCount>
        </NotesListHeader>

        {sortedNotes.length === 0 ? (
          <JobFeedEmpty>
            <StickyNote2OutlinedIcon fontSize="small" />
            <JobFeedEmptyTitle>No notes yet</JobFeedEmptyTitle>
            <JobFeedEmptyText>
              Your notes will appear here once you add the first update above.
            </JobFeedEmptyText>
          </JobFeedEmpty>
        ) : (
          <RecordList>
            {sortedNotes.map((note) => {
              const typeConfig = getNoteTypeConfig(note.type);

              return (
                <NoteEntry accentColor={typeConfig.accent} key={note.id}>
                  <NoteEntryHeader>
                    <NoteEntryMeta>
                      <NoteTypeBadge background={typeConfig.background} color={typeConfig.color}>
                        {typeConfig.label}
                      </NoteTypeBadge>
                      <NoteEntryDate>
                        <AccessTimeOutlinedIcon sx={{ fontSize: '0.875rem' }} />
                        {formatDateTime(note.createdAt)}
                      </NoteEntryDate>
                    </NoteEntryMeta>
                    <RecordCardActions>
                      <RecordActionButton
                        aria-label="Delete note"
                        onClick={() => void handleDeleteNote(note.id)}
                        size="small"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </RecordActionButton>
                    </RecordCardActions>
                  </NoteEntryHeader>
                  <NoteEntryContent>{note.content}</NoteEntryContent>
                </NoteEntry>
              );
            })}
          </RecordList>
        )}
      </DetailSection>
    );
  };

  const renderTasks = () => {
    if (!data) {
      return null;
    }

    return (
      <>
        <DetailSection
          description="Stay on top of follow-ups and preparation work."
          title="Add a task"
        >
          <FormGrid>
            <Input
              fullWidth
              label="Task title"
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="e.g. Send follow-up email"
              size="small"
              value={taskTitle}
            />
            <FilterDropdown
              fullWidth
              label="Task type"
              onChange={(value) => setTaskType(value as ApiTaskType)}
              options={applicationTaskTypeOptions}
              value={taskType}
            />
            <Input
              fullWidth
              label="Due date"
              onChange={(event) => setTaskDueAt(event.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              type="datetime-local"
              value={taskDueAt}
            />
          </FormGrid>
          <FieldGroup>
            <FieldLabel>Description</FieldLabel>
            <FieldHint>Optional details to help you complete this task.</FieldHint>
            <Input
              fullWidth
              multiline
              onChange={(event) => setTaskDescription(event.target.value)}
              rows={2}
              size="small"
              value={taskDescription}
            />
          </FieldGroup>
          <Button disabled={addTask.isPending} onClick={() => void handleAddTask()}>
            {addTask.isPending ? 'Adding...' : 'Add task'}
          </Button>
        </DetailSection>

        <DetailSection
          description={`${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'} linked to this application.`}
          title="Tasks"
        >
          {data.tasks.length === 0 ? (
            <JobFeedEmpty>
              <TaskAltOutlinedIcon fontSize="small" />
              <JobFeedEmptyTitle>No tasks yet</JobFeedEmptyTitle>
              <JobFeedEmptyText>
                Create a follow-up or preparation task to keep momentum going.
              </JobFeedEmptyText>
            </JobFeedEmpty>
          ) : (
            <RecordList>
              {data.tasks.map((task) => {
                const taskStatus = taskStatusConfig[task.status];

                return (
                  <RecordCard key={task.id}>
                    <RecordCardHeader>
                      <div>
                        <RecordCardTitle>{task.title}</RecordCardTitle>
                        <RecordCardMeta>
                          {getTaskTypeLabel(task.type)}
                          {task.dueAt ? ` • Due ${formatDateTime(task.dueAt)}` : ''}
                        </RecordCardMeta>
                      </div>
                      <RecordCardActions>
                        <StatusBadge background={taskStatus.background} color={taskStatus.color}>
                          {taskStatus.label}
                        </StatusBadge>
                        <RecordActionButton
                          aria-label={
                            task.status === 'COMPLETED' ? 'Mark task pending' : 'Mark task complete'
                          }
                          onClick={() =>
                            void handleToggleTask(task.id, task.status !== 'COMPLETED')
                          }
                          size="small"
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </RecordActionButton>
                        <RecordActionButton
                          aria-label="Delete task"
                          onClick={() => void handleDeleteTask(task.id)}
                          size="small"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </RecordActionButton>
                      </RecordCardActions>
                    </RecordCardHeader>
                    {task.description ? (
                      <RecordCardContent>{task.description}</RecordCardContent>
                    ) : null}
                  </RecordCard>
                );
              })}
            </RecordList>
          )}
        </DetailSection>
      </>
    );
  };

  const renderHistory = () => {
    if (!data) {
      return null;
    }

    return (
      <DetailSection
        description="Track how this application has moved through your pipeline."
        title="Status history"
      >
        {data.statusHistory.length === 0 ? (
          <JobFeedEmpty>
            <HistoryOutlinedIcon fontSize="small" />
            <JobFeedEmptyTitle>No status changes yet</JobFeedEmptyTitle>
            <JobFeedEmptyText>
              Status transitions will appear here as you update the application.
            </JobFeedEmptyText>
          </JobFeedEmpty>
        ) : (
          <HistoryTimeline>
            {data.statusHistory.map((entry) => (
              <HistoryItem key={entry.id}>
                <HistoryStatusChange>
                  {entry.fromStatus
                    ? `${formatStatusLabel(entry.fromStatus)} → ${formatStatusLabel(entry.toStatus)}`
                    : formatStatusLabel(entry.toStatus)}
                </HistoryStatusChange>
                <RecordCardMeta>{formatDateTime(entry.changedAt)}</RecordCardMeta>
                {entry.note ? <HistoryNote>{entry.note}</HistoryNote> : null}
              </HistoryItem>
            ))}
          </HistoryTimeline>
        )}
      </DetailSection>
    );
  };

  const handleClose = () => {
    onClose();
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      showToast({ message: 'Note content is required.', severity: 'error' });
      return;
    }

    try {
      await addNote.mutateAsync({ content: noteContent.trim(), type: noteType });
      setNoteContent('');
      showToast({ message: 'Note added', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to add note.',
        severity: 'error',
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      showToast({ message: 'Note deleted', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to delete note.',
        severity: 'error',
      });
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      showToast({ message: 'Task title is required.', severity: 'error' });
      return;
    }

    try {
      await addTask.mutateAsync({
        description: taskDescription.trim() || undefined,
        dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
        title: taskTitle.trim(),
        type: taskType,
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueAt('');
      showToast({ message: 'Task added', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to add task.',
        severity: 'error',
      });
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({
        payload: {
          completedAt: completed ? new Date().toISOString() : null,
          status: completed ? 'COMPLETED' : 'PENDING',
        },
        taskId,
      });
      showToast({
        message: completed ? 'Task marked complete' : 'Task marked pending',
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update task.',
        severity: 'error',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      showToast({ message: 'Task deleted', severity: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to delete task.',
        severity: 'error',
      });
    }
  };

  const tabContent = {
    history: renderHistory(),
    notes: renderNotes(),
    overview: renderOverview(),
    tasks: renderTasks(),
  }[activeTab];

  return (
    <DetailApplicationDialog
      aria-labelledby="application-detail-title"
      fullWidth
      maxWidth={false}
      onClose={handleClose}
      open={open}
      scroll="paper"
    >
      <DialogHeaderAccent />

      <DialogHeader>
        <DialogHeaderContent>
          <DialogTitleGroup>
            <DialogEyebrow>Application details</DialogEyebrow>
            <DialogTitleText id="application-detail-title">
              {record?.title ?? data?.jobTitle ?? 'Application'}
            </DialogTitleText>
            <DialogSubtitle>{record?.company ?? data?.companyName ?? ''}</DialogSubtitle>
            {record ? (
              <HeaderLocation>
                <LocationPinIcon />
                {record.location}
              </HeaderLocation>
            ) : null}
          </DialogTitleGroup>
        </DialogHeaderContent>
        <CloseButton aria-label="Close application detail dialog" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      </DialogHeader>

      <DetailDialogBody>
        <DetailTabBar aria-label="Application detail sections" role="tablist">
          {applicationDetailTabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const isActive = activeTab === tab.id;

            return (
              <DetailTab
                active={isActive}
                aria-selected={isActive}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <Icon />
                {tab.label}
              </DetailTab>
            );
          })}
        </DetailTabBar>

        <DetailTabPanel aria-labelledby="application-detail-title" role="tabpanel">
          {isLoading ? (
            <SectionCard>Loading application details...</SectionCard>
          ) : isError ? (
            <SectionCard>
              Unable to load application details.
              <Button onClick={() => void refetch()} variant="outline">
                Try again
              </Button>
            </SectionCard>
          ) : (
            tabContent
          )}
        </DetailTabPanel>
      </DetailDialogBody>

      <DialogFooter>
        <DialogFooterNote>
          <AccessTimeOutlinedIcon fontSize="small" />
          Review notes, tasks, and status history without leaving your applications workspace.
        </DialogFooterNote>
        <DialogFooterActions>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </DialogFooterActions>
      </DialogFooter>
    </DetailApplicationDialog>
  );
}
