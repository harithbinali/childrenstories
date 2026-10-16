/** Rounded-square checkbox that pops a mint check. */
export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
