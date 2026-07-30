import { useId, useState, type MouseEvent } from 'react';

import { KeyboardArrowDownIcon, Menu, MenuItem } from '@/lib/material';

import { DropdownButton } from './styles';

export interface FilterDropdownOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps {
  fullWidth?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  value: string;
}

export function FilterDropdown({
  fullWidth = false,
  label,
  onChange,
  options,
  value,
}: FilterDropdownProps) {
  const menuId = useId();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const menuWidth = anchorElement?.offsetWidth;
  const selectedOption = options.find((option) => option.value === value);
  const isOpen = Boolean(anchorElement);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorElement(null);
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    handleClose();
  };

  return (
    <>
      <DropdownButton
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        fullWidth={fullWidth}
        onClick={handleOpen}
        type="button"
      >
        <span>{selectedOption?.value === 'all' ? label : selectedOption?.label}</span>
        <KeyboardArrowDownIcon fontSize="small" />
      </DropdownButton>

      <Menu
        anchorEl={anchorElement}
        id={menuId}
        onClose={handleClose}
        open={isOpen}
        slotProps={{
          paper: {
            sx: {
              minWidth: menuWidth,
            },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            selected={option.value === value}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
