import { applicationsService } from '../services/applications.service';
import type { ApplicationDto, ApplicationListParams } from '../types/application.types';

const EXPORT_PAGE_SIZE = 100;

export async function fetchAllApplications(
  params: Omit<ApplicationListParams, 'limit' | 'page'>,
): Promise<ApplicationDto[]> {
  const items: ApplicationDto[] = [];
  let page = 1;

  while (true) {
    const response = await applicationsService.list({
      ...params,
      limit: EXPORT_PAGE_SIZE,
      page,
    });

    items.push(...response.items);

    if (!response.pagination.hasNextPage) {
      break;
    }

    page += 1;
  }

  return items;
}
