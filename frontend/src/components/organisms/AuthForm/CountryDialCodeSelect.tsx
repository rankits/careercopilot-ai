import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { useMemo, useState, type ReactElement, type SVGProps } from 'react';

import { borderRadius, colorTokens, fontSize, spacing } from '@/tokens';
import { COUNTRY_DIAL_CODES, type CountryDialCode } from '@/utils/phone';

import { authFormSx } from './styles';

type FlagComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const FLAGS = FlagIcons as Record<string, FlagComponent>;

interface CountryDialCodeSelectProps {
  onChange: (code: CountryDialCode) => void;
  value: CountryDialCode;
}

function Flag({ region }: { region: string }) {
  const Icon = FLAGS[region];
  if (!Icon) {
    return (
      <Box
        aria-hidden
        component="span"
        sx={{
          bgcolor: colorTokens.borderDefault,
          borderRadius: '2px',
          display: 'inline-block',
          height: 14,
          width: 20,
        }}
      />
    );
  }
  return <Icon style={{ display: 'block', height: 14, width: 20 }} title={region} />;
}

export function CountryDialCodeSelect({ onChange, value }: CountryDialCodeSelectProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const selected = useMemo(
    () => COUNTRY_DIAL_CODES.find((item) => item.code === value) ?? COUNTRY_DIAL_CODES[0],
    [value],
  );

  return (
    <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
      <Box sx={{ width: '100%' }}>
        <Box
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Country dial code"
          component="button"
          onClick={(event) => {
            setAnchorEl(open ? null : event.currentTarget);
          }}
          sx={authFormSx.countryCodeSelect}
          type="button"
        >
          <Flag region={selected.region} />
          <Typography component="span" sx={{ fontSize: fontSize.sm, fontWeight: 600 }}>
            {selected.code}
          </Typography>
        </Box>
        <Popper anchorEl={anchorEl} open={open} placement="bottom-start" sx={{ zIndex: 1400 }}>
          <Paper
            elevation={0}
            role="listbox"
            sx={{
              border: `0.0625rem solid ${colorTokens.borderDefault}`,
              borderRadius: borderRadius.lg,
              maxHeight: 240,
              mt: spacing[1],
              overflowY: 'auto',
              width: 200,
            }}
          >
            {COUNTRY_DIAL_CODES.map((item) => (
              <MenuItem
                key={item.code}
                onClick={() => {
                  onChange(item.code);
                  setAnchorEl(null);
                }}
                selected={item.code === value}
                sx={{ gap: spacing[2], minHeight: spacing[10] }}
              >
                <Flag region={item.region} />
                <Typography sx={{ fontSize: fontSize.sm }}>{item.label}</Typography>
              </MenuItem>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
