import { Link as RouterLink } from 'react-router-dom';

import fullLogoUrl from '@/assets/logo/career-copilot-logo.png';
import {
  LANDING_COPY,
  LANDING_FOOTER_COMPANY,
  LANDING_FOOTER_PLATFORM,
  LANDING_FOOTER_RESOURCES,
  LANDING_LINKEDIN_URL,
  LANDING_SECTION_IDS,
} from '@/constants/pages/landing';
import { ROUTES } from '@/constants/routes';
import { LinkedInIcon, styled } from '@/lib/material';
import { borderRadius, borderWidth, colorTokens, fontSize, fontWeight, spacing } from '@/tokens';

const Footer = styled('footer')({
  background: colorTokens.backgroundCard,
  borderTop: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  padding: `${spacing[12]} ${spacing[4]} ${spacing[8]}`,

  '@media (max-width: 48rem)': {
    padding: `${spacing[10]} ${spacing[3]} ${spacing[6]}`,
  },
});

const Inner = styled('div')({
  display: 'grid',
  gap: spacing[8],
  margin: '0 auto',
  maxWidth: '72rem',
  minWidth: 0,
  width: '100%',
});

const Grid = styled('div')({
  display: 'grid',
  gap: spacing[6],
  gridTemplateColumns: 'minmax(0, 1.6fr) repeat(4, minmax(0, 1fr))',

  '@media (max-width: 1023px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },

  '@media (max-width: 40rem)': {
    gap: spacing[5],
    gridTemplateColumns: '1fr',
  },
});

const BrandBlock = styled('div')({
  display: 'grid',
  gap: spacing[3],

  '@media (max-width: 1023px)': {
    gridColumn: '1 / -1',
  },
});

const Brand = styled(RouterLink)({
  alignItems: 'center',
  color: 'inherit',
  display: 'inline-flex',
  textDecoration: 'none',
  width: 'fit-content',
});

const Logo = styled('img')({
  display: 'block',
  height: '2.75rem',
  maxWidth: '12rem',
  objectFit: 'contain',
  width: 'auto',
});

const Description = styled('p')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  margin: 0,
  maxWidth: '20rem',
});

const Column = styled('div')({
  alignContent: 'start',
  display: 'grid',
  gap: spacing[2],
  justifyItems: 'start',
});

const ColumnTitle = styled('p')({
  color: colorTokens.textPrimary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  margin: 0,
});

const FooterLink = styled('a')({
  color: colorTokens.textSecondary,
  fontSize: fontSize.sm,
  lineHeight: 1.5,
  textDecoration: 'none',

  '&:hover': {
    color: colorTokens.actionPrimary,
  },
});

const SocialLink = styled('a')({
  alignItems: 'center',
  borderRadius: borderRadius.lg,
  color: colorTokens.actionPrimary,
  display: 'inline-flex',
  height: '2.25rem',
  justifyContent: 'center',
  marginLeft: `-${spacing[1]}`,
  transition: 'background 160ms ease',
  width: '2.25rem',

  '&:hover': {
    background: colorTokens.actionPrimarySubtle,
  },

  '&:focus-visible': {
    outline: `0.1875rem solid ${colorTokens.actionPrimary}`,
    outlineOffset: '0.125rem',
  },
});

const Bottom = styled('div')({
  borderTop: `${borderWidth.thin} solid ${colorTokens.borderSubtle}`,
  color: colorTokens.textTertiary,
  fontSize: fontSize.sm,
  paddingTop: spacing[4],
});

export function LandingFooter() {
  return (
    <Footer>
      <Inner>
        <Grid>
          <BrandBlock>
            <Brand to={ROUTES.HOME}>
              <Logo alt="Career Copilot" height={44} src={fullLogoUrl} width={160} />
            </Brand>
            <Description>{LANDING_COPY.footer.description}</Description>
          </BrandBlock>

          <Column>
            <ColumnTitle>{LANDING_COPY.footer.platform}</ColumnTitle>
            {LANDING_FOOTER_PLATFORM.map((link) => (
              <FooterLink href={link.href} key={link.label}>
                {link.label}
              </FooterLink>
            ))}
          </Column>

          <Column id={LANDING_SECTION_IDS.resources}>
            <ColumnTitle>{LANDING_COPY.footer.resources}</ColumnTitle>
            {LANDING_FOOTER_RESOURCES.map((link) => (
              <FooterLink href={link.href} key={link.label}>
                {link.label}
              </FooterLink>
            ))}
          </Column>

          <Column>
            <ColumnTitle>{LANDING_COPY.footer.company}</ColumnTitle>
            {LANDING_FOOTER_COMPANY.map((link) => (
              <FooterLink href={link.href} key={link.label}>
                {link.label}
              </FooterLink>
            ))}
          </Column>

          <Column>
            <ColumnTitle>{LANDING_COPY.footer.connect}</ColumnTitle>
            <SocialLink
              aria-label={LANDING_COPY.footer.linkedInAria}
              href={LANDING_LINKEDIN_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <LinkedInIcon fontSize="small" />
            </SocialLink>
          </Column>
        </Grid>

        <Bottom>{LANDING_COPY.footer.copyright}</Bottom>
      </Inner>
    </Footer>
  );
}
