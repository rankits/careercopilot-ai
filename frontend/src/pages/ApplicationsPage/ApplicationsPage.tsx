import AddIcon from '@mui/icons-material/Add';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import {
  DashboardMetricCard,
  FilterDropdown,
  JobFeedLoadingState,
  JobFeedStatus,
} from '@/components/molecules';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import {
  useArchiveApplication,
  useDeleteApplication,
} from '@/features/applications/hooks/useApplicationMutations';
import { useApplications } from '@/features/applications/hooks/useApplications';
import { useExportApplications } from '@/features/applications/hooks/useExportApplications';

import {
  applicationArchiveOptions,
  applicationPageSizeOptions,
  applicationSortOptions,
  applicationSourceOptions,
  applicationStatusTabs,
  applicationSummaryMetrics,
  statusTabDotColors,
} from '@/constants/pages/applications';
import {
  AddApplicationDialog,
  ApplicationDetailDialog,
  ApplicationGridCard,
  ApplicationTableRow,
  ConfirmDialog,
  EditApplicationDialog,
  StatusChangeDialog,
  StatusTabsScroller,
  type ApplicationRowHandlers,
} from '@/features/applications/components';
import {
  ApplicationsGrid,
  ApplicationsRoot,
  ApplicationsTable,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  FilterActionsBar,
  FilterDropdownWrap,
  FilterPanel,
  MetricsGrid,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderCopy,
  PageHeaderIcon,
  PageSubtitle,
  PageTitle,
  PaginationBar,
  PaginationButton,
  PaginationControls,
  PaginationPageSize,
  StatusTab,
  StatusTabCount,
  StatusTabDot,
  TableHeadCell,
  TablePanel,
  TableScroll,
  TableStickyHeadCell,
  TableToolbar,
  TableToolbarText,
  ViewToggleButton,
  ViewToggleGroup,
} from '@/features/applications/styles';
import type { ApplicationRecord } from '@/features/applications/types/application.view.types';
import { mapUiStatusToApi } from '@/features/applications/utils/applicationMappers';
import { APPLICATIONS_EXPORT_EMPTY_MESSAGE } from '@/features/applications/utils/exportApplicationsCsv';
import { colorTokens } from '@/tokens';

