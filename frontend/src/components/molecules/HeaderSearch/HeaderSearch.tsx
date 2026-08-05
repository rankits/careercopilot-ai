import type { ChangeEventHandler } from 'react';

import { Input } from '@/components/atoms/Input';

import { HEADER_SEARCH_COPY } from '@/constants/ui';
import { SearchOutlinedIcon } from '@/lib/material';

import { headerSearchSx } from './styles';

export interface HeaderSearchProps {
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  value?: string;
}

export function HeaderSearch({
  onChange,
  placeholder = HEADER_SEARCH_COPY.placeholder,
  value,
}: HeaderSearchProps) {
  return (
    <Input
      fullWidth
      inputVariant="filled"
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      slotProps={{ htmlInput: { 'aria-label': HEADER_SEARCH_COPY.ariaLabel } }}
      startAdornment={<SearchOutlinedIcon fontSize="small" />}
      sx={headerSearchSx}
      value={value}
    />
  );
}
