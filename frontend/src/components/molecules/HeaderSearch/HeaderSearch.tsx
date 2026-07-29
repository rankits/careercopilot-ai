import type { ChangeEventHandler } from 'react';

import { Input } from '@/components/atoms/Input';

import { SearchOutlinedIcon } from '@/lib/material';

import { headerSearchSx } from './styles';

export interface HeaderSearchProps {
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  value?: string;
}

export function HeaderSearch({
  onChange,
  placeholder = 'Search jobs, companies, skills...',
  value,
}: HeaderSearchProps) {
  return (
    <Input
      fullWidth
      inputVariant="filled"
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      slotProps={{ htmlInput: { 'aria-label': 'Search' } }}
      startAdornment={<SearchOutlinedIcon fontSize="small" />}
      sx={headerSearchSx}
      value={value}
    />
  );
}
