/** Grape toggle whose knob carries a star (or any icon) that lights up when on. */
export interface SwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  /** Knob icon. @default "star" */
  icon?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}
export function Switch(props: SwitchProps): JSX.Element;
