import { useId, useState, type MouseEvent } from 'react';

import { KeyboardArrowDownIcon, Menu, MenuItem } from '@/lib/material';

import {
  DropdownButton,
  DropdownButtonLabel,
  DropdownButtonPrefix,
  DropdownButtonValue,
  FilterFieldRoot,
} from './styles';

export interface FilterDropdownOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps {
  fullWidth?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  prefix?: string;
  value: string;
}

export function FilterDropdown({
  fullWidth = false,
  label,
  onChange,
  options,
  prefix,
  value,
}: FilterDropdownProps) {
  const menuId = useId();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const menuWidth = anchorElement?.offsetWidth;
  const selectedOption = options.find((option) => option.value === value);
  const buttonText = selectedOption?.label ?? label;
  const accessibleName = prefix ? `${prefix}: ${buttonText}` : buttonText;
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

  const control = (
    <>
      <DropdownButton
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={accessibleName}
        bordered
        fullWidth={fullWidth}
        onClick={handleOpen}
        type="button"
      >
        {prefix ? (
          <DropdownButtonLabel>
            <DropdownButtonPrefix>{prefix}</DropdownButtonPrefix>
            <DropdownButtonValue>{buttonText}</DropdownButtonValue>
          </DropdownButtonLabel>
        ) : (
          <DropdownButtonValue>{buttonText}</DropdownButtonValue>
        )}
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

  if (!fullWidth) {
    return control;
  }

  return <FilterFieldRoot fullWidth>{control}</FilterFieldRoot>;
}
