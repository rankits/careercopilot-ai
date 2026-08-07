import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';

import fullLogoUrl from '@/assets/logo/career-copilot-logo.png';
import { LANDING_COPY, LANDING_NAV_ITEMS } from '@/constants/pages/landing';
import { ROUTES } from '@/constants/routes';
import { borderRadius, borderWidth, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

const Header = styled('header')({
  backdropFilter: 'blur(12px)',
  background: colorTokens.backgroundCardTranslucent,
  borderBottom: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  position: 'sticky',
  top: 0,
  zIndex: 20,
});

const Bar = styled('div')({
  alignItems: 'center',
  display: 'grid',
  gap: spacing[3],
  gridTemplateColumns: 'auto 1fr auto',
  margin: '0 auto',
  maxWidth: '72rem',
  minWidth: 0,
  padding: `${spacing[3]} ${spacing[4]}`,
  width: '100%',

  '@media (max-width: 1023px)': {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    padding: `${spacing[3]} ${spacing[3]}`,
  },
});

const Brand = styled(RouterLink)({
  alignItems: 'center',
  color: 'inherit',
  display: 'inline-flex',
  minWidth: 0,
  textDecoration: 'none',
});

const BrandLogo = styled('img')({
  display: 'block',
  height: '2.75rem',
  maxWidth: 'min(11rem, 55vw)',
  objectFit: 'contain',
  width: 'auto',

  '@media (max-width: 30rem)': {
    height: '2.25rem',
  },
});

const Nav = styled('nav')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing[1],
  justifyContent: 'center',

  '@media (max-width: 1023px)': {
    display: 'none',
  },
});

const NavLink = styled('a')({
  borderRadius: borderRadius.lg,
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semiBold,
  padding: `${spacing[2]} ${spacing[3]}`,
  textDecoration: 'none',
  transition: 'background 160ms ease, color 160ms ease',
  whiteSpace: 'nowrap',

  '&:hover': {
    background: colorTokens.actionGhostHover,
    color: colorTokens.actionPrimary,
  },

  '&:focus-visible': {
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.125rem',
  },
});

const Actions = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: spacing[2],
});

const DesktopActions = styled('div')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],

  '@media (max-width: 1023px)': {
    display: 'none',
  },
});

const MobileMenuButton = styled(IconButton)({
  '@media (min-width: 1024px)': {
    display: 'none',
  },
});

const DrawerContent = styled('div')({
  display: 'grid',
  gap: spacing[4],
  padding: spacing[4],
  width: 'min(20rem, 85vw)',
});

const DrawerHeader = styled('div')({
  alignItems: 'center',
  display: 'flex',
  gap: spacing[2],
  justifyContent: 'space-between',
});

const DrawerNav = styled('nav')({
  display: 'grid',
  gap: spacing[1],
});

const DrawerLink = styled('a')({
  borderRadius: borderRadius.lg,
  color: colorTokens.textPrimary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semiBold,
  padding: spacing[3],
  textDecoration: 'none',

  '&:hover': {
    background: colorTokens.actionGhostHover,
    color: colorTokens.actionPrimary,
  },
});

const DrawerActions = styled('div')({
  display: 'grid',
  gap: spacing[2],
});

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const close = () => setOpen(false);

  return (
    <Header>
      <Bar>
        <Brand to={ROUTES.HOME}>
          <BrandLogo alt="Career Copilot" height={44} src={fullLogoUrl} width={160} />
        </Brand>

        <Nav aria-label="Primary">
          {LANDING_NAV_ITEMS.map((item) => (
            <NavLink href={item.href} key={item.id}>
              {item.label}
            </NavLink>
          ))}
        </Nav>

        <Actions>
          <DesktopActions>
            <Button component={RouterLink} to={ROUTES.LOGIN} variant="ghost">
              {LANDING_COPY.nav.signIn}
            </Button>
            <Button component={RouterLink} to={ROUTES.REGISTER}>
              {LANDING_COPY.nav.getStarted}
            </Button>
          </DesktopActions>

          {!isDesktop ? (
            <MobileMenuButton aria-label={LANDING_COPY.nav.menuAria} onClick={() => setOpen(true)}>
              <MenuIcon />
            </MobileMenuButton>
          ) : null}
        </Actions>
      </Bar>

      <Drawer anchor="right" onClose={close} open={open}>
        <DrawerContent>
          <DrawerHeader>
            <BrandLogo alt="Career Copilot" height={40} src={fullLogoUrl} width={140} />
            <IconButton aria-label={LANDING_COPY.nav.closeMenuAria} onClick={close}>
              <CloseIcon />
            </IconButton>
          </DrawerHeader>
          <DrawerNav aria-label="Mobile primary">
            {LANDING_NAV_ITEMS.map((item) => (
              <DrawerLink href={item.href} key={item.id} onClick={close}>
                {item.label}
              </DrawerLink>
            ))}
          </DrawerNav>
          <DrawerActions>
            <Button component={RouterLink} onClick={close} to={ROUTES.LOGIN} variant="outline">
              {LANDING_COPY.nav.signIn}
            </Button>
            <Button component={RouterLink} onClick={close} to={ROUTES.REGISTER}>
              {LANDING_COPY.nav.getStarted}
            </Button>
          </DrawerActions>
        </DrawerContent>
      </Drawer>
    </Header>
  );
}
