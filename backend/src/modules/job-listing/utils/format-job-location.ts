type ProviderMetadata = Record<string, unknown> | null | undefined;

const remoteTypeLabel = (remoteType: string | null | undefined): string | null => {
  if (!remoteType) return null;
  const normalized = remoteType.trim().toUpperCase();
  if (normalized === 'REMOTE') return 'Remote';
  if (normalized === 'HYBRID') return 'Hybrid';
  if (normalized === 'ONSITE' || normalized === 'ON_SITE') return 'On-site';
  return remoteType.trim();
};

const readMetadataLocation = (metadata: ProviderMetadata): string | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata.locationRaw;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();

  const city = typeof metadata.locationCity === 'string' ? metadata.locationCity.trim() : '';
  const country =
    typeof metadata.locationCountry === 'string' ? metadata.locationCountry.trim() : '';
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
};

/**
 * Builds a display location from persisted metadata and remoteType.
 * Never returns the misleading hard-coded "Unknown".
 */
export function formatJobLocation(
  remoteType: string | null | undefined,
  providerMetadata: unknown,
): string {
  const fromMetadata = readMetadataLocation(
    typeof providerMetadata === 'object' && providerMetadata !== null
      ? (providerMetadata as Record<string, unknown>)
      : null,
  );
  if (fromMetadata) return fromMetadata;

  const fromRemote = remoteTypeLabel(remoteType);
  if (fromRemote) return fromRemote;

  return 'Location not specified';
}
