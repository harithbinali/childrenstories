/** Candy-striped progress bar. */
export interface ProgressProps {
  value: number;
  /** @default 100 */
  max?: number;
  /** @default "sun" */
  tone?: 'sun' | 'mint' | 'sky' | 'bubble' | 'grape';
  label?: string;
  showValue?: boolean;
  /** @default "md" (18px). sm = 10px */
  size?: 'sm' | 'md';
  /** Animated stripes. @default true */
  striped?: boolean;
  style?: React.CSSProperties;
}
export function Progress(props: ProgressProps): JSX.Element;
