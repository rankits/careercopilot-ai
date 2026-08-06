import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import {
  isResumeBuilderWorkspacePath,
  skillsKeyOf,
  type CleanSnapshot,
} from './resumeBuilder.shared';

export function useResumeBuilderDraft(resumeId: string) {
  const [targetRole, setTargetRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<
    'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  >('mid');
  const [employmentType, setEmploymentType] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const editedContentRef = useRef('');
  const allowLeaveRef = useRef(false);
  const [cleanSnapshot, setCleanSnapshot] = useState<CleanSnapshot>({
    content: '',
    targetRole: '',
    jobDescription: '',
    skillsKey: '',
    skills: [],
  });

  const skillsKey = skillsKeyOf(skills);
  const isDirty =
    Boolean(resumeId) &&
    (editedContent !== cleanSnapshot.content ||
      targetRole !== cleanSnapshot.targetRole ||
      jobDescription !== cleanSnapshot.jobDescription ||
      skillsKey !== cleanSnapshot.skillsKey);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty || allowLeaveRef.current) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    // In-flow navigations (/resume-builder ↔ /resume-builder/:id) must not prompt.
    if (
      isResumeBuilderWorkspacePath(currentLocation.pathname) &&
      isResumeBuilderWorkspacePath(nextLocation.pathname)
    ) {
      return false;
    }
    // Only when leaving the Resume Builder workspace for another app page.
    return isResumeBuilderWorkspacePath(currentLocation.pathname);
  });

  // Re-arm the leave guard after the user keeps editing or makes new changes.
  useEffect(() => {
    if (isDirty) allowLeaveRef.current = false;
  }, [isDirty]);

  // Browser refresh / tab close.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    editedContentRef.current = editedContent;
  }, [editedContent]);

  const markSnapshotClean = useCallback(
    (overrides?: Partial<CleanSnapshot>) => {
      const nextSkills = overrides?.skills ?? skills;
      setCleanSnapshot({
        content: overrides?.content ?? editedContentRef.current,
        targetRole: overrides?.targetRole ?? targetRole,
        jobDescription: overrides?.jobDescription ?? jobDescription,
        skillsKey: overrides?.skillsKey ?? skillsKeyOf(nextSkills),
        skills: [...nextSkills],
      });
    },
    [jobDescription, skills, targetRole],
  );

  const cleanSnapshotRef = useRef(cleanSnapshot);
  useEffect(() => {
    cleanSnapshotRef.current = cleanSnapshot;
  }, [cleanSnapshot]);

  /** Drop unsaved Define Role edits when returning to Upload. */
  const discardDefineRoleDraft = useCallback(() => {
    const snap = cleanSnapshotRef.current;
    setTargetRole(snap.targetRole);
    setJobDescription(snap.jobDescription);
    setSkills([...snap.skills]);
    setIndustry('');
    setEmploymentType('');
    setExperienceLevel('mid');
  }, []);

  const closeLeaveDialog = () => {
    blocker.reset?.();
  };

  const confirmLeave = () => {
    allowLeaveRef.current = true;
    blocker.proceed?.();
  };

  return {
    targetRole,
    setTargetRole,
    industry,
    setIndustry,
    experienceLevel,
    setExperienceLevel,
    employmentType,
    setEmploymentType,
    skills,
    setSkills,
    jobDescription,
    setJobDescription,
    editedContent,
    setEditedContent,
    editedContentRef,
    skillsKey,
    cleanSnapshot,
    setCleanSnapshot,
    isDirty,
    allowLeaveRef,
    markSnapshotClean,
    discardDefineRoleDraft,
    blocker,
    closeLeaveDialog,
    confirmLeave,
  };
}
