import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import fullLogoUrl from '@/assets/logo/career-copilot-logo.png';
import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import { ROUTES } from '@/constants/routes';
import {
  BRAND_NAME,
  DEFAULT_BOTTOM_NAV_IDS,
  DEFAULT_MOBILE_DRAWER_NAV_IDS,
  DEFAULT_SIDEBAR_ITEMS,
  DEFAULT_SIDEBAR_SECTIONS,
  SIDEBAR_COPY,
  USER_INITIALS_FALLBACK,
} from '@/constants/ui';
import {
  ArrowForwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DescriptionOutlinedIcon,
  Divider,
  Drawer,
  EditOutlinedIcon,
  FileDownloadOutlinedIcon,
  IconButton,
  LogoutIcon,
  MoreHorizIcon,
  Tooltip,
  Typography,
} from '@/lib/material';

import type { SidebarNavItem, SidebarNavSection, SidebarProps } from './interfaces';
import {
  AiHelpCard,
  AiHelpCopy,
  AiHelpPenguin,
  AiHelpSubtitle,
  AiHelpTitle,
  BottomNav,
  LatestResumeCard,
  LatestResumeCardHeader,
  LatestResumeFileName,
  LatestResumeMeta,
  MobileDrawerAvatar,
  MobileDrawerHandle,
  MobileDrawerHeader,
  MobileDrawerIdentity,
  MobileDrawerItem,
  MobileDrawerList,
  MobileDrawerSection,
  MobileDrawerSectionLabel,
  MobileDrawerTitle,
  MobileDrawerTitleGroup,
  MoreNavButton,
  NavButton,
  ResumeScoreBadge,
  SidebarFooter,
  SidebarHeader,
  SidebarLogoImage,
  SidebarLogoLink,
  SidebarNav,
  SidebarNavGroup,
  SidebarRoot,
  SidebarSectionDivider,
  SidebarSectionLabel,
  SidebarToggle,
  ViewAllVersionsButton,
  mobileDrawerPaperSx,
  sidebarTextSx,
} from './styles';

const DAY_MS = 1000 * 60 * 60 * 24;

function formatResumeUpdatedAt(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  return `Updated ${days} days ago`;
}

function buildSectionItems(
  sections: readonly SidebarNavSection[],
  items: SidebarNavItem[],
): Array<{ section: SidebarNavSection; items: SidebarNavItem[] }> {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const sectionItemIds = new Set(sections.flatMap((section) => section.itemIds));

  const grouped = sections
    .map((section) => ({
      section,
      items: section.itemIds
        .map((id) => itemById.get(id))
        .filter((item): item is SidebarNavItem => Boolean(item)),
    }))
    .filter((entry) => entry.items.length > 0);

  const orphanItems = items.filter((item) => !sectionItemIds.has(item.id));
  if (orphanItems.length > 0) {
    grouped.push({
      section: { id: 'other', itemIds: orphanItems.map((item) => item.id), label: '' },
      items: orphanItems,
    });
  }

  return grouped;
}

function SidebarNavButton({
  active,
  collapsed,
  item,
  onSelect,
  tone,
}: {
  active: boolean;
  collapsed: boolean;
  item: SidebarNavItem;
  onSelect?: (item: SidebarNavItem) => void;
  tone: NonNullable<SidebarProps['tone']>;
}) {
  const Icon = item.icon;
  const navigationProps = item.href
    ? { component: RouterLink, to: item.href }
    : { type: 'button' as const };

  const button = (
    <NavButton
      {...navigationProps}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      active={active}
      collapsed={collapsed}
      onClick={(event) => {
        if (active) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onSelect?.(item);
      }}
      tone={tone}
    >
      <Icon fontSize="small" />
      {collapsed ? null : <span>{item.label}</span>}
    </NavButton>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <Tooltip disableInteractive placement="right" title={item.label}>
      <span>{button}</span>
    </Tooltip>
  );
}

function BottomNavItem({
  active,
  item,
  onSelect,
}: {
  active: boolean;
  item: SidebarNavItem;
  onSelect?: (item: SidebarNavItem) => void;
}) {
  const Icon = item.icon;
  const navigationProps = item.href
    ? { component: RouterLink, to: item.href }
    : { type: 'button' as const };

  return (
    <MoreNavButton
      {...navigationProps}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      active={active}
      onClick={(event) => {
        if (active) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onSelect?.(item);
      }}
    >
      <Icon fontSize="small" />
      <span>{item.shortLabel ?? item.label}</span>
    </MoreNavButton>
  );
}

