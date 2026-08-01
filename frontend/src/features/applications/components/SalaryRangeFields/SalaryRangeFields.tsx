import { Input } from '@/components/atoms/Input';
import { FilterDropdown } from '@/components/molecules';

import { addApplicationCurrencyOptions } from '@/constants/pages/addApplication';

import { SalaryDash, SalaryField, SalaryFieldError, SalaryRow } from '../ApplicationDialog/styles';

export interface SalaryRangeFieldsProps {
  currency: string;
  onCurrencyChange: (value: string) => void;
  onSalaryMaxBlur?: () => void;
  onSalaryMaxChange: (value: string) => void;
  onSalaryMinBlur?: () => void;
  onSalaryMinChange: (value: string) => void;
  salaryMax: string;
  salaryMaxError?: string;
  salaryMin: string;
  salaryMinError?: string;
}

export function SalaryRangeFields({
  currency,
  onCurrencyChange,
  onSalaryMaxBlur,
  onSalaryMaxChange,
  onSalaryMinBlur,
  onSalaryMinChange,
  salaryMax,
  salaryMaxError,
  salaryMin,
  salaryMinError,
}: SalaryRangeFieldsProps) {
  return (
    <SalaryRow>
      <SalaryField>
        <Input
          aria-label="Minimum salary"
          fullWidth
          inputMode="decimal"
          onBlur={onSalaryMinBlur}
          onChange={(event) => onSalaryMinChange(event.target.value)}
          placeholder="Min"
          size="small"
          slotProps={{
            htmlInput: {
              'aria-invalid': salaryMinError ? true : undefined,
            },
          }}
          tone={salaryMinError ? 'error' : 'default'}
          value={salaryMin}
        />
        <SalaryFieldError aria-hidden={!salaryMinError} role={salaryMinError ? 'alert' : undefined}>
          {salaryMinError ?? '\u00A0'}
        </SalaryFieldError>
      </SalaryField>
      <SalaryDash>–</SalaryDash>
      <SalaryField>
        <Input
          aria-label="Maximum salary"
          fullWidth
          inputMode="decimal"
          onBlur={onSalaryMaxBlur}
          onChange={(event) => onSalaryMaxChange(event.target.value)}
          placeholder="Max"
          size="small"
          slotProps={{
            htmlInput: {
              'aria-invalid': salaryMaxError ? true : undefined,
            },
          }}
          tone={salaryMaxError ? 'error' : 'default'}
          value={salaryMax}
        />
        <SalaryFieldError aria-hidden={!salaryMaxError} role={salaryMaxError ? 'alert' : undefined}>
          {salaryMaxError ?? '\u00A0'}
        </SalaryFieldError>
      </SalaryField>
      <SalaryField>
        <FilterDropdown
          fullWidth
          label="USD"
          onChange={onCurrencyChange}
          options={addApplicationCurrencyOptions}
          value={currency}
        />
        <SalaryFieldError aria-hidden>&nbsp;</SalaryFieldError>
      </SalaryField>
    </SalaryRow>
  );
}
