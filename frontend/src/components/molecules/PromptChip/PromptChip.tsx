import { PromptChipButton } from './styles';

export interface PromptChipProps {
  disabled?: boolean;
  label: string;
  onSelect: (label: string) => void;
}

export function PromptChip({ disabled = false, label, onSelect }: PromptChipProps) {
  return (
    <PromptChipButton
      clickable={!disabled}
      disabled={disabled}
      label={label}
      onClick={() => {
        if (!disabled) onSelect(label);
      }}
      variant="outlined"
    />
  );
}