function MobileMoreDrawer({
  activeItemId,
  drawerItems,
  hasLatestResume,
  isDownloadingLatestResume,
  onClose,
  onDownloadLatestResume,
  onItemSelect,
  onLogoutClick,
  onOpenResumeVersions,
  onSettingsClick,
  open,
  resumeListLoaded = false,
  userName,
}: {
  activeItemId: string;
  drawerItems: SidebarNavItem[];
  hasLatestResume: boolean;
  isDownloadingLatestResume: boolean;
  onClose: () => void;
  onDownloadLatestResume?: () => void;
  onItemSelect?: (item: SidebarNavItem) => void;
  onLogoutClick?: () => void;
  onOpenResumeVersions?: () => void;
  onSettingsClick?: () => void;
  open: boolean;
  resumeListLoaded?: boolean;
  userName?: string;
}) {
  return (
    <Drawer
      PaperProps={{ sx: mobileDrawerPaperSx }}
      anchor="bottom"
      aria-label={SIDEBAR_COPY.drawerAria}
      onClose={onClose}
      open={open}
    >
      <MobileDrawerHandle />
      <MobileDrawerHeader>
        <MobileDrawerIdentity>
          <MobileDrawerAvatar aria-hidden="true">{getDrawerInitials(userName)}</MobileDrawerAvatar>
          <MobileDrawerTitleGroup>
            <MobileDrawerTitle>{userName?.trim() || BRAND_NAME}</MobileDrawerTitle>
          </MobileDrawerTitleGroup>
        </MobileDrawerIdentity>
        <IconButton aria-label="Close more menu" edge="end" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </MobileDrawerHeader>

      <MobileDrawerSection>
        <MobileDrawerSectionLabel>{SIDEBAR_COPY.drawerPages}</MobileDrawerSectionLabel>
        <MobileDrawerList>
          {drawerItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeItemId;
            const navigationProps = item.href
              ? { component: RouterLink, to: item.href }
              : { type: 'button' as const };

            return (
              <MobileDrawerItem
                {...navigationProps}
                active={active}
                aria-current={active ? 'page' : undefined}
                key={item.id}
                onClick={() => {
                  onItemSelect?.(item);
                  onClose();
                }}
              >
                <Icon fontSize="small" />
                <span>{item.label}</span>
              </MobileDrawerItem>
            );
          })}
        </MobileDrawerList>
      </MobileDrawerSection>

      <Divider />

      <MobileDrawerSection>
        <MobileDrawerSectionLabel>{SIDEBAR_COPY.drawerResume}</MobileDrawerSectionLabel>
        <MobileDrawerList>
          <MobileDrawerItem
            disabled={resumeListLoaded && (!hasLatestResume || isDownloadingLatestResume)}
            onClick={() => {
              onDownloadLatestResume?.();
              onClose();
            }}
            type="button"
          >
            <FileDownloadOutlinedIcon fontSize="small" />
            <span>{isDownloadingLatestResume ? 'Downloading…' : SIDEBAR_COPY.downloadLatest}</span>
          </MobileDrawerItem>
          {onOpenResumeVersions ? (
            <MobileDrawerItem
              onClick={() => {
                onOpenResumeVersions();
                onClose();
              }}
              type="button"
            >
              <DescriptionOutlinedIcon fontSize="small" />
              <span>{SIDEBAR_COPY.viewResumeVersions}</span>
            </MobileDrawerItem>
          ) : null}
        </MobileDrawerList>
      </MobileDrawerSection>

      <Divider />

      <MobileDrawerSection>
        <MobileDrawerSectionLabel>{SIDEBAR_COPY.drawerAccount}</MobileDrawerSectionLabel>
        <MobileDrawerList>
          <MobileDrawerItem
            active={activeItemId === 'settings'}
            onClick={() => {
              onSettingsClick?.();
              onClose();
            }}
            type="button"
          >
            <EditOutlinedIcon fontSize="small" />
            <span>{SIDEBAR_COPY.editProfile}</span>
          </MobileDrawerItem>
          <MobileDrawerItem
            onClick={() => {
              onLogoutClick?.();
              onClose();
            }}
            type="button"
          >
            <LogoutIcon fontSize="small" />
            <span>{SIDEBAR_COPY.logout}</span>
          </MobileDrawerItem>
        </MobileDrawerList>
      </MobileDrawerSection>
    </Drawer>
  );
}

