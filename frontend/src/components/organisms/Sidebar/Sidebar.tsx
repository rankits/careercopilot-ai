import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import fullLogoUrl from '@/assets/logo/career-copilot-logo.png';
import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.png';
import {
  Box,
  ChevronLeftIcon,
  ChevronRightIcon,
  DescriptionOutlinedIcon,
  FileDownloadOutlinedIcon,
  Typography,
} from '@/lib/material';

import { DEFAULT_SIDEBAR_ITEMS } from './constants';
import type { SidebarNavItem, SidebarProps } from './interfaces';
import {
  BottomNav,
  NavButton,
  SidebarHeader,
  SidebarLogoImage,
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

  return (
    <NavButton
      {...navigationProps}
      aria-current={active ? 'page' : undefined}
      active={active}
      collapsed={collapsed}
      onClick={() => onSelect?.(item)}
      tone={tone}
    >
      <Icon fontSize="small" />
      {collapsed ? null : <span>{item.label}</span>}
    </NavButton>
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
  onOpenResumeVersions,
  onVariantChange,
  tone = 'light',
  variant = 'open',
}: SidebarProps) {
  const collapsed = variant === 'collapsed';
  const nextVariant = collapsed ? 'open' : 'collapsed';
  const hasLatestResume = Boolean(latestResumeName);

  if (mobileMode === 'bottomNav') {
    return (
      <BottomNav aria-label="Mobile navigation">
        {items.slice(0, 5).map((item) => (
          <SidebarNavButton
            active={item.id === activeItemId}
            collapsed
            item={item}
            key={item.id}
            onSelect={onItemSelect}
            tone="light"
          />
        ))}
      </BottomNav>
    );
  }

  return (
    <SidebarRoot
      aria-label="Primary navigation"
      className={className}
      tone={tone}
      variant={variant}
    >
      <SidebarToggle
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => onVariantChange?.(nextVariant)}
        size="small"
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </SidebarToggle>

      <SidebarHeader collapsed={collapsed}>
        <SidebarLogoImage
          alt="Career Copilot"
          collapsed={collapsed}
          src={collapsed ? penguinLogoUrl : fullLogoUrl}
        />
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
              : 'No resume uploaded yet. Add one from Edit Profile.'}
          </Typography>
          <Button
            disabled={!hasLatestResume}
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
