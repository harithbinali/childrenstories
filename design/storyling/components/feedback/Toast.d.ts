/** Floating notification card with a tilted colour icon tile. */
export interface ToastProps {
  /** @default "mint" */
  tone?: 'mint' | 'sun' | 'sky' | 'cherry' | 'grape';
  /** Overrides tone's default icon */
  icon?: string;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export function Toast(props: ToastProps): JSX.Element;
