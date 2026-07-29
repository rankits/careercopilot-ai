import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import fullLogoUrl from '@/assets/logo/career-copilot-full-logo.svg';
import penguinLogoUrl from '@/assets/logo/career-copilot-penguin.svg';
import {
  Box,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinearProgress,
  StarIcon,
  Typography,
} from '@/lib/material';

import { DEFAULT_SIDEBAR_ITEMS } from './constants';
import type { SidebarNavItem, SidebarProps } from './interfaces';
import {
  BottomNav,
  NavButton,
  SidebarGoal,
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
  items = DEFAULT_SIDEBAR_ITEMS,
  mobileMode,
  onItemSelect,
  onVariantChange,
  onUploadResume,
  tone = 'light',
  variant = 'open',
}: SidebarProps) {
  const collapsed = variant === 'collapsed';
  const nextVariant = collapsed ? 'open' : 'collapsed';

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
          <Typography sx={sidebarTextSx.title}>Upload Resume</Typography>
          <Typography sx={sidebarTextSx.muted}>Get AI analysis and better job matches</Typography>
          <Button fullWidth onClick={onUploadResume} size="small">
            Upload Now
          </Button>
        </SidebarPanel>
      )}

      {collapsed ? (
        <Box sx={{ display: 'grid', justifyItems: 'center' }}>
          <StarIcon color="warning" fontSize="small" />
        </Box>
      ) : (
        <SidebarGoal>
          <Typography sx={sidebarTextSx.title}>Daily Goal</Typography>
          <Typography sx={sidebarTextSx.muted}>3 / 5 applications today</Typography>
          <LinearProgress value={60} variant="determinate" />
        </SidebarGoal>
      )}
    </SidebarRoot>
  );
}
