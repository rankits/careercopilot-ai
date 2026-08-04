import { useNavigate, useParams } from 'react-router-dom';

import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail';

import { ROUTES } from '@/constants/routes';
import { ApplicationDetailDialog } from '@/features/applications/components';
import { mapApplicationDtoToRecord } from '@/features/applications/utils/applicationMappers';

/**
 * AJA-UI-004. The tracker's detail view (`ApplicationDetailDialog`) was
 * previously reachable only by clicking a row/card in `ApplicationsPage`,
 * with no URL that pointed at a specific application - nothing to link,
 * bookmark, or share. This route renders the exact same dialog, opened by
 * URL instead of by click, so `/applications/:applicationId` is a real,
 * shareable deep link. Closing it returns to the applications list.
 */
export function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { data } = useApplicationDetail(applicationId ?? null);
  const record = data ? mapApplicationDtoToRecord(data) : null;

  return (
    <ApplicationDetailDialog
      applicationId={applicationId ?? null}
      onClose={() => void navigate(ROUTES.APPLICATIONS)}
      open
      record={record}
    />
  );
}
