/** Native select styled as a soft rounded field. */
export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
  iconStart?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
