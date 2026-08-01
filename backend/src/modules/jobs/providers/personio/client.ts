import { BaseProviderClient } from '@/modules/jobs/providers/base/base.client.js';
import { PersonioPosition } from '@/modules/jobs/providers/personio/types.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';

const tagValue = (block: string, tag: string): string | undefined => {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match?.[1]) return undefined;
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

const parsePositions = (xml: string): PersonioPosition[] => {
  const blocks = xml.match(/<position>[\s\S]*?<\/position>/gi) ?? [];
  return blocks
    .map((block) => {
      const id = tagValue(block, 'id');
      const name = tagValue(block, 'name');
      if (!id || !name) return null;

      const descriptionParts =
        block.match(/<jobDescription>[\s\S]*?<\/jobDescription>/gi)?.map((part) => {
          const sectionName = tagValue(part, 'name');
          const value = tagValue(part, 'value');
          return [sectionName, value].filter(Boolean).join('\n');
        }) ?? [];

      return {
        id,
        name,
        office: tagValue(block, 'office'),
        department: tagValue(block, 'department'),
        recruitingCategory: tagValue(block, 'recruitingCategory'),
        employmentType: tagValue(block, 'employmentType'),
        seniority: tagValue(block, 'seniority'),
        schedule: tagValue(block, 'schedule'),
        createdAt: tagValue(block, 'createdAt'),
        descriptionHtml: descriptionParts.join('\n\n'),
      } satisfies PersonioPosition;
    })
    .filter((position): position is PersonioPosition => position !== null);
};

export class PersonioClient extends BaseProviderClient {
  constructor(
    providerName: string,
    timeoutMs = 12000,
    private readonly language = 'en',
  ) {
    super({
      providerName,
      baseUrl: 'https://jobs.personio.com',
      timeoutMs,
      maxRetries: 3,
    });
  }

  async fetchAccountJobs(account: string): Promise<PersonioPosition[]> {
    return this.executeWithRetry(async () => {
      const url = new URL(`https://${encodeURIComponent(account)}.jobs.personio.com/xml`);
      url.searchParams.set('language', this.language);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12000);

      try {
        const response = await fetch(url.toString(), {
          headers: { Accept: 'application/xml,text/xml,*/*' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ProviderFetchError(
            this.options.providerName,
            `HTTP error ${response.status}: ${response.statusText} (account=${account})`,
          );
        }
        const xml = await response.text();
        return parsePositions(xml);
      } finally {
        clearTimeout(timeout);
      }
    });
  }
}
