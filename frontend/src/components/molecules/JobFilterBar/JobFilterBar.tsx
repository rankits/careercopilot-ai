import { KeyboardArrowDownIcon, SmartToyOutlinedIcon } from '@/lib/material';

import { FilterButton, FilterRoot } from './styles';

export interface JobFilter {
  active?: boolean;
  icon?: 'ai';
  id: string;
  label: string;
  menu?: boolean;
}

export interface JobFilterBarProps {
  filters: JobFilter[];
  onFilterClick?: (filter: JobFilter) => void;
}

export function JobFilterBar({ filters, onFilterClick }: JobFilterBarProps) {
  return (
    <FilterRoot aria-label="Job filters">
      {filters.map((filter) => (
        <FilterButton
          active={Boolean(filter.active)}
          aria-pressed={Boolean(filter.active)}
          key={filter.id}
          onClick={() => onFilterClick?.(filter)}
          type="button"
        >
          {filter.icon === 'ai' ? <SmartToyOutlinedIcon fontSize="small" /> : null}
          {filter.label}
          {filter.menu ? <KeyboardArrowDownIcon fontSize="small" /> : null}
        </FilterButton>
      ))}
    </FilterRoot>
  );
}
