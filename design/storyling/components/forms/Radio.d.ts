/** Round radio with a bouncy blue dot. Group by shared name. */
export interface RadioProps {
  label?: React.ReactNode;
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}
export function Radio(props: RadioProps): JSX.Element;
