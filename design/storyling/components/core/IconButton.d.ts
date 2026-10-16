/** Circular icon-only button sharing Button's chunky edge. */
export interface IconButtonProps {
  /** Phosphor icon name */
  icon: string;
  /** Required accessible label (also shown as native title) */
  label: string;
  /** @default "outline" */
  variant?: 'primary' | 'secondary' | 'cherry' | 'night' | 'outline' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}
export function IconButton(props: IconButtonProps): JSX.Element;