export function ApplicationsPage() {
  const { showToast } = useToast();
  const isMobile = useMediaQuery('(max-width:760px)');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('active');
  const [sortBy, setSortBy] = useState('recently-updated');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ApplicationRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveAction, setArchiveAction] = useState<'archive' | 'unarchive'>('archive');

  const deleteApplication = useDeleteApplication();
  const archiveApplication = useArchiveApplication();
  const exportApplications = useExportApplications();

  const listFilters = {
    activeTab,
    archiveFilter,
    currentPage,
    pageSize,
    searchQuery,
    sortBy,
    sourceFilter,
    statusFilter,
  };

  const { data, error, isError, isLoading, refetch } = useApplications(listFilters);

  const visibleRecords = data?.records ?? [];

  const pagination = data?.pagination;
  const displayTotal = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const safePage = pagination?.page ?? currentPage;
  const pageStart = displayTotal === 0 ? 0 : (safePage - 1) * Number(pageSize) + 1;
  const showingFrom = displayTotal === 0 ? 0 : pageStart;
  const showingTo = displayTotal === 0 ? 0 : Math.min(safePage * Number(pageSize), displayTotal);

  const hasSearch = searchQuery.trim().length > 0;
  const isUnfilteredList =
    activeTab === 'all' && statusFilter === 'all' && archiveFilter === 'active' && !hasSearch;

  const summaryMetricValues = useMemo(
    () => [
      isUnfilteredList && !isLoading ? displayTotal : '—',
      archiveFilter === 'active' &&
      activeTab === 'all' &&
      statusFilter === 'all' &&
      !hasSearch &&
      !isLoading
        ? displayTotal
        : '—',
      activeTab === 'interview' && statusFilter === 'all' && !hasSearch && !isLoading
        ? displayTotal
        : '—',
      activeTab === 'offer' && statusFilter === 'all' && !hasSearch && !isLoading
        ? displayTotal
        : '—',
    ],
    [activeTab, archiveFilter, displayTotal, hasSearch, isLoading, isUnfilteredList, statusFilter],
  );

  const statusTabCounts = useMemo(() => {
    const counts: Record<string, number | string> = {};

    applicationStatusTabs.forEach((tab) => {
      const matchesTabFilter =
        statusFilter === 'all' &&
        !hasSearch &&
        (tab.id === activeTab || (tab.id === 'all' && activeTab === 'all'));

      counts[tab.id] = matchesTabFilter && !isLoading ? displayTotal : '—';
    });

    return counts;
  }, [activeTab, displayTotal, hasSearch, isLoading, statusFilter]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const rowHandlers: ApplicationRowHandlers = {
    onArchive: (record) => {
      setSelectedRecord(record);
      setArchiveAction('archive');
      setArchiveConfirmOpen(true);
    },
    onChangeStatus: (record) => {
      setSelectedRecord(record);
      setStatusChangeOpen(true);
    },
    onDelete: (record) => {
      setSelectedRecord(record);
      setDeleteConfirmOpen(true);
    },
    onEdit: (record) => {
      setSelectedRecord(record);
      setEditOpen(true);
    },
    onUnarchive: (record) => {
      setSelectedRecord(record);
      setArchiveAction('unarchive');
      setArchiveConfirmOpen(true);
    },
    onView: (record) => {
      setSelectedRecord(record);
      setDetailOpen(true);
    },
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecord) {
      return;
    }

    try {
      await deleteApplication.mutateAsync(selectedRecord.id);
      showToast({ message: 'Application deleted', severity: 'success' });
      setDeleteConfirmOpen(false);
      setSelectedRecord(null);
      setDetailOpen(false);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to delete application.',
        severity: 'error',
      });
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedRecord) {
      return;
    }

    try {
      await archiveApplication.mutateAsync({
        applicationId: selectedRecord.id,
        archived: archiveAction === 'archive',
      });
      showToast({
        message: archiveAction === 'archive' ? 'Application archived' : 'Application restored',
        severity: 'success',
      });
      setArchiveConfirmOpen(false);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update application.',
        severity: 'error',
      });
    }
  };

  const handleExport = async () => {
    if (displayTotal === 0) {
      showToast({
        message: APPLICATIONS_EXPORT_EMPTY_MESSAGE,
        severity: 'warning',
      });
      return;
    }

    try {
      const exportedCount = await exportApplications.mutateAsync({
        activeTab,
        archiveFilter,
        searchQuery,
        sortBy,
        sourceFilter,
        statusFilter,
      });

      showToast({
        message: `Exported ${exportedCount} application${exportedCount === 1 ? '' : 's'}.`,
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to export applications.',
        severity: 'error',
      });
    }
  };

  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const showArchiveState = archiveFilter === 'all';
  const resultsLabel = isLoading
    ? 'Loading applications...'
    : isError
      ? 'Unable to load applications'
      : `Showing ${showingFrom} to ${showingTo} of ${displayTotal} applications`;

  return (
    <ApplicationsRoot aria-label="Applications page">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderIcon aria-hidden="true">
            <BusinessCenterOutlinedIcon fontSize="medium" />
          </PageHeaderIcon>
          <PageHeaderCopy>
            <PageTitle>Applications</PageTitle>
            <PageSubtitle>Track and manage all your job applications in one place.</PageSubtitle>
          </PageHeaderCopy>
        </PageHeaderContent>

        <PageHeaderActions>
          <Button
            disabled={exportApplications.isPending || isLoading}
            onClick={() => void handleExport()}
            startIcon={<FileDownloadOutlinedIcon />}
            variant="outline"
          >
            {exportApplications.isPending ? 'Exporting...' : 'Export'}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} startIcon={<AddIcon />}>
            Add application
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <MetricsGrid>
        {applicationSummaryMetrics.map(({ icon: Icon, key, ...metric }, index) => (
          <DashboardMetricCard
            icon={<Icon fontSize="large" />}
            {...metric}
            key={key}
            value={isLoading ? '—' : String(summaryMetricValues[index] ?? '—')}
          />
        ))}
      </MetricsGrid>

      <FilterPanel>
        <StatusTabsScroller activeTabId={activeTab}>
          {applicationStatusTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabCount = statusTabCounts[tab.id];
            const showCount = typeof tabCount === 'number';

            return (
              <StatusTab
                active={isActive}
                aria-selected={isActive}
                data-status-tab={tab.id}
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                type="button"
              >
                <StatusTabDot color={statusTabDotColors[tab.id] ?? colorTokens.actionPrimary} />
                {tab.label}
                {showCount ? <StatusTabCount active={isActive}>{tabCount}</StatusTabCount> : null}
              </StatusTab>
            );
          })}
        </StatusTabsScroller>

        <FilterActionsBar>
          <Input
            aria-label="Search by company or job title"
            className="applications-search-field"
            fullWidth
            onChange={(event) => {
              const nextQuery = event.target.value;
              setSearchQuery(nextQuery);

              if (nextQuery.trim() !== searchQuery.trim()) {
                setCurrentPage(1);
              }
            }}
            placeholder="Search by company or job title"
            size="small"
            startAdornment={<SearchOutlinedIcon fontSize="small" />}
            value={searchQuery}
          />
          <FilterDropdownWrap className="filter-dropdown-wrap">
            <FilterDropdown
              fullWidth
              label="All sources"
              onChange={(value) => {
                setSourceFilter(value);
                setCurrentPage(1);
              }}
              options={applicationSourceOptions}
              prefix="Source"
              value={sourceFilter}
            />
          </FilterDropdownWrap>
          <FilterDropdownWrap className="filter-dropdown-wrap">
            <FilterDropdown
              fullWidth
              label="Active only"
              onChange={(value) => {
                setArchiveFilter(value);
                setCurrentPage(1);
              }}
              options={applicationArchiveOptions}
              prefix="Showing"
              value={archiveFilter}
            />
          </FilterDropdownWrap>
          <FilterDropdownWrap className="filter-dropdown-wrap">
            <FilterDropdown
              fullWidth
              label="Recently updated"
              onChange={(value) => {
                setSortBy(value);
                setCurrentPage(1);
              }}
              options={applicationSortOptions}
              prefix="Sort"
              value={sortBy}
            />
          </FilterDropdownWrap>
        </FilterActionsBar>
      </FilterPanel>

      {isLoading ? <JobFeedLoadingState label="Loading applications..." /> : null}

      {isError ? (
        <JobFeedStatus
          message={error instanceof Error ? error.message : 'Unable to load applications.'}
          onRetry={() => void refetch()}
          title="Couldn't load applications"
          tone="error"
        />
      ) : null}

      {!isLoading && !isError && visibleRecords.length === 0 ? (
        <EmptyState role="status">
          <EmptyStateIcon aria-hidden="true">
            <BusinessCenterOutlinedIcon fontSize="medium" />
          </EmptyStateIcon>
          <EmptyStateTitle>No applications found</EmptyStateTitle>
          <EmptyStateDescription>
            Try adjusting your filters, or add an application to start tracking.
          </EmptyStateDescription>
          <Button onClick={() => setAddDialogOpen(true)} size="small" startIcon={<AddIcon />}>
            Add application
          </Button>
        </EmptyState>
      ) : null}

      {!isLoading && !isError && visibleRecords.length > 0 ? (
        <TablePanel>
          <TableToolbar>
            <TableToolbarText>{resultsLabel}</TableToolbarText>
            <ViewToggleGroup aria-label="View mode">
              <ViewToggleButton
                active={viewMode === 'list'}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                size="small"
              >
                <ViewListOutlinedIcon fontSize="small" />
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'grid'}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                size="small"
              >
                <GridViewOutlinedIcon fontSize="small" />
              </ViewToggleButton>
            </ViewToggleGroup>
          </TableToolbar>

          {effectiveViewMode === 'grid' ? (
            <ApplicationsGrid aria-label="Applications grid">
              {visibleRecords.map((record, index) => (
                <ApplicationGridCard
                  handlers={rowHandlers}
                  key={record.id}
                  record={record}
                  selected={index === 0 && safePage === 1}
                  showArchiveState={showArchiveState}
                />
              ))}
            </ApplicationsGrid>
          ) : (
            <TableScroll>
              <ApplicationsTable>
                <thead>
                  <tr>
                    <TableHeadCell scope="col">Application</TableHeadCell>
                    <TableHeadCell scope="col">Source</TableHeadCell>
                    <TableHeadCell scope="col">Status</TableHeadCell>
                    <TableHeadCell scope="col">Priority</TableHeadCell>
                    <TableHeadCell scope="col">Interest</TableHeadCell>
                    <TableHeadCell scope="col">Applied date</TableHeadCell>
                    {showArchiveState ? <TableHeadCell scope="col">Archive</TableHeadCell> : null}
                    <TableStickyHeadCell scope="col">Actions</TableStickyHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => (
                    <ApplicationTableRow
                      handlers={rowHandlers}
                      key={record.id}
                      record={record}
                      showArchiveState={showArchiveState}
                    />
                  ))}
                </tbody>
              </ApplicationsTable>
            </TableScroll>
          )}

          <PaginationBar>
            <PaginationControls aria-label="Pagination">
              <PaginationButton
                aria-label="Previous page"
                disabled={safePage <= 1 || isLoading}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeftIcon fontSize="small" />
              </PaginationButton>
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <PaginationButton
                    active={pageNumber === safePage}
                    aria-current={pageNumber === safePage ? 'page' : undefined}
                    aria-label={`Page ${pageNumber}`}
                    disabled={isLoading}
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationButton>
                );
              })}
              <PaginationButton
                aria-label="Next page"
                disabled={safePage >= totalPages || isLoading}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                <ChevronRightIcon fontSize="small" />
              </PaginationButton>
            </PaginationControls>

            <PaginationPageSize>
              <FilterDropdown
                fullWidth={isMobile}
                label="10 per page"
                onChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
                options={applicationPageSizeOptions}
                value={pageSize}
              />
            </PaginationPageSize>
          </PaginationBar>
        </TablePanel>
      ) : null}

      <AddApplicationDialog onClose={() => setAddDialogOpen(false)} open={addDialogOpen} />

      <ApplicationDetailDialog
        applicationId={selectedRecord?.id ?? null}
        onClose={() => {
          setDetailOpen(false);
        }}
        open={detailOpen}
        record={selectedRecord}
      />

      <EditApplicationDialog
        applicationId={selectedRecord?.id ?? null}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />

      {selectedRecord ? (
        <StatusChangeDialog
          applicationId={selectedRecord.id}
          currentStatus={mapUiStatusToApi(selectedRecord.status)}
          onClose={() => setStatusChangeOpen(false)}
          open={statusChangeOpen}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        confirmVariant="danger"
        description={`This will permanently delete "${selectedRecord?.title}" at ${selectedRecord?.company} along with its notes, tasks, and history.`}
        intent="delete"
        isPending={deleteApplication.isPending}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteConfirm()}
        open={deleteConfirmOpen}
        title="Delete application?"
      />

      <ConfirmDialog
        confirmLabel={archiveAction === 'archive' ? 'Archive' : 'Restore'}
        description={
          archiveAction === 'archive'
            ? `"${selectedRecord?.title}" at ${selectedRecord?.company} will be moved to your archived applications. You can restore it later.`
            : `"${selectedRecord?.title}" at ${selectedRecord?.company} will return to your active applications list.`
        }
        intent={archiveAction === 'archive' ? 'archive' : 'restore'}
        isPending={archiveApplication.isPending}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={() => void handleArchiveConfirm()}
        open={archiveConfirmOpen}
        title={archiveAction === 'archive' ? 'Archive application?' : 'Restore application?'}
      />
    </ApplicationsRoot>
  );
}
