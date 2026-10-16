/**
 * Chunky pill button with a solid "edge" shadow that squishes on press.
 */
export interface ButtonProps {
  /** primary = sunshine yellow (main CTA), secondary = sky blue, cherry = urgent/sale, night = bedtime/dark, outline, ghost. @default "primary" */
  variant?: 'primary' | 'secondary' | 'cherry' | 'night' | 'outline' | 'ghost';
  /** @default "md" (52px). sm = 40px, lg = 64px */
  size?: 'sm' | 'md' | 'lg';
  /** Phosphor icon name before label */
  iconStart?: string;
  /** Phosphor icon name after label (arrows auto-mirror in RTL) */
  iconEnd?: string;
  block?: boolean;
  /** Renders an <a> when set */
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
