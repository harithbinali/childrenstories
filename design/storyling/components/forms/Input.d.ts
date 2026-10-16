/** Soft rounded text field with label, hint and friendly error. */
export interface InputProps {
  label?: string;
  hint?: string;
  /** Error message; turns border cherry and replaces hint */
  error?: string;
  iconStart?: string;
  iconEnd?: string;
  /** Renders a textarea */
  multiline?: boolean;
  id?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
