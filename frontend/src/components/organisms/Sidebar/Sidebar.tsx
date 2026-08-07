import { useState } from 'react';
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
  SIDEBAR_COPY,
  USER_INITIALS_FALLBACK,
} from '@/constants/ui';
import {
  Box,
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

import type { SidebarNavItem, SidebarProps } from './interfaces';
import {
  BottomNav,
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
  mobileDrawerPaperSx,
  NavButton,
  SidebarHeader,
  SidebarLogoImage,
  SidebarLogoLink,
  SidebarNav,
  SidebarPanel,
  SidebarRoot,
  SidebarToggle,
  sidebarTextSx,
} from './styles';

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
        // Stay put when the active sidebar item is clicked again (avoids discard modal / remount).
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

export function Sidebar({
  activeItemId = 'dashboard',
  className,
  isDownloadingLatestResume = false,
  items = DEFAULT_SIDEBAR_ITEMS,
  latestResumeName = null,
  mobileMode,
  onDownloadLatestResume,
  onItemSelect,
  onLogoutClick,
  onOpenResumeVersions,
  onSettingsClick,
  onVariantChange,
  resumeListLoaded = false,
  tone = 'light',
  userName,
  variant = 'open',
}: SidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const collapsed = variant === 'collapsed';
  const nextVariant = collapsed ? 'open' : 'collapsed';
  const hasLatestResume = Boolean(latestResumeName);
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
        {items.map((item) => (
          <SidebarNavButton
            active={item.id === activeItemId}
            collapsed={collapsed}
            item={item}
            key={item.id}
            onSelect={onItemSelect}
            tone={tone}
          />
        ))}
      </SidebarNav>

      {collapsed ? null : (
        <SidebarPanel>
          <Box alignItems="center" display="flex" gap={1}>
            <DescriptionOutlinedIcon color="primary" fontSize="small" />
            <Typography sx={sidebarTextSx.title}>Latest Resume</Typography>
          </Box>
          <Typography sx={sidebarTextSx.muted}>
            {hasLatestResume
              ? 'Download your most recent uploaded resume.'
              : resumeListLoaded
                ? 'No resume uploaded yet. Add one from Edit Profile.'
                : 'Download your most recent uploaded resume.'}
          </Typography>
          <Button
            disabled={resumeListLoaded && !hasLatestResume}
            fullWidth
            isLoading={isDownloadingLatestResume}
            onClick={onDownloadLatestResume}
            size="small"
            startIcon={<FileDownloadOutlinedIcon />}
          >
            Download Latest
          </Button>
          {onOpenResumeVersions ? (
            <Button fullWidth onClick={onOpenResumeVersions} size="small" variant="ghost">
              View all versions
            </Button>
          ) : null}
        </SidebarPanel>
      )}
    </SidebarRoot>
  );
}

function getDrawerInitials(name?: string) {
  const [firstName = '', secondName = ''] = (name ?? '').trim().split(/\s+/);
  return `${firstName.charAt(0)}${secondName.charAt(0)}`.toUpperCase() || USER_INITIALS_FALLBACK;
}
