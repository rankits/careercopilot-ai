export const applicationQueryKeys = {
  all: ['applications'] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
  list: (params: Record<string, unknown>) => ['applications', 'list', params] as const,
  count: (status: string, archived: string) => ['applications', 'count', status, archived] as const,
};
