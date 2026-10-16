/**
 * Modal with pop-in, blurred navy overlay and optional floating icon medallion.
 */
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  /** Phosphor icon in a floating medallion; centres the layout */
  icon?: string;
  /** Medallion colour. @default "sun" */
  tone?: 'sun' | 'sky' | 'bubble' | 'mint' | 'cherry' | 'grape';
  /** Buttons row */
  actions?: React.ReactNode;
  /** Max width px. @default 480 */
  width?: number;
  /** Render without overlay (for docs/previews) */
  inline?: boolean;
  children?: React.ReactNode;
}
export function Dialog(props: DialogProps): JSX.Element | null;
