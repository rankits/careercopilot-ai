import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import {
  ApplicationCard,
  ApplicationCardActions,
  ApplicationCardBadges,
  ApplicationCardCompany,
  ApplicationCardDate,
  ApplicationCardDates,
  ApplicationCardFooter,
  ApplicationCardHeader,
  ApplicationCardInterest,
  ApplicationCardInterestLabel,
  ApplicationCardLocation,
  ApplicationCardMeta,
  ApplicationCardTitle,
  LocationPinIcon,
  PriorityBadge,
  RowActionButton,
  SourceBadge,
  StatusBadge,
} from '../../styles';
import type { ApplicationRecord } from '../../types/application.view.types';
import {
  archiveDisplayConfig,
  priorityDisplayConfig,
  sourceDisplayConfig,
  statusDisplayConfig,
} from '../../utils/application.constants';
import { ApplicationActionsMenu } from '../ApplicationActionsMenu';
import { InterestRating } from '../InterestRating';

export interface ApplicationRowHandlers {
  onArchive: (record: ApplicationRecord) => void;
  onChangeStatus: (record: ApplicationRecord) => void;
  onDelete: (record: ApplicationRecord) => void;
  onEdit: (record: ApplicationRecord) => void;
  onUnarchive: (record: ApplicationRecord) => void;
  onView: (record: ApplicationRecord) => void;
}

export interface ApplicationGridCardProps {
  handlers: ApplicationRowHandlers;
  record: ApplicationRecord;
  selected?: boolean;
  showArchiveState?: boolean;
}

export function ApplicationGridCard({
  handlers,
  record,
  selected = false,
  showArchiveState = false,
}: ApplicationGridCardProps) {
  const status = statusDisplayConfig[record.status];
  const priority = priorityDisplayConfig[record.priority];
  const source = sourceDisplayConfig[record.source];
  const archiveState = record.isArchived
    ? archiveDisplayConfig.archived
    : archiveDisplayConfig.active;

  return (
    <ApplicationCard aria-label={`${record.title} at ${record.company}`} selected={selected}>
      <ApplicationCardHeader>
        <ApplicationCardMeta>
          <ApplicationCardTitle>{record.title}</ApplicationCardTitle>
          <ApplicationCardCompany>{record.company}</ApplicationCardCompany>
          <ApplicationCardLocation>
            <LocationPinIcon />
            {record.location}
          </ApplicationCardLocation>
        </ApplicationCardMeta>
      </ApplicationCardHeader>

      <ApplicationCardBadges>
        <SourceBadge background={source.background} color={source.color}>
          {source.label}
        </SourceBadge>
        <StatusBadge background={status.background} color={status.color}>
          {status.label}
        </StatusBadge>
        <PriorityBadge background={priority.background} color={priority.color}>
          {priority.label}
        </PriorityBadge>
        {showArchiveState ? (
          <StatusBadge background={archiveState.background} color={archiveState.color}>
            {archiveState.label}
          </StatusBadge>
        ) : null}
      </ApplicationCardBadges>

      <ApplicationCardInterest>
        <ApplicationCardInterestLabel>Interest</ApplicationCardInterestLabel>
        <InterestRating value={record.interest} />
      </ApplicationCardInterest>

      <ApplicationCardFooter>
        <ApplicationCardDates>
          <ApplicationCardDate>Applied {record.appliedDate}</ApplicationCardDate>
          <ApplicationCardDate>Updated {record.updatedAt}</ApplicationCardDate>
        </ApplicationCardDates>
        <ApplicationCardActions>
          <RowActionButton
            aria-label={`View ${record.title}`}
            onClick={() => handlers.onView(record)}
            size="small"
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </RowActionButton>
          <ApplicationActionsMenu
            archived={record.isArchived}
            onArchive={() => handlers.onArchive(record)}
            onChangeStatus={() => handlers.onChangeStatus(record)}
            onDelete={() => handlers.onDelete(record)}
            onEdit={() => handlers.onEdit(record)}
            onUnarchive={() => handlers.onUnarchive(record)}
          >
            {({ onClick }) => (
              <RowActionButton
                aria-label={`More actions for ${record.title}`}
                onClick={onClick}
                size="small"
              >
                <MoreVertIcon fontSize="small" />
              </RowActionButton>
            )}
          </ApplicationActionsMenu>
        </ApplicationCardActions>
      </ApplicationCardFooter>
    </ApplicationCard>
  );
}
