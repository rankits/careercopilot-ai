export type SetupSectionId =
  | 'personal'
  | 'work-auth'
  | 'preferences'
  | 'links'
  | 'answers'
  | 'resumes'
  | 'education'
  | 'consents';

export type SetupGapCode =
  | 'CONTACT_NAME_MISSING'
  | 'CONTACT_EMAIL_MISSING'
  | 'PROFILE_MISSING'
  | 'DESIRED_ROLES'
  | 'PREFERRED_LOCATIONS'
  | 'REMOTE_PREFERENCES'
  | 'SALARY_CURRENCY'
  | 'WORK_AUTHORIZATION_MISSING'
  | 'SPONSORSHIP_REQUIREMENT_MISSING'
  | 'NOTICE_PERIOD_MISSING'
  | 'EXPERIENCE_MISSING'
  | 'APPROVED_RESUME'
  | 'RESUME_USAGE_CONSENT'
  | 'PRIVACY_ACKNOWLEDGEMENT';

export interface SetupGap {
  code: SetupGapCode;
  label: string;
  section: SetupSectionId;
}

export interface SetupSectionStatus {
  id: SetupSectionId;
  label: string;
  complete: boolean;
  required: boolean;
}

export interface SetupStatusResult {
  complete: boolean;
  percent: number;
  readyForAssistedApply: boolean;
  gaps: SetupGap[];
  sections: SetupSectionStatus[];
}