function LatestResumePanel({
  hasLatestResume,
  isDownloadingLatestResume,
  latestResumeName,
  latestResumeScore,
  latestResumeUploadedAt,
  onDownloadLatestResume,
  onOpenResumeVersions,
  resumeListLoaded,
}: {
  hasLatestResume: boolean;
  isDownloadingLatestResume: boolean;
  latestResumeName: string | null;
  latestResumeScore?: number | null;
  latestResumeUploadedAt?: string | null;
  onDownloadLatestResume?: () => void;
  onOpenResumeVersions?: () => void;
  resumeListLoaded: boolean;
}) {
  const updatedLabel = formatResumeUpdatedAt(latestResumeUploadedAt);
  const showScore = latestResumeScore != null && Number.isFinite(latestResumeScore);

  return (
    <LatestResumeCard>
      <LatestResumeCardHeader>
        <DescriptionOutlinedIcon color="primary" fontSize="small" />
        <Typography sx={sidebarTextSx.title}>{SIDEBAR_COPY.latestResumeTitle}</Typography>
        {showScore ? <ResumeScoreBadge>{Math.round(latestResumeScore)}%</ResumeScoreBadge> : null}
      </LatestResumeCardHeader>

      {hasLatestResume && latestResumeName ? (
        <>
          <LatestResumeFileName title={latestResumeName}>{latestResumeName}</LatestResumeFileName>
          {updatedLabel ? <LatestResumeMeta>{updatedLabel}</LatestResumeMeta> : null}
        </>
      ) : (
        <LatestResumeMeta>
          {resumeListLoaded
            ? 'No resume uploaded yet. Add one from Edit Profile.'
            : 'Your most recent upload will appear here.'}
        </LatestResumeMeta>
      )}

      <Button
        disabled={resumeListLoaded && !hasLatestResume}
        fullWidth
        isLoading={isDownloadingLatestResume}
        onClick={onDownloadLatestResume}
        size="small"
        startIcon={<FileDownloadOutlinedIcon />}
      >
        {SIDEBAR_COPY.downloadLatest}
      </Button>

      {onOpenResumeVersions ? (
        <ViewAllVersionsButton onClick={onOpenResumeVersions} type="button" variant="text">
          {SIDEBAR_COPY.viewAllVersions}
        </ViewAllVersionsButton>
      ) : null}
    </LatestResumeCard>
  );
}

function AiAssistantPanel({ onOpenAiAssistant }: { onOpenAiAssistant?: () => void }) {
  if (!onOpenAiAssistant) return null;

  return (
    <AiHelpCard
      aria-label={SIDEBAR_COPY.openAiAssistantAria}
      onClick={onOpenAiAssistant}
      type="button"
    >
      <AiHelpPenguin alt="" src={penguinLogoUrl} />
      <AiHelpCopy>
        <AiHelpTitle>{SIDEBAR_COPY.aiHelpTitle}</AiHelpTitle>
        <AiHelpSubtitle>{SIDEBAR_COPY.aiHelpSubtitle}</AiHelpSubtitle>
      </AiHelpCopy>
      <ArrowForwardIcon color="primary" fontSize="small" />
    </AiHelpCard>
  );
}

