import type {
  CandidateApplicationPreferences,
  RemotePreference,
  WorkModePreference,
} from '@/modules/auto-apply/types/candidate-profile.types.js';

const WORK_MODES: WorkModePreference[] = ['REMOTE', 'HYBRID', 'ONSITE'];

/** Normalize multi-select remote prefs; empty / ANY legacy = open to all modes. */
export function resolveRemotePreferences(
  preferences: Pick<CandidateApplicationPreferences, 'remotePreferences' | 'remotePreference'>,
): WorkModePreference[] {
  if (preferences.remotePreferences && preferences.remotePreferences.length > 0) {
    const unique = [
      ...new Set(
        preferences.remotePreferences.filter((mode): mode is WorkModePreference =>
          WORK_MODES.includes(mode as WorkModePreference),
        ),
      ),
    ];
    return unique.length > 0 ? unique : [...WORK_MODES];
  }

  const legacy = preferences.remotePreference;
  if (!legacy || legacy === 'ANY') {
    return [...WORK_MODES];
  }
  if (WORK_MODES.includes(legacy as WorkModePreference)) {
    return [legacy as WorkModePreference];
  }
  return [...WORK_MODES];
}

/** True when candidate accepts any workplace mode (no hard filter). */
export function acceptsAnyRemoteMode(
  preferences: Pick<CandidateApplicationPreferences, 'remotePreferences' | 'remotePreference'>,
): boolean {
  return resolveRemotePreferences(preferences).length >= WORK_MODES.length;
}

/** Derive legacy single field for older readers. */
export function toLegacyRemotePreference(modes: WorkModePreference[]): RemotePreference {
  if (modes.length === 0 || modes.length >= WORK_MODES.length) return 'ANY';
  return modes[0]!;
}

export function jobMatchesRemotePreferences(
  jobRemoteType: string | null | undefined,
  preferences: Pick<CandidateApplicationPreferences, 'remotePreferences' | 'remotePreference'>,
): 'PASSED' | 'FAILED' | 'NOT_EVALUATED' {
  if (acceptsAnyRemoteMode(preferences)) return 'PASSED';
  if (!jobRemoteType) return 'NOT_EVALUATED';
  const modes = resolveRemotePreferences(preferences);
  return modes.includes(jobRemoteType.toUpperCase() as WorkModePreference) ? 'PASSED' : 'FAILED';
}
