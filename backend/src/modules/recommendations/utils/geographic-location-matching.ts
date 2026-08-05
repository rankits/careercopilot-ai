import {
  getCountrySearchTokens,
  matchesCountryToken,
} from '@/modules/recommendations/utils/country-search-tokens.js';

export const matchesGeographicLocationPreference = (
  formattedLocation: string,
  preference: string,
): boolean => {
  const haystack = formattedLocation.trim().toLowerCase();
  if (!haystack) return false;

  const tokens = getCountrySearchTokens(preference);
  if (tokens.length === 0) return false;

  return tokens.some((token) => matchesCountryToken(haystack, token));
};