export function Sidebar({
  activeItemId = 'dashboard',
  className,
  isDownloadingLatestResume = false,
  items = DEFAULT_SIDEBAR_ITEMS,
  latestResumeName = null,
  latestResumeScore = null,
  latestResumeUploadedAt = null,
  mobileMode,
  onDownloadLatestResume,
  onItemSelect,
  onLogoutClick,
  onOpenAiAssistant,
  onOpenResumeVersions,
  onSettingsClick,
  onVariantChange,
  resumeListLoaded = false,
  sections = DEFAULT_SIDEBAR_SECTIONS,
  tone = 'light',
  userName,
  variant = 'open',
}: SidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const collapsed = variant === 'collapsed';
  const nextVariant = collapsed ? 'open' : 'collapsed';
  const hasLatestResume = Boolean(latestResumeName);
  const groupedSections = useMemo(() => buildSectionItems(sections, items), [items, sections]);
  const bottomNavItems = DEFAULT_BOTTOM_NAV_IDS.map((id) =>
    items.find((item) => item.id === id),
  ).filter((item): item is SidebarNavItem => Boolean(item));
  const drawerItems = DEFAULT_MOBILE_DRAWER_NAV_IDS.map((id) =>
    items.find((item) => item.id === id),
  ).filter((item): item is SidebarNavItem => Boolean(item));
  const moreActive =
    drawerItems.some((item) => item.id === activeItemId) || activeItemId === 'settings';

  if (mobileMode === 'bottomNav') {
    return (
      <>
        <BottomNav aria-label={SIDEBAR_COPY.bottomNavAria}>
          {bottomNavItems.map((item) => (
            <BottomNavItem
              active={item.id === activeItemId}
              item={item}
              key={item.id}
              onSelect={onItemSelect}
            />
          ))}
          <MoreNavButton
            active={moreActive || moreOpen}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label={SIDEBAR_COPY.moreAria}
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <MoreHorizIcon fontSize="small" />
            <span>{SIDEBAR_COPY.moreLabel}</span>
          </MoreNavButton>
        </BottomNav>

        <MobileMoreDrawer
          activeItemId={activeItemId}
          drawerItems={drawerItems}
          hasLatestResume={hasLatestResume}
          isDownloadingLatestResume={isDownloadingLatestResume}
          onClose={() => setMoreOpen(false)}
          onDownloadLatestResume={onDownloadLatestResume}
          onItemSelect={onItemSelect}
          onLogoutClick={onLogoutClick}
          onOpenResumeVersions={onOpenResumeVersions}
          onSettingsClick={onSettingsClick}
          open={moreOpen}
          resumeListLoaded={resumeListLoaded}
          userName={userName}
        />
      </>
    );
  }

  return (
    <SidebarRoot
      aria-label={SIDEBAR_COPY.primaryNavAria}
      className={className}
      tone={tone}
      variant={variant}
    >
      <SidebarToggle
        aria-label={collapsed ? SIDEBAR_COPY.expandAria : SIDEBAR_COPY.collapseAria}
        onClick={() => onVariantChange?.(nextVariant)}
        size="small"
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </SidebarToggle>

      <SidebarHeader collapsed={collapsed}>
        <SidebarLogoLink aria-label={BRAND_NAME} to={ROUTES.DASHBOARD}>
          <SidebarLogoImage
            alt=""
            collapsed={collapsed}
            src={collapsed ? penguinLogoUrl : fullLogoUrl}
          />
        </SidebarLogoLink>
      </SidebarHeader>

      <SidebarNav>
        {groupedSections.map(({ section, items: sectionItems }, index) => (
          <SidebarNavGroup key={section.id}>
            {collapsed || !section.label ? null : (
              <SidebarSectionLabel>{section.label}</SidebarSectionLabel>
            )}
            {sectionItems.map((item) => (
              <SidebarNavButton
                active={item.id === activeItemId}
                collapsed={collapsed}
                item={item}
                key={item.id}
                onSelect={onItemSelect}
                tone={tone}
              />
            ))}
            {collapsed || index >= groupedSections.length - 1 ? null : <SidebarSectionDivider />}
          </SidebarNavGroup>
        ))}
      </SidebarNav>

      {collapsed ? null : (
        <SidebarFooter>
          <LatestResumePanel
            hasLatestResume={hasLatestResume}
            isDownloadingLatestResume={isDownloadingLatestResume}
            latestResumeName={latestResumeName}
            latestResumeScore={latestResumeScore}
            latestResumeUploadedAt={latestResumeUploadedAt}
            onDownloadLatestResume={onDownloadLatestResume}
            onOpenResumeVersions={onOpenResumeVersions}
            resumeListLoaded={resumeListLoaded}
          />
          <AiAssistantPanel onOpenAiAssistant={onOpenAiAssistant} />
        </SidebarFooter>
      )}
    </SidebarRoot>
  );
}

function getDrawerInitials(name?: string) {
  const [firstName = '', secondName = ''] = (name ?? '').trim().split(/\s+/);
  return `${firstName.charAt(0)}${secondName.charAt(0)}`.toUpperCase() || USER_INITIALS_FALLBACK;
}
