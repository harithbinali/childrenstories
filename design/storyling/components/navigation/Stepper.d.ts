/** Horizontal step tracker for the story creator and checkout. Mirrors in RTL. */
export interface StepperProps {
  steps: Array<string | { label: string; icon?: string }>;
  /** Zero-based current step */
  current: number;
  style?: React.CSSProperties;
}
export function Stepper(props: StepperProps): JSX.Element;
