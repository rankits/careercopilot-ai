import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import {
  ApplicationCell,
  ApplicationCompany,
  ApplicationLocation,
  ApplicationMeta,
  ApplicationTitle,
  LocationPinIcon,
  PriorityBadge,
  RowActionButton,
  RowActions,
  SourceBadge,
  StatusBadge,
  TableCell,
  TableRow,
  TableStickyCell,
} from '../../styles';
import type { ApplicationRecord } from '../../types/application.view.types';
import {
  archiveDisplayConfig,
  priorityDisplayConfig,
  sourceDisplayConfig,
  statusDisplayConfig,
} from '../../utils/application.constants';
import { ApplicationActionsMenu } from '../ApplicationActionsMenu';
import type { ApplicationRowHandlers } from '../ApplicationGridCard';
import { InterestRating } from '../InterestRating';

export interface ApplicationTableRowProps {
  handlers: ApplicationRowHandlers;
  record: ApplicationRecord;
  showArchiveState?: boolean;
}

export function ApplicationTableRow({
  handlers,
  record,
  showArchiveState = false,
}: ApplicationTableRowProps) {
  const status = statusDisplayConfig[record.status];
  const priority = priorityDisplayConfig[record.priority];
  const source = sourceDisplayConfig[record.source];
  const archiveState = record.isArchived
    ? archiveDisplayConfig.archived
    : archiveDisplayConfig.active;

  return (
    <TableRow>
      <TableCell>
        <ApplicationCell>
          <ApplicationMeta>
            <ApplicationTitle>{record.title}</ApplicationTitle>
            <ApplicationCompany>{record.company}</ApplicationCompany>
            <ApplicationLocation>
              <LocationPinIcon />
              {record.location}
            </ApplicationLocation>
          </ApplicationMeta>
        </ApplicationCell>
      </TableCell>
      <TableCell>
        <SourceBadge background={source.background} color={source.color}>
          {source.label}
        </SourceBadge>
      </TableCell>
      <TableCell>
        <StatusBadge background={status.background} color={status.color}>
          {status.label}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <PriorityBadge background={priority.background} color={priority.color}>
          {priority.label}
        </PriorityBadge>
      </TableCell>
      <TableCell>
        <InterestRating value={record.interest} />
      </TableCell>
      <TableCell>{record.appliedDate}</TableCell>
      {showArchiveState ? (
        <TableCell>
          <StatusBadge background={archiveState.background} color={archiveState.color}>
            {archiveState.label}
          </StatusBadge>
        </TableCell>
      ) : null}
      <TableStickyCell>
        <RowActions>
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
        </RowActions>
      </TableStickyCell>
    </TableRow>
  );
}
