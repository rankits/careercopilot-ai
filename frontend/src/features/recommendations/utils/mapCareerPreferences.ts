import { ANY_COUNTRY } from '@/constants/countries';
import type { FOR_YOU_WORK_MODE_OPTIONS } from '@/constants/pages/forYou';

export type CareerWorkModePreference = (typeof FOR_YOU_WORK_MODE_OPTIONS)[number];
export type CareerLocationScope = 'ANY' | 'WORK_MODE' | 'GEOGRAPHIC' | 'COMBINED';

export interface CareerPreferencesPayload {
  locationScope: CareerLocationScope;
  locations: string[];
  remotePreference?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  goalTextSegments: string[];
}

const WORK_MODE_LABELS: Record<Exclude<CareerWorkModePreference, 'Any work mode'>, string> = {
  Remote: 'Remote',
  Hybrid: 'Hybrid',
  'On-site': 'On-site',
};

const mapWorkModePreference = (
  workMode: CareerWorkModePreference,
): 'REMOTE' | 'HYBRID' | 'ONSITE' | undefined => {
  switch (workMode) {
    case 'Remote':
      return 'REMOTE';
    case 'Hybrid':
      return 'HYBRID';
    case 'On-site':
      return 'ONSITE';
    default:
      return undefined;
  }
};

export function mapCareerPreferences(
  workMode: CareerWorkModePreference,
  country: string,
): CareerPreferencesPayload {
  const hasCountry = country !== ANY_COUNTRY;
  const remotePreference = mapWorkModePreference(workMode);
  const hasWorkMode = Boolean(remotePreference);
  const goalTextSegments: string[] = [];

  if (hasCountry) {
    goalTextSegments.push(`Preferred country: ${country}`);
  }
  if (hasWorkMode && workMode in WORK_MODE_LABELS) {
    goalTextSegments.push(
      `Work mode: ${WORK_MODE_LABELS[workMode as keyof typeof WORK_MODE_LABELS]}`,
    );
  }

  if (hasCountry && hasWorkMode) {
    return {
      locationScope: 'COMBINED',
      locations: [country],
      remotePreference,
      goalTextSegments,
    };
  }

  if (hasCountry) {
    return {
      locationScope: 'GEOGRAPHIC',
      locations: [country],
      goalTextSegments,
    };
  }

  if (hasWorkMode) {
    return {
      locationScope: 'WORK_MODE',
      locations: [],
      remotePreference,
      goalTextSegments,
    };
  }

  return {
    locationScope: 'ANY',
    locations: [],
    goalTextSegments,
  };
}
