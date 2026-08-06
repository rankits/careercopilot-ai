import { getIsoCountries } from '@/modules/recommendations/constants/iso-country-codes.js';

const EXTRA_COUNTRY_ALIASES: Record<string, readonly string[]> = {
  'united states': ['usa', 'u.s.a.', 'u.s.', 'america'],
  'united kingdom': ['uk', 'u.k.', 'britain', 'great britain', 'england', 'scotland', 'wales'],
  'united arab emirates': ['uae', 'u.a.e.'],
  'south korea': ['korea', 'republic of korea'],
  czechia: ['czech republic'],
};

let cachedTokensByCountryName: Map<string, readonly string[]> | null = null;

const tokenizeName = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+\s.-]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const buildCountryTokenIndex = (): Map<string, readonly string[]> => {
  const index = new Map<string, readonly string[]>();
  for (const country of getIsoCountries()) {
    const normalizedName = country.name.trim().toLowerCase();
    const tokens = new Set<string>([
      normalizedName,
      country.code.toLowerCase(),
      ...tokenizeName(country.name),
      ...(EXTRA_COUNTRY_ALIASES[normalizedName] ?? []),
    ]);
    index.set(normalizedName, [...tokens]);
  }
  return index;
};

const countryTokenIndex = (): Map<string, readonly string[]> => {
  if (!cachedTokensByCountryName) {
    cachedTokensByCountryName = buildCountryTokenIndex();
  }
  return cachedTokensByCountryName;
};

export const getCountrySearchTokens = (preference: string): readonly string[] => {
  const normalizedPreference = preference.trim().toLowerCase();
  if (!normalizedPreference) return [];

  const indexed = countryTokenIndex().get(normalizedPreference);
  if (indexed) return indexed;

  return tokenizeName(preference);
};

export const matchesCountryToken = (haystack: string, token: string): boolean => {
  const normalizedToken = token.trim().toLowerCase();
  if (!normalizedToken) return false;
  if (normalizedToken.length === 2) {
    return new RegExp(`(?:^|[\\s,-])${normalizedToken}(?:$|[\\s,-])`, 'i').test(haystack);
  }
  return haystack.includes(normalizedToken);
};
